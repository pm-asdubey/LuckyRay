'use client';

import { useAppStore } from '@/store/app-store';
import { translations } from '@/lib/i18n';

export function useTranslation() {
  const language = useAppStore(s => s.language);
  return translations[language];
}
