import type { SiteContent } from './types';

export const en: SiteContent = {
  meta: {
    siteName: 'NATURA 2030',
    orgName: 'Adaptation Latin America',
    description:
      'NATURA 2030 brings together climate and ocean data from multiple sources into inputs local teams can use for coastal adaptation decisions across Latin America',
  },
  inputs: {
    items: [
      {
        title: 'Climate and ocean models',
        body: 'Historical and projected sea level, tides, waves, storm surge, wind, precipitation, temperature and climate scenarios',
      },
      {
        title: 'Historical observations',
        body: 'Tide gauges, buoys, weather stations, satellite data and instrumental records along the coast',
      },
      {
        title: 'Local project data',
        body: 'Field campaigns, topography and bathymetry, sensors, cameras or drones, and ecological variables',
      },
      {
        title: 'Project information',
        body: 'Location, objective, time horizon, analysis scenario, ecosystem or infrastructure type and risk level',
      },
    ],
    sources: ['GTSM', 'CMIP6', 'UHSLC', 'WAVERYS', 'In-situ data'],
  },
  deliverables: {
    items: [
      {
        tag: 'A',
        title: 'Processed data',
        body: 'Time series, maps, summary statistics and files ready for further analysis',
      },
      {
        tag: 'B',
        title: 'Climate diagnosis',
        body: 'Trends, variability, extremes, future scenarios and uncertainty indicators',
      },
      {
        tag: 'C',
        title: 'Decision support',
        body: 'Technical reports, infographics, adaptation indicators and recommendations',
      },
    ],
    monitoring: {
      label: 'Environmental monitoring',
      title: 'Field measurements behind every result',
      body: 'We complement models with data collected on site: cameras and sensors installed in mangroves and water bodies record currents, water levels and ecosystem change to calibrate and validate what we deliver.',
      imageAlt: 'GoPro camera mounted in a mangrove recording current velocity along a channel',
    },
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
    body: 'ALA is a non-profit organization working toward a more sustainable relationship with water and nature in Latin America, promoting efficient collaboration between governments, the private sector, NGOs and local communities',
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
    initiatives: 'Explore initiatives',
    models: 'Explore models',
  },
  footer: {
    email: 'info@adaptationla.org',
    copyright: '© 2026 Adaptation Latin America. All rights reserved',
    note: 'NATURA 2030 is an initiative of ALA',
  },
  ui: {
    skipToContent: 'Skip to content',
    themeToggleToLight: 'Switch to light mode',
    themeToggleToDark: 'Switch to dark mode',
    languageLabel: 'Language',
    copyEmail: 'Copy email',
    emailCopied: 'Copied!',
  },
};
