/**
 * 测试数据生成服务
 * Test Data Generation Service
 *
 * 用于生成模拟用户数据，方便开发和测试
 */

import { UserDatabaseService } from '../database/user-db';
import { CardService } from './CardService';
import { SpreadService } from './SpreadService';
import type { UserHistory } from '../database/user-db';
import type { ServiceResponse } from '../types/database';
import { DEFAULT_LOCALE } from '../i18n';
import type { Card, Spread } from '../types/database';

export interface TestDataOptions {
  userId?: string;
  count?: number;
  includeBothModes?: boolean; // 包含 offline 和 ai 两种模式
  timeSpread?: number; // 时间跨度（天数）
}

export interface TestDataResult {
  generated: number;
  failed: number;
  errors: string[];
}

export class TestDataService {
  private static instance: TestDataService;
  private userDbService: UserDatabaseService;
  private cardService: CardService;
  private spreadService: SpreadService;

  private constructor() {
    this.userDbService = UserDatabaseService.getInstance();
    this.cardService = CardService.getInstance();
    this.spreadService = SpreadService.getInstance();
  }

  public static getInstance(): TestDataService {
    if (!TestDataService.instance) {
      TestDataService.instance = new TestDataService();
    }
    return TestDataService.instance;
  }

  /**
   * 生成测试用户数据
   */
  async generateTestUserData(options: TestDataOptions = {}): Promise<ServiceResponse<TestDataResult>> {
    const {
      userId = 'test_user_' + Date.now(),
      count = 10,
      includeBothModes = true,
      timeSpread = 30
    } = options;

    const result: TestDataResult = {
      generated: 0,
      failed: 0,
      errors: []
    };

    try {
      // 初始化数据库
      const initResult = await this.userDbService.initialize();
      if (!initResult.success) {
        return {
          success: false,
          error: `Database initialization failed: ${initResult.error}`
        };
      }

      // 获取可用的卡牌和牌阵
      const [cardsResponse, spreadsResponse] = await Promise.all([
        this.cardService.getAllCards(),
        this.spreadService.getAllSpreads()
      ]);

      if (!cardsResponse.success || !cardsResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch cards data'
        };
      }

      if (!spreadsResponse.success || !spreadsResponse.data) {
        return {
          success: false,
          error: 'Failed to fetch spreads data'
        };
      }

      const cards = cardsResponse.data;
      const spreads = spreadsResponse.data;

      if (cards.length === 0 || spreads.length === 0) {
        return {
          success: false,
          error: 'No cards or spreads available for test data generation'
        };
      }

      // 生成测试数据
      for (let i = 0; i < count; i++) {
        try {
          const testHistory = this.generateSingleTestHistory(userId, cards, spreads, timeSpread, includeBothModes);
          const saveResult = await this.userDbService.saveUserHistory(testHistory);

          if (saveResult.success) {
            result.generated++;
          } else {
            result.failed++;
            result.errors.push(`Failed to save test history ${i + 1}: ${saveResult.error}`);
          }
        } catch (error) {
          result.failed++;
          result.errors.push(`Error generating test history ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        data: result
      };

    } catch (error) {
      // console.error('Error generating test user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 生成单条测试历史记录
   */
  private generateSingleTestHistory(
    userId: string,
    cards: Card[],
    spreads: Spread[],
    timeSpread: number,
    includeBothModes: boolean
  ): Omit<UserHistory, 'id' | 'created_at' | 'updated_at'> {
    // 随机选择牌阵（优先选择3张牌的牌阵）
    const threeCardSpreads = spreads.filter(s => s.card_count === 3);
    const selectedSpread = threeCardSpreads.length > 0
      ? this.getRandomElement(threeCardSpreads)
      : this.getRandomElement(spreads);

    // 随机抽取卡牌
    const selectedCards = this.getRandomCards(cards, selectedSpread.card_count);
    const cardIds = selectedCards.map(card => card.id);

    // 随机选择解读模式
    const interpretationMode: 'default' | 'ai' = includeBothModes
      ? (Math.random() > 0.5 ? 'ai' : 'default')
      : 'default';

    // 生成随机时间戳（在指定天数范围内）
    const now = new Date();
    const randomDaysAgo = Math.floor(Math.random() * timeSpread);
    const timestamp = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

    // 生成模拟解读结果
    const result = this.generateMockReadingResult(selectedCards, selectedSpread, interpretationMode);

    return {
      user_id: userId,
      spread_id: selectedSpread.id,
      card_ids: JSON.stringify(cardIds),
      interpretation_mode: interpretationMode,
      result: JSON.stringify(result),
      timestamp: timestamp.toISOString()
    };
  }

  /**
   * 生成模拟解读结果
   */
  private generateMockReadingResult(cards: Card[], spread: Spread, mode: 'default' | 'ai') {
    const cardDraws = cards.map((card, index) => ({
      card: {
        id: card.id,
        name: card.name,
        arcana: card.arcana,
        suit: card.suit,
        number: card.number,
        image_url: card.image_url,
        style_id: card.style_id,
        deck: card.deck
      },
      position: index,
      isReversed: Math.random() > 0.7 // 30% 概率逆位
    }));

    const cardInterpretations = cardDraws.map((draw, index) => ({
      cardId: draw.card.id,
      position: index,
      direction: draw.isReversed ? 'reversed' : 'upright' as 'upright' | 'reversed',
      summary: this.generateMockSummary(draw.card, draw.isReversed, mode),
      detail: mode === 'ai' ? this.generateMockAiDetail(draw.card, draw.isReversed) : undefined,
      dimensionInterpretations: mode === 'ai' ? this.generateMockDimensions(draw.card) : undefined
    }));

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      spread: {
        id: spread.id,
        name: spread.name,
        description: spread.description,
        card_count: spread.card_count
      },
      cards: cardDraws,
      interpretation: {
        overall: mode === 'ai' ? this.generateMockOverallReading(cardDraws) : undefined,
        cards: cardInterpretations
      },
      metadata: {
        created_at: new Date().toISOString(),
        interpretation_mode: mode,
        user_id: 'test_user_' + Date.now(),
        locale: DEFAULT_LOCALE
      }
    };
  }

  /**
   * 生成模拟卡牌解读摘要
   */
  private generateMockSummary(card: Card, isReversed: boolean, mode: 'default' | 'ai'): string {
    const direction = isReversed ? '逆位' : '正位';
    const templates = [
      `${card.name}${direction}表示${this.getRandomKeyword()}的能量`,
      `在这个位置，${card.name}${direction}暗示着${this.getRandomKeyword()}`,
      `${card.name}${direction}带来${this.getRandomKeyword()}的启示`,
      `${direction}的${card.name}象征${this.getRandomKeyword()}的状态`
    ];

    return this.getRandomElement(templates);
  }

  /**
   * 生成模拟AI详细解读
   */
  private generateMockAiDetail(card: Card, isReversed: boolean): string {
    const direction = isReversed ? '逆位' : '正位';
    return `AI深度解读：${card.name}${direction}在当前情境下具有深层含义。这张牌代表着${this.getRandomKeyword()}的能量流动，暗示着${this.getRandomKeyword()}的可能性。建议关注${this.getRandomKeyword()}方面的发展，同时保持对${this.getRandomKeyword()}的敏感度。`;
  }

  /**
   * 生成模拟维度解读
   */
  private generateMockDimensions(card: Card) {
    const dimensions = [
      { name: '情感-当下', category: '情感', content: `${card.name}在情感层面显示${this.getRandomKeyword()}的状态` },
      { name: '事业-发展', category: '事业', content: `在事业方面，${card.name}暗示${this.getRandomKeyword()}的可能` },
      { name: '精神-成长', category: '精神成长', content: `从精神层面看，${card.name}带来${this.getRandomKeyword()}的启发` }
    ];

    return dimensions.map((dim, index) => ({
      dimensionId: index + 1,
      dimensionName: dim.name,
      dimensionCategory: dim.category,
      content: dim.content
    }));
  }

  /**
   * 生成模拟整体解读
   */
  private generateMockOverallReading(cardDraws: any[]): string {
    const cardNames = cardDraws.map(draw => draw.card.name).join('、');
    return `整体来看，${cardNames}的组合揭示了一个关于${this.getRandomKeyword()}的重要信息。这个牌阵显示出${this.getRandomKeyword()}的能量流动，建议在未来的发展中注重${this.getRandomKeyword()}的平衡。`;
  }

  /**
   * 获取随机关键词
   */
  private getRandomKeyword(): string {
    const keywords = [
      '成长', '转变', '机遇', '挑战', '平衡', '和谐', '创新', '稳定',
      '突破', '洞察', '智慧', '勇气', '爱情', '财富', '健康', '幸福',
      '自我发现', '内在力量', '人际关系', '事业发展', '精神觉醒', '情感治愈'
    ];
    return this.getRandomElement(keywords);
  }

  /**
   * 从数组中随机选择一个元素
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 从卡牌数组中随机选择指定数量的卡牌
   */
  private getRandomCards(cards: Card[], count: number): Card[] {
    const shuffled = [...cards].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * 清除测试用户数据
   */
  async clearTestUserData(userId?: string): Promise<ServiceResponse<number>> {
    try {
      if (userId) {
        // 只清除指定用户的数据
        return await this.userDbService.deleteAllUserHistory(userId);
      } else {
        // 清除所有用户数据（危险操作，仅用于测试）
        const clearResult = await this.userDbService.clearAllUserData();
        if (clearResult.success) {
          return {
            success: true,
            data: 0 // clearAllUserData 不返回具体数量
          };
        } else {
          return {
            success: false,
            error: clearResult.error || 'Failed to clear test data'
          };
        }
      }
    } catch (error) {
      // console.error('Error clearing test user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 获取测试数据统计
   */
  async getTestDataStats(userId?: string): Promise<ServiceResponse<{
    totalRecords: number;
    offlineRecords: number;
    aiRecords: number;
    userCount: number;
  }>> {
    try {
      // 这里需要实现统计逻辑
      // 由于当前的UserDatabaseService没有提供详细的统计接口
      // 我们可以基于现有接口来实现

      if (userId) {
        const countResult = await this.userDbService.getUserHistoryCount(userId);
        if (!countResult.success) {
          return {
            success: false,
            error: countResult.error || 'Failed to get user history count'
          };
        }

        return {
          success: true,
          data: {
            totalRecords: countResult.data || 0,
            offlineRecords: 0, // 需要更详细的查询
            aiRecords: 0, // 需要更详细的查询
            userCount: 1
          }
        };
      } else {
        // 返回基本统计信息
        return {
          success: true,
          data: {
            totalRecords: 0,
            offlineRecords: 0,
            aiRecords: 0,
            userCount: 0
          }
        };
      }
    } catch (error) {
      // console.error('Error getting test data stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
