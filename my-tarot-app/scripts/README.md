# 塔罗牌应用 - 脚本目录

## 📁 脚本概览

本目录包含了塔罗牌应用的各种实用脚本和测试工具。

### 🧪 测试脚本

#### 1. test-cards.ts
**卡牌数据全面测试脚本**
- 验证78张塔罗牌的完整性
- 检查大阿卡纳(22张)和小阿卡纳(56张)数据
- 测试各花色卡牌数量（权杖、圣杯、宝剑、钱币）
- 验证随机抽牌功能
- 测试卡牌搜索功能
- 执行原始SQL查询验证

**运行方式**:
```bash
npx tsx test-cards.ts
```

#### 2. test-card-styles.ts
**卡牌风格测试脚本**
- 初始化数据库
- 填充卡牌风格数据
- 验证卡牌风格数据的存在性
- 检查'1920-raider-waite'风格
- 执行原始SQL查询

**运行方式**:
```bash
npx tsx test-card-styles.ts
```

#### 3. test-database.ts
**数据库功能综合测试脚本**
- 测试数据库初始化
- 验证卡牌风格数据
- 检查牌阵数据
- 测试三张牌牌阵查询
- 获取数据库状态
- 执行原始SQL查询

**运行方式**:
```bash
npx tsx test-database.ts
```

#### 4. test-import-logic.js
**数据导入逻辑模拟测试**
- 模拟 JsonLoader 功能
- 模拟 DataImporter 导入流程
- 验证JSON数据加载
- 模拟数据导入会话
- 检查导入过程的状态和进度

**运行方式**:
```bash
node test-import-logic.js
```

#### 5. test-json-import.js
**JSON数据基础验证脚本**
- 检查JSON文件是否存在
- 验证 card_styles.json、cards.json、spreads.json 文件格式
- 检查卡牌数据完整性
- 验证大阿卡纳和小阿卡纳数量
- 检查花色分布
- 验证数据关联性和必需字段

**运行方式**:
```bash
node test-json-import.js
```

### 🛠️ 实用工具脚本

#### reset-project.js
**项目重置工具**
- 将现有目录移动到 app-example
- 创建新的 /app 目录
- 生成初始化的 index.tsx 和 _layout.tsx 文件
- 提供交互式重置选项

**使用方式**:
```bash
node reset-project.js
```

## 🚀 最佳实践

### 测试运行
- 优先使用 `npm run test` 或特定的测试命令
- 确保在运行测试前已安装所有依赖
- 检查控制台输出，关注任何错误或警告信息

### 故障排除
- 如果测试失败，仔细阅读错误消息
- 检查数据库连接和JSON文件完整性
- 确保环境变量和配置正确

### 扩展测试
- 添加新的测试脚本时，遵循现有的命名和结构约定
- 使用 TypeScript 编写类型安全的测试
- 覆盖关键功能和边界场景

## 📝 注意事项
- 所有测试脚本都是独立的，可单独运行
- 测试脚本不应修改生产数据
- 保持测试脚本简洁、专注于特定功能

---

*最后更新：2025年9月*