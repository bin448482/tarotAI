from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict

from data_loader import CardInterpretationRecord, DimensionRecord


@dataclass
class PromptContext:
    card: CardInterpretationRecord
    dimension: DimensionRecord
    question: str | None = None
    locale: str = ""


class PromptTemplateRegistry:
    """Load and cache prompt templates per locale."""

    def __init__(self, template_paths: Dict[str, str], root_locale: str):
        self.root_locale = root_locale
        self.template_paths = template_paths
        self._cache: Dict[str, str] = {}

        for locale, path in template_paths.items():
            self._cache[locale] = self._read_template(path)

    def get(self, locale: str) -> str:
        if locale in self._cache:
            return self._cache[locale]
        if locale.lower() == self.root_locale.lower():
            return self._cache[self.root_locale]
        # fallback to root template
        return self._cache.get(self.root_locale)

    def _read_template(self, path: str) -> str:
        return Path(path).read_text(encoding="utf-8")


class PromptBuilder:
    """Render prompts using localized templates and contextual data."""

    def __init__(self, registry: PromptTemplateRegistry):
        self.registry = registry

    def build(self, context: PromptContext) -> str:
        template = self.registry.get(context.locale or context.card.locale)
        payload = context.card.prompt_payload()
        payload.update(context.dimension.prompt_payload())
        payload.setdefault("question", context.question or "")
        payload.setdefault("locale", context.locale or context.card.locale)
        return template.format(**payload)
