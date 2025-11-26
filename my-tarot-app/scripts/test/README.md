# 测试脚本目录

这个目录包含塔罗牌应用的测试和验证脚本。

## 📁 文件结构

```
scripts/
├── test/
│   ├── README.md              # 本文档
│   ├── test-import.ts         # 数据导入测试脚本
│   └── validate-json.ts       # JSON文件验证脚本
└── reset-project.js           # Expo重置脚本
```

## 🧪 测试脚本说明

### test-import.ts
**数据导入基础测试脚本**

- 测试数据库架构完整性
- 验证JSON数据类型定义
- 检查导入顺序和依赖关系
- 确认所有组件可正确加载

**运行方式:**
```bash
npm run test-import
```

### validate-json.ts  
**JSON数据文件验证脚本**

- 验证所有6个JSON文件的存在性
- 检查数据格式和结构完整性
- 统计记录数量和文件大小
- 验证特定文件的数据量要求

**运行方式:**
```bash
npm run validate-json
```

## 📊 预期验证结果

### 数据文件验证
- **card_styles.json**: 1条记录 (卡牌风格)
- **cards.json**: 78条记录 (完整塔罗牌)
- **spreads.json**: 1条记录 (三牌阵)
- **dimensions.json**: 27条记录 (解读维度)
- **card_interpretations.json**: 156条记录 (78×2方向解读)
- **card_interpretation_dimensions.json**: 4,056条记录 (维度化解读)

### 数据库架构验证
- 7个数据库表定义完整
- 导入依赖关系正确
- TypeScript类型定义匹配

## 🚀 如何添加新的测试

1. 在 `scripts/test/` 目录下创建新的测试文件
2. 在 `package.json` 的 `scripts` 部分添加对应命令
3. 更新本README文档说明新测试的用途

## 🔧 故障排除

### 常见问题
1. **路径错误**: 确保脚本中的相对路径正确 (`../../` 指向项目根目录)
2. **依赖缺失**: 运行 `npm install` 确保所有依赖已安装
3. **权限问题**: 确保对文件系统有读取权限

### 调试技巧
- 使用 `console.log` 查看详细输出
- 检查 JSON 文件格式是否正确
- 验证数据库架构定义是否完整