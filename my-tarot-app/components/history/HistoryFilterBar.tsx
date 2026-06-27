import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import type { HistoryFilter } from '../../lib/types/user';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface HistoryFilterBarProps {
  filter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
}

export const HistoryFilterBar: React.FC<HistoryFilterBarProps> = ({
  filter,
  onFilterChange,
}) => {
  const { t } = useTranslation('history');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const modeScale = useSharedValue(1);
  const dateScale = useSharedValue(1);

  // 模式选项
  const modeOptions = useMemo(() => ([
    { value: 'all', label: t('filter.mode.all'), icon: '🔮' },
    { value: 'default', label: t('filter.mode.default'), icon: '📜' },
    { value: 'ai', label: t('filter.mode.ai'), icon: '✨' },
  ]), [t]);

  // 日期范围选项
  const dateOptions = useMemo(() => ([
    { value: 'all', label: t('filter.date.all'), icon: '📅' },
    { value: 'today', label: t('filter.date.today'), icon: '📍' },
    { value: 'week', label: t('filter.date.week'), icon: '📊' },
    { value: 'month', label: t('filter.date.month'), icon: '📈' },
  ]), [t]);

  // 获取当前模式显示文本
  const getCurrentModeText = () => {
    const option = modeOptions.find(opt => opt.value === filter.mode);
    const icon = option?.icon ?? '🔮';
    const label = option?.label ?? t('filter.mode.all');
    return t('filter.modeDisplay', { icon, label });
  };

  // 获取当前日期范围显示文本
  const getCurrentDateText = () => {
    if (filter.dateRange) {
      return t('filter.dateDisplay', { label: t('filter.date.custom') });
    }
    return t('filter.dateDisplay', { label: t('filter.date.all') });
  };

  // 处理模式选择
  const handleModeSelect = (mode: string) => {
    const newFilter = { ...filter, mode: mode as any };
    onFilterChange(newFilter);
    setShowModeSelector(false);
  };

  // 处理日期范围选择
  const handleDateSelect = (option: string) => {
    let newFilter = { ...filter };

    switch (option) {
      case 'all':
        delete newFilter.dateRange;
        break;
      case 'today':
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        newFilter.dateRange = {
          start: todayStart.toISOString(),
          end: todayEnd.toISOString(),
        };
        break;
      case 'week':
        const now = new Date();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        newFilter.dateRange = {
          start: weekStart.toISOString(),
          end: now.toISOString(),
        };
        break;
      case 'month':
        const monthNow = new Date();
        const monthStart = new Date(monthNow.getTime() - 30 * 24 * 60 * 60 * 1000);
        newFilter.dateRange = {
          start: monthStart.toISOString(),
          end: monthNow.toISOString(),
        };
        break;
    }

    onFilterChange(newFilter);
    setShowDatePicker(false);
  };

  // 按钮动画
  const handleModePress = () => {
    modeScale.value = withSpring(0.95, {}, () => {
      modeScale.value = withSpring(1);
    });
    setShowModeSelector(true);
  };

  const handleDatePress = () => {
    dateScale.value = withSpring(0.95, {}, () => {
      dateScale.value = withSpring(1);
    });
    setShowDatePicker(true);
  };

  // 动画样式
  const modeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modeScale.value }],
  }));

  const dateAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dateScale.value }],
  }));

  // 渲染选择器模态框
  const renderSelector = (
    show: boolean,
    onClose: () => void,
    options: any[],
    onSelect: (value: string) => void,
    title: string
  ) => (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>{title}</Text>
          <ScrollView style={styles.optionsList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => onSelect(option.value)}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('filter.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {/* 模式筛选 */}
        <TouchableOpacity onPress={handleModePress}>
          <Animated.View style={[styles.filterButton, modeAnimatedStyle]}>
            <Text style={styles.filterButtonText}>{getCurrentModeText()}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* 日期筛选 */}
        <TouchableOpacity onPress={handleDatePress}>
          <Animated.View style={[styles.filterButton, dateAnimatedStyle]}>
            <Text style={styles.filterButtonText}>{getCurrentDateText()}</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* 清除筛选 */}
        {(filter.mode !== 'all' || filter.dateRange) && (
          <TouchableOpacity
            onPress={() => onFilterChange({ mode: 'all' })}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕ {t('filter.clear')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 模式选择器 */}
      {renderSelector(
        showModeSelector,
        () => setShowModeSelector(false),
        modeOptions,
        handleModeSelect,
        t('filter.labels.mode')
      )}

      {/* 日期选择器 */}
      {renderSelector(
        showDatePicker,
        () => setShowDatePicker(false),
        dateOptions,
        handleDateSelect,
        t('filter.labels.date')
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 12,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  filterBar: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  filterButtonText: {
    color: '#e6e6fa',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: 'rgba(139, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: {
    color: '#8b0000',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  selectorTitle: {
    color: '#e6e6fa',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionText: {
    color: '#e6e6fa',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'rgba(139, 136, 120, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#8b8878',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
