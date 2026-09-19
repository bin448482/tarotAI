"""Simple serial benchmark for configured LLM model profiles."""

import hashlib
from typing import Any, Dict, List

from .models import LLMResponse


def prompt_sha256(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def is_json_response(response: LLMResponse) -> bool:
    """Validate only the transport-level JSON contract for benchmark runs."""
    if not response.content or response.finish_reason == "length":
        return False
    import json

    try:
        json.loads(response.content)
        return True
    except (TypeError, json.JSONDecodeError):
        return False


def choose_winner(results: List[Dict[str, Any]]) -> str | None:
    """Choose a stable model first, then prefer a clearly faster one."""
    stable = [item for item in results if item["success_count"] == item["total_count"]]
    if not stable:
        return None
    stable.sort(key=lambda item: item["average_total_latency_ms"])
    return stable[0]["model_alias"]
