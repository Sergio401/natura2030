import { es } from './content.es';
import { en } from './content.en';
import type { Locale, SiteContent } from './types';

export const locales: Locale[] = ['es', 'en'];
export const defaultLocale: Locale = 'es';

const dictionaries: Record<Locale, SiteContent> = { es, en };

export function getContent(locale: Locale): SiteContent {
  return dictionaries[locale];
}

export type { Locale, SiteContent } from './types';
