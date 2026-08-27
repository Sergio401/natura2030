import type { Locale } from './types';
import type { LocationCategory } from './platform-copy';

export interface LocalizedLocationDetails {
  title: string;
  region: string;
  status: string;
  summary: string;
  dataInputs: string[];
  outputs: string[];
}

export interface PlatformLocation {
  id: string;
  coordinates: [longitude: number, latitude: number];
  category: LocationCategory;
  content: Record<Locale, LocalizedLocationDetails>;
}

export const platformLocations: PlatformLocation[] = [
  {
    id: 'caribbean-coast-colombia',
    coordinates: [-75.5144, 10.391],
    category: 'coastal-adaptation',
    content: {
      es: {
        title: 'Costa Caribe de Colombia',
        region: 'Cartagena de Indias · Colombia',
        status: 'Escenario conceptual',
        summary:
          'Integración de información de nivel del mar, oleaje y exposición urbana para orientar prioridades de adaptación en sectores costeros',
        dataInputs: ['Nivel del mar histórico y proyectado', 'Oleaje y marea', 'Topografía costera'],
        outputs: ['Diagnóstico climático', 'Mapas de exposición', 'Indicadores de adaptación'],
      },
      en: {
        title: 'Colombian Caribbean Coast',
        region: 'Cartagena de Indias · Colombia',
        status: 'Conceptual scenario',
        summary:
          'Integration of sea-level, wave and urban exposure information to guide adaptation priorities in coastal districts',
        dataInputs: ['Historical and projected sea level', 'Waves and tides', 'Coastal topography'],
        outputs: ['Climate diagnosis', 'Exposure maps', 'Adaptation indicators'],
      },
    },
  },
  {
    id: 'cienaga-grande-colombia',
    coordinates: [-74.409, 10.817],
    category: 'ecosystem-restoration',
    content: {
      es: {
        title: 'Ciénaga Grande',
        region: 'Magdalena · Colombia',
        status: 'Escenario conceptual',
        summary:
          'Lectura conjunta de variables climáticas, hidrológicas y ecológicas para apoyar la restauración y el seguimiento de ecosistemas de manglar',
        dataInputs: ['Precipitación y temperatura', 'Imágenes satelitales', 'Variables ecológicas locales'],
        outputs: ['Línea base ambiental', 'Indicadores de restauración', 'Reporte de tendencias'],
      },
      en: {
        title: 'Ciénaga Grande',
        region: 'Magdalena · Colombia',
        status: 'Conceptual scenario',
        summary:
          'Combined climate, hydrological and ecological analysis to support mangrove restoration and ecosystem monitoring',
        dataInputs: ['Precipitation and temperature', 'Satellite imagery', 'Local ecological variables'],
        outputs: ['Environmental baseline', 'Restoration indicators', 'Trend report'],
      },
    },
  },
  {
    id: 'pacific-coast-colombia',
    coordinates: [-77.0197, 3.8801],
    category: 'risk-management',
    content: {
      es: {
        title: 'Litoral Pacífico de Colombia',
        region: 'Buenaventura · Colombia',
        status: 'Escenario conceptual',
        summary:
          'Análisis de precipitación extrema, oleaje y sobreelevación por tormenta para fortalecer la gestión local del riesgo costero',
        dataInputs: ['Precipitación extrema', 'Oleaje', 'Sobreelevación por tormenta'],
        outputs: ['Mapas de amenaza', 'Series temporales', 'Recomendaciones de gestión'],
      },
      en: {
        title: 'Colombian Pacific Coast',
        region: 'Buenaventura · Colombia',
        status: 'Conceptual scenario',
        summary:
          'Analysis of extreme rainfall, waves and storm surge to strengthen local coastal risk management',
        dataInputs: ['Extreme precipitation', 'Wave conditions', 'Storm surge'],
        outputs: ['Hazard maps', 'Time series', 'Management recommendations'],
      },
    },
  },
  {
    id: 'gulf-of-guayaquil',
    coordinates: [-80.052, -2.435],
    category: 'ecosystem-restoration',
    content: {
      es: {
        title: 'Golfo de Guayaquil',
        region: 'Guayas · Ecuador',
        status: 'Escenario conceptual',
        summary:
          'Integración de observaciones costeras y datos ecológicos para identificar condiciones favorables para la recuperación de humedales',
        dataInputs: ['Observaciones satelitales', 'Marea y nivel del mar', 'Datos ecológicos de campo'],
        outputs: ['Cartografía procesada', 'Diagnóstico ecosistémico', 'Indicadores de seguimiento'],
      },
      en: {
        title: 'Gulf of Guayaquil',
        region: 'Guayas · Ecuador',
        status: 'Conceptual scenario',
        summary:
          'Integration of coastal observations and ecological data to identify favorable conditions for wetland recovery',
        dataInputs: ['Satellite observations', 'Tides and sea level', 'Field ecology data'],
        outputs: ['Processed mapping', 'Ecosystem diagnosis', 'Monitoring indicators'],
      },
    },
  },
  {
    id: 'callao-port-coast',
    coordinates: [-77.15, -12.056],
    category: 'infrastructure',
    content: {
      es: {
        title: 'Costa portuaria del Callao',
        region: 'Callao · Perú',
        status: 'Escenario conceptual',
        summary:
          'Evaluación de condiciones oceánicas actuales y futuras para apoyar decisiones de resiliencia en infraestructura costera estratégica',
        dataInputs: ['Oleaje y viento', 'Batimetría', 'Escenarios climáticos'],
        outputs: ['Estadísticas resumidas', 'Escenarios de exposición', 'Soporte a decisiones'],
      },
      en: {
        title: 'Callao Port Coast',
        region: 'Callao · Peru',
        status: 'Conceptual scenario',
        summary:
          'Assessment of present and future ocean conditions to support resilience decisions for strategic coastal infrastructure',
        dataInputs: ['Waves and wind', 'Bathymetry', 'Climate scenarios'],
        outputs: ['Summary statistics', 'Exposure scenarios', 'Decision support'],
      },
    },
  },
  {
    id: 'recife-metropolitan-coast',
    coordinates: [-34.877, -8.054],
    category: 'coastal-adaptation',
    content: {
      es: {
        title: 'Costa metropolitana de Recife',
        region: 'Pernambuco · Brasil',
        status: 'Escenario conceptual',
        summary:
          'Síntesis de tendencias climáticas y exposición urbana para explorar medidas de adaptación en una costa metropolitana de alta densidad',
        dataInputs: ['Nivel del mar', 'Temperatura y precipitación', 'Información territorial'],
        outputs: ['Tendencias climáticas', 'Indicadores de incertidumbre', 'Opciones de adaptación'],
      },
      en: {
        title: 'Recife Metropolitan Coast',
        region: 'Pernambuco · Brazil',
        status: 'Conceptual scenario',
        summary:
          'Synthesis of climate trends and urban exposure to explore adaptation measures for a high-density metropolitan coastline',
        dataInputs: ['Sea level', 'Temperature and precipitation', 'Territorial information'],
        outputs: ['Climate trends', 'Uncertainty indicators', 'Adaptation options'],
      },
    },
  },
  {
    id: 'rio-de-la-plata',
    coordinates: [-56.1645, -34.9011],
    category: 'risk-management',
    content: {
      es: {
        title: 'Estuario del Río de la Plata',
        region: 'Montevideo · Uruguay',
        status: 'Escenario conceptual',
        summary:
          'Combinación de viento, nivel del agua y escenarios futuros para apoyar la planificación ante eventos extremos en el borde urbano',
        dataInputs: ['Viento', 'Nivel del agua', 'Escenarios futuros'],
        outputs: ['Análisis de extremos', 'Mapas de riesgo', 'Recomendaciones de planificación'],
      },
      en: {
        title: 'Río de la Plata Estuary',
        region: 'Montevideo · Uruguay',
        status: 'Conceptual scenario',
        summary:
          'Combination of wind, water-level and future-scenario data to support planning for extreme events along the urban waterfront',
        dataInputs: ['Wind', 'Water level', 'Future scenarios'],
        outputs: ['Extreme-event analysis', 'Risk maps', 'Planning recommendations'],
      },
    },
  },
  {
    id: 'santo-domingo-coast',
    coordinates: [-69.888, 18.463],
    category: 'infrastructure',
    content: {
      es: {
        title: 'Frente costero de Santo Domingo',
        region: 'Distrito Nacional · República Dominicana',
        status: 'Escenario conceptual',
        summary:
          'Lectura integrada de tormentas, oleaje e infraestructura expuesta para priorizar acciones de resiliencia en el frente costero',
        dataInputs: ['Trayectorias de tormentas', 'Oleaje y sobreelevación', 'Inventario de infraestructura'],
        outputs: ['Diagnóstico de exposición', 'Indicadores de resiliencia', 'Prioridades de intervención'],
      },
      en: {
        title: 'Santo Domingo Waterfront',
        region: 'National District · Dominican Republic',
        status: 'Conceptual scenario',
        summary:
          'Integrated analysis of storms, waves and exposed infrastructure to prioritize resilience actions along the waterfront',
        dataInputs: ['Storm tracks', 'Waves and storm surge', 'Infrastructure inventory'],
        outputs: ['Exposure diagnosis', 'Resilience indicators', 'Intervention priorities'],
      },
    },
  },
];
