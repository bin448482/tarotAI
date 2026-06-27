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
- **使用声明**：免责声明、使用建议、注意事项
- **隐私政策**：数据收集、使用方式、保护承诺
- **帮助支持**：联系方式、用户反馈、版本检查
- **详细设计**: 参考 `components/settings/CLAUDE.md`

### Android 内购（Google Play）首版
- 入口位置：设置 → 积分管理。展示商品网格（最多 6 个），保留“兑换码充值”兜底。
- 购买流程：`initConnection → getProducts → requestPurchase → purchaseUpdatedListener → POST /api/v1/payments/google/verify → finishTransaction`；验证成功后刷新 `/api/v1/me/balance` 与最近交易。
- 依赖：`react-native-iap`（需原生构建：EAS 或 `npx expo prebuild && expo run:android`；Expo Go 不支持）。
- 文案键：`settings.recharge.iap.*`（标题、加载/重试、商店不可用、购买按钮、验证中、成功、失败/取消/校验失败）。
- 平台：仅 Android 显示 IAP 区块；iOS 暂隐藏，仅保留兑换码入口。

#### IAP 通道选择与身份兼容（重要）
- 通道选择：
  - 优先检测 `react-native-iap` 可用性与 Google Play 支持；可用则显示 IAP；不可用则仅显示“兑换码充值”。
  - 地区（SIM/Locale/IP）仅用于提示，不严格卡控；以 IAP 能力为准。
- 身份与绑定：
  - 始终传递 `installation_id` 作为用户主键；
  - 若用户在“设置”中填写了邮箱（或授权获得），在调用 `/payments/google/verify` 时一并传递给后端，用于写入/更新 `users.email`；
  - 若无邮箱，仍按匿名用户完成购买与入账。
- 失败兜底：IAP 初始化/购买失败 → 引导用户使用“兑换码充值”。

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

## 📡 API集成架构

### 后端API集成
项目与 FastAPI 后端服务集成，支持以下核心功能：

| 接口 | 用途 | 集成状态 |
|------|------|----------|
| `POST /auth/anon` | 匿名用户认证 | ✅ 已集成 |
| `POST /readings/analyze` | AI问题分析 | ✅ 已集成 |
| `POST /readings/generate` | AI解读生成 | ✅ 已集成 |
| `POST /payments/checkout` | 支付会话创建 | 🔄 待集成 |
| `POST /api/v1/payments/google/verify` | Google Play 验证与入账 | ✅ Android 首版已接入（客户端调用） |

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
1. **系统说明模块**：应用信息、充值管理（Android IAP 首版已上线）、使用声明、隐私政策
2. **占卜流程完善**：AI占卜功能集成和优化
3. **历史记录功能**：完整的历史管理和同步机制
4. **支付集成**：Stripe 支付流程集成；iOS IAP 待实现
5. **性能优化**：图片加载、动画性能、内存管理

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
3. **API集成**：优先实现与后端API的集成
4. **性能考虑**：注意图片加载、动画性能优化
5. **用户体验**：保持流畅的交互体验

---

*此文档专门针对 my-tarot-app 前端开发，详细的功能实现和组件设计请参考对应的专门文档。*
