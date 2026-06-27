import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppContext } from '@/lib/contexts/AppContext';
import { useTranslation } from '@/lib/hooks/useTranslation';

export const LanguageSection: React.FC = () => {
  const {
    state: { availableLocales, locale, isLocaleLoading },
    actions: { setLocale },
  } = useAppContext();
  const { t } = useTranslation('settings');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('language.title')}</Text>
      <Text style={styles.description}>{t('language.description')}</Text>

      <View style={styles.optionsContainer}>
        {availableLocales.map(option => {
          const isActive = option.code === locale;
          return (
            <TouchableOpacity
              key={option.code}
              style={[styles.option, isActive && styles.optionActive]}
              onPress={() => setLocale(option.code)}
              disabled={isLocaleLoading}
              activeOpacity={0.8}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                  {t(`language.options.${option.code}`, { defaultValue: option.label })}
                </Text>
                {isActive && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t('language.current')}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLocaleLoading && (
        <Text style={styles.loadingText}>{t('language.updating')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(22, 33, 62, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f4f1ff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#c9c7ea',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(12, 21, 45, 0.6)',
  },
  optionActive: {
    borderColor: 'rgba(212, 175, 55, 0.6)',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: '#dfe3ff',
  },
  optionLabelActive: {
    color: '#f8e7b0',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: '#c9c7ea',
    textAlign: 'right',
  },
});
