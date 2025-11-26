from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import ollama
from rich.console import Console

from config import Config

try:
    from zhipuai import ZhipuAI
except ImportError:  # pragma: no cover - optional dependency
    ZhipuAI = None

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional dependency
    OpenAI = None


@dataclass
class LLMResponse:
    content: str
    provider: str
    model: str


class LLMInvoker:
    """Helper for invoking different LLM providers."""

    def __init__(self, config: Config):
        self.config = config
        self._clients: Dict[str, Any] = {}

    def _get_client(self, provider: str) -> Any:
        provider = provider.lower()
        if provider in self._clients:
            return self._clients[provider]

        if provider == "zhipu":
            if not self.config.ZHIPUAI_API_KEY:
                raise ValueError("未配置 ZHIPUAI_API_KEY，无法调用智谱模型。")
            if not ZhipuAI:
                raise ImportError("未安装 zhipuai 库，无法调用智谱模型。")
            self._clients[provider] = ZhipuAI(api_key=self.config.ZHIPUAI_API_KEY)
        elif provider == "openai":
            if not self.config.OPENAI_API_KEY:
                raise ValueError("未配置 OPENAI_API_KEY，无法调用 OpenAI 模型。")
            if not OpenAI:
                raise ImportError("未安装 openai 库，无法调用 OpenAI 模型。")
            self._clients[provider] = OpenAI(
                api_key=self.config.OPENAI_API_KEY,
                base_url=self.config.OPENAI_BASE_URL,
            )
        elif provider == "ollama":
            self._clients[provider] = ollama.Client(host=self.config.OLLAMA_BASE_URL)
        else:
            raise ValueError(f"不支持的模型提供商: {provider}")

        return self._clients[provider]

    def call(
        self,
        provider: str,
        model: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
        *,
        force_json: bool = False,
    ) -> LLMResponse:
        """Dispatch the call to the requested provider."""
        provider = provider.lower()
        client = self._get_client(provider)

        if provider == "zhipu":
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = response.choices[0].message.content.strip()
            return LLMResponse(content=content, provider=provider, model=model)

        if provider == "openai":
            kwargs = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if force_json:
                kwargs["response_format"] = {"type": "json_object"}
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content.strip()
            return LLMResponse(content=content, provider=provider, model=model)

        if provider == "ollama":
            response = client.chat(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                options={"temperature": temperature, "num_predict": max_tokens},
            )
            if response and "message" in response and "content" in response["message"]:
                return LLMResponse(content=response["message"]["content"].strip(), provider=provider, model=model)
            raise ValueError("Ollama 返回内容为空")

        raise ValueError(f"不支持的模型提供商: {provider}")


class MultilingualDimensionGenerator:
    """Generate multilingual dimension definitions based on configuration."""

    def __init__(self, config: Config, console: Console):
        self.config = config
        self.console = console
        self.invoker = LLMInvoker(config)

        multi_cfg = self.config.get_multilingual_config()
        self.source_locale: str = multi_cfg.get("source_locale", "zh-CN")
        self.root_dimension_locale: str = multi_cfg.get("root_dimension_locale", self.source_locale)
        self.default_spread: str = multi_cfg.get("default_spread", "three-card")
        self.source_analysis: Dict[str, Any] = multi_cfg.get("source_analysis", {})
        self.translation_pipeline: List[Dict[str, Any]] = multi_cfg.get("translation_pipeline", [])
        self.guardrails: Dict[str, Any] = multi_cfg.get("guardrails", {})

        self.force_json: bool = bool(self.guardrails.get("force_json", False))
        self.retry: int = int(self.guardrails.get("retry", 1))

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def generate(
        self,
        question: str,
        spread_type: Optional[str] = None,
        output_path: Optional[str] = None,
    ) -> Path:
        spread = spread_type or self.default_spread
        output_file = Path(output_path or self.config.MULTILINGUAL_OUTPUT_PATH)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        self.console.print(f"[blue]开始多语言维度解析，spread={spread}[/blue]")

        results: List[Dict[str, Any]] = []
        locales_order: List[str] = []

        # 1. Source locale analysis
        source_result = self._run_analysis_for_source(question, spread)
        results.append(source_result)
        locales_order.append(source_result["locale"])

        # 2. Translation pipeline
        for entry in self.translation_pipeline:
            locale = entry.get("locale")
            language_name = entry.get("language_name", locale)
            translated_question, translation_meta = self._run_translation(question, entry)
            self.console.print(f"[green]翻译完成[/green] {self.source_locale} -> {locale} ({language_name})")

            analysis_result = self._run_analysis_for_locale(
                translated_question,
                locale,
                entry,
                spread,
            )
            analysis_result["translation"] = translation_meta
            results.append(analysis_result)
            locales_order.append(locale)

        combined = self._combine_results(question, spread, results, locales_order)
        self._save_combined(output_file, combined)

        self.console.print(f"[green]多语言维度解析完成，输出文件: {output_file}[/green]")
        return output_file

    # ------------------------------------------------------------------ #
    # Translation & analysis helpers
    # ------------------------------------------------------------------ #
    def _run_translation(self, question: str, entry: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        translation_cfg = entry.get("translation", {})
        provider = translation_cfg.get("provider", self.config.API_PROVIDER)
        model = translation_cfg.get("model", self.config.MODEL_NAME)
        temperature = float(translation_cfg.get("temperature", self.config.TEMPERATURE))
        prompt_path = translation_cfg.get("prompt_template")

        if not prompt_path:
            raise ValueError(f"未配置翻译提示词模板: locale={entry.get('locale')}")

        prompt = self._render_prompt(
            prompt_path,
            source_locale=self.source_locale,
            target_locale=entry.get("locale"),
            target_language_name=entry.get("language_name", entry.get("locale")),
            question=question,
        )

        response = self._call_with_retry(provider, model, prompt, temperature, force_json=False)
        content = response.content.strip()

        return content, {
            "provider": response.provider,
            "model": response.model,
            "prompt_template": prompt_path,
        }

    def _run_analysis_for_source(self, question: str, spread: str) -> Dict[str, Any]:
        locale = self.source_locale
        return self._run_analysis(question, locale, self.source_analysis, spread)

    def _run_analysis_for_locale(
        self,
        translated_question: str,
        locale: str,
        entry: Dict[str, Any],
        spread: str,
    ) -> Dict[str, Any]:
        analysis_cfg = entry.get("analysis", {})
        return self._run_analysis(translated_question, locale, analysis_cfg, spread)

    def _run_analysis(
        self,
        question: str,
        locale: str,
        analysis_cfg: Dict[str, Any],
        spread: str,
    ) -> Dict[str, Any]:
        provider = analysis_cfg.get("provider", self.config.API_PROVIDER)
        model = analysis_cfg.get("model", self.config.MODEL_NAME)
        temperature = float(analysis_cfg.get("temperature", self.config.TEMPERATURE))
        prompt_path = analysis_cfg.get("prompt_template")

        if not prompt_path:
            raise ValueError(f"未为 locale={locale} 配置分析提示词模板。")

        prompt = self._render_prompt(
            prompt_path,
            locale=locale,
            question=question,
            spread=spread,
        )

        response = self._call_with_retry(provider, model, prompt, temperature, force_json=self.force_json)
        parsed = self._parse_analysis_json(response.content, locale)
        parsed.update(
            {
                "question": question,
                "provider": response.provider,
                "model": response.model,
                "prompt_template": prompt_path,
            }
        )
        return parsed

    def _render_prompt(self, path: str, **kwargs: Any) -> str:
        prompt_path = Path(self.config.resolve_path(path))
        if not prompt_path.exists():
            raise FileNotFoundError(f"提示词模板不存在: {prompt_path}")
        template = prompt_path.read_text(encoding="utf-8")
        return template.format(**kwargs)

    # ------------------------------------------------------------------ #
    # Invocation & parsing helpers
    # ------------------------------------------------------------------ #
    def _call_with_retry(
        self,
        provider: str,
        model: str,
        prompt: str,
        temperature: float,
        *,
        force_json: bool,
    ) -> LLMResponse:
        last_error: Optional[Exception] = None
        for attempt in range(1, self.retry + 2):
            try:
                return self.invoker.call(
                    provider=provider,
                    model=model,
                    prompt=prompt,
                    temperature=temperature,
                    max_tokens=self.config.MAX_TOKENS,
                    force_json=force_json,
                )
            except Exception as exc:  # pylint: disable=broad-except
                last_error = exc
                self.console.print(f"[yellow]模型调用失败（第{attempt}次）: {exc}[/yellow]")
        raise RuntimeError(f"模型调用失败: {last_error}") from last_error

    @staticmethod
    def _extract_json_block(text: str) -> str:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text

    def _parse_analysis_json(self, content: str, locale: str) -> Dict[str, Any]:
        raw_json = self._extract_json_block(content)
        try:
            data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise ValueError(f"解析 JSON 失败（locale={locale}）: {exc}\n原始内容:\n{content}") from exc

        if "locale" not in data:
            data["locale"] = locale
        return data

    # ------------------------------------------------------------------ #
    # Output helpers
    # ------------------------------------------------------------------ #
    def _combine_results(
        self,
        source_question: str,
        spread: str,
        results: List[Dict[str, Any]],
        locales_order: List[str],
    ) -> Dict[str, Any]:
        locale_map = {res["locale"]: res for res in results}
        root_locale = self.root_dimension_locale if self.root_dimension_locale in locale_map else locales_order[0]
        root_dimensions = locale_map[root_locale].get("dimensions", [])

        combined_dimensions: List[Dict[str, Any]] = []
        for index, base_dim in enumerate(root_dimensions):
            dimension_key = {
                "category": base_dim.get("category"),
                "aspect": base_dim.get("aspect"),
                "aspect_type": base_dim.get("aspect_type"),
            }

            localizations = []
            for locale in locales_order:
                locale_result = locale_map.get(locale, {})
                dims = locale_result.get("dimensions", [])
                if index >= len(dims):
                    continue
                dim = dims[index]
                localizations.append(
                    {
                        "locale": locale,
                        "name": dim.get("name"),
                        "category": dim.get("category"),
                        "aspect": dim.get("aspect"),
                        "aspect_type": dim.get("aspect_type"),
                        "description": dim.get("description"),
                        "summary": dim.get("summary"),
                    }
                )

            combined_dimensions.append(
                {
                    "dimension_key": dimension_key,
                    "localizations": localizations,
                }
            )

        locale_metadata = []
        for locale in locales_order:
            result = locale_map.get(locale, {})
            meta = {
                "locale": locale,
                "question": result.get("question"),
                "overall_summary": result.get("overall_summary"),
                "provider": result.get("provider"),
                "model": result.get("model"),
                "prompt_template": result.get("prompt_template"),
            }
            if result.get("translation"):
                meta["translation"] = result["translation"]
            locale_metadata.append(meta)

        return {
            "version": "1.0.0",
            "generated_at": None,
            "source_question": source_question,
            "spread_type": spread,
            "source_locale": self.source_locale,
            "root_dimension_locale": root_locale,
            "guardrails": self.guardrails,
            "dimensions": combined_dimensions,
            "locales": locale_metadata,
        }

    def _save_combined(self, output_path: Path, data: Dict[str, Any]) -> None:
        from datetime import datetime

        data["generated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        with output_path.open("w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
