"""Locale-related helper utilities."""
from typing import Optional


def is_english_locale(locale: Optional[str]) -> bool:
    """Return True when locale indicates an English-based language."""
    return bool(locale and locale.lower().startswith("en"))

