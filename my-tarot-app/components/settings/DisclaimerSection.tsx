import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface DisclaimerItem {
  icon: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'suggestion' | 'restriction';
}

interface DisclaimerCardProps {
  item: DisclaimerItem;
}

const DisclaimerCard: React.FC<DisclaimerCardProps> = ({ item }) => {
  const getCardStyle = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          borderColor: 'rgba(243, 156, 18, 0.3)',
        };
      case 'suggestion':
        return {
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderColor: 'rgba(39, 174, 96, 0.3)',
        };
      case 'restriction':
        return {
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderColor: 'rgba(231, 76, 60, 0.3)',
        };
      default:
        return {
          backgroundColor: 'rgba(212, 175, 55, 0.05)',
          borderColor: 'rgba(212, 175, 55, 0.2)',
        };
    }
  };

  const cardStyle = getCardStyle(item.type);

  return (
    <View style={[styles.disclaimerCard, cardStyle]}>
      <View style={styles.cardHeader}>
        <Text style={styles.disclaimerIcon}>{item.icon}</Text>
        <Text style={styles.disclaimerTitle}>{item.title}</Text>
      </View>
      <Text style={styles.disclaimerContent}>{item.content}</Text>
    </View>
  );
};

export const DisclaimerSection: React.FC = () => {
  const { t } = useTranslation('settings');
  const disclaimers = (t('disclaimer.items', { returnObjects: true }) as DisclaimerItem[]) ?? [];
  const important = (t('disclaimer.important', { returnObjects: true }) as { title?: string; content?: string }) ?? {};

  return (
    <CollapsibleSection
      title={t('disclaimer.title')}
      icon="⚠️"
      defaultExpanded={false}
    >
      <View style={styles.disclaimerList}>
        {disclaimers.map((item, index) => (
          <DisclaimerCard key={index} item={item} />
        ))}
      </View>

      {/* 重要提醒 */}
      <View style={styles.importantNotice}>
        {!!important.title && <Text style={styles.noticeTitle}>{important.title}</Text>}
        {!!important.content && (
          <Text style={styles.noticeContent}>
            {important.content}
          </Text>
        )}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  disclaimerList: {
    marginBottom: 20,
  },

  disclaimerCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  disclaimerIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
    flex: 1,
  },

  disclaimerContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#e6e6fa',
    marginLeft: 28, // 对齐图标后的文本
  },

  // 重要提醒样式
  importantNotice: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    padding: 16,
  },

  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 8,
  },

  noticeContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#e6e6fa',
  },
});
