"""YAML-backed model registry with locale-aware provider routing."""

import os
from typing import Any, Dict, Iterable, Optional

from ...config import Settings
from .config_loader import load_llm_config
from .models import ModelProfile


class ModelRegistry:
    """Build and resolve the allowlisted models declared in config/llm.yaml."""

    def __init__(self, config: Settings):
        self.config = config
        self.llm_config = load_llm_config(config.LLM_CONFIG_PATH)
        self.locale_providers: Dict[str, str] = {
            str(key).lower(): str(value)
            for key, value in (self.llm_config.get("locale_providers") or {}).items()
        }
        self.active_model = (
            config.LLM_ACTIVE_MODEL
            or config.LLM_DEFAULT_MODEL
            or self.llm_config.get("active_model")
        )
        self._profiles = self._build_profiles()

    @property
    def profiles(self) -> Dict[str, ModelProfile]:
        return dict(self._profiles)

    def aliases(self) -> list[str]:
        return list(self._profiles.keys())

    def resolve(self, alias: Optional[str] = None) -> ModelProfile:
        selected = (alias or self.active_model or self._legacy_default_alias()).strip()
        profile = self._profiles.get(selected)
        if profile is None:
            raise ValueError(
                f"Unknown or unavailable LLM model '{selected}'. "
                f"Available models: {', '.join(self.aliases()) or 'none'}"
            )
        return profile

    def resolve_for_locale(self, locale: Optional[str]) -> ModelProfile:
        """Resolve the configured provider for a locale, then fall back to active_model."""
        normalized = (locale or "").replace("_", "-").lower()
        provider_name = None
        for prefix, candidate in self.locale_providers.items():
            if normalized.startswith(prefix):
                provider_name = candidate
                break

        if provider_name:
            candidates = [profile for profile in self._profiles.values() if profile.provider == provider_name]
            if candidates:
                return candidates[0]
        return self.resolve()

    def resolve_many(self, aliases: Iterable[str]) -> list[ModelProfile]:
        profiles = [self.resolve(alias) for alias in aliases]
        if not profiles:
            raise ValueError("At least one LLM model is required")
        return profiles

    def _legacy_default_alias(self) -> str:
        if self.config.API_PROVIDER == "openai":
            return self.config.OPENAI_MODEL_NAME or self.config.MODEL_NAME
        return self.config.ZHIPU_MODEL_NAME or self.config.MODEL_NAME

    def _build_profiles(self) -> Dict[str, ModelProfile]:
        profiles: Dict[str, ModelProfile] = {}
        yaml_providers = self.llm_config.get("providers") or {}

        if isinstance(yaml_providers, dict) and yaml_providers:
            for provider_name, raw_profile in yaml_providers.items():
                if not isinstance(raw_profile, dict):
                    raise ValueError(f"LLM provider '{provider_name}' must be a YAML mapping")
                profile = self._profile_from_yaml(str(provider_name), raw_profile)
                if profile is not None:
                    profiles[profile.alias] = profile
            return profiles

        # Backward-compatible fallback for deployments that have not installed YAML yet.
        return self._build_legacy_profiles()

    def _profile_from_yaml(self, provider_name: str, raw: Dict[str, Any]) -> Optional[ModelProfile]:
        api_key_env = str(raw.get("api_key_env") or "").strip()
        api_key = self._read_api_key(api_key_env)
        if not api_key:
            return None

        model = str(raw.get("model") or "").strip()
        if not model:
            raise ValueError(f"LLM provider '{provider_name}' has no model")

        extra_body = raw.get("extra_body") or {}
        if not isinstance(extra_body, dict):
            raise ValueError(f"LLM provider '{provider_name}' extra_body must be a mapping")

        return ModelProfile(
            alias=str(raw.get("alias") or model),
            provider=provider_name,
            model=model,
            api_key=api_key,
            base_url=str(raw.get("base_url") or "").strip(),
            json_mode=bool(raw.get("json_mode", True)),
            thinking=str(raw.get("thinking") or "disabled"),
            reasoning_effort=self._optional_string(raw.get("reasoning_effort")),
            max_tokens=int(raw.get("max_tokens", 8192)),
            temperature=float(raw.get("temperature", 0.7)),
            top_p=float(raw["top_p"]) if raw.get("top_p") is not None else None,
            supports_temperature=bool(raw.get("supports_temperature", True)),
            supports_top_p=bool(raw.get("supports_top_p", True)),
            extra_body=extra_body,
        )

    def _read_api_key(self, env_name: str) -> Optional[str]:
        value = getattr(self.config, env_name, None) or os.getenv(env_name)
        # Do not break existing installations during the variable rename.
        if not value and env_name == "ZHIPU_API_KEY":
            value = getattr(self.config, "ZHIPUAI_API_KEY", None) or os.getenv("ZHIPUAI_API_KEY")
        return value.strip() if isinstance(value, str) and value.strip() else None

    @staticmethod
    def _optional_string(value: Any) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    def _build_legacy_profiles(self) -> Dict[str, ModelProfile]:
        """Keep old env-only deployments working until they migrate to YAML."""
        profiles: Dict[str, ModelProfile] = {}
        zhipu_key = self._read_api_key("ZHIPU_API_KEY")
        if zhipu_key:
            model = self.config.ZHIPU_MODEL_NAME or self.config.MODEL_NAME
            is_glm53 = model.startswith("glm-5.3")
            profiles[model] = ModelProfile(
                alias=model,
                provider="zhipu",
                model=model,
                api_key=zhipu_key,
                base_url=self.config.ZHIPU_BASE_URL or "https://open.bigmodel.cn/api/paas/v4",
                json_mode=True,
                thinking="required" if is_glm53 else self.config.ZHIPU_THINKING,
                reasoning_effort=self.config.ZHIPU_REASONING_EFFORT or ("low" if is_glm53 else None),
                max_tokens=self.config.ZHIPU_MAX_TOKENS,
                temperature=self.config.ZHIPU_TEMPERATURE,
            )

        if self.config.OPENAI_API_KEY:
            model = self.config.OPENAI_MODEL_NAME or "gpt-4o-mini"
            profiles[model] = ModelProfile(
                alias=model,
                provider="openai",
                model=model,
                api_key=self.config.OPENAI_API_KEY,
                base_url=self.config.OPENAI_BASE_URL or "https://api.openai.com/v1",
                json_mode=True,
                max_tokens=self.config.MAX_TOKENS,
                temperature=self.config.TEMPERATURE,
            )
        return profiles
