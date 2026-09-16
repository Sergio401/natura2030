import type { SiteContent } from './types';

export const es: SiteContent = {
  meta: {
    siteName: 'NATURA 2030',
    orgName: 'Adaptation Latin America',
    description:
      'NATURA 2030 integra información climática y oceanográfica de múltiples fuentes en insumos útiles para decisiones locales de adaptación costera en América Latina',
  },
  inputs: {
    items: [
      {
        title: 'Modelos climáticos y oceánicos',
        body: 'Nivel del mar histórico y proyectado, marea, oleaje, sobreelevación por tormenta, viento, precipitación, temperatura y escenarios climáticos',
      },
      {
        title: 'Observaciones históricas',
        body: 'Mareógrafos, boyas, estaciones meteorológicas, satélite y registros instrumentales a lo largo de la costa',
      },
      {
        title: 'Datos locales del proyecto',
        body: 'Campañas de campo, topografía y batimetría, sensores, cámaras o drones, y variables ecológicas',
      },
      {
        title: 'Información del proyecto',
        body: 'Ubicación, objetivo, horizonte temporal, escenario de análisis, tipo de ecosistema o infraestructura y nivel de riesgo',
      },
    ],
    sources: ['GTSM', 'CMIP6', 'UHSLC', 'WAVERYS', 'Datos in situ'],
  },
  deliverables: {
    items: [
      {
        tag: 'A',
        title: 'Datos procesados',
        body: 'Series temporales, mapas, estadísticas resumidas y archivos para análisis posterior',
      },
      {
        tag: 'B',
        title: 'Diagnóstico climático',
        body: 'Tendencias, variabilidad, extremos, escenarios futuros e indicadores de incertidumbre',
      },
      {
        tag: 'C',
        title: 'Soporte a decisiones',
        body: 'Reportes técnicos, infografías, indicadores de adaptación y recomendaciones',
      },
    ],
    monitoring: {
      label: 'Monitoreo ambiental',
      title: 'Mediciones en campo que respaldan cada resultado',
      body: 'Complementamos los modelos con datos tomados en el territorio: cámaras y sensores instalados en manglares y cuerpos de agua registran corrientes, niveles y cambios del ecosistema para calibrar y validar lo que entregamos.',
      imageAlt: 'Cámara GoPro instalada en un manglar registrando la velocidad de la corriente en un canal',
    },
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
    body: 'ALA es una organización sin fines de lucro que trabaja por una relación más sostenible con el agua y la naturaleza en América Latina, promoviendo una colaboración eficiente entre gobiernos, sector privado, ONG y comunidades locales',
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
    email: 'info@adaptationla.org',
    copyright: '© 2026 Adaptation Latin America. Todos los derechos reservados',
    note: 'NATURA 2030 es una iniciativa de ALA',
  },
  ui: {
    skipToContent: 'Saltar al contenido',
    themeToggleToLight: 'Cambiar a modo claro',
    themeToggleToDark: 'Cambiar a modo oscuro',
    languageLabel: 'Idioma',
    copyEmail: 'Copiar correo',
    emailCopied: '¡Copiado!',
  },
};
