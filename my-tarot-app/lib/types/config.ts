/**
 * 配置数据类型定义
 * Configuration data type definitions
 *
 * 包含所有只读配置数据的类型定义，对应配置数据库中的表结构
 */

// ============= 核心配置数据类型 =============

// 1. Card - 卡牌基础信息
export interface Card {
  id: number;
  name: string;
  arcana: 'Major' | 'Minor';
  suit?: string;
  number: number;
  image_url: string;
  style_id?: number;
  deck: string;
  localizedName?: string;
  localizedSuit?: string;
  localizedDeck?: string;
}

// 2. CardStyle - 牌面风格
export interface CardStyle {
  id: number;
  name: string;
  image_base_url: string;
}

// 3. Dimension - 解读维度定义
export interface Dimension {
  id: number;
  name: string;
  category: string;
  description: string;
  aspect?: string;
  aspect_type?: string;
}

// 4. CardInterpretation - 牌意主表
export interface CardInterpretation {
  id: number;
  card_id: number;
  direction: '正位' | '逆位';
  summary: string;
  detail?: string;
}

// 5. CardInterpretationDimension - 牌意维度关联
export interface CardInterpretationDimension {
  id: number;
  interpretation_id: number;
  dimension_id: number;
  aspect?: string;
  aspect_type?: string;
  content: string;
}

// 6. Spread - 牌阵定义
export interface Spread {
  id: number;
  name: string;
  description: string;
  card_count: number;
}

// ============= 扩展配置类型 =============

// 完整的卡牌信息（包含解读）
export interface CardWithInterpretation extends Card {
  interpretations: {
    upright: CardInterpretation & {
      dimensions: (CardInterpretationDimension & { dimension: Dimension })[];
    };
    reversed: CardInterpretation & {
      dimensions: (CardInterpretationDimension & { dimension: Dimension })[];
    };
  };
}

// 维度分组信息
export interface DimensionGroup {
  category: string;
  dimensions: Dimension[];
}

// 卡牌统计信息
export interface CardStats {
  totalCards: number;
  majorArcana: number;
  minorArcana: number;
  deckCounts: Record<string, number>;
}

// ============= 配置数据查询类型 =============

// 基础查询选项
export interface ConfigQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// 卡牌查询条件
export interface CardQuery extends ConfigQueryOptions {
  arcana?: 'Major' | 'Minor';
  suit?: string;
  deck?: string;
  name?: string;
  style_id?: number;
}

// 维度查询条件
export interface DimensionQuery extends ConfigQueryOptions {
  category?: string;
  aspect_type?: string;
}

// 牌阵查询条件
export interface SpreadQuery extends ConfigQueryOptions {
  card_count?: number;
  name?: string;
}

// 解读查询条件
export interface InterpretationQuery extends ConfigQueryOptions {
  card_id?: number;
  direction?: '正位' | '逆位';
  dimension_id?: number;
}

// ============= 配置数据服务接口 =============

// 卡牌服务接口
export interface ICardService {
  getAllCards(query?: CardQuery): Promise<Card[]>;
  getCardById(id: number): Promise<Card | null>;
  getMajorArcana(): Promise<Card[]>;
  getMinorArcana(suit?: string): Promise<Card[]>;
  getCardWithInterpretations(cardId: number): Promise<CardWithInterpretation | null>;
  drawRandomCards(count: number, excludeIds?: number[]): Promise<Card[]>;
  searchCards(keyword: string): Promise<Card[]>;
}

// 牌阵服务接口
export interface ISpreadService {
  getAllSpreads(query?: SpreadQuery): Promise<Spread[]>;
  getSpreadById(id: number): Promise<Spread | null>;
  getSpreadsByCardCount(cardCount: number): Promise<Spread[]>;
  getThreeCardSpread(): Promise<Spread | null>;
}

// 维度服务接口
export interface IDimensionService {
  getAllDimensions(query?: DimensionQuery): Promise<Dimension[]>;
  getDimensionsByCategory(category: string): Promise<Dimension[]>;
  getDimensionGroups(): Promise<DimensionGroup[]>;
}

// 解读服务接口
export interface IInterpretationService {
  getCardInterpretations(cardId: number): Promise<CardInterpretation[]>;
  getCardDimensionInterpretations(cardId: number, direction: string): Promise<CardInterpretationDimension[]>;
  getAllCardsForDimension(dimensionId: number, direction: string): Promise<any[]>;
}

// ============= 配置数据常量 =============

// 卡牌方向
export const CARD_DIRECTIONS = {
  UPRIGHT: '正位',
  REVERSED: '逆位'
} as const;

// 大小阿卡纳类型
export const ARCANA_TYPES = {
  MAJOR: 'Major',
  MINOR: 'Minor'
} as const;

// 小阿卡纳花色
export const MINOR_SUITS = {
  WANDS: '权杖',
  CUPS: '圣杯',
  SWORDS: '宝剑',
  PENTACLES: '金币'
} as const;

// 常见维度类别
export const DIMENSION_CATEGORIES = {
  EMOTION: '情感',
  CAREER: '事业',
  SPIRITUAL: '精神',
  DECISION: '决策',
  HEALTH: '健康',
  RELATIONSHIP: '人际关系'
} as const;
