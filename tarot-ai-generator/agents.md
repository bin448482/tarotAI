# 塔罗牌维度解读生成工具 · 协作手册 (agents.md)

## 🎯 目标

- 统一对多语言解读生成的理解与操作流程。
- 明确涉及角色（Prompt 调优、数据管理、模型调用）的协作边界。
- 确保任何成员都能快速复现“调试 → 批量 → 校验”流程。

## 🤝 角色分工

| 角色 | 关键职责 | 交付物 |
|------|----------|--------|
| Prompt/内容工程师 | 维护多语言提示词模板、验证输出质量 | `prompt_template*.txt`、调试样本审阅记录 |
| 数据工程师 | 维护 `tarot_config.db`、维度描述映射、输出写回脚本 | SQLite 数据、导入/导出脚本、维度-问题映射表 |
| LLM 工程师 | 维护 `config/settings.yaml`、模型路由、速率限制 | 模型配置、API 密钥管理、失败补齐日志 |
| QA / 审校 | 抽查 `output/dimensions/` 与 `output/questions/` | 质量反馈、重新生成清单 |

> 若团队规模较小，可合并角色，但请显式写明由谁负责对应工单。

## 🧭 核心能力概览

- 多语言调试样本：验证提示词与翻译质量（`debug-sample`）。
- 维度全量生成：批量输出 156 张卡牌的指定维度解读（`dimension`）。
- 问题驱动输出：根据问题描述自动找出 3 个维度并批量生成（`question`）。
- 断点续传：重复执行命令会跳过已完成组合，仅补齐缺失项。
- 失败追踪：输出 JSON 中附带 `failures` 列表，便于二次执行或人工介入。

## 📁 代码结构

```
tarot-ai-generator/
├── main.py                    # CLI 入口
├── data_loader.py             # SQLite 多语言数据访问层
├── services/                  # 业务核心（调度 / 模型路由 / 提示词构建）
├── config.py                  # 配置解析与校验
├── config/settings.yaml       # 主配置（数据库、模板、模型映射）
├── prompt_template.txt        # 中文提示词模板
├── prompt_template.en.txt     # 英文提示词模板
├── output/                    # 输出与失败记录
└── translation/               # 翻译子系统（独立）
```

## ⚙️ 配置重点

```yaml
database:
  path: data/tarot_config.db
  root_locale: zh-CN
  locales:
    - zh-CN
    - en-US

paths:
  prompt_templates:
    zh-CN: prompt_template.txt
    en-US: prompt_template.en.txt

llm:
  language_providers:
    zh-CN:
      provider: zhipu
      model: glm-4-Flash
      temperature: 0.1
      rate_limit_per_minute: 60
      batch_size: 8
    en-US:
      provider: openai
      model: gpt-4o-mini
      temperature: 0.2
      rate_limit_per_minute: 40
      batch_size: 4
```

- 密钥建议写在 `settings.yaml` 中的 `llm.<provider>.api_key`，`.env` 仅在临时覆盖时使用。
- 新增语言时同步维护：`database.locales`、提示词模板文件、`llm.language_providers` 条目。
- 模型切换时同步通知内容团队，确认提示词是否需要调整语气或结构。
- 数据加载层会自动将 `en-US`→`en` 等区域化代码回退到基础语言，确保当数据库仅存 `en` 翻译时英文模板依旧获取正确字段。

## 🛠️ CLI 操作

```bash
python main.py debug-sample --count 10 --locales zh-CN en-US
python main.py dimension --name "情感-时间线-过去" --locales zh-CN en-US
python main.py question --text "我需要换工作吗？" --question-locale zh-CN --locales zh-CN en-US
```

- `debug-sample`：输出 `output/debug_samples/debug_samples_<timestamp>.json`。
- `dimension`：输出 `output/dimensions/dimension_<id>.json`，包含 `records` 与 `failures`。
- `question`：输出 `output/questions/question_<timestamp>.json`，聚合多维度结果。
- `--no-persist`：仅返回结果，不落地文件（适合快速验证）。

## 📊 数据来源

- 卡牌解读：`card_interpretation` + `card_interpretation_translation`
- 维度定义：`dimension` + `dimension_translation`
- 问题映射：依赖 `dimension_translation.description`（按多语言描述匹配）

请确认数据库保持最新：如新增维度或翻译，需要重新导入后再执行生成任务。

## 📁 输出约定

- `output/debug_samples/`：调试样本（人审重点）。
- `output/dimensions/`：单维度全量结果（用于写回数据库或导入后台）。
- `output/questions/`：问题驱动汇总（产品评审常用）。
- `output/logs/`：可写入失败任务快照或运行元数据（可选）。

维度 JSON 中的 `records` 按 `interpretation_id` 聚合，`failures` 记录未完成的 `(locale, interpretation_id, dimension_id)` 组合。

## 📥 数据写回

- 导入前先校对样本/维度 JSON 是否含 `interpretation_id`、`dimension_id`、`aspect`、`aspect_type` 与各语言 `content`。
- 建议在 `scripts/` 目录创建导入脚本：根语言写入 `card_interpretation_dimension`，其他语言写入 `card_interpretation_dimension_translation`。
- 执行前使用 `sqlite3 data/tarot_config.db ".backup 'backup/tarot_config_YYYYMMDD.db'"` 创建备份，并提供 `--dry-run` 选项与抽样校验。
- 完成导入后将源文件、命令与校验结论记录在本手册或团队日志中。

## 🧪 流程建议

1. `debug-sample` 验证提示词（每种语言 5–10 条）。
2. 根据审阅结果微调 `prompt_template*.txt`。
3. 执行 `dimension` 生成完整结果，确保 `failures` 为空或可控。
4. 如需整套体验，执行 `question` 命令，并安排产品/内容团队审阅。
5. 通过 `import_multilingual_dimensions.py` 或自定义脚本将合格内容写回数据库。

## 🧯 失败补齐

- 重复执行同一命令即可自动跳过已完成组合，仅补齐缺失。
- 如需针对特定语言补齐，可限定 `--locales en-US` 等参数。
- 若多次失败，考虑：降低温度、延长速率限制、改用备用模型或人工编辑。

## 🧩 常见问题排查

| 症状 | 排查项 |
|------|--------|
| `数据库不存在` | 检查 `data/tarot_config.db` 是否存在 / 权限是否正确 |
| `提示词模板缺失` | 确认 `paths.prompt_templates` 中的文件路径 |
| `模型调用失败` | 检查 API 密钥是否过期、速率限制是否被触发 |
| `输出语言混乱` | 检查对应语言的数据库翻译是否齐备、模板是否引用正确变量 |
| `question 无匹配维度` | 检查问题描述是否与 `dimension_translation.description` 完全一致 |
| 英文结果仍出现中文牌名 | 确认数据库中的英文翻译是否存在（`card_translation.locale in ('en', 'en-US')`），或更新翻译后重新运行 |

## ✅ 交付清单

- 更新提示词模板后，提交调试样本及审阅结论。
- 批量生成维度后，提交维度 JSON 与失败清单（如有）。
- 问题驱动输出供产品确认后，再安排数据写回或发布。
- 重要调整（模型切换、新增语言）需同步更新本手册与 `config/settings.yaml`。

## 📞 联系方式

- 代码实现：`main.py` / `services/generation_service.py`
- 模型与速率配置：`services/model_router.py` / `config/settings.yaml`
- 数据导入导出：`database_importer.py` / `import_multilingual_dimensions.py`

保持良好的沟通频次，确保 Prompt、模型、数据库三方信息同步更新。祝大家协作顺利！
