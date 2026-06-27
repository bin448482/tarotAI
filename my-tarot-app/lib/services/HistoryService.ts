/**
 * 历史记录服务
 * History service for managing user reading history
 */

import { UserDatabaseService } from '../database/user-db';
import { DEFAULT_LOCALE, type AppLocale } from '../i18n';
import type {
  ParsedUserHistory,
  HistoryFilter,
  HistoryPaginationQuery,
  UserHistoryStats,
  SpreadUsageStats,
  ReadingResult,
} from '../types/user';

export class HistoryService {
  private static instance: HistoryService;
  private userDbService: UserDatabaseService;

  private constructor() {
    this.userDbService = UserDatabaseService.getInstance();
  }

  /**
   * 获取历史服务单例
   */
  public static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  /**
   * 保存占卜历史记录
   */
  async saveReadingHistory(
    userId: string,
    spreadId: number,
    cardIds: number[],
    result: ReadingResult,
    interpretationMode: 'default' | 'ai' = 'default',
    locale: AppLocale = DEFAULT_LOCALE
  ): Promise<string> {
    try {
      const historyData = {
        id: this.generateUUID(),
        user_id: userId,
        timestamp: new Date().toISOString(),
        spread_id: spreadId,
        card_ids: JSON.stringify(cardIds),
        interpretation_mode: interpretationMode,
        locale,
        result: JSON.stringify(result),
      };

      const historyId = await this.userDbService.saveUserHistory(historyData);
      console.log('[HistoryService] Reading history saved:', historyId);
      return historyId;
    } catch (error) {
      console.error('[HistoryService] Error saving reading history:', error);
      throw error;
    }
  }

  /**
   * 获取用户历史记录列表
   */
  async getUserHistories(
    userId: string,
    pagination?: HistoryPaginationQuery,
    filter?: HistoryFilter
  ): Promise<ParsedUserHistory[]> {
    try {
      const defaultPagination: HistoryPaginationQuery = {
        limit: 100,
        offset: 0,
        orderBy: 'timestamp',
        orderDirection: 'DESC',
        ...pagination,
      };

      return await this.userDbService.getUserHistory(userId, defaultPagination, filter);
    } catch (error) {
      console.error('[HistoryService] Error getting user histories:', error);
      throw error;
    }
  }

  /**
   * 获取历史记录总数
   */
  async getUserHistoryCount(userId: string, filter?: HistoryFilter): Promise<number> {
    try {
      return await this.userDbService.getUserHistoryCount(userId, filter);
    } catch (error) {
      console.error('[HistoryService] Error getting user history count:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取历史记录详情
   */
  async getHistoryById(historyId: string): Promise<ParsedUserHistory | null> {
    try {
      return await this.userDbService.getUserHistoryById(historyId);
    } catch (error) {
      console.error('[HistoryService] Error getting history by id:', error);
      throw error;
    }
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(historyId: string): Promise<boolean> {
    try {
      const result = await this.userDbService.deleteUserHistory(historyId);
      console.log('[HistoryService] History deleted:', historyId);
      return result;
    } catch (error) {
      console.error('[HistoryService] Error deleting history:', error);
      throw error;
    }
  }

  /**
   * 删除用户所有历史记录
   */
  async deleteAllUserHistory(userId: string): Promise<number> {
    try {
      const deletedCount = await this.userDbService.deleteAllUserHistory(userId);
      console.log('[HistoryService] All user history deleted:', deletedCount);
      return deletedCount;
    } catch (error) {
      console.error('[HistoryService] Error deleting all user history:', error);
      throw error;
    }
  }

  /**
   * 获取最近的历史记录
   */
  async getRecentHistory(userId: string, days: number = 7): Promise<ParsedUserHistory[]> {
    try {
      return await this.userDbService.getRecentUserHistory(userId, days);
    } catch (error) {
      console.error('[HistoryService] Error getting recent history:', error);
      throw error;
    }
  }

  /**
   * 按日期范围获取历史记录
   */
  async getHistoryByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ParsedUserHistory[]> {
    try {
      return await this.userDbService.getUserHistoryByDateRange(userId, startDate, endDate);
    } catch (error) {
      console.error('[HistoryService] Error getting history by date range:', error);
      throw error;
    }
  }

  /**
   * 获取牌阵使用统计
   */
  async getSpreadStats(userId: string): Promise<SpreadUsageStats[]> {
    try {
      return await this.userDbService.getUserSpreadStats(userId);
    } catch (error) {
      console.error('[HistoryService] Error getting spread stats:', error);
      throw error;
    }
  }

  /**
   * 获取用户历史统计信息
   */
  async getUserStats(userId: string): Promise<UserHistoryStats> {
    try {
      return await this.userDbService.getUserHistoryStats(userId);
    } catch (error) {
      console.error('[HistoryService] Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * 更新历史记录
   */
  async updateHistory(
    historyId: string,
    updates: { interpretation_mode?: 'default' | 'ai'; result?: ReadingResult }
  ): Promise<boolean> {
    try {
      const updateData: any = {};

      if (updates.interpretation_mode) {
        updateData.interpretation_mode = updates.interpretation_mode;
      }

      if (updates.result) {
        updateData.result = JSON.stringify(updates.result);
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('No valid update fields provided');
      }

      const result = await this.userDbService.updateUserHistory(historyId, updateData);
      console.log('[HistoryService] History updated:', historyId);
      return result;
    } catch (error) {
      console.error('[HistoryService] Error updating history:', error);
      throw error;
    }
  }

  /**
   * 搜索历史记录
   */
  async searchHistory(
    userId: string,
    searchQuery: string,
    pagination?: HistoryPaginationQuery
  ): Promise<ParsedUserHistory[]> {
    try {
      // 首先获取所有历史记录
      const allHistories = await this.getUserHistories(userId, {
        limit: 1000, // 临时增加限制进行搜索
        offset: 0,
      });

      // 在客户端进行搜索过滤
      const filteredHistories = allHistories.filter(history => {
        const searchLower = searchQuery.toLowerCase();

        // 搜索整体解读内容
        const overallMatch = history.result?.interpretation?.overall
          ?.toLowerCase()
          .includes(searchLower);

        // 搜索卡牌解读内容
        const cardsMatch = history.result?.interpretation?.cards?.some(card =>
          card.summary?.toLowerCase().includes(searchLower) ||
          card.detail?.toLowerCase().includes(searchLower)
        );

        return overallMatch || cardsMatch;
      });

      // 应用分页
      const startIndex = pagination?.offset || 0;
      const endIndex = startIndex + (pagination?.limit || 100);

      return filteredHistories.slice(startIndex, endIndex);
    } catch (error) {
      console.error('[HistoryService] Error searching history:', error);
      throw error;
    }
  }

  /**
   * 导出历史记录数据
   */
  async exportUserHistory(userId: string): Promise<string> {
    try {
      const histories = await this.getUserHistories(userId, { limit: 1000, offset: 0 });
      const stats = await this.getUserStats(userId);

      const exportData = {
        exportedAt: new Date().toISOString(),
        userId,
        stats,
        histories,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('[HistoryService] Error exporting user history:', error);
      throw error;
    }
  }

  /**
   * 生成UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 验证历史记录数据完整性
   */
  async validateHistoryIntegrity(userId: string): Promise<{
    isValid: boolean;
    issues: string[];
    totalRecords: number;
  }> {
    try {
      const histories = await this.getUserHistories(userId, { limit: 1000, offset: 0 });
      const issues: string[] = [];

      for (const history of histories) {
        // 检查必需字段
        if (!history.id || !history.user_id || !history.timestamp) {
          issues.push(`History ${history.id}: Missing required fields`);
        }

        // 检查卡牌ID有效性
        if (!Array.isArray(history.card_ids) || history.card_ids.length === 0) {
          issues.push(`History ${history.id}: Invalid card_ids`);
        }

        // 检查解读结果格式
        if (!history.result || typeof history.result !== 'object') {
          issues.push(`History ${history.id}: Invalid result format`);
        }

        // 检查时间戳有效性
        const timestamp = new Date(history.timestamp);
        if (isNaN(timestamp.getTime())) {
          issues.push(`History ${history.id}: Invalid timestamp`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        totalRecords: histories.length,
      };
    } catch (error) {
      console.error('[HistoryService] Error validating history integrity:', error);
      throw error;
    }
  }
}
