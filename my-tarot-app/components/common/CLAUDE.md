# 通用组件开发指南

## 🧩 组件结构

### 核心组件
```
components/common/
├── AnimatedCard.tsx         # 动画卡片组件
├── GradientBackground.tsx   # 渐变背景组件
├── MysticalIcon.tsx         # 神秘图标组件
├── AnimatedButton.tsx       # 动画按钮组件
├── GlassCard.tsx           # 玻璃卡片组件
├── ParticleBackground.tsx   # 粒子背景组件
└── styles.ts               # 通用样式
```

## 🎴 AnimatedCard - 动画卡片组件

### 功能特性
- 支持3D翻转动画
- 可配置翻转方向和持续时间
- 支持触摸和悬停交互
- 自定义卡片正反面内容

### 使用示例
```typescript
<AnimatedCard
  frontContent={<CardFront />}
  backContent={<CardBack />}
  isFlipped={isFlipped}
  duration={600}
  direction="horizontal"
/>
```

### 动画配置
```typescript
const cardAnimations = {
  flipHorizontal: {
    rotateY: '180deg',
    duration: 600,
    easing: 'ease-in-out',
  },
  flipVertical: {
    rotateX: '180deg',
    duration: 600,
    easing: 'ease-in-out',
  },
  bounce: {
    scale: [1, 1.05, 1],
    duration: 300,
  }
}
```

## 🌈 GradientBackground - 渐变背景组件

### 渐变类型
- **神秘夜空**：深蓝到深紫的径向渐变
- **金色曙光**：深金到橙色的线性渐变
- **星空白**：深蓝到黑色的星空效果

### 配置选项
```typescript
interface GradientBackgroundProps {
  type: 'mystical' | 'golden' | 'starry'
  animated?: boolean
  intensity?: number
  children?: React.ReactNode
}
```

### 使用示例
```typescript
<GradientBackground type="mystical" animated>
  <Content />
</GradientBackground>
```

## 🔮 MysticalIcon - 神秘图标组件

### 图标库
- **塔罗符号**：五角星、月亮、太阳、权杖、圣杯、宝剑、星币
- **神秘元素**：水晶球、魔法书、钥匙、眼睛、羽毛
- **装饰符号**：螺旋、花纹、边框装饰

### 动画效果
- **旋转**：顺时针/逆时针旋转
- **脉动**：缩放动画
- **浮动**：上下浮动效果
- **闪烁**：透明度变化

### 使用示例
```typescript
<MysticalIcon
  name="pentagram"
  size={48}
  color="#FFD700"
  animation="rotate"
  duration={4000}
/>
```

## 🎪 AnimatedButton - 动画按钮组件

### 按钮类型
- **主按钮**：金色渐变背景
- **次级按钮**：透明背景+金色边框
- **幽灵按钮**：仅文字和图标

### 交互状态
- **默认**：轻微阴影
- **悬停**：上浮+阴影增强
- **按下**：缩放+背景加深
- **禁用**：透明度降低

### 使用示例
```typescript
<AnimatedButton
  type="primary"
  title="开始占卜"
  icon="🔮"
  onPress={handlePress}
  loading={isLoading}
/>
```

## 🪟 GlassCard - 玻璃卡片组件

### 视觉效果
- **毛玻璃效果**：背景模糊+透明度
- **边框发光**：根据主题色发光
- **阴影效果**：多层阴影营造深度

### 配置选项
```typescript
interface GlassCardProps {
  blur?: number
  opacity?: number
  borderRadius?: number
  borderColor?: string
  glowColor?: string
  children?: React.ReactNode
}
```

### 使用示例
```typescript
<GlassCard blur={20} opacity={0.1} glowColor="#FFD700">
  <CardContent />
</GlassCard>
```

## ✨ ParticleBackground - 粒子背景组件

### 粒子类型
- **星星粒子**：缓慢移动的闪烁星星
- **魔法粒子**：彩色光点轨迹
- **塔罗符号**：微小塔罗符号飘动

### 配置参数
```typescript
interface ParticleBackgroundProps {
  type: 'stars' | 'magic' | 'symbols'
  density?: number
  speed?: number
  color?: string
  interactive?: boolean
}
```

### 使用示例
```typescript
<ParticleBackground
  type="stars"
  density={50}
  speed={0.5}
  color="#FFD700"
  interactive
/>
```

## 🎨 样式系统

### 颜色系统
```typescript
export const CommonColors = {
  // 基础色
  primary: '#FFD700',
  secondary: '#B8860B',
  accent: '#DAA520',

  // 背景色
  background: '#0F0F1A',
  surface: '#1A1A2E',
  elevated: '#16213E',

  // 文字色
  text: '#E6E6FA',
  textSecondary: '#8B8878',
  textDisabled: '#555555',

  // 状态色
  success: '#228B22',
  warning: '#CD853F',
  error: '#8B0000',
}
```

### 动画时间
```typescript
export const AnimationTiming = {
  instant: 150,
  fast: 250,
  normal: 400,
  slow: 600,
  hero: 1000,
}
```

### 阴影系统
```typescript
export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
}
```

## 🚀 组合使用示例

### 完整卡片组合
```typescript
<GradientBackground type="mystical" animated>
  <ParticleBackground type="stars" density={30} />

  <GlassCard blur={20} opacity={0.1}>
    <MysticalIcon name="pentagram" size={32} animation="rotate" />
    <AnimatedCard
      frontContent={<CardFront />}
      backContent={<CardBack />}
    />

    <AnimatedButton
      type="primary"
      title="开始占卜"
      icon="🔮"
      onPress={handleStart}
    />
  </GlassCard>
</GradientBackground>
```

## 🔧 高级用法

### 自定义动画
```typescript
// 自定义动画序列
const customSequence = {
  0: { opacity: 0, scale: 0.8, rotate: '-10deg' },
  50: { opacity: 0.5, scale: 1.1, rotate: '5deg' },
  100: { opacity: 1, scale: 1, rotate: '0deg' },
}

// 链式动画
const chainAnimation = [
  { type: 'fadeIn', duration: 300 },
  { type: 'scale', duration: 200, delay: 100 },
  { type: 'bounce', duration: 400, delay: 300 },
]
```