// Re-copies third-party browser files from node_modules into public/assets.
// Run after `npm install` when bumping GSAP, Lenis or the fonts: `npm run vendor`.
import { cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = (p) => join(root, 'node_modules', p);
const out = (p) => join(root, 'public/assets', p);

mkdirSync(out('vendor'), { recursive: true });
mkdirSync(out('fonts'), { recursive: true });

const vendor = ['gsap/dist/gsap.min.js', 'gsap/dist/ScrollTrigger.min.js', 'gsap/dist/SplitText.min.js', 'gsap/dist/DrawSVGPlugin.min.js', 'lenis/dist/lenis.min.js'];
for (const f of vendor) cpSync(nm(f), out('vendor/' + f.split('/').pop()));

const fonts = [
  '@fontsource/rozha-one/files/rozha-one-latin-400-normal.woff2',
  '@fontsource/rozha-one/files/rozha-one-devanagari-400-normal.woff2',
  ...[400, 500, 700, 800].map((w) => `@fontsource/mukta/files/mukta-latin-${w}-normal.woff2`),
  ...[400, 700].map((w) => `@fontsource/mukta/files/mukta-devanagari-${w}-normal.woff2`),
  ...[400, 500].map((w) => `@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`),
];
for (const f of fonts) cpSync(nm(f), out('fonts/' + f.split('/').pop()));

console.log(`Vendored ${vendor.length} scripts and ${fonts.length} fonts.`);
