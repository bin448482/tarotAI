import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { ParsedUserHistory } from '../../lib/types/user';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface HistoryListItemProps {
  history: ParsedUserHistory;
  onPress: () => void;
}

export const HistoryListItem: React.FC<HistoryListItemProps> = ({
  history,
  onPress,
}) => {
  const { t, i18n } = useTranslation('history');
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  // 格式化时间显示 - 显示完整的日期时间
  const formatTime = (timestamp: string) => {
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

  // 获取占卜类型显示文本
  const getModeText = (mode: string) => {
    return mode === 'ai' ? t('list.modeBadge.ai') : t('list.modeBadge.default');
  };

  // 获取占卜类型颜色
  const getModeColor = (mode: string) => {
    return mode === 'ai' ? '#00ced1' : '#ffd700';
  };

  // 获取主题预览文本
  const getPreviewText = () => {
    if (history.interpretation_mode === 'ai' && history.result?.interpretation?.user_description) {
      const userDesc = history.result.interpretation.user_description;
      const dimensions = history.result?.metadata?.ai_dimensions;
      if (dimensions && dimensions.length > 0) {
        const dimensionDesc = dimensions[0].description;
        return t('list.preview.aiAnalysis', {
          description: userDesc,
          dimension: dimensionDesc,
        });
      }
      return userDesc;
    }
    return history.result?.metadata?.theme || t('list.preview.fallback');
  };

  // 获取卡牌数量
  const getCardCount = () => {
    return Array.isArray(history.card_ids) ? history.card_ids.length : 0;
  };

  // 按压动画
  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    glowOpacity.value = withTiming(0.3, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    glowOpacity.value = withTiming(0, { duration: 300 });
  };

  // 动画样式
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const modeColor = getModeColor(history.interpretation_mode);

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* 发光效果 */}
        <Animated.View style={[styles.glowEffect, glowStyle]} />

        {/* 主要内容 */}
        <View style={styles.content}>
          {/* 头部信息 */}
          <View style={styles.header}>
            <View style={styles.leftSection}>
              <Text style={styles.timeText}>{formatTime(history.timestamp)}</Text>
              <View style={[styles.modeBadge, { backgroundColor: modeColor }]}>
                <Text style={styles.modeText}>{getModeText(history.interpretation_mode)}</Text>
              </View>
            </View>

            <View style={styles.rightSection}>
              <Text style={styles.cardCountText}>
                {t('list.cardCount', { count: getCardCount() })}
              </Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </View>

          {/* 主题预览 */}
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              {getPreviewText()}
            </Text>
          </View>

          {/* 标签栏 */}
          {/* <View style={styles.tags}>
            <View style={styles.tag}>
              <Text style={styles.tagIcon}>🔮</Text>
              <Text style={styles.tagText}>牌阵{history.spread_id}</Text>
            </View>

            {history.interpretation_mode === 'ai' && (
              <View style={[styles.tag, styles.aiTag]}>
                <Text style={styles.tagIcon}>✨</Text>
                <Text style={styles.tagText}>AI增强</Text>
              </View>
            )}
          </View> */}
        </View>

        {/* 装饰线条 */}
        <View style={styles.decorativeLine} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    position: 'relative',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 17,
    backgroundColor: '#ffd700',
    opacity: 0,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#e6e6fa',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  modeText: {
    color: '#1a1a2e',
    fontSize: 10,
    fontWeight: '600',
  },
  cardCountText: {
    color: '#8b8878',
    fontSize: 12,
    marginRight: 4,
  },
  arrow: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: '300',
  },
  preview: {
    marginBottom: 12,
  },
  previewText: {
    color: '#e6e6fa',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  aiTag: {
    backgroundColor: 'rgba(0, 206, 209, 0.1)',
    borderColor: 'rgba(0, 206, 209, 0.3)',
  },
  tagIcon: {
    fontSize: 10,
    marginRight: 4,
  },
  tagText: {
    color: '#e6e6fa',
    fontSize: 10,
    fontWeight: '500',
  },
  decorativeLine: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
});
