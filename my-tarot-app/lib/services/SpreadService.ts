/**
 * 牌阵业务逻辑服务
 * Spread business logic service
 */

import { ConfigDatabaseService } from '../database/config-db';
import type {
  Spread,
  ServiceResponse
} from '../types/database';

export class SpreadService {
  private static instance: SpreadService;
  private dbService: ConfigDatabaseService;

  private constructor() {
    this.dbService = ConfigDatabaseService.getInstance();
  }

  public static getInstance(): SpreadService {
    if (!SpreadService.instance) {
      SpreadService.instance = new SpreadService();
    }
    return SpreadService.instance;
  }

  /**
   * 获取所有牌阵
   */
  async getAllSpreads(): Promise<ServiceResponse<Spread[]>> {
    const sql = 'SELECT * FROM spread ORDER BY card_count, name';
    return await this.dbService.query<Spread>(sql);
  }

  /**
   * 根据ID获取牌阵
   */
  async getSpreadById(id: number): Promise<ServiceResponse<Spread | null>> {
    const sql = 'SELECT * FROM spread WHERE id = ?';
    return await this.dbService.queryFirst<Spread>(sql, [id]);
  }

  /**
   * 根据卡牌数量获取牌阵
   */
  async getSpreadsByCardCount(cardCount: number): Promise<ServiceResponse<Spread[]>> {
    const sql = 'SELECT * FROM spread WHERE card_count = ? ORDER BY name';
    return await this.dbService.query<Spread>(sql, [cardCount]);
  }

  /**
   * 获取三张牌牌阵（当前唯一支持的牌阵）
   */
  async getThreeCardSpread(): Promise<ServiceResponse<Spread | null>> {
    const sql = 'SELECT * FROM spread WHERE card_count = 3 LIMIT 1';
    return await this.dbService.queryFirst<Spread>(sql);
  }

  /**
   * 创建新的牌阵（预留接口）
   */
  async createSpread(spread: Omit<Spread, 'id'>): Promise<ServiceResponse<number>> {
    const sql = 'INSERT INTO spread (name, description, card_count) VALUES (?, ?, ?)';
    const params = [spread.name, spread.description, spread.card_count];
    
    const result = await this.dbService.execute(sql, params);
    
    if (result.success && result.data?.insertId) {
      return {
        success: true,
        data: result.data.insertId
      };
    }
    
    return {
      success: false,
      error: result.error || 'Failed to create spread'
    };
  }

  /**
   * 更新牌阵信息（预留接口）
   */
  async updateSpread(id: number, spread: Partial<Omit<Spread, 'id'>>): Promise<ServiceResponse<void>> {
    const fields: string[] = [];
    const params: any[] = [];

    if (spread.name !== undefined) {
      fields.push('name = ?');
      params.push(spread.name);
    }

    if (spread.description !== undefined) {
      fields.push('description = ?');
      params.push(spread.description);
    }

    if (spread.card_count !== undefined) {
      fields.push('card_count = ?');
      params.push(spread.card_count);
    }

    if (fields.length === 0) {
      return {
        success: false,
        error: 'No fields to update'
      };
    }

    params.push(id);
    const sql = `UPDATE spread SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await this.dbService.execute(sql, params);
    
    if (result.success) {
      return { success: true };
    }
    
    return {
      success: false,
      error: result.error || 'Failed to update spread'
    };
  }

  /**
   * 删除牌阵（预留接口）
   */
  async deleteSpread(id: number): Promise<ServiceResponse<void>> {
    // TODO: 实现牌阵删除逻辑
    // 注意：需要与 UserDatabaseService 协调检查用户历史记录
    return {
      success: false,
      error: 'Spread deletion not implemented yet'
    };
  }
}