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
      eyebrow: 'Adaptation Latin America',
      headline: 'Transformamos información ambiental en {{soluciones resilientes}} para la región',
      lede: 'Integramos datos, tecnología y naturaleza para anticipar riesgos, orientar decisiones y responder a los desafíos climáticos.',
    },
    problem: {
      eyebrow: 'Entender · Actuar · Fortalecer',
      title: 'Herramientas para la adaptación climática',
      body: 'Cada territorio define sus propios desafíos. Nosotros brindamos soluciones innovadoras a la medida de su realidad.',
      chips: ['Inteligencia ambiental', 'Soluciones basadas en la naturaleza', 'Desarrollo local'],
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
      eyebrow: 'Adaptation Latin America',
      headline: 'Transforming environmental information into {{resilient solutions}} for the region',
      lede: 'We integrate data, technology, and nature to anticipate risks, inform decisions, and respond to climate challenges.',
    },
    problem: {
      eyebrow: 'Understand · Act · Strengthen',
      title: 'Tools for climate adaptation',
      body: 'Every territory faces its own challenges. We deliver innovative solutions designed for specific contexts.',
      chips: ['Environmental Intelligence', 'Nature-Based Solutions', 'Local Development'],
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
