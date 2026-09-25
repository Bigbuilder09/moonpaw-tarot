import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → normal static site in dist/ (deploy anywhere: Netlify, Vercel, S3…)
// `npm run build:single`  → one self-contained dist/index.html (easy to share / embed)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : []
}));
