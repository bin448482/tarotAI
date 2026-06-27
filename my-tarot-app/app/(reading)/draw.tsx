import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useReadingFlow } from '@/lib/contexts/ReadingContext';
import { CardService } from '@/lib/services/CardService';
import { DimensionService } from '@/lib/services/DimensionService';
import { CardInterpretationService } from '@/lib/services/CardInterpretationService';
import { CardFlipAnimation } from '@/components/reading/CardFlipAnimation';
import { DragDropContainer } from '@/components/reading/DragDropContainer';
import { SimpleTestCard } from '@/components/reading/SimpleTestCard';
import { useTranslation } from 'react-i18next';
import type { DimensionData } from '@/lib/contexts/ReadingContext';

interface DrawnCard {
  cardId: number;
  name: string;
  displayName?: string;
  imageUrl: string;
  position: string;
  dimension: DimensionData;
  direction: 'upright' | 'reversed';
  revealed: boolean;
  basicSummary?: string;
}

export default function DrawCardsScreen() {
  const router = useRouter();
  const { state, updateStep, updateCards, resetFlow } = useReadingFlow();
  const { t } = useTranslation('reading');
  const { t: tCommon } = useTranslation('common');
  const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
  const [dimensions, setDimensions] = useState<DimensionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [allCardsPlaced, setAllCardsPlaced] = useState(false);
  const [isDragMode, setIsDragMode] = useState(true); // 直接进入拖拽模式
  const [error, setError] = useState<string | null>(null);
  const [canTriggerStars, setCanTriggerStars] = useState(false); // 新增：控制特效触发
  const [isEffectDisabled, setIsEffectDisabled] = useState(false); // 新增：全局特效禁用状态

  const cardService = CardService.getInstance();
  const dimensionService = DimensionService.getInstance();
  const interpretationService = CardInterpretationService.getInstance();

  useEffect(() => {
    loadDimensions();
  }, []);

  // 添加硬件返回键拦截 - 只在页面聚焦时生效
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // 根据占卜类型判断积分扣除状态
        const isAIReading = state.type === 'ai';
        const hasConsumedCredits = isAIReading && state.userDescription && state.aiDimensions;

        const title = t('shared.alerts.confirmExit.title');
        const message = hasConsumedCredits
          ? t('shared.alerts.confirmExit.afterAnalysis')
          : t('shared.alerts.confirmExit.default');

        Alert.alert(
          title,
          message,
          [
            {
              text: tCommon('app.cancel'),
              style: 'cancel',
            },
            {
              text: t('shared.buttons.confirmReturn'),
              onPress: () => {
                // 清除状态并直接跳转到选择占卜类型页面
                resetFlow();
                router.push('/(reading)/type');
              },
            },
          ]
        );
        return true; // 阻止默认返回行为
      });

      return () => backHandler.remove();
    }, [router, resetFlow, state.type, state.userDescription, state.aiDimensions])
  );

  const loadDimensions = async () => {
    try {
      // 使用从步骤2传递过来的dimensions数据，而不是重新查询数据库
      if (state.type === 'ai' && state.aiDimensions) {
        // AI模式：使用推荐的维度
        console.log('AI模式：使用推荐维度', state.aiDimensions);
        const sortedDimensions = [...state.aiDimensions].sort((a, b) => a.aspect_type - b.aspect_type);
        setDimensions(sortedDimensions.slice(0, 3)); // 取前3个维度
      } else if (state.type === 'offline' && state.dimensions && state.dimensions.length > 0) {
        // 离线模式：使用现有逻辑
        console.log('离线模式：使用选择的维度', state.dimensions);
        const sortedDimensions = [...state.dimensions].sort((a, b) => a.aspect_type - b.aspect_type);
        setDimensions(sortedDimensions.slice(0, 3)); // 取前3个维度
      } else {
        console.warn('No dimensions found in reading state', {
          type: state.type,
          aiDimensions: state.aiDimensions,
          dimensions: state.dimensions
        });
        // 如果没有维度数据，设置错误状态
        setError(t('shared.errors.missingDimensions'));
      }
    } catch (error) {
      console.error('Error loading dimensions:', error);
      setError(t('shared.errors.dimensionLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDrawCards = async () => {
    try {
      setIsDrawing(true);
      setError(null); // 清除之前的错误

      // 检查维度数据
      if (!dimensions || dimensions.length < 3) {
        throw new Error(t('shared.errors.missingDimensions'));
      }

      // 点击抽牌按钮时开始3秒计时
      setTimeout(() => {
        setCanTriggerStars(true);
      }, 3000);

      // 1. 获取所有卡牌并随机抽取3张
      const cardsResult = await cardService.getAllCards();
      if (!cardsResult.success || !cardsResult.data) {
        throw new Error(t('shared.errors.cardDataFailed'));
      }

      if (cardsResult.data.length < 3) {
        throw new Error(t('shared.errors.insufficientCards'));
      }

      const shuffled = [...cardsResult.data].sort(() => Math.random() - 0.5);
      const selectedCards = shuffled.slice(0, 3);

      // 2. 获取基础牌意
      const cardsWithInterpretation = await Promise.all(
        selectedCards.map(async (card, index) => {
          const direction = Math.random() > 0.5 ? 'upright' : 'reversed';
          const interpretation = await interpretationService.getCardInterpretation(
            card.id,
            direction === 'upright' ? '正位' : '逆位'
          );

        return {
          cardId: card.id,
          name: card.name,
          displayName: card.localizedName ?? card.name,
          imageUrl: card.image_url,
        position:
          dimensions[index]?.localizedAspect ??
          dimensions[index]?.aspect ??
          t('draw.positionFallback', { index: index + 1 }),
            dimension: dimensions[index],
            direction,
            revealed: false, // 初始状态显示牌背，只有放入卡槽才翻牌
            basicSummary: interpretation.success ? interpretation.data?.summary : undefined,
          };
        })
      );

      setDrawnCards(cardsWithInterpretation);
    } catch (error) {
      console.error('Error drawing cards:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : t('shared.errors.drawFailed');
      setError(errorMessage);
    } finally {
      setIsDrawing(false);
    }
  };

  // 移除不需要的处理函数
  // const handleCardClick = (index: number) => {
  //   const card = drawnCards[index];
  //   if (card.basicSummary) {
  //     Alert.alert(
  //       `${card.name} (${card.direction})`,
  //       card.basicSummary,
  //       [{ text: '了解', style: 'default' }]
  //     );
  //   }
  // };

  // 移除不需要的翻牌功能，直接在抽牌后显示卡牌
  // const handleRevealAll = () => {...}

  const handleContinue = () => {
    updateCards(drawnCards);
    updateStep(4);

    if (state.type === 'ai') {
      router.push('/(reading)/ai-result');
    } else {
      router.push('/(reading)/basic');
    }
  };

  const handleCardPlacement = (cardId: number, slotIndex: number) => {
    // 检查是否在3秒内放入卡槽，如果是则禁用所有特效
    if (!canTriggerStars) {
      setIsEffectDisabled(true);
      console.log('3秒内放入卡槽，禁用所有特效');
    }

    // 更新drawnCards中的dimension绑定，并且设置为revealed状态
    setDrawnCards(prev => prev.map(card =>
      card.cardId === cardId
        ? {
            ...card,
            dimension: dimensions[slotIndex],
            position: dimensions[slotIndex].localizedAspect ?? dimensions[slotIndex].aspect,
            revealed: true // 放入卡槽时自动翻牌
          }
        : card
    ));
  };

  const handleAllCardsPlaced = () => {
    setAllCardsPlaced(true);
  };

  const handleCardPress = (card: DrawnCard) => {
    if (card.basicSummary) {
      Alert.alert(
        `${card.displayName ?? card.name} (${card.direction})`,
        card.basicSummary,
        [{ text: '了解', style: 'default' }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
    <Text style={styles.loadingText}>
      {t('shared.status.loadingDimensions')}
    </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('draw.title')}</Text>
        <Text style={styles.subtitle}>
          {state.type === 'ai'
            ? t('draw.subtitle.ai')
            : t('draw.subtitle.offline')}
        </Text>
      </View>


      {/* 拖拽界面 - 主要界面 */}
      <View style={styles.dragDropContainer}>
        {/* 暂时注释测试卡片 */}
        {/*
        <View style={styles.testCardContainer}>
          <Text style={styles.testLabel}>{t('draw.debug.dragTest')}</Text>
          <SimpleTestCard onDrag={(id, x, y) => console.log('Test drag:', x, y)} />
        </View>
        */}

        <DragDropContainer
          dimensions={dimensions}
          drawnCards={drawnCards}
          onCardPlacement={handleCardPlacement}
          onAllCardsPlaced={handleAllCardsPlaced}
          onCardPress={handleCardPress}
          canTriggerStars={canTriggerStars && !isEffectDisabled} // 特效触发需要满足两个条件
        />
      </View>


      <View style={styles.actionsContainer}>
        {drawnCards.length === 0 ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.drawButton]}
            onPress={handleDrawCards}
            disabled={isDrawing}
            activeOpacity={0.8}
          >
            {isDrawing ? (
              <ActivityIndicator size="small" color="#0F0F1A" />
            ) : (
            <Text style={styles.drawButtonText}>
              {t('draw.buttons.draw')}
            </Text>
            )}
          </TouchableOpacity>
        ) : allCardsPlaced ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton]}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {state.type === 'ai'
                ? t('draw.buttons.generateAI')
                : t('draw.buttons.viewInterpretation')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.dragHintContainer}>
            <Text style={styles.dragHintText}>{t('draw.dragHint')}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('shared.stepIndicator', { current: 3, total: 4 })}
        </Text>
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
  // 移除不需要的样式常量 - 这些样式已经不再使用
  // dimensionsContainer, dimensionCard, dimensionName, dimensionDescription, dimensionPosition
  // cardsContainer, cardsRow, cardWrapper, cardInfo, cardPosition, cardDirection, emptyState, emptyText
  // revealButton, revealButtonText
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
  actionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 25,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  drawButton: {
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
  drawButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F0F1A',
  },
  // revealButton 和 revealButtonText 已移除
  continueButton: {
    backgroundColor: '#FFD700',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F0F1A',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#888888',
  },
  dragDropContainer: {
    flex: 1,
    minHeight: 400,
  },
  dragHintContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  dragHintText: {
    fontSize: 16,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '500',
  },
  // testCardContainer 和 testLabel 样式暂时保留，可能后续需要用于调试
});
