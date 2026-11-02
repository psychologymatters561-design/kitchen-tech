// Builds dist/: the static website for GitHub Pages (or any static host).
// 1. Copies public/ (minus the admin page, which needs the Node server).
// 2. Downloads every product photo the pages link from the old site, converts it to WebP,
//    and points the pages at the local copy. A photo that fails to download keeps its old link
//    (and the page's drawn illustration still covers it), so the build never breaks on images.
// 3. Fixes absolute paths for a sub-folder host (BASE_PATH, e.g. /kitchen-tech).
// 4. STAGING=1 adds noindex so the preview address is not indexed by Google.
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const STAGING = process.env.STAGING === '1';

rmSync(dist, { recursive: true, force: true });
cpSync(join(root, 'public'), dist, { recursive: true });
rmSync(join(dist, 'admin.html'), { force: true });
writeFileSync(join(dist, '.nojekyll'), '');

const files = [
  ...readdirSync(dist).filter((f) => f.endsWith('.html')).map((f) => join(dist, f)),
  join(dist, 'assets/data/site.json'),
  join(dist, 'assets/data/catalogue.json'),
];
const IMG = /https:\/\/(?:www\.)?(?:kitchentechindia\.com|grey-skunk-471358\.hostingersite\.com)\/wp-content\/uploads\/[^"'\s)]+?\.(?:png|jpe?g|webp)/gi;
const urls = new Set();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(IMG)) urls.add(m[0]);

const outDir = join(dist, 'assets/img/site');
mkdirSync(outDir, { recursive: true });
const local = new Map();
let ok = 0;
await Promise.all(
  [...urls].map(async (url) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (KitchenTech site build)' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const name = url.split('/').pop().replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '-' + createHash('sha1').update(url).digest('hex').slice(0, 6) + '.webp';
      await sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 5 }).toFile(join(outDir, name));
      local.set(url, 'assets/img/site/' + name);
      ok++;
    } catch (e) {
      console.warn(`  kept remote link (${e.message}): ${url}`);
    }
  })
);
console.log(`Photos: ${ok} of ${urls.size} downloaded and converted to WebP.`);

for (const f of files) {
  let s = readFileSync(f, 'utf8');
  // swap image sources; og:image and structured data need absolute URLs, so they keep the original
  s = s.replace(IMG, (u, offset, whole) => {
    const before = whole.slice(Math.max(0, offset - 40), offset);
    if (/og:image|"image"\s*:\s*\[?\s*"?$/.test(before)) return u;
    return local.get(u) || u;
  });
  if (f.endsWith('.html')) {
    if (STAGING) s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">');
    if (f.endsWith('404.html') && BASE) s = s.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);
  }
  writeFileSync(f, s);
}
console.log(`Built dist/ (${BASE || '/'}${STAGING ? ', staging: noindex' : ''})`);
