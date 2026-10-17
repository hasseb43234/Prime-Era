// Minifies src/css and src/js into assets/css and assets/js.
// Usage (from this folder): npm install && npm run build
// Lives in tools/ so the site root stays a plain static site for hosting (e.g. Vercel).
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const js = readdirSync(resolve(root, 'src/js')).filter(f => f.endsWith('.js')).map(f => resolve(root, 'src/js', f));
await build({ entryPoints: js, outdir: resolve(root, 'assets/js'), minify: true, target: 'es2019', legalComments: 'none', logLevel: 'info' });
await build({ entryPoints: [resolve(root, 'src/css/style.css')], outdir: resolve(root, 'assets/css'), minify: true, target: 'chrome90', legalComments: 'none', logLevel: 'info' });
