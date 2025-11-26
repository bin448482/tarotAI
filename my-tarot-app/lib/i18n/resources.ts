import type { Resource } from 'i18next';

import commonZH from '@/assets/i18n/zh-CN/common.json';
import homeZH from '@/assets/i18n/zh-CN/home.json';
import settingsZH from '@/assets/i18n/zh-CN/settings.json';
import historyZH from '@/assets/i18n/zh-CN/history.json';
import cardsZH from '@/assets/i18n/zh-CN/cards.json';
import readingZH from '@/assets/i18n/zh-CN/reading.json';

import commonEN from '@/assets/i18n/en/common.json';
import homeEN from '@/assets/i18n/en/home.json';
import settingsEN from '@/assets/i18n/en/settings.json';
import historyEN from '@/assets/i18n/en/history.json';
import cardsEN from '@/assets/i18n/en/cards.json';
import readingEN from '@/assets/i18n/en/reading.json';

export const NAMESPACES = ['common', 'home', 'settings', 'history', 'cards', 'reading'] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const resources: Resource = {
  'zh-CN': {
    common: commonZH,
    home: homeZH,
    settings: settingsZH,
    history: historyZH,
    cards: cardsZH,
    reading: readingZH,
  },
  en: {
    common: commonEN,
    home: homeEN,
    settings: settingsEN,
    history: historyEN,
    cards: cardsEN,
    reading: readingEN,
  },
};

export const AVAILABLE_LOCALES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
] as const;

export type AppLocale = (typeof AVAILABLE_LOCALES)[number]['code'];

export const DEFAULT_LOCALE: AppLocale = 'zh-CN';
