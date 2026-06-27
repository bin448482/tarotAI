import i18n from 'i18next';
import { ConfigDatabaseService } from '../database/config-db';
import { DEFAULT_LOCALE } from '../i18n';
import type { ServiceResponse } from '../types/database';

export interface CardInterpretationData {
  id: number;
  card_id: number;
  direction: string;
  summary: string;
  detail?: string;
}

export interface CardInterpretationDimensionData {
  id: number;
  interpretation_id: number;
  dimension_id: number;
  aspect?: string;
  aspect_type?: string;
  content: string;
}

interface CardInterpretationTranslationRow {
  locale: string;
  summary?: string | null;
  detail?: string | null;
}

interface CardInterpretationDimensionTranslationRow {
  locale: string;
  aspect?: string | null;
  content?: string | null;
}

export class CardInterpretationService {
  private static instance: CardInterpretationService;
  private dbService: ConfigDatabaseService;

  private constructor() {
    this.dbService = ConfigDatabaseService.getInstance();
  }

  static getInstance(): CardInterpretationService {
    if (!CardInterpretationService.instance) {
      CardInterpretationService.instance = new CardInterpretationService();
    }
    return CardInterpretationService.instance;
  }

  /**
   * 获取卡牌的基础解读
   */
  async getCardInterpretation(
    cardId: number,
    direction: string
  ): Promise<ServiceResponse<CardInterpretationData>> {
    try {
      const result = await this.dbService.queryFirst<CardInterpretationData>(
        'SELECT * FROM card_interpretation WHERE card_id = ? AND direction = ?',
        [cardId, direction]
      );

      if (result.success && result.data) {
        const localized = await this.localizeInterpretation(result.data);
        return { success: true, data: localized };
      }

      return { success: false, error: result.error || 'Card interpretation not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting card interpretation'
      };
    }
  }

  /**
   * 获取卡牌的详细维度解读
   */
  async getCardDimensionInterpretation(
    cardId: number,
    direction: string,
    dimensionId: number,
    aspectType?: string
  ): Promise<ServiceResponse<CardInterpretationDimensionData>> {
    try {
      let query = `
        SELECT cid.*
        FROM card_interpretation_dimension cid
        JOIN card_interpretation ci ON cid.interpretation_id = ci.id
        WHERE ci.card_id = ? AND ci.direction = ? AND cid.dimension_id = ?
      `;
      let params = [cardId, direction, dimensionId];

      if (aspectType) {
        query += ' AND cid.aspect_type = ?';
        params.push(aspectType);
      }

      const result = await this.dbService.queryFirst<CardInterpretationDimensionData>(
        query,
        params
      );

      if (result.success && result.data) {
        const localized = await this.localizeDimensionInterpretation(result.data);
        return { success: true, data: localized };
      }

      return { success: false, error: result.error || 'Card dimension interpretation not found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting card dimension interpretation'
      };
    }
  }

  /**
   * 获取卡牌的所有维度解读
   */
  async getCardAllDimensionInterpretations(
    cardId: number,
    direction: string
  ): Promise<ServiceResponse<CardInterpretationDimensionData[]>> {
    try {
      const result = await this.dbService.query<CardInterpretationDimensionData>(`
        SELECT cid.*
        FROM card_interpretation_dimension cid
        JOIN card_interpretation ci ON cid.interpretation_id = ci.id
        WHERE ci.card_id = ? AND ci.direction = ?
        ORDER BY cid.dimension_id, cid.aspect_type
      `, [cardId, direction]);

      if (result.success && result.data) {
        const localized = await Promise.all(
          result.data.map(item => this.localizeDimensionInterpretation(item))
        );
        return { success: true, data: localized };
      }

      return { success: false, error: result.error || 'No dimension interpretations found' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting card dimension interpretations'
      };
    }
  }

  /**
   * 获取卡牌在特定维度下的解读
   */
  async getCardInterpretationForDimension(
    cardName: string,
    direction: string,
    dimensionName: string,
    aspectType?: string,
    dimensionId?: number
  ): Promise<ServiceResponse<CardInterpretationDimensionData>> {
    try {
      // console.log('[CardInterpretationService] getCardInterpretationForDimension called with:');
      // console.log('  - cardName:', cardName);
      // console.log('  - direction:', direction);
      // console.log('  - dimensionName:', dimensionName);
      // console.log('  - aspectType:', aspectType);

      let query = `
        SELECT cid.*
        FROM card_interpretation_dimension cid
        JOIN card_interpretation ci ON cid.interpretation_id = ci.id
        JOIN card c ON ci.card_id = c.id
        JOIN dimension d ON cid.dimension_id = d.id
        WHERE c.name = ? AND ci.direction = ?
      `;
      const params: (string | number)[] = [cardName, direction];

      if (dimensionId) {
        query += ' AND cid.dimension_id = ?';
        params.push(dimensionId);
      } else {
        query += ' AND d.name = ?';
        params.push(dimensionName);
      }

      if (aspectType) {
        query += ' AND cid.aspect_type = ?';
        params.push(aspectType);
      }

      // console.log('[CardInterpretationService] SQL query:', query);
      // console.log('[CardInterpretationService] SQL params:', params);

      const result = await this.dbService.queryFirst<CardInterpretationDimensionData>(
        query,
        params
      );

      // console.log('[CardInterpretationService] Query result:', result);

      if (result.success && result.data) {
        // console.log('[CardInterpretationService] Found interpretation:', result.data);
        const localized = await this.localizeDimensionInterpretation(result.data);
        return { success: true, data: localized };
      }

      // console.log('[CardInterpretationService] No interpretation found');
      return { success: false, error: result.error || 'Card dimension interpretation not found' };
    } catch (error) {
      // console.error('[CardInterpretationService] Error in getCardInterpretationForDimension:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting card interpretation for dimension'
      };
    }
  }

  private async localizeInterpretation(
    interpretation: CardInterpretationData
  ): Promise<CardInterpretationData> {
    const locale = this.getActiveLocale();
    const candidates = this.resolveTranslationLocales(locale);

    if (!candidates.length) {
      return interpretation;
    }

    const localePlaceholders = candidates.map(() => '?').join(', ');
    const query = `
      SELECT locale, summary, detail
      FROM card_interpretation_translation
      WHERE interpretation_id = ?
        AND locale IN (${localePlaceholders})
    `;

    const translationResult = await this.dbService.query<CardInterpretationTranslationRow>(
      query,
      [interpretation.id, ...candidates]
    );

    if (!translationResult.success || !translationResult.data?.length) {
      return interpretation;
    }

    const priorityMap = this.createLocalePriorityMap(candidates);
    const best = translationResult.data.reduce<CardInterpretationTranslationRow | null>((selected, current) => {
      if (!selected) return current;
      const currentPriority = priorityMap.get(current.locale) ?? Number.MAX_VALUE;
      const selectedPriority = priorityMap.get(selected.locale) ?? Number.MAX_VALUE;
      return currentPriority < selectedPriority ? current : selected;
    }, null);

    if (!best) {
      return interpretation;
    }

    return {
      ...interpretation,
      summary: best.summary ?? interpretation.summary,
      detail: best.detail ?? interpretation.detail,
    };
  }

  private async localizeDimensionInterpretation(
    interpretation: CardInterpretationDimensionData
  ): Promise<CardInterpretationDimensionData> {
    const locale = this.getActiveLocale();
    const candidates = this.resolveTranslationLocales(locale);

    if (!candidates.length) {
      return interpretation;
    }

    const localePlaceholders = candidates.map(() => '?').join(', ');
    const query = `
      SELECT locale, aspect, content
      FROM card_interpretation_dimension_translation
      WHERE dimension_interpretation_id = ?
        AND locale IN (${localePlaceholders})
    `;

    const translationResult = await this.dbService.query<CardInterpretationDimensionTranslationRow>(
      query,
      [interpretation.id, ...candidates]
    );

    if (!translationResult.success || !translationResult.data?.length) {
      return interpretation;
    }

    const priorityMap = this.createLocalePriorityMap(candidates);
    const best = translationResult.data.reduce<CardInterpretationDimensionTranslationRow | null>((selected, current) => {
      if (!selected) return current;
      const currentPriority = priorityMap.get(current.locale) ?? Number.MAX_VALUE;
      const selectedPriority = priorityMap.get(selected.locale) ?? Number.MAX_VALUE;
      return currentPriority < selectedPriority ? current : selected;
    }, null);

    if (!best) {
      return interpretation;
    }

    return {
      ...interpretation,
      aspect: best.aspect ?? interpretation.aspect,
      content: best.content ?? interpretation.content,
    };
  }

  private getActiveLocale(): string {
    const active = (i18n?.language as string | undefined) ?? DEFAULT_LOCALE;
    return active || DEFAULT_LOCALE;
  }

  private resolveTranslationLocales(locale: string): string[] {
    const normalized = locale?.replace('_', '-') ?? '';
    const candidates: string[] = [];

    const pushCandidate = (value?: string) => {
      if (!value) return;
      if (!candidates.includes(value)) {
        candidates.push(value);
      }
    };

    pushCandidate(locale);
    pushCandidate(normalized);
    pushCandidate(normalized.toLowerCase());

    if (normalized.includes('-')) {
      const [lang, region] = normalized.split('-');
      pushCandidate(`${lang}-${region.toUpperCase()}`);
      pushCandidate(lang);
    } else if (normalized) {
      const lang = normalized;
      pushCandidate(`${lang}-${lang.toUpperCase()}`);
      if (lang === 'en') {
        pushCandidate('en-US');
      } else if (lang === 'zh') {
        pushCandidate('zh-CN');
      }
    }

    pushCandidate(DEFAULT_LOCALE);

    return candidates;
  }

  private createLocalePriorityMap(locales: string[]): Map<string, number> {
    return new Map(locales.map((value, index) => [value, index]));
  }
}
