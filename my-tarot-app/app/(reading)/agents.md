# 占卜流程路由开发指南

## 🧭 路由结构

### 占卜流程路由组（支持离线占卜和AI占卜）
```
app/(reading)/
├── _layout.tsx          # 占卜流程布局（4步进度指示器 + 内容区域）
├── type.tsx            # 步骤1：选择占卜类型（离线/AI两种模式）
├── category.tsx        # 步骤2：选择占卜类别（仅离线占卜使用）
├── ai-input.tsx        # 步骤2：AI问题输入页（仅AI占卜使用）
├── draw.tsx            # 步骤3：抽牌页面（兼容离线/AI两种模式）
├── basic.tsx           # 步骤4：基础解读（仅离线占卜使用）
└── ai-result.tsx       # 步骤4：AI解读结果（仅AI占卜使用）
```

## 📊 流程状态管理

### 占卜状态结构（扩展支持AI占卜）
```typescript
interface ReadingFlowState {
  step: number                    // 当前步骤 (1-4)
  type: 'offline' | 'ai'          // 占卜类型（离线/AI）
  category: string                // 占卜类别（仅离线模式）
  userDescription?: string         // AI模式：用户问题描述
  aiDimensions?: DimensionInfo[]   // AI模式：推荐的维度
  selectedCards: SelectedCard[]   // 选择的卡牌
  interpretations: InterpretationData[] // 解读结果
  aiResult?: {                     // AI解读结果
    dimension_summaries: Record<string, string>
    overall_summary: string
    insights: string[]
  }
  createdAt: Date                 // 创建时间
  isLoading: boolean              // 加载状态
  error: string | null            // 错误信息
}

interface SelectedCard {
  cardId: number
  position: 'past' | 'present' | 'future'
  direction: 'upright' | 'reversed'
  revealed: boolean
  imageUrl: string                // 本地图片路径
}

interface CardData {
  name: string
  arcana: string
  suit: string | null
  number: number
  image_url: string               // 来自cards表的相对路径
  style_name: string
  deck: string
}
```

### 状态持久化
- **本地存储**: AsyncStorage 保存占卜状态
- **内存缓存**: React Context 实时状态
- **恢复机制**: 应用重启后可恢复占卜流程
- **图片加载**: 通过 require() 加载本地塔罗牌图片

## 🖼️ 塔罗牌图片资源

### 图片目录结构
```
assets/images/
├── major/                      # 22张大阿卡纳
│   ├── 00-fool.jpg
│   ├── 01-magician.jpg
│   ├── ...
│   └── 21-world.jpg
└── minor/                      # 56张小阿卡纳
    ├── cups/                   # 圣杯套牌
    ├── pentacles/              # 钱币套牌
    ├── swords/                 # 宝剑套牌
    └── wands/                  # 权杖套牌
```

### 图片加载逻辑
```typescript
const card = cardsData.find(c => c.id === cardId)
const imageUrl = card.image_url  // 如 "major/00-fool.jpg"

// 加载本地图片
const getCardImage = (imageUrl: string) => {
  try {
    return require(`../assets/images/${imageUrl}`)
  } catch (error) {
    console.warn(`Failed to load image: ${imageUrl}`)
    return require('../assets/images/card-back.jpg') // 默认卡背
  }
}
```

## 🎯 每个步骤详细设计

### 步骤1：选择占卜类型 (type.tsx) - 支持AI占卜 (✅ 已优化)

#### 页面功能（优化后）
- **类型选择**: 离线占卜 / AI占卜（两个都可用）
- **AI服务状态**: 从全局AppContext获取，无需页面内检查
- **性能优化**: 移除重复的健康检查逻辑，页面加载更快
- **视觉反馈**: 选中状态高亮显示

#### 状态获取（优化后）
```typescript
import { useAppContext } from '@/lib/contexts/AppContext';

export default function TypeSelectionScreen() {
  const { state } = useAppContext();

  // 直接从全局状态获取
  const isAIServiceAvailable = state.isAIServiceAvailable;
  const isCheckingService = state.isCheckingAIService || !state.isAppInitialized;

  // 无需执行 checkAIServiceHealth()
}
```

**优化效果**：
- ✅ 移除重复的健康检查逻辑（原47行代码删除）
- ✅ 页面加载更快，直接获取状态
- ✅ 代码更简洁，职责更明确
- ✅ 状态同步，避免不一致

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤1/4) ●○○○           │
├─────────────────────────────────────┤
│  标题：选择占卜方式                  │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐   │
│  │  离线占卜   │  │  AI占卜     │   │
│  │  📖         │  │  🤖         │   │
│  │  内置解读   │  │  智能解读   │   │
│  │  [可用]     │  │  [可用]     │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

#### 交互逻辑（更新）
```typescript
const handleTypeSelect = async (type: 'offline' | 'ai') => {
  await updateReadingState({ type, step: 2 })

  if (type === 'offline') {
    router.push('/(reading)/category')
  } else {
    router.push('/(reading)/ai-input')
  }
}

// 移除 handleAIClick，AI占卜现在可用
```

### 步骤2A：AI问题输入 (ai-input.tsx) - 新增页面

#### 页面功能
- **问题输入**: 200字限制的文本输入框
- **调用分析**: 调用 `/analyze` 接口获取推荐维度
- **自动跳转**: 分析完成后自动进入抽牌页面

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤2/4) ●●○○           │
├─────────────────────────────────────┤
│  标题：描述您的问题                  │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │  输入框 (200字限制)             │ │
│  │  请详细描述您想要占卜的问题...   │ │
│  │  字数：0/200                    │ │
│  └─────────────────────────────────┘ │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │  分析问题                       │ │
│  └─────────────────────────────────┘ │
│                                     │
│  推荐维度显示区域（分析后显示）      │
└─────────────────────────────────────┘
```

#### 实现要点
```typescript
import { AIReadingService } from '@/lib/services/AIReadingService';

const handleAnalyze = async () => {
  if (!userDescription.trim()) {
    Alert.alert('提示', '请输入您的问题');
    return;
  }

  setLoading(true);
  try {
    const aiService = AIReadingService.getInstance();
    const result = await aiService.analyzeDescription(userDescription);

    updateAIDimensions(result.recommended_dimensions);
    updateUserDescription(userDescription);
    updateStep(3);
    router.push('/(reading)/draw');
  } catch (error) {
    Alert.alert('分析失败', '请检查网络连接后重试');
  } finally {
    setLoading(false);
  }
};
```

### 步骤2B：选择占卜主题（category.tsx）- 保持现有实现

#### 数据来源与分组
- 从数据库表 `dimension` 读取所有维度（使用 DimensionService.getAllDimensions()）。
- 以每条维度的 `description` 字段作为“主题”（UI 显示的主标签），以 `category` 作为分类（不变）。
- 将同一 `category` 且 `description` 相同的维度分为一组（每组通常包含三条 aspect_type 分别为 1/2/3 的维度）。
- 示例：
  - description: “情感互动与交流方式” → 包含：情感-互动-我、情感-互动-对象、情感-互动-如何发展

#### 加载逻辑（loadDimensions）
```typescript
const loadDimensions = async () => {
  const res = await dimensionService.getAllDimensions();
  // 按 (category, description) 分组，生成 items:
  // { id: `${category}|${description}`, category, description, displayName, icon, color, dimensions: [dim1,dim2,dim3] }
  // 显示主标签 = description，副标签显示 displayName（或 category）
}
```

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤2/4) ●●○○           │
├─────────────────────────────────────┤
│  标题：选择占卜主题（示例以主题分组显示）  │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ 情感互动与交流方式 │ 事业发展的影响 │ 健康-身体状况 │   │
│  │     (情感)      │   (事业)     │   (健康)    │   │
│  │     💗         │   💼        │   🏥       │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

#### 选择语义
- 选中某个主题项表示选中对应组下的 3 个维度（按 `aspect_type` 排序分别映射为过去/现在/将来）。
- 选中后调用 `updateCategory(group.category)` 保持 `category` 不变；调用 `updateDimensions(group.dimensions)` 将 3 个维度保存到阅读流程状态，随后进入抽牌页（draw）。



### 步骤3：抽牌页面 (draw.tsx) - 兼容AI/离线两种模式

#### 核心功能（更新）
- **兼容性**: 支持AI和离线两种占卜模式
- **维度来源**: AI模式使用推荐维度，离线模式使用选择的类别维度
- **三牌阵展示**: 3个位置分别代表3个维度
- **抽牌交互**: 统一的抽牌和拖拽交互体验

#### 兼容性改造
```typescript
const loadDimensions = async () => {
  try {
    if (state.type === 'ai' && state.aiDimensions) {
      // AI模式：使用推荐的维度
      const sortedDimensions = [...state.aiDimensions].sort((a, b) => a.aspect_type - b.aspect_type);
      setDimensions(sortedDimensions.slice(0, 3));
    } else if (state.type === 'offline' && state.dimensions) {
      // 离线模式：使用现有逻辑
      const sortedDimensions = [...state.dimensions].sort((a, b) => a.aspect_type - b.aspect_type);
      setDimensions(sortedDimensions.slice(0, 3));
    } else {
      console.warn('No dimensions found in reading state');
    }
  } catch (error) {
    console.error('Error loading dimensions:', error);
  } finally {
    setLoading(false);
  }
};

const handleContinue = () => {
  updateCards(drawnCards);
  updateStep(4);

  if (state.type === 'ai') {
    router.push('/(reading)/ai-result');
  } else {
    router.push('/(reading)/basic');
  }
};
```

### 步骤4A：AI解读结果 (ai-result.tsx) - 新增页面

#### 页面功能
- **调用AI解读**: 调用 `/generate` 接口获取多维度解读
- **展示解读结果**: 显示维度解读、综合分析、关键洞察
- **保存历史**: 支持保存AI占卜记录

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤4/4) ●●●●           │
├─────────────────────────────────────┤
│  AI塔罗解读                         │
├─────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │牌面1│ │牌面2│ │牌面3│           │
│  │维度1│ │维度2│ │维度3│           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  【各维度解读】                      │
│  维度1: [aspect] - [card_name]      │
│  [dimension_summaries内容]          │
│                                     │
│  维度2: [aspect] - [card_name]      │
│  [dimension_summaries内容]          │
│                                     │
│  维度3: [aspect] - [card_name]      │
│  [dimension_summaries内容]          │
├─────────────────────────────────────┤
│  【综合分析】                       │
│  [overall_summary内容]              │
├─────────────────────────────────────┤
│  【关键洞察】                       │
│  • [insights[0]]                   │
│  • [insights[1]]                   │
│  • [insights[2]]                   │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐   │
│  │  保存记录   │ │  重新占卜   │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

#### 核心实现
```typescript
import { AIReadingService } from '@/lib/services/AIReadingService';

const generateAIReading = async () => {
  setLoading(true);
  try {
    const aiService = AIReadingService.getInstance();

    // 转换卡牌数据格式
    const cardInfos = state.selectedCards.map(card => ({
      id: card.cardId,
      name: card.name,
      arcana: 'Major', // 从卡牌数据获取
      number: card.cardId,
      direction: card.direction === 'upright' ? '正位' : '逆位',
      position: card.position
    }));

    const result = await aiService.generateAIReading(
      cardInfos,
      state.aiDimensions,
      state.userDescription,
      'three-card'
    );

    updateAIResult(result);
    setAiResult(result);
  } catch (error) {
    console.error('AI解读生成失败:', error);
    Alert.alert('生成解读失败', '请检查网络连接后重试');
  } finally {
    setLoading(false);
  }
};

const handleSaveToHistory = async () => {
  if (!aiResult) {
    Alert.alert('保存失败', '没有可保存的解读结果');
    return;
  }

  try {
    // 调用ReadingContext的saveToHistory方法
    // 该方法会调用ReadingService.saveReadingFromState()处理AI占卜数据保存
    const savedId = await saveToHistory();
    Alert.alert('保存成功', `占卜记录已保存到历史记录 (ID: ${savedId})`);
  } catch (error) {
    console.error('保存AI占卜记录失败:', error);
    const errorMessage = error instanceof Error ? error.message : '保存记录失败，请重试';
    Alert.alert('保存失败', errorMessage);
  }
};
```

### 步骤4B：基础解读 (basic.tsx) - 保持现有实现

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤3/4) ●●●○           │
├─────────────────────────────────────┤
│  标题：抽取塔罗牌                    │
├─────────────────────────────────────┤
│                                     │
│    [卡牌1]    [卡牌2]    [卡牌3]    │
│   [维度1]    [维度2]    [维度3]    │
│  (aspect1)   (aspect2)  (aspect3)   │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │  点击开始抽牌                  │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### 抽牌流程
```typescript
const drawCards = async () => {
  setIsLoading(true)

  // 1. 根据选择的category获取对应的3个维度
  const categoryDimensions = await getDimensionsByCategory(selectedCategory)
  // 按aspect_type排序：1(过去), 2(现在), 3(将来)
  const sortedDimensions = categoryDimensions.sort((a, b) => a.aspect_type - b.aspect_type)

  // 2. 洗牌动画
  await shuffleAnimation()

  // 3. 从78张牌中随机抽取3张
  const allCards = await loadCardsData()
  const shuffled = [...allCards].sort(() => Math.random() - 0.5)
  const drawnCards = shuffled.slice(0, 3)

  // 4. 分配到3个位置，每个位置对应一个维度
  const positionedCards = drawnCards.map((card, index) => ({
    cardId: card.id,
    name: card.name,
    imageUrl: card.image_url,
    position: sortedDimensions[index].aspect,  // 过去/现在/将来
    dimension: sortedDimensions[index],
    direction: Math.random() > 0.5 ? 'upright' : 'reversed',
    revealed: false
  }))

  await updateReadingState({
    selectedCards: positionedCards,
    step: 4
  })

  setIsLoading(false)
  router.push('/(reading)/basic')
}

// 点击牌面显示基础牌意
const showCardMeaning = async (card) => {
  const interpretation = await getCardInterpretation(card.name, card.direction)
  Alert.alert(
    `${card.name} (${card.direction})`,
    interpretation?.summary || '暂无解读'
  )
}
```

### 步骤4：基础解读 (basic.tsx) - 流程终点

#### 解读内容
- **详细解读**: 显示 card_interpretation_dimensions表 中的 content
- **匹配条件**: 根据 card_name, direction, dimension_name, dimension_category, aspect_type 进行精确匹配
- **布局展示**: 每张牌显示其在对应维度下的详细解读内容
- **完成按钮**: 保存到历史记录，返回首页

#### 布局设计
```
┌─────────────────────────────────────┐
│  进度指示器 (步骤4/4) ●●●●           │
├─────────────────────────────────────┤
│  基础牌意解读                        │
├─────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │牌面1│ │牌面2│ │牌面3│           │
│  │维度1│ │维度2│ │维度3│           │
│  └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────┤
│  详细解读内容区域                     │
│  维度1: [aspect] - [card_name] [direction]  │
│  [来自card_interpretation_dimensions的content] │
│                                     │
│  维度2: [aspect] - [card_name] [direction]  │
│  [content]                          │
│                                     │
│  维度3: [aspect] - [card_name] [direction]  │
│  [content]                          │
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐   │
│  │  保存记录   │ │  重新占卜   │   │
│  └─────────────┘ └─────────────┘   │
└─────────────────────────────────────┘
```

#### 数据获取逻辑
```typescript
const getDetailedInterpretation = async (card, dimension) => {
  const interpretations = await loadCardInterpretationDimensions()

  // 精确匹配所有条件
  return interpretations.find(item =>
    item.card_name === card.name &&
    item.direction === card.direction &&
    item.dimension_name === dimension.name &&
    item.dimension_category === dimension.category &&
    item.aspect_type === dimension.aspect_type
  )
}

const generateDetailedReading = async (selectedCards: SelectedCard[]) => {
  const readings = await Promise.all(
    selectedCards.map(async card => {
      const detailedInterpretation = await getDetailedInterpretation(card, card.dimension)

      return {
        ...card,
        interpretation: {
          summary: card.basicSummary, // 来自card_interpretations表
          detailedContent: detailedInterpretation?.content || '暂无详细解读',
          dimension: card.dimension
        }
      }
    })
  )

  // 保存到历史记录
  await saveToHistory({
    cards: selectedCards,
    category: selectedCategory,
    interpretations: readings,
    timestamp: new Date(),
    type: 'offline'
  })

  return readings
}

// 完成占卜，返回首页
const completeReading = async () => {
  await resetReadingState()
  router.replace('/(tabs)/')
}
```

## 🔄 页面间状态传递

### 状态管理方案
```typescript
// 使用 React Context
const ReadingContext = createContext<ReadingFlowState>()

// 更新的状态结构
interface SelectedCard {
  cardId: number
  name: string
  imageUrl: string
  position: string                    // 维度的aspect
  dimension: DimensionData           // 完整的维度信息
  direction: 'upright' | 'reversed'
  revealed: boolean
  basicSummary?: string              // 来自card_interpretations表
}

interface DimensionData {
  name: string
  category: string
  description: string
  aspect: string
  aspect_type: number                // 1,2,3分别对应第一、二、三个位置
}

// 状态更新函数
const useReadingFlow = () => {
  const [state, setState] = useState(defaultReadingState)

  const updateStep = (step: number) =>
    setState(prev => ({ ...prev, step }))

  const updateCategory = (category: string) =>
    setState(prev => ({ ...prev, category }))

  const updateCards = (cards: SelectedCard[]) =>
    setState(prev => ({ ...prev, selectedCards: cards }))

  return { state, updateStep, updateCategory, updateCards }
}
```

### 页面跳转流程（4步离线占卜）
```
首页 → 步骤1 → 步骤2 → 步骤3 → 步骤4 → [完成/返回首页]
  ↓     (type)   (category)  (draw)   (basic)
  └──── 历史记录 ────┘
```

### 进度指示器状态
- **步骤1/4**: ●○○○ (25%) - 选择占卜类型
- **步骤2/4**: ●●○○ (50%) - 选择占卜类别
- **步骤3/4**: ●●●○ (75%) - 抽牌并查看基础牌意
- **步骤4/4**: ●●●● (100%) - 查看详细解读，流程完成

### 数据匹配逻辑
1. **步骤2**: 选择类别 → 获取该类别下的维度数据
2. **步骤3**: 根据aspect_type(1,2,3)排序维度 → 分配给3个位置
3. **步骤3**: 点击牌面 → 显示card_interpretations表的summary
4. **步骤4**: 详细解读 → 根据card_name+direction+dimension精确匹配content

## 🎨 视觉设计系统

### 占卜流程主题
- **主色调**: 深蓝黑 (#0F0F1A) + 金色 (#FFD700)
- **进度指示**: 金色渐变进度条
- **卡牌样式**: 3D翻转效果，金色边框
- **背景效果**: 神秘星空粒子背景

### 动画规范
- **页面切换**: 淡入淡出 (300ms)
- **卡牌翻转**: 3D翻转 (800ms)
- **进度更新**: 平滑过渡 (500ms)
- **状态变化**: 弹性动画 (400ms)

## 🚀 使用示例

### 完整占卜流程
```typescript
// _layout.tsx
export default function ReadingLayout() {
  return (
    <ReadingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="type" options={{ title: '选择占卜类型' }} />
        <Stack.Screen name="category" options={{ title: '选择占卜类别' }} />
        <Stack.Screen name="draw" options={{ title: '抽取塔罗牌' }} />
        <Stack.Screen name="basic" options={{ title: '基础解读' }} />
      </Stack>
    </ReadingProvider>
  )
}
```

## 📊 错误处理

### 常见错误场景
- **数据加载失败**: 显示重试按钮
- **网络异常**: 离线模式提示
- **卡牌数据缺失**: 使用默认卡牌
- **解读数据错误**: 显示友好错误信息

### 恢复机制
- **状态恢复**: 从本地存储恢复占卜状态
- **步骤回退**: 支持返回上一步修改选择
- **重置流程**: 一键重新开始占卜流程

## 🧪 测试策略

### 单元测试
- 各步骤组件独立测试
- 状态管理逻辑测试
- 数据转换函数测试

### 集成测试
- 完整占卜流程测试
- 状态持久化测试
- 错误恢复机制测试

### UI测试
- 动画效果测试
- 响应式布局测试
- 交互反馈测试

## 📈 性能优化

### 卡牌加载优化
- 图片懒加载
- 预加载下一张卡牌
- 使用WebP格式

### 动画优化
- 硬件加速3D变换
- 避免重排重绘
- 使用requestAnimationFrame

### 内存管理
- 及时清理不需要的数据
- 图片缓存管理
- 避免内存泄漏

## 🔧 开发工具

### 调试工具
- React DevTools
- Expo Dev Client
- Flipper调试器

### 性能监控
- 页面加载时间
- 动画性能指标
- 内存使用情况

### 测试工具
- Jest单元测试
- React Native Testing Library
- Detox E2E测试

## 📋 开发检查清单

### 功能检查
- [ ] 占卜类型选择
- [ ] 占卜类别选择
- [ ] 三牌阵抽牌
- [ ] 基础解读展示
- [ ] 状态持久化
- [ ] 错误处理
- [ ] 性能优化

### 视觉检查
- [ ] 神秘塔罗风格
- [ ] 动画流畅性
- [ ] 响应式布局
- [ ] 交互反馈
- [ ] 加载状态
- [ ] 错误提示

### 用户体验
- [ ] 直观的导航
- [ ] 清晰的提示
- [ ] 流畅的动画
- [ ] 快速的响应
- [ ] 友好的错误处理
- [ ] 状态恢复机制