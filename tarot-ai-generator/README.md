# Tarot-AI Generator Toolkit

Tarot-AI Generator produces multilingual tarot interpretations in bulk, routing prompts to the right LLMs and exporting structured JSON for downstream apps.

## 1. 项目简介 | Description
`tarot-ai-generator` 连接 SQLite 卡牌/维度数据库与多家大模型服务，支持从调试样本、维度全量生成，到问题驱动的自动解读。工具以 YAML + `.env` 管理提示词、语言分发、速率限制，并输出可回写数据库的 JSON，为移动端与后台提供稳定内容来源。

## 2. 功能特性 | Features
- 🎯 Mode-aware runners: `debug-sample`, `dimension`, `question`, `multilingual`, each with granular CLI flags.
- 🌐 Language routing: per-locale provider selection (Zhipu, OpenAI, Ollama) with individual temperature/throughput settings.
- 📦 Structured outputs: JSON bundles under `output/` capturing prompts, model metadata, and failure lists for retry.
- 🔁 Resume-friendly: dimension tasks skip completed combinations and log gaps for incremental backfill.
- 🧰 Import helpers: `scripts/import_dimension_results.py` validates and writes results back to SQLite with `--dry-run` safeguards.

## 3. 技术栈 | Tech Stack
- **Language**: Python 3.10+
- **Framework**: Typer CLI, asyncio, Pydantic config model
- **Database**: SQLite (`data/tarot_config.db`), SQLModel/SQLAlchemy accessors
- **Others**: YAML-driven settings, dotenv, httpx, tqdm progress bars

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Python >= 3.10
- SQLite CLI (optional, for manual inspection)
- Valid API keys for configured LLM providers

### 安装步骤 | Setup
```bash
# 1. Clone & enter module
cd tarot-ai-generator

# 2. Create virtualenv & install deps
python -m venv .venv
source .venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt

# 3. Configure secrets
cp .env.example .env            # 填写 API Key
cp config/settings.example.yaml config/settings.yaml

# 4. Validate config wiring
python - <<'PY'
from config import Config
Config().validate()
PY

# 5. Run desired command
python main.py debug-sample --count 10 --locales zh-CN en-US
python main.py dimension --name "情感-时间线-过去" --locales zh-CN en-US
python main.py question --text "我需要换工作吗？" --question-locale zh-CN --locales zh-CN en-US
```

- Outputs land in `output/<mode>/`; check `failures` arrays before importing.
- Use `scripts/import_dimension_results.py --dry-run ...` to preview DB writes.
- Keep `data/tarot_config.db` synced with the latest card/dimension translations to avoid lookup failures.

中文版使用指南请参考仓库根目录的 `README_CN.md` 或 `CLAUDE.md`。
