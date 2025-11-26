# 首页组件开发指南

## 🏠 组件结构

### 核心组件
```
components/home/
├── HeroSection.tsx          # 主标题区域
├── DeclarationCard.tsx      # 应用声明卡片
├── NavigationGrid.tsx       # 导航网格
├── DecorativeSymbols.tsx    # 装饰元素
└── styles.ts               # 首页专用样式
```

## 🎨 HeroSection - 主标题区域

### 设计规范
- **位置**: 顶部居中
- **内容**: "神秘塔罗牌"主标题 + "Tarot Learning Tool"副标题
- **样式**:
  - 主标题：32px serif字体，金色渐变文字
  - 副标题：16px system字体，淡紫色
  - 背景：星空粒子动画效果

### 实现要点
```typescript
// 渐变文字效果
const gradientText = {
  background: 'linear-gradient(45deg, #FFD700, #B8860B)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

// 星星粒子动画
const starAnimation = {
  animation: 'twinkle 2s infinite alternate',
}
```

## 📋 DeclarationCard - 应用声明卡片

### 设计规范
- **布局**: 卡片式布局，宽度90%，最大宽度400px
- **内容**: 4行声明文字，每行带图标
- **视觉效果**: 玻璃拟态 + 边框发光

### 内容结构
- 💫 "本应用专为塔罗牌爱好者设计"
- 🎯 "用于学习塔罗牌知识"
- ⚠️ "请勿将占卜结果作为重要决策依据"
- 🧘 "占卜前请静心思考具体问题"

### 动画效果
- 卡片：从中心缩放 + 淡入（延迟300ms）
- 文字：逐行显示，每行延迟100ms

## 🎯 NavigationGrid - 导航网格

### 网格布局
- **布局**: 2x2网格，间距16px
- **按钮尺寸**: 正方形，aspectRatio: 1
- **响应式**: 手机2列，平板4列

### 导航项配置
```typescript
const navigationItems = [
  {
    id: 'reading',
    title: '开始占卜',
    icon: '🔮',
    route: '/reading',
    color: '#FFD700',
  },
  {
    id: 'history',
    title: '占卜历史',
    icon: '📜',
    route: '/history',
    color: '#DAA520',
  },
  {
    id: 'cards',
    title: '卡牌说明',
    icon: '🎴',
    route: '/cards',
    color: '#B8860B',
  },
  {
    id: 'settings',
    title: '系统说明',
    icon: '⚙️',
    route: '/settings',
    color: '#8B4513',
  }
]
```

### 交互反馈
- 悬停：轻微上浮 + 阴影增强
- 点击：缩放0.95 + 背景色加深
- 图标微动：悬停时旋转5度

## ✨ DecorativeSymbols - 装饰元素

### 装饰符号
- **五角星**: 缓慢顺时针旋转，周期10秒
- **月亮**: 轻微摆动，周期6秒
- **太阳**: 脉动效果，周期4秒

### 位置分布
- 左上角：五角星
- 右上角：月亮
- 左下角：太阳
- 右下角：小星星群

### 动画配置
```typescript
const symbolAnimations = {
  star: {
    animation: 'rotate 10s linear infinite',
  },
  moon: {
    animation: 'swing 6s ease-in-out infinite alternate',
  },
  sun: {
    animation: 'pulse 4s ease-in-out infinite',
  }
}
```

## 🎭 样式系统

### 颜色变量
```typescript
export const HomeColors = {
  background: '#0F0F1A',
  cardBackground: '#16213E',
  primaryText: '#FFD700',
  secondaryText: '#E6E6FA',
  mutedText: '#8B8878',
  border: '#B8860B40',
  shadow: '#FFD70030',
}
```

### 间距系统
```typescript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}
```

### 动画时间
```typescript
export const Animations = {
  fast: 200,
  normal: 300,
  slow: 500,
  hero: 1000,
}
```

## 🚀 使用示例

### 首页完整组装
```typescript
import { HeroSection } from './HeroSection'
import { DeclarationCard } from './DeclarationCard'
import { NavigationGrid } from './NavigationGrid'
import { DecorativeSymbols } from './DecorativeSymbols'

export default function HomePage() {
  return (
    <YStack f={1} backgroundColor={HomeColors.background}>
      <DecorativeSymbols />
      <HeroSection />
      <DeclarationCard />
      <NavigationGrid />
    </YStack>
  )
}
```