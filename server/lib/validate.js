// Tiny schema validator. Each rule returns [value, error]. No dependency, easy to read.
import { createHash, randomBytes } from 'node:crypto';

export class ValidationError extends Error {
  constructor(fields) {
    super('Please check the highlighted fields.');
    this.status = 422;
    this.fields = fields;
  }
}

const trim = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v);

export const rules = {
  text: (min, max) => (v) => {
    v = trim(v ?? '');
    if (typeof v !== 'string') return [null, 'Must be text'];
    if (v.length < min) return [null, min <= 1 ? 'Required' : `At least ${min} characters`];
    if (v.length > max) return [null, `At most ${max} characters`];
    return [v, null];
  },
  optionalText: (max) => (v) => {
    v = trim(v ?? '');
    if (v === '') return [null, null];
    if (typeof v !== 'string' || v.length > max) return [null, `At most ${max} characters`];
    return [v, null];
  },
  // Indian mobile: strips +91, 0, spaces, dashes. Must start 6-9 and be 10 digits.
  phoneIN: () => (v) => {
    const d = String(v ?? '').replace(/[^\d]/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
    return /^[6-9]\d{9}$/.test(d) ? [d, null] : [null, 'Enter a 10-digit Indian mobile number'];
  },
  email: (optional = true) => (v) => {
    v = trim(v ?? '');
    if (!v && optional) return [null, null];
    return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(v) ? [v.toLowerCase(), null] : [null, 'Enter a valid email'];
  },
  pincode: () => (v) => {
    const d = String(v ?? '').replace(/\s/g, '');
    return /^[1-9]\d{5}$/.test(d) ? [d, null] : [null, 'Enter a 6-digit PIN code'];
  },
  gstin: () => (v) => {
    v = trim(v ?? '').toUpperCase();
    if (!v) return [null, null];
    return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v) ? [v, null] : [null, 'GSTIN looks wrong (15 characters)'];
  },
  int: (min, max) => (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? [n, null] : [null, `Choose ${min} to ${max}`];
  },
  oneOf: (list) => (v) => (list.includes(v) ? [v, null] : [null, 'Choose an option']),
};

/** Validate `body` against `schema` ({field: rule}). Throws ValidationError with per-field messages. */
export function validate(body, schema) {
  const out = {};
  const errors = {};
  for (const [k, rule] of Object.entries(schema)) {
    const [v, err] = rule(body?.[k]);
    if (err) errors[k] = err;
    else if (v !== null && v !== undefined) out[k] = v;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

/** Bots fill hidden fields. Humans never see the `website` field. */
export const isBot = (body) => typeof body?.website === 'string' && body.website.trim() !== '';

/** Order id like KT-2611-7XQ4M (date + 5 unambiguous chars). */
export function orderId(now = new Date()) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = randomBytes(5);
  const tail = Array.from(r, (b) => A[b % A.length]).join('');
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `KT-${yy}${mm}-${tail}`;
}

export const hashIp = (ip) => (ip ? createHash('sha256').update('kt:' + ip).digest('hex').slice(0, 16) : null);
export const sha256 = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex');

/** Keep only short utm_* keys from the landing URL (for Meta ad attribution). */
export function cleanUtm(utm) {
  if (!utm || typeof utm !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(utm)) {
    if (/^(utm_[a-z]+|fbclid|gclid)$/.test(k) && typeof v === 'string') out[k] = v.slice(0, 200);
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}
