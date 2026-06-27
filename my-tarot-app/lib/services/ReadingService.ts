/**
 * 占卜服务
 * Reading Service
 *
 * 处理完整的占卜流程，包括保存用户记录
 */

import { UserDatabaseService } from '../database/user-db';
import { DEFAULT_LOCALE, type AppLocale } from '../i18n';
import { CardService } from './CardService';
import { SpreadService } from './SpreadService';
import type {
  UserHistory,
  ReadingResult,
  CardDraw,
  CardInterpretationData,
  ReadingFlowState,
  IReadingService
} from '../types/user';
import type { Card, Spread } from '../types/config';
import type { ServiceResponse } from '../types/database';

export class ReadingService implements IReadingService {
  private static instance: ReadingService;
  private userDbService: UserDatabaseService;
  private cardService: CardService;
  private spreadService: SpreadService;
  private sessions: Map<string, ReadingFlowState> = new Map();

  private constructor() {
    this.userDbService = UserDatabaseService.getInstance();
    this.cardService = CardService.getInstance();
    this.spreadService = SpreadService.getInstance();
  }

  public static getInstance(): ReadingService {
    if (!ReadingService.instance) {
      ReadingService.instance = new ReadingService();
    }
    return ReadingService.instance;
  }

  /**
   * 开始新的占卜会话
   */
  async startNewReading(userId: string, type: 'offline' | 'ai', category: string): Promise<string> {
    const sessionId = `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ReadingFlowState = {
      step: 1,
      type,
      category,
      selectedCards: [],
      interpretations: [],
      createdAt: new Date(),
      isLoading: false,
      error: null
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * 抽取卡牌
   */
  async drawCards(sessionId: string, spreadId: number): Promise<CardDraw[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Reading session not found');
    }

    try {
      // 获取牌阵信息
      const spreadResponse = await this.spreadService.getSpreadById(spreadId);
      if (!spreadResponse.success || !spreadResponse.data) {
        throw new Error('Failed to get spread information');
      }

      // 获取所有卡牌
      const cardsResponse = await this.cardService.getAllCards();
      if (!cardsResponse.success || !cardsResponse.data) {
        throw new Error('Failed to get cards');
      }

      const spread = spreadResponse.data;
      const allCards = cardsResponse.data;

      // 随机抽取指定数量的卡牌
      const drawnCards: CardDraw[] = [];
      const usedCards = new Set<number>();

      for (let i = 0; i < spread.card_count; i++) {
        let cardIndex: number;
        do {
          cardIndex = Math.floor(Math.random() * allCards.length);
        } while (usedCards.has(cardIndex));

        usedCards.add(cardIndex);
        const card = allCards[cardIndex];

        drawnCards.push({
          card,
          position: i,
          isReversed: Math.random() > 0.7 // 30% 概率逆位
        });
      }

      return drawnCards;
    } catch (error) {
      // console.error('Error drawing cards:', error);
      throw error;
    }
  }

  /**
   * 获取基础解读
   */
  async getBasicInterpretation(sessionId: string, cards: CardDraw[]): Promise<CardInterpretationData[]> {
    // 这里应该实现基础解读逻辑
    // 目前返回简单的模拟数据
    return cards.map((cardDraw, index) => ({
      cardId: cardDraw.card.id,
      position: index,
      direction: cardDraw.isReversed ? 'reversed' : 'upright',
      summary: `${cardDraw.card.name}的基础解读 - ${cardDraw.isReversed ? '逆位' : '正位'}`
    }));
  }

  /**
   * 获取AI解读
   */
  async getAiInterpretation(sessionId: string, cards: CardDraw[], category: string): Promise<CardInterpretationData[]> {
    // 这里应该实现AI解读逻辑
    // 目前返回模拟数据
    return cards.map((cardDraw, index) => ({
      cardId: cardDraw.card.id,
      position: index,
      direction: cardDraw.isReversed ? 'reversed' : 'upright',
      summary: `${cardDraw.card.name}的AI解读 - ${cardDraw.isReversed ? '逆位' : '正位'}`,
      detail: `这是${cardDraw.card.name}在${category}方面的深度AI解读...`
    }));
  }

  /**
   * 保存占卜结果到用户历史记录
   */
  async saveReadingResult(sessionId: string, result: ReadingResult): Promise<string> {
    try {
      // 将ReadingResult转换为UserHistory格式
      const userHistory = this.convertReadingResultToUserHistory(result);

      // 保存到数据库
      const savedId = await this.userDbService.saveUserHistory(userHistory);

      // console.log(`用户记录已保存，ID: ${savedId}`);
      return savedId;
    } catch (error) {
      // console.error('保存用户记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取占卜会话
   */
  async getReadingSession(sessionId: string): Promise<ReadingFlowState | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 完成占卜流程
   */
  async completeReading(sessionId: string): Promise<ReadingResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Reading session not found');
    }

    if (!session.readingResult) {
      throw new Error('Reading result not available');
    }

    // 清理会话
    this.sessions.delete(sessionId);

    return session.readingResult;
  }

  /**
   * 将ReadingResult转换为UserHistory格式
   */
  private convertReadingResultToUserHistory(result: ReadingResult): Omit<UserHistory, 'id' | 'created_at' | 'updated_at'> {
    const locale = result.metadata.locale ?? DEFAULT_LOCALE;
    if (!result.metadata.locale) {
      result.metadata.locale = locale;
    }

    return {
      user_id: result.metadata.user_id,
      spread_id: result.spread.id,
      card_ids: JSON.stringify(result.cards.map(card => card.card.id)),
      interpretation_mode: result.metadata.interpretation_mode,
      locale,
      result: JSON.stringify(result),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 通过ReadingFlowState保存记录（用于ReadingContext集成）
   */
  async saveReadingFromState(
    state: ReadingFlowState,
    userId: string = 'anonymous_user',
    locale: AppLocale = DEFAULT_LOCALE
  ): Promise<ServiceResponse<string>> {
    try {
      // 如果没有完整的解读结果，构建一个基础的
      if (!state.readingResult) {
        // 构建基础的ReadingResult
        const mockSpread = {
          id: 1, // 默认使用三牌阵
          name: '经典三牌阵',
          description: '过去-现在-未来',
          card_count: 3
        };

        const cardDraws: CardDraw[] = state.selectedCards.map((selectedCard, index) => ({
          card: {
            id: selectedCard.cardId,
            name: selectedCard.name || '未知卡牌',
            localizedName: selectedCard.displayName ?? selectedCard.name,
            arcana: 'Major' as const, // 默认值
            number: 0, // 默认值
            image_url: selectedCard.imageUrl || '',
            deck: 'Rider-Waite'
          },
          position: index,
          isReversed: selectedCard.direction === 'reversed'
        }));

        const aspectTypeMap = new Map<number, (typeof state.selectedCards)[number]>();
        const positionIndexMap = new Map<number, (typeof state.selectedCards)[number]>();

        state.selectedCards.forEach((card, index) => {
          if (typeof card.dimension?.aspect_type === 'number') {
            aspectTypeMap.set(card.dimension.aspect_type, card);
          }
          // 保存 1-based 的位置映射，便于兼容 position 字段
          positionIndexMap.set(index + 1, card);
        });

        const resolveCardByPosition = (position: unknown, index: number) => {
          const numericPosition =
            typeof position === 'number'
              ? position
              : typeof position === 'string'
                ? Number.parseInt(position, 10)
                : Number.NaN;

          if (Number.isFinite(numericPosition)) {
            const fromAspect = aspectTypeMap.get(numericPosition);
            if (fromAspect) {
              return fromAspect;
            }
            const fromIndex = positionIndexMap.get(numericPosition);
            if (fromIndex) {
              return fromIndex;
            }
          }

          return state.selectedCards[index];
        };

        const normalizedInterpretations = Array.isArray(state.interpretations)
          ? state.interpretations.map((interpretation, index) => {
              const matchedCard = resolveCardByPosition(interpretation.position, index);
              if (!matchedCard) {
                return interpretation;
              }

              const normalizedDirection =
                interpretation.direction ?? (matchedCard.direction === 'reversed' ? '逆位' : '正位');

              const normalizedDimensionName =
                interpretation.dimensionName
                ?? matchedCard.dimension?.localizedAspect
                ?? matchedCard.dimension?.aspect
                ?? matchedCard.dimension?.name;

              return {
                ...interpretation,
                cardId: matchedCard.cardId,
                cardName: matchedCard.displayName ?? matchedCard.name,
                direction: normalizedDirection,
                dimensionName: normalizedDimensionName,
              };
            })
          : state.interpretations;

        const normalizedAICardInterpretations = Array.isArray(state.aiResult?.card_interpretations)
          ? state.aiResult.card_interpretations.map((interpretation: any, index: number) => {
              const matchedCard = resolveCardByPosition(interpretation.position, index);
              if (!matchedCard) {
                return interpretation;
              }

              const normalizedDirection =
                interpretation.direction ?? (matchedCard.direction === 'reversed' ? '逆位' : '正位');

              const normalizedDimensionName =
                matchedCard.dimension?.localizedAspect
                ?? matchedCard.dimension?.aspect
                ?? matchedCard.dimension?.name
                ?? interpretation.dimension_aspect?.dimension_name;

              return {
                ...interpretation,
                card_id: matchedCard.cardId,
                card_name: matchedCard.displayName ?? matchedCard.name,
                direction: normalizedDirection,
                image_url: matchedCard.imageUrl ?? interpretation.image_url,
                dimension_aspect: normalizedDimensionName
                  ? {
                      ...(interpretation.dimension_aspect ?? {}),
                      dimension_name: normalizedDimensionName,
                    }
                  : interpretation.dimension_aspect,
              };
            })
          : state.aiResult?.card_interpretations;

        const normalizedAiResult = state.type === 'ai' && state.aiResult
          ? {
              ...state.aiResult,
              card_interpretations: normalizedAICardInterpretations ?? state.aiResult.card_interpretations,
            }
          : state.aiResult;

        // 获取主题信息（从第一个维度的description）
        const theme = state.selectedCards.length > 0 && state.selectedCards[0].dimension
          ? state.selectedCards[0].dimension.description
          : (state.categoryDisplayName ?? state.category);

        const readingResult: ReadingResult = {
          spread: mockSpread,
          cards: cardDraws,
          interpretation: {
            cards: normalizedInterpretations,
            // AI占卜专用字段
            ...(state.type === 'ai' && {
              dimension_summaries: normalizedAiResult?.dimension_summaries,
              insights: normalizedAiResult?.insights,
              user_description: state.userDescription,
              overall: normalizedAiResult?.overall_summary,
              card_interpretations: normalizedAiResult?.card_interpretations,
              dimensions: normalizedAiResult?.dimensions
            })
          },
          metadata: {
            created_at: state.createdAt.toISOString(),
            interpretation_mode: state.type === 'offline' ? 'default' : 'ai',
            user_id: userId,
            theme: theme, // 使用 dimension.description 作为主题
            // AI占卜专用元数据
            ...(state.type === 'ai' && {
              ai_dimensions: state.aiDimensions,
              generated_at: new Date().toISOString()
            })
          }
        };

        readingResult.metadata.locale = locale;

        const savedId = await this.saveReadingResult('temp_session', readingResult);
        return {
          success: true,
          data: savedId
        };
      } else {
        const normalizedResult: ReadingResult = {
          ...state.readingResult,
          metadata: {
            ...state.readingResult.metadata,
            locale: state.readingResult.metadata.locale ?? locale,
          },
        };
        const savedId = await this.saveReadingResult('temp_session', normalizedResult);
        return {
          success: true,
          data: savedId
        };
      }
    } catch (error) {
      // console.error('保存占卜记录失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '保存失败'
      };
    }
  }
}
