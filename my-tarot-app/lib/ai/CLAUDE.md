# AI占卜功能架构设计文档

## 🤖 功能概述

AI占卜功能基于LLM技术提供智能化的塔罗牌解读服务，与现有基础占卜功能完全兼容。

### 核心特性
- **智能问题分析**：用户输入问题描述，AI分析并推荐最相关的解读维度
- **多维度解读**：基于选定维度生成综合性解读内容
- **与基础占卜兼容**：共享抽牌交互和视觉效果
- **完整解读结果**：包含维度解读、综合分析和关键洞察

## 🏗️ 技术架构设计

### 数据流对比
```typescript
// 基础占卜流程
type → category → draw → basic

// AI占卜流程
type → ai-input → draw → ai-result
```

### 状态管理扩展
```typescript
interface ReadingFlowState {
  step: number
  type: 'offline' | 'ai'          // 新增AI类型
  category: string
  userDescription?: string         // AI模式：用户问题描述
  aiDimensions?: DimensionInfo[]   // AI推荐的维度
  selectedCards: SelectedCard[]
  interpretations: any[]
  aiResult?: {                     // AI解读结果
    dimension_summaries: Record<string, string>
    overall_summary: string
    insights: string[]
  }
  createdAt: Date
  isLoading: boolean
  error: string | null
}
```

### API服务架构
```typescript
class AIReadingService {
  // 分析用户问题描述
  async analyzeDescription(description: string, spreadType: string): Promise<AnalyzeResponse>

  // 生成AI解读结果
  async generateAIReading(
    cards: CardInfo[],
    dimensions: DimensionInfo[],
    description: string,
    spreadType: string
  ): Promise<GenerateResponse>
}
```

## 📱 页面架构设计

### 路由结构
```
app/(reading)/
├── _layout.tsx          # 布局保持不变
├── type.tsx            # 修改：AI占卜变为可用
├── ai-input.tsx        # 新增：AI问题输入页
├── category.tsx        # 保持不变（仅基础占卜使用）
├── draw.tsx            # 修改：兼容两种模式
├── basic.tsx           # 保持不变（仅基础占卜使用）
└── ai-result.tsx       # 新增：AI解读结果页
```

### 核心页面设计

**ai-input.tsx - AI问题输入页**
- 用户输入占卜问题（200字限制）
- 调用 `/analyze` 接口获取推荐维度
- 自动进入抽牌环节

**ai-result.tsx - AI解读结果页**
- 显示多维度解读内容
- 展示综合分析和关键洞察
- 支持保存到历史记录

### 兼容性设计

**draw.tsx 兼容性改造**
```typescript
const loadDimensions = async () => {
  if (state.type === 'ai' && state.aiDimensions) {
    // AI模式：使用推荐的维度
    const sortedDimensions = [...state.aiDimensions].sort((a, b) => a.aspect_type - b.aspect_type);
    setDimensions(sortedDimensions.slice(0, 3));
  } else {
    // 基础模式：使用原有逻辑
    // ... 现有代码保持不变
  }
};
```

## 🔗 API集成流程

### 前端API调用流程
1. **问题分析阶段**：
   ```typescript
   const analyzeResponse = await ReadingService.analyzeDescription({
     description: userInput,
     spread_type: 'three-card'
   })
   ```

2. **解读生成阶段**：
   ```typescript
   const generateResponse = await ReadingService.generateAIReading({
     cards: selectedCards,
     dimensions: selectedDimensions,
     description: userInput,
     spread_type: 'three-card'
   })
   ```

### 错误处理策略
- 网络异常：自动降级到离线模式
- API超时：显示友好提示，支持重试
- 服务不可用：引导用户使用基础占卜功能

## 📊 错误处理与用户体验

### API错误处理
- 网络连接异常处理
- LLM服务超时处理
- 请求失败重试机制
- 友好的错误提示信息

### 加载状态设计
- 问题分析加载指示
- AI解读生成进度显示
- 合理的超时时间设置

## 💾 历史记录兼容

### 扩展历史记录结构
```typescript
interface HistoryRecord {
  id: string;
  type: 'offline' | 'ai';
  timestamp: Date;
  cards: SelectedCard[];

  // 基础占卜字段
  category?: string;
  basicInterpretations?: any[];

  // AI占卜字段
  userDescription?: string;
  aiResult?: {
    dimension_summaries: Record<string, string>;
    overall_summary: string;
    insights: string[];
    card_interpretations: Array<{
      card_id: number;
      card_name: string;
      direction: string;
      position: number;
      ai_interpretation: string;
      basic_summary: string;
      dimension_aspect?: {
        dimension_name: string;
        interpretation: string;
      };
    }>;
    dimensions: Array<{
      id: number;
      name: string;
      aspect: string;
      aspect_type: number;
      category: string;
      description: string;
    }>;
  };
}
```

### AI占卜历史记录保存实现
AI占卜历史记录通过以下流程保存：
1. **ai-result.tsx** 调用 `ReadingContext.saveToHistory()`
2. **ReadingContext** 调用 `ReadingService.saveReadingFromState()`
3. **ReadingService** 检测 `state.type === 'ai'` 并处理AI专用字段：
   - `userDescription`: 用户问题描述
   - `aiDimensions`: AI推荐的维度
   - `aiResult`: 完整的AI解读结果
4. 数据序列化为JSON并保存到 `user_history` 表

### 数据库存储格式
```sql
-- AI占卜记录在user_history表中的存储
INSERT INTO user_history (
  interpretation_mode, -- 'ai'
  result -- JSON格式包含AI解读完整数据
) VALUES (
  'ai',
  '{
    "interpretation": {
      "cards": [...],
      "dimension_summaries": {...},
      "insights": [...],
      "user_description": "...",
      "overall": "...",
      "card_interpretations": [...]
    },
    "metadata": {
      "interpretation_mode": "ai",
      "ai_dimensions": [...],
      "generated_at": "..."
    }
  }'
);
```

## 🔧 认证与支付集成

### 匿名用户系统
- 自动生成临时用户ID
- JWT token管理会话状态
- 无需注册即可使用所有功能

### Stripe支付流程（待实现）
- 创建支付会话
- 处理支付回调
- 解锁付费功能