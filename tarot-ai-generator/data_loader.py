from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class CardInterpretationRecord:
    interpretation_id: int
    card_id: int
    locale: str
    name: str
    direction: str
    summary: str
    detail: str
    deck: Optional[str]
    suit: Optional[str]

    def prompt_payload(self) -> Dict[str, str]:
        return {
            "card_name": self.name,
            "direction": self.direction,
            "summary": self.summary,
            "detail": self.detail,
            "deck": self.deck or "",
            "suit": self.suit or "",
        }


@dataclass(frozen=True)
class DimensionRecord:
    dimension_id: int
    locale: str
    name: str
    category: str
    description: str
    aspect: Optional[str]
    aspect_type: Optional[int]

    def prompt_payload(self) -> Dict[str, str]:
        return {
            "dimension_name": self.name,
            "category": self.category,
            "description": self.description,
            "aspect": self.aspect or "",
            "aspect_type": "" if self.aspect_type is None else str(self.aspect_type),
        }


class TarotDataLoader:
    """Low-level SQLite reader for tarot configuration content."""

    def __init__(self, database_path: str, locales: Sequence[str], root_locale: str):
        self.database_path = Path(database_path)
        self.locales = list(dict.fromkeys(locales))
        self.root_locale = root_locale

        if self.root_locale not in self.locales:
            self.locales.insert(0, self.root_locale)

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.database_path))
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def load_cards(self, locales: Optional[Sequence[str]] = None) -> Dict[str, List[CardInterpretationRecord]]:
        """Load card interpretations for the requested locales."""
        requested = self._normalize_locales(locales)
        results: Dict[str, List[CardInterpretationRecord]] = {}

        query = """
        SELECT
            ci.id               AS interpretation_id,
            ci.card_id          AS card_id,
            COALESCE(ct_primary.name, ct_fallback.name, c.name) AS name,
            COALESCE(cit_primary.direction, cit_fallback.direction, ci.direction) AS direction,
            COALESCE(cit_primary.summary, cit_fallback.summary, ci.summary) AS summary,
            COALESCE(cit_primary.detail, cit_fallback.detail, ci.detail)   AS detail,
            COALESCE(ct_primary.deck, ct_fallback.deck, c.deck)            AS deck,
            COALESCE(ct_primary.suit, ct_fallback.suit, c.suit)            AS suit
        FROM card_interpretation ci
        JOIN card c ON c.id = ci.card_id
        LEFT JOIN card_translation ct_primary
            ON ct_primary.card_id = c.id AND ct_primary.locale = ?
        LEFT JOIN card_translation ct_fallback
            ON ct_fallback.card_id = c.id AND ct_fallback.locale = ?
        LEFT JOIN card_interpretation_translation cit_primary
            ON cit_primary.interpretation_id = ci.id AND cit_primary.locale = ?
        LEFT JOIN card_interpretation_translation cit_fallback
            ON cit_fallback.interpretation_id = ci.id AND cit_fallback.locale = ?
        ORDER BY c.id, ci.direction
        """

        with self._connect() as conn:
            for locale in requested:
                primary_locale, fallback_locale = self._locale_primary_and_fallback(locale)
                rows = conn.execute(
                    query,
                    (primary_locale, fallback_locale, primary_locale, fallback_locale),
                ).fetchall()
                records = [
                    CardInterpretationRecord(
                        interpretation_id=row["interpretation_id"],
                        card_id=row["card_id"],
                        locale=locale,
                        name=row["name"],
                        direction=row["direction"],
                        summary=row["summary"],
                        detail=row["detail"] or "",
                        deck=row["deck"],
                        suit=row["suit"],
                    )
                    for row in rows
                ]
                results[locale] = records

        return results

    def load_dimensions(self, locales: Optional[Sequence[str]] = None) -> Dict[str, List[DimensionRecord]]:
        """Load dimension definitions for the requested locales."""
        requested = self._normalize_locales(locales)
        results: Dict[str, List[DimensionRecord]] = {}

        query = """
        SELECT
            d.id AS dimension_id,
            COALESCE(dt_primary.name, dt_fallback.name, d.name) AS name,
            COALESCE(dt_primary.category, dt_fallback.category, d.category) AS category,
            COALESCE(dt_primary.description, dt_fallback.description, d.description) AS description,
            COALESCE(dt_primary.aspect, dt_fallback.aspect, d.aspect) AS aspect,
            d.aspect_type AS aspect_type
        FROM dimension d
        LEFT JOIN dimension_translation dt_primary
            ON dt_primary.dimension_id = d.id AND dt_primary.locale = ?
        LEFT JOIN dimension_translation dt_fallback
            ON dt_fallback.dimension_id = d.id AND dt_fallback.locale = ?
        ORDER BY d.id
        """

        with self._connect() as conn:
            for locale in requested:
                primary_locale, fallback_locale = self._locale_primary_and_fallback(locale)
                rows = conn.execute(query, (primary_locale, fallback_locale)).fetchall()
                records = [
                    DimensionRecord(
                        dimension_id=row["dimension_id"],
                        locale=locale,
                        name=row["name"],
                        category=row["category"],
                        description=row["description"],
                        aspect=row["aspect"],
                        aspect_type=row["aspect_type"],
                    )
                    for row in rows
                ]
                results[locale] = records

        return results

    def find_dimensions_by_description(
        self,
        description: str,
        locale: Optional[str] = None,
    ) -> List[int]:
        """
        Resolve dimension IDs by matching description text in the requested locale.
        Returns a list of dimension_ids ordered by ID.
        """
        target_locale = locale or self.root_locale
        target_locale = self._normalize_locale(target_locale)

        query = """
        SELECT dimension_id
        FROM dimension_translation
        WHERE locale = ? AND description = ?
        ORDER BY dimension_id
        """

        with self._connect() as conn:
            for candidate in self._locale_preferences(target_locale):
                rows = conn.execute(query, (candidate, description)).fetchall()
                if rows:
                    return [row["dimension_id"] for row in rows]

        # Fallback to root dimension table if translation not found
        fallback_query = """
        SELECT id
        FROM dimension
        WHERE description = ?
        ORDER BY id
        """

        with self._connect() as conn:
            rows = conn.execute(fallback_query, (description,)).fetchall()
            return [row["id"] for row in rows]

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _normalize_locales(self, locales: Optional[Sequence[str]]) -> List[str]:
        if not locales:
            return list(self.locales)

        result: List[str] = []
        for locale in locales:
            normalized = self._normalize_locale(locale)
            if normalized not in result:
                result.append(normalized)
        return result

    def _normalize_locale(self, locale: str) -> str:
        locale = locale or self.root_locale
        for known in self.locales:
            if known.lower() == locale.lower():
                return known
        return locale

    def _locale_preferences(self, locale: str) -> List[str]:
        normalized = self._normalize_locale(locale)
        preferences: List[str] = [normalized]
        base = normalized.replace("_", "-")
        if "-" in base:
            base = base.split("-", 1)[0]
        if base and base.lower() != normalized.lower() and base not in preferences:
            preferences.append(base)
        return preferences

    def _locale_primary_and_fallback(self, locale: str) -> Tuple[str, str]:
        preferences = self._locale_preferences(locale)
        primary = preferences[0]
        fallback = preferences[1] if len(preferences) > 1 else primary
        return primary, fallback


class TarotDataRepository:
    """In-memory cache with convenient indices for cards and dimensions."""

    def __init__(self, loader: TarotDataLoader):
        self.loader = loader
        self.locales = list(loader.locales)
        self.root_locale = loader.root_locale

        self.cards_by_locale = loader.load_cards(self.locales)
        self.dimensions_by_locale = loader.load_dimensions(self.locales)

        self.cards_index: Dict[int, Dict[str, CardInterpretationRecord]] = {}
        self.dimensions_index: Dict[int, Dict[str, DimensionRecord]] = {}

        self._build_indices()

    def _build_indices(self) -> None:
        for locale, records in self.cards_by_locale.items():
            for record in records:
                self.cards_index.setdefault(record.interpretation_id, {})[locale] = record

        for locale, records in self.dimensions_by_locale.items():
            for record in records:
                self.dimensions_index.setdefault(record.dimension_id, {})[locale] = record

        # Maintain deterministic ordering for iteration
        self.card_order: List[int] = sorted(self.cards_index.keys())
        self.dimension_order: List[int] = sorted(self.dimensions_index.keys())

        # Build helper lookups using root locale strings
        root_cards = self.cards_by_locale.get(self.root_locale, [])
        self.cards_by_name_direction: Dict[Tuple[str, str], int] = {
            (record.name, record.direction): record.interpretation_id for record in root_cards
        }

        root_dimensions = self.dimensions_by_locale.get(self.root_locale, [])
        self.dimension_by_name: Dict[str, int] = {
            record.name: record.dimension_id for record in root_dimensions
        }
        self.dimension_by_description: Dict[str, List[int]] = {}
        for record in root_dimensions:
            if not record.description:
                continue
            bucket = self.dimension_by_description.setdefault(record.description, [])
            if record.dimension_id not in bucket:
                bucket.append(record.dimension_id)

    # ------------------------------------------------------------------ #
    # Access helpers
    # ------------------------------------------------------------------ #
    def iter_card_interpretations(self) -> Iterable[int]:
        return list(self.card_order)

    def iter_dimensions(self) -> Iterable[int]:
        return list(self.dimension_order)

    def get_card(self, interpretation_id: int, locale: str) -> Optional[CardInterpretationRecord]:
        locale = self.loader._normalize_locale(locale)
        localized = self.cards_index.get(interpretation_id, {})
        if locale in localized:
            return localized[locale]
        return localized.get(self.root_locale)

    def get_dimension(self, dimension_id: int, locale: str) -> Optional[DimensionRecord]:
        locale = self.loader._normalize_locale(locale)
        localized = self.dimensions_index.get(dimension_id, {})
        if locale in localized:
            return localized[locale]
        return localized.get(self.root_locale)

    def get_dimension_id_by_name(self, name: str) -> Optional[int]:
        return self.dimension_by_name.get(name)

    def get_dimension_ids_by_description(self, description: str, locale: Optional[str] = None) -> List[int]:
        locale = locale or self.root_locale
        locale = self.loader._normalize_locale(locale)
        if locale == self.root_locale:
            matches = self.dimension_by_description.get(description, [])
            return list(matches)
        return self.loader.find_dimensions_by_description(description, locale=locale)

    def get_card_id_by_name_direction(self, name: str, direction: str) -> Optional[int]:
        key = (name, direction)
        return self.cards_by_name_direction.get(key)
