import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// `npm run build`         → normal static site in dist-site/ (deploy this one: Cloudflare Pages, Netlify, Vercel…)
// `npm run build:single`  → one self-contained dist/index.html (easy to share / embed)
//
// SITE_URL (optional): the public address, e.g. SITE_URL=https://soulmysty.pages.dev npm run build
// Link previews in LINE / Facebook need a full address for the picture.
const SITE_URL = (process.env.SITE_URL || 'https://moonpaw-tarot.pages.dev').replace(/\/+$/, '');

/** Fills %SITE_URL% in index.html and gives the service worker a new cache name each build. */
function siteMeta() {
  let outDir = 'dist-site';
  return {
    name: 'soulmysty-site-meta',
    configResolved(c) { outDir = c.build.outDir; },
    transformIndexHtml(html) {
      // without SITE_URL the preview tags use relative paths (fine for testing, weaker for LINE/Facebook)
      return html.replaceAll('%SITE_URL%/', SITE_URL ? SITE_URL + '/' : './');
    },
    closeBundle() {
      const sw = resolve(outDir, 'sw.js');
      if (!existsSync(sw)) return;
      const id = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      writeFileSync(sw, readFileSync(sw, 'utf8').replace('__BUILD_ID__', id));
    }
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [siteMeta(), viteSingleFile()] : [siteMeta()],
  build: {
    outDir: mode === 'single' ? 'dist' : 'dist-site',
    emptyOutDir: true
  }
}));
