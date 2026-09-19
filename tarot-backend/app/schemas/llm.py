"""Schemas for the small admin-only LLM benchmark endpoint."""

from typing import List, Optional

from pydantic import BaseModel, Field


class LLMBenchmarkRequest(BaseModel):
    model_aliases: List[str] = Field(..., min_length=1, max_length=6)
    prompt: str = Field(..., min_length=1, max_length=50000)
    repetitions: int = Field(default=3, ge=1, le=5)
    force_json: bool = True


class LLMBenchmarkAttempt(BaseModel):
    attempt: int
    success: bool
    total_latency_ms: Optional[float] = None
    finish_reason: Optional[str] = None
    error_type: Optional[str] = None


class LLMBenchmarkModelResult(BaseModel):
    model_alias: str
    provider: str
    model: str
    success_count: int
    total_count: int
    average_total_latency_ms: Optional[float] = None
    attempts: List[LLMBenchmarkAttempt]


class LLMBenchmarkResponse(BaseModel):
    run_id: str
    prompt_sha256: str
    repetitions: int
    force_json: bool
    results: List[LLMBenchmarkModelResult]
    winner: Optional[str] = None
