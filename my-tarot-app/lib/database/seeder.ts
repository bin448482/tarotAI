/**
 * 数据库种子数据填充脚本
 * Database seed data population script
 *
 * NOTE: Static data seeding is now disabled as data comes from bundled SQLite database.
 * This class is kept for compatibility but will no-op for static tables.
 */

import { DatabaseService } from '../services/DatabaseService';
import type { ServiceResponse } from '../types/database';

export class DatabaseSeeder {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  /**
   * 填充所有种子数据 - 现在为空操作，因为静态数据来自预置数据库
   * @deprecated Static data now comes from bundled SQLite database
   */
  async seedAll(): Promise<ServiceResponse<void>> {
    console.log('[DatabaseSeeder] Seeding skipped - static data comes from bundled database');
    return { success: true };
  }

  /**
   * 检查是否需要填充数据 - 静态数据来自预置数据库，不需要填充
   */
  async needsSeeding(): Promise<boolean> {
    console.log('[DatabaseSeeder] Seeding not needed - static data comes from bundled database');
    return false; // 静态数据来自预置数据库，不需要填充
  }

  /**
   * 清空用户数据（保留静态数据）
   */
  async clearUserData(): Promise<ServiceResponse<void>> {
    try {
      // 仅清空用户数据表，保留静态数据
      const result = await this.dbService.execute('DELETE FROM user_history');
      
      if (result.success) {
        console.log('User data cleared successfully');
        return { success: true };
      } else {
        console.error('Failed to clear user data:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Failed to clear user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Clear failed'
      };
    }
  }

  /**
   * 清空所有数据 - 已废弃，使用clearUserData代替
   * @deprecated Use clearUserData() instead to preserve static data
   */
  async clearAll(): Promise<ServiceResponse<void>> {
    console.warn('clearAll() is deprecated. Use clearUserData() to preserve static data.');
    return await this.clearUserData();
  }
}