# 塔罗牌维度解读生成工具 (CLAUDE.md)

## 📖 项目简介

`tarot-ai-generator` 提供一套多语言的塔罗牌维度解读生成引擎。系统基于 SQLite 配置库读取卡牌与维度数据，按照语言路由到不同的大模型（智谱、OpenAI、Ollama），并以协程并发方式批量生成解读内容。核心定位是：调试提示词 → 批量生成维度 → 基于问题描述输出整套维度解读。

## 🎯 核心功能

- **多语言调试样本**：`debug-sample` 命令随机抽取卡牌 × 维度组合，快速评估中/英等语言的提示词效果。
- **维度定义生成**：`multilingual` 命令根据问题文本输出多语言维度描述 JSON，支撑 `dimension` / `question` 触发链路。
- **维度全量生成**：`dimension` 命令一次性为 156 张卡牌生成指定维度的多语言解读，自动断点续传并追踪失败项。
- **问题驱动生成**：`question` 命令根据问题描述匹配 3 个维度，循环调用 `dimension` 流程输出整套多语言解读。
- **多模型路由**：按语言配置不同模型、温度、速率限制与并发批大小，自动调用智谱、OpenAI 或 Ollama。
- **失败记录与补齐**：生成过程中记录失败的语言/卡牌组合，可按语言或维度重新执行补齐。
- **结构化输出**：统一 JSON 输出包含提示词上下文、模型信息与多语言正文，便于审校与写回数据库。

## 📁 目录结构

```
tarot-ai-generator/
├── main.py                    # CLI 入口（debug-sample / dimension / question）
├── data_loader.py             # SQLite 数据访问层，整合多语言卡牌与维度
├── services/                  # 核心业务模块
│   ├── generation_service.py   # 多语言调度、断点续传、失败补齐
│   ├── model_router.py         # 语言 → 模型路由与速率限制
│   └── prompt_builder.py       # 多语言提示词模板加载与渲染
├── config.py                  # 配置解析与校验
├── config/                    # YAML 配置（settings.yaml、multilingual_dimension.yaml）
├── prompt_template.txt        # 中文提示词模板
├── prompt_template.en.txt     # 英文提示词模板
├── multilingual.py            # 多语言维度解析工具（保留）
├── requirements.txt           # Python 依赖清单
├── .env.example               # 环境变量示例（敏感信息留空）
├── output/                    # 生成结果、失败记录与日志
└── translation/               # 翻译系统（独立模块）
```

## 🚀 快速开始

1. **创建并激活虚拟环境**
   ```bash
   cd tarot-ai-generator
   venv\Scripts\activate      # Windows
   # 或
   source venv/bin/activate   # Linux / macOS
   ```
2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```
3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   仅在 `.env` 中填写敏感信息（如 `ZHIPUAI_API_KEY`、`OPENAI_API_KEY` 等），其他配置统一写入 `config/settings.yaml`。
4. **校验配置**
   ```bash
   python - <<'PY'
   from config import Config
   Config().validate()
   PY
   ```
   若未报错则表示数据库、提示词模板与密钥配置正确。

## 🔧 配置要点

`config/settings.yaml` 拆解：

- `database.path`：SQLite 配置库路径，默认 `data/tarot_config.db`。
- `database.root_locale` / `database.locales`：主语言与生成语言列表（如 `["zh-CN", "en-US"]`）。
- `paths.prompt_templates`：语言 → 提示词模板路径映射，例如 `zh-CN: prompt_template.txt`、`en-US: prompt_template.en.txt`。
- `llm.language_providers`：语言 → `provider` / `model` / `temperature` / `rate_limit_per_minute` / `batch_size`。
- `llm.<provider>.api_key`：模型密钥，优先读取 YAML，可被 `.env` 覆盖。

`config/multilingual_dimension.yaml` 仍用于翻译工具（`multilingual.py`），与解读生成流程相互独立。

## 🛠️ CLI 用法

```bash
python main.py --help
python main.py debug-sample --help
python main.py dimension --help
python main.py question --help
```

### 调试样本（debug-sample）
```bash
# 随机抽取 10 个卡牌×维度组合，输出多语言样本
python main.py debug-sample --count 10 --locales zh-CN en-US
```
- 输出位置：`output/debug_samples/debug_samples_<timestamp>.json`
- 内容包含卡牌/维度上下文与多语言生成结果，便于比较提示词表现。

### 多语言维度定义（multilingual）
```bash
# 基于问题文本生成多语言维度定义 JSON，并写入 dimension 表
python main.py multilingual --text "她是否喜欢我？" --spread-type three-card
# 仅生成 JSON：追加 --no-import；仅预览导入：追加 --dry-run
```
- 输出位置：默认 `output/multilingual_dimensions.json`，可通过 `--output` 自定义。
- 命令默认立即写入 `dimension` / `dimension_translation`；如需手动导入，也可使用 `--no-import` 并执行 `import_multilingual_dimensions.py`。

### 维度全量生成（dimension）
```bash
# 为“情感-时间线-过去”维度生成多语言解读
python main.py dimension --name "情感-时间线-过去" --locales zh-CN en-US
```
- 支持传入维度名称或 ID。
- 若 `output/dimensions/dimension_<id>.json` 已存在，将跳过已完成的语言/卡牌组合，实现断点续传。
- `--no-persist` 可仅返回结果而不写入文件。

### 问题驱动生成（question）
```bash
# 根据问题描述匹配维度并批量生成解读
python main.py question --text "我需要换工作吗？" --question-locale zh-CN --locales zh-CN en-US
```
- 根据 `dimension_translation.description` 匹配维度（默认一条问题对应 3 个维度）。
- 内部复用 `dimension` 逻辑，确保维度 JSON 可复用。
- 输出位置：`output/questions/question_<timestamp>.json`。

## 📊 数据来源

- **卡牌解读**：`card_interpretation`（主语言） + `card_interpretation_translation`（多语言）
- **维度定义**：`dimension` + `dimension_translation`
- **问题 → 维度映射**：`dimension_translation.description`（多语言问题描述）

`data_loader.TarotDataLoader` 会自动融合主语言与翻译内容，并提供缓存化的 `TarotDataRepository` 以供上层使用。
当配置使用 `en-US` 等区域化语言代码时，数据访问层会自动回退到基础语言（例如 `en`），确保英文明细取用正确的翻译字段。

## 📁 输出结构

- `output/debug_samples/`：调试样本，包含 `items` 与 `failed` 列表。
- `output/dimensions/dimension_<id>.json`：维度全量结果；按 `interpretation_id` 存储不同语言的卡牌上下文与内容。
- `output/questions/question_<timestamp>.json`：问题驱动聚合结果，内嵌多个维度文件的概要。
- `output/logs/`：预留日志目录，可放置失败任务或运行快照。

维度输出示例：
```json
{
  "dimension_id": 5,
  "locales": ["zh-CN", "en-US"],
  "records": [
    {
      "interpretation_id": 12,
      "card_id": 6,
      "direction": "正位",
      "cards": {
        "zh-CN": {"card_name": "愚者", "summary": "..."},
        "en-US": {"card_name": "The Fool", "summary": "..."}
      },
      "results": {
        "zh-CN": {"content": "...", "provider": "zhipu", "model": "glm-4"},
        "en-US": {"content": "...", "provider": "openai", "model": "gpt-4o-mini"}
      }
    }
  ],
  "failures": []
}
```

## 💰 成本与执行建议

- **debug-sample**：约 `样本数 × 语言数` 次调用，建议 5–10 条评估提示词。
- **dimension**：156 张卡牌 × 语言数；单语言大约 7.8 万 tokens（按 500 tokens/条估算）。
- **question**：约等于 3 个 `dimension` 调用（当前一条问题对应 3 个维度）。

推荐流程：先运行 `debug-sample` 调整提示词 → 再执行 `dimension` → 最后使用 `question` 验证整套流程。

## 🔄 失败补齐流程

1. 生成完成后检查输出 JSON 中的 `failures` 字段。
2. 再次执行同一命令（可限定 `--locales`），系统会自动跳过已完成组合，仅重试失败项。
3. 若需要手动定位，可根据 `interpretation_id` / `dimension_id` 到数据库中查询对应卡牌/维度。
4. 对于持续失败的模型，可临时降低 `temperature` 或改用备用模型后重新执行。

## 🛠️ 常见问题

| 问题 | 排查建议 |
|------|----------|
| 缺少 API 密钥 | 检查 `.env` 或 `config/settings.yaml` 中的 `api_key` 字段 |
| 数据库不存在 | 确认 `data/tarot_config.db` 是否存在，必要时重新运行导入脚本 |
| 提示词模板缺失 | 检查 `paths.prompt_templates` 指定文件是否存在 |
| 频率限制报错 | 调整 `llm.language_providers.*.rate_limit_per_minute` 或减少并发执行 |
| 生成内容语言错误 | 检查对应语言的提示词模板是否正确加载，或翻译是否完备 |
| 英文结果仍含中文牌名 | 确认 `card_translation` 表中英文翻译是否存在（支持 `en` / `en-US`），更新数据库后重新执行 |

## 📓 最佳实践

- 定期备份 `output/dimensions/` 与 `output/questions/` 目录，便于复盘与导入。
- 针对英文等非中文提示词，优先通过 `debug-sample` 检测语气与结构是否符合预期。
- 若新增语言：更新 `database.locales`、新增提示词模板，并在 `llm.language_providers` 中配置模型即可。

## 📞 支持

- 代码结构或 CLI 问题：查看 `main.py` 与 `services/generation_service.py` 的实现。
- 模型调用与速率：参考 `services/model_router.py` 与 `config/settings.yaml`。
- 数据写回：使用 `scripts/import_dimension_results.py` 批量落库，可先 `--dry-run` 验证再提交。

保持对输出质量的人工审阅，确保生成内容符合产品要求。祝开发顺利！
