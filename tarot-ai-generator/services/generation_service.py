from __future__ import annotations

import asyncio
import json
import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from config import Config
from data_loader import (
    CardInterpretationRecord,
    DimensionRecord,
    TarotDataLoader,
    TarotDataRepository,
)
from services.model_router import ModelRouter
from services.prompt_builder import PromptBuilder, PromptContext, PromptTemplateRegistry


@dataclass
class GenerationTaskConfig:
    locales: List[str]
    max_retries: int = 3
    retry_backoff: float = 2.0
    record_failures: bool = True


@dataclass
class GenerationJob:
    interpretation_id: int
    dimension_id: int
    locale: str
    card: CardInterpretationRecord
    dimension: DimensionRecord


@dataclass
class GenerationOutcome:
    job: GenerationJob
    success: bool
    attempts: int
    content: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    error: Optional[str] = None

    def to_failure_dict(self) -> Dict[str, str]:
        return {
            "interpretation_id": str(self.job.interpretation_id),
            "dimension_id": str(self.job.dimension_id),
            "locale": self.job.locale,
            "attempts": str(self.attempts),
            "error": self.error or "",
        }


class GenerationService:
    """High-level orchestration for multi-language tarot dimension generation."""

    def __init__(self, config: Config, console: Console):
        self.config = config
        self.console = console

        loader = TarotDataLoader(config.DATABASE_PATH, config.TARGET_LOCALES, config.ROOT_LOCALE)
        self.repository = TarotDataRepository(loader)
        registry = PromptTemplateRegistry(config.PROMPT_TEMPLATES, config.ROOT_LOCALE)
        self.prompt_builder = PromptBuilder(registry)
        self.model_router = ModelRouter(config)

        locales = list(config.TARGET_LOCALES)
        self.task_config = GenerationTaskConfig(locales=locales)
        self.locale_semaphores: Dict[str, asyncio.Semaphore] = {
            locale: asyncio.Semaphore(max(1, cfg.batch_size))
            for locale, cfg in self.model_router.locale_configs.items()
        }

    # ------------------------------------------------------------------ #
    # Public entry points
    # ------------------------------------------------------------------ #
    async def generate_debug_samples(
        self,
        count: int = 10,
        locales: Optional[Sequence[str]] = None,
        output_dir: Optional[Path] = None,
    ) -> Path:
        locales = self._normalize_locales(locales)
        card_ids = list(self.repository.iter_card_interpretations())
        dimension_ids = list(self.repository.iter_dimensions())

        if not card_ids or not dimension_ids:
            raise ValueError("数据库中缺少卡牌或维度数据，无法生成样本。")

        sampled_interpretations = random.sample(card_ids, min(count, len(card_ids)))
        sampled_pairs: List[Tuple[int, int]] = []
        for interpretation_id in sampled_interpretations:
            dimension_id = random.choice(dimension_ids)
            sampled_pairs.append((interpretation_id, dimension_id))

        jobs = self._build_jobs_for_pairs(sampled_pairs, locales)
        outcomes = await self._run_jobs(jobs, task_description="生成调试样本")

        output_base = Path(output_dir or Path(self.config.OUTPUT_PATH).parent / "debug_samples")
        output_base.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        output_path = output_base / f"debug_samples_{timestamp}.json"

        payload = self._build_debug_payload(sampled_pairs, locales, outcomes)
        output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        self.console.print(f"[green]调试样本已生成: {output_path}[/green]")
        return output_path

    async def generate_dimension(
        self,
        dimension_ref: str,
        locales: Optional[Sequence[str]] = None,
        *,
        persist: bool = True,
    ) -> Dict[str, Any]:
        dimension_id = self._resolve_dimension_id(dimension_ref)
        if dimension_id is None:
            raise ValueError(f"未找到维度: {dimension_ref}")

        locales = self._normalize_locales(locales)

        interpretation_ids = list(self.repository.iter_card_interpretations())
        jobs = self._build_jobs_for_dimension(dimension_id, interpretation_ids, locales)

        # Resume support
        existing_payload, completed_pairs = self._load_existing_dimension_payload(dimension_id)
        jobs = [job for job in jobs if (job.locale, job.interpretation_id) not in completed_pairs]

        if not jobs:
            self.console.print("[yellow]所有卡牌解读已存在，跳过生成。[/yellow]")
            return existing_payload

        outcomes = await self._run_jobs(jobs, task_description=f"生成维度 {dimension_ref}")
        payload = self._merge_dimension_payload(dimension_id, locales, outcomes, base_payload=existing_payload)

        if persist:
            output_path = self._dimension_output_path(dimension_id)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            self.console.print(f"[green]维度解读已写入: {output_path}[/green]")

        return payload

    async def generate_question(
        self,
        question: str,
        question_locale: Optional[str] = None,
        locales: Optional[Sequence[str]] = None,
        *,
        spread_type: Optional[str] = None,
    ) -> Path:
        locales = self._normalize_locales(locales)
        question_locale = self._normalize_locale(question_locale or self.config.ROOT_LOCALE)

        dimension_ids = self.repository.get_dimension_ids_by_description(question, locale=question_locale)
        if not dimension_ids:
            raise ValueError(f"未找到与问题匹配的维度描述: {question} ({question_locale})")

        self.console.print(
            f"[blue]问题 \"{question}\" 匹配维度: {', '.join(str(did) for did in dimension_ids)}[/blue]"
        )

        dimension_payloads: List[Dict[str, Any]] = []
        for dimension_id in dimension_ids:
            payload = await self.generate_dimension(str(dimension_id), locales, persist=True)
            dimension_payloads.append(payload)

        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        output_dir = Path(self.config.OUTPUT_PATH).parent / "questions"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"question_{timestamp}.json"

        question_payload = {
            "question": question,
            "question_locale": question_locale,
            "locales": locales,
            "spread_type": spread_type or "three-card",
            "generated_at": datetime.utcnow().isoformat(),
            "dimensions": dimension_payloads,
        }

        output_path.write_text(json.dumps(question_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        self.console.print(f"[green]问题解读已生成: {output_path}[/green]")
        return output_path

    # ------------------------------------------------------------------ #
    # Job preparation helpers
    # ------------------------------------------------------------------ #
    def _build_jobs_for_pairs(
        self,
        pairs: Iterable[Tuple[int, int]],
        locales: Sequence[str],
    ) -> List[GenerationJob]:
        jobs: List[GenerationJob] = []
        for interpretation_id, dimension_id in pairs:
            for locale in locales:
                card = self.repository.get_card(interpretation_id, locale)
                dimension = self.repository.get_dimension(dimension_id, locale)
                if not card or not dimension:
                    self.console.print(
                        f"[yellow]缺少本地化数据，跳过: interpretation_id={interpretation_id}, "
                        f"dimension_id={dimension_id}, locale={locale}[/yellow]"
                    )
                    continue
                jobs.append(
                    GenerationJob(
                        interpretation_id=interpretation_id,
                        dimension_id=dimension_id,
                        locale=locale,
                        card=card,
                        dimension=dimension,
                    )
                )
        return jobs

    def _build_jobs_for_dimension(
        self,
        dimension_id: int,
        interpretation_ids: Iterable[int],
        locales: Sequence[str],
    ) -> List[GenerationJob]:
        pairs = [(interpretation_id, dimension_id) for interpretation_id in interpretation_ids]
        return self._build_jobs_for_pairs(pairs, locales)

    # ------------------------------------------------------------------ #
    # Job execution
    # ------------------------------------------------------------------ #
    async def _run_jobs(self, jobs: List[GenerationJob], task_description: str) -> List[GenerationOutcome]:
        if not jobs:
            return []

        outcomes: List[GenerationOutcome] = []

        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            TextColumn("{task.completed}/{task.total}"),
            TimeElapsedColumn(),
            console=self.console,
        )

        with progress:
            task_id = progress.add_task(task_description, total=len(jobs))
            coroutines = [self._execute_job(job, progress, task_id) for job in jobs]
            for future in asyncio.as_completed(coroutines):
                outcome = await future
                outcomes.append(outcome)

        failures = [o for o in outcomes if not o.success]
        if failures:
            self.console.print(f"[red]共有 {len(failures)} 个任务失败，请查看日志进行补齐。[/red]")

        return outcomes

    async def _execute_job(self, job: GenerationJob, progress: Progress, task_id: int) -> GenerationOutcome:
        semaphore = self.locale_semaphores.get(job.locale) or asyncio.Semaphore(1)
        attempts = 0
        last_error: Optional[str] = None

        while attempts < self.task_config.max_retries:
            attempts += 1
            try:
                prompt = self.prompt_builder.build(
                    PromptContext(card=job.card, dimension=job.dimension, question=None, locale=job.locale)
                )
                async with semaphore:
                    response = await self.model_router.generate(job.locale, prompt)
                progress.advance(task_id)
                return GenerationOutcome(
                    job=job,
                    success=True,
                    attempts=attempts,
                    content=response.content,
                    provider=response.provider,
                    model=response.model,
                )
            except Exception as exc:  # pragma: no cover - network/IO errors
                last_error = str(exc)
                backoff = self.task_config.retry_backoff * attempts
                await asyncio.sleep(backoff)

        progress.advance(task_id)
        return GenerationOutcome(
            job=job,
            success=False,
            attempts=attempts,
            error=last_error,
        )

    # ------------------------------------------------------------------ #
    # Payload helpers
    # ------------------------------------------------------------------ #
    def _build_debug_payload(
        self,
        pairs: Sequence[Tuple[int, int]],
        locales: Sequence[str],
        outcomes: Sequence[GenerationOutcome],
    ) -> Dict[str, Any]:
        outcome_map: Dict[Tuple[str, int, int], GenerationOutcome] = {
            (outcome.job.locale, outcome.job.interpretation_id, outcome.job.dimension_id): outcome
            for outcome in outcomes
        }

        items: List[Dict[str, Any]] = []
        for interpretation_id, dimension_id in pairs:
            record = {
                "interpretation_id": interpretation_id,
                "dimension_id": dimension_id,
                "cards": {},
                "dimensions": {},
                "results": {},
            }
            for locale in locales:
                card = self.repository.get_card(interpretation_id, locale)
                dimension = self.repository.get_dimension(dimension_id, locale)
                if card:
                    record["cards"][locale] = card.prompt_payload()
                if dimension:
                    record["dimensions"][locale] = dimension.prompt_payload()
                outcome = outcome_map.get((locale, interpretation_id, dimension_id))
                if outcome and outcome.success:
                    record["results"][locale] = {
                        "content": outcome.content,
                        "provider": outcome.provider,
                        "model": outcome.model,
                    }
            items.append(record)

        failures = [outcome.to_failure_dict() for outcome in outcomes if not outcome.success]

        return {
            "type": "debug-sample",
            "generated_at": datetime.utcnow().isoformat(),
            "locales": list(locales),
            "count": len(items),
            "items": items,
            "failed": failures,
        }

    def _merge_dimension_payload(
        self,
        dimension_id: int,
        locales: Sequence[str],
        outcomes: Sequence[GenerationOutcome],
        *,
        base_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        payload = base_payload or {
            "dimension_id": dimension_id,
            "generated_at": datetime.utcnow().isoformat(),
            "locales": [],
            "records": [],
            "failures": [],
        }

        existing_locales = list(payload.get("locales", []))
        for locale in locales:
            if locale not in existing_locales:
                existing_locales.append(locale)
        payload["locales"] = existing_locales

        # Build lookup for existing records
        record_lookup: Dict[int, Dict[str, Any]] = {
            record["interpretation_id"]: record for record in payload.get("records", [])
        }

        for outcome in outcomes:
            record = record_lookup.setdefault(
                outcome.job.interpretation_id,
                {
                    "interpretation_id": outcome.job.interpretation_id,
                    "card_id": outcome.job.card.card_id,
                    "direction": outcome.job.card.direction,
                    "cards": {},
                    "results": {},
                },
            )

            card_payload = outcome.job.card.prompt_payload()
            record.setdefault("cards", {})[outcome.job.locale] = card_payload

            dimension_payload = outcome.job.dimension.prompt_payload()
            record.setdefault("dimension", {})[outcome.job.locale] = dimension_payload

            if outcome.success:
                record.setdefault("results", {})[outcome.job.locale] = {
                    "content": outcome.content,
                    "provider": outcome.provider,
                    "model": outcome.model,
                }
            else:
                payload.setdefault("failures", []).append(outcome.to_failure_dict())

        payload["generated_at"] = datetime.utcnow().isoformat()
        payload["records"] = list(record_lookup.values())

        return payload

    def _load_existing_dimension_payload(self, dimension_id: int) -> Tuple[Dict[str, Any], set]:
        output_path = self._dimension_output_path(dimension_id)
        if not output_path.exists():
            return {}, set()

        data = json.loads(output_path.read_text(encoding="utf-8"))
        completed = set()
        for record in data.get("records", []):
            interpretation_id = record.get("interpretation_id")
            for locale in record.get("results", {}).keys():
                completed.add((locale, interpretation_id))
        return data, completed

    def _dimension_output_path(self, dimension_id: int) -> Path:
        base = Path(self.config.OUTPUT_PATH).parent / "dimensions"
        base.mkdir(parents=True, exist_ok=True)
        return base / f"dimension_{dimension_id}.json"

    # ------------------------------------------------------------------ #
    # Locale helpers
    # ------------------------------------------------------------------ #
    def _normalize_locales(self, locales: Optional[Sequence[str]]) -> List[str]:
        if not locales:
            return list(self.task_config.locales)
        normalized = []
        for locale in locales:
            normalized_locale = self._normalize_locale(locale)
            if normalized_locale not in normalized:
                normalized.append(normalized_locale)
        return normalized

    def _normalize_locale(self, locale: str) -> str:
        if not locale:
            return self.config.ROOT_LOCALE
        for configured in self.task_config.locales:
            if configured.lower() == locale.lower():
                return configured
        return locale

    def _resolve_dimension_id(self, dimension_ref: str) -> Optional[int]:
        if dimension_ref.isdigit():
            return int(dimension_ref)
        result = self.repository.get_dimension_id_by_name(dimension_ref)
        return result
