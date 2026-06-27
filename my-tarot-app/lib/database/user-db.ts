/**
 * 用户数据库服务 - 读写操作
 * User database service for read/write operations
 */

import { DatabaseConnectionManager } from './connection';
import type { ServiceResponse, DatabaseOperationResult } from '../types/database';
import type {
  UserHistory,
  ParsedUserHistory,
  HistoryFilter,
  HistoryPaginationQuery,
  IHistoryService
} from '../types/user';
import type { AppLocale } from '../i18n';

// UUID 生成函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class UserDatabaseService implements IHistoryService {
  private static instance: UserDatabaseService;
  private connectionManager: DatabaseConnectionManager;

  private constructor() {
    this.connectionManager = DatabaseConnectionManager.getInstance();
  }

  /**
   * 获取用户数据库服务单例
   */
  public static getInstance(): UserDatabaseService {
    if (!UserDatabaseService.instance) {
      UserDatabaseService.instance = new UserDatabaseService();
    }
    return UserDatabaseService.instance;
  }

  /**
   * 保存用户占卜历史（支持无限制保存）
   */
  async saveUserHistory(history: Omit<UserHistory, 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const id = generateUUID();
      const now = new Date().toISOString();

      // 添加调试信息
      console.log('[UserDB] Saving history with data:', {
        id: id,
        user_id: history.user_id,
        spread_id: history.spread_id,
        card_ids: history.card_ids,
        interpretation_mode: history.interpretation_mode,
        locale: history.locale,
        timestamp: history.timestamp
      });

      const sql = `
        INSERT INTO user_history (id, user_id, spread_id, card_ids, interpretation_mode, locale, result, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        id,
        history.user_id,
        history.spread_id,
        history.card_ids,
        history.interpretation_mode,
        history.locale,
        history.result,
        history.timestamp,
        now,
        now
      ];

      // 添加调试信息
      console.log('[UserDB] SQL params:', params);

      const result = await this.connectionManager.executeUser(sql, params);

      if (result.success) {
        console.log('[UserDB] Save successful, ID:', id);
        return id;
      } else {
        throw new Error(result.error || 'Failed to save user history');
      }
    } catch (error) {
      console.error('Error saving user history:', error);
      throw error;
    }
  }

  /**
   * 获取用户语言偏好
   */
  async getUserLocale(userId: string): Promise<AppLocale | null> {
    try {
      const result = await this.connectionManager.queryUserFirst<{ locale: string }>(
        'SELECT locale FROM user_settings WHERE user_id = ?',
        [userId]
      );

      if (result.success && result.data?.locale) {
        return result.data.locale as AppLocale;
      }
      return null;
    } catch (error) {
      console.error('Error getting user locale:', error);
      throw error;
    }
  }

  /**
   * 保存或更新用户语言偏好
   */
  async setUserLocale(userId: string, locale: AppLocale): Promise<boolean> {
    try {
      const existing = await this.connectionManager.queryUserFirst<{ locale: string }>(
        'SELECT locale FROM user_settings WHERE user_id = ?',
        [userId]
      );

      if (existing.success && existing.data) {
        const updateResult = await this.connectionManager.executeUser(
          `UPDATE user_settings SET locale = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
          [locale, userId]
        );

        if (!updateResult.success) {
          throw new Error(updateResult.error || 'Failed to update user locale');
        }
      } else {
        const insertResult = await this.connectionManager.executeUser(
          `INSERT INTO user_settings (id, user_id, locale, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          [generateUUID(), userId, locale]
        );

        if (!insertResult.success) {
          throw new Error(insertResult.error || 'Failed to insert user locale');
        }
      }

      return true;
    } catch (error) {
      console.error('Error setting user locale:', error);
      throw error;
    }
  }

  /**
   * 获取用户占卜历史（支持分页和筛选，默认最新100条）
   */
  async getUserHistory(
    userId: string,
    pagination: HistoryPaginationQuery = { limit: 100, offset: 0, orderBy: 'timestamp', orderDirection: 'DESC' },
    filter?: HistoryFilter
  ): Promise<ParsedUserHistory[]> {
    try {
      let sql = `SELECT * FROM user_history WHERE user_id = ?`;
      const params: any[] = [userId];

      // 添加筛选条件
      if (filter) {
        if (filter.mode && filter.mode !== 'all') {
          sql += ` AND interpretation_mode = ?`;
          params.push(filter.mode);
        }

        if (filter.dateRange) {
          sql += ` AND timestamp BETWEEN ? AND ?`;
          params.push(filter.dateRange.start, filter.dateRange.end);
        }

        if (filter.spreadId) {
          sql += ` AND spread_id = ?`;
          params.push(filter.spreadId);
        }
      }

      // 添加排序
      sql += ` ORDER BY ${pagination.orderBy || 'timestamp'} ${pagination.orderDirection || 'DESC'}`;

      // 添加分页
      sql += ` LIMIT ? OFFSET ?`;
      params.push(pagination.limit, pagination.offset);

      const result = await this.connectionManager.queryUser<UserHistory>(sql, params);

      if (result.success && result.data) {
        // 解析 JSON 字段
        return result.data.map(history => ({
          ...history,
          card_ids: JSON.parse(history.card_ids),
          result: JSON.parse(history.result)
        }));
      } else {
        throw new Error(result.error || 'Failed to get user history');
      }
    } catch (error) {
      console.error('Error getting user history:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取占卜历史记录
   */
  async getUserHistoryById(id: string): Promise<ParsedUserHistory | null> {
    try {
      const sql = 'SELECT * FROM user_history WHERE id = ?';
      const result = await this.connectionManager.queryUserFirst<UserHistory>(sql, [id]);

      if (result.success && result.data) {
        // 解析 JSON 字段
        return {
          ...result.data,
          card_ids: JSON.parse(result.data.card_ids),
          result: JSON.parse(result.data.result)
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user history by id:', error);
      throw error;
    }
  }

  /**
   * 获取历史记录总数
   */
  async getUserHistoryCount(userId: string, filter?: HistoryFilter): Promise<number> {
    try {
      let sql = 'SELECT COUNT(*) as count FROM user_history WHERE user_id = ?';
      const params: any[] = [userId];

      // 添加筛选条件
      if (filter) {
        if (filter.mode && filter.mode !== 'all') {
          sql += ` AND interpretation_mode = ?`;
          params.push(filter.mode);
        }

        if (filter.dateRange) {
          sql += ` AND timestamp BETWEEN ? AND ?`;
          params.push(filter.dateRange.start, filter.dateRange.end);
        }

        if (filter.spreadId) {
          sql += ` AND spread_id = ?`;
          params.push(filter.spreadId);
        }
      }

      const result = await this.connectionManager.queryUserFirst<{count: number}>(sql, params);

      if (result.success && result.data) {
        return result.data.count;
      } else {
        throw new Error(result.error || 'Failed to get user history count');
      }
    } catch (error) {
      console.error('Error getting user history count:', error);
      throw error;
    }
  }

  /**
   * 删除用户占卜历史记录
   */
  async deleteUserHistory(id: string): Promise<boolean> {
    try {
      const sql = 'DELETE FROM user_history WHERE id = ?';
      const result = await this.connectionManager.executeUser(sql, [id]);

      if (result.success) {
        return (result.data?.affectedRows || 0) > 0;
      } else {
        throw new Error(result.error || 'Failed to delete user history');
      }
    } catch (error) {
      console.error('Error deleting user history:', error);
      throw error;
    }
  }

  /**
   * 删除用户所有历史记录
   */
  async deleteAllUserHistory(userId: string): Promise<number> {
    try {
      const sql = 'DELETE FROM user_history WHERE user_id = ?';
      const result = await this.connectionManager.executeUser(sql, [userId]);

      if (result.success) {
        return result.data?.affectedRows || 0;
      } else {
        throw new Error(result.error || 'Failed to delete user history');
      }
    } catch (error) {
      console.error('Error deleting all user history:', error);
      throw error;
    }
  }

  /**
   * 更新用户历史记录
   */
  async updateUserHistory(id: string, updates: Partial<UserHistory>): Promise<boolean> {
    try {
      const allowedFields = ['interpretation_mode', 'result'];
      const updateFields: string[] = [];
      const params: any[] = [];

      // 构建更新字段
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key as keyof UserHistory] !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(updates[key as keyof UserHistory]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // 添加 updated_at 时间戳
      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      const sql = `UPDATE user_history SET ${updateFields.join(', ')} WHERE id = ?`;
      const result = await this.connectionManager.executeUser(sql, params);

      if (result.success) {
        return (result.data?.affectedRows || 0) > 0;
      } else {
        throw new Error(result.error || 'Failed to update user history');
      }
    } catch (error) {
      console.error('Error updating user history:', error);
      throw error;
    }
  }

  /**
   * 获取用户最近的占卜记录
   */
  async getRecentUserHistory(userId: string, days: number = 7): Promise<ParsedUserHistory[]> {
    try {
      const sql = `
        SELECT * FROM user_history
        WHERE user_id = ?
        AND timestamp >= datetime('now', '-${days} days')
        ORDER BY timestamp DESC
      `;

      const result = await this.connectionManager.queryUser<UserHistory>(sql, [userId]);

      if (result.success && result.data) {
        return result.data.map(history => ({
          ...history,
          card_ids: JSON.parse(history.card_ids),
          result: JSON.parse(history.result)
        }));
      } else {
        throw new Error(result.error || 'Failed to get recent user history');
      }
    } catch (error) {
      console.error('Error getting recent user history:', error);
      throw error;
    }
  }

  /**
   * 按日期范围获取用户历史
   */
  async getUserHistoryByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ParsedUserHistory[]> {
    try {
      const sql = `
        SELECT * FROM user_history
        WHERE user_id = ?
        AND timestamp BETWEEN ? AND ?
        ORDER BY timestamp DESC
      `;

      const result = await this.connectionManager.queryUser<UserHistory>(sql, [userId, startDate, endDate]);

      if (result.success && result.data) {
        return result.data.map(history => ({
          ...history,
          card_ids: JSON.parse(history.card_ids),
          result: JSON.parse(history.result)
        }));
      } else {
        throw new Error(result.error || 'Failed to get user history by date range');
      }
    } catch (error) {
      console.error('Error getting user history by date range:', error);
      throw error;
    }
  }

  /**
   * 获取用户使用的牌阵统计
   */
  async getUserSpreadStats(userId: string): Promise<Array<{spread_id: number, count: number}>> {
    try {
      const sql = `
        SELECT spread_id, COUNT(*) as count
        FROM user_history
        WHERE user_id = ?
        GROUP BY spread_id
        ORDER BY count DESC
      `;

      const result = await this.connectionManager.queryUser<{spread_id: number, count: number}>(sql, [userId]);

      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get user spread stats');
      }
    } catch (error) {
      console.error('Error getting user spread stats:', error);
      throw error;
    }
  }

  /**
   * 获取用户历史统计
   */
  async getUserHistoryStats(userId: string): Promise<import('../types/user').UserHistoryStats> {
    try {
      // 获取总记录数
      const totalResult = await this.connectionManager.queryUserFirst<{count: number}>(
        'SELECT COUNT(*) as count FROM user_history WHERE user_id = ?',
        [userId]
      );

      // 获取离线记录数
      const offlineResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE user_id = ? AND interpretation_mode = 'default'",
        [userId]
      );

      // 获取AI记录数
      const aiResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE user_id = ? AND interpretation_mode = 'ai'",
        [userId]
      );

      // 获取牌阵使用统计
      const spreadsResult = await this.connectionManager.queryUser<{spread_id: number, count: number}>(
        `SELECT spread_id, COUNT(*) as count
         FROM user_history
         WHERE user_id = ?
         GROUP BY spread_id
         ORDER BY count DESC`,
        [userId]
      );

      // 获取最新记录时间
      const lastReadingResult = await this.connectionManager.queryUserFirst<{timestamp: string}>(
        'SELECT timestamp FROM user_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1',
        [userId]
      );

      // 获取本周记录数
      const thisWeekResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')",
        [userId]
      );

      // 获取本月记录数
      const thisMonthResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE user_id = ? AND timestamp >= datetime('now', '-30 days')",
        [userId]
      );

      const stats = {
        totalReadings: totalResult.success ? totalResult.data?.count || 0 : 0,
        offlineReadings: offlineResult.success ? offlineResult.data?.count || 0 : 0,
        aiReadings: aiResult.success ? aiResult.data?.count || 0 : 0,
        spreadsUsed: spreadsResult.success ? spreadsResult.data?.map(item => ({
          spread_id: item.spread_id,
          spread_name: `牌阵${item.spread_id}`, // 这里需要后续与配置数据库关联获取真实名称
          count: item.count
        })) || [] : [],
        recentActivity: {
          lastReading: lastReadingResult.success ? lastReadingResult.data?.timestamp || null : null,
          readingsThisWeek: thisWeekResult.success ? thisWeekResult.data?.count || 0 : 0,
          readingsThisMonth: thisMonthResult.success ? thisMonthResult.data?.count || 0 : 0
        }
      };

      return stats;
    } catch (error) {
      console.error('Error getting user history stats:', error);
      throw error;
    }
  }

  /**
   * 清空所有用户数据（用于重置）
   */
  async clearAllUserData(): Promise<ServiceResponse<boolean>> {
    try {
      console.log('[UserDatabaseService] Clearing all user data...');

      const result = await this.connectionManager.executeUser('DELETE FROM user_history');

      if (result.success) {
        console.log(`[UserDatabaseService] Cleared ${result.data?.affectedRows || 0} user history records`);
        return {
          success: true,
          data: true
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to clear user data'
        };
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 执行用户数据库事务
   */
  async executeTransaction(callback: () => void): Promise<ServiceResponse<void>> {
    return await this.connectionManager.userTransaction(callback);
  }

  /**
   * 获取全局用户数据统计
   */
  async getAllUserDataStats(): Promise<ServiceResponse<{
    totalRecords: number;
    totalUsers: number;
    offlineRecords: number;
    aiRecords: number;
    latestRecord: string | null;
  }>> {
    try {
      // 获取总记录数
      const totalResult = await this.connectionManager.queryUserFirst<{count: number}>(
        'SELECT COUNT(*) as count FROM user_history'
      );

      // 获取用户数量
      const usersResult = await this.connectionManager.queryUserFirst<{count: number}>(
        'SELECT COUNT(DISTINCT user_id) as count FROM user_history'
      );

      // 获取离线记录数
      const offlineResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE interpretation_mode = 'default'"
      );

      // 获取AI记录数
      const aiResult = await this.connectionManager.queryUserFirst<{count: number}>(
        "SELECT COUNT(*) as count FROM user_history WHERE interpretation_mode = 'ai'"
      );

      // 获取最新记录时间
      const latestResult = await this.connectionManager.queryUserFirst<{timestamp: string}>(
        'SELECT timestamp FROM user_history ORDER BY timestamp DESC LIMIT 1'
      );

      const stats = {
        totalRecords: totalResult.success ? totalResult.data?.count || 0 : 0,
        totalUsers: usersResult.success ? usersResult.data?.count || 0 : 0,
        offlineRecords: offlineResult.success ? offlineResult.data?.count || 0 : 0,
        aiRecords: aiResult.success ? aiResult.data?.count || 0 : 0,
        latestRecord: latestResult.success ? latestResult.data?.timestamp || null : null
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error getting global user data stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
