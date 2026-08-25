// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://natura2030.adaptationla.org',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
