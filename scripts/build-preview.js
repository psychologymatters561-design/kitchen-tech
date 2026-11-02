// Builds preview/<page>.html: every page as ONE self-contained file (CSS, fonts, GSAP, data, code inside).
// Open any of them with a double-click, on a laptop or phone, with no server.
// Run: npm run preview
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => join(root, 'public', p);
const out = join(root, 'preview');
const PAGES = ['index', 'aanch', 'catalogue', 'business', 'about', 'contact', 'checkout', 'policies'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const b64 = (file) => readFileSync(file).toString('base64');
const inlineCss = (href) => {
  const file = pub(href);
  let css = readFileSync(file, 'utf8');
  // fonts -> data URIs so the file needs nothing else
  css = css.replace(/url\(\.\.\/fonts\/([^)]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${b64(pub('assets/fonts/' + f))})`);
  return `<style>\n${css}\n</style>`;
};
const data = {
  site: JSON.parse(readFileSync(pub('assets/data/site.json'), 'utf8')),
  catalogue: JSON.parse(readFileSync(pub('assets/data/catalogue.json'), 'utf8')),
};
const dataTag = `<script>window.__KT_DATA__=${JSON.stringify(data).replace(/</g, '\\u003c')};</script>`;
const favicon = `data:image/svg+xml;base64,${b64(pub('assets/img/favicon.svg'))}`;

for (const page of PAGES) {
  let html = readFileSync(pub(page + '.html'), 'utf8');
  html = html.replace(/<link rel="preload"[^>]*>\n?/g, '');
  html = html.replace(/<link rel="icon" href="[^"]+"[^>]*>/, `<link rel="icon" href="${favicon}">`);
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => inlineCss(href));
  html = html.replace(/<script src="(assets\/vendor\/[^"]+)" defer><\/script>/g, (_, src) => `<script>${readFileSync(pub(src), 'utf8')}</script>`);

  const m = html.match(/<script type="module" src="(assets\/js\/[^"]+)"><\/script>/);
  if (m) {
    const res = await build({ entryPoints: [pub(m[1])], bundle: true, format: 'esm', target: 'es2022', minify: true, write: false, legalComments: 'none' });
    const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
    html = html.replace(m[0], () => `${dataTag}\n<script type="module">${js}</script>`);
  }
  writeFileSync(join(out, page + '.html'), html);
  console.log(`preview/${page}.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
}
