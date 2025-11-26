# 卡牌说明功能架构设计文档

## 🎴 功能概述

卡牌说明功能为用户提供完整的塔罗牌知识库，包括78张卡牌的详细解读和塔罗文化背景介绍。

### 核心特性
- **78张完整卡牌**：展示所有大阿卡纳和小阿卡纳卡牌
- **正逆位解读**：每张卡牌提供正位和逆位两种解读
- **塔罗历史介绍**：提供塔罗牌文化背景和使用指导
- **筛选功能**：支持按大小阿卡纳、花色等方式筛选
- **图片展示**：高质量卡牌图片配合文字解读

## 📊 数据架构设计

### 数据源集成
```typescript
// 复用现有配置数据
data/config_jsons/cards.json           // 78张卡牌基础信息
data/config_jsons/card_interpretations.json  // 正逆位解读内容（156条）

// 新增数据文件
assets/data/tarot_history.json         // 塔罗历史文化背景
```

### 类型定义系统
```typescript
// lib/types/cards.ts - 卡牌说明专用类型
interface TarotHistory {
  version: string;
  overview: string;        // 塔罗概述
  origins: string;         // 历史起源
  major_minor: string;     // 大小阿卡纳说明
  usage_notes: string;     // 使用指导
  references: string[];    // 参考资料
}

interface CardSummary {
  id: number;
  name: string;
  arcana: "major" | "minor";
  suit?: "wands" | "cups" | "swords" | "pentacles";
  number?: number;
  image: string;           // 图片资源路径
}

interface CardInterpretation {
  cardId: number;
  upright: {
    summary: string;       // 简要牌意
    detail: string;        // 详细解读
  };
  reversed: {
    summary: string;
    detail: string;
  };
}

interface CardDetail extends CardSummary {
  interpretations: CardInterpretation;
}
```

## 🛠️ 服务层架构

### CardInfoService 聚合服务
```typescript
// lib/services/card-info.ts
class CardInfoService {
  // 获取塔罗历史说明
  async getTarotHistory(): Promise<TarotHistory>

  // 获取所有卡牌列表（支持筛选）
  async listCards(filters?: CardFilters): Promise<CardSummary[]>

  // 获取单张卡牌详情
  async getCardDetail(cardId: number): Promise<CardDetail>

  // 搜索卡牌（按名称、关键词）
  async searchCards(query: string): Promise<CardSummary[]>
}
```

### 数据聚合策略
- **配置数据**：从ConfigDatabaseService读取卡牌基础信息
- **解读数据**：从预置JSON文件读取正逆位解读
- **历史数据**：从assets/data/tarot_history.json读取
- **图片路径**：通过CardImageUtils生成标准路径

## 📱 页面路由架构

### 路由结构
```
app/cards/                  # 卡牌说明路由组
├── _layout.tsx            # 卡牌页面布局（Stack导航）
├── index.tsx              # 卡牌列表页面
└── [id].tsx               # 卡牌详情页面（动态路由）
```

### 导航集成
- **主导航更新**：将"Explore"标签页改为"Cards"
- **图标设计**：使用扑克牌或卡牌相关图标
- **页面标题**：中英文标题适配

## 🧩 组件库架构

### 核心组件系统
```typescript
// components/cards/CardsList.tsx
interface CardsListProps {
  cards: CardSummary[];
  onCardPress: (cardId: number) => void;
  layout?: 'grid' | 'list';
}

// components/cards/CardDetail.tsx
interface CardDetailProps {
  card: CardDetail;
  side: 'upright' | 'reversed';
  onSideChange: (side: 'upright' | 'reversed') => void;
}

// components/cards/TarotHistoryPanel.tsx
interface TarotHistoryPanelProps {
  history: TarotHistory;
  expanded?: boolean;
  onToggle?: () => void;
}

// components/cards/CardFilterBar.tsx
interface CardFilterBarProps {
  filters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
}
```

### 视觉设计规范
- **色彩系统**：继承首页神秘塔罗风格
- **卡牌布局**：响应式网格，支持2-3列展示
- **动画效果**：卡牌翻转、正逆位切换动画
- **字体层级**：中文serif标题 + system正文

## 🚀 性能优化策略

### 数据加载优化
- **懒加载**：卡牌图片按需加载
- **缓存机制**：塔罗历史数据内存缓存
- **分页加载**：大列表虚拟化处理
- **预加载**：详情页图片预加载

### 搜索优化
- **索引构建**：卡牌名称和关键词索引
- **防抖处理**：搜索输入防抖
- **结果高亮**：搜索结果关键词高亮

## 🌍 国际化扩展设计

### 多语言架构准备
```typescript
// 未来扩展结构
interface TarotHistoryMultiLang {
  locales: {
    'zh-CN': TarotHistory;
    'zh-TW': TarotHistory;
    'en-US': TarotHistory;
  };
}

// 卡牌名称多语言映射
interface CardNameMapping {
  cardId: number;
  names: {
    'zh-CN': string;
    'zh-TW': string;
    'en-US': string;
  };
}
```

### 扩展路径
1. **数据文件拆分**：按语言拆分tarot_history.json
2. **名称映射表**：创建卡牌名称多语言映射
3. **解读内容国际化**：扩展card_interpretations支持多语言
4. **UI文案国际化**：组件文案多语言支持

## 🧪 集成测试策略

### 功能测试
- **数据完整性**：验证78张卡牌数据完整
- **路由导航**：测试页面间导航流畅性
- **筛选搜索**：验证筛选和搜索功能正确性
- **正逆位切换**：测试卡牌详情页切换功能

### 性能测试
- **图片加载**：测试大量卡牌图片加载性能
- **内存使用**：监控长时间使用内存占用
- **滚动性能**：测试长列表滚动流畅度