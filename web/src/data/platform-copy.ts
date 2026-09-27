import type { Locale } from './types';

export type LocationCategory =
  | 'coastal-adaptation'
  | 'ecosystem-restoration'
  | 'infrastructure'
  | 'risk-management'
  | 'local-development';

export interface PlatformCopy {
  meta: {
    title: string;
    description: string;
  };
  header: {
    eyebrow: string;
    title: string;
    back: string;
    language: string;
    models: string;
  };
  map: {
    ariaLabel: string;
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
    tabDetails: string;
    tabOverview: string;
    tabsLabel: string;
    photoCredit: string;
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
      back: 'Volver al sitio',
      language: 'English',
      models: 'Ver modelos',
    },
    map: {
      ariaLabel: 'Mapa de iniciativas de Adaptation Latin America',
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
      tabDetails: 'Detalle',
      tabOverview: 'Resumen del proyecto',
      tabsLabel: 'Secciones del proyecto',
      photoCredit: 'Foto',
    },
    categories: {
      'coastal-adaptation': 'Adaptación costera',
      'ecosystem-restoration': 'Restauración de ecosistemas',
      infrastructure: 'Infraestructura',
      'risk-management': 'Gestión del riesgo',
      'local-development': 'Desarrollo local',
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
      back: 'Back to site',
      language: 'Español',
      models: 'View models',
    },
    map: {
      ariaLabel: 'Map of Adaptation Latin America initiatives',
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
      tabDetails: 'Details',
      tabOverview: 'Project overview',
      tabsLabel: 'Project sections',
      photoCredit: 'Photo',
    },
    categories: {
      'coastal-adaptation': 'Coastal adaptation',
      'ecosystem-restoration': 'Ecosystem restoration',
      infrastructure: 'Infrastructure',
      'risk-management': 'Risk management',
      'local-development': 'Local development',
    },
  },
};
