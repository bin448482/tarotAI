/**
 * 卡牌信息聚合服务
 * 整合卡牌基础信息、解读内容和历史文化背景
 */

import type {
  TarotHistory,
  CardSummary,
  CardInterpretation,
  CardDetail,
  CardFilters,
  CardSearchResult,
  CardServiceConfig,
  CardImageConfig,
  CardSide
} from '../types/cards';
import type { ServiceResponse } from '../types/database';
import i18n from 'i18next';
import { DEFAULT_LOCALE } from '../i18n';
import { ConfigDatabaseService } from '../database/config-db';
import { CardService } from './CardService';
import { CardInterpretationService } from './CardInterpretationService';

interface RawCardInterpretation {
  interpretationId: number;
  cardId: number;
  cardName: string;
  direction: CardSide;
  summary: string;
  detail: string;
}

interface TarotHistoryLocaleContent {
  description: string;
  overview: string;
  origins: string;
  major_minor: string;
  usage_notes: string;
  interpretation_guidance: string;
  cultural_significance: string;
  references: string[];
}

interface TarotHistoryDataset {
  version: string;
  updated_at: string;
  locales: Record<string, TarotHistoryLocaleContent>;
}

interface CardTranslationRow {
  card_id: number;
  locale: string;
  name: string;
  deck?: string | null;
  suit?: string | null;
}

interface InterpretationTranslationRow {
  interpretation_id: number;
  locale: string;
  summary: string;
  detail?: string | null;
  direction?: string | null;
}

interface CardTranslationRecord {
  locale: string;
  name?: string;
  deck?: string | null;
  suit?: string | null;
}

interface InterpretationTranslationRecord {
  locale: string;
  summary?: string;
  detail?: string | null;
  direction?: string | null;
}

export class CardInfoService {
  private static instance: CardInfoService;
  private configDb: ConfigDatabaseService;
  private cardService: CardService;
  private cardInterpretationService: CardInterpretationService;
  private interpretationsCache: Map<string, Map<string, CardInterpretation>> = new Map();
  private cardTranslationCache: Map<string, Map<number, CardTranslationRecord>> = new Map();
  private interpretationTranslationCache: Map<string, Map<number, InterpretationTranslationRecord>> = new Map();
  private historyCache: Map<string, TarotHistory> = new Map();
  private config: CardServiceConfig;

  private constructor() {
    this.configDb = ConfigDatabaseService.getInstance();
    this.cardService = CardService.getInstance();
    this.cardInterpretationService = CardInterpretationService.getInstance();
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): CardInfoService {
    if (!CardInfoService.instance) {
      CardInfoService.instance = new CardInfoService();
    }
    return CardInfoService.instance;
  }

  private getDefaultConfig(): CardServiceConfig {
    const imageConfig: CardImageConfig = {
      basePath: 'assets/images',
      format: 'jpg',
      sizes: {
        thumbnail: { width: 120, height: 200 },
        medium: { width: 240, height: 400 },
        large: { width: 480, height: 800 }
      }
    };

    return {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
      imageConfig,
      defaultFilters: {
        arcana: 'all',
        suit: 'all',
        search: ''
      }
    };
  }

  private getActiveLocaleCandidates(): string[] {
    const language = typeof i18n.language === 'string' && i18n.language.length > 0
      ? i18n.language
      : DEFAULT_LOCALE;

    const candidates: string[] = [];
    const addCandidate = (value?: string | null) => {
      if (!value) return;
      candidates.push(value);
    };

    addCandidate(language);

    const lower = language.toLowerCase();
    if (lower.includes('-')) {
      const base = lower.split('-')[0];
      if (base === 'zh') {
        addCandidate('zh-CN');
      } else {
        addCandidate(base);
      }
    }

    addCandidate(DEFAULT_LOCALE);
    addCandidate('en');

    const uniqueCandidates: string[] = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (!seen.has(candidate)) {
        uniqueCandidates.push(candidate);
        seen.add(candidate);
      }
    }

    return uniqueCandidates;
  }

  private getCacheKeyForLocales(localeCandidates: string[]): string {
    return localeCandidates.join('|');
  }

  private normalizeDirection(direction?: string | CardSide | null): CardSide {
    const raw = (typeof direction === 'string' ? direction : direction ?? 'upright')?.toString().trim().toLowerCase();

    if (!raw) {
      return 'upright';
    }

    const uprightTokens = ['upright', 'up', 'upr', '正位', '正', 'forward'];
    if (uprightTokens.includes(raw)) {
      return 'upright';
    }

    const reversedTokens = ['reversed', 'reverse', 'rev', 'down', '逆位', '逆', 'inverted'];
    if (reversedTokens.includes(raw)) {
      return 'reversed';
    }

    // 默认返回正位，避免出现未识别的值导致逻辑中断
    return raw.startsWith('u') ? 'upright' : 'reversed';
  }

  private normalizeSuitValue(value?: string | null): CardSummary['suit'] {
    if (!value) {
      return undefined;
    }

    const normalized = value.trim().toLowerCase();
    if (!normalized || ['none', 'null', '无', '无花色'].includes(normalized)) {
      return undefined;
    }


    if (['wands', 'wand', '权杖'].includes(normalized)) {
      return 'wands';
    }
    if (['cups', 'cup', '圣杯'].includes(normalized)) {
      return 'cups';
    }
    if (['swords', 'sword', '宝剑'].includes(normalized)) {
      return 'swords';
    }
    if (['pentacles', 'pentacle', 'coins', 'coin', '钱币', '星币', '金币'].includes(normalized)) {
      return 'pentacles';
    }

    return undefined;
  }

  private resolveHistoryLocale(
    historyData: TarotHistoryDataset,
    localeCandidates: string[]
  ): { localeKey: string; history: TarotHistory } {
    const availableLocales = historyData.locales ?? {};
    const localeKeys = Object.keys(availableLocales);

    if (localeKeys.length === 0) {
      throw new Error('No tarot history locales configured');
    }

    const resolvedKey =
      localeCandidates.find(candidate => candidate in availableLocales) ??
      localeKeys[0];

    const localeContent = availableLocales[resolvedKey];
    if (!localeContent) {
      throw new Error(`Failed to resolve tarot history locale for key ${resolvedKey}`);
    }

    const history: TarotHistory = {
      version: historyData.version,
      updated_at: historyData.updated_at,
      description: localeContent.description,
      overview: localeContent.overview,
      origins: localeContent.origins,
      major_minor: localeContent.major_minor,
      usage_notes: localeContent.usage_notes,
      interpretation_guidance: localeContent.interpretation_guidance,
      cultural_significance: localeContent.cultural_significance,
      references: localeContent.references
    };

    return { localeKey: resolvedKey, history };
  }

  private getFallbackHistoryForLocale(locale: string): TarotHistory {
    const normalized = locale.toLowerCase();
    if (normalized.startsWith('en')) {
      return {
        version: '1.0.0',
        updated_at: new Date().toISOString(),
        description: 'Tarot history overview fallback content',
        overview: 'Tarot is a symbolic system of 78 cards that supports reflection, inner exploration, and guided decision-making.',
        origins: 'Historically, tarot emerged in 15th-century Europe as a card game before evolving into the divinatory tool used today.',
        major_minor: 'The 22 Major Arcana chart key life lessons while the 56 Minor Arcana explore everyday situations across the suits of Wands, Cups, Swords, and Pentacles.',
        usage_notes: 'Use tarot as inspiration rather than fixed prophecy—its value lies in the insights you gain and the choices you make afterwards.',
        interpretation_guidance: 'Upright readings highlight direct, flowing energy, while reversed readings can reveal blocks or reflective, internalized dynamics.',
        cultural_significance: 'Modern psychology and spiritual traditions view tarot as a bridge between conscious thought and deeper archetypal patterns.',
        references: [
          'Fallback: The Pictorial Key to the Tarot',
          'Fallback: Seventy-Eight Degrees of Wisdom'
        ]
      };
    }

    return {
      version: '1.0.0',
      updated_at: new Date().toISOString(),
      description: '塔罗牌历史文化背景备用内容',
      overview: '塔罗牌由78张卡牌组成，是一种用于内在探索与指引的象征系统。',
      origins: '塔罗牌在15世纪的欧洲以纸牌游戏形式出现，后来发展为今天的占卜工具。',
      major_minor: '大阿卡纳象征人生关键主题，小阿卡纳关注日常生活，涵盖权杖、圣杯、宝剑和钱币四个花色。',
      usage_notes: '请将塔罗牌视为启发与指引，而非命运的唯一答案；关键仍在于你的行动与选择。',
      interpretation_guidance: '正位代表能量的自然流动，逆位可能暗示阻滞或需要特别关注的面向。',
      cultural_significance: '现代心理学与灵性领域将塔罗视为连接意识与潜意识的桥梁。',
      references: ['备用：塔罗牌图像的钥匙', '备用：78度的智慧']
    };
  }

  /**
   * 获取塔罗历史文化背景
   */
  async getTarotHistory(): Promise<ServiceResponse<TarotHistory>> {
    try {
      const localeCandidates = this.getActiveLocaleCandidates();

      if (this.config.enableCache) {
        for (const candidate of localeCandidates) {
          const cached = this.historyCache.get(candidate);
          if (cached) {
            return { success: true, data: cached };
          }
        }
      }

      // 直接导入本地JSON数据
      const historyData = require('../../assets/data/tarot_history.json') as TarotHistoryDataset;

      if (!historyData || !historyData.locales) {
        throw new Error('Failed to load tarot history data');
      }

      const { localeKey, history } = this.resolveHistoryLocale(historyData, localeCandidates);

      if (this.config.enableCache) {
        this.historyCache.set(localeKey, history);
      }

      return { success: true, data: history };

    } catch (error) {
      console.error('Error loading tarot history:', error);
      // 提供默认数据作为降级方案
      const fallbackLocale = this.getActiveLocaleCandidates()[0] ?? DEFAULT_LOCALE;
      const fallbackHistory = this.getFallbackHistoryForLocale(fallbackLocale);

      if (this.config.enableCache) {
        this.historyCache.set(fallbackLocale, fallbackHistory);
      }

      return { success: true, data: fallbackHistory };
    }
  }

  /**
   * 加载卡牌解读数据（从配置数据库）
   */
  private async loadCardTranslations(localeCandidates: string[]): Promise<ServiceResponse<Map<number, CardTranslationRecord>>> {
    const combinedMap = new Map<number, CardTranslationRecord>();

    for (const locale of localeCandidates) {
      let cached = this.cardTranslationCache.get(locale);

      if (!cached) {
        const queryResult = await this.configDb.query<CardTranslationRow>(
          `SELECT card_id, locale, name, deck, suit FROM card_translation WHERE locale = ?`,
          [locale]
        );

        if (!queryResult.success || !queryResult.data) {
          continue;
        }

        cached = new Map<number, CardTranslationRecord>();
        for (const row of queryResult.data) {
          cached.set(row.card_id, {
            locale,
            name: row.name,
            deck: row.deck ?? null,
            suit: row.suit ?? null
          });
        }

        if (this.config.enableCache) {
          this.cardTranslationCache.set(locale, cached);
        }
      }

      cached.forEach((record, cardId) => {
        if (!combinedMap.has(cardId)) {
          combinedMap.set(cardId, record);
        }
      });
    }

    return { success: true, data: combinedMap };
  }

  private async loadInterpretationTranslations(localeCandidates: string[]): Promise<ServiceResponse<Map<number, InterpretationTranslationRecord>>> {
    const combinedMap = new Map<number, InterpretationTranslationRecord>();

    for (const locale of localeCandidates) {
      let cached = this.interpretationTranslationCache.get(locale);

      if (!cached) {
        const queryResult = await this.configDb.query<InterpretationTranslationRow>(
          `SELECT interpretation_id, locale, summary, detail, direction FROM card_interpretation_translation WHERE locale = ?`,
          [locale]
        );

        if (!queryResult.success || !queryResult.data) {
          continue;
        }

        cached = new Map<number, InterpretationTranslationRecord>();
        for (const row of queryResult.data) {
          cached.set(row.interpretation_id, {
            locale,
            summary: row.summary ?? undefined,
            detail: row.detail ?? null,
            direction: row.direction ?? undefined
          });
        }

        if (this.config.enableCache) {
          this.interpretationTranslationCache.set(locale, cached);
        }
      }

      cached.forEach((record, interpretationId) => {
        if (!combinedMap.has(interpretationId)) {
          combinedMap.set(interpretationId, record);
        }
      });
    }

    return { success: true, data: combinedMap };
  }

  private async loadCardInterpretations(): Promise<ServiceResponse<RawCardInterpretation[]>> {
    try {
      // 获取所有卡牌列表
      const cardsResponse = await this.cardService.getAllCards();
      if (!cardsResponse.success || !cardsResponse.data) {
        return {
          success: false,
          error: cardsResponse.error || 'Failed to fetch cards'
        };
      }

      const cards = cardsResponse.data;
      const interpretations: RawCardInterpretation[] = [];

      // 为每张卡牌获取正位和逆位解读
      for (const card of cards) {
        try {
          // 获取正位解读
          const uprightResponse = await this.cardInterpretationService.getCardInterpretation(
            card.id,
            '正位'
          );
          if (uprightResponse.success && uprightResponse.data) {
            interpretations.push({
              interpretationId: uprightResponse.data.id,
              cardId: card.id,
              cardName: card.name,
              direction: this.normalizeDirection(uprightResponse.data.direction || '正位'),
              summary: uprightResponse.data.summary,
              detail: uprightResponse.data.detail || ''
            });
          }

          // 获取逆位解读
          const reversedResponse = await this.cardInterpretationService.getCardInterpretation(
            card.id,
            '逆位'
          );
          if (reversedResponse.success && reversedResponse.data) {
            interpretations.push({
              interpretationId: reversedResponse.data.id,
              cardId: card.id,
              cardName: card.name,
              direction: this.normalizeDirection(reversedResponse.data.direction || '逆位'),
              summary: reversedResponse.data.summary,
              detail: reversedResponse.data.detail || ''
            });
          }
        } catch (error) {
          console.warn(`Failed to load interpretation for card ${card.name}:`, error);
          // 继续处理其他卡牌，不因单个卡牌失败而中断
        }
      }

      if (interpretations.length === 0) {
        return {
          success: false,
          error: 'No card interpretations found in database'
        };
      }

      const localeCandidates = this.getActiveLocaleCandidates();
      const translationResponse = await this.loadInterpretationTranslations(localeCandidates);

      if (translationResponse.success && translationResponse.data) {
        const translationMap = translationResponse.data;
        for (const item of interpretations) {
          const translation = translationMap.get(item.interpretationId);
          if (translation) {
            if (translation.summary) {
              item.summary = translation.summary;
            }
            if (translation.detail) {
              item.detail = translation.detail;
            }
            if (translation.direction) {
              item.direction = this.normalizeDirection(translation.direction);
            }
          }
        }
      }

      return { success: true, data: interpretations };

    } catch (error) {
      console.error('Error loading card interpretations from database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load card interpretations from database'
      };
    }
  }

  /**
   * 构建卡牌解读映射
   */
  private async buildInterpretationsMap(): Promise<ServiceResponse<Map<string, CardInterpretation>>> {
    try {
      const localeCandidates = this.getActiveLocaleCandidates();
      const cacheKey = this.getCacheKeyForLocales(localeCandidates);

      if (this.config.enableCache) {
        const cachedMap = this.interpretationsCache.get(cacheKey);
        if (cachedMap) {
          return { success: true, data: cachedMap };
        }
      }

      const interpretationsResponse = await this.loadCardInterpretations();
      if (!interpretationsResponse.success || !interpretationsResponse.data) {
        return {
          success: false,
          error: interpretationsResponse.error || 'Failed to load interpretations'
        };
      }

      const rawInterpretations = interpretationsResponse.data;
      const interpretationsMap = new Map<string, CardInterpretation>();

      // 按卡牌名称分组，每张卡牌包含正位和逆位解读
      const cardGroups = new Map<string, { upright?: RawCardInterpretation; reversed?: RawCardInterpretation }>();

      rawInterpretations.forEach(item => {
        const normalizedDirection = this.normalizeDirection(item.direction);
        if (!cardGroups.has(item.cardName)) {
          cardGroups.set(item.cardName, {});
        }

        const group = cardGroups.get(item.cardName)!;
        if (normalizedDirection === 'upright') {
          group.upright = { ...item, direction: 'upright' };
        } else if (normalizedDirection === 'reversed') {
          group.reversed = { ...item, direction: 'reversed' };
        }
      });

      // 构建最终的解读映射
      cardGroups.forEach((group, cardName) => {
        if (group.upright && group.reversed) {
          const resolvedCardId = group.upright.cardId ?? group.reversed.cardId;
          const interpretation: CardInterpretation = {
            cardId: resolvedCardId ?? 0,
            cardName,
            upright: {
              summary: group.upright.summary,
              detail: group.upright.detail
            },
            reversed: {
              summary: group.reversed.summary,
              detail: group.reversed.detail
            }
          };

          interpretationsMap.set(cardName, interpretation);
        }
      });

      // 缓存结果
      if (this.config.enableCache) {
        this.interpretationsCache.set(cacheKey, interpretationsMap);
      }

      return { success: true, data: interpretationsMap };

    } catch (error) {
      console.error('Error building interpretations map:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build interpretations map'
      };
    }
  }

  /**
   * 生成卡牌图片资源
   */
  private getCardImageSource(cardName: string, arcana: string, suit?: string, number?: number) {
    if (arcana.toLowerCase() === 'major') {
      // 大阿卡纳图片映射
      const majorImageMap: Record<string, any> = {
        '愚者': require('../../assets/images/major/00-fool.jpg'),
        '魔术师': require('../../assets/images/major/01-magician.jpg'),
        '女祭司': require('../../assets/images/major/02-high-priestess.jpg'),
        '皇后': require('../../assets/images/major/03-empress.jpg'),
        '皇帝': require('../../assets/images/major/04-emperor.jpg'),
        '教皇': require('../../assets/images/major/05-hierophant.jpg'),
        '恋人': require('../../assets/images/major/06-lovers.jpg'),
        '战车': require('../../assets/images/major/07-chariot.jpg'),
        '力量': require('../../assets/images/major/08-strength.jpg'),
        '隐者': require('../../assets/images/major/09-hermit.jpg'),
        '命运之轮': require('../../assets/images/major/10-wheel-of-fortune.jpg'),
        '正义': require('../../assets/images/major/11-justice.jpg'),
        '倒吊人': require('../../assets/images/major/12-hanged-man.jpg'),
        '死神': require('../../assets/images/major/13-death.jpg'),
        '节制': require('../../assets/images/major/14-temperance.jpg'),
        '恶魔': require('../../assets/images/major/15-devil.jpg'),
        '塔': require('../../assets/images/major/16-tower.jpg'),
        '星星': require('../../assets/images/major/17-star.jpg'),
        '月亮': require('../../assets/images/major/18-moon.jpg'),
        '太阳': require('../../assets/images/major/19-sun.jpg'),
        '审判': require('../../assets/images/major/20-judgement.jpg'),
        '世界': require('../../assets/images/major/21-world.jpg'),
      };

      return majorImageMap[cardName] || require('../../assets/images/major/00-fool.jpg');
    } else {
      // 小阿卡纳图片映射
      const minorImageMap: Record<string, any> = {
        // 权杖花色 (Wands)
        '权杖王牌': require('../../assets/images/minor/wands/01-ace-of-wands.jpg'),
        '权杖二': require('../../assets/images/minor/wands/02-two-of-wands.jpg'),
        '权杖三': require('../../assets/images/minor/wands/03-three-of-wands.jpg'),
        '权杖四': require('../../assets/images/minor/wands/04-four-of-wands.jpg'),
        '权杖五': require('../../assets/images/minor/wands/05-five-of-wands.jpg'),
        '权杖六': require('../../assets/images/minor/wands/06-six-of-wands.jpg'),
        '权杖七': require('../../assets/images/minor/wands/07-seven-of-wands.jpg'),
        '权杖八': require('../../assets/images/minor/wands/08-eight-of-wands.jpg'),
        '权杖九': require('../../assets/images/minor/wands/09-nine-of-wands.jpg'),
        '权杖十': require('../../assets/images/minor/wands/10-ten-of-wands.jpg'),
        '权杖侍者': require('../../assets/images/minor/wands/11-page-of-wands.jpg'),
        '权杖骑士': require('../../assets/images/minor/wands/12-knight-of-wands.jpg'),
        '权杖王后': require('../../assets/images/minor/wands/13-queen-of-wands.jpg'),
        '权杖国王': require('../../assets/images/minor/wands/14-king-of-wands.jpg'),

        // 圣杯花色 (Cups)
        '圣杯王牌': require('../../assets/images/minor/cups/01-ace-of-cups.jpg'),
        '圣杯二': require('../../assets/images/minor/cups/02-two-of-cups.jpg'),
        '圣杯三': require('../../assets/images/minor/cups/03-three-of-cups.jpg'),
        '圣杯四': require('../../assets/images/minor/cups/04-four-of-cups.jpg'),
        '圣杯五': require('../../assets/images/minor/cups/05-five-of-cups.jpg'),
        '圣杯六': require('../../assets/images/minor/cups/06-six-of-cups.jpg'),
        '圣杯七': require('../../assets/images/minor/cups/07-seven-of-cups.jpg'),
        '圣杯八': require('../../assets/images/minor/cups/08-eight-of-cups.jpg'),
        '圣杯九': require('../../assets/images/minor/cups/09-nine-of-cups.jpg'),
        '圣杯十': require('../../assets/images/minor/cups/10-ten-of-cups.jpg'),
        '圣杯侍者': require('../../assets/images/minor/cups/11-page-of-cups.jpg'),
        '圣杯骑士': require('../../assets/images/minor/cups/12-knight-of-cups.jpg'),
        '圣杯王后': require('../../assets/images/minor/cups/13-queen-of-cups.jpg'),
        '圣杯国王': require('../../assets/images/minor/cups/14-king-of-cups.jpg'),

        // 宝剑花色 (Swords)
        '宝剑王牌': require('../../assets/images/minor/swords/01-ace-of-swords.jpg'),
        '宝剑二': require('../../assets/images/minor/swords/02-two-of-swords.jpg'),
        '宝剑三': require('../../assets/images/minor/swords/03-three-of-swords.jpg'),
        '宝剑四': require('../../assets/images/minor/swords/04-four-of-swords.jpg'),
        '宝剑五': require('../../assets/images/minor/swords/05-five-of-swords.jpg'),
        '宝剑六': require('../../assets/images/minor/swords/06-six-of-swords.jpg'),
        '宝剑七': require('../../assets/images/minor/swords/07-seven-of-swords.jpg'),
        '宝剑八': require('../../assets/images/minor/swords/08-eight-of-swords.jpg'),
        '宝剑九': require('../../assets/images/minor/swords/09-nine-of-swords.jpg'),
        '宝剑十': require('../../assets/images/minor/swords/10-ten-of-swords.jpg'),
        '宝剑侍者': require('../../assets/images/minor/swords/11-page-of-swords.jpg'),
        '宝剑骑士': require('../../assets/images/minor/swords/12-knight-of-swords.jpg'),
        '宝剑王后': require('../../assets/images/minor/swords/13-queen-of-swords.jpg'),
        '宝剑国王': require('../../assets/images/minor/swords/14-king-of-swords.jpg'),

        // 星币/钱币花色 (Pentacles)
        '星币王牌': require('../../assets/images/minor/pentacles/01-ace-of-pentacles.jpg'),
        '星币二': require('../../assets/images/minor/pentacles/02-two-of-pentacles.jpg'),
        '星币三': require('../../assets/images/minor/pentacles/03-three-of-pentacles.jpg'),
        '星币四': require('../../assets/images/minor/pentacles/04-four-of-pentacles.jpg'),
        '星币五': require('../../assets/images/minor/pentacles/05-five-of-pentacles.jpg'),
        '星币六': require('../../assets/images/minor/pentacles/06-six-of-pentacles.jpg'),
        '星币七': require('../../assets/images/minor/pentacles/07-seven-of-pentacles.jpg'),
        '星币八': require('../../assets/images/minor/pentacles/08-eight-of-pentacles.jpg'),
        '星币九': require('../../assets/images/minor/pentacles/09-nine-of-pentacles.jpg'),
        '星币十': require('../../assets/images/minor/pentacles/10-ten-of-pentacles.jpg'),
        '星币侍者': require('../../assets/images/minor/pentacles/11-page-of-pentacles.jpg'),
        '星币骑士': require('../../assets/images/minor/pentacles/12-knight-of-pentacles.jpg'),
        '星币王后': require('../../assets/images/minor/pentacles/13-queen-of-pentacles.jpg'),
        '星币国王': require('../../assets/images/minor/pentacles/14-king-of-pentacles.jpg'),

        // 钱币花色 (数据库中使用的名称)
        '钱币王牌': require('../../assets/images/minor/pentacles/01-ace-of-pentacles.jpg'),
        '钱币二': require('../../assets/images/minor/pentacles/02-two-of-pentacles.jpg'),
        '钱币三': require('../../assets/images/minor/pentacles/03-three-of-pentacles.jpg'),
        '钱币四': require('../../assets/images/minor/pentacles/04-four-of-pentacles.jpg'),
        '钱币五': require('../../assets/images/minor/pentacles/05-five-of-pentacles.jpg'),
        '钱币六': require('../../assets/images/minor/pentacles/06-six-of-pentacles.jpg'),
        '钱币七': require('../../assets/images/minor/pentacles/07-seven-of-pentacles.jpg'),
        '钱币八': require('../../assets/images/minor/pentacles/08-eight-of-pentacles.jpg'),
        '钱币九': require('../../assets/images/minor/pentacles/09-nine-of-pentacles.jpg'),
        '钱币十': require('../../assets/images/minor/pentacles/10-ten-of-pentacles.jpg'),
        '钱币侍者': require('../../assets/images/minor/pentacles/11-page-of-pentacles.jpg'),
        '钱币骑士': require('../../assets/images/minor/pentacles/12-knight-of-pentacles.jpg'),
        '钱币王后': require('../../assets/images/minor/pentacles/13-queen-of-pentacles.jpg'),
        '钱币国王': require('../../assets/images/minor/pentacles/14-king-of-pentacles.jpg'),
      };

      return minorImageMap[cardName] || require('../../assets/images/major/00-fool.jpg');
    }
  }

  /**
   * 生成卡牌图片路径（保留用于调试）
   */
  private generateImagePath(cardName: string, arcana: string, suit?: string, number?: number): string {
    const { basePath, format } = this.config.imageConfig;

    if (arcana.toLowerCase() === 'major') {
      // 大阿卡纳图片路径：major/00-fool.jpg
      const cardNumber = (number !== undefined ? number : 0).toString().padStart(2, '0');

      // 完整的大阿卡纳中英文映射表
      const majorArcanaMapping: Record<string, string> = {
        '愚者': 'fool',
        '魔术师': 'magician',
        '女祭司': 'high-priestess',
        '皇后': 'empress',
        '皇帝': 'emperor',
        '教皇': 'hierophant',
        '恋人': 'lovers',
        '战车': 'chariot',
        '力量': 'strength',
        '隐者': 'hermit',
        '命运之轮': 'wheel-of-fortune',
        '正义': 'justice',
        '倒吊人': 'hanged-man',
        '死神': 'death',
        '节制': 'temperance',
        '恶魔': 'devil',
        '塔': 'tower',
        '星星': 'star',
        '月亮': 'moon',
        '太阳': 'sun',
        '审判': 'judgement',
        '世界': 'world'
      };

      const englishName = majorArcanaMapping[cardName] || cardName.toLowerCase();
      const fileName = `${cardNumber}-${englishName}.${format}`;
      return `${basePath}/major/${fileName}`;
    } else {
      // 小阿卡纳图片路径：minor/wands/01-ace-of-wands.jpg
      const suitMapping: Record<string, string> = {
        'wands': 'wands',
        'cups': 'cups',
        'swords': 'swords',
        'pentacles': 'pentacles',
        '权杖': 'wands',
        '圣杯': 'cups',
        '宝剑': 'swords',
        '星币': 'pentacles'
      };

      const suitPath = suit ? suitMapping[suit] || suit.toLowerCase() : 'wands';
      const cardNumber = (number !== undefined ? number : 1).toString().padStart(2, '0');

      // 小阿卡纳卡牌名称映射
      const minorCardMapping: Record<string, string> = {
        // 王牌
        '权杖王牌': 'ace-of-wands',
        '圣杯王牌': 'ace-of-cups',
        '宝剑王牌': 'ace-of-swords',
        '星币王牌': 'ace-of-pentacles',
        // 数字牌 2-10
        '权杖二': '02-of-wands',
        '权杖三': '03-of-wands',
        '权杖四': '04-of-wands',
        '权杖五': '05-of-wands',
        '权杖六': '06-of-wands',
        '权杖七': '07-of-wands',
        '权杖八': '08-of-wands',
        '权杖九': '09-of-wands',
        '权杖十': '10-of-wands',
        // 宫廷牌
        '权杖侍者': 'page-of-wands',
        '权杖骑士': 'knight-of-wands',
        '权杖王后': 'queen-of-wands',
        '权杖国王': 'king-of-wands',
        // 圣杯花色
        '圣杯二': '02-of-cups',
        '圣杯三': '03-of-cups',
        '圣杯四': '04-of-cups',
        '圣杯五': '05-of-cups',
        '圣杯六': '06-of-cups',
        '圣杯七': '07-of-cups',
        '圣杯八': '08-of-cups',
        '圣杯九': '09-of-cups',
        '圣杯十': '10-of-cups',
        '圣杯侍者': 'page-of-cups',
        '圣杯骑士': 'knight-of-cups',
        '圣杯王后': 'queen-of-cups',
        '圣杯国王': 'king-of-cups',
        // 宝剑花色
        '宝剑二': '02-of-swords',
        '宝剑三': '03-of-swords',
        '宝剑四': '04-of-swords',
        '宝剑五': '05-of-swords',
        '宝剑六': '06-of-swords',
        '宝剑七': '07-of-swords',
        '宝剑八': '08-of-swords',
        '宝剑九': '09-of-swords',
        '宝剑十': '10-of-swords',
        '宝剑侍者': 'page-of-swords',
        '宝剑骑士': 'knight-of-swords',
        '宝剑王后': 'queen-of-swords',
        '宝剑国王': 'king-of-swords',
        // 星币花色
        '星币二': '02-of-pentacles',
        '星币三': '03-of-pentacles',
        '星币四': '04-of-pentacles',
        '星币五': '05-of-pentacles',
        '星币六': '06-of-pentacles',
        '星币七': '07-of-pentacles',
        '星币八': '08-of-pentacles',
        '星币九': '09-of-pentacles',
        '星币十': '10-of-pentacles',
        '星币侍者': 'page-of-pentacles',
        '星币骑士': 'knight-of-pentacles',
        '星币王后': 'queen-of-pentacles',
        '星币国王': 'king-of-pentacles'
      };

      const fileName = minorCardMapping[cardName] || `${cardNumber}-${cardName.toLowerCase()}.${format}`;
      return `${basePath}/minor/${suitPath}/${fileName}`;
    }
  }

  /**
   * 获取所有卡牌列表（支持筛选）
   */
  async listCards(filters: CardFilters = this.config.defaultFilters): Promise<ServiceResponse<CardSummary[]>> {
    try {
      // 构建查询选项
      const queryOptions: any = {};

      if (filters.arcana && filters.arcana !== 'all') {
        queryOptions.arcana = filters.arcana === 'major' ? 'Major' : 'Minor';
      }

      if (filters.suit && filters.suit !== 'all') {
        // 英文花色名称到中文的映射
        const suitMapping: Record<string, string> = {
          'wands': '权杖',
          'cups': '圣杯',
          'swords': '宝剑',
          'pentacles': '钱币'  // 数据库中使用"钱币"而不是"星币"
        };
        queryOptions.suit = suitMapping[filters.suit] || filters.suit;
      }

      if (filters.search) {
        queryOptions.name = filters.search;
      }

      // 从数据库获取卡牌基础信息
      const cardsResponse = await this.cardService.getAllCards(queryOptions);
      if (!cardsResponse.success || !cardsResponse.data) {
        return {
          success: false,
          error: cardsResponse.error || 'Failed to fetch cards'
        };
      }

      const localeCandidates = this.getActiveLocaleCandidates();
      const translationsResponse = await this.loadCardTranslations(localeCandidates);
      const translationMap = translationsResponse.success && translationsResponse.data
        ? translationsResponse.data
        : new Map<number, CardTranslationRecord>();

      // 转换为CardSummary格式
      const cardSummaries: CardSummary[] = cardsResponse.data.map(card => {
        const translation = translationMap.get(card.id);
        return {
          id: card.id,
          name: translation?.name ?? card.name,
          arcana: card.arcana.toLowerCase() as 'major' | 'minor',
          suit: this.normalizeSuitValue(translation?.suit ?? card.suit ?? undefined),
          number: card.number,
          image: this.getCardImageSource(card.name, card.arcana, card.suit || undefined, card.number),
          deck: translation?.deck ?? card.deck
        };
      });

      return { success: true, data: cardSummaries };

    } catch (error) {
      console.error('Error listing cards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list cards'
      };
    }
  }

  /**
   * 获取单张卡牌详情
   */
  async getCardDetail(cardId: number): Promise<ServiceResponse<CardDetail>> {
    try {
      // 获取卡牌基础信息
      const cardResponse = await this.cardService.getCardById(cardId);
      if (!cardResponse.success || !cardResponse.data) {
        return {
          success: false,
          error: cardResponse.error || 'Card not found'
        };
      }

      const card = cardResponse.data;
      const baseName = card.name;
      const baseSuit = card.suit || undefined;

      // 获取解读映射
      const interpretationsMapResponse = await this.buildInterpretationsMap();
      if (!interpretationsMapResponse.success || !interpretationsMapResponse.data) {
        return {
          success: false,
          error: interpretationsMapResponse.error || 'Failed to load interpretations'
        };
      }

      const interpretationsMap = interpretationsMapResponse.data;
      const interpretation = interpretationsMap.get(baseName);

      if (!interpretation) {
        return {
          success: false,
          error: `No interpretation found for card: ${card.name}`
        };
      }

      const localeCandidates = this.getActiveLocaleCandidates();
      const translationsResponse = await this.loadCardTranslations(localeCandidates);
      const translation = translationsResponse.success && translationsResponse.data
        ? translationsResponse.data.get(card.id)
        : undefined;

      const fallbackSuit = this.normalizeSuitValue(baseSuit);
      const localizedSuit = this.normalizeSuitValue(translation?.suit ?? baseSuit) ?? fallbackSuit;
      const localizedName = translation?.name ?? card.name;
      const localizedDeck = translation?.deck ?? card.deck;

      const localizedInterpretation: CardInterpretation = {
        cardId: interpretation.cardId,
        cardName: localizedName,
        upright: {
          summary: interpretation.upright.summary,
          detail: interpretation.upright.detail
        },
        reversed: {
          summary: interpretation.reversed.summary,
          detail: interpretation.reversed.detail
        }
      };

      // 构建完整卡牌详情
      const cardDetail: CardDetail = {
        id: card.id,
        name: localizedName,
        arcana: card.arcana.toLowerCase() as 'major' | 'minor',
        suit: localizedSuit,
        number: card.number,
        image: this.getCardImageSource(baseName, card.arcana, baseSuit, card.number),
        deck: localizedDeck,
        interpretations: localizedInterpretation
      };

      return { success: true, data: cardDetail };

    } catch (error) {
      console.error('Error getting card detail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get card detail'
      };
    }
  }

  /**
   * 搜索卡牌（按名称、关键词）
   */
  async searchCards(query: string): Promise<ServiceResponse<CardSearchResult[]>> {
    try {
      // 使用现有的搜索功能
      const searchResponse = await this.cardService.searchCards(query);
      if (!searchResponse.success || !searchResponse.data) {
        return {
          success: false,
          error: searchResponse.error || 'Search failed'
        };
      }

      const localeCandidates = this.getActiveLocaleCandidates();
      const translationsResponse = await this.loadCardTranslations(localeCandidates);
      const translationMap = translationsResponse.success && translationsResponse.data
        ? translationsResponse.data
        : new Map<number, CardTranslationRecord>();
      const queryLower = query.toLowerCase();

      // 构建搜索结果
      const results: CardSearchResult[] = searchResponse.data.map(card => {
        const matchFields: string[] = [];
        let score = 0;
        const translation = translationMap.get(card.id);
        const localizedName = translation?.name ?? card.name;
        const localizedDeck = translation?.deck ?? card.deck;
        const localizedSuitRaw = translation?.suit ?? card.suit ?? undefined;
        const normalizedSuit = this.normalizeSuitValue(localizedSuitRaw);

        const nameCandidates = new Set(
          [card.name, localizedName].filter((value): value is string => Boolean(value))
        );
        const suitCandidates = new Set(
          [card.suit, localizedSuitRaw].filter((value): value is string => Boolean(value))
        );
        const deckCandidates = new Set(
          [card.deck, localizedDeck].filter((value): value is string => Boolean(value))
        );

        // 计算匹配分数
        if ([...nameCandidates].some(value => value.toLowerCase().includes(queryLower))) {
          matchFields.push('name');
          score += 10;
        }
        if (card.arcana.toLowerCase().includes(queryLower)) {
          matchFields.push('arcana');
          score += 5;
        }
        if ([...suitCandidates].some(value => value.toLowerCase().includes(queryLower))) {
          matchFields.push('suit');
          score += 3;
        }
        if ([...deckCandidates].some(value => value.toLowerCase().includes(queryLower))) {
          matchFields.push('deck');
          score += 1;
        }

        return {
          card: {
            id: card.id,
            name: localizedName,
            arcana: card.arcana.toLowerCase() as 'major' | 'minor',
            suit: normalizedSuit,
            number: card.number,
            image: this.getCardImageSource(card.name, card.arcana, card.suit || undefined, card.number),
            deck: localizedDeck
          },
          matchFields,
          score
        };
      });

      // 按分数排序
      results.sort((a, b) => b.score - a.score);

      return { success: true, data: results };

    } catch (error) {
      console.error('Error searching cards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.interpretationsCache.clear();
    this.cardTranslationCache.clear();
    this.interpretationTranslationCache.clear();
    this.historyCache.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CardServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
