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
    demoLabel: string;
    close: string;
    category: string;
    status: string;
    coordinates: string;
    dataInputs: string;
    outputs: string;
    demonstrationNote: string;
  };
  categories: Record<LocationCategory, string>;
}

export const platformCopy: Record<Locale, PlatformCopy> = {
  es: {
    meta: {
      title: 'NATURA 2030 — Plataforma regional',
      description:
        'Mapa demostrativo de iniciativas de información climática costera de NATURA 2030 en América Latina.',
    },
    header: {
      eyebrow: 'INTELIGENCIA CLIMÁTICA COSTERA',
      title: 'Mapa regional',
      status: 'Plataforma activa',
      back: 'Volver al sitio',
      language: 'English',
    },
    map: {
      ariaLabel: 'Mapa de iniciativas demostrativas de NATURA 2030',
      locationCount: '08',
      locationCountLabel: 'Ubicaciones demostrativas',
      legendTitle: 'Aplicaciones',
      satellite: 'Satélite',
      streets: 'Calles',
      resetView: 'Restablecer vista regional',
      loadError: 'El mapa no pudo cargarse. Revisa tu conexión e inténtalo de nuevo.',
    },
    panel: {
      demoLabel: 'Ubicación demostrativa',
      close: 'Cerrar detalle',
      category: 'Aplicación',
      status: 'Estado',
      coordinates: 'Coordenadas',
      dataInputs: 'Datos integrados',
      outputs: 'Productos esperados',
      demonstrationNote:
        'Este caso es ilustrativo. Su ubicación y alcance se utilizan para mostrar cómo funcionará la plataforma con proyectos reales.',
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
      title: 'NATURA 2030 — Regional platform',
      description:
        'Demonstration map of NATURA 2030 coastal climate information initiatives across Latin America.',
    },
    header: {
      eyebrow: 'COASTAL CLIMATE INTELLIGENCE',
      title: 'Regional map',
      status: 'Platform active',
      back: 'Back to site',
      language: 'Español',
    },
    map: {
      ariaLabel: 'Map of NATURA 2030 demonstration initiatives',
      locationCount: '08',
      locationCountLabel: 'Demonstration locations',
      legendTitle: 'Applications',
      satellite: 'Satellite',
      streets: 'Streets',
      resetView: 'Reset regional view',
      loadError: 'The map could not load. Check your connection and try again.',
    },
    panel: {
      demoLabel: 'Demonstration location',
      close: 'Close details',
      category: 'Application',
      status: 'Status',
      coordinates: 'Coordinates',
      dataInputs: 'Integrated data',
      outputs: 'Expected products',
      demonstrationNote:
        'This is an illustrative case. Its location and scope are used to demonstrate how the platform will work with real projects.',
    },
    categories: {
      'coastal-adaptation': 'Coastal adaptation',
      'ecosystem-restoration': 'Ecosystem restoration',
      infrastructure: 'Infrastructure',
      'risk-management': 'Risk management',
    },
  },
};
