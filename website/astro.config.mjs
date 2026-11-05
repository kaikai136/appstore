import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://example.com',
  base: process.env.SITE_BASE || '/',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto' }
});
