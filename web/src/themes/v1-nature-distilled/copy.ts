import type { Locale } from '../../data/types';

export interface V1Copy {
  hero: {
    eyebrow: string;
    headline: string;
    lede: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    body: string;
    chips: string[];
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

export const v1Copy: Record<Locale, V1Copy> = {
  es: {
    hero: {
      eyebrow: 'Adaptation Latin America · NATURA 2030',
      headline: 'De los datos del {{océano}}\na las decisiones que protegen la {{costa}}',
      lede: 'NATURA 2030 traduce modelos climáticos, mareas, oleaje y datos de campo en información clara para quienes cuidan el litoral latinoamericano',
    },
    problem: {
      eyebrow: 'El reto',
      title: 'La información de la costa existe. Solo está dispersa',
      body: 'Modelos climáticos, mareógrafos, boyas, satélites y campañas de campo generan datos valiosos sobre el litoral de América Latina — pero rara vez llegan a tiempo, en un formato útil, a quienes deben decidir sobre restauración, infraestructura o riesgo costero',
      chips: ['Modelos climáticos y oceánicos', 'Observaciones históricas', 'Datos locales de campo'],
    },
    sections: {
      process: { eyebrow: 'El proceso', title: 'De datos dispersos a decisiones, en cinco etapas' },
      inputs: { eyebrow: 'Qué integra la plataforma', title: 'Cuatro tipos de datos, una sola lectura del territorio' },
      deliverables: { eyebrow: 'Qué entregamos', title: 'Productos listos para respaldar una decisión' },
      applications: { eyebrow: 'Dónde se aplica', title: 'Un mismo motor, seis decisiones distintas sobre la costa' },
      about: { eyebrow: 'Quiénes somos', title: 'Impulsados por Adaptation Latin America' },
      cta: { eyebrow: 'Hablemos', title: '¿Listo para llevar datos dispersos a decisiones de adaptación?' },
    },
  },
  en: {
    hero: {
      eyebrow: 'Adaptation Latin America · NATURA 2030',
      headline: 'From ocean {{data}}\nto decisions that protect the {{coast}}',
      lede: 'NATURA 2030 turns climate models, tides, waves and field data into clear information for those who care for the Latin American coastline',
    },
    problem: {
      eyebrow: 'The challenge',
      title: "The coast's information exists. It's just scattered",
      body: 'Climate models, tide gauges, buoys, satellites and field campaigns generate valuable data about the Latin American coastline — but it rarely reaches those deciding on restoration, infrastructure or coastal risk in time, or in a usable format',
      chips: ['Climate & ocean models', 'Historical observations', 'Local field data'],
    },
    sections: {
      process: { eyebrow: 'The process', title: 'From scattered data to decisions, in five stages' },
      inputs: { eyebrow: 'What the platform integrates', title: 'Four types of data, one single reading of the territory' },
      deliverables: { eyebrow: 'What we deliver', title: 'Products ready to back a decision' },
      applications: { eyebrow: "Where it's applied", title: 'One engine, six different decisions about the coast' },
      about: { eyebrow: 'Who we are', title: 'Driven by Adaptation Latin America' },
      cta: { eyebrow: "Let's talk", title: 'Ready to turn scattered data into adaptation decisions?' },
    },
  },
};
