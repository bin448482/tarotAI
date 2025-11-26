import { useTranslation as useBaseTranslation, UseTranslationOptions } from 'react-i18next';

import type { AppLocale, Namespace } from '@/lib/i18n';

export const useTranslation = (ns?: Namespace | Namespace[], options?: UseTranslationOptions<AppLocale>) => {
  return useBaseTranslation<AppLocale, Namespace>(ns, options);
};
