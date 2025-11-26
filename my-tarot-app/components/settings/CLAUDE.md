# 系统说明组件开发指南 (components/settings/CLAUDE.md)

## 📱 组件概述

**components/settings** 是系统说明页面的组件库，提供应用信息、积分管理、使用声明、隐私政策等功能模块。

### 技术栈
- **框架**: React Native + TypeScript
- **样式**: StyleSheet + 统一主题系统
- **导航**: 可折叠组件 + 滚动布局
- **动画**: React Native Reanimated + LayoutAnimation
- **API集成**: UserService + JWT认证

## 📁 组件结构

```
components/settings/
├── AppInfoSection.tsx       # 应用基本信息组件
├── RechargeSection.tsx      # 积分管理组件 (✅ 已重新设计)
├── DisclaimerSection.tsx    # 使用声明组件 (✅ 可折叠)
├── PrivacySection.tsx       # 隐私政策组件 (✅ 可折叠)
├── SupportSection.tsx       # 帮助支持组件 (✅ 可折叠)
├── index.ts                 # 组件统一导出
└── CLAUDE.md               # 本文档
```

## 🏗️ 核心组件设计

### 1. AppInfoSection - 应用基本信息 (✅ 可折叠)

#### 设计规范
- **布局**: 使用CollapsibleSection包装，默认折叠
- **内容结构**:
  - 应用Logo和名称
  - 版本信息
  - 愿景声明
  - 使命描述
- **展开状态**: 默认折叠，与其他组件保持一致

#### 实现要点
```typescript
interface AppInfoSectionProps {
  version?: string;
  buildNumber?: string;
}

export const AppInfoSection: React.FC<AppInfoSectionProps> = ({
  version = "1.0.0",
  buildNumber = "1"
}) => {
  return (
    <CollapsibleSection
      title="应用信息"
      icon="📱"
      defaultExpanded={false}  // 默认折叠
    >
      {/* Logo区域 */}
      <View style={styles.logoContainer}>
        <Text style={styles.appLogo}>🔮</Text>
        <Text style={styles.appName}>神秘塔罗牌</Text>
        <Text style={styles.versionText}>v{version} ({buildNumber})</Text>
      </View>
      {/* 愿景使命 */}
    </CollapsibleSection>
  );
};
```

兑换码充值按钮通过 `apiConfig.baseUrl`（来源 `lib/config/api`）解析协议 + 主机名（去除端口），再拼接 `/verify-email` 链接，从而复用 `app.json` 中配置的主机地址。

### 2. RechargeSection - 积分管理组件 (✅ 已重新设计)

#### 设计规范
- **功能**: 用户信息展示、积分管理、兑换码充值、交易记录
- **布局**: 默认展开，用户信息突出显示
- **API集成**: 实时获取用户余额和交易记录

#### 核心更新
```typescript
interface RechargeSectionProps {
  currentCredits?: number;
  userEmail?: string;        // 新增：用户邮箱显示
  rechargeHistory?: UserTransaction[];  // 更新：使用后端数据类型
}

const resolveRedeemOrigin = (): string => {
  try {
    const parsed = new URL(apiConfig.baseUrl);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    const trimmed = apiConfig.baseUrl.trim();
    const match = trimmed.match(/^(https?:\/\/[^/:]+)(?::\d+)?/i);
    return match ? match[1] : trimmed;
  }
};

export const RechargeSection: React.FC<RechargeSectionProps> = ({
  currentCredits = 0,
  userEmail,
  rechargeHistory = []
}) => {
  const handleRedeemCode = async () => {
    const redeemUrl = new URL(
      '/verify-email?installation_id=23049RAD8C',
      resolveRedeemOrigin()
    ).toString();

    const canOpen = await Linking.canOpenURL(redeemUrl);
    if (!canOpen) {
      console.warn('Redeem URL cannot be opened:', redeemUrl);
      return;
    }

    await Linking.openURL(redeemUrl);
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>积分管理</Text>

      {/* 用户信息区域 */}
      <View style={styles.userInfoCard}>
        {userEmail && (
          <View style={styles.emailContainer}>
            <Ionicons name="mail" size={16} color="#d4af37" />
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>
        )}
        {/* 积分余额 */}
      </View>

      {/* 兑换码充值按钮 */}
      <TouchableOpacity style={styles.redeemButton} onPress={handleRedeemCode}>
        {/* 按钮内容 */}
      </TouchableOpacity>

      {/* 交易记录 */}
    </View>
  );
};
```

#### 关键变更
1. **隐藏充值套餐**: 移除了充值套餐展示，简化界面
2. **用户邮箱显示**: 如果用户有邮箱则显示，无邮箱则隐藏
3. **兑换码充值**: 新增兑换码充值按钮，动态拼接去除端口后的 `API_BASE_URL` 的 `/verify-email` 地址
4. **交易记录优化**: 使用后端API返回的UserTransaction类型
5. **日期格式化**: 改进日期显示格式，更加友好

### 3. DisclaimerSection - 使用声明组件 (✅ 可折叠)

#### 设计规范
- **内容**: 4项核心声明，每项带图标
- **布局**: 使用CollapsibleSection包装，默认折叠
- **视觉**: 保持警告色调，突出重要性

#### 实现要点
```typescript
export const DisclaimerSection: React.FC = () => {
  const disclaimers: DisclaimerItem[] = [
    // 应用目的、免责声明、使用建议、年龄限制
  ];

  return (
    <CollapsibleSection
      title="使用声明"
      icon="⚠️"
      defaultExpanded={false}  // 默认折叠
    >
      <View style={styles.disclaimerList}>
        {disclaimers.map((item, index) => (
          <DisclaimerCard key={index} item={item} />
        ))}
      </View>
      {/* 重要提醒 */}
    </CollapsibleSection>
  );
};
```

### 4. PrivacySection - 隐私政策组件 (✅ 可折叠)

#### 设计规范
- **内容**: 数据收集、使用方式、保护承诺
- **布局**: 使用CollapsibleSection包装，默认折叠
- **重点**: 突出数据安全和用户权利

#### 实现要点
```typescript
export const PrivacySection: React.FC = () => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  return (
    <CollapsibleSection
      title="隐私政策"
      icon="🔒"
      defaultExpanded={false}  // 默认折叠
    >
      <View style={styles.privacyList}>
        {privacyItems.map((item) => (
          <PrivacyCard
            key={item.id}
            item={item}
            expanded={expandedItem === item.id}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </View>
      {/* 联系方式 */}
    </CollapsibleSection>
  );
};
```

### 5. SupportSection - 帮助支持组件 (✅ 可折叠)

#### 设计规范
- **功能**: 联系方式、反馈渠道、版本检查
- **布局**: 使用CollapsibleSection包装，默认折叠
- **交互**: 邮件、链接跳转等外部调用

#### 实现要点
```typescript
export const SupportSection: React.FC = () => {
  const handleContact = (type: string) => {
    switch (type) {
      case 'email':
        Linking.openURL('mailto:support@tarotapp.com');
        break;
      case 'feedback':
        // 反馈功能
        break;
      case 'update':
        // 检查更新
        break;
    }
  };

  return (
    <CollapsibleSection
      title="帮助与支持"
      icon="🆘"
      defaultExpanded={false}  // 默认折叠
    >
      {/* 联系我们 */}
      {/* 应用信息 */}
      {/* 版本信息 */}
    </CollapsibleSection>
  );
};
```

## 🔗 CollapsibleSection 通用折叠组件

### 设计规范
- **文件位置**: `components/common/CollapsibleSection.tsx`
- **功能**: 提供统一的折叠/展开交互
- **动画**: 使用LayoutAnimation实现流畅过渡
- **样式**: 统一的主题风格，适配塔罗牌应用

### 使用方式
```typescript
import { CollapsibleSection } from '../common/CollapsibleSection';

<CollapsibleSection
  title="模块标题"
  icon="🔮"
  defaultExpanded={false}
  onToggle={(expanded) => console.log('展开状态:', expanded)}
>
  <YourContent />
</CollapsibleSection>
```

### 核心特性
- **自动动画**: 展开/收起时自动应用LayoutAnimation
- **统一样式**: 与应用主题保持一致的视觉风格
- **灵活配置**: 支持自定义图标、默认状态、回调函数
- **跨平台**: Android和iOS都有良好的动画效果

## 📡 API集成架构

### UserService集成
新增了完整的用户信息API集成：

```typescript
// lib/services/UserService.ts
class UserService {
  async getUserBalance(): Promise<BalanceResponse | null>
  async getUserTransactions(): Promise<TransactionHistoryResponse | null>
  async getUserStats(): Promise<UserStatsResponse | null>
  async getUserInfo(): Promise<CompleteUserInfo>
}
```

### 系统说明页面API集成
```typescript
// app/settings/index.tsx
export default function SettingsScreen() {
  const [userBalance, setUserBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);

  useEffect(() => {
    loadUserData(); // 页面加载时自动获取用户数据
  }, []);

  const loadUserData = async () => {
    const userService = UserService.getInstance();
    const userInfo = await userService.getUserInfo();
    // 更新状态...
  };
}
```

### 错误处理和加载状态
- **加载状态**: 显示"正在加载用户信息..."
- **错误处理**: 显示错误信息和重试按钮
- **自动重试**: 支持手动重试数据加载
- **降级显示**: API失败时显示默认值，不影响基本功能

## 🎨 统一样式系统

### 颜色主题 (保持不变)
```typescript
export const SettingsColors = {
  background: '#0a0a1a',
  cardBackground: 'rgba(20, 20, 40, 0.95)',
  primary: '#d4af37',
  secondary: '#b8860b',
  titleText: '#d4af37',
  bodyText: '#e6e6fa',
  mutedText: '#8b8878',
  // ...
};
```

### 新增样式规范
```typescript
// 兑换码充值按钮样式
redeemButton: {
  backgroundColor: 'rgba(212, 175, 55, 0.05)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(212, 175, 55, 0.2)',
  marginBottom: 20,
},

// 用户信息卡片样式
userInfoCard: {
  paddingVertical: 20,
  marginBottom: 20,
  backgroundColor: 'rgba(212, 175, 55, 0.05)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(212, 175, 55, 0.1)',
},
```

## 🎭 交互动画和用户体验

### 折叠动画
- **组件**: 使用LayoutAnimation.configureNext()
- **时长**: 300ms缓入缓出动画
- **效果**: 高度变化 + 透明度过渡

### 按钮交互
- **反馈**: activeOpacity={0.7} 统一触摸反馈
- **样式**: 统一的按钮风格和hover效果
- **图标**: 一致的图标使用和对齐

### 加载状态
- **指示器**: 简洁的文字提示
- **错误处理**: 友好的错误信息和重试按钮
- **性能**: 避免不必要的重新渲染

## 🛒 Android IAP 实施说明（前端）

本节聚焦 RechargeSection 的 Google Play 内购集成（Android 首版）。

### 功能入口与布局
- 入口：设置 → 积分管理（RechargeSection）
- 结构：余额卡片 → IAP 商品网格（最多 6 个）→ 兑换码充值入口（兜底）
- 平台：仅 Android 显示 IAP 区块；iOS 暂隐藏，仅保留兑换码入口

### 依赖与构建
- 依赖：`react-native-iap`（动态导入，避免未安装时报错）
- 构建：需原生运行（EAS 或 `npx expo prebuild && expo run:android`）；Expo Go 不支持 IAP

### 商品与后端映射
- 商品 ID（需与后端一致）：`com.mysixth.tarot.credits_5|10|20|50|100`
- 校验接口：`POST /api/v1/payments/google/verify`，请求体包含：
  - `installation_id`、`product_id`、`purchase_token`
- 返回：`{ success, credits_awarded, new_balance }`，后端按 `purchase_token` 幂等

### 组件状态与 Props
- 新增状态：`isIapReady`、`loadingProducts`、`products`、`purchasingProductId`、`verifying`、`iapError`、`iapSuccess`
- 新增 Prop：`onRefresh?: () => void`（购买校验成功后，触发父组件刷新余额/交易）

### 集成流程（简化代码示例）
```ts
// 1) 初始化与加载商品（Android）
useEffect(() => {
  let mounted = true;
  (async () => {
    if (Platform.OS !== 'android') return;
    const RNIap = await import('react-native-iap').catch(() => null as any);
    if (!RNIap) return;
    const ok = await RNIap.initConnection();
    if (!ok) return;
    purchaseUpdateSub.current = RNIap.purchaseUpdatedListener(async (purchase: any) => {
      const token = purchase?.purchaseToken || purchase?.transactionReceipt;
      const productId = purchase?.productId || purchasingProductId;
      if (!token || !productId) return;
      setVerifying(true);
      const installation_id = Application.androidId || Device.modelName || 'unknown';
      const res = await UserService.getInstance().verifyGooglePurchase({ installation_id, product_id: productId, purchase_token: token });
      if (res?.success) {
        setIapSuccess(t('recharge.iap.success', { credits: res.credits_awarded }));
        onRefresh?.();
      } else {
        setIapError(t('recharge.iap.error.verify'));
      }
      await RNIap.finishTransaction(purchase, true);
      setVerifying(false);
      setPurchasingProductId(null);
    });
    purchaseErrorSub.current = RNIap.purchaseErrorListener((err: any) => {
      setPurchasingProductId(null);
      setIapError(err?.code === 'E_USER_CANCELLED'
        ? t('recharge.iap.error.cancelled')
        : t('recharge.iap.error.failed', { message: err?.message || 'unknown' }));
    });
    const list = await RNIap.getProducts(productIds);
    if (mounted) {
      setProducts(list.map((p: any) => ({ productId: p.productId || p.sku, title: p.title?.split(' (')[0] || p.productId, price: p.localizedPrice || p.price })));
      setIsIapReady(list?.length > 0);
      setLoadingProducts(false);
    }
  })();
  return () => {
    purchaseUpdateSub.current?.remove?.();
    purchaseErrorSub.current?.remove?.();
    iapRef.current?.endConnection?.();
    mounted = false;
  };
}, []);

// 2) 购买触发
const handlePurchase = async (productId: string) => {
  setIapError(null); setIapSuccess(null); setPurchasingProductId(productId);
  await iapRef.current.requestPurchase({ sku: productId });
};
```

### 文案与 i18n
- 命名空间：`settings.recharge.iap`
- 关键键值：`title`、`loading`、`retry`、`unavailable`、`popular`、`bestValue`、`buy`、`success`、`verifying`、`error.cancelled`、`error.failed`、`error.verify`

### 异常与兜底
- 商店不可用/商品为空：隐藏商品网格，显示“商店不可用 + 重试”提示，保留兑换码入口
- 购买取消：展示“购买已取消”
- 验证失败：展示“订单校验失败”，用户可重试或使用兑换码

## 📋 使用指南

### 页面集成
```typescript
// app/settings/index.tsx
import {
  AppInfoSection,
  RechargeSection,
  DisclaimerSection,
  PrivacySection,
  SupportSection
} from '@/components/settings';

export default function SettingsPage() {
  return (
    <ScrollView>
      <RechargeSection                      {/* 默认展开，集成API - 置顶显示 */}
        currentCredits={userBalance?.credits || 0}
        userEmail={userEmail}
        rechargeHistory={transactions}
      />
      <AppInfoSection />                    {/* 默认折叠 */}
      <DisclaimerSection />                 {/* 默认折叠 */}
      <PrivacySection />                    {/* 默认折叠 */}
      <SupportSection />                    {/* 默认折叠 */}
    </ScrollView>
  );
}
```

### 组件展示优先级
1. **RechargeSection**: 最高优先级，默认展开，用户最关心的积分信息
2. **AppInfoSection**: 应用基本信息，默认折叠
3. **DisclaimerSection**: 使用声明，默认折叠
4. **PrivacySection**: 隐私政策，默认折叠
5. **SupportSection**: 帮助支持，默认折叠

### API数据流
1. **页面加载**: `useEffect` 自动触发 `loadUserData()`
2. **API调用**: `UserService.getUserInfo()` 并发获取用户数据
3. **状态更新**: 更新 `userBalance`, `transactions` 等状态
4. **组件渲染**: RechargeSection 接收最新数据并渲染

## 🔄 状态管理模式

### 页面级状态
```typescript
// 用户数据状态
const [userBalance, setUserBalance] = useState<BalanceResponse | null>(null);
const [transactions, setTransactions] = useState<UserTransaction[]>([]);

// UI状态
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// 组件级状态 (折叠组件内部)
const [expandedItem, setExpandedItem] = useState<string | null>(null);
```

### 数据传递模式
- **父→子**: Props传递API数据到RechargeSection
- **组件内**: 内部state管理折叠状态
- **错误边界**: 优雅处理API错误，不影响其他组件

## 🛠️ 开发指导

### 组件开发原则
1. **模块化设计**: 每个功能区域独立组件
2. **数据驱动**: 通过props传入配置和数据
3. **交互一致**: 统一的点击反馈和动画效果
4. **可扩展性**: 支持未来功能扩展和配置调整

### 新增功能流程
1. **设计确认**: 确定是否需要折叠功能
2. **API集成**: 如需后端数据，先实现API调用
3. **组件开发**: 使用CollapsibleSection或直接开发
4. **样式统一**: 遵循现有的设计规范
5. **测试验证**: 确保各种状态下的表现正常

---

*此文档定义了系统说明页面各组件的详细设计规范和使用指南，确保实现一致、优雅的用户体验。*
