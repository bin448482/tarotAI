from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

import re
import yaml
from dotenv import load_dotenv


class Config:
    """Configuration loader for tarot-ai-generator with YAML + .env support."""

    ENV_VAR_PATTERN = re.compile(r"\$\{([A-Z0-9_]+)(?::-([^}]*))?\}")

    def __init__(
        self,
        settings_path: Optional[Path] = None,
        multilingual_path: Optional[Path] = None,
    ) -> None:
        load_dotenv()

        self.PROJECT_ROOT = Path(__file__).resolve().parent
        self._config_dir = self.PROJECT_ROOT / "config"

        self._settings_path = Path(settings_path or self._config_dir / "settings.yaml")
        self._multilingual_path = Path(multilingual_path or self._config_dir / "multilingual_dimension.yaml")

        raw_settings = self._load_yaml(self._settings_path)
        raw_multilingual = self._load_yaml(self._multilingual_path)

        self._settings = self._expand_env(raw_settings)
        self.MULTILINGUAL_CONFIG = self._expand_env(raw_multilingual)

        self._hydrate_general_settings()
        self._hydrate_database_settings()
        self._hydrate_llm_settings()
        self._hydrate_paths()

    # --------------------------------------------------------------------- #
    # YAML loading helpers
    # --------------------------------------------------------------------- #
    def _load_yaml(self, path: Path) -> Dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(f"配置文件不存在: {path}")
        with path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle) or {}
        if not isinstance(data, dict):
            raise ValueError(f"配置文件必须是字典结构: {path}")
        return data

    def _expand_env(self, value: Any) -> Any:
        """Recursively expand ${VAR} or ${VAR:-default} placeholders."""

        if isinstance(value, dict):
            return {key: self._expand_env(inner) for key, inner in value.items()}
        if isinstance(value, list):
            return [self._expand_env(item) for item in value]
        if isinstance(value, str):
            def _replace(match: re.Match[str]) -> str:
                var_name = match.group(1)
                default = match.group(2) or ""
                return os.getenv(var_name, default)

            return self.ENV_VAR_PATTERN.sub(_replace, value)
        return value

    def resolve_path(self, value: Optional[str]) -> str:
        """Resolve project-relative paths to absolute strings."""
        if value is None:
            raise ValueError("配置中的路径不能为空")
        candidate = Path(value)
        if not candidate.is_absolute():
            candidate = self.PROJECT_ROOT / candidate
        return str(candidate)

    # --------------------------------------------------------------------- #
    # Hydration helpers
    # --------------------------------------------------------------------- #
    def _hydrate_general_settings(self) -> None:
        general = self._settings.get("general", {})
        self.OUTPUT_PATH = self.resolve_path(general.get("output_path", "./output/card_interpretation_dimensions.json"))
        self.MULTILINGUAL_OUTPUT_PATH = self.resolve_path(
            general.get("multilingual_output_path", "./output/multilingual_dimensions.json")
        )

    def _hydrate_database_settings(self) -> None:
        database = self._settings.get("database", {})
        self.DATABASE_PATH = self.resolve_path(database.get("path", "data/tarot_config.db"))

        root_locale = database.get("root_locale") or database.get("default_locale") or "zh-CN"
        locales = database.get("locales") or [root_locale]
        normalized_locales = []
        for locale in locales:
            if not locale:
                continue
            if locale not in normalized_locales:
                normalized_locales.append(locale)
        if root_locale not in normalized_locales:
            normalized_locales.insert(0, root_locale)

        self.ROOT_LOCALE = root_locale
        self.TARGET_LOCALES = normalized_locales

    def _hydrate_llm_settings(self) -> None:
        llm = self._settings.get("llm", {})

        self.API_PROVIDER = (llm.get("default_provider") or os.getenv("API_PROVIDER", "zhipu")).lower()
        self.MODEL_NAME = llm.get("default_model") or os.getenv("MODEL_NAME", "glm-4")
        self.TEMPERATURE = float(llm.get("temperature", 0.1))
        self.MAX_TOKENS = int(llm.get("max_tokens", 1000))
        self.RATE_LIMIT_PER_MINUTE = int(llm.get("rate_limit_per_minute", 60))
        self.BATCH_SIZE = int(llm.get("batch_size", 10))

        zhipu_cfg = llm.get("zhipu", {})
        openai_cfg = llm.get("openai", {})
        ollama_cfg = llm.get("ollama", {})

        self.ZHIPUAI_API_KEY = zhipu_cfg.get("api_key") or os.getenv("ZHIPUAI_API_KEY")
        self.OPENAI_API_KEY = openai_cfg.get("api_key") or os.getenv("OPENAI_API_KEY")

        self.OPENAI_BASE_URL = openai_cfg.get("base_url") or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.OLLAMA_BASE_URL = ollama_cfg.get("base_url") or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.OLLAMA_MODEL = ollama_cfg.get("model") or os.getenv("OLLAMA_MODEL", "qwen2.5:7b")
        self.ZHIPU_MODEL_NAME = zhipu_cfg.get("model") or os.getenv("ZHIPU_MODEL_NAME")
        self.OPENAI_MODEL_NAME = openai_cfg.get("model") or os.getenv("OPENAI_MODEL_NAME")

        # Provider-specific defaults
        if self.API_PROVIDER == "zhipu" and "model" in zhipu_cfg:
            self.MODEL_NAME = zhipu_cfg.get("model", self.MODEL_NAME)
        elif self.API_PROVIDER == "openai" and "model" in openai_cfg:
            self.MODEL_NAME = openai_cfg.get("model", self.MODEL_NAME)
        elif self.API_PROVIDER == "ollama":
            self.MODEL_NAME = self.OLLAMA_MODEL

        language_providers = llm.get("language_providers", {})
        self.LANGUAGE_PROVIDERS: Dict[str, Dict[str, Any]] = {}
        for locale in self.TARGET_LOCALES:
            lp_cfg = language_providers.get(locale, {})
            provider = (lp_cfg.get("provider") or self.API_PROVIDER).lower()
            model = lp_cfg.get("model") or self.MODEL_NAME
            self.LANGUAGE_PROVIDERS[locale] = {
                "provider": provider,
                "model": model,
                "temperature": float(lp_cfg.get("temperature", self.TEMPERATURE)),
                "max_tokens": int(lp_cfg.get("max_tokens", self.MAX_TOKENS)),
                "rate_limit_per_minute": int(lp_cfg.get("rate_limit_per_minute", self.RATE_LIMIT_PER_MINUTE)),
                "batch_size": int(lp_cfg.get("batch_size", self.BATCH_SIZE)),
            }

    def _hydrate_paths(self) -> None:
        paths = self._settings.get("paths", {})
        prompt_templates = paths.get("prompt_templates", {})
        self.PROMPT_TEMPLATES: Dict[str, str] = {}
        for locale, path in prompt_templates.items():
            if not path:
                continue
            resolved = self.resolve_path(path)
            self.PROMPT_TEMPLATES[locale] = resolved

        # Ensure root locale has a template fallback
        if self.ROOT_LOCALE not in self.PROMPT_TEMPLATES:
            fallback = paths.get("prompt_template", "prompt_template.txt")
            self.PROMPT_TEMPLATES[self.ROOT_LOCALE] = self.resolve_path(fallback)

        # Carry over single template path for backward compatibility if needed elsewhere
        self.PROMPT_TEMPLATE_PATH = self.PROMPT_TEMPLATES[self.ROOT_LOCALE]

        logs_dir = paths.get("logs_dir", "./output/logs")
        self.LOGS_DIR = self.resolve_path(logs_dir)

    # --------------------------------------------------------------------- #
    # Validation helpers
    # --------------------------------------------------------------------- #
    def validate(self) -> bool:
        provider = self.API_PROVIDER
        if provider == "zhipu":
            if not self.ZHIPUAI_API_KEY:
                raise ValueError("请在 config/settings.yaml 的 llm.zhipu.api_key 中设置密钥，或通过环境变量 ZHIPUAI_API_KEY 提供。")
        elif provider == "openai":
            if not self.OPENAI_API_KEY:
                raise ValueError("请在 config/settings.yaml 的 llm.openai.api_key 中设置密钥，或通过环境变量 OPENAI_API_KEY 提供。")
        elif provider == "ollama":
            if not self.OLLAMA_BASE_URL:
                raise ValueError("请在 .env 文件中设置 OLLAMA_BASE_URL")
            if not self.OLLAMA_MODEL:
                raise ValueError("请在 .env 文件中设置 OLLAMA_MODEL")
        else:
            raise ValueError(f"不支持的API提供商: {provider}，请设置为 'zhipu'、'openai' 或 'ollama'")

        db_path = Path(self.DATABASE_PATH)
        if not db_path.exists():
            raise ValueError(f"数据库文件不存在: {db_path}")

        missing_templates = [
            (locale, path)
            for locale, path in self.PROMPT_TEMPLATES.items()
            if not Path(path).exists()
        ]
        if missing_templates:
            missing_desc = ", ".join(f"{locale} -> {path}" for locale, path in missing_templates)
            raise ValueError(f"以下提示词模板不存在: {missing_desc}")

        # Validate provider credentials per language
        for locale, meta in self.LANGUAGE_PROVIDERS.items():
            provider = meta["provider"]
            if provider == "zhipu" and not self.ZHIPUAI_API_KEY:
                raise ValueError(f"语言 {locale} 使用智谱模型，但未配置 ZHIPUAI_API_KEY。")
            if provider == "openai" and not self.OPENAI_API_KEY:
                raise ValueError(f"语言 {locale} 使用 OpenAI 模型，但未配置 OPENAI_API_KEY。")
            if provider == "ollama" and not self.OLLAMA_MODEL:
                raise ValueError(f"语言 {locale} 使用 Ollama 模型，但未配置 OLLAMA_MODEL。")

        # 输出目录
        Path(self.OUTPUT_PATH).parent.mkdir(parents=True, exist_ok=True)
        Path(self.MULTILINGUAL_OUTPUT_PATH).parent.mkdir(parents=True, exist_ok=True)
        Path(self.LOGS_DIR).mkdir(parents=True, exist_ok=True)

        return True

    # --------------------------------------------------------------------- #
    # Access helpers for multilingual configuration
    # --------------------------------------------------------------------- #
    def get_multilingual_config(self) -> Dict[str, Any]:
        """Return a shallow copy of multilingual configuration."""
        return dict(self.MULTILINGUAL_CONFIG)
