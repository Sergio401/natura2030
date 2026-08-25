import type { SiteContent } from './types';

export const es: SiteContent = {
  meta: {
    siteName: 'NATURA 2030',
    orgName: 'Adaptation Latin America',
    description:
      'NATURA 2030 integra información climática y oceanográfica de múltiples fuentes en insumos útiles para decisiones locales de adaptación costera en América Latina.',
  },
  process: {
    steps: [
      {
        n: '1',
        title: 'Definición del sitio y del objetivo',
        body: 'Identificación del problema, ubicación, horizonte temporal y necesidades del proyecto.',
      },
      {
        n: '2',
        title: 'Selección, descarga e ingesta',
        body: 'Recopilación de datos relevantes de modelos, observaciones y fuentes locales.',
      },
      {
        n: '3',
        title: 'Armonización y control de calidad',
        body: 'Revisión de cobertura, consistencia, unidades, coordenadas y datums.',
      },
      {
        n: '4',
        title: 'Integración y análisis',
        body: 'Combinación físico-estadística de fuentes, tendencias, climatologías y escenarios.',
      },
      {
        n: '5',
        title: 'Interpretación para adaptación',
        body: 'Traducción de los resultados en información útil para planificación y toma de decisiones.',
      },
    ],
  },
  inputs: {
    items: [
      {
        title: 'Modelos climáticos y oceánicos',
        body: 'Nivel del mar histórico y proyectado, marea, oleaje, sobreelevación por tormenta, viento, precipitación, temperatura y escenarios climáticos.',
      },
      {
        title: 'Observaciones históricas',
        body: 'Mareógrafos, boyas, estaciones meteorológicas, satélite y registros instrumentales a lo largo de la costa.',
      },
      {
        title: 'Datos locales del proyecto',
        body: 'Campañas de campo, topografía y batimetría, sensores, cámaras o drones, y variables ecológicas.',
      },
      {
        title: 'Información del proyecto',
        body: 'Ubicación, objetivo, horizonte temporal, escenario de análisis, tipo de ecosistema o infraestructura y nivel de riesgo.',
      },
    ],
    sources: ['GTSM', 'CMIP6', 'UHSLC', 'WAVERYS', 'Datos in situ'],
  },
  deliverables: {
    items: [
      {
        tag: 'A',
        title: 'Datos procesados',
        body: 'Series temporales, mapas, estadísticas resumidas y archivos para análisis posterior.',
      },
      {
        tag: 'B',
        title: 'Diagnóstico climático',
        body: 'Tendencias, variabilidad, extremos, escenarios futuros e indicadores de incertidumbre.',
      },
      {
        tag: 'C',
        title: 'Soporte a decisiones',
        body: 'Reportes técnicos, infografías, indicadores de adaptación y recomendaciones.',
      },
    ],
  },
  applications: {
    items: [
      'Adaptación costera',
      'Restauración de ecosistemas',
      'Ordenamiento territorial',
      'Infraestructura',
      'Gestión del riesgo',
      'Inversión y seguros',
    ],
  },
  about: {
    body: 'ALA es una organización sin fines de lucro que trabaja por una relación más sostenible con el agua y la naturaleza en América Latina, promoviendo una colaboración eficiente entre gobiernos, sector privado, ONG y comunidades locales.',
    pillars: ['Agua', 'Clima', 'Naturaleza'],
    org: [
      { label: 'Organización', value: 'Adaptation Latin America' },
      { label: 'Plataforma', value: 'NATURA 2030' },
      { label: 'Cobertura', value: 'América Latina' },
      { label: 'Líneas estratégicas', value: '3' },
      { label: 'Estado', value: 'Activo' },
    ],
  },
  cta: {
    initiatives: 'Ver iniciativas',
    models: 'Ver modelos',
  },
  footer: {
    email: 'algo@natura2030.com',
    copyright: '© 2026 Adaptation Latin America. Todos los derechos reservados.',
    note: 'NATURA 2030 es una iniciativa de ALA.',
  },
  ui: {
    skipToContent: 'Saltar al contenido',
    themeToggleToLight: 'Cambiar a modo claro',
    themeToggleToDark: 'Cambiar a modo oscuro',
    languageLabel: 'Idioma',
    versionLabel: 'Estilo',
    versionNames: {
      v1: 'Nature Distilled',
      v2: 'Motor de Datos',
      v3: 'La Costa',
    },
    copyEmail: 'Copiar correo',
    emailCopied: '¡Copiado!',
  },
};
