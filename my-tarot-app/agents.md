# 塔罗牌应用前端开发指南 (CLAUDE.md)

## 📱 项目信息

**my-tarot-app** 是塔罗牌应用的 Expo React Native 前端客户端，支持 Android/iOS 双平台。

### 技术栈
- **框架**: Expo React Native ~54.0.1
- **语言**: TypeScript ~5.9.2
- **导航**: Expo Router ~6.0.0
- **动画**: React Native Reanimated ~4.1.0
- **构建**: EAS Build

## 📁 项目架构

```
my-tarot-app/
├── app/                     # Expo Router 页面
│   ├── (tabs)/              # 主导航标签页
│   │   ├── index.tsx        # 首页
│   │   └── cards.tsx        # 卡牌说明
│   ├── cards/               # 卡牌说明功能页面组
│   ├── (reading)/           # 占卜流程页面组
│   ├── (history)/           # 历史记录页面组
│   └── settings/            # 系统说明页面组
├── components/              # 可复用组件库
│   ├── home/                # 首页组件 -> 详见 components/home/CLAUDE.md
│   ├── cards/               # 卡牌说明组件 -> 详见 components/cards/CLAUDE.md
│   ├── reading/             # 占卜流程组件 -> 详见 components/reading/CLAUDE.md
│   ├── history/             # 历史记录组件
│   ├── settings/            # 系统说明组件 -> 详见 components/settings/CLAUDE.md
│   └── common/              # 通用组件
├── lib/                     # 核心业务逻辑
│   ├── database/            # 数据库层 -> 详见 lib/database/CLAUDE.md
│   ├── ai/                  # AI功能架构 -> 详见 lib/ai/CLAUDE.md
│   ├── i18n/                # 多语言初始化与资源管理
│   ├── services/            # 服务层
│   └── types/               # TypeScript类型定义
├── assets/                  # 静态资源
│   ├── db/                  # 预置数据库
│   ├── data/                # 数据文件
│   └── images/              # 图片资源
└── CLAUDE.md               # 本文档
```

## 🏗️ 核心功能架构

### 主要功能模块

#### 1. 首页模块 (`app/(tabs)/index.tsx`)
- **神秘塔罗风格设计**：金色渐变主题，星空背景
- **4大导航入口**：开始占卜、占卜历史、卡牌说明、系统说明
- **应用声明**：塔罗学习工具定位声明
- **详细设计**: 参考 `components/home/CLAUDE.md`

#### 2. 占卜流程模块 (`app/(reading)/`)
- **4步骤占卜流程**：类型选择 → 问题输入 → 抽牌 → 解读结果
- **双模式支持**：基础占卜（离线）+ AI占卜（在线）
- **牌阵支持**：三牌阵、凯尔特十字
- **详细设计**: 参考 `components/reading/CLAUDE.md` 和 `lib/ai/CLAUDE.md`

#### 3. 卡牌说明模块 (`app/cards/`)
- **完整卡牌库**：78张塔罗牌展示
- **正逆位解读**：每张卡牌提供双重解读
- **塔罗历史**：文化背景介绍
- **详细设计**: 参考 `components/cards/CLAUDE.md`

#### 4. 历史记录模块 (`app/(history)/`)
- **占卜记录管理**：基础占卜和AI占卜历史
- **数据持久化**：本地SQLite存储
- **离线同步**：与后端API同步机制

#### 5. 系统说明模块 (`app/settings/`)
- **应用信息展示**：版本信息、愿景使命声明
- **积分管理功能**：余额查询、充值套餐、充值记录
- **语言切换**：`LanguageSection` 提供本地化快捷切换，立即生效并持久化
- **使用声明**：免责声明、使用建议、注意事项
- **隐私政策**：数据收集、使用方式、保护承诺
- **帮助支持**：联系方式、用户反馈、版本检查
- **详细设计**: 参考 `components/settings/CLAUDE.md`

## 🔔 更新摘要（Android IAP）
- 新增 Android 内购（Google Play）入口：设置 → 积分管理 显示商品网格（最多 6 个套餐），保留兑换码充值作为兜底。
- 集成 `react-native-iap`（动态导入）：`initConnection → getProducts → requestPurchase → purchaseUpdatedListener → /api/v1/payments/google/verify → finishTransaction`，验证成功后自动刷新余额/交易记录。
- 新增文案键：`settings.recharge.iap.*`（标题、加载/重试、商店不可用、购买按钮、验证中、成功、失败/取消/校验失败）。
- 新增前端服务方法：`UserService.verifyGooglePurchase()`；调用后端 `POST /api/v1/payments/google/verify` 并处理幂等（由后端按 `purchase_token` 去重）。
- 依赖变更：`react-native-iap`（需要原生构建，Expo Go 不支持）；Android 首版，iOS 暂不展示 IAP 区块。
- 失败与兜底：商店不可用/验证失败时显示提示并保留“兑换码充值”入口；用户取消有明确反馈。

## 🔄 数据管理架构

### 双数据库设计
- **配置数据库** (`tarot_config.db`): 只读配置数据
- **用户数据库** (`tarot_user_data.db`): 读写用户数据
- **详细设计**: 参考 `lib/database/CLAUDE.md`

### 服务层架构
```typescript
lib/services/
├── AuthService.ts         # 匿名用户认证和JWT token管理 (✅ 已实现)
├── AIReadingService.ts    # AI解读服务，自动携带JWT认证 (✅ 已实现)
├── cards.ts               # 卡牌服务（配置数据）
├── reading.ts             # 占卜服务（用户数据）
├── card-info.ts           # 卡牌信息聚合服务
└── sync.ts                # 数据同步服务
```

### 全局状态管理 (✅ 已实现并优化)
```typescript
lib/contexts/
├── AppContext.tsx         # 全局应用状态（数据库 + AI服务 + 认证）
└── ReadingContext.tsx     # 占卜流程状态
```

**AppContext提供的全局状态**：
- **语言状态**：`locale`, `availableLocales`, `isLocaleLoading`, `localeError`（与 AsyncStorage + user_settings 同步）
- **数据库状态**: `isDatabaseInitialized`, `isInitializingDatabase`, `databaseError` (✅ 新增)
- **AI服务状态**: `isAIServiceAvailable`, `isCheckingAIService`, `aiServiceError`
- **认证状态**: `isAuthenticated`, `isAuthenticating`, `authError`, `userToken`
- **初始化状态**: `isAppInitialized`, `initializationError`

**核心功能**：
- **数据库初始化管理**: 在AppContext中统一管理数据库初始化流程，包括表验证 (✅ 新增)
- **初始化顺序保证**: 数据库 → AI服务 → 认证，严格按顺序初始化
- **全局状态同步**: 所有页面可直接从Context获取状态，无需重复检查
- **错误处理**: 数据库初始化失败时提供详细错误信息和用户提示
- **支持手动刷新**: AI服务状态和认证状态支持手动刷新
- **多语言就绪**: 初始化时自动检测设备/用户偏好，语言切换自动同步 `i18next` + 本地数据库

## 📡 API集成架构

### 后端API集成
项目与 FastAPI 后端服务集成，支持以下核心功能：

| 接口 | 用途 | 集成状态 |
|------|------|----------|
| `POST /auth/anon` | 匿名用户认证 | ✅ 已集成 |
| `POST /readings/analyze` | AI问题分析 | ✅ 已集成 |
| `POST /readings/generate` | AI解读生成 | ✅ 已集成 |
| `POST /payments/checkout` | 支付会话创建 | 🔄 待集成 |

### API调用模式 (✅ 已实现统一认证)
- **自动JWT认证**：所有AI API调用自动携带JWT token
- **数据自包含设计**：前端传递完整对象信息，减少ID依赖
- **错误处理机制**：网络异常自动降级到离线模式，401错误自动清除token
- **状态管理**：统一的加载、错误、成功状态处理

### 应用启动流程 (✅ 已实现并优化)
```
1. 用户启动应用
   ↓
2. 初始化API配置 (initializeApiConfig)
   ↓
3. AppContext.initializeApp() 执行以下步骤:
   ├─ 3.1 数据库初始化 (DatabaseService.initialize)
   │   ├── 复制预置数据库到可写目录
   │   ├── 打开数据库连接
   │   ├── 验证核心表存在 (card, spread, dimension, card_interpretation) ✅ 新增
   │   └── 创建用户表 (user_history)
   │
   ├─ 3.2 AI服务健康检查 (AIReadingService.checkServiceHealth)
   │
   └─ 3.3 匿名用户认证 (AuthService.initializeUser)
   ↓
4. 更新全局状态 (AppContext state)
   ├── isDatabaseInitialized = true
   ├── isAIServiceAvailable = ...
   └── isAuthenticated = ...
   ↓
5. 应用就绪 (isAppInitialized = true)
```

**关键改进**：
- ✅ **数据库表验证**: 在初始化时验证核心表是否存在，防止生产环境找不到表的错误
- ✅ **状态追踪**: 通过 `isDatabaseInitialized` 状态让页面知道何时可以安全访问数据库
- ✅ **错误处理**: 数据库初始化失败时，`databaseError` 包含详细错误信息
- ✅ **初始化顺序**: 严格保证数据库先初始化，其他服务才能正常工作

## 🎯 开发重点

### 当前开发优先级
1. **多语言覆盖**：逐步替换硬编码文本，补充 `settings`、`reading` 等命名空间资源
2. **系统说明模块**：应用信息、充值管理、使用声明、隐私政策
3. **占卜流程完善**：AI占卜功能集成和优化（含多语言 prompt）
4. **历史记录功能**：完整的历史管理和同步机制
5. **支付集成**：Stripe支付流程集成
6. **性能优化**：图片加载、动画性能、内存管理

### 关键技术要点
- **类型安全**：完整的TypeScript类型定义系统
- **组件化开发**：可复用组件库架构
- **状态管理**：Context + Hooks模式
- **导航架构**：Expo Router文件系统路由

## 📚 详细开发文档

### 功能特定文档
- **数据库架构**: `lib/database/CLAUDE.md`
- **AI占卜功能**: `lib/ai/CLAUDE.md`
- **卡牌说明功能**: `components/cards/CLAUDE.md`
- **系统说明功能**: `components/settings/CLAUDE.md`

### 组件特定文档
- **首页组件**: `components/home/CLAUDE.md`
- **占卜组件**: `components/reading/CLAUDE.md`
- **系统说明组件**: `components/settings/CLAUDE.md`
- **通用组件**: `components/common/CLAUDE.md`

## 🛠️ 开发指导

### 对 Claude 的指导
1. **组件化优先**：严格按照组件库架构开发
2. **类型安全**：确保TypeScript类型定义完整
3. **本地化优先**：新增/修改 UI 文案必须走 `useTranslation`，缺失词条需要更新 JSON
4. **API集成**：优先实现与后端API的集成（传递 `Accept-Language` 或 `locale` 字段）
5. **性能考虑**：注意图片加载、动画性能优化
6. **用户体验**：保持流畅的交互体验

---

*此文档专门针对 my-tarot-app 前端开发，详细的功能实现和组件设计请参考对应的专门文档。*
## 🌐 多语言本地化

- **基础设施**：`lib/i18n/` 封装 `i18next + react-i18next + expo-localization`，资源位于 `assets/i18n/<locale>/<namespace>.json`。
- **命名空间**：当前启用 `common`、`home`、`settings`，可在 `lib/i18n/resources.ts` 中集中注册。
- **使用方式**：在组件中通过 `useTranslation('<namespace>')` 获取 `t` 函数；若需全局访问，使用 `useAppContext` 获取 `locale`。
- **设置入口**：`components/settings/LanguageSection` 提供语言选项，调用 `AppContext.actions.setLocale`，同步更新 AsyncStorage 与 `user_settings` 表。
- **历史记录**：`user_history` 新增 `locale` 字段，`ReadingResult.metadata.locale` 会随记录一起持久化，便于多语言渲染/筛选。
- **占卜流程**：`ReadingContext` 在保存历史时传入当前语言，确保 AI/离线解读与 UI 文案一致。
- **首页示例**：`HeroSection`、`NavigationGrid`、`DeclarationCard` 已改用文案 key，README 中可参考写法推广到其它模块。
