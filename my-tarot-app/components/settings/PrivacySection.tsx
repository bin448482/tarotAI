import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface PrivacyItem {
  id: string;
  title: string;
  icon: string;
  summary: string;
  details: string;
}

interface PrivacyCardProps {
  item: PrivacyItem;
  expanded: boolean;
  onToggle: () => void;
}

const PrivacyCard: React.FC<PrivacyCardProps> = ({ item, expanded, onToggle }) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, { duration: 300 });
  }, [expanded]);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.privacyCard}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.privacyIcon}>{item.icon}</Text>
          <View style={styles.headerContent}>
            <Text style={styles.privacyTitle}>{item.title}</Text>
            <Text style={styles.privacySummary}>{item.summary}</Text>
          </View>
        </View>
        <Animated.View style={iconStyle}>
          <Ionicons name="chevron-down" size={20} color="#d4af37" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandableContent}>
          <Text style={styles.privacyDetails}>{item.details}</Text>
        </View>
      )}
    </View>
  );
};

export const PrivacySection: React.FC = () => {
  const { t } = useTranslation('settings');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const privacyItems = (t('privacy.items', { returnObjects: true }) as PrivacyItem[]) ?? [];
  const contact = (t('privacy.contact', { returnObjects: true }) as {
    title?: string;
    description?: string;
    email?: string;
  }) ?? {};

  const handleToggle = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  return (
    <CollapsibleSection
      title={t('privacy.title')}
      icon="🔒"
      defaultExpanded={false}
    >
      <View style={styles.privacyList}>
        {privacyItems.map((item) => (
          <PrivacyCard
            key={item.id}
            item={item}
            expanded={expandedItem === item.id}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </View>

      {/* 联系方式 */}
      <View style={styles.contactInfo}>
        {!!contact.title && <Text style={styles.contactTitle}>{contact.title}</Text>}
        {!!contact.description && (
          <Text style={styles.contactContent}>
            {contact.description}
          </Text>
        )}
        {!!contact.email && <Text style={styles.contactEmail}>{contact.email}</Text>}
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  privacyList: {
    marginBottom: 20,
  },

  privacyCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 12,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },

  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  privacyIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },

  headerContent: {
    flex: 1,
  },

  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 4,
  },

  privacySummary: {
    fontSize: 14,
    color: '#8b8878',
    lineHeight: 18,
  },

  expandableContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },

  privacyDetails: {
    fontSize: 14,
    lineHeight: 22, // 增加行高，改善可读性
    color: '#e6e6fa',
    marginLeft: 32, // 对齐图标后的内容
  },

  // 联系信息样式
  contactInfo: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    padding: 16,
  },

  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 8,
  },

  contactContent: {
    fontSize: 14,
    lineHeight: 18,
    color: '#e6e6fa',
    marginBottom: 8,
  },

  contactEmail: {
    fontSize: 14,
    color: '#d4af37',
    textDecorationLine: 'underline',
  },
});
