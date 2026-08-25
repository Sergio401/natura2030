import type { SiteContent } from './types';

export const en: SiteContent = {
  meta: {
    siteName: 'NATURA 2030',
    orgName: 'Adaptation Latin America',
    description:
      'NATURA 2030 brings together climate and ocean data from multiple sources into inputs local teams can use for coastal adaptation decisions across Latin America.',
  },
  process: {
    steps: [
      {
        n: '1',
        title: 'Site and objective definition',
        body: 'Identifying the problem, location, time horizon and needs of the project.',
      },
      {
        n: '2',
        title: 'Selection, download and ingestion',
        body: 'Gathering relevant data from models, observations and local sources.',
      },
      {
        n: '3',
        title: 'Harmonization and quality control',
        body: 'Checking coverage, consistency, units, coordinates and datums.',
      },
      {
        n: '4',
        title: 'Integration and analysis',
        body: 'Physical-statistical combination of sources, trends, climatologies and scenarios.',
      },
      {
        n: '5',
        title: 'Interpretation for adaptation',
        body: 'Translating the results into information useful for planning and decision-making.',
      },
    ],
  },
  inputs: {
    items: [
      {
        title: 'Climate and ocean models',
        body: 'Historical and projected sea level, tides, waves, storm surge, wind, precipitation, temperature and climate scenarios.',
      },
      {
        title: 'Historical observations',
        body: 'Tide gauges, buoys, weather stations, satellite data and instrumental records along the coast.',
      },
      {
        title: 'Local project data',
        body: 'Field campaigns, topography and bathymetry, sensors, cameras or drones, and ecological variables.',
      },
      {
        title: 'Project information',
        body: 'Location, objective, time horizon, analysis scenario, ecosystem or infrastructure type and risk level.',
      },
    ],
    sources: ['GTSM', 'CMIP6', 'UHSLC', 'WAVERYS', 'In-situ data'],
  },
  deliverables: {
    items: [
      {
        tag: 'A',
        title: 'Processed data',
        body: 'Time series, maps, summary statistics and files ready for further analysis.',
      },
      {
        tag: 'B',
        title: 'Climate diagnosis',
        body: 'Trends, variability, extremes, future scenarios and uncertainty indicators.',
      },
      {
        tag: 'C',
        title: 'Decision support',
        body: 'Technical reports, infographics, adaptation indicators and recommendations.',
      },
    ],
  },
  applications: {
    items: [
      'Coastal adaptation',
      'Ecosystem restoration',
      'Territorial planning',
      'Infrastructure',
      'Risk management',
      'Investment and insurance',
    ],
  },
  about: {
    body: 'ALA is a non-profit organization working toward a more sustainable relationship with water and nature in Latin America, promoting efficient collaboration between governments, the private sector, NGOs and local communities.',
    pillars: ['Water', 'Climate', 'Nature'],
    org: [
      { label: 'Organization', value: 'Adaptation Latin America' },
      { label: 'Platform', value: 'NATURA 2030' },
      { label: 'Coverage', value: 'Latin America' },
      { label: 'Strategic lines', value: '3' },
      { label: 'Status', value: 'Active' },
    ],
  },
  cta: {
    initiatives: 'View initiatives',
    models: 'View models',
  },
  footer: {
    email: 'algo@natura2030.com',
    copyright: '© 2026 Adaptation Latin America. All rights reserved.',
    note: 'NATURA 2030 is an initiative of ALA.',
  },
  ui: {
    skipToContent: 'Skip to content',
    themeToggleToLight: 'Switch to light mode',
    themeToggleToDark: 'Switch to dark mode',
    languageLabel: 'Language',
    versionLabel: 'Style',
    versionNames: {
      v1: 'Nature Distilled',
      v2: 'Data Engine',
      v3: 'The Coastline',
    },
    copyEmail: 'Copy email',
    emailCopied: 'Copied!',
  },
};
