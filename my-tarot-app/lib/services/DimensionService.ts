import i18n from 'i18next';
import { ConfigDatabaseService } from '../database/config-db';
import { DEFAULT_LOCALE } from '../i18n';
import type { ServiceResponse } from '../types/database';
import type { DimensionData } from '../contexts/ReadingContext';

interface DimensionTranslationRow {
  dimension_id: number;
  locale: string;
  name?: string | null;
  description?: string | null;
  aspect?: string | null;
}

export class DimensionService {
  private static instance: DimensionService;
  private dbService: ConfigDatabaseService;

  private constructor() {
    this.dbService = ConfigDatabaseService.getInstance();
  }

  static getInstance(): DimensionService {
    if (!DimensionService.instance) {
      DimensionService.instance = new DimensionService();
    }
    return DimensionService.instance;
  }

  /**
   * 获取所有唯一的占卜类别
   */
  async getUniqueCategories(): Promise<ServiceResponse<string[]>> {
    try {
      // 取出所有分类后在应用层规整为“主类”（按第一个“-”切分）
      const result = await this.dbService.query<{ category: string }>(
        "SELECT DISTINCT category FROM dimension ORDER BY category"
      );

      if (result.success && result.data) {
        const mainSet = new Set<string>();
        for (const row of result.data) {
          const raw = row.category || '';
          const main = raw.split('-')[0].trim();
          if (main) mainSet.add(main);
        }
        const mains = Array.from(mainSet).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        return { success: true, data: mains };
      }

      return { success: false, error: result.error || 'Failed to get categories' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting categories'
      };
    }
  }

  /**
   * 根据类别获取维度数据
   */
  async getDimensionsByCategory(category: string): Promise<ServiceResponse<DimensionData[]>> {
    try {
      const result = await this.dbService.query<DimensionData>(
        'SELECT * FROM dimension WHERE category = ? ORDER BY aspect_type ASC',
        [category]
      );

      if (result.success && result.data) {
        const localized = await this.localizeDimensions(result.data);
        return { success: true, data: localized };
      }

      return { success: false, error: result.error || 'Failed to get dimensions' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting dimensions'
      };
    }
  }

  /**
   * 获取所有维度数据
   */
  async getAllDimensions(): Promise<ServiceResponse<DimensionData[]>> {
    try {
      // console.log('[DimensionService] Querying all dimensions from database...');
      
      const result = await this.dbService.query<DimensionData>(
        'SELECT * FROM dimension ORDER BY category, aspect_type ASC'
      );

      // console.log('[DimensionService] Database query result:', result);

      if (result.success && result.data) {
        // console.log(`[DimensionService] Successfully retrieved ${result.data.length} dimensions from database`);
        const localized = await this.localizeDimensions(result.data);
        return { success: true, data: localized };
      }

      // console.log('[DimensionService] Database query failed or returned no data:', result.error);
      return { success: false, error: result.error || 'Failed to get all dimensions' };
    } catch (error) {
      // console.error('[DimensionService] Error in getAllDimensions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting dimensions'
      };
    }
  }

  /**
   * 获取类别显示名称映射
   */
  async getCategoryDisplayName(category: string): Promise<string> {
    // 动态从数据库中读取显示名称，优先使用首个匹配的维度的 description/name
    try {
      const preferred = this.getPreferredGroupCategory(category);
      const res = await this.dbService.query<{ description?: string; name?: string; aspect_type?: number }>(
        'SELECT description, name, aspect_type FROM dimension WHERE category = ? ORDER BY aspect_type ASC LIMIT 1',
        [preferred]
      );
      if (res.success && res.data && res.data.length > 0) {
        const row = res.data[0] as any;
        return row.description || row.name || `${category}-时间线`;
      }

      // 回退：尝试模糊匹配任何以主类开头的 category
      const res2 = await this.dbService.query<{ description?: string; name?: string }>(
        'SELECT description, name FROM dimension WHERE category LIKE ? LIMIT 1',
        [`${category}%`]
      );
      if (res2.success && res2.data && res2.data.length > 0) {
        return (res2.data[0] as any).description || (res2.data[0] as any).name || `${category}-时间线`;
      }
    } catch (error) {
      // ignore and fallback
    }

    return `${category}-时间线`;
  }

  /**
   * 获取类别图标映射
   */
  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      '情感': '💗',
      '事业': '💼',
      '健康': '🏥',
      '学业': '📚',
      '人际关系': '🤝',
      '财富': '💰',
      '灵性': '✨',
      '决策': '❓',
      '类比': '🔁',
      '精神': '🧘',
    };
    return iconMap[category] || '🔮';
  }

  /**
   * 获取类别颜色映射
   */
  getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      '情感': '#FF6B6B',
      '事业': '#4ECDC4',
      '健康': '#45B7D1',
      '学业': '#96CEB4',
      '人际关系': '#FFEAA7',
      '财富': '#FDCB6E',
      '灵性': '#A29BFE',
      '决策': '#FD79A8',
      '类比': '#E17055',
      '精神': '#74B9FF',
    };
    return colorMap[category] || '#FFD700';
  }

  /**
   * 根据主类得到首选的“维度组类别”名称（用于后续维度查询）
   * 例如：'健康' -> '健康-身体状况'；默认 '<主类>-时间线'
   */
  getPreferredGroupCategory(mainCategory: string): string {
    const specialMap: Record<string, string> = {
      '健康': '健康-身体状况',
      '类比': '类比-生命周期',
    };
    if (specialMap[mainCategory]) return specialMap[mainCategory];
    return `${mainCategory}-时间线`;
  }

  private getActiveLocale(): string {
    const active = (i18n?.language as string | undefined) ?? DEFAULT_LOCALE;
    return active || DEFAULT_LOCALE;
  }

  private getAspectFallback(locale: string, original: string): string | undefined {
    const map: Record<string, Record<string, string>> = {
      en: {
        '过去': 'Past',
        '现在': 'Present',
        '将来': 'Future',
        '自己': 'Self',
        '对方': 'Partner',
        '关系': 'Relationship',
        '现状': 'Current Situation',
        '选择是': 'Choice A',
        '选择非': 'Choice B',
        '上玄月': 'Waxing Moon',
        '下玄月': 'Waning Moon',
        '总体趋势': 'Overall Trend',
      },
    };

    return map[locale]?.[original];
  }

  private extractAspectFromName(name?: string | null): string | undefined {
    if (!name) return undefined;

    const separators = [' - ', '：', ':', '—', '––', '—'];
    for (const separator of separators) {
      if (name.includes(separator)) {
        const parts = name.split(separator).filter(Boolean);
        if (parts.length > 0) {
          const candidate = parts[parts.length - 1]?.trim();
          if (candidate) return candidate;
        }
      }
    }

    return name.trim();
  }

  private async localizeDimensions(dimensions: DimensionData[]): Promise<DimensionData[]> {
    if (!dimensions.length) {
      return dimensions;
    }

    const locale = this.getActiveLocale();
    const normalizedLocale = locale.toLowerCase();

    if (normalizedLocale.startsWith('zh')) {
      return dimensions.map(dimension => ({
        ...dimension,
        localizedAspect: dimension.localizedAspect ?? dimension.aspect,
      }));
    }

    const ids = dimensions
      .map(dimension => dimension.id)
      .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0);

    const translationsMap = new Map<number, DimensionTranslationRow>();

    const candidateLocales = this.resolveTranslationLocales(locale);

    if (ids.length > 0 && candidateLocales.length > 0) {
      const localePlaceholders = candidateLocales.map(() => '?').join(', ');
      const idPlaceholders = ids.map(() => '?').join(', ');
      const query = `
        SELECT dimension_id, locale, name, description, aspect
        FROM dimension_translation
        WHERE locale IN (${localePlaceholders})
          AND dimension_id IN (${idPlaceholders})
      `;

      const translationResult = await this.dbService.query<DimensionTranslationRow>(
        query,
        [...candidateLocales, ...ids]
      );

      if (translationResult.success && translationResult.data) {
        const priorityMap = this.createLocalePriorityMap(candidateLocales);
        translationResult.data.forEach(row => {
          const existing = translationsMap.get(row.dimension_id);
          if (!existing) {
            translationsMap.set(row.dimension_id, row);
            return;
          }

          const existingPriority = priorityMap.get(existing.locale) ?? Number.MAX_VALUE;
          const newPriority = priorityMap.get(row.locale) ?? Number.MAX_VALUE;
          if (newPriority < existingPriority) {
            translationsMap.set(row.dimension_id, row);
          }
        });
      }
    }

    return dimensions.map(dimension => {
      const translation = translationsMap.get(dimension.id);
      const localizedAspect =
        translation?.aspect?.trim() ||
        this.extractAspectFromName(translation?.name) ||
        this.getAspectFallback(normalizedLocale, dimension.aspect) ||
        dimension.localizedAspect ||
        dimension.aspect;

      return {
        ...dimension,
        name: translation?.name ?? dimension.name,
        description: translation?.description ?? dimension.description,
        localizedAspect,
      };
    });
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
