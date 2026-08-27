import type { Locale } from '../../data/types';

export interface V2Copy {
  statusBadge: string;
  hero: {
    eyebrow: string;
    headline: string;
    lede: string;
    statsLabels: string[];
    consoleLabels: { left: string; right: string };
  };
  problem: {
    eyebrow: string;
    title: string;
    logs: { title: string; body: string }[];
  };
  sections: {
    process: { eyebrow: string; title: string };
    inputs: { eyebrow: string; title: string };
    deliverables: { eyebrow: string; title: string };
    applications: { eyebrow: string; title: string };
    about: { eyebrow: string; title: string };
    cta: { eyebrow: string; title: string };
  };
}

export const v2Copy: Record<Locale, V2Copy> = {
  es: {
    statusBadge: 'Plataforma activa',
    hero: {
      eyebrow: 'NATURA 2030 · Inteligencia climática costera',
      headline: 'Datos climáticos dispersos.\nUna {{sola fuente}} de verdad',
      lede: 'NATURA 2030 arma, depura e integra información oceánica y climática de múltiples fuentes en un motor de análisis para decisiones de adaptación costera en América Latina',
      statsLabels: ['Tipos de datos de entrada', 'Etapas de procesamiento', 'Productos entregables'],
      consoleLabels: { left: 'LAT · LON', right: 'Sincronizando' },
    },
    problem: {
      eyebrow: 'El reto',
      title: 'La costa genera señal constante. La mayoría se pierde antes de convertirse en decisión',
      logs: [
        { title: 'Modelos y observaciones', body: 'nivel del mar, marea, oleaje, viento y variables oceánicas sin cruzar entre fuentes' },
        { title: 'Datos de campo', body: 'topografía, batimetría y sensores locales sin conexión con los modelos regionales' },
        { title: 'Decisiones', body: 'reportes técnicos que llegan tarde o sin indicadores claros de incertidumbre' },
      ],
    },
    sections: {
      process: { eyebrow: 'Motor NATURA 2030', title: 'Cinco etapas, un mismo flujo de datos' },
      inputs: { eyebrow: 'Entradas del sistema', title: 'Cuatro tipos de datos alimentan el motor' },
      deliverables: { eyebrow: 'Salidas del sistema', title: 'Tres productos, listos para la toma de decisiones' },
      applications: { eyebrow: 'Aplicaciones', title: 'Del dato a la acción, en seis frentes' },
      about: { eyebrow: 'Quiénes somos', title: 'Operado por Adaptation Latin America' },
      cta: { eyebrow: 'Hablemos', title: 'Convierte datos dispersos en una decisión de adaptación' },
    },
  },
  en: {
    statusBadge: 'Platform active',
    hero: {
      eyebrow: 'NATURA 2030 · Coastal climate intelligence',
      headline: 'Scattered climate data.\nOne {{single source}} of truth',
      lede: 'NATURA 2030 assembles, cleans and integrates ocean and climate data from multiple sources into an analysis engine for coastal adaptation decisions across Latin America',
      statsLabels: ['Input data types', 'Processing stages', 'Delivered products'],
      consoleLabels: { left: 'LAT · LON', right: 'Syncing' },
    },
    problem: {
      eyebrow: 'The challenge',
      title: 'The coast produces a constant signal. Most of it is lost before it becomes a decision',
      logs: [
        { title: 'Models & observations', body: 'sea level, tide, waves, wind and ocean variables that never get cross-checked' },
        { title: 'Field data', body: 'topography, bathymetry and local sensors disconnected from regional models' },
        { title: 'Decisions', body: 'technical reports that arrive late or without clear uncertainty indicators' },
      ],
    },
    sections: {
      process: { eyebrow: 'NATURA 2030 engine', title: 'Five stages, one data flow' },
      inputs: { eyebrow: 'System inputs', title: 'Four types of data feed the engine' },
      deliverables: { eyebrow: 'System outputs', title: 'Three products, ready for decision-making' },
      applications: { eyebrow: 'Applications', title: 'From data to action, on six fronts' },
      about: { eyebrow: 'Who we are', title: 'Operated by Adaptation Latin America' },
      cta: { eyebrow: "Let's talk", title: 'Turn scattered data into an adaptation decision' },
    },
  },
};
