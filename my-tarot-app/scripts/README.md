# my-tarot-app Scripts Suite

Helper scripts for testing tarot data sets, validating imports, and managing Expo project scaffolding.

## 1. 项目简介 | Description
`scripts/` 汇总所有与塔罗牌客户端相关的 Node/TypeScript 工具，包括卡牌数据校验、数据库 smoke 测试、JSON 导入模拟以及项目重置辅助。脚本默认使用 `npm` + `tsx`/`node` 运行，并依赖仓库根目录的 TypeScript/Expo 配置。

## 2. 功能特性 | Features
- 🃏 `test-cards.ts`: 校验 78 张塔罗牌完整性、花色分布、随机抽牌与搜索逻辑。
- 🎨 `test-card-styles.ts`: 初始化并验证卡牌风格数据（如 `1920-raider-waite`）。
- 🧱 `test-database.ts`: 综合检测 SQLite 初始化、牌阵查询与 SQL 结果。
- 📥 `test-import-logic.js` / `test-json-import.js`: 模拟 JsonLoader / DataImporter、检查 JSON schema。
- ♻️ `reset-project.js`: 重置 Expo `app/` 目录、生成 `_layout.tsx` & `index.tsx`。

## 3. 技术栈 | Tech Stack
- **Language**: TypeScript (tsx runtime) & JavaScript
- **Framework**: Node.js scripts, Expo file layout
- **Database**: SQLite via Expo SQLite bindings / direct SQL queries
- **Others**: `tsx`, `ts-node`, custom JSON fixtures

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js 18+
- npm 10+
- 已安装项目依赖 (`npm ci`)
- SQLite 数据文件与 JSON 资源位于默认路径

### 安装步骤 | Setup
```bash
# 1. 安装依赖（项目根目录）
npm ci

# 2. 运行单个脚本
npx tsx scripts/test-cards.ts
npx tsx scripts/test-card-styles.ts
npx tsx scripts/test-database.ts
node scripts/test-import-logic.js
node scripts/test-json-import.js

# 3. 重置项目骨架（慎用）
node scripts/reset-project.js
```

- 在运行任何测试前确保数据库/JSON 文件已同步最新内容。
- 脚本输出包含断言与统计，若报错请根据堆栈检查路径或数据完整性。
- 扩展脚本时保持命名一致，并更新本 README 说明新用途。
