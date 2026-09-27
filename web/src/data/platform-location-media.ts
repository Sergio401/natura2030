import type { ImageMetadata } from 'astro';
import nayaritImg from '../assets/landing/manglar-gopro-velocidad.jpg';
import puntaSoldadoImg from '../assets/platform/punta-soldado-lanchas.jpg';
import rioBanosImg from '../assets/platform/rio-banos-ecuador.jpg';

// Fotos del panel por ubicación. Viven aparte de `platform-locations.ts` porque ese
// archivo también lo importa el script del mapa (cliente) y no debe arrastrar imágenes.
export const locationMedia: Record<string, { image: ImageMetadata; credit: string }> = {
  'manglares-nayarit': { image: nayaritImg, credit: 'Adaptation Latin America' },
  'punta-soldado': { image: puntaSoldadoImg, credit: 'Adaptation Latin America' },
  'juventudes-agua-quito': { image: rioBanosImg, credit: 'Patricio Gaibor · Unsplash' },
};
