import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { UserDatabaseService } from '../../lib/database/user-db';
import { CardService } from '../../lib/services/CardService';
import { CardImageLoader } from '../reading/CardImageLoader';
import type { ParsedUserHistory } from '../../lib/types/user';
import type { Card } from '../../lib/types/config';
import { useTranslation } from '@/lib/hooks/useTranslation';

const FALLBACK_CARD_IMAGE = 'major/00-fool.jpg';

const cleanCardIdentifier = (value?: string): string => {
  if (!value) {
    return '';
  }

  let normalized = value;
  try {
    normalized = value.normalize('NFKC');
  } catch {
    normalized = value;
  }

  return normalized
    .replace(/[(（][^()（）]*[)）]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '')
    .toLowerCase();
};

interface HistoryDetailProps {
  historyId: string;
  onBack: () => void;
  style?: any;
}

export const HistoryDetail: React.FC<HistoryDetailProps> = ({
  historyId,
  onBack,
  style,
}) => {
  const { t, i18n } = useTranslation('history');
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
  const [history, setHistory] = useState<ParsedUserHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardsData, setCardsData] = useState<Card[]>([]);

  const userDbService = UserDatabaseService.getInstance();
  const cardService = CardService.getInstance();
  const opacity = useSharedValue(0);
  const headerScale = useSharedValue(0.9);

  const loadCardsData = useCallback(async () => {
    try {
      const response = await cardService.getAllCards();
      if (response.success && response.data) {
        setCardsData(response.data);
      }
    } catch (error) {
      console.error('Error loading cards data:', error);
    }
  }, [cardService]);

  const loadHistoryDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const historyData = await userDbService.getUserHistoryById(historyId);

      if (historyData) {
        console.log('History data loaded:', historyData);
        if (historyData.result?.interpretation?.card_interpretations) {
          console.log('Card interpretations:', historyData.result.interpretation.card_interpretations);
        }
        setHistory(historyData);
        // 入场动画
        opacity.value = withTiming(1, { duration: 500 });
        headerScale.value = withSpring(1, { damping: 15 });
      } else {
        setError(t('detail.notFound'));
      }
    } catch (err) {
      console.error('Error loading history detail:', err);
      setError(t('detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [historyId, opacity, headerScale, t, userDbService]);

  useEffect(() => {
    loadHistoryDetail();
  }, [loadHistoryDetail]);

  useEffect(() => {
    loadCardsData();
  }, [loadCardsData, locale]);

  // 格式化时间 - 显示完整的日期时间
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      } as Intl.DateTimeFormatOptions);
    } catch {
      return timestamp;
    }
  };

  // 分享历史记录
  const handleShare = async () => {
    if (!history) return;

    try {
      const modeLabel =
        history.interpretation_mode === 'ai'
          ? t('detail.mode.aiLabel')
          : t('detail.mode.basicLabel');
      const shareContent = t('detail.share.message', {
        time: formatDateTime(history.timestamp),
        mode: modeLabel,
        summary: history.result?.interpretation?.overall || t('detail.shareSummaryFallback'),
      });

      await Share.share({
        message: shareContent,
        title: t('detail.share.title'),
      });
    } catch (error) {
      console.error('Failed to share history record:', error);
    }
  };

  // 删除历史记录
  const handleDelete = () => {
    Alert.alert(
      t('detail.delete.confirmTitle'),
      t('detail.delete.confirmMessage'),
      [
        { text: t('detail.delete.cancel'), style: 'cancel' },
        {
          text: t('detail.delete.confirmAction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await userDbService.deleteUserHistory(historyId);
              onBack();
            } catch (err) {
              console.error('Failed to delete history record:', err);
              Alert.alert(t('detail.delete.failed'), t('detail.delete.retryLater'));
            }
          },
        },
      ]
    );
  };

  const findCardByIdOrName = useCallback(
    (cardId?: number, cardName?: string): Card | undefined => {
      if (typeof cardId === 'number' && Number.isFinite(cardId)) {
        const matchById = cardsData.find(card => card.id === cardId);
        if (matchById) {
          return matchById;
        }
      }

      if (cardName) {
        const targetKey = cleanCardIdentifier(cardName);
        if (!targetKey || cardsData.length === 0) {
          return undefined;
        }

        return cardsData.find(card => {
          const candidates = [card.name, card.localizedName].filter(
            (value): value is string => Boolean(value)
          );
          return candidates.some(candidate => cleanCardIdentifier(candidate) === targetKey);
        });
      }

      return undefined;
    },
    [cardsData]
  );

  const resolveCardPresentation = useCallback(
    (cardId?: number, cardName?: string) => {
      const matchedCard = findCardByIdOrName(cardId, cardName);

      return {
        card: matchedCard,
        imageUrl: matchedCard?.image_url ?? FALLBACK_CARD_IMAGE,
        displayName: matchedCard?.localizedName ?? matchedCard?.name ?? cardName,
      };
    },
    [findCardByIdOrName]
  );

  const formatDirectionLabel = (direction?: string) => {
    if (!direction) return '';
    const normalized = direction.toLowerCase();
    if (normalized.includes('upright') || normalized.includes('正')) {
      return t('detail.direction.upright');
    }
    if (normalized.includes('reverse') || normalized.includes('逆')) {
      return t('detail.direction.reversed');
    }
    return direction;
  };

  const isReversedDirection = (direction?: string) => {
    if (!direction) return false;
    const normalized = direction.toLowerCase();
    return normalized.includes('reverse') || normalized.includes('逆');
  };

  // 渲染AI占卜的卡牌解读（样式与ai-result.tsx一致）
  const renderAICardInterpretation = (cardInterpretation: any, index: number) => {
    const { imageUrl, displayName } = resolveCardPresentation(
      cardInterpretation.card_id,
      cardInterpretation.card_name
    );

    return (
      <View key={index} style={styles.aiDimensionCard}>
        <View style={styles.aiCardHeader}>
          <View style={styles.aiPositionBadge}>
            <Text style={styles.aiPositionText}>{cardInterpretation.position || (index + 1)}</Text>
          </View>
          <View style={styles.aiCardInfoSection}>
            <Text style={styles.aiCardName}>
              {displayName || t('detail.cardFallback', { index: index + 1 })}
            </Text>
            <Text style={styles.aiCardDirection}>
              {formatDirectionLabel(cardInterpretation.direction)}
            </Text>
          </View>
        </View>

        <View style={styles.aiCardContent}>
          {/* 卡牌图片区域 */}
          <View style={styles.aiCardImageSection}>
            <CardImageLoader
              imageUrl={imageUrl}
              width={120}
              height={200}
              style={[
                styles.aiCardImageLarge,
                isReversedDirection(cardInterpretation.direction) && styles.aiCardImageReversed
              ]}
              resizeMode="contain"
            />
          </View>

          {/* 维度信息 */}
          <View style={styles.aiDimensionInfo}>
            <Text style={styles.aiDimensionName}>
              {cardInterpretation.dimension_aspect?.dimension_name ||
                t('detail.dimensionFallback', { index: index + 1 })}
            </Text>
          </View>

          {/* 基础牌意 */}
          <View style={styles.aiBasicInterpretationContainer}>
            <Text style={styles.aiInterpretationLabel}>{t('detail.section.basicSummary')}</Text>
            <Text style={styles.aiBasicInterpretation}>
              {cardInterpretation.basic_summary}
            </Text>
          </View>

          {/* AI详细解读 */}
          <View style={styles.aiDetailedInterpretationContainer}>
            <Text style={styles.aiInterpretationLabel}>{t('detail.section.aiDetailed')}</Text>
            <Text style={styles.aiDetailedInterpretation}>
              {cardInterpretation.ai_interpretation}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // 渲染基础占卜的卡牌解读（使用AI解读的样式）
  const renderBasicCardInterpretation = (cardData: any, index: number) => {
    const { imageUrl, displayName } = resolveCardPresentation(cardData.cardId, cardData.cardName);

    return (
      <View key={index} style={styles.aiDimensionCard}>
        <View style={styles.aiCardHeader}>
          <View style={styles.aiPositionBadge}>
            <Text style={styles.aiPositionText}>{index + 1}</Text>
          </View>
          <View style={styles.aiCardInfoSection}>
            <Text style={styles.aiCardName}>
              {displayName || t('detail.cardFallback', { index: index + 1 })}
            </Text>
            <Text style={styles.aiCardDirection}>
              {formatDirectionLabel(cardData.direction)}
            </Text>
          </View>
        </View>

        <View style={styles.aiCardContent}>
          {/* 卡牌图片区域 */}
          <View style={styles.aiCardImageSection}>
            <CardImageLoader
              imageUrl={imageUrl}
              width={120}
              height={200}
              style={[
                styles.aiCardImageLarge,
                isReversedDirection(cardData.direction) && styles.aiCardImageReversed
              ]}
              resizeMode="contain"
            />
          </View>

          {/* 维度信息 */}
          {cardData.dimensionInterpretations && cardData.dimensionInterpretations.length > 0 && (
            <View style={styles.aiDimensionInfo}>
              <Text style={styles.aiDimensionName}>
                {cardData.dimensionInterpretations[0]?.dimensionName ||
                  t('detail.dimensionFallback', { index: index + 1 })}
              </Text>
            </View>
          )}

          {/* 基础牌意 */}
          {cardData.summary && (
            <View style={styles.aiBasicInterpretationContainer}>
              <Text style={styles.aiInterpretationLabel}>{t('detail.section.basicSummary')}</Text>
              <Text style={styles.aiBasicInterpretation}>
                {cardData.summary}
              </Text>
            </View>
          )}

          {/* 详细解读 */}
          {cardData.detail && (
            <View style={styles.aiDetailedInterpretationContainer}>
              <Text style={styles.aiInterpretationLabel}>{t('detail.section.detailed')}</Text>
              <Text style={styles.aiDetailedInterpretation}>
                {cardData.detail}
              </Text>
            </View>
          )}

          {/* 维度解读 */}
          {cardData.dimensionInterpretations?.map((dim: any, dimIndex: number) => (
            <View key={dimIndex} style={styles.aiDetailedInterpretationContainer}>
              <Text style={styles.aiInterpretationLabel}>
                {t('detail.section.dimension', {
                  name: dim.dimensionName ||
                    t('detail.dimensionFallback', { index: dimIndex + 1 }),
                })}
              </Text>
              <Text style={styles.aiDetailedInterpretation}>{dim.content}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('detail.loading')}</Text>
      </View>
    );
  }

  if (error || !history) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || t('detail.recordMissing')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>{t('detail.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAI = history.interpretation_mode === 'ai';
  const interpretation = history.result?.interpretation;

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 简化的头部信息 */}
        <Animated.View style={[styles.infoSection, headerAnimatedStyle]}>
          <View style={styles.typeAndActions}>
            <View style={[
              styles.typeBadge,
              { backgroundColor: isAI ? '#00ced1' : '#ffd700' }
            ]}>
              <Text style={styles.typeBadgeText}>
                {isAI ? t('detail.mode.ai') : t('detail.mode.basic')}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionIcon}>↗</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Text style={styles.actionIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* AI占卜的各维度解读 */}
        {isAI && interpretation?.card_interpretations && (
          <View style={styles.aiDimensionsContainer}>
            <Text style={styles.aiSectionTitle}>
              {interpretation?.user_description || t('detail.userDescriptionFallback')}
            </Text>
            {interpretation.card_interpretations.map((cardInterpretation: any, index: number) =>
              renderAICardInterpretation(cardInterpretation, index)
            )}
          </View>
        )}

        {/* 综合分析 */}
        {interpretation?.overall && (
          <Animated.View entering={FadeInDown.delay(200)} style={isAI ? styles.aiOverallContainer : styles.overallSection}>
            <Text style={isAI ? styles.aiSectionTitle : styles.sectionTitle}>
              {isAI ? t('detail.overall.titleAI') : t('detail.overall.titleBasic')}
            </Text>
            <View style={isAI ? styles.aiOverallContentContainer : styles.overallContainer}>
              <Text style={isAI ? styles.aiOverallSummary : styles.overallText}>
                {interpretation.overall}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* AI占卜的关键洞察 */}
        {isAI && interpretation?.insights && interpretation.insights.length > 0 && (
          <View style={styles.aiInsightsContainer}>
            <Text style={styles.aiSectionTitle}>{t('detail.insightsTitle')}</Text>
            {interpretation.insights.map((insight: string, index: number) => (
              <View key={index} style={styles.aiInsightItem}>
                <Text style={styles.aiInsightBullet}>{t('detail.insightBullet')}</Text>
                <Text style={styles.aiInsightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 基础占卜的卡牌解读 */}
        {!isAI && interpretation?.cards && (
          <View style={styles.aiDimensionsContainer}>
            <Text style={styles.aiSectionTitle}>
              {history.result?.metadata?.theme || t('detail.cardsTitle')}
            </Text>
            {interpretation.cards.map((cardData: any, index: number) =>
              renderBasicCardInterpretation(cardData, index)
            )}
          </View>
        )}

        {/* 底部间距 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A', // 与ai-result.tsx一致的背景色
  },
  // 自定义标题栏样式（与占卜历史页面保持一致）
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60, // 确保最小高度一致
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  headerBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // 与backButton保持平衡
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // AI占卜专用头部样式
  aiHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  aiTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiSubtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  // 信息区域样式（简化后的头部）
  infoSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  questionSection: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    color: '#e6e6fa',
    lineHeight: 24,
    textAlign: 'center',
  },
  typeAndActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIconText: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: '300',
  },
  title: {
    color: '#e6e6fa',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTime: {
    color: '#e6e6fa',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  badgeText: {
    color: '#1a1a2e',
    fontSize: 12,
    fontWeight: '600',
  },
  // AI占卜各维度解读样式（与ai-result.tsx一致）
  aiDimensionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 32,
  },
  aiSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  aiDimensionCard: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiPositionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiPositionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F0F1A',
  },
  aiCardInfoSection: {
    flex: 1,
  },
  aiCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 2,
  },
  aiCardDirection: {
    fontSize: 14,
    color: '#CCCCCC',
    textTransform: 'capitalize',
  },
  aiCardContent: {
    alignItems: 'center',
    gap: 16,
  },
  aiCardImageSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCardImageLarge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  aiCardImageReversed: {
    transform: [{ rotate: '180deg' }],
  },
  aiDimensionInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
  },
  aiDimensionName: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  aiBasicInterpretationContainer: {
    width: '100%',
    marginBottom: 16,
  },
  aiDetailedInterpretationContainer: {
    width: '100%',
  },
  aiInterpretationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  aiBasicInterpretation: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'center',
  },
  aiDetailedInterpretation: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'left',
  },
  // AI占卜综合分析样式
  aiOverallContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  aiOverallContentContainer: {
    // 容器样式，用于包装内容
  },
  aiOverallSummary: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  // AI占卜关键洞察样式
  aiInsightsContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  aiInsightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiInsightBullet: {
    fontSize: 16,
    color: '#FFD700',
    marginRight: 8,
    marginTop: 2,
  },
  aiInsightText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  // 基础占卜样式
  overallSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  sectionTitle: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overallContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  overallText: {
    color: '#e6e6fa',
    fontSize: 16,
    lineHeight: 24,
  },
  cardsSection: {
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardPosition: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPositionText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  cardDirection: {
    color: '#8b8878',
    fontSize: 12,
    backgroundColor: 'rgba(139, 136, 120, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expandIcon: {
    color: '#ffd700',
    fontSize: 16,
  },
  cardSummary: {
    color: '#e6e6fa',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardDetail: {
    color: '#8b8878',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  dimensionContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  dimensionName: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  dimensionContent: {
    color: '#e6e6fa',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingText: {
    color: '#e6e6fa',
    marginTop: 12,
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    color: '#8b0000',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
