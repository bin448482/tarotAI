/**
 * JSON数据结构类型定义
 * JSON data structure type definitions
 */

// 通用JSON数据结构
export interface JsonDataFile<T> {
  version: string;
  updated_at: string;
  description: string;
  data: T[];
}

// JSON中的卡牌风格数据（无ID）
export interface JsonCardStyle {
  name: string;
  image_base_url: string;
}

// JSON中的卡牌数据（style_name代替style_id）
export interface JsonCard {
  name: string;
  arcana: 'Major' | 'Minor';
  suit: string | null;
  number: number;
  image_url: string;
  style_name: string;  // 注意：JSON中使用name，不是id
  deck: string;
}

// JSON中的牌阵数据（无ID）
export interface JsonSpread {
  name: string;
  description: string;
  card_count: number;
}

// JSON中的解读维度数据（无ID）
export interface JsonDimension {
  name: string;
  category: string;
  description: string;
  aspect?: string;
  aspect_type?: number;
}

// JSON中的卡牌解读数据（card_name代替card_id）
export interface JsonCardInterpretation {
  card_name: string;      // 注意：JSON中使用卡牌名称，不是id
  direction: '正位' | '逆位';
  summary: string;
  detail?: string;
}

// JSON中的卡牌解读维度关联数据（使用名称代替ID）
export interface JsonCardInterpretationDimension {
  card_name: string;          // 关联的卡牌名称
  direction: '正位' | '逆位';   // 正位/逆位
  dimension_name: string;     // 关联的维度名称
  aspect?: string;            // 具体维度子项
  aspect_type?: string;       // 子项的类型或分类
  content: string;            // 该维度下的解读文字
}

// 完整的JSON数据文件类型
export type CardStylesJson = JsonDataFile<JsonCardStyle>;
export type CardsJson = JsonDataFile<JsonCard>;
export type SpreadsJson = JsonDataFile<JsonSpread>;
export type DimensionsJson = JsonDataFile<JsonDimension>;
export type CardInterpretationsJson = JsonDataFile<JsonCardInterpretation>;
export type CardInterpretationDimensionsJson = JsonDataFile<JsonCardInterpretationDimension>;

// 数据导入结果
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

// 数据导入状态
export interface ImportStatus {
  table: string;
  status: 'pending' | 'importing' | 'completed' | 'error';
  result?: ImportResult;
  error?: string;
}

// 完整导入会话状态
export interface ImportSession {
  sessionId: string;
  startTime: string;
  tables: ImportStatus[];
  totalProgress: number;
  isCompleted: boolean;
}