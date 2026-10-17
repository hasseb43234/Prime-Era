// Minifies src/css and src/js into assets/css and assets/js.
// Usage: npm install && npm run build
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';

const js = readdirSync('src/js').filter(f => f.endsWith('.js')).map(f => `src/js/${f}`);
await build({ entryPoints: js, outdir: 'assets/js', minify: true, target: 'es2019', legalComments: 'none', logLevel: 'info' });
await build({ entryPoints: ['src/css/style.css'], outdir: 'assets/css', minify: true, target: 'chrome90', legalComments: 'none', logLevel: 'info' });
