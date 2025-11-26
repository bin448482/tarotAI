# 解读 dimensions 功能重构 TODO

依据《解读 dimensions 功能重构计划》拆解的实施任务列表。完成后请勾选对应项，并在相关文档中同步更新状态。

## 阶段 0：准备
- [x] 明确 SQLite 配置库位置与表结构，整理数据访问需求
- [x] 新建数据访问层模块（例如 `data_loader.py`）并提供多语言读接口
- [ ] 为数据访问层补充基础测试或验证脚本

## 阶段 1：基础重构
- [x] 重写 `main.py` 入口结构：拆分 CLI 与服务初始化骨架
- [x] 引入多语言 Prompt 模板加载（默认中文/英文），封装 `PromptBuilder`
- [x] 新增模型路由器（language → provider/model）并支持差异化配置
- [x] 注释并替换旧的 `generate_single_interpretation` 实现
- [x] 保持协程并发框架，定义任务注册/重试逻辑骨架

## 阶段 2：核心功能
- [x] 实现多语言随机样本调试命令（`--debug-sample`）
- [x] 实现单维度全量生成命令（多语言、断点续传、失败记录）
- [x] 实现基于问题描述的维度查询与多维度生成流程

## 阶段 3：配置与文档
- [x] 更新 `config/settings.yaml` 与 `.env.example` 以支持多语言模型映射
- [x] 更新 `agents.md`，记录职责分工与当前进度
- [x] 更新 `CLAUDE.md`、`README.md` 等开发指南说明新流程
- [x] 在计划文档中记录已完成阶段与待办

## 阶段 4：验证
- [ ] 为关键模块补充测试或演示脚本（数据加载、模板渲染、调度器）
- [ ] 运行基础连通性测试并记录结果
- [ ] 输出示例生成结果（样本/维度/问题）并存档

## 阶段 5：结果导入
- [ ] 复核最新样本/维度 JSON（如 `output/debug_samples/debug_samples_20251016T015426Z.json`）字段，确认包含 `interpretation_id`、`dimension_id`、`aspect`、`aspect_type`、`results[locale].content`
- [ ] 设计并实现导入脚本（或扩展现有工具）将根语言写入 `card_interpretation_dimension`、其他语言写入 `card_interpretation_dimension_translation`
- [ ] 执行导入前创建数据库备份（`sqlite3 data/tarot_config.db ".backup 'backup/tarot_config_YYYYMMDD.db'"`）
- [ ] 使用导入脚本进行 `--dry-run` 验证并抽样比对字段
- [ ] 完成正式导入后记录执行命令、源文件、校验结果于文档（如 `agents.md` 或专门日志）
