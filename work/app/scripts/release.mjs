// Builds the site and puts a fresh copy in ../../outputs (the folder that gets deployed).
//
//   npm run release                                      (preview tags use relative paths)
//   SITE_URL=https://your-domain npm run release         (recommended: full links for LINE/Facebook previews)
//   On Windows PowerShell:  $env:SITE_URL="https://your-domain"; npm run release
//
// outputs/index.html            → the fast multi-file site (loads the shop first, the rest after)
// outputs/soulmysty-pet-tarot.html → the same game as one self-contained file, for sharing offline
import { build } from 'vite';
import { cpSync, rmSync, existsSync, readdirSync, copyFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = realpathSync(resolve(app, '../../outputs'));

await build({ root: app, mode: 'production' });            // → dist-site/
await build({ root: app, mode: 'single', logLevel: 'warn' }); // → dist/index.html

// clear only what an earlier release put in outputs, then copy the new build in
const OLD = ['index.html', 'soulmysty-pet-tarot.html', 'sw.js', 'manifest.webmanifest', 'og-image.jpg', 'assets', 'icons'];
for (const f of readdirSync(out)) {
  if (OLD.includes(f) || f.endsWith('.mp3')) rmSync(join(out, f), { recursive: true, force: true });
}
cpSync(resolve(app, 'dist-site'), out, { recursive: true });
if (existsSync(resolve(app, 'dist/index.html'))) copyFileSync(resolve(app, 'dist/index.html'), join(out, 'soulmysty-pet-tarot.html'));
console.log('\n✓ outputs/ updated — deploy that folder.');
