// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

// SELF_HOSTED=true switches the build to the standalone Node adapter used on
// the VPS deploy (see deploy/); Vercel builds/dev are unaffected.
const selfHosted = process.env.SELF_HOSTED === 'true';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://natura2030.adaptationla.org',
  output: 'server',
  adapter: selfHosted ? node({ mode: 'standalone' }) : vercel(),
  trailingSlash: 'always',
  integrations: [sitemap(), react()],
});
