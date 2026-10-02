import content from "./src/site.json";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/',
  plugins: [react(), {
    name: 'site-content',
    transformIndexHtml(html) {
      const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      return html.replace('%SITE_TITLE%', escape(content.metadata.title))
        .replace('%SITE_DESCRIPTION%', escape(content.metadata.description));
    },
  }],
  server: { host: '127.0.0.1' },
});
