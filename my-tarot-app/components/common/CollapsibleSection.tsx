import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// 启用 Android 的 LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  icon?: string;
  onToggle?: (expanded: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
  icon,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.headerContainer}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <BlurView intensity={20} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              {icon && <Text style={styles.headerIcon}>{icon}</Text>}
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#d4af37"
            />
          </View>
        </BlurView>
      </TouchableOpacity>

      {expanded && (
        <BlurView intensity={20} style={styles.contentContainer}>
          <View style={styles.content}>
            {children}
          </View>
        </BlurView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  headerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },

  headerBlur: {
    backgroundColor: 'rgba(20, 20, 40, 0.6)',
  },

  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  headerIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
    flex: 1,
  },

  contentContainer: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: 'rgba(20, 20, 40, 0.6)',
    overflow: 'hidden',
    marginTop: -1, // 与header重叠1px，避免双重边框
  },

  content: {
    padding: 16,
  },
});

export default CollapsibleSection;