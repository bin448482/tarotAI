"""Data models used by the multi-provider LLM adapter."""

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class ModelProfile:
    """Configuration and capability declaration for one selectable model."""

    alias: str
    provider: str
    model: str
    api_key: str
    base_url: str
    json_mode: bool = True
    thinking: str = "disabled"  # required, optional, or disabled
    reasoning_effort: Optional[str] = None
    max_tokens: int = 8192
    temperature: float = 0.7
    top_p: Optional[float] = None
    supports_temperature: bool = True
    supports_top_p: bool = True
    extra_body: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LLMResponse:
    """Provider-neutral response metadata used by business and benchmark code."""

    content: str
    model: str
    provider: str
    finish_reason: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    reasoning_tokens: Optional[int] = None
    request_id: Optional[str] = None
    latency_ms: float = 0.0

