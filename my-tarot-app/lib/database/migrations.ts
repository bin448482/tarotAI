/**
 * 数据库初始化和迁移脚本
 * Database initialization and migration scripts
 */

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, CREATE_INDEXES, DATABASE_NAME } from './schema';

export class DatabaseMigrations {
  private db: SQLite.SQLiteDatabase;

  constructor(database?: SQLite.SQLiteDatabase) {
    this.db = database || SQLite.openDatabaseSync(DATABASE_NAME);
  }

  /**
   * 初始化数据库 - 仅创建用户表（静态数据表来自预置数据库）
   */
  async initialize(): Promise<void> {
    try {
      // 仅创建用户相关表，跳过静态数据表
      const userTables = ['user_history'];
      
      for (const tableName of userTables) {
        if (CREATE_TABLES[tableName]) {
          console.log(`Creating user table: ${tableName}`);
          await this.db.execAsync(CREATE_TABLES[tableName]);
        }
      }

      // 仅创建用户表相关的索引
      const userIndexes = CREATE_INDEXES.filter(indexSQL =>
        indexSQL.includes('user_history')
      );
      
      for (const indexSQL of userIndexes) {
        await this.db.execAsync(indexSQL);
      }

      console.log('User tables initialized successfully');
    } catch (error) {
      console.error('User tables initialization failed:', error);
      throw error;
    }
  }

  /**
   * 检查数据库是否已初始化（检查静态数据表是否存在）
   */
  async isDatabaseInitialized(): Promise<boolean> {
    try {
      // 检查静态数据表是否存在（来自预置数据库）
      const staticTables = ['card', 'card_style', 'dimension', 'spread'];
      
      for (const tableName of staticTables) {
        const result = await this.db.getFirstAsync<{count: number}>(
          `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${tableName}'`
        );
        if ((result?.count || 0) === 0) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 清空用户数据表（保留静态数据表）
   */
  async dropUserTables(): Promise<void> {
    const userTables = ['user_history']; // 仅删除用户表，保留静态数据表
    
    try {
      for (const tableName of userTables) {
        await this.db.execAsync(`DROP TABLE IF EXISTS ${tableName}`);
      }
      console.log('User tables dropped successfully');
    } catch (error) {
      console.error('Failed to drop user tables:', error);
      throw error;
    }
  }

  /**
   * 清空数据库（用于重新初始化） - 已废弃，使用dropUserTables代替
   * @deprecated Use dropUserTables() instead to preserve static data
   */
  async dropAllTables(): Promise<void> {
    console.warn('dropAllTables() is deprecated. Use dropUserTables() to preserve static data.');
    await this.dropUserTables();
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): SQLite.SQLiteDatabase {
    return this.db;
  }
}