import type { Locale } from './types';

export type LocationCategory =
  | 'coastal-adaptation'
  | 'ecosystem-restoration'
  | 'infrastructure'
  | 'risk-management';

export interface PlatformCopy {
  meta: {
    title: string;
    description: string;
  };
  header: {
    eyebrow: string;
    title: string;
    status: string;
    back: string;
    language: string;
  };
  map: {
    ariaLabel: string;
    locationCount: string;
    locationCountLabel: string;
    legendTitle: string;
    satellite: string;
    streets: string;
    resetView: string;
    loadError: string;
  };
  panel: {
    close: string;
    category: string;
    status: string;
    coordinates: string;
    viewOnMap: string;
    challenge: string;
    response: string;
    applications: string;
    dataInputs: string;
    outputs: string;
    collaborateTitle: string;
    collaborateBody: string;
    collaborateCta: string;
    heroAlt: string;
  };
  categories: Record<LocationCategory, string>;
}

export const platformCopy: Record<Locale, PlatformCopy> = {
  es: {
    meta: {
      title: 'Adaptation Latin America — Plataforma regional',
      description:
        'Mapa de iniciativas de información climática costera de Adaptation Latin America en América Latina',
    },
    header: {
      eyebrow: 'INTELIGENCIA CLIMÁTICA COSTERA',
      title: 'Mapa regional',
      status: 'Plataforma activa',
      back: 'Volver al sitio',
      language: 'English',
    },
    map: {
      ariaLabel: 'Mapa de iniciativas de Adaptation Latin America',
      locationCount: '02',
      locationCountLabel: 'Ubicaciones registradas',
      legendTitle: 'Aplicaciones',
      satellite: 'Satélite',
      streets: 'Calles',
      resetView: 'Restablecer vista regional',
      loadError: 'El mapa no pudo cargarse. Revisa tu conexión e inténtalo de nuevo',
    },
    panel: {
      close: 'Cerrar detalle',
      category: 'Aplicación',
      status: 'Estado',
      coordinates: 'Coordenadas',
      viewOnMap: 'Ver en mapa',
      challenge: 'El reto',
      response: 'Nuestra respuesta',
      applications: 'Aplicaciones',
      dataInputs: 'Datos integrados',
      outputs: 'Resultados propuestos',
      collaborateTitle: '¿Te interesa colaborar?',
      collaborateBody: 'Buscamos aliados técnicos y financieros para implementar este proyecto',
      collaborateCta: 'Conversemos sobre este proyecto',
      heroAlt:
        'Monitoreo de corrientes en un canal de manglar en Nayarit mediante una cámara GoPro y visualización de campos de velocidad',
    },
    categories: {
      'coastal-adaptation': 'Adaptación costera',
      'ecosystem-restoration': 'Restauración de ecosistemas',
      infrastructure: 'Infraestructura',
      'risk-management': 'Gestión del riesgo',
    },
  },
  en: {
    meta: {
      title: 'Adaptation Latin America — Regional platform',
      description:
        'Map of Adaptation Latin America coastal climate information initiatives across Latin America',
    },
    header: {
      eyebrow: 'COASTAL CLIMATE INTELLIGENCE',
      title: 'Regional map',
      status: 'Platform active',
      back: 'Back to site',
      language: 'Español',
    },
    map: {
      ariaLabel: 'Map of Adaptation Latin America initiatives',
      locationCount: '02',
      locationCountLabel: 'Registered locations',
      legendTitle: 'Applications',
      satellite: 'Satellite',
      streets: 'Streets',
      resetView: 'Reset regional view',
      loadError: 'The map could not load. Check your connection and try again',
    },
    panel: {
      close: 'Close details',
      category: 'Application',
      status: 'Status',
      coordinates: 'Coordinates',
      viewOnMap: 'View on map',
      challenge: 'The challenge',
      response: 'Our response',
      applications: 'Applications',
      dataInputs: 'Integrated data',
      outputs: 'Proposed outcomes',
      collaborateTitle: 'Interested in collaborating?',
      collaborateBody: "We're looking for technical and financial partners to implement this project",
      collaborateCta: "Let's talk about this project",
      heroAlt:
        'Monitoring currents in a mangrove channel in Nayarit using a GoPro camera and velocity field visualization',
    },
    categories: {
      'coastal-adaptation': 'Coastal adaptation',
      'ecosystem-restoration': 'Ecosystem restoration',
      infrastructure: 'Infrastructure',
      'risk-management': 'Risk management',
    },
  },
};
