"""Tests for model profiles, provider-neutral request construction, and simple benchmarking."""

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.api import llm_benchmark
from app.services.llm.adapter import OpenAICompatibleAdapter
from app.services.llm.benchmark import choose_winner, is_json_response
from app.services.llm.models import LLMResponse
from app.services.llm.registry import ModelRegistry
from app.schemas.llm import LLMBenchmarkRequest


def test_registry_exposes_configured_glm_deepseek_and_qwen(monkeypatch):
    monkeypatch.setattr(settings, "ZHIPUAI_API_KEY", "zhipu-test")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "ZHIPU_MODEL_NAME", "glm-5.3-flash")
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "deepseek-test")
    monkeypatch.setattr(settings, "DASHSCOPE_API_KEY", "qwen-test")
    monkeypatch.setattr(settings, "LLM_DEFAULT_MODEL", "glm-5.3-flash")

    registry = ModelRegistry(settings)

    assert registry.aliases() == ["glm-5.3-flash", "deepseek-chat", "qwen-plus"]
    assert registry.resolve("glm-5.3-flash").thinking == "required"
    assert registry.resolve("glm-5.3-flash").max_tokens == 8192
    assert registry.resolve("deepseek-chat").provider == "deepseek"
    assert registry.resolve("qwen-plus").base_url.endswith("/compatible-mode/v1")


def test_registry_rejects_unallowlisted_model(monkeypatch):
    monkeypatch.setattr(settings, "ZHIPUAI_API_KEY", "zhipu-test")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "ZHIPU_MODEL_NAME", "glm-5.3-flash")
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", None)
    monkeypatch.setattr(settings, "DASHSCOPE_API_KEY", None)

    with pytest.raises(ValueError, match="Unknown or unavailable"):
        ModelRegistry(settings).resolve("not-configured")


def test_adapter_adds_json_and_glm_thinking(monkeypatch):
    captured = {}

    class FakeCompletions:
        def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                id="req-1",
                model="glm-5.3-flash",
                choices=[
                    SimpleNamespace(
                        finish_reason="stop",
                        message=SimpleNamespace(content='{"ok": true}'),
                    )
                ],
                usage=SimpleNamespace(prompt_tokens=10, completion_tokens=20, total_tokens=30),
            )

    class FakeClient:
        def __init__(self, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    monkeypatch.setattr("app.services.llm.adapter.OpenAI", FakeClient)
    monkeypatch.setattr(settings, "ZHIPUAI_API_KEY", "zhipu-test")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "ZHIPU_MODEL_NAME", "glm-5.3-flash")
    registry = ModelRegistry(settings)
    profile = registry.resolve("glm-5.3-flash")

    response = OpenAICompatibleAdapter().complete(profile, "return JSON", force_json=True)

    assert captured["response_format"] == {"type": "json_object"}
    assert captured["extra_body"]["thinking"] == {"type": "enabled"}
    assert captured["extra_body"]["reasoning_effort"] == "low"
    assert response.content == '{"ok": true}'
    assert response.total_tokens == 30


def test_benchmark_helpers_prefer_only_stable_models():
    response = LLMResponse(
        content='{"ok": true}', model="m", provider="p", finish_reason="stop"
    )
    assert is_json_response(response)
    assert not is_json_response(
        LLMResponse(content='{"ok":', model="m", provider="p", finish_reason="length")
    )

    winner = choose_winner(
        [
            {"model_alias": "slow", "success_count": 3, "total_count": 3, "average_total_latency_ms": 9000},
            {"model_alias": "fast-but-fails", "success_count": 2, "total_count": 3, "average_total_latency_ms": 1000},
            {"model_alias": "fast", "success_count": 3, "total_count": 3, "average_total_latency_ms": 5000},
        ]
    )
    assert winner == "fast"


def test_benchmark_endpoint_is_bounded_and_returns_simple_results(monkeypatch):
    monkeypatch.setattr(settings, "ZHIPUAI_API_KEY", "zhipu-test")
    monkeypatch.setattr(settings, "ZHIPU_MODEL_NAME", "glm-5.3-flash")
    monkeypatch.setattr(settings, "DEEPSEEK_API_KEY", "deepseek-test")
    monkeypatch.setattr(settings, "LLM_BENCHMARK_ENABLED", True)
    registry = ModelRegistry(settings)
    profiles = registry.resolve_many(["glm-5.3-flash", "deepseek-chat"])

    class FakeService:
        def __init__(self):
            self.registry = registry

        async def call_ai_api_detailed(self, **kwargs):
            profile = registry.resolve(kwargs["model"])
            return LLMResponse(
                content='{"card_interpretations": [], "overall_summary": "ok", "insights": []}',
                model=profile.model,
                provider=profile.provider,
                finish_reason="stop",
                latency_ms=10.0 if profile.alias == "glm-5.3-flash" else 20.0,
            )

    monkeypatch.setattr(llm_benchmark, "get_llm_service", lambda: FakeService())
    result = asyncio.run(
        llm_benchmark.benchmark_models(
            LLMBenchmarkRequest(
                model_aliases=[profile.alias for profile in profiles],
                prompt="return JSON",
                repetitions=3,
            ),
            current_admin="test-admin",
        )
    )

    assert result.winner == "glm-5.3-flash"
    assert all(item.success_count == 3 for item in result.results)
    assert all(len(item.attempts) == 3 for item in result.results)
