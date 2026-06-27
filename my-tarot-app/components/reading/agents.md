# 占卜组件开发指南

## 🔮 组件结构

### 核心组件
```
components/reading/
├── TypeSelector.tsx         # 占卜类型选择器
├── CategorySelector.tsx     # 类别选择器
├── CardDeck.tsx            # 卡牌展示组件
├── CardFlip.tsx            # 卡牌翻转动画
├── CardSpread.tsx          # 牌阵布局
├── Interpretation.tsx       # 解读展示
├── ReadingProgress.tsx      # 进度指示器
└── styles.ts               # 占卜专用样式
```

## 🎯 TypeSelector - 占卜类型选择器

### 设计规范
- **布局**: 两个选项卡片并排显示
- **状态管理**: 离线可用，AI锁定状态
- **视觉反馈**: 悬停和选中状态明显区分

### 选项配置
```typescript
const readingTypes = [
  {
    id: 'offline',
    title: '离线占卜',
    description: '使用内置的静态解读系统',
    icon: '📖',
    status: 'available',
    badge: null,
  },
  {
    id: 'ai',
    title: 'AI占卜',
    description: 'AI智能动态解读',
    icon: '🤖',
    status: 'locked',
    badge: '需完成1次离线占卜',
  }
]
```

### 交互行为
- 离线占卜：点击直接选择
- AI占卜：显示锁定提示，引导用户完成离线占卜
- 选中状态：金色边框+轻微发光效果

## 📊 CategorySelector - 类别选择器

### 数据来源
从 `dimensions.json` 中提取 `category` 字段，支持以下类别：
- 情感 (Emotional)
- 事业 (Career)
- 健康 (Health)
- 学业 (Academic)
- 人际关系 (Relationships)

### 布局设计
- **网格布局**: 2列自适应网格
- **卡片样式**: 图标+标题+描述
- **视觉层级**: 悬停时轻微上浮

### 使用示例
```typescript
<CategorySelector
  categories={categories}
  selectedCategory={selected}
  onSelect={handleCategorySelect}
  theme="mystical"
/>
```

## 🎴 CardDeck - 卡牌展示组件

### 功能特性
- **78张卡牌**: 完整塔罗牌展示
- **洗牌动画**: 卡牌随机重排动画
- **抽牌交互**: 点击或拖拽选择
- **视觉反馈**: 悬停高亮效果

### 卡牌数据结构
```typescript
interface CardData {
  id: number
  name: string
  arcana: 'major' | 'minor'
  suit?: 'cups' | 'pentacles' | 'swords' | 'wands'
  number: number
  imageUrl: string
  keywords: string[]
}
```

### 洗牌算法
```typescript
const shuffleCards = (cards: CardData[]): CardData[] = {
  // Fisher-Yates shuffle algorithm
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

## 🔄 CardFlip - 卡牌翻转动画

### 翻转效果
- **3D翻转**: 真实的3D卡片翻转效果
- **方向控制**: 支持水平和垂直翻转
- **速度调节**: 可配置翻转速度
- **正逆位**: 50%概率决定正逆位

### 使用示例
```typescript
<CardFlip
  card={selectedCard}
  isReversed={isReversed}
  isFlipped={isFlipped}
  onFlipComplete={handleFlipComplete}
/>
```

### 动画配置
```typescript
const flipConfig = {
  duration: 800,
  easing: 'ease-in-out',
  perspective: 1000,
  rotation: 180,
}
```

## 🃏 CardSpread - 牌阵布局

### 三牌阵布局
- **过去牌**: 左侧位置
- **现在牌**: 中间位置
- **将来牌**: 右侧位置

### 布局参数
```typescript
const spreadLayout = {
  past: { x: -120, y: 0, rotation: -5 },
  present: { x: 0, y: 0, rotation: 0 },
  future: { x: 120, y: 0, rotation: 5 },
}
```

### 交互功能
- 点击单张牌查看详细信息
- 支持手势滑动切换
- 缩放查看卡牌细节

## 📖 Interpretation - 解读展示

### 解读层级
1. **基础解读**: 单张牌的牌意
2. **位置解读**: 结合牌阵位置的解读
3. **综合解读**: 三张牌的关联解读

### 数据模型
```typescript
interface InterpretationData {
  card: CardData
  position: 'past' | 'present' | 'future'
  direction: 'upright' | 'reversed'
  basic: {
    summary: string
    detail: string
  }
  position: {
    meaning: string
    advice: string
  }
}
```

### 展示组件
- **卡片标题**: 卡牌名称 + 正逆位标识
- **关键词**: 3-5个关键词标签
- **详细解读**: 分段展示牌意和建议
- **关联解读**: 三张牌的综合分析

## 📈 ReadingProgress - 进度指示器

### 步骤指示
- **步骤1**: 选择占卜类型
- **步骤2**: 选择占卜类别
- **步骤3**: 抽取塔罗牌
- **步骤4**: 查看基础解读
- **步骤5**: 深度系统解读

### 视觉样式
- **进度条**: 金色渐变进度条
- **步骤图标**: 每步对应的小图标
- **当前步骤**: 高亮显示
- **完成步骤**: 打勾标记

### 使用示例
```typescript
<ReadingProgress
  currentStep={3}
  totalSteps={5}
  steps={[
    { id: 1, title: '选择类型', icon: '🔮' },
    { id: 2, title: '选择类别', icon: '📊' },
    { id: 3, title: '抽取卡牌', icon: '🎴' },
    { id: 4, title: '基础解读', icon: '📖' },
    { id: 5, title: '深度解读', icon: '✨' },
  ]}
/>
```

## 🎨 占卜专用样式

### 颜色系统
```typescript
export const ReadingColors = {
  // 占卜主题色
  primary: '#B8860B',      // 暗金色
  secondary: '#8B4513',    // 马鞍棕色
  accent: '#DAA520',       // 金菊色

  // 卡牌颜色
  major: '#FFD700',        // 大阿尔卡那
  cups: '#4169E1',         // 圣杯 - 水元素
  pentacles: '#228B22',    // 星币 - 土元素
  swords: '#B22222',       // 宝剑 - 火元素
  wands: '#FF8C00',        // 权杖 - 风元素

  // 状态颜色
  upright: '#228B22',      // 正位
  reversed: '#8B0000',     // 逆位
}
```

### 空间系统
```typescript
export const ReadingSpacing = {
  card: {
    width: 120,
    height: 200,
    borderRadius: 8,
    spacing: 20,
  },
  spread: {
    gap: 40,
    padding: 20,
  },
}
```

## 🚀 组合使用示例

### 完整占卜流程组装
```typescript
// 步骤1：选择占卜类型
<TypeSelector
  selectedType={readingType}
  onSelect={setReadingType}
/>

// 步骤2：选择占卜类别
<CategorySelector
  categories={categories}
  selectedCategory={category}
  onSelect={setCategory}
/>

// 步骤3：抽牌
<CardSpread
  cards={selectedCards}
  onCardClick={handleCardClick}
/>

// 步骤4：解读
<Interpretation
  interpretation={interpretationData}
  type="basic"
/>

// 步骤5：深度解读
<Interpretation
  interpretation={deepInterpretation}
  type="deep"
/>
```

## 📊 数据流架构

### 占卜状态管理
```typescript
interface ReadingState {
  step: number
  type: 'offline' | 'ai'
  category: string
  cards: CardData[]
  interpretations: InterpretationData[]
  createdAt: Date
}
```

### 事件流
```
选择类型 → 选择类别 → 洗牌 → 抽牌 → 翻转 → 解读 → 保存
```

## 🎯 性能优化

### 卡牌图片优化
- 使用WebP格式减少文件大小
- 实现懒加载和预加载
- 使用CDN加速图片加载

### 动画性能
- 使用transform3d启用硬件加速
- 避免在动画中使用opacity
- 使用requestAnimationFrame优化动画帧

### 内存管理
- 及时清理不需要的卡牌数据
- 使用图片缓存避免重复加载
- 实现虚拟滚动处理大量卡牌