// Kitchen Tech India web server: static frontend + JSON API + SQLite.
import express from 'express';
import compression from 'compression';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { settings, PUBLIC_DIR } from './config.js';
import { openDb } from './db/index.js';
import { apiRouter } from './routes/api.js';
import { securityHeaders } from './middleware/security.js';

const PAGES = ['', 'aanch', 'catalogue', 'business', 'about', 'contact', 'checkout', 'policies'];

export function createApp({ dbPath = settings.dbPath } = {}) {
  const db = openDb(dbPath);
  const app = express();
  app.disable('x-powered-by');
  if (settings.trustProxy) app.set('trust proxy', 1);
  app.use(compression());
  app.use(securityHeaders);

  app.use('/api', apiRouter(db));

  // Friendly URLs for ads and SEO.
  const alias = { '/infrared-cooktop': '/aanch', '/infrared': '/aanch', '/buy': '/checkout', '/gas-stoves': '/catalogue', '/dealers': '/business', '/oem': '/business#oem', '/privacy': '/policies#privacy', '/terms': '/policies#terms', '/refunds': '/policies#returns', '/shipping': '/policies#shipping', '/warranty': '/policies#warranty' };
  for (const [from, to] of Object.entries(alias)) app.get(from, (req, res) => res.redirect(301, to));

  app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nSitemap: ${settings.siteUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', (req, res) => {
    const urls = PAGES.filter((p) => p !== 'checkout').map((p) => `<url><loc>${settings.siteUrl}/${p}</loc><changefreq>weekly</changefreq><priority>${p === 'aanch' ? '1.0' : p === '' ? '0.9' : '0.6'}</priority></url>`);
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
  });
  app.get('/admin', (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.sendFile(join(PUBLIC_DIR, 'admin.html'));
  });

  app.use(
    express.static(PUBLIC_DIR, {
      extensions: ['html'],
      setHeaders(res, path) {
        if (/\.(woff2|js|css|svg|webp|png|jpg)$/.test(path) && /\/assets\/(fonts|vendor)\//.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (/\/assets\//.test(path)) res.setHeader('Cache-Control', 'public, max-age=3600');
        else res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  app.use((req, res) => res.status(404).sendFile(join(PUBLIC_DIR, '404.html')));
  return { app, db };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { app } = createApp();
  app.listen(settings.port, () => {
    console.log(`Kitchen Tech India running on http://localhost:${settings.port}`);
    if (!settings.adminToken) console.log('  Admin disabled: set ADMIN_TOKEN to enable /admin');
    if (!process.env.AANCH_PRICE) console.log('  AANCH_PRICE not set: the buy flow shows "price coming" and routes buyers to WhatsApp');
  });
}
