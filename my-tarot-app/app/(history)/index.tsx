import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { HistoryList, HistoryDetail } from '@/components/history';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useAppContext } from '@/lib/contexts/AppContext';

export default function HistoryScreen() {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { t } = useTranslation('history');
  const {
    state: { userId: appUserId },
  } = useAppContext();

  const userId = appUserId ?? 'anonymous_user';

  const handleHistoryPress = (historyId: string) => {
    setSelectedHistoryId(historyId);
  };

  const handleBackToList = () => {
    setSelectedHistoryId(null);
  };

  if (selectedHistoryId) {
    return (
      <SafeAreaView style={styles.container}>
        {/* 详情页面的自定义标题栏 */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToList}
          >
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screen.detailTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <HistoryDetail
          historyId={selectedHistoryId}
          onBack={handleBackToList}
          style={styles.detailContainer}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 列表页面的自定义标题栏 */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screen.listTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <HistoryList
        userId={userId}
        onHistoryPress={handleHistoryPress}
        style={styles.historyList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // 自定义标题栏样式（与卡牌说明页面保持一致）
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60, // 固定高度确保完全一致
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  historyList: {
    flex: 1,
  },
  detailContainer: {
    flex: 1,
  },
});
