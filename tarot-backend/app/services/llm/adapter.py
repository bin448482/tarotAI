"""OpenAI-compatible transport for GLM, DeepSeek, Qwen and OpenAI models."""

import time
from typing import Any, Dict

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - dependency is required in production
    OpenAI = None

from .models import LLMResponse, ModelProfile


class OpenAICompatibleAdapter:
    """Send one request while filtering parameters according to a model profile."""

    def __init__(self, timeout_seconds: float = 120, max_retries: int = 1):
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self._clients: Dict[tuple[str, str], Any] = {}

    def complete(self, profile: ModelProfile, prompt: str, force_json: bool = False) -> LLMResponse:
        if OpenAI is None:
            raise RuntimeError("The openai package is required for LLM calls")

        client = self._get_client(profile)
        kwargs: Dict[str, Any] = {
            "model": profile.model,
            "messages": [{"role": "user", "content": prompt}],
            "timeout": self.timeout_seconds,
        }
        if profile.max_tokens is not None:
            kwargs["max_tokens"] = profile.max_tokens
        if profile.supports_temperature:
            kwargs["temperature"] = profile.temperature
        if profile.supports_top_p and profile.top_p is not None:
            kwargs["top_p"] = profile.top_p
        if force_json and profile.json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        extra_body = dict(profile.extra_body)
        if profile.thinking == "required":
            if profile.provider == "qwen":
                extra_body.setdefault("enable_thinking", True)
            else:
                extra_body.setdefault("thinking", {"type": "enabled"})
        elif profile.thinking == "disabled":
            if profile.provider == "qwen":
                extra_body.setdefault("enable_thinking", False)
            elif profile.provider == "deepseek":
                extra_body.setdefault("thinking", {"type": "disabled"})
        if profile.reasoning_effort:
            extra_body.setdefault("reasoning_effort", profile.reasoning_effort)
        if extra_body:
            kwargs["extra_body"] = extra_body

        started = time.perf_counter()
        response = client.chat.completions.create(**kwargs)
        latency_ms = (time.perf_counter() - started) * 1000
        choice = response.choices[0]
        message = choice.message
        usage = getattr(response, "usage", None)

        return LLMResponse(
            content=(getattr(message, "content", None) or "").strip(),
            model=getattr(response, "model", None) or profile.model,
            provider=profile.provider,
            finish_reason=getattr(choice, "finish_reason", None),
            input_tokens=getattr(usage, "prompt_tokens", None) if usage else None,
            output_tokens=getattr(usage, "completion_tokens", None) if usage else None,
            total_tokens=getattr(usage, "total_tokens", None) if usage else None,
            reasoning_tokens=getattr(usage, "reasoning_tokens", None) if usage else None,
            request_id=getattr(response, "id", None),
            latency_ms=latency_ms,
        )

    def _get_client(self, profile: ModelProfile) -> Any:
        key = (profile.base_url, profile.api_key)
        if key not in self._clients:
            self._clients[key] = OpenAI(
                api_key=profile.api_key,
                base_url=profile.base_url,
                timeout=self.timeout_seconds,
                max_retries=self.max_retries,
            )
        return self._clients[key]
