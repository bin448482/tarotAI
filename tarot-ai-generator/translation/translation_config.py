#!/usr/bin/env python3
"""
塔罗牌翻译系统配置文件
独立配置管理，不依赖外部配置。
敏感信息（如 API Key）通过环境变量或 .env 文件注入。
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv


class TranslationConfig:
    """翻译系统配置类"""

    def __init__(self) -> None:
        self.base_dir = Path(__file__).parent
        load_dotenv(self.base_dir.parent / ".env")
        self.config = self._load_config()
        self.validate()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _env_str(self, key: str, default: str | None = None) -> str | None:
        value = os.getenv(key)
        return value if value not in (None, "") else default

    def _env_float(self, key: str, default: float) -> float:
        value = os.getenv(key)
        return float(value) if value not in (None, "") else default

    def _env_int(self, key: str, default: int) -> int:
        value = os.getenv(key)
        return int(value) if value not in (None, "") else default

    # ------------------------------------------------------------------
    def _load_config(self) -> Dict[str, Any]:
        """加载翻译配置"""

        openai_api_key = self._env_str("TRANSLATION_OPENAI_API_KEY") or self._env_str("OPENAI_API_KEY")
        openai_base_url = self._env_str(
            "TRANSLATION_OPENAI_BASE_URL",
            self._env_str("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        )
        openai_model = self._env_str("TRANSLATION_OPENAI_MODEL", self._env_str("OPENAI_MODEL_NAME", "gpt-4o-mini"))
        openai_temperature = self._env_float("TRANSLATION_OPENAI_TEMPERATURE", 0.3)
        openai_max_tokens = self._env_int("TRANSLATION_OPENAI_MAX_TOKENS", 2000)
        openai_timeout = self._env_int("TRANSLATION_OPENAI_TIMEOUT", 60)
        rate_limit_per_minute = self._env_int("TRANSLATION_RATE_LIMIT_PER_MINUTE", 60)
        batch_size = self._env_int("TRANSLATION_BATCH_SIZE", 10)

        return {
            # AI API配置
            "ai_config": {
                "provider": "openai",
                "openai": {
                    "api_key": openai_api_key,
                    "base_url": openai_base_url,
                    "model": openai_model,
                    "temperature": openai_temperature,  # 稍微提高温度以获得更好的响应
                    "max_tokens": openai_max_tokens,   # 增加token限制
                    "timeout": openai_timeout,
                },
            },

            # 数据库配置
            "database": {
                "path": self.base_dir.parent / "data" / "tarot_config.db",
                "source_locale": "zh-CN",
                "target_locale": "en",
            },

            # 输出路径配置
            "paths": {
                "output_root": self.base_dir / "output",
                "raw_data_dir": self.base_dir / "output" / "database_raw",
                "translated_data_dir": self.base_dir / "output" / "database_translated",
                "prompts_dir": self.base_dir / "prompts",
                "glossary_file": self.base_dir / "translation_glossary.json",
            },

            # 批处理配置
            "batch_config": {
                "batch_size": batch_size,
                "rate_limit_per_minute": rate_limit_per_minute,
                "max_retries": 3,
                "retry_delay": 2.0,
            },

            # 翻译表配置
            "tables": {
                "card": {
                    "source_file": "card_raw.json",
                    "target_file": "card_translated.json",
                    "prompt_file": "card_translation.txt",
                    "description": "塔罗牌基础信息翻译",
                },
                "spread": {
                    "source_file": "spread_raw.json",
                    "target_file": "spread_translated.json",
                    "prompt_file": "spread_translation.txt",
                    "description": "牌阵翻译",
                },
                "card_interpretation": {
                    "source_file": "card_interpretation_raw.json",
                    "target_file": "card_interpretation_translated.json",
                    "prompt_file": "interpretation_translation.txt",
                    "description": "卡牌解读翻译",
                },
            },
        }

    def validate(self) -> None:
        """验证配置完整性"""
        required_sections = ["ai_config", "database", "paths", "batch_config", "tables"]

        for section in required_sections:
            if section not in self.config:
                raise ValueError(f"配置缺少必需的节: {section}")

        # 验证AI配置
        ai_config = self.config["ai_config"]
        if ai_config["provider"] == "openai":
            openai_config = ai_config.get("openai", {})
            required_openai_keys = ["api_key", "base_url", "model"]
            for key in required_openai_keys:
                if not openai_config.get(key):
                    raise ValueError(f"OpenAI配置缺少必需的键: {key}")

        # 验证数据库路径
        db_path = self.config["database"]["path"]
        if not db_path.exists():
            raise FileNotFoundError(f"数据库文件不存在: {db_path}")

        # 创建输出目录
        for path_key in ["output_root", "raw_data_dir", "translated_data_dir", "prompts_dir"]:
            path = self.config["paths"][path_key]
            path.mkdir(parents=True, exist_ok=True)

    def get_ai_config(self) -> Dict[str, Any]:
        """获取AI配置"""
        provider = self.config["ai_config"]["provider"]
        return self.config["ai_config"][provider]

    def get_table_config(self, table_name: str) -> Dict[str, Any]:
        """获取表的翻译配置"""
        if table_name not in self.config["tables"]:
            raise ValueError(f"未知的表名: {table_name}")
        return self.config["tables"][table_name]

    def get_prompt_file_path(self, table_name: str) -> Path:
        """获取提示词文件路径"""
        table_config = self.get_table_config(table_name)
        return self.config["paths"]["prompts_dir"] / table_config["prompt_file"]

    def get_source_file_path(self, table_name: str) -> Path:
        """获取源数据文件路径"""
        table_config = self.get_table_config(table_name)
        return self.config["paths"]["raw_data_dir"] / table_config["source_file"]

    def get_target_file_path(self, table_name: str) -> Path:
        """获取目标翻译文件路径"""
        table_config = self.get_table_config(table_name)
        return self.config["paths"]["translated_data_dir"] / table_config["target_file"]

    def get_all_table_names(self) -> list:
        """获取所有需要翻译的表名"""
        return list(self.config["tables"].keys())

    def __getitem__(self, key: str) -> Any:
        """支持字典式访问"""
        return self.config[key]

    def __contains__(self, key: str) -> bool:
        """支持in操作符"""
        return key in self.config


# 全局配置实例
_config_instance = None


def get_config() -> TranslationConfig:
    """获取全局配置实例"""
    global _config_instance
    if _config_instance is None:
        _config_instance = TranslationConfig()
    return _config_instance


if __name__ == "__main__":
    # 配置验证测试
    try:
        config = get_config()
        print("✅ 翻译配置验证通过")
        print(f"📁 输出目录: {config['paths']['output_root']}")
        print(f"🗄️ 数据库路径: {config['database']['path']}")
        print(f"🤖 AI模型: {config.get_ai_config()['model']}")
        print(f"📋 翻译表: {', '.join(config.get_all_table_names())}")
    except Exception as e:
        print(f"❌ 配置验证失败: {e}")
