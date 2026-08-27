import type { Locale } from './types';

export interface ModelsCopy {
  meta: {
    catalogTitle: string;
    catalogDescription: string;
    modelTitle: string;
    modelDescription: string;
  };
  header: {
    catalog: string;
    site: string;
  };
  catalog: {
    status: string;
    eyebrow: string;
    title: string;
    lead: string;
    available: string;
    modelCount: string;
    openModel: string;
  };
  model: {
    breadcrumb: string;
    title: string;
    subtitle: string;
    description: string;
    loadingRuntime: string;
    loadingNumpy: string;
    loadingModel: string;
    ready: string;
    error: string;
    retry: string;
    run: string;
    pause: string;
    reset: string;
    controls: string;
    inflowVelocity: string;
    centerWidth: string;
    cylinderDensity: string;
    low: string;
    high: string;
    displayedField: string;
    speed: string;
    vorticity: string;
    presets: string;
    presetOpen: string;
    presetBalanced: string;
    presetDense: string;
    simulationStep: string;
    meanSpeed: string;
    peakSpeed: string;
    latticeUnits: string;
    streamwise: string;
    crossChannel: string;
  };
}

export const modelsCopy: Record<Locale, ModelsCopy> = {
  es: {
    meta: {
      catalogTitle: 'NATURA 2030 — Laboratorio de modelos',
      catalogDescription: 'Modelos científicos interactivos de NATURA 2030 ejecutados directamente en el navegador',
      modelTitle: 'Canal vegetado de dos lados — NATURA 2030',
      modelDescription: 'Simulación LBM interactiva de flujo en un canal vegetado de dos lados',
    },
    header: {
      catalog: 'Laboratorio de modelos',
      site: 'Volver al sitio',
    },
    catalog: {
      status: 'Laboratorio activo',
      eyebrow: 'MODELOS INTERACTIVOS',
      title: 'Explora el comportamiento de sistemas costeros.',
      lead: 'Un espacio para ejecutar, comparar y comprender modelos científicos.',
      available: 'Disponible ahora',
      modelCount: '01 modelo interactivo',
      openModel: 'Abrir simulador',
    },
    model: {
      breadcrumb: 'Modelos / Hidrodinámica',
      title: 'Canal vegetado de dos lados',
      subtitle: 'Flujo, vegetación y recirculación en tiempo real',
      description: 'Prototipo D2Q9 BGK para explorar cómo la velocidad de entrada, el ancho del canal y la densidad de elementos vegetados modifican el campo de flujo.',
      loadingRuntime: 'Preparando el entorno científico…',
      loadingNumpy: 'Cargando el motor numérico…',
      loadingModel: 'Inicializando la geometría…',
      ready: 'Simulación lista',
      error: 'No fue posible iniciar la simulación.',
      retry: 'Reintentar',
      run: 'Ejecutar',
      pause: 'Pausar',
      reset: 'Reiniciar',
      controls: 'Parámetros del escenario',
      inflowVelocity: 'Velocidad de entrada',
      centerWidth: 'Ancho del canal central',
      cylinderDensity: 'Densidad de vegetación',
      low: 'Baja',
      high: 'Alta',
      displayedField: 'Campo visualizado',
      speed: 'Velocidad',
      vorticity: 'Vorticidad',
      presets: 'Escenarios rápidos',
      presetOpen: 'Canal abierto',
      presetBalanced: 'Equilibrado',
      presetDense: 'Vegetación densa',
      simulationStep: 'Paso',
      meanSpeed: 'Velocidad media',
      peakSpeed: 'Velocidad máxima',
      latticeUnits: 'unidades lattice',
      streamwise: 'Dirección longitudinal',
      crossChannel: 'Dirección transversal',
    },
  },
  en: {
    meta: {
      catalogTitle: 'NATURA 2030 — Model laboratory',
      catalogDescription: 'Interactive NATURA 2030 scientific models running directly in the browser',
      modelTitle: 'Two-sided vegetated channel — NATURA 2030',
      modelDescription: 'Interactive LBM simulation of flow through a two-sided vegetated channel',
    },
    header: {
      catalog: 'Model laboratory',
      site: 'Back to site',
    },
    catalog: {
      status: 'Laboratory active',
      eyebrow: 'INTERACTIVE MODELS',
      title: 'Explore how coastal systems behave.',
      lead: 'A space to run, compare, and understand scientific models.',
      available: 'Available now',
      modelCount: '01 interactive model',
      openModel: 'Open simulator',
    },
    model: {
      breadcrumb: 'Models / Hydrodynamics',
      title: 'Two-sided vegetated channel',
      subtitle: 'Flow, vegetation, and recirculation in real time',
      description: 'A D2Q9 BGK prototype for exploring how inflow velocity, channel width, and vegetation density modify the flow field.',
      loadingRuntime: 'Preparing the scientific runtime…',
      loadingNumpy: 'Loading the numerical engine…',
      loadingModel: 'Initializing geometry…',
      ready: 'Simulation ready',
      error: 'The simulation could not be started.',
      retry: 'Try again',
      run: 'Run',
      pause: 'Pause',
      reset: 'Reset',
      controls: 'Scenario parameters',
      inflowVelocity: 'Inflow velocity',
      centerWidth: 'Center channel width',
      cylinderDensity: 'Vegetation density',
      low: 'Low',
      high: 'High',
      displayedField: 'Displayed field',
      speed: 'Speed',
      vorticity: 'Vorticity',
      presets: 'Quick scenarios',
      presetOpen: 'Open channel',
      presetBalanced: 'Balanced',
      presetDense: 'Dense vegetation',
      simulationStep: 'Step',
      meanSpeed: 'Mean speed',
      peakSpeed: 'Peak speed',
      latticeUnits: 'lattice units',
      streamwise: 'Streamwise direction',
      crossChannel: 'Cross-channel direction',
    },
  },
};
