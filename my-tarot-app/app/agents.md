# 应用页面路由架构指南 (app/CLAUDE.md)

## 📱 页面路由概述

**my-tarot-app/app** 是基于 Expo Router 的页面路由目录，采用文件系统路由模式组织应用的所有页面结构。

### 技术栈
- **路由框架**: Expo Router ~6.0.0 (基于 React Navigation 7.x)
- **导航模式**: 文件系统路由 + Stack/Tabs 混合导航
- **状态管理**: Context + Hooks + 本地组件状态
- **全局状态**: AppContext (AI服务状态 + 用户认证状态) ✅ 已实现

## 🚀 应用启动和初始化 (✅ 已实现)

### 根布局 (_layout.tsx)
**实现位置**: `app/_layout.tsx`

**核心功能**：
1. **AppProvider包装**: 提供全局应用状态管理
2. **数据库初始化**: DatabaseInitializer初始化本地SQLite
3. **AI服务检查**: 检查后端AI服务健康状态
4. **匿名用户认证**: 自动注册/验证匿名用户，获取JWT token

**初始化流程**：
```typescript
useEffect(() => {
  const initializeApp = async () => {
    // 1. 数据库初始化
    const initializer = new DatabaseInitializer();
    const dbSuccess = await initializer.initialize();

    // 2. AI服务健康检查 + 匿名用户认证
    await actions.initializeApp(); // AppContext提供
  };

  initializeApp();
}, []);
```

**Provider结构**：
```typescript
<AppProvider>
  <GestureHandlerRootView>
    <TamaguiProvider>
      <ThemeProvider>
        <Stack>
          {/* 路由配置 */}
        </Stack>
      </ThemeProvider>
    </TamaguiProvider>
  </GestureHandlerRootView>
</AppProvider>
```

## 📁 页面路由结构

```
app/
├── _layout.tsx              # 根布局（全局导航配置）
├── (tabs)/                  # 主标签页导航组
│   ├── _layout.tsx          # 标签页布局
│   ├── index.tsx            # 首页 (/)
│   └── explore.tsx          # 探索页（预留）
├── (reading)/               # 占卜流程页面组
│   ├── _layout.tsx          # Stack 布局
│   ├── index.tsx            # 占卜首页 (/reading)
│   ├── type.tsx             # 步骤1: 选择占卜类型
│   ├── category.tsx         # 步骤1.5: 选择占卜类别
│   ├── ai-input.tsx         # 步骤2: AI占卜问题输入
│   ├── draw.tsx             # 步骤3: 抽取塔罗牌
│   ├── basic.tsx            # 步骤4a: 基础解读结果
│   └── ai-result.tsx        # 步骤4b: AI解读结果
├── (history)/               # 历史记录页面组
│   ├── _layout.tsx          # Stack 布局
│   └── index.tsx            # 历史记录列表/详情 (/history)
├── cards/                   # 卡牌说明页面组
│   ├── _layout.tsx          # Stack 布局
│   └── index.tsx            # 卡牌库列表/详情 (/cards)
├── settings/                # 系统说明页面组
│   ├── _layout.tsx          # Stack 布局
│   └── index.tsx            # 系统说明主页面 (/settings)
└── modal.tsx                # 全局模态框（预留）
```

## 🏗️ 导航架构设计

### 整体导航层次
```
Root Stack (_layout.tsx)
├── Main Tabs (底部标签导航)
│   ├── 首页 (index)
│   └── 探索页 (explore)
├── Reading Stack (占卜流程)
│   ├── 占卜首页 → 类型选择 → 问题输入 → 抽牌 → 结果
├── History Stack (历史记录)
│   └── 列表 ↔ 详情 (单页面内状态切换)
├── Cards Stack (卡牌说明)
│   └── 列表 ↔ 详情 (单页面内状态切换)
├── Settings Stack (系统说明)
│   └── 应用信息、充值管理、使用声明、隐私政策等模块
└── Modal (全局模态框)
```

## 🎯 统一导航实现模式

### 1. 自定义标题栏模式 (基于 history 页面)

#### 设计原则
基于 `(history)/index.tsx` 实现的成功模式，建立统一的导航 UI 设计：

```typescript
// 统一的自定义标题栏结构
<View style={styles.customHeader}>
  <TouchableOpacity style={styles.backButton} onPress={handleBack}>
    <Ionicons name="arrow-back" size={24} color="#d4af37" />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>{pageTitle}</Text>
  <View style={styles.headerSpacer} />
</View>
```

#### 统一样式规范
```typescript
const styles = StyleSheet.create({
  // 所有页面通用的标题栏样式
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60, // 固定高度确保一致性
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // 与backButton保持平衡
  },
});
```

### 2. 单页面状态切换模式

#### 适用场景
- **历史记录页面**: 列表 ↔ 详情切换
- **卡牌说明页面**: 列表 ↔ 详情切换
- **系统说明页面**: 单页面多模块滚动展示
- **任何需要在同一页面内进行视图切换的场景**

#### 实现模式
```typescript
export default function PageWithDetailView() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDetail, setItemDetail] = useState<ItemDetail | null>(null);

  // 处理返回到列表
  const handleBackToList = () => {
    setSelectedItemId(null);
    setItemDetail(null);
  };

  // 根据状态渲染不同视图
  if (selectedItemId && itemDetail) {
    return (
      <SafeAreaView style={styles.container}>
        {/* 详情页面标题栏 */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={handleBackToList}>
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>详情页标题</Text>
          <View style={styles.headerSpacer} />
        </View>
        {/* 详情内容 */}
        <DetailComponent item={itemDetail} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 列表页面标题栏 */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>列表页标题</Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* 列表内容 */}
      <ListComponent onItemPress={handleItemPress} />
    </SafeAreaView>
  );
}
```

### 3. 多步骤流程导航模式

#### 适用场景
- **占卜流程**: 类型选择 → 问题输入 → 抽牌 → 结果展示
- **任何需要按步骤完成的流程**

#### 实现策略
```typescript
// 使用 Expo Router 的 push/replace 导航
// 流程页面应该隐藏系统标题栏，使用自定义导航
export default function StepPage() {
  const handleNext = () => {
    router.push('/reading/next-step');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>步骤 {currentStep}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {/* 步骤内容 */}
    </SafeAreaView>
  );
}
```

## 📋 页面组织规范

### 1. Layout 配置规范

#### Stack Layout 标准配置
```typescript
// 所有 _layout.tsx 文件的标准配置
export default function StackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '页面标题',
          headerShown: false, // 统一隐藏系统标题栏
        }}
      />
      {/* 其他页面配置 */}
    </Stack>
  );
}
```

### 2. 页面文件命名规范

#### 功能页面组织
- **主要功能使用目录分组**: `(reading)/`, `(history)/`, `cards/`
- **流程步骤使用描述性命名**: `type.tsx`, `ai-input.tsx`, `draw.tsx`
- **结果页面区分类型**: `basic.tsx`, `ai-result.tsx`

#### 路由路径映射
| 文件路径 | 访问路径 | 用途 |
|----------|----------|------|
| `(tabs)/index.tsx` | `/` | 应用首页 |
| `(reading)/index.tsx` | `/reading` | 占卜流程入口 |
| `(reading)/type.tsx` | `/reading/type` | 选择占卜类型 |
| `(history)/index.tsx` | `/history` | 历史记录 |
| `cards/index.tsx` | `/cards` | 卡牌说明 |
| `settings/index.tsx` | `/settings` | 系统说明 |

## 🎨 UI/UX 一致性规范

### 1. 颜色主题统一
```typescript
// 统一的颜色变量
const NavigationColors = {
  background: '#000',
  headerBackground: 'rgba(20, 20, 40, 0.95)',
  headerBorder: 'rgba(212, 175, 55, 0.3)',
  titleColor: '#d4af37',
  backButtonBackground: 'rgba(212, 175, 55, 0.1)',
  iconColor: '#d4af37',
};
```

### 2. 动画和过渡效果
- **页面切换**: 使用默认的 Stack 过渡动画
- **状态切换**: 使用 React Native Reanimated 实现流畅过渡
- **按钮交互**: 统一的 `activeOpacity={0.7}` 反馈

### 3. 布局和间距
- **页面容器**: 使用 `SafeAreaView` 确保安全区域适配
- **内容间距**: 统一使用 16px 作为标准间距
- **标题栏高度**: 固定 60px 确保一致性

## 🔄 导航状态管理

### 1. 页面级状态管理
```typescript
// 每个页面管理自己的 UI 状态
const [loading, setLoading] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [showDetail, setShowDetail] = useState(false);
```

### 2. 跨页面数据传递
```typescript
// 使用 router.push 传递简单参数
router.push({
  pathname: '/reading/draw',
  params: { type: 'ai', category: 'love' }
});

// 使用 Context 传递复杂状态
const ReadingContext = createContext();
```

## 🛠️ 开发最佳实践

### 1. 组件复用策略
- **自定义标题栏**: 创建 `CommonHeader` 组件复用标题栏逻辑
- **加载状态**: 使用统一的 `LoadingView` 组件
- **错误处理**: 统一的错误提示和重试机制

### 2. 性能优化
- **懒加载**: 大型页面使用 React.lazy 懒加载
- **状态优化**: 避免不必要的重渲染
- **内存管理**: 及时清理页面状态和监听器

### 3. 类型安全
```typescript
// 定义页面参数类型
interface ReadingParams {
  type: 'basic' | 'ai';
  category?: string;
}

// 路由参数类型定义
type RootStackParamList = {
  Reading: ReadingParams;
  History: undefined;
  Cards: undefined;
};
```

## 📚 相关文档

### 功能特定文档
- **占卜流程页面**: `(reading)/CLAUDE.md`
- **历史记录组件**: `../components/history/CLAUDE.md`
- **卡牌说明组件**: `../components/cards/CLAUDE.md`
- **系统说明组件**: `../components/settings/CLAUDE.md`

### 核心架构文档
- **前端总体架构**: `../CLAUDE.md`
- **数据库架构**: `../lib/database/CLAUDE.md`
- **AI功能架构**: `../lib/ai/CLAUDE.md`

---

*此文档定义了 my-tarot-app 应用页面路由的统一实现模式，确保所有页面的导航体验保持一致性和流畅性。*