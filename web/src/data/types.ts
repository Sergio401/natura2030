export type Locale = 'es' | 'en';

export interface LinkItem {
  href: string;
  label: string;
}

export interface ProcessStep {
  n: string;
  title: string;
  body: string;
}

export interface InputItem {
  title: string;
  body: string;
}

export interface DeliverableItem {
  tag: string;
  title: string;
  body: string;
}

export interface OrgFact {
  label: string;
  value: string;
}

/**
 * Facts used by the NATURA 2030 site — the source of truth for its content.
 */
export interface SiteContent {
  meta: {
    siteName: string;
    orgName: string;
    description: string;
  };
  process: {
    steps: ProcessStep[];
  };
  inputs: {
    items: InputItem[];
    sources: string[];
  };
  deliverables: {
    items: DeliverableItem[];
  };
  applications: {
    items: string[];
  };
  about: {
    body: string;
    pillars: string[];
    org: OrgFact[];
  };
  cta: {
    initiatives: string;
    models: string;
  };
  footer: {
    email: string;
    copyright: string;
    note: string;
  };
  ui: {
    skipToContent: string;
    themeToggleToLight: string;
    themeToggleToDark: string;
    languageLabel: string;
    copyEmail: string;
    emailCopied: string;
  };
}
