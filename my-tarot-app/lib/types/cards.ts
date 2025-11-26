// 卡牌说明功能相关类型定义

/**
 * 塔罗历史文化背景信息
 */
export interface TarotHistory {
  version: string;
  updated_at: string;
  description: string;
  overview: string;              // 塔罗概述
  origins: string;               // 历史起源
  major_minor: string;           // 大小阿卡纳说明
  usage_notes: string;           // 使用指导
  interpretation_guidance: string; // 解读指导
  cultural_significance: string;  // 文化意义
  references: string[];          // 参考资料
}

/**
 * 卡牌基础信息摘要
 */
export interface CardSummary {
  id: number;                    // 卡牌唯一ID
  name: string;                  // 卡牌名称
  arcana: "major" | "minor";     // 大/小阿卡纳
  suit?: "wands" | "cups" | "swords" | "pentacles"; // 花色（小阿卡纳）
  number?: number;               // 序号/点数
  image: any;                    // 图片资源（require导入的资源）
  deck?: string;                 // 所属牌组
}

/**
 * 卡牌解读内容（正逆位）
 */
export interface CardInterpretation {
  cardId: number;
  cardName: string;              // 卡牌名称（用于关联）
  upright: {
    summary: string;             // 正位简要牌意
    detail: string;              // 正位详细解读
  };
  reversed: {
    summary: string;             // 逆位简要牌意
    detail: string;              // 逆位详细解读
  };
}

/**
 * 完整卡牌详情（基础信息 + 解读内容）
 */
export interface CardDetail extends CardSummary {
  interpretations: CardInterpretation;
}

/**
 * 卡牌筛选条件
 */
export interface CardFilters {
  arcana?: "all" | "major" | "minor";  // 大小阿卡纳筛选
  suit?: "all" | "wands" | "cups" | "swords" | "pentacles"; // 花色筛选
  search?: string;                      // 搜索关键词
}

/**
 * 卡牌列表布局类型
 */
export type CardListLayout = "grid" | "list";

/**
 * 卡牌显示方向（正逆位）
 */
export type CardSide = "upright" | "reversed";

/**
 * 卡牌排序方式
 */
export interface CardSortOptions {
  field: "number" | "name" | "arcana";
  order: "asc" | "desc";
}

/**
 * 卡牌搜索结果
 */
export interface CardSearchResult {
  card: CardSummary;
  matchFields: string[];          // 匹配的字段
  score: number;                  // 匹配分数
}

/**
 * 塔罗牌套牌信息
 */
export interface TarotDeck {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  isDefault: boolean;
}

/**
 * 卡牌图片配置
 */
export interface CardImageConfig {
  basePath: string;              // 图片基础路径
  format: string;                // 图片格式 (jpg, png, webp)
  sizes: {                       // 不同尺寸配置
    thumbnail: { width: number; height: number };
    medium: { width: number; height: number };
    large: { width: number; height: number };
  };
}

/**
 * 卡牌数据加载状态
 */
export interface CardDataState {
  cards: CardSummary[];
  interpretations: CardInterpretation[];
  history: TarotHistory | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * 卡牌服务配置
 */
export interface CardServiceConfig {
  enableCache: boolean;          // 是否启用缓存
  cacheTimeout: number;          // 缓存超时时间（毫秒）
  imageConfig: CardImageConfig;  // 图片配置
  defaultFilters: CardFilters;   // 默认筛选条件
}