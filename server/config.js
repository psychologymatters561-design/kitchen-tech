// Loads business facts from public/assets/data/site.json and applies env overrides.
// Secrets live ONLY in env (see .env.example). The public config never carries them.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = join(ROOT, 'public');
export const DATA_DIR = join(PUBLIC_DIR, 'assets', 'data');

const env = process.env;
const numOrNull = (v) => (v === undefined || v === '' ? null : Number.isFinite(+v) ? +v : null);

export const settings = {
  port: +(env.PORT || 3000),
  env: env.NODE_ENV || 'development',
  siteUrl: (env.SITE_URL || 'https://kitchentechindia.com').replace(/\/$/, ''),
  dbPath: env.DB_PATH || join(ROOT, 'data', 'kitchentech.db'),
  adminToken: env.ADMIN_TOKEN || '',
  razorpay: { keyId: env.RAZORPAY_KEY_ID || '', keySecret: env.RAZORPAY_KEY_SECRET || '', webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '' },
  meta: { pixelId: env.META_PIXEL_ID || '', capiToken: env.META_CAPI_TOKEN || '', testCode: env.META_TEST_EVENT_CODE || '' },
  ga4Id: env.GA4_ID || '',
  notifyWebhook: env.NOTIFY_WEBHOOK_URL || '',
  trustProxy: env.TRUST_PROXY === '1',
};

function loadJSON(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8'));
}

let site = loadJSON('site.json');
let catalogue = loadJSON('catalogue.json');

/** Hot-reload data files (admin can edit JSON and call this without a restart). */
export function reloadData() {
  site = loadJSON('site.json');
  catalogue = loadJSON('catalogue.json');
}

export function getSite() {
  const s = structuredClone(site);
  const price = numOrNull(env.AANCH_PRICE);
  const mrp = numOrNull(env.AANCH_MRP);
  if (price !== null) s.product.price = price;
  if (mrp !== null) s.product.mrp = mrp;
  if (env.AANCH_PREPAID_DISCOUNT) s.product.prepaidDiscount = Math.max(0, +env.AANCH_PREPAID_DISCOUNT || 0);
  if (settings.meta.pixelId) s.tracking.metaPixelId = settings.meta.pixelId;
  if (settings.ga4Id) s.tracking.ga4Id = settings.ga4Id;
  s.payments.razorpayKeyId = settings.razorpay.keyId || null; // key id is public by design; the secret never leaves the server
  s.payments.online = Boolean(settings.razorpay.keyId && settings.razorpay.keySecret);
  s.product.orderable = Number.isFinite(s.product.price) && s.product.price > 0;
  delete s._readme;
  return s;
}

export function getCatalogue() {
  return catalogue;
}
