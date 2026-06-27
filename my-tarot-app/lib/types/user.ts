/**
 * 用户数据类型定义
 * User data type definitions
 *
 * 包含所有用户相关数据的类型定义，对应用户数据库中的表结构和占卜业务逻辑
 */

import type { Card, Spread, Dimension } from './config';
import type { AppLocale } from '../i18n';

// ============= 用户数据核心类型 =============

// UserHistory - 用户历史记录（对应数据库表）
export interface UserHistory {
  id: string; // UUID 作为主键，确保唯一性
  user_id: string;
  timestamp: string; // ISO 时间字符串
  spread_id: number;
  card_ids: string; // JSON string in database
  interpretation_mode: 'default' | 'ai';
  locale: AppLocale;
  result: string; // JSON string in database
  created_at?: string;
  updated_at?: string;
}

// 解析后的用户历史记录
export interface ParsedUserHistory extends Omit<UserHistory, 'card_ids' | 'result'> {
  card_ids: number[];
  result: ReadingResult;
}

// ============= 占卜流程相关类型 =============

// 选中的卡牌（占卜过程中）
export interface SelectedCard {
  cardId: number;
  position: 'past' | 'present' | 'future' | number; // 支持数字位置或预设位置
  direction: 'upright' | 'reversed';
  revealed: boolean;
  placementIndex?: number;
  positionLabel?: string;
}

// 抽牌结果
export interface CardDraw {
  card: Card;
  position: number; // 在牌阵中的位置
  isReversed: boolean;
}

// 维度解读数据
export interface DimensionInterpretation {
  dimensionId: number;
  dimensionName: string;
  dimensionCategory: string;
  aspect?: string;
  aspectType?: string;
  content: string;
}

// 单张卡牌的解读数据
export interface CardInterpretationData {
  cardId: number;
  cardName?: string; // 添加牌名字段
  position: number;
  direction: 'upright' | 'reversed';
  summary: string;
  detail?: string;
  dimensionInterpretations?: DimensionInterpretation[];
  placementIndex?: number;
  positionLabel?: string;
}

// 完整的解读结果
export interface ReadingResult {
  id?: number;
  spread: Spread;
  cards: CardDraw[];
  interpretation: {
    overall?: string; // 整体解读
    cards: CardInterpretationData[]; // 各卡牌解读
    // AI占卜专用字段
    dimension_summaries?: Record<string, string>; // 各维度解读总结
    insights?: string[]; // 关键洞察
    user_description?: string; // 用户原始问题描述
  };
  metadata: {
    created_at: string;
    interpretation_mode: 'default' | 'ai';
    user_id: string;
    theme?: string; // 占卜主题 (dimension.description)
    locale?: AppLocale;
    // AI占卜专用元数据
    ai_dimensions?: any[]; // AI推荐的维度
    generated_at?: string; // AI解读生成时间
  };
}

// ============= 占卜流程状态管理 =============

// 占卜流程状态
export interface ReadingFlowState {
  step: number; // 当前步骤 (1-5)
  type: 'offline' | 'ai'; // 占卜类型
  category: string; // 占卜类别
  selectedCards: SelectedCard[]; // 选择的卡牌
  interpretations: CardInterpretationData[]; // 解读结果
  readingResult?: ReadingResult; // 完整解读结果
  createdAt: Date; // 创建时间
  isLoading: boolean; // 加载状态
  error: string | null; // 错误信息
}

// 占卜流程操作
export type ReadingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_TYPE'; payload: 'offline' | 'ai' }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_SELECTED_CARDS'; payload: SelectedCard[] }
  | { type: 'SET_INTERPRETATIONS'; payload: CardInterpretationData[] }
  | { type: 'SET_READING_RESULT'; payload: ReadingResult }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_STATE'; payload: Partial<ReadingFlowState> };

// 默认占卜状态
export const defaultReadingState: ReadingFlowState = {
  step: 1,
  type: 'offline',
  category: '',
  selectedCards: [],
  interpretations: [],
  createdAt: new Date(),
  isLoading: false,
  error: null,
};

// ============= 用户数据查询类型 =============

// 基础查询选项
export interface UserQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// 历史记录查询条件
export interface HistoryQuery extends UserQueryOptions {
  user_id: string;
  interpretation_mode?: 'default' | 'ai';
  date_from?: string;
  date_to?: string;
  spread_id?: number;
}

// 历史记录筛选条件
export interface HistoryFilter {
  mode?: 'all' | 'default' | 'ai';
  dateRange?: {
    start: string;
    end: string;
  };
  spreadId?: number;
}

// 分页查询参数
export interface HistoryPaginationQuery {
  limit: number; // 默认 100
  offset: number; // 默认 0
  orderBy?: string; // 默认 'timestamp'
  orderDirection?: 'ASC' | 'DESC'; // 默认 'DESC'
}

// 历史统计查询
export interface HistoryStatsQuery {
  user_id: string;
  days?: number; // 最近N天
  date_from?: string;
  date_to?: string;
}

// ============= 用户统计数据类型 =============

// 用户历史统计
export interface UserHistoryStats {
  totalReadings: number;
  offlineReadings: number;
  aiReadings: number;
  spreadsUsed: Array<{
    spread_id: number;
    spread_name: string;
    count: number;
  }>;
  recentActivity: {
    lastReading: string | null;
    readingsThisWeek: number;
    readingsThisMonth: number;
  };
}

// 牌阵使用统计
export interface SpreadUsageStats {
  spread_id: number;
  count: number;
}

// 时间段统计
export interface PeriodStats {
  period: string; // 'day', 'week', 'month'
  count: number;
  date: string;
}

// ============= 用户数据服务接口 =============

// 用户历史服务接口
export interface IHistoryService {
  // 保存历史记录（无限制保存）
  saveUserHistory(history: Omit<UserHistory, 'created_at' | 'updated_at'>): Promise<string>; // 返回 UUID

  // 获取历史记录列表（默认最新100条）
  getUserHistory(userId: string, pagination?: HistoryPaginationQuery, filter?: HistoryFilter): Promise<ParsedUserHistory[]>;

  // 获取历史记录总数
  getUserHistoryCount(userId: string, filter?: HistoryFilter): Promise<number>;

  // 获取单条历史记录
  getUserHistoryById(id: string): Promise<ParsedUserHistory | null>;

  // 删除历史记录
  deleteUserHistory(id: string): Promise<boolean>;

  // 删除用户所有历史记录
  deleteAllUserHistory(userId: string): Promise<number>;

  // 更新历史记录
  updateUserHistory(id: string, updates: Partial<UserHistory>): Promise<boolean>;

  // 获取最近历史记录
  getRecentUserHistory(userId: string, days?: number): Promise<ParsedUserHistory[]>;

  // 按日期范围查询历史记录
  getUserHistoryByDateRange(userId: string, startDate: string, endDate: string): Promise<ParsedUserHistory[]>;

  // 获取牌阵使用统计
  getUserSpreadStats(userId: string): Promise<SpreadUsageStats[]>;

  // 获取用户历史统计
  getUserHistoryStats(userId: string): Promise<UserHistoryStats>;
}

// 占卜服务接口
export interface IReadingService {
  startNewReading(userId: string, type: 'offline' | 'ai', category: string): Promise<string>; // 返回sessionId
  drawCards(sessionId: string, spreadId: number): Promise<CardDraw[]>;
  getBasicInterpretation(sessionId: string, cards: CardDraw[]): Promise<CardInterpretationData[]>;
  getAiInterpretation(sessionId: string, cards: CardDraw[], category: string): Promise<CardInterpretationData[]>;
  saveReadingResult(sessionId: string, result: ReadingResult): Promise<string>; // 修改返回值为string (UUID)
  getReadingSession(sessionId: string): Promise<ReadingFlowState | null>;
  completeReading(sessionId: string): Promise<ReadingResult>;
}

// ============= 用户数据常量 =============

// 解读模式
export const INTERPRETATION_MODES = {
  DEFAULT: 'default',
  AI: 'ai'
} as const;

// 占卜类型
export const READING_TYPES = {
  OFFLINE: 'offline',
  AI: 'ai'
} as const;

// 占卜类别
export const READING_CATEGORIES = {
  EMOTION: '情感',
  CAREER: '事业',
  HEALTH: '健康',
  SPIRITUAL: '精神成长',
  DECISION: '决策指导',
  RELATIONSHIP: '人际关系'
} as const;

// 卡牌位置（三张牌牌阵）
export const THREE_CARD_POSITIONS = {
  PAST: 'past',
  PRESENT: 'present',
  FUTURE: 'future'
} as const;

// 卡牌方向
export const CARD_DIRECTIONS = {
  UPRIGHT: 'upright',
  REVERSED: 'reversed'
} as const;

// 占卜流程步骤
export const READING_STEPS = {
  TYPE_SELECTION: 1,
  CATEGORY_SELECTION: 2,
  CARD_DRAWING: 3,
  BASIC_INTERPRETATION: 4,
  DEEP_INTERPRETATION: 5
} as const;
