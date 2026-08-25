import type { Locale } from '../data/types';

export type Version = 'v1' | 'v2' | 'v3';
export const versions: Version[] = ['v1', 'v2', 'v3'];

/** Canonical path for a given version + locale. Spanish is the default and stays unprefixed. */
export function pathFor(version: Version, locale: Locale): string {
  return locale === 'es' ? `/${version}/` : `/${version}/${locale}/`;
}
