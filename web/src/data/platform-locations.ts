import type { Locale } from './types';
import type { LocationCategory } from './platform-copy';

export interface LocalizedLocationDetails {
  title: string;
  region: string;
  status: string;
  summary: string;
  /** Optional — shown only when both `challenge` and `response` are set. */
  challenge?: string;
  response?: string;
  applications: string[];
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
    id: 'manglares-nayarit',
    coordinates: [-105.57895089948256, 22.097457215542097],
    category: 'ecosystem-restoration',
    content: {
      es: {
        title: 'Medición de corrientes en manglares',
        region: 'Marismas Nacionales, Nayarit · México',
        status: 'En ejecución',
        summary:
          'ALA apoya al Yale Center for Natural Carbon Capture mediante la medición de velocidades del agua en canales de manglar y bordes de bosque. El monitoreo con cámaras complementa mediciones de pH, alcalinidad, salinidad y oxígeno disuelto para mejorar las estimaciones de los flujos de carbono y alcalinidad.',
        challenge:
          'Cuantificar la exportación de carbono y alcalinidad desde los manglares requiere integrar información química e hidrodinámica. Las mediciones químicas indican qué sustancias están presentes en el agua, mientras que las velocidades de corriente permiten determinar cómo se transportan a través de los canales de manglar y hacia las aguas costeras adyacentes.',
        response:
          'ALA despliega una red de hasta siete cámaras y desarrolla algoritmos de procesamiento de imágenes para medir corrientes superficiales en canales de manglar y bordes de bosque. Estas observaciones hidrodinámicas se integran con las mediciones biogeoquímicas de Yale para apoyar estimaciones cuantitativas del transporte de carbono y alcalinidad.',
        applications: ['Restauración de ecosistemas', 'Monitoreo ambiental'],
        dataInputs: ['Marea y nivel del mar', 'Velocidades de corriente'],
        outputs: ['Campos de velocidad', 'Recomendaciones para restauración'],
      },
      en: {
        title: 'Measuring currents in mangroves',
        region: 'Marismas Nacionales, Nayarit · Mexico',
        status: 'Ongoing',
        summary:
          'ALA supports the Yale Center for Natural Carbon Capture by measuring water velocities in mangrove channels and forest edges. Camera-based monitoring complements pH, alkalinity, salinity and dissolved oxygen measurements to improve carbon and alkalinity flux estimates.',
        challenge:
          'Quantifying carbon and alkalinity export from mangroves requires integrating chemical and hydrodynamic information. Chemical measurements show which substances are present in the water, while current velocities reveal how they are transported through mangrove channels toward adjacent coastal waters.',
        response:
          'ALA deploys a network of up to seven cameras and develops image-processing algorithms to measure surface currents in mangrove channels and forest edges. These hydrodynamic observations are integrated with Yale’s biogeochemical measurements to support quantitative estimates of carbon and alkalinity transport.',
        applications: ['Ecosystem restoration', 'Environmental monitoring'],
        dataInputs: ['Tide and sea level', 'Current velocities'],
        outputs: ['Velocity fields', 'Restoration recommendations'],
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
        challenge: 'Pérdida y degradación de humedales costeros debido a cambios hidrodinámicos, presión humana y aumento del nivel del mar.',
        response: 'Combinamos observaciones satelitales, dinámica costera y datos ecológicos para identificar áreas prioritarias y diseñar estrategias de restauración efectivas.',
        applications: ['Restauración de humedales', 'Gestión costera y adaptación climática', 'Monitoreo de ecosistemas'],
        dataInputs: ['Observaciones satelitales', 'Marea y nivel del mar', 'Datos ecológicos de campo'],
        outputs: ['Cartografía procesada', 'Diagnóstico ecosistémico', 'Indicadores de seguimiento'],
      },
      en: {
        title: 'Gulf of Guayaquil',
        region: 'Guayas · Ecuador',
        status: 'Conceptual scenario',
        summary:
          'Integration of coastal observations and ecological data to identify favorable conditions for wetland recovery',
        challenge: 'Loss and degradation of coastal wetlands caused by hydrodynamic change, human pressure and sea-level rise.',
        response: 'We combine satellite observations, coastal dynamics and ecological data to identify priority areas and design effective restoration strategies.',
        applications: ['Wetland restoration', 'Coastal management and climate adaptation', 'Ecosystem monitoring'],
        dataInputs: ['Satellite observations', 'Tides and sea level', 'Field ecology data'],
        outputs: ['Processed mapping', 'Ecosystem diagnosis', 'Monitoring indicators'],
      },
    },
  },
];

