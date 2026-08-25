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
 * Facts shared verbatim across v1/v2/v3 — the source of truth for what
 * NATURA 2030 is, independent of how each visual theme frames it.
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
    primary: string;
    secondary: string;
  };
  footer: {
    tagline: string;
    email: string;
    copyright: string;
    note: string;
  };
  ui: {
    skipToContent: string;
    themeToggleToLight: string;
    themeToggleToDark: string;
    languageLabel: string;
    versionLabel: string;
    versionNames: Record<'v1' | 'v2' | 'v3', string>;
  };
}
