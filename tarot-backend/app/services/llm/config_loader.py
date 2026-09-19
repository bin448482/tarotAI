"""Load the provider-neutral LLM configuration from YAML."""

from pathlib import Path
from typing import Any, Dict

import yaml


def load_llm_config(config_path: str) -> Dict[str, Any]:
    """Load a YAML config, resolving relative paths from the backend directory."""
    requested = Path(config_path)
    candidates = [requested]
    if not requested.is_absolute():
        backend_root = Path(__file__).resolve().parents[3]
        candidates.append(backend_root / requested)

    path = next((candidate for candidate in candidates if candidate.is_file()), None)
    if path is None:
        return {}

    with path.open("r", encoding="utf-8") as handle:
        loaded = yaml.safe_load(handle) or {}

    if not isinstance(loaded, dict):
        raise ValueError(f"LLM config must be a YAML mapping: {path}")
    return loaded
