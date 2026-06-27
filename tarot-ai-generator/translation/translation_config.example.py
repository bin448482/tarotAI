#!/usr/bin/env python3
"""
translation_config.py 示例
===========================

此文件展示如何通过环境变量配置翻译脚本。复制这些变量到
`tarot-ai-generator/.env`（或 shell 环境）后，主配置会自动读取。
"""

EXAMPLE_ENV_VARS = {
    "TRANSLATION_OPENAI_API_KEY": "your-openai-api-key",
    "TRANSLATION_OPENAI_BASE_URL": "https://api.openai.com/v1",
    "TRANSLATION_OPENAI_MODEL": "gpt-4o-mini",
    "TRANSLATION_OPENAI_TEMPERATURE": "0.35",
    "TRANSLATION_OPENAI_MAX_TOKENS": "2000",
    "TRANSLATION_OPENAI_TIMEOUT": "60",
    "TRANSLATION_RATE_LIMIT_PER_MINUTE": "60",
    "TRANSLATION_BATCH_SIZE": "10",
}

if __name__ == "__main__":
    print("复制下列变量到 tarot-ai-generator/.env: \n")
    for key, value in EXAMPLE_ENV_VARS.items():
        print(f"{key}={value}")
