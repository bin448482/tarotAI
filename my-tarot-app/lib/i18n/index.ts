import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources, DEFAULT_LOCALE, AVAILABLE_LOCALES, NAMESPACES, type AppLocale, type Namespace } from './resources';

const LOCALE_STORAGE_KEY = '@tarot-app/locale';

let initializationPromise: Promise<void> | null = null;

const detectDeviceLocale = (): AppLocale => {
  const locales = Localization.getLocales();
  const primary = locales.length > 0 ? locales[0].languageTag : DEFAULT_LOCALE;
  const normalized = AVAILABLE_LOCALES.find(locale => locale.code.toLowerCase() === primary.toLowerCase());
  return normalized ? normalized.code : DEFAULT_LOCALE;
};

export const getStoredLocale = async (): Promise<AppLocale | null> => {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (!stored) return null;
    const candidate = AVAILABLE_LOCALES.find(locale => locale.code === stored);
    return candidate ? candidate.code : null;
  } catch {
    return null;
  }
};

export const storeLocale = async (locale: AppLocale): Promise<void> => {
  try {
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn('[i18n] Failed to persist locale', error);
  }
};

export const initializeI18n = async (preferredLocale?: AppLocale): Promise<AppLocale> => {
  if (!initializationPromise) {
    initializationPromise = i18n
      .use(initReactI18next)
      .init({
        resources,
        compatibilityJSON: 'v4',
        lng: preferredLocale ?? (await getStoredLocale()) ?? detectDeviceLocale(),
        fallbackLng: DEFAULT_LOCALE,
        defaultNS: 'common',
        ns: NAMESPACES,
        supportedLngs: AVAILABLE_LOCALES.map(locale => locale.code),
        interpolation: {
          escapeValue: false,
        },
        returnNull: false,
      })
      .then(() => {
        const current = i18n.language as AppLocale;
        return storeLocale(current).then(() => undefined);
      })
      .catch(error => {
        console.error('[i18n] Initialization failed', error);
        throw error;
      });
  }

  await initializationPromise;

  const activeLocale = preferredLocale ?? (i18n.language as AppLocale);

  if (preferredLocale && i18n.language !== preferredLocale) {
    await changeLanguage(preferredLocale);
    return preferredLocale;
  }

  return activeLocale;
};

export const changeLanguage = async (locale: AppLocale): Promise<void> => {
  if (i18n.language === locale) return;
  await i18n.changeLanguage(locale);
  await storeLocale(locale);
};

export const getAvailableLocales = () => AVAILABLE_LOCALES;

export const getCurrentLocale = (): AppLocale => (i18n.language as AppLocale) ?? DEFAULT_LOCALE;

export type { AppLocale, Namespace };
export { DEFAULT_LOCALE, AVAILABLE_LOCALES };
