import React, { useState, useEffect, useCallback } from 'react';
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
import AIReadingService from '@/lib/services/AIReadingService';
import { CardImageLoader } from '@/components/reading/CardImageLoader';
import { useTranslation } from 'react-i18next';

interface AIResult {
  dimension_summaries?: Record<string, string>; // Optional for backward compatibility
  overall_summary: string;
  insights: string[];
  generated_at: string;
  // Primary response payload
  card_interpretations: {
    card_id: number;
    card_name: string;
    direction: string;
    position: number;
    ai_interpretation: string;
    basic_summary: string;
    dimension_aspect?: {
      dimension_name: string;
      interpretation: string;
    };
  }[];
  dimensions: {
    id: number;
    name: string;
    aspect: string;
    aspect_type: number;
    category: string;
    description: string;
  }[];
}

export default function AIResultScreen() {
  const router = useRouter();
  const { state, updateAIResult, resetFlow, saveToHistory, updateInterpretations } = useReadingFlow();
  const { t } = useTranslation('reading');
  const { t: tCommon } = useTranslation('common');
  const { t: tCards } = useTranslation('cards');

  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasSaved, setHasSaved] = useState(false); // Tracks local save status

  const resolveCardDisplayName = useCallback(
    (cardId: number, fallback: string) => {
      const match = state.selectedCards?.find(card => card.cardId === cardId);
      return match?.displayName ?? fallback;
    },
    [state.selectedCards]
  );

  // Intercept hardware back events while the screen is focused
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        Alert.alert(
          t('shared.alerts.confirmExit.title'),
          t('shared.alerts.confirmExit.afterAIResult'),
          [
            {
              text: tCommon('app.cancel'),
              style: 'cancel',
            },
            {
              text: t('shared.buttons.confirmReturn'),
              onPress: () => {
                // Reset state and navigate back to the type selection screen
                resetFlow();
                router.push('/(reading)/type');
              },
            },
          ]
        );
        return true; // Prevent default back navigation
      });

      return () => backHandler.remove();
    }, [router, resetFlow, t, tCommon])
  );

  useEffect(() => {
    // Reuse existing AI result if it is already available
    if (state.aiResult) {
      console.log('AI result already available; skip API call');
      setAiResult(state.aiResult);
      setLoading(false);
      if (state.savedToHistory) {
        setHasSaved(true);
        console.log('AI result already saved; skip auto-save');
      }
    } else {
      console.log('No AI result found; generating a new interpretation');
      generateAIReading();
    }
  }, [state.aiResult, state.savedToHistory, generateAIReading]);

  // Automatically persist the reading once it is fully rendered
  useEffect(() => {
    if (!loading && aiResult && !hasSaved) {
      const shouldSave = state.aiResult && !state.savedToHistory;

      if (shouldSave) {
        console.log('Auto-save threshold met; persisting AI reading');
        const autoSave = async () => {
          try {
            setHasSaved(true);
            await saveToHistory();
            console.log('AI reading saved successfully after render');
          } catch (error) {
            console.error('Auto-save failed:', error);
            setHasSaved(false);
          }
        };
        autoSave();
      } else {
        console.log('Auto-save conditions not satisfied; skipping persistence');
      }
    }
  }, [loading, aiResult, hasSaved, state.aiResult, state.savedToHistory, saveToHistory]);

  const generateAIReading = useCallback(async () => {
    if (!state.selectedCards || !state.aiDimensions || !state.userDescription) {
      setError(t('shared.errors.aiMissingData'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const aiService = AIReadingService.getInstance();

      const isHealthy = await aiService.checkServiceHealth();
      if (!isHealthy) {
        throw new Error(t('shared.errors.serviceUnavailable'));
      }

      // Normalize card payload for the backend API
      const cardInfos = state.selectedCards.map((card) => ({
        id: card.cardId,
        name: card.name,
        arcana: 'Major', // Placeholder; derive from card data when available
        number: card.cardId,
        direction: card.direction === 'reversed' ? '逆位' : '正位',
        position: card.dimension?.aspect_type || 1, // Use dimension aspect_type (1,2,3) as position
        image_url: card.imageUrl || '',
        deck: 'default'
      })).sort((a, b) => a.position - b.position); // Keep cards ordered by position

      console.log('=== AI reading request payload ===');
      console.log('Question:', state.userDescription);
      console.log('Cards:', JSON.stringify(cardInfos, null, 2));
      console.log('AI dimensions:', JSON.stringify(state.aiDimensions, null, 2));
      console.log('Spread type:', 'three-card');
      console.log('Full request parameters:', {
        cards: cardInfos,
        dimensions: state.aiDimensions,
        userDescription: state.userDescription,
        spreadType: 'three-card'
      });
      console.log('=== End of AI reading request payload ===');

      const result = await aiService.generateAIReading(
        cardInfos,
        state.aiDimensions,
        state.userDescription,
        'three-card'
      );

      console.log('=== AI reading response payload ===');
      console.log('Raw response:', JSON.stringify(result, null, 2));
      console.log('Response sanity check:');
      console.log('  - card_interpretations exists:', !!result.card_interpretations);
      console.log('  - card_interpretations type:', typeof result.card_interpretations);
      console.log('  - card_interpretations length:', result.card_interpretations?.length);
      console.log('  - dimensions exists:', !!result.dimensions);
      console.log('  - dimensions length:', result.dimensions?.length);
      console.log('  - overall_summary exists:', !!result.overall_summary);
      console.log('  - insights exists:', !!result.insights);
      console.log('=== End of AI reading response payload ===');

      if (!result || !result.card_interpretations || !result.overall_summary) {
        throw new Error(t('shared.errors.aiGenerateFailed'));
      }

      console.log('AI reading generated successfully; updating context');
      updateAIResult(result);
      setAiResult(result);

      // Update ReadingContext interpretations with the latest AI data
      if (result.card_interpretations) {
        const interpretationData = result.card_interpretations.map(cardInterpretation => ({
          cardId: cardInterpretation.card_id,
          cardName: cardInterpretation.card_name,
          position: cardInterpretation.position.toString(),
          direction: cardInterpretation.direction,
          summary: cardInterpretation.basic_summary,
          detail: cardInterpretation.ai_interpretation,
          // AI-specific metadata
          dimensionName: cardInterpretation.dimension_aspect?.dimension_name,
        }));
        updateInterpretations(interpretationData);
        console.log('[AIResult] Updated interpretations in context:', interpretationData);
      }

      // Auto-save is handled in the effect once render completes
    } catch (error) {
      console.error('Failed to generate AI reading:', error);
      let errorMessage = t('shared.errors.network');

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [
    state.selectedCards,
    state.aiDimensions,
    state.userDescription,
    t,
    updateAIResult,
    updateInterpretations,
  ]);

  const isReversedDirection = (direction?: string | null) => {
    if (!direction) return false;
    const normalized = direction.toLowerCase();
    const reversedLabel = tCards('sideToggle.reversed').toLowerCase();
    return normalized === 'reversed' || normalized === reversedLabel;
  };

  const getDirectionLabel = (direction?: string | null) => {
    if (!direction) return '';
    if (isReversedDirection(direction)) {
      return tCards('sideToggle.reversed');
    }
    const normalized = direction.toLowerCase();
    const uprightLabel = tCards('sideToggle.upright').toLowerCase();
    if (normalized === 'upright' || normalized === uprightLabel) {
      return tCards('sideToggle.upright');
    }
    return direction;
  };

  const handleComplete = () => {
    resetFlow();
    router.replace('/(tabs)');
  };

  const handleNewReading = () => {
    resetFlow();
    router.replace('/(reading)/type');
  };

  const handleRetry = () => {
    // Reset state and trigger regeneration
    setAiResult(null);
    setError(null);
    setRetryCount(prev => prev + 1);

    // Clear context result so the API is invoked again
    updateAIResult(undefined);

    // Generate a fresh interpretation
    generateAIReading();
  };


  const handleGoBack = () => {
    router.back();
  };

  // Enhanced loading state handling
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('aiResult.loading.title')}</Text>
        <Text style={styles.loadingSubText}>
          {retryCount > 0 ? t('aiResult.retrying', { count: retryCount }) : t('aiResult.loading.subtitle')}
        </Text>
        <View style={styles.loadingProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressText}>{t('aiResult.progress.analysis')}</Text>
        </View>
      </View>
    );
  }

  // Enhanced error state handling
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{t('aiResult.errors.title')}</Text>
        <Text style={styles.errorText}>{error}</Text>

        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>
              {retryCount >= 3 ? t('aiResult.buttons.tryAgain') : t('aiResult.buttons.retry')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>{t('aiResult.buttons.back')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.errorTips}>
          <Text style={styles.tipsTitle}>{t('aiResult.tips.title')}</Text>
          <Text style={styles.tipsText}>{t('aiResult.tips.network')}</Text>
          <Text style={styles.tipsText}>{t('aiResult.tips.busy')}</Text>
          <Text style={styles.tipsText}>{t('aiResult.tips.rewrite')}</Text>
        </View>
      </View>
    );
  }

  if (!aiResult) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('aiResult.errors.dataIncomplete')}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>{t('aiResult.buttons.regenerate')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const generatedTime = aiResult.generated_at
    ? new Date(aiResult.generated_at).toLocaleString()
    : new Date().toLocaleString();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{state.userDescription}</Text>
      </View>

      {/* Dimension-level interpretations with imagery and core meanings */}
      <View style={styles.dimensionsContainer}>
        {/* <Text style={styles.sectionTitle}>{state.userDescription}</Text> */}
        {aiResult.card_interpretations && aiResult.card_interpretations.length > 0 ? (
          aiResult.card_interpretations.map((cardInterpretation, index) => {
            // Match card reference by position for display
            const card = state.selectedCards.find(c => c.dimension?.aspect_type === cardInterpretation.position);
            if (!card) return null;

            return (
              <View key={cardInterpretation.card_id} style={styles.dimensionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.positionBadge}>
                    <Text style={styles.positionText}>{cardInterpretation.position}</Text>
                  </View>
                  <View style={styles.cardInfoSection}>
                    <Text style={styles.cardName}>
                      {resolveCardDisplayName(cardInterpretation.card_id, cardInterpretation.card_name)}
                    </Text>
                    <Text style={styles.cardDirection}>
                      {getDirectionLabel(cardInterpretation.direction)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  {/* Card image displayed in the center */}
                  <View style={styles.cardImageSection}>
                    <CardImageLoader
                      imageUrl={card.imageUrl}
                      width={120}
                      height={200}
                      style={[
                        styles.cardImageLarge,
                        isReversedDirection(cardInterpretation.direction) && styles.cardImageReversed
                      ]}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Dimension metadata */}
                  <View style={styles.dimensionInfo}>
                    <Text style={styles.dimensionName}>
                      {cardInterpretation.dimension_aspect?.dimension_name ??
                        t('aiResult.fallback.dimension', { index: index + 1 })}
                    </Text>
                    <Text style={styles.dimensionAspect}>
                      {aiResult.dimensions?.[index]?.aspect || ''}
                    </Text>
                  </View>

                  {/* Baseline card meaning */}
                  <View style={styles.basicInterpretationContainer}>
                    <Text style={styles.interpretationLabel}>{t('aiResult.labels.basic')}</Text>
                    <Text style={styles.basicInterpretation}>
                      {cardInterpretation.basic_summary}
                    </Text>
                  </View>

                  {/* AI detailed interpretation */}
                  <View style={styles.aiInterpretationContainer}>
                    <Text style={styles.interpretationLabel}>{t('aiResult.labels.aiDetail')}</Text>
                    <Text style={styles.aiInterpretation}>
                      {cardInterpretation.ai_interpretation}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{t('aiResult.errors.noCardData')}</Text>
          </View>
        )}
      </View>

      {/* Overall summary */}
      <View style={styles.overallContainer}>
        <Text style={styles.sectionTitle}>{t('aiResult.sections.overview')}</Text>
        <Text style={styles.overallSummary}>{aiResult.overall_summary}</Text>
      </View>

      {/* Key insights */}
      {aiResult.insights && aiResult.insights.length > 0 && (
        <View style={styles.insightsContainer}>
          <Text style={styles.sectionTitle}>{t('aiResult.sections.insights')}</Text>
          {aiResult.insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightBullet}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleNewReading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>{t('shared.buttons.readAgain')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.tertiaryButton]}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.tertiaryButtonText}>{t('shared.buttons.backHome')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('aiResult.footer')}</Text>
        <Text style={styles.generatedTime}>
          {t('aiResult.generatedAt', { time: generatedTime })}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0F0F1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  cardsContainer: {
    marginBottom: 32,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  cardItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  cardImage: {
    width: 80,
    height: 133,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardImageReversed: {
    transform: [{ rotate: '180deg' }],
  },
  cardName: {
    fontSize: 12,
    color: '#FFD700',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDirection: {
    fontSize: 10,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardPosition: {
    fontSize: 10,
    color: '#888888',
    textAlign: 'center',
  },
  dimensionsContainer: {
    marginBottom: 32,
  },
  dimensionCard: {
    backgroundColor: '#16213E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
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
  cardInfoSection: {
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
  dimensionInfo: {
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    width: '100%',
  },
  dimensionAspect: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
    textAlign: 'center',
  },
  basicInterpretationContainer: {
    width: '100%',
    marginBottom: 16,
  },
  aiInterpretationContainer: {
    width: '100%',
  },
  interpretationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  basicInterpretation: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'center',
  },
  aiInterpretation: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'left',
  },
  dimensionName: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  overallContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  overallSummary: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 24,
  },
  insightsContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightBullet: {
    fontSize: 16,
    color: '#FFD700',
    marginRight: 8,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
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
    marginBottom: 4,
  },
  generatedTime: {
    fontSize: 12,
    color: '#666666',
  },
  // Loading visuals
  loadingProgress: {
    marginTop: 24,
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
  },
  // Error presentation styling
  errorIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    color: '#FF6B6B',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#16213E',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorTips: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  tipsTitle: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 4,
  },
});
