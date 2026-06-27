# 解读 dimensions 功能重构计划

## 1. 背景与目标
- 现有 `main.py` 仍基于单语言 JSON 文件，无法直接消费数据库中的多语言内容，也无法对不同语言使用差异化模型。
- 维度解读流程需要兼顾 Prompt 调优、批量生成与缺失补齐，但当前实现难以扩展到多语言并对每个语言做独立容错。
- 目标是提供一套统一的多语言维度解读引擎，支持**快速调试**、**单维度全量生成**与**面向问题描述的多语言解读**三大核心场景。

## 2. 痛点与改造重点
- **数据加载**：改为从 SQLite 配置库读取主语言与翻译表（`card`, `card_translation`, `dimension`, `dimension_translation`, `card_interpretation`, `card_interpretation_translation`）。需要抽象统一的数据访问层（DAL），缓存多语言数据结构。
- **提示词模板**：保持中文模板，同时增加英文模板。模板选择需与语言、模型组合绑定，支持自定义模板路径或内置默认值。
- **模型调度**：按语言路由到不同模型/Client（例如中文调智谱，英文调 OpenAI）。需要配置驱动的 provider→模型映射与速率限制。
- **并发与重试**：沿用协程并发框架，但精细到“语言 × 维度/卡牌”粒度，失败任务需要记录并支持按维度或卡牌补齐。
- **输出与断点续传**：多语言结果需要写回统一 JSON 结构，并保留语言字段；仍需支持增量补齐，避免重复调用。

## 3. 数据加载方案
1. **抽象数据访问层**
   - 新建 `data_loader.py`（或重构现有 `database_importer` 为读接口），负责连接 SQLite。
   - 提供方法：
     - `load_cards(locales)`：返回 `{locale: List[CardRecord]}`，CardRecord 包含基础信息与方向、summary/detail。
     - `load_dimensions(locales)`：返回 `{locale: List[DimensionRecord]}`，DimensionRecord 包含多语言 description。
     - `load_card_dimensions(locale)`：可选，读取历史生成结果用于补齐。
   - 支持配置数据库路径、主语言（默认 zh-CN）与目标语言列表（如 en-US）。
2. **数据结构**
   - `CardRecord`：`id`, `card_id`, `name`, `direction`, `summary`, `detail`, `locale`.
   - `DimensionRecord`：`id`, `name`, `category`, `description`, `aspect`, `aspect_type`, `locale`.
   - 提供统一 accessor 将主语言与翻译合并成并排结构，便于 Prompt 使用。

## 4. 多语言提示词模板策略
- 保留现有中文模板文件 `prompt_template.txt`。
- 新增英文模板（例如 `prompt_template.en.txt`），可通过配置指定路径。
- 设计模板选择流程：
  1. 默认根据语言读取不同模板；
  2. 若配置中指定自定义模板路径或语种共用模板，则覆盖默认行为；
  3. 模板中支持变量：`card`, `dimension`, `question` 等，需统一格式化接口。
- 考虑将模板渲染封装为 `PromptBuilder` 类，避免主逻辑散落格式化代码。

## 5. 模型与语言映射
- 在 `config/settings.yaml` 新增/扩展：
  ```yaml
  llm:
    language_providers:
      zh-CN:
        provider: zhipu
        model: glm-4
        temperature: 0.1
      en-US:
        provider: openai
        model: gpt-4o-mini
        temperature: 0.2
  ```
- 初始化阶段根据语言准备多个 Client：
  - 智谱：`ZhipuAI`
  - OpenAI：`OpenAI`
  - Ollama：可作为本地备选
- 为不同语言维护独立的速率限制、批大小、重试策略；需要统一调度器协调。

## 6. 并发与容错机制
- 继续使用 `asyncio` + `Semaphore` 控制并发。
- 引入 `TaskRegistry` 记录任务状态：`pending`, `success`, `failed`, 包含 `language`, `card_id`, `dimension_id`, `attempts`.
- 重试策略：
  - 每个任务至少重试 3 次，指数退避。
  - 失败任务写入日志与 JSON 报告，便于后续补齐。
- 补齐流程：
  - `generate_missing_cards(dimension, locale, missing_cards)` 继续存在，但支持语言参数。
  - 支持按维度、按语言过滤缺失项。

## 7. 核心功能模块
1. **多语言 Prompt 调试（随机 10 张卡牌）**
   - CLI：`python main.py --debug-sample --count 10 --locales zh-CN,en-US`
   - 流程：随机选择卡牌×维度组合，对每个语言生成解读；输出对比文件供 Prompt 调优。
   - 可选：输出 Markdown/JSON，包含原文、翻译、AI 生成结果。

2. **完整解读单个维度（多语言）**
   - CLI：`python main.py --dimension "情感-时间线-过去" --locales zh-CN,en-US --force`
   - 逻辑：对指定维度的一组卡牌（所有方向）分语言生成，保存到 `output/dimension_{name}_{locale}.json`。
   - 需要断点续传与缺失补齐：
     - 读取现有结果，跳过已完成的语言卡牌组合；
     - 失败项记录到 `logs/dimension_failed_{locale}.json`。

3. **完整解读一个问题描述（维度描述多语言）**
   - CLI：`python main.py --question "我需要换工作吗？" --spread-type three-card --locales zh-CN,en-US`
   - 流程：
     1. 通过数据库查询问题对应的维度集合：以多语言 `dimension.description` 为关键词匹配问题文本（当前规则是一条问题匹配 3 个维度，可在配置库中维护标准描述，新的问题根据 description 相似度或精确匹配获取维度 ID）。
     2. 调用“完整解读单个维度（多语言）”模块，针对每个维度和语言生成卡牌解读。
     3. 汇总各维度的描述（多语言）与生成结果，形成最终报告。
   - 输出：结构化 JSON，包含 `question`, `spread`, `dimension_results[{dimension_name, locale, description, cards[]}]`。
   - 支持将结果保存到 `output/questions/question_{timestamp}.json`，内部按语言分组。

## 8. CLI 与模块化重构
- 重构 `main.py` 为轻量 CLI，核心逻辑拆分至模块：
  - `cli.py`：解析参数和路由命令。
  - `services/generation_service.py`：封装生成流程（多语言-维度-卡牌）。
  - `services/prompt_builder.py`：模板渲染。
  - `services/model_router.py`：多语言模型调用。
  - `services/storage.py`：结果读写 & 断点续传。
  - `services/reporting.py`：失败任务、成本估算。
- 现阶段可优先完成服务模块的抽象，随后再拆 CLI；第一阶段可在 `main.py` 中实例化新服务，保持入口兼容。

## 9. 实施阶段划分
1. **阶段 0：准备**
   - 明确数据库路径、翻译表结构；编写数据访问类与单元测试。
   - 更新配置文件示例（`settings.yaml`、`.env.example`）说明多语言设置。
2. **阶段 1：基础重构**
   - 重写数据加载、模板、模型调度模块，并保留旧 CLI 命令骨架。
   - 注释/替换 `generate_single_interpretation` 旧实现，改为多语言任务调度。
   - 实现随机样本调试功能，验证多语言调用链。
3. **阶段 2：维度批量生成**
   - 完成多语言维度全量生成流程，打通缺失补齐。
   - 提供进度条、失败记录输出。
4. **阶段 3：问题描述解读**
   - 实现面向问题的维度描述生成流程，利用多语言模板。
   - 增加结果校验（JSON schema）和生成报告。
5. **阶段 4：文档与测试**
   - 更新 `CLAUDE.md` 与 README。
   - 编写关键单元测试/集成测试（数据加载、模板渲染、调度器）。
   - 输出使用示例与常见故障排查。

## 10. 验证与质量保证
- **内容质量**：提供调试模式对比原始中文与英文 AI 输出，便于人工复核。
- **成本控制**：在执行前估算各语言 token 消耗，必要时增加确认提示。
- **异常监控**：捕捉 API 错误、速率限制、数据库连接等异常，输出结构化日志。
- **可扩展性**：设计语言配置为可扩展列表，未来扩展更多语言仅需更新配置与模板。

---

> 下一步建议：先实现阶段 0/1，完成数据层与多语言模板调度，再与产品确认 Prompt 样本质量，之后进入批量生成阶段。

## 11. 实施进展（2025-10-16）
- ✅ 阶段 0：`data_loader.TarotDataLoader` & `TarotDataRepository` 上线，统一从 `tarot_config.db` 读取多语言卡牌/维度。
- ✅ 阶段 1：`services/` 模块落地，新增 `PromptTemplateRegistry`、`ModelRouter`、`GenerationService`，并重写 `main.py` 为子命令式 CLI。
- ✅ 阶段 2：完成 `debug-sample`、`dimension`、`question` 三大场景，支持断点续传与失败记录。
- ✅ 配置与文档：`config/settings.yaml` 更新至多语言模型映射；补充英文提示词模板；重写 `README.md`、`CLAUDE.md`、`agents.md`。
- 🔄 待办：补充数据访问与调度层自动化测试；根据需要扩展失败补齐的日志落地与 Schema 校验。
