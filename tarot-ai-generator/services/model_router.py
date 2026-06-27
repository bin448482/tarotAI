from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Dict, Optional

from config import Config
from multilingual import LLMInvoker, LLMResponse


class AsyncRateLimiter:
    """Simple asyncio-based rate limiter with per-locale granularity."""

    def __init__(self, per_minute: int):
        self.per_minute = per_minute
        self._interval = 60.0 / per_minute if per_minute > 0 else 0.0
        self._lock = asyncio.Lock()
        self._next_time = 0.0

    async def acquire(self) -> None:
        if self._interval <= 0:
            return
        async with self._lock:
            loop = asyncio.get_running_loop()
            now = loop.time()
            wait_for = max(0.0, self._next_time - now)
            if wait_for > 0:
                await asyncio.sleep(wait_for)
            self._next_time = loop.time() + self._interval


@dataclass
class LocaleModelConfig:
    locale: str
    provider: str
    model: str
    temperature: float
    max_tokens: int
    rate_limit_per_minute: int
    batch_size: int


class ModelRouter:
    """Route generation calls to provider/model combos configured per locale."""

    def __init__(self, config: Config):
        self.config = config
        self.invoker = LLMInvoker(config)
        self.locale_configs: Dict[str, LocaleModelConfig] = {}
        self.rate_limiters: Dict[str, AsyncRateLimiter] = {}

        for locale, meta in config.LANGUAGE_PROVIDERS.items():
            locale_cfg = LocaleModelConfig(
                locale=locale,
                provider=meta["provider"],
                model=meta["model"],
                temperature=float(meta["temperature"]),
                max_tokens=int(meta["max_tokens"]),
                rate_limit_per_minute=int(meta["rate_limit_per_minute"]),
                batch_size=int(meta["batch_size"]),
            )
            self.locale_configs[locale] = locale_cfg
            self.rate_limiters[locale] = AsyncRateLimiter(locale_cfg.rate_limit_per_minute)

    def get_locale_config(self, locale: str) -> LocaleModelConfig:
        for key, cfg in self.locale_configs.items():
            if key.lower() == locale.lower():
                return cfg
        # fallback to root locale
        return self.locale_configs[self.config.ROOT_LOCALE]

    async def generate(self, locale: str, prompt: str, *, force_json: bool = False) -> LLMResponse:
        cfg = self.get_locale_config(locale)
        limiter = self.rate_limiters.get(cfg.locale)

        if limiter:
            await limiter.acquire()

        return await asyncio.to_thread(
            self.invoker.call,
            cfg.provider,
            cfg.model,
            prompt,
            cfg.temperature,
            cfg.max_tokens,
            force_json=force_json,
        )
