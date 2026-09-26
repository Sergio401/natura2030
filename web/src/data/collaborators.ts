import type { ImageMetadata } from 'astro';
import type { Locale } from './types';
import pnudEcuador from '../assets/collaborators/pnud-ecuador.jpg';
import defreesLab from '../assets/collaborators/defrees-hydraulics-lab.jpg';
import coastalSolutions from '../assets/collaborators/coastal-solutions.jpg';

export interface Collaborator {
  name: string;
  logo: ImageMetadata;
  url: Record<Locale, string>;
}

// Nombres propios: iguales en ambos idiomas, por eso no viven en content.<locale>.ts.
export const collaborators: Collaborator[] = [
  {
    name: 'Programa de las Naciones Unidas para el Desarrollo (PNUD) – Ecuador',
    logo: pnudEcuador,
    url: { es: 'https://www.undp.org/es/ecuador', en: 'https://www.undp.org/ecuador' },
  },
  {
    name: 'DeFrees Hydraulics Lab, Cornell University',
    logo: defreesLab,
    url: { es: 'https://www.duffield.cornell.edu/cee/educational-facilities/', en: 'https://www.duffield.cornell.edu/cee/educational-facilities/' },
  },
  {
    name: 'Coastal Solutions Fellows Program',
    logo: coastalSolutions,
    url: { es: 'https://www.solucionescosteras.org/', en: 'https://www.solucionescosteras.org/en/' },
  },
];
