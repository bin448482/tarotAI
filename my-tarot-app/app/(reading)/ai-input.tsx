import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useReadingFlow } from '@/lib/contexts/ReadingContext';
import AIReadingService from '@/lib/services/AIReadingService';
import { useTranslation } from 'react-i18next';
import type { DimensionData } from '@/lib/contexts/ReadingContext';

export default function AIInputScreen() {
  const router = useRouter();
  const { updateStep, updateUserDescription, updateAIDimensions, resetFlow } = useReadingFlow();
  const { t } = useTranslation('reading');
  const { t: tCommon } = useTranslation('common');

  const [userDescription, setUserDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [dimensions, setDimensions] = useState<DimensionData[] | null>(null);
  const [error, setError] = useState('');
  const [hasAnalyzed, setHasAnalyzed] = useState(false); // 标记是否已分析成功

  // 添加返回拦截 - 只在页面聚焦时生效
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // 根据是否已分析成功来判断积分扣除状态
        const hasConsumedCredits = hasAnalyzed && dimensions;
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
    }, [router, resetFlow, hasAnalyzed, dimensions])
  );

  const handleAnalyze = async () => {
    // 清除之前的错误
    setError('');

    if (!userDescription.trim()) {
      setError(t('aiInput.errors.required'));
      return;
    }

    if (userDescription.trim().length > 200) {
      setError(t('aiInput.errors.tooLong'));
      return;
    }

    setLoading(true);
    try {
      const aiService = AIReadingService.getInstance();

      // 检查服务健康状态
      const isHealthy = await aiService.checkServiceHealth();
    if (!isHealthy) {
      Alert.alert(
        t('aiInput.alerts.analyzeFailedTitle'),
        t('aiInput.alerts.serviceUnavailable')
      );
      setLoading(false);
      return;
    }

      const result = await aiService.analyzeDescription(userDescription.trim());

      // 验证返回数据
      if (!result || !result.recommended_dimensions || result.recommended_dimensions.length === 0) {
        throw new Error(t('aiInput.errors.invalidResponse'));
      }

      // 更新状态
      updateUserDescription(userDescription.trim());
      const normalizedDimensions: DimensionData[] = result.recommended_dimensions.map((dimension) => ({
        id: dimension.id ?? 0,
        name: dimension.name,
        category: dimension.category,
        description: dimension.description,
        aspect: dimension.aspect ?? '',
        aspect_type: dimension.aspect_type ?? 0,
        localizedAspect: dimension.localizedAspect ?? dimension.aspect,
      }));
      updateAIDimensions(normalizedDimensions);
      setDimensions(normalizedDimensions);
      setHasAnalyzed(true); // 标记已分析成功

      // 移除自动跳转，只能手动点击继续

    } catch (error) {
      console.error('AI分析失败:', error);
      let errorMessage = t('shared.errors.network');

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getCharacterCount = () => userDescription.length;

  const handleRetry = () => {
    setError('');
    setDimensions(null);
    handleAnalyze();
  };

  const handleManualContinue = () => {
    if (dimensions && dimensions.length > 0) {
      updateStep(3);
      router.push('/(reading)/draw');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('aiInput.title')}</Text>
        <Text style={styles.subtitle}>{t('aiInput.description')}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('aiInput.inputLabel')}</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          value={userDescription}
          onChangeText={setUserDescription}
          placeholder={t('aiInput.placeholder')}
          placeholderTextColor="#888888"
          maxLength={200}
          textAlignVertical="top"
        />
        <View style={styles.charCountContainer}>
          <Text style={[
            styles.charCount,
            getCharacterCount() > 200 && styles.charCountError
          ]}>
            {getCharacterCount()}/200
          </Text>
        </View>
      </View>

      {/* 错误显示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            ⚠️ {t('aiInput.alerts.analyzeFailedTitle')}
          </Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>{tCommon('app.retry')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 加载状态 */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('shared.status.analyzing')}</Text>
        <Text style={styles.loadingSubText}>{t('shared.status.analysisHint')}</Text>
        </View>
      )}

      {dimensions && !loading && (
        <View style={styles.dimensionsContainer}>
          <Text style={styles.dimensionsTitle}>{t('aiInput.recommendedTitle')}</Text>
          {dimensions.map((dimension, index) => {
            const isLast = index === (dimensions as any[]).length - 1;
            console.log(`🎯 Debug - Dimension ${index + 1}:`, {
              isLast,
              dimensionName: dimension.localizedAspect ?? dimension.aspect,
              appliedStyles: isLast ? 'dimensionItem + dimensionItemLast' : 'dimensionItem',
              totalDimensions: (dimensions as any[]).length
            });
            
            return (
              <View
                key={dimension.id}
                style={[
                  styles.dimensionItem,
                  isLast && styles.dimensionItemLast
                ]}
              >
                <Text style={styles.dimensionName}>
                  {index + 1}. {dimension.localizedAspect ?? dimension.aspect}
                </Text>
                {/* <Text style={styles.dimensionDescription}>
                  {dimension.description}
                </Text> */}
              </View>
            );
          })}
          <View style={styles.continueContainer}>
            <Text style={styles.autoRedirectText}>
              {t('aiInput.continueHint')}
            </Text>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleManualContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                {t('aiInput.buttons.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.actionsContainer}>
        {!dimensions && !loading && !error && (
          <TouchableOpacity
            style={[
              styles.analyzeButton,
              loading && styles.analyzeButtonDisabled
            ]}
            onPress={handleAnalyze}
            disabled={loading || !userDescription.trim()}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0F0F1A" />
            ) : (
              <Text style={styles.analyzeButtonText}>
                {t('aiInput.buttons.analyze')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('shared.stepIndicator', { current: 2, total: 4 })}
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
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    color: '#FFD700',
    marginBottom: 12,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#16213E',
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
  },
  charCountContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 14,
    color: '#888888',
  },
  charCountError: {
    color: '#FF6B6B',
  },
  errorContainer: {
    backgroundColor: '#2D1B1B',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FFCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  dimensionsContainer: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333333', // 改为更低调的灰色边框
  },
  dimensionsTitle: {
    fontSize: 18,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dimensionItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  dimensionItemLast: {
    borderBottomWidth: 0,
    marginBottom: 0, // 移除底部间距，因为后面有continueContainer
    paddingBottom: 0, // 移除底部内边距，保持视觉一致性
  },
  dimensionName: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
    marginBottom: 4,
  },
  dimensionDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
  },
  continueContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  continueButton: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 12,
  },
  continueButtonText: {
    color: '#0F0F1A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  autoRedirectText: {
    fontSize: 14,
    color: '#FFD700',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },
  actionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  analyzeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 25,
    paddingHorizontal: 48,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#666666',
    shadowColor: 'transparent',
  },
  analyzeButtonText: {
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
});
