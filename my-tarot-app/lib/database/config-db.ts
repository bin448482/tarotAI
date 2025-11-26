/**
 * 配置数据库服务 - 只读操作
 * Config database service for read-only operations
 */

import { DatabaseConnectionManager } from './connection';
import type { ServiceResponse } from '../types/database';

export class ConfigDatabaseService {
  private static instance: ConfigDatabaseService;
  private connectionManager: DatabaseConnectionManager;

  private constructor() {
    this.connectionManager = DatabaseConnectionManager.getInstance();
  }

  /**
   * 获取配置数据库服务单例
   */
  public static getInstance(): ConfigDatabaseService {
    if (!ConfigDatabaseService.instance) {
      ConfigDatabaseService.instance = new ConfigDatabaseService();
    }
    return ConfigDatabaseService.instance;
  }

  /**
   * 查询多行数据
   */
  async query<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T[]>> {
    return await this.connectionManager.queryConfig<T>(sql, params);
  }

  /**
   * 查询单行数据
   */
  async queryFirst<T>(sql: string, params: any[] = []): Promise<ServiceResponse<T | null>> {
    return await this.connectionManager.queryConfigFirst<T>(sql, params);
  }

  /**
   * 获取所有卡牌
   */
  async getAllCards() {
    return await this.query(`
      SELECT c.*, cs.name as style_name, cs.image_base_url
      FROM card c
      LEFT JOIN card_style cs ON c.style_id = cs.id
      ORDER BY c.number ASC
    `);
  }

  /**
   * 根据ID获取卡牌
   */
  async getCardById(id: number) {
    return await this.queryFirst(`
      SELECT c.*, cs.name as style_name, cs.image_base_url
      FROM card c
      LEFT JOIN card_style cs ON c.style_id = cs.id
      WHERE c.id = ?
    `, [id]);
  }

  /**
   * 获取大阿卡纳
   */
  async getMajorArcana() {
    return await this.query(`
      SELECT c.*, cs.name as style_name, cs.image_base_url
      FROM card c
      LEFT JOIN card_style cs ON c.style_id = cs.id
      WHERE c.arcana = 'Major'
      ORDER BY c.number ASC
    `);
  }

  /**
   * 获取小阿卡纳
   */
  async getMinorArcana() {
    return await this.query(`
      SELECT c.*, cs.name as style_name, cs.image_base_url
      FROM card c
      LEFT JOIN card_style cs ON c.style_id = cs.id
      WHERE c.arcana = 'Minor'
      ORDER BY c.suit ASC, c.number ASC
    `);
  }

  /**
   * 获取所有卡牌风格
   */
  async getAllCardStyles() {
    return await this.query('SELECT * FROM card_style ORDER BY id ASC');
  }

  /**
   * 获取所有牌阵
   */
  async getAllSpreads() {
    return await this.query('SELECT * FROM spread ORDER BY id ASC');
  }

  /**
   * 根据ID获取牌阵
   */
  async getSpreadById(id: number) {
    return await this.queryFirst('SELECT * FROM spread WHERE id = ?', [id]);
  }

  /**
   * 获取三张牌牌阵
   */
  async getThreeCardSpread() {
    return await this.queryFirst('SELECT * FROM spread WHERE card_count = 3 LIMIT 1');
  }

  /**
   * 获取所有维度
   */
  async getAllDimensions() {
    return await this.query('SELECT * FROM dimension ORDER BY category, id ASC');
  }

  /**
   * 根据类别获取维度
   */
  async getDimensionsByCategory(category: string) {
    return await this.query('SELECT * FROM dimension WHERE category = ? ORDER BY id ASC', [category]);
  }

  /**
   * 获取卡牌基础解读
   */
  async getCardInterpretations(cardId: number) {
    return await this.query('SELECT * FROM card_interpretation WHERE card_id = ?', [cardId]);
  }

  /**
   * 获取卡牌维度解读
   */
  async getCardDimensionInterpretations(cardId: number, direction: string) {
    return await this.query(`
      SELECT cid.*, d.name as dimension_name, d.category as dimension_category
      FROM card_interpretation ci
      JOIN card_interpretation_dimension cid ON ci.id = cid.interpretation_id
      JOIN dimension d ON cid.dimension_id = d.id
      WHERE ci.card_id = ? AND ci.direction = ?
      ORDER BY d.category, d.id ASC
    `, [cardId, direction]);
  }

  /**
   * 获取指定维度的所有卡牌解读
   */
  async getAllCardsForDimension(dimensionId: number, direction: string) {
    return await this.query(`
      SELECT c.*, ci.direction, cid.content, cid.aspect, cid.aspect_type
      FROM card c
      JOIN card_interpretation ci ON c.id = ci.card_id
      JOIN card_interpretation_dimension cid ON ci.id = cid.interpretation_id
      WHERE cid.dimension_id = ? AND ci.direction = ?
      ORDER BY c.number ASC
    `, [dimensionId, direction]);
  }
}