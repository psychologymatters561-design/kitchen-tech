// Thin HTTP layer. Validation and business rules live in services/ (the mid-end).
import express from 'express';
import { getSite, getCatalogue, reloadData } from '../config.js';
import { monthlyCost, nationalImpact, utensilCheck } from '../../public/assets/js/lib/cost-engine.js';
import { createOrder, confirmOnlinePayment, handleRazorpayEvent, trackOrder, listOrders, updateOrderStatus, orderStats } from '../services/orders.js';
import { createLead, listLeads, updateLeadStatus } from '../services/leads.js';
import { verifyWebhookSignature } from '../services/payments.js';
import { isBot } from '../lib/validate.js';
import { rateLimit, adminAuth } from '../middleware/security.js';

const ctxOf = (req) => ({ ip: req.ip, ua: req.get('user-agent'), url: req.get('referer') });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function apiRouter(db) {
  const r = express.Router();

  // Webhook needs the raw body for the signature, so it is mounted BEFORE express.json().
  r.post('/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '200kb' }), (req, res) => {
    const raw = req.body instanceof Buffer ? req.body : Buffer.from('');
    if (!verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) return res.status(400).json({ error: 'bad signature' });
    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'bad json' });
    }
    res.json({ ok: true, ...handleRazorpayEvent(db, event) });
  });

  r.use(express.json({ limit: '20kb' }));

  r.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  r.get('/config', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.json(getSite());
  });

  r.get('/catalogue', (req, res) => {
    const { cat, burners, top, q } = req.query;
    let items = getCatalogue().items;
    if (cat) items = items.filter((i) => i.cat === cat);
    if (burners) items = items.filter((i) => String(i.burners) === String(burners));
    if (top) items = items.filter((i) => i.top === top);
    if (q) {
      const s = String(q).toLowerCase().slice(0, 60);
      items = items.filter((i) => (i.name + ' ' + (i.code || '') + ' ' + i.specs.join(' ')).toLowerCase().includes(s));
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ count: items.length, items });
  });

  // The same cost engine the browser uses, for other clients (WhatsApp bot, sales team, partners).
  r.post('/calc/cost', (req, res) => res.json(monthlyCost(req.body || {})));
  r.post('/calc/national', (req, res) => res.json(nationalImpact(req.body || {})));
  r.post('/calc/utensils', (req, res) => res.json(utensilCheck(Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 20) : [])));

  r.post(
    '/orders',
    rateLimit({ key: 'orders', max: 8 }),
    wrap(async (req, res) => {
      if (isBot(req.body)) return res.status(201).json({ id: 'KT-0000-OK', status: 'new' });
      res.status(201).json(await createOrder(db, req.body, ctxOf(req)));
    })
  );

  r.post(
    '/orders/confirm',
    rateLimit({ key: 'confirm', max: 20 }),
    wrap(async (req, res) => res.json(await confirmOnlinePayment(db, req.body || {}, ctxOf(req))))
  );

  r.get('/orders/track', rateLimit({ key: 'track', max: 20 }), (req, res) => {
    const o = trackOrder(db, req.query.id, req.query.phone);
    if (!o) return res.status(404).json({ error: 'No order matches that ID and phone number.' });
    res.json(o);
  });

  r.post(
    '/leads',
    rateLimit({ key: 'leads', max: 8 }),
    wrap(async (req, res) => {
      if (isBot(req.body)) return res.status(201).json({ id: 0 });
      res.status(201).json(await createLead(db, req.body, ctxOf(req)));
    })
  );

  // ---- Admin (Bearer ADMIN_TOKEN) ----
  const a = express.Router();
  a.use(rateLimit({ key: 'admin', max: 120 }), adminAuth);
  a.get('/stats', (req, res) => res.json({ orders: orderStats(db), leads: db.prepare('SELECT type, COUNT(*) AS n FROM leads GROUP BY type').all() }));
  a.get('/orders', (req, res) => res.json(listOrders(db, req.query)));
  a.patch('/orders/:id', (req, res) => res.json(updateOrderStatus(db, req.params.id, req.body?.status)));
  a.get('/leads', (req, res) => res.json(listLeads(db, req.query)));
  a.patch('/leads/:id', (req, res) => res.json(updateLeadStatus(db, req.params.id, req.body?.status)));
  a.post('/reload', (req, res) => {
    reloadData();
    res.json({ ok: true });
  });
  r.use('/admin', a);

  r.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // Errors: validation -> 422 with fields; known -> its status; unknown -> 500 without leaking internals.
  // eslint-disable-next-line no-unused-vars
  r.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('[api]', err);
    res.status(status).json({ error: status >= 500 && !err.code ? 'Something went wrong on our side. Please WhatsApp us.' : err.message, code: err.code, fields: err.fields });
  });
  return r;
}
