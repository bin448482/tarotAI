/**
 * 双数据库连接管理器
 * Dual database connection manager for config and user data separation
 */

import * as SQLite from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';
import { Asset } from 'expo-asset';
import type {
  ServiceResponse,
  DatabaseStatus,
  DatabaseOperationResult
} from '../types/database';

// 数据库配置常量
const CONFIG_DATABASE_NAME = 'tarot_config.db';
const USER_DATABASE_NAME = 'tarot_user_data.db';

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private configDb!: SQLite.SQLiteDatabase;
  private userDb!: SQLite.SQLiteDatabase;
  private isConfigInitialized: boolean = false;
  private isUserInitialized: boolean = false;

  private constructor() {
    // 数据库将在 initialize() 中开启
  }

  private getSQLiteDirectory(): Directory {
    return new Directory(Paths.document, 'SQLite');
  }

  private ensureSQLiteDirectoryExists(): Directory {
    const directory = this.getSQLiteDirectory();
    const info = directory.info();
    if (!info.exists) {
      directory.create({ intermediates: true, idempotent: true });
    }
    return directory;
  }

  private getDatabaseFile(name: string): File {
    return new File(this.getSQLiteDirectory(), name);
  }

  private getConfigDatabaseFile(): File {
    return this.getDatabaseFile(CONFIG_DATABASE_NAME);
  }

  private getUserDatabaseFile(): File {
    return this.getDatabaseFile(USER_DATABASE_NAME);
  }

  /**
   * 获取连接管理器单例
   */
  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  /**
   * 初始化双数据库连接
   * 幂等性:如果已经初始化,直接返回成功
   */
  async initialize(): Promise<ServiceResponse<DatabaseStatus>> {
    // 如果已经初始化,直接返回成功
    if (this.isConfigInitialized && this.isUserInitialized) {
      console.log('[ConnectionManager] Database already initialized, skipping initialization');
      return {
        success: true,
        data: {
          isInitialized: true,
          version: 1,
          lastSync: new Date().toISOString()
        }
      };
    }

    try {
      console.log('[ConnectionManager] Starting dual database initialization...');

      // 1. 初始化配置数据库（只读）
      await this.initializeConfigDatabase();

      // 2. 初始化用户数据库（读写）
      await this.initializeUserDatabase();

      console.log('[ConnectionManager] ✅ Dual database initialization completed');

      return {
        success: true,
        data: {
          isInitialized: true,
          version: 1,
          lastSync: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[ConnectionManager] ❌ Dual database initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 初始化配置数据库（只读）
   */
  private async initializeConfigDatabase(): Promise<void> {
    try {
      // console.log('[ConnectionManager] Initializing config database...');

      // 确保预置数据库已复制到可写目录
      await this.ensureConfigDatabaseCopied();

      // 打开配置数据库连接
      const configDbFile = this.getConfigDatabaseFile();
      const configDbPath = configDbFile.uri;
      console.log('[ConnectionManager] Opening config database at:', configDbPath);

      this.configDb = SQLite.openDatabaseSync(configDbPath);
      console.log('[ConnectionManager] Config DB opened, instance exists:', !!this.configDb);

      // 验证配置数据库完整性
      await this.verifyConfigDatabase();

      this.isConfigInitialized = true;
      console.log('[ConnectionManager] ✅ Config DB initialized, flag:', this.isConfigInitialized);
    } catch (error) {
      console.error('[ConnectionManager] ❌ Config DB init failed:', error);
      this.isConfigInitialized = false;
      throw error;
    }
  }

  /**
   * 初始化用户数据库（读写）
   */
  private async initializeUserDatabase(): Promise<void> {
    try {
      // console.log('[ConnectionManager] Initializing user database...');

      // 创建用户数据库文件引用
      const userDbFile = this.getUserDatabaseFile();
      const userDbPath = userDbFile.uri;

      // 确保SQLite目录存在
      this.ensureSQLiteDirectoryExists();

      // 打开用户数据库连接
      this.userDb = SQLite.openDatabaseSync(userDbPath);

      // 创建用户数据表结构
      await this.createUserTables();

      this.isUserInitialized = true;
      // console.log('[ConnectionManager] User database initialized successfully');
    } catch (error) {
      console.error('[ConnectionManager] ❌ User database initialization failed:', error);
      throw error;
    }
  }


  /**
   * 确保配置数据库已复制到可写目录
   * 每次启动都会重新复制以确保配置数据最新
   */
  private async ensureConfigDatabaseCopied(): Promise<void> {
    const configDbFile = this.getConfigDatabaseFile();

    try {
      console.log('[ConnectionManager] Starting to copy bundled config database...');

      // 确保SQLite目录存在
      this.ensureSQLiteDirectoryExists();
      console.log('[ConnectionManager] SQLite directory ensured:', this.getSQLiteDirectory().uri);

      try {
        // 加载预置配置数据库资源
        console.log('[ConnectionManager] Loading asset from bundle...');
        const asset = Asset.fromModule(require('../../assets/db/tarot_config.db'));
        await asset.downloadAsync();

        if (!asset.localUri) {
          throw new Error('Failed to download config database asset - localUri is null');
        }

        console.log('[ConnectionManager] Asset downloaded to:', asset.localUri);

        // 删除现有文件
        const existingFileInfo = configDbFile.info();
        if (existingFileInfo.exists) {
          console.log('[ConnectionManager] Deleting existing config database...');
          configDbFile.delete();
        }

        // 复制文件
        console.log('[ConnectionManager] Copying asset to:', configDbFile.uri);
        const assetFile = new File(asset.localUri);
        assetFile.copy(configDbFile);

        // 验证复制成功
        const copiedFileInfo = configDbFile.info();
        if (!copiedFileInfo.exists) {
          throw new Error('Config database file does not exist after copy operation');
        }

        console.log('[ConnectionManager] ✅ Config database copied successfully, size:', copiedFileInfo.size, 'bytes');
      } catch (assetError) {
        console.error('[ConnectionManager] ❌ Asset loading failed:', assetError);
        if (assetError instanceof Error) {
          console.error('[ConnectionManager] Error details:', {
            message: assetError.message,
            name: assetError.name,
            stack: assetError.stack
          });
        }
        throw new Error(`Failed to load config database asset: ${assetError instanceof Error ? assetError.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[ConnectionManager] ❌ Failed to copy config database:', error);
      throw new Error(`Failed to copy config database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * 验证配置数据库完整性
   */
  private async verifyConfigDatabase(): Promise<void> {
    try {
      console.log('[ConnectionManager] Verifying config database integrity...');

      // 首先检查数据库连接是否正常
      if (!this.configDb) {
        throw new Error('Config database connection is null');
      }

      // 列出数据库中所有的表
      const allTables = this.configDb.getAllSync<{name: string}>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      console.log('[ConnectionManager] Tables in config database:', allTables.map(t => t.name).join(', '));

      // 检查必要的表是否存在
      const requiredTables = ['card', 'card_style', 'dimension', 'card_interpretation', 'spread'];

      for (const table of requiredTables) {
        const result = this.configDb.getFirstSync<{count: number}>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
          [table]
        );

        const tableCount = result?.count || 0;
        console.log(`[ConnectionManager] Table '${table}' check: ${tableCount} found`);

        if (tableCount === 0) {
          throw new Error(`Required table '${table}' not found in config database. Available tables: ${allTables.map(t => t.name).join(', ')}`);
        }
      }

      console.log('[ConnectionManager] ✅ Config database integrity verified - all required tables present');
    } catch (error) {
      console.error('[ConnectionManager] ❌ Config database verification failed:', error);

      // 提供更详细的错误信息
      if (error instanceof Error) {
        console.error('[ConnectionManager] Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }

      throw error;
    }
  }

  /**
   * 创建用户数据表结构
   */
  private async createUserTables(): Promise<void> {
    try {
      console.log('[ConnectionManager] Creating/migrating user tables...');

      // 检查 user_history 表是否存在
      const historyTableExists = this.userDb.getFirstSync<{count: number}>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='user_history'"
      );

      if ((historyTableExists?.count || 0) > 0) {
        console.log('[ConnectionManager] user_history table exists, checking schema...');

        // 检查 locale 字段是否存在
        const columns = this.userDb.getAllSync<{name: string}>(
          "PRAGMA table_info(user_history)"
        );
        const hasLocaleColumn = columns.some(col => col.name === 'locale');

        console.log('[ConnectionManager] Existing columns:', columns.map(c => c.name).join(', '));

        if (!hasLocaleColumn) {
          console.log('[ConnectionManager] locale column missing, adding it...');
          // 添加 locale 字段到现有表
          this.userDb.execSync(`
            ALTER TABLE user_history ADD COLUMN locale TEXT NOT NULL DEFAULT 'zh-CN';
          `);
          console.log('[ConnectionManager] ✅ locale column added successfully');
        } else {
          console.log('[ConnectionManager] ✅ locale column already exists');
        }
      } else {
        console.log('[ConnectionManager] Creating new user_history table...');
        // 创建新表
        const userHistorySQL = `
          CREATE TABLE user_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            spread_id INTEGER NOT NULL,
            card_ids TEXT NOT NULL,
            interpretation_mode TEXT NOT NULL CHECK (interpretation_mode IN ('default', 'ai')),
            locale TEXT NOT NULL DEFAULT 'zh-CN',
            result TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `;
        this.userDb.execSync(userHistorySQL);
        console.log('[ConnectionManager] ✅ user_history table created');
      }

      // 检查 user_settings 表是否存在
      const settingsTableExists = this.userDb.getFirstSync<{count: number}>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='user_settings'"
      );

      if ((settingsTableExists?.count || 0) === 0) {
        console.log('[ConnectionManager] Creating new user_settings table...');
        const userSettingsSQL = `
          CREATE TABLE user_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            locale TEXT NOT NULL DEFAULT 'zh-CN',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            synced_at DATETIME
          );
        `;
        this.userDb.execSync(userSettingsSQL);
        console.log('[ConnectionManager] ✅ user_settings table created');
      } else {
        console.log('[ConnectionManager] ✅ user_settings table already exists');
      }

      // 创建索引
      console.log('[ConnectionManager] Creating indexes...');
      const indexSQL = `
        CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON user_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_history_timestamp ON user_history(timestamp);
        CREATE INDEX IF NOT EXISTS idx_user_history_user_timestamp ON user_history(user_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_user_history_locale ON user_history(locale);
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
      `;
      this.userDb.execSync(indexSQL);
      console.log('[ConnectionManager] ✅ Indexes created');

      // 验证最终表结构
      const finalColumns = this.userDb.getAllSync<{name: string, type: string}>(
        "PRAGMA table_info(user_history)"
      );
      console.log('[ConnectionManager] Final user_history schema:', finalColumns.map(c => `${c.name}:${c.type}`).join(', '));

      console.log('[ConnectionManager] ✅ User tables migration completed successfully');
    } catch (error) {
      console.error('[ConnectionManager] ❌ Failed to create/migrate user tables:', error);
      throw error;
    }
  }

  /**
   * 重新创建用户数据表（修复表结构）
   */
  async recreateUserTables(): Promise<ServiceResponse<void>> {
    try {
      console.log('[ConnectionManager] Recreating user tables with correct schema...');

      if (!this.isUserInitialized) {
        await this.initialize();
      }

      // 删除现有表
      this.userDb.execSync('DROP TABLE IF EXISTS user_history');
      this.userDb.execSync('DROP TABLE IF EXISTS user_settings');

      // 重新创建表
      await this.createUserTables();

      console.log('[ConnectionManager] User tables recreated successfully');
      return {
        success: true
      };
    } catch (error) {
      console.error('[ConnectionManager] Failed to recreate user tables:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to recreate tables'
      };
    }
  }

  /**
   * 获取配置数据库连接（只读）
   */
  getConfigDatabase(): SQLite.SQLiteDatabase {
    if (!this.isConfigInitialized) {
      throw new Error('Config database not initialized');
    }
    return this.configDb;
  }

  /**
   * 获取用户数据库连接（读写）
   */
  getUserDatabase(): SQLite.SQLiteDatabase {
    if (!this.isUserInitialized) {
      throw new Error('User database not initialized');
    }
    return this.userDb;
  }

  /**
   * 配置数据库查询（只读操作）
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async queryConfig<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T[]>> {
    try {
      if (!this.configDb) {
        console.error('[queryConfig] ❌ configDb is NULL! Database not initialized in AppContext!');
        throw new Error('Config database not initialized. This should never happen.');
      }

      const result = this.configDb.getAllSync<T>(sql, params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[queryConfig] ❌ Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Config query failed'
      };
    }
  }

  /**
   * 配置数据库单行查询
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async queryConfigFirst<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T | null>> {
    try {
      if (!this.configDb) {
        console.error('[queryConfigFirst] ❌ configDb is NULL! Database not initialized in AppContext!');
        throw new Error('Config database not initialized. This should never happen.');
      }

      const result = this.configDb.getFirstSync<T>(sql, params);
      return {
        success: true,
        data: result || null
      };
    } catch (error) {
      console.error('[queryConfigFirst] ❌ Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Config query failed'
      };
    }
  }

  /**
   * 用户数据库查询
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async queryUser<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T[]>> {
    try {
      if (!this.userDb) {
        console.error('[queryUser] ❌ userDb is NULL! Database not initialized in AppContext!');
        throw new Error('User database not initialized. This should never happen.');
      }

      const result = this.userDb.getAllSync<T>(sql, params);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('[queryUser] ❌ Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User query failed'
      };
    }
  }

  /**
   * 用户数据库单行查询
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async queryUserFirst<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T | null>> {
    try {
      if (!this.userDb) {
        console.error('[queryUserFirst] ❌ userDb is NULL! Database not initialized in AppContext!');
        throw new Error('User database not initialized. This should never happen.');
      }

      const result = this.userDb.getFirstSync<T>(sql, params);
      return {
        success: true,
        data: result || null
      };
    } catch (error) {
      console.error('[queryUserFirst] ❌ Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User query failed'
      };
    }
  }

  /**
   * 用户数据库执行命令（INSERT, UPDATE, DELETE）
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async executeUser(sql: string, params: any[] = []): Promise<ServiceResponse<DatabaseOperationResult>> {
    try {
      if (!this.userDb) {
        console.error('[executeUser] ❌ userDb is NULL! Database not initialized in AppContext!');
        throw new Error('User database not initialized. This should never happen.');
      }

      const result = this.userDb.runSync(sql, params);

      return {
        success: true,
        data: {
          success: true,
          affectedRows: result.changes,
          insertId: result.lastInsertRowId
        }
      };
    } catch (error) {
      console.error('[executeUser] ❌ Execute failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User execute failed'
      };
    }
  }

  /**
   * 用户数据库事务执行
   * 前提：DatabaseConnectionManager 必须已经在 AppContext 中初始化完成
   */
  async userTransaction(callback: () => void): Promise<ServiceResponse<void>> {
    try {
      if (!this.userDb) {
        console.error('[userTransaction] ❌ userDb is NULL! Database not initialized in AppContext!');
        throw new Error('User database not initialized. This should never happen.');
      }

      this.userDb.withTransactionSync(callback);

      return {
        success: true
      };
    } catch (error) {
      console.error('[userTransaction] ❌ Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User transaction failed'
      };
    }
  }

  /**
   * 获取数据库状态
   */
  async getStatus(): Promise<DatabaseStatus> {
    return {
      isInitialized: this.isConfigInitialized && this.isUserInitialized,
      version: 1,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * 重置用户数据库（保留配置数据库）
   */
  async resetUserData(): Promise<ServiceResponse<void>> {
    try {
      console.log('[ConnectionManager] Resetting user data...');

      // 清空用户历史表
      await this.executeUser('DELETE FROM user_history');

      console.log('[ConnectionManager] User data reset completed');
      return {
        success: true
      };
    } catch (error) {
      console.error('[ConnectionManager] User data reset failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reset failed'
      };
    }
  }

  /**
   * 完全重置（包括配置数据库） - 仅用于开发调试
   */
  async fullReset(): Promise<ServiceResponse<void>> {
    try {
      console.log('[ConnectionManager] Full reset initiated...');
      console.warn('[ConnectionManager] This will require re-copying config database from assets');

      // 关闭数据库连接
      if (this.configDb) {
        this.configDb.closeSync();
      }
      if (this.userDb) {
        this.userDb.closeSync();
      }

      // 删除数据库文件
      const configDbFile = this.getConfigDatabaseFile();
      const userDbFile = this.getUserDatabaseFile();

      try {
        const configInfo = configDbFile.info();
        if (configInfo.exists) {
          configDbFile.delete();
        }
      } catch {
        // 文件可能不存在，忽略错误
      }

      try {
        const userInfo = userDbFile.info();
        if (userInfo.exists) {
          userDbFile.delete();
        }
      } catch {
        // 文件可能不存在，忽略错误
      }

      // 重置状态
      this.isConfigInitialized = false;
      this.isUserInitialized = false;

      console.log('[ConnectionManager] Full reset completed');
      return {
        success: true
      };
    } catch (error) {
      console.error('[ConnectionManager] Full reset failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Full reset failed'
      };
    }
  }

}
