import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useReadingFlow } from '@/lib/contexts/ReadingContext';
import { CardInterpretationService } from '@/lib/services/CardInterpretationService';
import { DimensionService } from '@/lib/services/DimensionService';
import { getCardImage } from '@/lib/utils/cardImages';
import { CardImageLoader } from '@/components/reading/CardImageLoader';
import { useTranslation } from 'react-i18next';

interface DetailedReading {
  card: {
    id: number;
    name: string;
    displayName?: string;
    imageUrl: string;
    direction: 'upright' | 'reversed';
    position: string;
  };
  dimension: {
    id: number;
    name: string;
    category: string;
    aspect: string;
    aspect_type: number;
  };
  interpretation: {
    summary: string;
    detailedContent: string;
  };
}

export default function BasicReadingScreen() {
  const router = useRouter();
  const { state, resetFlow, saveToHistory, updateInterpretations } = useReadingFlow();
  const [readings, setReadings] = useState<DetailedReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false); // 本地保存状态标记
  const { t } = useTranslation('reading');
  const { t: tCommon } = useTranslation('common');

  const interpretationService = CardInterpretationService.getInstance();
  const dimensionService = DimensionService.getInstance();

  useEffect(() => {
    generateDetailedReading();
  }, []);

  // 新增：在解读数据更新且渲染完成后自动保存
  useEffect(() => {
    // 检查条件：1. 数据加载完成 2. 有解读数据 3. 未保存过(使用本地状态)
    if (!loading && readings.length > 0 && !hasSaved) {
      const autoSave = async () => {
        try {
          await saveToHistory();
          setHasSaved(true); // 设置本地保存标记
          console.log('基础解读渲染完成后自动保存成功');
        } catch (error) {
          console.error('自动保存失败:', error);
        }
      };
      autoSave();
    }
  }, [loading, readings, hasSaved]); // 使用本地状态而不是Context状态

  const generateDetailedReading = async () => {
    try {
      setLoading(true);
      const detailedReadings: DetailedReading[] = [];

      // console.log('[BasicReading] Starting generateDetailedReading');
      // console.log('[BasicReading] state.selectedCards:', state.selectedCards);

      // 按 aspect_type 排序选择的卡牌 (1=过去, 2=现在, 3=将来)
      const sortedSelectedCards = [...state.selectedCards].sort((a, b) =>
        a.dimension.aspect_type - b.dimension.aspect_type
      );

      // console.log('[BasicReading] sortedSelectedCards:', sortedSelectedCards);

      for (let i = 0; i < sortedSelectedCards.length; i++) {
        const selectedCard = sortedSelectedCards[i];
        // console.log(`[BasicReading] Processing card ${i + 1}:`, selectedCard);
        // console.log(`[BasicReading] Card dimension:`, selectedCard.dimension);

        // 获取详细维度解读
        const interpretation = await interpretationService.getCardInterpretationForDimension(
          selectedCard.name,
          selectedCard.direction === 'upright' ? '正位' : '逆位',
          selectedCard.dimension.name,
          selectedCard.dimension.aspect_type.toString(),
          selectedCard.dimension.id
        );

        // console.log(`[BasicReading] Card ${i + 1} interpretation result:`, interpretation);

        // 获取基础牌意
        const basicInterpretation = await interpretationService.getCardInterpretation(
          selectedCard.cardId,
          selectedCard.direction === 'upright' ? '正位' : '逆位'
        );

        // console.log(`[BasicReading] Card ${i + 1} basic interpretation:`, basicInterpretation);

        detailedReadings.push({
          card: {
            id: selectedCard.cardId,
            name: selectedCard.name,
            displayName: selectedCard.displayName ?? selectedCard.name,
            imageUrl: selectedCard.imageUrl,
            direction: selectedCard.direction,
            position: selectedCard.position,
          },
          dimension: selectedCard.dimension,
          interpretation: {
            summary: basicInterpretation.success ? basicInterpretation.data?.summary || '' : '',
            detailedContent: interpretation.success
              ? interpretation.data?.content || ''
              : t('shared.errors.noDetailedInterpretation'),
          },
        });
      }

      // console.log('[BasicReading] Final detailedReadings:', detailedReadings);
      setReadings(detailedReadings);

      // 将解读数据同步到ReadingContext中
      const interpretationData = detailedReadings.map(reading => ({
        cardId: reading.card.id,
        cardName: reading.card.name, // 添加牌名
        position: reading.card.position,
        direction: reading.card.direction,
        summary: reading.interpretation.summary,
        detail: reading.interpretation.detailedContent,
      }));

      updateInterpretations(interpretationData);
      console.log('[BasicReading] Updated interpretations in context:', interpretationData);

      // 移除这里的自动保存逻辑，移到useEffect中处理
    } catch (error) {
      console.error('[BasicReading] Error generating detailed reading:', error);
      Alert.alert(
        t('aiResult.errors.title'),
        t('shared.errors.basicGenerateFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  // const handleSaveToHistory = async () => {
  //   try {
  //     setSaving(true);
  //     const savedId = await saveToHistory();
  //     Alert.alert(
  //       '保存成功',
  //       '请到占卜历史中查阅。',
  //       [{ text: '了解', onPress: handleComplete }]
  //     );
  //   } catch (error) {
  //     console.error('Error saving to history:', error);
  //     const errorMessage = error instanceof Error ? error.message : '保存记录失败，请重试';
  //     Alert.alert('错误', errorMessage);
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handleComplete = () => {
    resetFlow();
    router.replace('/(tabs)');
  };

  const handleNewReading = () => {
    resetFlow();
    router.replace('/(reading)/type');
  };

  const getDirectionText = (direction: 'upright' | 'reversed') =>
    direction === 'upright'
      ? t('shared.components.cardFlip.upright')
      : t('shared.components.cardFlip.reversed');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.loadingText}>{t('basic.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('basic.title')}</Text>
        <Text style={styles.subtitle}>
          {t('basic.subtitle', { category: state.categoryDisplayName ?? state.category })}
        </Text>
      </View>

      <View style={styles.readingsContainer}>
        {readings.map((reading, index) => (
          <View key={index} style={styles.readingCard}>
            <View style={styles.cardHeader}>
              <View style={styles.positionBadge}>
                <Text style={styles.positionText}>{index + 1}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>
                  {reading.card.displayName ?? reading.card.name}
                </Text>
                <Text style={styles.cardDirection}>{getDirectionText(reading.card.direction)}</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardImageSection}>
                <CardImageLoader
                  imageUrl={reading.card.imageUrl}
                  width={120}
                  height={200}
                  style={[
                    styles.cardImageLarge,
                    reading.card.direction === 'reversed' && styles.cardImageReversed
                  ]}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.dimensionInfo}>
                <Text style={styles.dimensionTitle}>
                  {reading.dimension.localizedAspect ?? reading.dimension.aspect}
                </Text>
                {/* <Text style={styles.dimensionAspect}>{reading.dimension.aspect}</Text> */}
              </View>

              <View style={styles.basicInterpretationContainer}>
          <Text style={styles.interpretationLabel}>
            {t('basic.labels.basic')}
          </Text>
                <Text style={styles.interpretationSummary}>{reading.interpretation.summary}</Text>
              </View>

              <View style={styles.detailedInterpretationContainer}>
          <Text style={styles.interpretationLabel}>
            {t('basic.labels.detail')}
          </Text>
                <Text style={styles.interpretationDetail}>{reading.interpretation.detailedContent}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actionsContainer}>
        {/* <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleSaveToHistory}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0F0F1A" />
          ) : (
          <Text style={styles.primaryButtonText}>
            {t('shared.buttons.saveRecord')}
          </Text>
          )}
        </TouchableOpacity> */}

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleNewReading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            {t('shared.buttons.readAgain')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.tertiaryButton]}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.tertiaryButtonText}>
            {t('shared.buttons.backHome')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('basic.footer')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F0F1A',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#CCCCCC',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  readingsContainer: {
    gap: 24,
    marginBottom: 32,
  },
  readingCard: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  positionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F0F1A',
  },
  cardInfo: {
    flex: 1,
  },
  cardContent: {
    alignItems: 'center',
    gap: 16,
  },
  cardImageSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  cardImageLarge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  cardImageReversed: {
    transform: [{ rotate: '180deg' }],
  },
  dimensionInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
  },
  dimensionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dimensionAspect: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  basicInterpretationContainer: {
    width: '100%',
    marginBottom: 16,
  },
  detailedInterpretationContainer: {
    width: '100%',
  },
  interpretationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  interpretationSummary: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'center',
  },
  interpretationDetail: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
    textAlign: 'left',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 2,
  },
  cardDirection: {
    fontSize: 14,
    color: '#CCCCCC',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 25,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F0F1A',
  },
  secondaryButton: {
    backgroundColor: '#4ECDC4',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  tertiaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888888',
  },
});
