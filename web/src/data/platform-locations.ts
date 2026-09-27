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
  /** Alt text of the location's hero photo (the image itself lives in `platform-location-media.ts`). */
  heroAlt: string;
  /** Paragraphs (1–2) of the panel's "Project overview" tab. */
  overview: string[];
}

export interface PlatformLocation {
  id: string;
  coordinates: [longitude: number, latitude: number];
  category: LocationCategory;
  /** Finished projects show a static status dot instead of the pulsing "live" one. */
  completed?: boolean;
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
        heroAlt:
          'Monitoreo de corrientes en un canal de manglar en Nayarit mediante una cámara GoPro y visualización de campos de velocidad',
        overview: [
          'El proyecto combina hidrodinámica y biogeoquímica para entender cuánto carbono y alcalinidad exportan los manglares de Marismas Nacionales hacia el océano. ALA aporta la red de cámaras y los algoritmos que convierten video en campos de velocidad; el equipo de Yale mide la química del agua.',
          'Juntos, estos datos permiten estimar los flujos con mayor precisión y orientar la conservación y restauración de uno de los sistemas de manglar más extensos del Pacífico mexicano.',
        ],
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
        heroAlt:
          'Monitoring currents in a mangrove channel in Nayarit using a GoPro camera and velocity field visualization',
        overview: [
          'The project combines hydrodynamics and biogeochemistry to understand how much carbon and alkalinity the mangroves of Marismas Nacionales export to the ocean. ALA provides the camera network and the algorithms that turn video into velocity fields; the Yale team measures water chemistry.',
          'Together, these data make flux estimates more precise and guide the conservation and restoration of one of the largest mangrove systems on Mexico’s Pacific coast.',
        ],
      },
    },
  },
  {
    id: 'punta-soldado',
    coordinates: [-77.16185, 3.78864],
    category: 'coastal-adaptation',
    content: {
      es: {
        title: 'Adaptación climática y resiliencia costera en Punta Soldado',
        region: 'Isla Punta Soldado, Buenaventura, Valle del Cauca · Colombia',
        status: 'En ejecución',
        summary:
          'ALA apoya la adaptación climática en Punta Soldado mediante monitoreo costero, modelación hidrodinámica, soluciones basadas en la naturaleza y desarrollo local.',
        challenge:
          'Punta Soldado enfrenta inundaciones, variaciones del nivel del mar y presiones sobre sus ecosistemas costeros que afectan el territorio y los medios de vida locales.',
        response:
          'ALA integra pronósticos de nivel del mar, mediciones de corrientes, modelación costera, pilotos basados en la naturaleza y fortalecimiento de capacidades locales.',
        applications: ['Adaptación climática', 'Gestión del riesgo', 'Restauración de ecosistemas', 'Monitoreo ambiental', 'Desarrollo local'],
        dataInputs: [
          'Nivel del mar, mareas y corrientes',
          'Mediciones de corrientes con cámaras GoPro',
          'Modelos 3D de raíces de manglar',
          'Hidrodinámica costera con Delft3D',
          'Condiciones asociadas a El Niño',
        ],
        outputs: [
          'Pronósticos de inundación',
          'Campos de velocidad',
          'Modelos hidrodinámicos',
          'Modelos 3D de manglar',
          'Piloto de barrera permeable',
          'Fortalecimiento local',
        ],
        heroAlt: 'Lanchas de madera frente a un borde de manglar con árboles secos en Punta Soldado, Buenaventura',
        overview: [
          'Punta Soldado es una isla del Pacífico colombiano, en la bahía de Buenaventura, expuesta a mareas altas, oleaje y a los efectos de El Niño. El proyecto combina pronósticos de nivel del mar, mediciones de corrientes y modelación con Delft3D para entender cómo se mueve el agua alrededor de la isla y de sus manglares.',
          'Con esa base se evalúa una barrera permeable de madera como solución basada en la naturaleza y se fortalecen capacidades locales en turismo de naturaleza y apoyo a la investigación científica.',
        ],
      },
      en: {
        title: 'Climate adaptation and coastal resilience in Punta Soldado',
        region: 'Punta Soldado Island, Buenaventura, Valle del Cauca · Colombia',
        status: 'Ongoing',
        summary:
          'ALA supports climate adaptation in Punta Soldado through coastal monitoring, hydrodynamic modeling, nature-based solutions and local development.',
        challenge:
          'Punta Soldado faces flooding, sea-level variability and pressure on its coastal ecosystems, affecting the territory and local livelihoods.',
        response:
          'ALA integrates sea-level forecasts, current measurements, coastal modeling, nature-based pilots and local capacity building.',
        applications: ['Climate adaptation', 'Risk management', 'Ecosystem restoration', 'Environmental monitoring', 'Local development'],
        dataInputs: [
          'Sea level, tides and currents',
          'Current measurements with GoPro cameras',
          '3D models of mangrove roots',
          'Coastal hydrodynamics with Delft3D',
          'El Niño–related conditions',
        ],
        outputs: [
          'Flood forecasts',
          'Velocity fields',
          'Hydrodynamic models',
          '3D mangrove models',
          'Permeable barrier pilot',
          'Local capacity building',
        ],
        heroAlt: 'Wooden boats in front of a mangrove edge with dead trees in Punta Soldado, Buenaventura',
        overview: [
          'Punta Soldado is an island on Colombia’s Pacific coast, in the bay of Buenaventura, exposed to high tides, waves and the effects of El Niño. The project combines sea-level forecasts, current measurements and Delft3D modeling to understand how water moves around the island and its mangroves.',
          'On that basis, a permeable wooden barrier is being tested as a nature-based solution, and local capacity is strengthened in nature tourism and support for scientific research.',
        ],
      },
    },
  },
  {
    id: 'juventudes-agua-quito',
    coordinates: [-78.4678, -0.1807],
    category: 'local-development',
    completed: true,
    content: {
      es: {
        title: 'Juventudes por el agua en Ecuador',
        region: 'Quito, Pichincha · Ecuador',
        status: 'Finalizado',
        summary:
          'ALA apoyó la participación de jóvenes en el II Encuentro Nacional de Juventudes del Agua de Ecuador, fortaleciendo oportunidades de formación, liderazgo y colaboración en torno a la gestión sostenible del agua.',
        challenge:
          'Las juventudes necesitan mayores oportunidades para fortalecer sus capacidades, participar en la gestión del agua y conectarse con redes y organizaciones que trabajan por la sostenibilidad hídrica.',
        response:
          'ALA auspició la participación de jóvenes en el encuentro nacional, facilitando su acceso a espacios de capacitación, intercambio de experiencias y articulación con la Red Agua Ecuador.',
        applications: ['Desarrollo local'],
        dataInputs: [],
        outputs: ['Auspicio de participantes', 'Fortalecimiento de capacidades'],
        heroAlt:
          'Río rodeado de vegetación tropical en Baños, Ecuador, utilizado como imagen representativa de la gestión y conservación del agua',
        overview: [
          'En el II Encuentro Nacional de Juventudes del Agua de Ecuador, ALA auspició la participación de jóvenes para que accedieran a talleres, espacios de intercambio y a la Red Agua Ecuador.',
          'La iniciativa apuesta por formar una nueva generación de líderes que una el conocimiento técnico y comunitario en la gestión sostenible del agua.',
        ],
      },
      en: {
        title: 'Youth for water in Ecuador',
        region: 'Quito, Pichincha · Ecuador',
        status: 'Completed',
        summary:
          'ALA supported young people’s participation in Ecuador’s 2nd National Youth for Water Gathering, strengthening opportunities for training, leadership and collaboration around sustainable water management.',
        challenge:
          'Young people need more opportunities to build their skills, take part in water management and connect with networks and organizations working for water sustainability.',
        response:
          'ALA sponsored young people’s participation in the national gathering, giving them access to training, experience-sharing and connection with the Red Agua Ecuador network.',
        applications: ['Local development'],
        dataInputs: [],
        outputs: ['Participant sponsorship', 'Capacity building'],
        heroAlt:
          'River surrounded by tropical vegetation in Baños, Ecuador, used as a representative image of water management and conservation',
        overview: [
          'At Ecuador’s 2nd National Youth for Water Gathering, ALA sponsored young people so they could join workshops, exchange spaces and the Red Agua Ecuador network.',
          'The initiative invests in a new generation of leaders who bring technical and community knowledge together in sustainable water management.',
        ],
      },
    },
  },
];

