"""Admin-only endpoint for a small multi-model connectivity/speed check."""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import settings
from ..schemas.llm import (
    LLMBenchmarkAttempt,
    LLMBenchmarkModelResult,
    LLMBenchmarkRequest,
    LLMBenchmarkResponse,
)
from ..services.llm.benchmark import choose_winner, is_json_response, prompt_sha256
from ..services.llm_service import get_llm_service
from ..utils.admin_auth import get_current_admin


router = APIRouter(prefix="/api/v1/admin/llm", tags=["admin-llm"])


@router.post("/benchmark", response_model=LLMBenchmarkResponse)
async def benchmark_models(
    request: LLMBenchmarkRequest,
    current_admin: str = Depends(get_current_admin),
):
    """Run a bounded, serial benchmark without charging a user credit."""
    if not settings.LLM_BENCHMARK_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM benchmark is disabled",
        )

    service = get_llm_service()
    try:
        profiles = service.registry.resolve_many(request.model_aliases)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    results: List[Dict[str, Any]] = []
    for profile in profiles:
        attempts: List[LLMBenchmarkAttempt] = []
        for attempt_no in range(1, request.repetitions + 1):
            try:
                response = await service.call_ai_api_detailed(
                    prompt=request.prompt,
                    model=profile.alias,
                    force_json=request.force_json,
                )
                success = is_json_response(response) if request.force_json else bool(response.content)
                attempts.append(
                    LLMBenchmarkAttempt(
                        attempt=attempt_no,
                        success=success,
                        total_latency_ms=round(response.latency_ms, 2),
                        finish_reason=response.finish_reason,
                        error_type=None if success else "invalid_response",
                    )
                )
            except Exception as exc:
                attempts.append(
                    LLMBenchmarkAttempt(
                        attempt=attempt_no,
                        success=False,
                        error_type=type(exc).__name__,
                    )
                )
            await asyncio.sleep(0)

        successful_latencies = [
            item.total_latency_ms for item in attempts if item.success and item.total_latency_ms is not None
        ]
        results.append(
            {
                "model_alias": profile.alias,
                "provider": profile.provider,
                "model": profile.model,
                "success_count": sum(1 for item in attempts if item.success),
                "total_count": len(attempts),
                "average_total_latency_ms": round(sum(successful_latencies) / len(successful_latencies), 2)
                if successful_latencies
                else None,
                "attempts": attempts,
            }
        )

    return LLMBenchmarkResponse(
        run_id="benchmark-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S"),
        prompt_sha256=prompt_sha256(request.prompt),
        repetitions=request.repetitions,
        force_json=request.force_json,
        results=[LLMBenchmarkModelResult(**item) for item in results],
        winner=choose_winner(results),
    )
