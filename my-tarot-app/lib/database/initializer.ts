/**
 * 数据库初始化和测试脚本
 * Database initialization and test script
 */

import { DatabaseService } from '../services/DatabaseService';
import { SpreadService } from '../services/SpreadService';
import { CardService } from '../services/CardService';
import { DatabaseSeeder } from '../database/seeder';

export class DatabaseInitializer {
  private dbService: DatabaseService;
  private spreadService: SpreadService;
  private cardService: CardService;
  private seeder: DatabaseSeeder;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.spreadService = SpreadService.getInstance();
    this.cardService = CardService.getInstance();
    this.seeder = new DatabaseSeeder();
  }

  /**
   * 完整的数据库初始化流程 - 使用预置数据库
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Starting database initialization...');

      // 1. 初始化数据库（复制预置数据库并创建用户表）
      console.log('📋 Initializing database from bundled assets...');
      const initResult = await this.dbService.initialize();
      if (!initResult.success) {
        throw new Error(`Database initialization failed: ${initResult.error}`);
      }
      console.log('✅ Database initialized from bundled assets');

      // 2. 跳过数据填充 - 静态数据来自预置数据库
      console.log('⏭️ Skipping seeding - static data comes from bundled database');

      // 3. 验证数据完整性
      console.log('🔬 Verifying data integrity...');
      const verificationResult = await this.verifyData();
      if (!verificationResult) {
        throw new Error('Data verification failed');
      }
      console.log('✅ Data verification passed');

      console.log('🎉 Database initialization completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  /**
   * 验证数据完整性
   */
  private async verifyData(): Promise<boolean> {
    try {
      // 验证卡牌风格数据
      const cardStylesResult = await this.cardService.getAllCardStyles();
      if (!cardStylesResult.success || !cardStylesResult.data || cardStylesResult.data.length === 0) {
        console.error('❌ No card styles found in database');
        return false;
      }

      // 验证卡牌数据
      const cardsResult = await this.cardService.getAllCards();
      if (!cardsResult.success || !cardsResult.data || cardsResult.data.length === 0) {
        console.error('❌ No cards found in database');
        return false;
      }

      // 验证牌阵数据
      const spreadsResult = await this.spreadService.getAllSpreads();
      if (!spreadsResult.success || !spreadsResult.data || spreadsResult.data.length === 0) {
        console.error('❌ No spreads found in database');
        return false;
      }

      // 验证三张牌牌阵存在
      const threeCardSpread = await this.spreadService.getThreeCardSpread();
      if (!threeCardSpread.success || !threeCardSpread.data) {
        console.error('❌ Three-card spread not found');
        return false;
      }

      // 验证大阿卡纳和小阿卡纳数量
      const majorResult = await this.cardService.getMajorArcana();
      const minorResult = await this.cardService.getMinorArcana();
      
      if (!majorResult.success || !minorResult.success) {
        console.error('❌ Failed to query major/minor arcana');
        return false;
      }

      const majorCount = majorResult.data?.length || 0;
      const minorCount = minorResult.data?.length || 0;

      console.log(`✅ Found ${cardStylesResult.data.length} card style(s) in database`);
      console.log(`✅ Found ${cardsResult.data.length} card(s) in database (${majorCount} Major + ${minorCount} Minor)`);
      console.log(`✅ Found ${spreadsResult.data.length} spread(s) in database`);
      console.log(`✅ Three-card spread: "${threeCardSpread.data.name}"`);

      // 验证预期的卡牌数量 (78张)
      if (cardsResult.data.length !== 78) {
        console.error(`❌ Expected 78 cards, but found ${cardsResult.data.length}`);
        return false;
      }

      if (majorCount !== 22) {
        console.error(`❌ Expected 22 major arcana, but found ${majorCount}`);
        return false;
      }

      if (minorCount !== 56) {
        console.error(`❌ Expected 56 minor arcana, but found ${minorCount}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Data verification error:', error);
      return false;
    }
  }

  /**
   * 重置用户数据（保留静态数据）
   */
  async reset(): Promise<boolean> {
    try {
      console.log('🔄 Resetting user data (preserving static data)...');
      
      // 仅清空用户数据，保留静态数据
      const clearResult = await this.seeder.clearUserData();
      if (!clearResult.success) {
        throw new Error(`User data reset failed: ${clearResult.error}`);
      }

      console.log('✅ User data reset completed');
      
      // 重新初始化（主要是确保用户表存在）
      return await this.initialize();
      
    } catch (error) {
      console.error('❌ User data reset failed:', error);
      return false;
    }
  }

  /**
   * 完全重置数据库（包括静态数据） - 仅用于开发调试
   * @deprecated Use reset() instead to preserve static data
   */
  async fullReset(): Promise<boolean> {
    try {
      console.log('🔄 Full database reset (including static data)...');
      console.warn('⚠️ This will remove the bundled database and require re-copying from assets');
      
      const resetResult = await this.dbService.reset();
      if (!resetResult.success) {
        throw new Error(`Database reset failed: ${resetResult.error}`);
      }

      console.log('✅ Full database reset completed');
      
      // 重新初始化
      return await this.initialize();
      
    } catch (error) {
      console.error('❌ Full database reset failed:', error);
      return false;
    }
  }

  /**
   * 获取数据库状态
   */
  async getStatus() {
    try {
      const status = await this.dbService.getStatus();
      const spreadsResult = await this.spreadService.getAllSpreads();
      const cardStylesResult = await this.cardService.getAllCardStyles();
      const cardsResult = await this.cardService.getAllCards();
      
      return {
        database: status,
        cardStyles: {
          count: cardStylesResult.success ? cardStylesResult.data?.length || 0 : 0,
          data: cardStylesResult.data || []
        },
        cards: {
          count: cardsResult.success ? cardsResult.data?.length || 0 : 0,
          data: cardsResult.data || []
        },
        spreads: {
          count: spreadsResult.success ? spreadsResult.data?.length || 0 : 0,
          data: spreadsResult.data || []
        }
      };
    } catch (error) {
      console.error('Error getting database status:', error);
      return null;
    }
  }
}