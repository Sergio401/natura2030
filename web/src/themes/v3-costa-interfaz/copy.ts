import type { Locale } from '../../data/types';

export interface V3Copy {
  hero: {
    eyebrow: string;
    headline: string;
    lede: string;
  };
  sections: {
    inputs: { eyebrow: string; title: string };
    process: { eyebrow: string; title: string };
    deliverables: { eyebrow: string; title: string };
    applications: { eyebrow: string; title: string };
    about: { eyebrow: string; title: string };
    cta: { eyebrow: string; title: string };
  };
}

export const v3Copy: Record<Locale, V3Copy> = {
  es: {
    hero: {
      eyebrow: 'NATURA 2030 · Adaptation Latin America',
      headline: 'La costa de América Latina,\nleída de {{punta a punta}}',
      lede: 'Mareógrafos, boyas, satélites y campañas de campo, convertidos en una misma lectura del litoral para decidir con información',
    },
    sections: {
      inputs: { eyebrow: 'Un territorio, miles de señales', title: 'Cuatro tipos de datos alimentan la misma lectura del litoral' },
      process: { eyebrow: 'Cómo funciona', title: 'De la señal cruda a la decisión, en cinco pasos' },
      deliverables: { eyebrow: 'Qué entregamos', title: 'Tres productos, con la costa como unidad de análisis' },
      applications: { eyebrow: 'Dónde se aplica', title: 'Seis puntos de la costa donde el dato se vuelve acción' },
      about: { eyebrow: 'Quiénes somos', title: 'Adaptation Latin America' },
      cta: { eyebrow: 'Hablemos', title: 'Lleva la costa que cuidas a NATURA 2030' },
    },
  },
  en: {
    hero: {
      eyebrow: 'NATURA 2030 · Adaptation Latin America',
      headline: "Latin America's coastline,\nread from {{end to end}}",
      lede: 'Tide gauges, buoys, satellites and field campaigns, turned into one single reading of the coastline to decide with information',
    },
    sections: {
      inputs: { eyebrow: 'A territory, thousands of signals', title: 'Four types of data feed the same reading of the coastline' },
      process: { eyebrow: 'How it works', title: 'From raw signal to decision, in five steps' },
      deliverables: { eyebrow: 'What we deliver', title: 'Three products, with the coast as the unit of analysis' },
      applications: { eyebrow: "Where it's applied", title: 'Six points along the coast where data becomes action' },
      about: { eyebrow: 'Who we are', title: 'Adaptation Latin America' },
      cta: { eyebrow: "Let's talk", title: 'Bring the coast you protect to NATURA 2030' },
    },
  },
};
