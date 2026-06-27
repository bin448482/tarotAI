/**
 * 通用数据库操作类型定义
 * Common database operation type definitions
 *
 * 包含所有通用的数据库操作相关类型，服务于双数据库架构
 */

// ============= 导出其他类型文件 =============
export * from './config';
export * from './user';

// ============= 数据库操作通用类型 =============

// 数据库初始化状态
export interface DatabaseStatus {
  isInitialized: boolean;
  version: number;
  lastSync?: string;
}

// 基础查询选项
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

// 服务层响应类型
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 数据库操作结果
export interface DatabaseOperationResult {
  success: boolean;
  affectedRows?: number;
  insertId?: number;
  error?: string;
}

// 数据库连接配置
export interface DatabaseConfig {
  name: string;
  path: string;
  readonly: boolean;
}

// 数据库连接状态
export interface DatabaseConnectionStatus {
  configDb: {
    connected: boolean;
    path: string;
    readonly: boolean;
  };
  userDb: {
    connected: boolean;
    path: string;
    readonly: boolean;
  };
}

// 批量操作语句
export interface BatchStatement {
  sql: string;
  params?: any[];
}

// 事务回调类型
export type TransactionCallback = () => void;

// ============= 数据库服务接口 =============

// 基础数据库服务接口
export interface IDatabaseService {
  initialize(): Promise<ServiceResponse<DatabaseStatus>>;
  getStatus(): Promise<DatabaseStatus>;
  query<T>(sql: string, params?: any[]): Promise<ServiceResponse<T[]>>;
  queryFirst<T>(sql: string, params?: any[]): Promise<ServiceResponse<T | null>>;
  execute(sql: string, params?: any[]): Promise<ServiceResponse<DatabaseOperationResult>>;
  executeBatch(statements: BatchStatement[]): Promise<ServiceResponse<DatabaseOperationResult>>;
  transaction(callback: TransactionCallback): Promise<ServiceResponse<void>>;
}

// 配置数据库服务接口
export interface IConfigDatabaseService extends IDatabaseService {
  // 只包含查询方法，不包含写入方法
  query<T>(sql: string, params?: any[]): Promise<ServiceResponse<T[]>>;
  queryFirst<T>(sql: string, params?: any[]): Promise<ServiceResponse<T | null>>;
}

// 用户数据库服务接口
export interface IUserDatabaseService extends IDatabaseService {
  // 包含完整的CRUD操作
  clearAllUserData(): Promise<ServiceResponse<boolean>>;
  resetUserData(): Promise<ServiceResponse<void>>;
}

// 双数据库连接管理器接口
export interface IDatabaseConnectionManager {
  initialize(): Promise<ServiceResponse<DatabaseStatus>>;
  getStatus(): Promise<DatabaseStatus>;
  getConnectionStatus(): Promise<DatabaseConnectionStatus>;

  // 配置数据库操作
  queryConfig<T>(sql: string, params?: any[]): Promise<ServiceResponse<T[]>>;
  queryConfigFirst<T>(sql: string, params?: any[]): Promise<ServiceResponse<T | null>>;

  // 用户数据库操作
  queryUser<T>(sql: string, params?: any[]): Promise<ServiceResponse<T[]>>;
  queryUserFirst<T>(sql: string, params?: any[]): Promise<ServiceResponse<T | null>>;
  executeUser(sql: string, params?: any[]): Promise<ServiceResponse<DatabaseOperationResult>>;
  userTransaction(callback: TransactionCallback): Promise<ServiceResponse<void>>;

  // 数据库管理
  resetUserData(): Promise<ServiceResponse<void>>;
  fullReset(): Promise<ServiceResponse<void>>;
}

// ============= 错误处理类型 =============

// 数据库错误类型
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR'
}

// 数据库错误信息
export interface DatabaseError {
  type: DatabaseErrorType;
  message: string;
  sql?: string;
  params?: any[];
  originalError?: Error;
}

// ============= 验证和工具类型 =============

// 分页信息
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 分页结果
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

// 排序选项
export interface SortOptions {
  field: string;
  direction: 'ASC' | 'DESC';
}

// 筛选条件
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'notIn';
  value: any;
}

// ============= 迁移和备份类型 =============

// 数据迁移结果
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  backupPath?: string;
}

// 备份选项
export interface BackupOptions {
  includeLogs?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

// 恢复选项
export interface RestoreOptions {
  overwrite?: boolean;
  validateData?: boolean;
}

// ============= 性能监控类型 =============

// 查询性能统计
export interface QueryPerformance {
  sql: string;
  executionTime: number;
  rowCount: number;
  timestamp: string;
}

// 数据库性能指标
export interface DatabaseMetrics {
  queryCount: number;
  averageQueryTime: number;
  slowQueries: QueryPerformance[];
  connectionCount: number;
  cacheHitRate?: number;
}

// ============= 常量定义 =============

// 数据库名称
export const DATABASE_NAMES = {
  CONFIG: 'tarot_config.db',
  USER: 'tarot_user_data.db'
} as const;

// 默认查询限制
export const DEFAULT_QUERY_LIMITS = {
  SELECT: 100,
  HISTORY: 50,
  SEARCH: 20
} as const;

// 数据库版本
export const DATABASE_VERSION = 1;