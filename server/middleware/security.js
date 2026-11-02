// Security headers, rate limiting and admin auth. Hand-written so every rule is visible.
import { timingSafeEqual } from 'node:crypto';
import { settings } from '../config.js';

const IMG_HOSTS = ['https://www.kitchentechindia.com', 'https://kitchentechindia.com', 'https://grey-skunk-471358.hostingersite.com'];

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://checkout.razorpay.com https://connect.facebook.net https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${IMG_HOSTS.join(' ')} https://www.facebook.com https://www.google-analytics.com`,
  "font-src 'self'",
  "connect-src 'self' https://api.postalpincode.in https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://region1.google-analytics.com https://www.facebook.com https://connect.facebook.net",
  'frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.google.com https://maps.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

export function securityHeaders(req, res, next) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (settings.env === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/** Fixed-window limiter in memory. Good for one server; swap for Redis if you scale out. */
export function rateLimit({ windowMs = 60_000, max = 20, key = 'global' } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const k = key + ':' + (req.ip || 'x');
    const now = Date.now();
    let h = hits.get(k);
    if (!h || h.reset < now) h = { n: 0, reset: now + windowMs };
    h.n++;
    hits.set(k, h);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - h.n));
    if (h.n > max) return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    next();
  };
}

/** Bearer token from ADMIN_TOKEN. If unset, the admin API is switched off entirely. */
export function adminAuth(req, res, next) {
  const token = settings.adminToken;
  if (!token || token.length < 16) return res.status(503).json({ error: 'Admin is disabled. Set ADMIN_TOKEN (16+ characters) on the server.' });
  const given = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong admin token' });
  next();
}
