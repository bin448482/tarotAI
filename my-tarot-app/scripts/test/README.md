# Tarot App Test Scripts

Focused directory for import/validation scripts that keep tarot JSON + DB assets clean.

## 1. 项目简介 | Description
`scripts/test/` 仅包含最关键的测试脚本，如数据导入（`test-import.ts`）与 JSON 校验（`validate-json.ts`）。它们在 CI 或手动调试时运行，确保卡牌、维度、牌阵等基础资料在进入应用前无缺失。

## 2. 功能特性 | Features
- 🗃️ `test-import.ts`: 校验数据库 schema、导入顺序及 TypeScript 类型一致性。
- 📑 `validate-json.ts`: 检查六大 JSON 文件（card_styles、cards、spreads、dimensions、card_interpretations、card_interpretation_dimensions）的数量与结构。
- 📊 预期结果列出每类记录的目标数量，方便对比。
- 🧩 可扩展：新增测试脚本可放入同目录并在 README 记录用途。

## 3. 技术栈 | Tech Stack
- **Language**: TypeScript
- **Framework**: ts-node / tsx runtime
- **Data Sources**: JSON fixtures + SQLite schema definitions
- **Others**: npm scripts (`npm run test-import`, `npm run validate-json`)

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Node.js 18+
- npm 10+
- 项目依赖已安装 (`npm ci`)
- JSON 数据文件位于 `assets/data/`

### 安装步骤 | Setup
```bash
# 1. Install deps at project root
npm ci

# 2. Run tests
npm run test-import
npm run validate-json
```

- 运行前确认脚本中的相对路径（`../../`）仍指向正确目录。
- 若统计结果与预期不符，先检查 JSON 文件是否缺失或格式破损，再检查数据库迁移。
- 添加新脚本时：创建文件→在 `package.json` 添加 npm script→更新本文档。
