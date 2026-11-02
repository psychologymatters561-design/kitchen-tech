// Mid-end: B2B and contact leads (dealers, OEM, bulk gifting, PNG, demo requests).
import { getSite } from '../config.js';
import { validate, rules, hashIp, cleanUtm, ValidationError } from '../lib/validate.js';
import { logEvent } from '../db/index.js';
import { notify, waLink } from './notify.js';
import { sendMetaEvent } from './meta.js';

export const LEAD_TYPES = ['dealer', 'oem', 'bulk', 'png', 'contact', 'demo'];
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

const base = {
  type: rules.oneOf(LEAD_TYPES),
  name: rules.text(2, 80),
  phone: rules.phoneIN(),
  email: rules.email(true),
  city: rules.optionalText(60),
  message: rules.optionalText(1000),
  product: rules.optionalText(120),
};
const b2b = { ...base, firm: rules.optionalText(120), gstin: rules.gstin(), volume: rules.optionalText(60) };

export async function createLead(db, body, ctx = {}) {
  const type = LEAD_TYPES.includes(body?.type) ? body.type : 'contact';
  const data = validate({ ...body, type }, ['dealer', 'oem', 'bulk', 'png'].includes(type) ? b2b : base);
  if (type === 'dealer' && !data.city) throw new ValidationError({ city: 'Which city do you sell in?' });

  const r = db
    .prepare(`INSERT INTO leads (type, name, phone, email, firm, city, gstin, volume, product, message, utm, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(type, data.name, data.phone, data.email ?? null, data.firm ?? null, data.city ?? null, data.gstin ?? null, data.volume ?? null, data.product ?? null, data.message ?? null, cleanUtm(body.utm), hashIp(ctx.ip));
  const id = Number(r.lastInsertRowid);
  logEvent(db, 'lead.created', String(id), { type });
  await notify('lead.' + type, { id, ...data });
  sendMetaEvent({ eventName: 'Lead', eventId: 'lead-' + id, user: data, sourceUrl: ctx.url, ip: ctx.ip, ua: ctx.ua });

  const site = getSite();
  const intro = {
    dealer: `Hi, I'm ${data.name}${data.firm ? ' from ' + data.firm : ''}, ${data.city}. I want dealer pricing.`,
    oem: `Hi, I'm ${data.name}${data.firm ? ' from ' + data.firm : ''}. I want to discuss OEM / private label.`,
    bulk: `Hi, I'm ${data.name}. I want a bulk / corporate quote${data.volume ? ' for ' + data.volume : ''}.`,
    png: `Hi, I'm ${data.name}. I want PNG stove pricing.`,
    demo: `Hi, I'm ${data.name}. Please send me a cooking demo video of Aanch.`,
    contact: `Hi, I'm ${data.name}. I just sent a message on your website.`,
  }[type];
  return { id, type, whatsapp: waLink(site.brand.whatsapp, `${intro} (Ref #${id})`) };
}

export function listLeads(db, { limit = 200, type } = {}) {
  const lim = Math.min(1000, Math.max(1, +limit || 200));
  return type
    ? db.prepare('SELECT * FROM leads WHERE type = ? ORDER BY created_at DESC LIMIT ?').all(type, lim)
    : db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT ?').all(lim);
}

export function updateLeadStatus(db, id, status) {
  if (!LEAD_STATUSES.includes(status)) throw new ValidationError({ status: 'Unknown status' });
  const r = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, +id);
  if (!r.changes) {
    const e = new Error('Lead not found');
    e.status = 404;
    throw e;
  }
  return { id: +id, status };
}
