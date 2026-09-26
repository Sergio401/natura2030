import type { Locale } from '../../data/types';

export interface V1Copy {
  hero: {
    eyebrow: string;
    headline: string;
    lede: string;
    contactLabel: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    body: string;
    chips: { label: string; description: string }[];
  };
  sections: {
    inputs: { eyebrow: string; title: string };
    deliverables: { eyebrow: string; title: string };
    collaborators: { eyebrow: string; title: string; ctaTitle: string };
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
      contactLabel: '¿Prefieres escribirnos directamente?',
    },
    problem: {
      eyebrow: 'Entender · Actuar · Fortalecer',
      title: 'Herramientas para la adaptación climática',
      body: 'Cada territorio define sus propios desafíos. Nosotros brindamos soluciones innovadoras a la medida de su realidad.',
      chips: [
        {
          label: 'Inteligencia ambiental',
          description: 'Sensores, imágenes satelitales y modelos predictivos que convierten datos crudos en alertas tempranas y mapas de riesgo listos para decidir.',
        },
        {
          label: 'Soluciones basadas en la naturaleza',
          description: 'Restauración de manglares, humedales y otra infraestructura verde que reduce el riesgo climático mientras regenera el ecosistema.',
        },
        {
          label: 'Desarrollo local',
          description: 'Capacitación técnica y modelos de gobernanza que dejan capacidad instalada en las comunidades, no solo un reporte.',
        },
      ],
    },
    sections: {
      inputs: { eyebrow: 'Qué integra la plataforma', title: 'Cuatro tipos de datos, una sola lectura del territorio' },
      deliverables: { eyebrow: 'NATURA 2030', title: 'Productos listos para respaldar una decisión' },
      collaborators: {
        eyebrow: 'Colaboradores',
        title: 'Nuestros colaboradores y aliados, pasados y actuales',
        ctaTitle: '¿Quieres colaborar?',
      },
      about: { eyebrow: 'Quiénes somos', title: 'Impulsados por Adaptation Latin America' },
      cta: { eyebrow: 'Hablemos', title: '¿Listo para llevar datos dispersos a decisiones de adaptación?' },
    },
  },
  en: {
    hero: {
      eyebrow: 'Adaptation Latin America',
      headline: 'Transforming environmental information into {{resilient solutions}} for the region',
      lede: 'We integrate data, technology, and nature to anticipate risks, inform decisions, and respond to climate challenges.',
      contactLabel: 'Prefer to write to us directly?',
    },
    problem: {
      eyebrow: 'Understand · Act · Strengthen',
      title: 'Tools for climate adaptation',
      body: 'Every territory faces its own challenges. We deliver innovative solutions designed for specific contexts.',
      chips: [
        {
          label: 'Environmental Intelligence',
          description: 'Sensors, satellite imagery, and predictive models that turn raw data into early warnings and decision-ready risk maps.',
        },
        {
          label: 'Nature-Based Solutions',
          description: 'Restoring mangroves, wetlands, and other green infrastructure that lowers climate risk while regenerating the ecosystem.',
        },
        {
          label: 'Local Development',
          description: 'Technical training and governance models that leave lasting capacity in communities, not just a report.',
        },
      ],
    },
    sections: {
      inputs: { eyebrow: 'What the platform integrates', title: 'Four types of data, one single reading of the territory' },
      deliverables: { eyebrow: 'NATURA 2030', title: 'Products ready to back a decision' },
      collaborators: {
        eyebrow: 'Collaborators',
        title: 'Our past and current collaborators and supporters',
        ctaTitle: 'Want to collaborate?',
      },
      about: { eyebrow: 'Who we are', title: 'Driven by Adaptation Latin America' },
      cta: { eyebrow: "Let's talk", title: 'Ready to turn scattered data into adaptation decisions?' },
    },
  },
};
