import { build, createServer } from './app/node_modules/vite/dist/node/index.js';
import { viteSingleFile } from './app/node_modules/vite-plugin-singlefile/dist/esm/index.js';
const root = new URL('./app/', import.meta.url).pathname.replace(/^\/(\w:)/,'$1');
await build({root,configFile:false,base:'./',build:{outDir:'dist-site'}});
await build({root,configFile:false,base:'./',plugins:[viteSingleFile()],build:{outDir:'dist'}});
