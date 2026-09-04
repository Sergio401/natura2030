// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://natura2030.adaptationla.org',
  output: 'server',
  adapter: vercel(),
  trailingSlash: 'always',
  integrations: [sitemap(), react()],
});
