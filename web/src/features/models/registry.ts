import type { Locale } from '../../data/types';

export interface ModelRecord {
  id: string;
  category: Record<Locale, string>;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  route: Record<Locale, string>;
  outputs: string[];
}

export const modelRegistry: ModelRecord[] = [
  {
    id: 'two-sided-channel',
    category: {
      es: 'Hidrodinámica',
      en: 'Hydrodynamics',
    },
    title: {
      es: 'Canal vegetado de dos lados',
      en: 'Two-sided vegetated channel',
    },
    description: {
      es: 'Explora la velocidad y la vorticidad del flujo bajo diferentes configuraciones de canal y vegetación.',
      en: 'Explore flow speed and vorticity under different channel and vegetation configurations.',
    },
    route: {
      es: '/models/two-sided-channel/',
      en: '/models/en/two-sided-channel/',
    },
    outputs: ['speed', 'vorticity'],
  },
];
