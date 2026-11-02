// Mid-end: order business rules. Routes stay thin; every rule about money lives here.
import { getSite } from '../config.js';
import { validate, rules, orderId, hashIp, cleanUtm, ValidationError } from '../lib/validate.js';
import { logEvent } from '../db/index.js';
import { razorpayEnabled, createRazorpayOrder, verifyPaymentSignature } from './payments.js';
import { notify, waLink } from './notify.js';
import { sendMetaEvent } from './meta.js';

export const ORDER_STATUSES = ['new', 'awaiting_payment', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const orderSchema = (maxQty) => ({
  qty: rules.int(1, maxQty),
  paymentMethod: rules.oneOf(['cod', 'online']),
  name: rules.text(2, 80),
  phone: rules.phoneIN(),
  email: rules.email(true),
  address: rules.text(8, 300),
  city: rules.text(2, 60),
  state: rules.optionalText(60),
  pincode: rules.pincode(),
  notes: rules.optionalText(300),
});

/** Price is ALWAYS computed here from server config. The browser's numbers are ignored. */
export function quote(site, qty, paymentMethod) {
  const p = site.product;
  if (!p.orderable) {
    const e = new Error('Online ordering opens as soon as the launch price is set. WhatsApp us to book yours today.');
    e.status = 503;
    e.code = 'PRICE_NOT_SET';
    throw e;
  }
  const subtotal = p.price * qty;
  const discount = paymentMethod === 'online' ? Math.round((p.prepaidDiscount || 0) * qty) : 0;
  return { unitPrice: p.price, subtotal, discount, total: Math.max(0, subtotal - discount) };
}

export async function createOrder(db, body, ctx = {}) {
  const site = getSite();
  const data = validate(body, orderSchema(site.product.maxQtyPerOrder || 9));
  if (data.paymentMethod === 'cod' && !site.product.cod) throw new ValidationError({ paymentMethod: 'Cash on delivery is not available right now' });
  if (data.paymentMethod === 'online' && !razorpayEnabled()) throw new ValidationError({ paymentMethod: 'Online payment is being set up. Choose cash on delivery for now.' });

  const q = quote(site, data.qty, data.paymentMethod);
  const id = orderId();
  const status = data.paymentMethod === 'online' ? 'awaiting_payment' : 'new';

  db.prepare(
    `INSERT INTO orders (id, status, payment_method, product, qty, unit_price, discount, total, name, phone, email, address, city, state, pincode, notes, utm, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, status, data.paymentMethod, site.product.slug, data.qty, q.unitPrice, q.discount, q.total, data.name, data.phone, data.email ?? null, data.address, data.city, data.state ?? null, data.pincode, data.notes ?? null, cleanUtm(body.utm), hashIp(ctx.ip));
  logEvent(db, 'order.created', id, { total: q.total, method: data.paymentMethod });

  const result = {
    id,
    status,
    total: q.total,
    discount: q.discount,
    qty: data.qty,
    paymentMethod: data.paymentMethod,
    whatsapp: waLink(site.brand.whatsapp, `Hi, I placed order ${id} for ${data.qty} x ${site.product.fullName}. Please confirm.`),
  };

  if (data.paymentMethod === 'online') {
    const rp = await createRazorpayOrder({ receipt: id, amountINR: q.total, notes: { order_id: id, product: site.product.slug } });
    db.prepare('UPDATE orders SET razorpay_order_id = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?').run(rp.id, id);
    result.razorpay = {
      key: site.payments.razorpayKeyId,
      order_id: rp.id,
      amount: rp.amount,
      currency: 'INR',
      name: site.brand.name,
      description: `${data.qty} x ${site.product.fullName}`,
      prefill: { name: data.name, contact: '+91' + data.phone, email: data.email || undefined },
      notes: { order_id: id },
      theme: { color: '#E8461F' },
    };
  } else {
    await notify('order.cod', { id, total: q.total, qty: data.qty, name: data.name, phone: data.phone, city: data.city, pincode: data.pincode });
    sendMetaEvent({ eventName: 'Purchase', eventId: id, value: q.total, user: { ...data, fbp: body.fbp, fbc: body.fbc }, sourceUrl: ctx.url, ip: ctx.ip, ua: ctx.ua });
  }
  return result;
}

/** Browser returns from Razorpay checkout with a signed payload. Verify, then mark paid. */
export async function confirmOnlinePayment(db, body, ctx = {}) {
  if (!verifyPaymentSignature(body)) {
    const e = new Error('Payment could not be verified. If money left your account, WhatsApp us your order ID.');
    e.status = 400;
    throw e;
  }
  const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(body.razorpay_order_id);
  if (!order) {
    const e = new Error('Order not found');
    e.status = 404;
    throw e;
  }
  markPaid(db, order, body.razorpay_payment_id);
  sendMetaEvent({ eventName: 'Purchase', eventId: order.id, value: order.total, user: { phone: order.phone, email: order.email, city: order.city, pincode: order.pincode }, sourceUrl: ctx.url, ip: ctx.ip, ua: ctx.ua });
  return { id: order.id, status: 'paid', total: order.total };
}

export function markPaid(db, order, paymentId) {
  if (order.payment_status === 'paid') return false; // idempotent: webhook and browser may both arrive
  db.prepare(
    `UPDATE orders SET payment_status = 'paid', status = 'paid', razorpay_payment_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).run(paymentId, order.id);
  logEvent(db, 'order.paid', order.id, { paymentId });
  notify('order.paid', { id: order.id, total: order.total, qty: order.qty, name: order.name, phone: order.phone, city: order.city });
  return true;
}

/** Razorpay webhook (payment.captured / order.paid). Signature checked by the route. */
export function handleRazorpayEvent(db, event) {
  const pay = event?.payload?.payment?.entity;
  const rpOrderId = pay?.order_id || event?.payload?.order?.entity?.id;
  if (!rpOrderId) return { ignored: true };
  const order = db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').get(rpOrderId);
  if (!order) return { ignored: true };
  if (event.event === 'payment.captured' || event.event === 'order.paid') return { updated: markPaid(db, order, pay?.id || null) };
  if (event.event === 'payment.failed') {
    db.prepare(`UPDATE orders SET payment_status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND payment_status != 'paid'`).run(order.id);
    logEvent(db, 'order.payment_failed', order.id, { reason: pay?.error_description });
    return { updated: true };
  }
  return { ignored: true };
}

/** Customer self-service lookup. Needs the order id AND the phone, so ids alone leak nothing. */
export function trackOrder(db, id, phone) {
  const [p] = rules.phoneIN()(phone);
  if (!p) return null;
  const o = db.prepare('SELECT id, created_at, status, payment_method, payment_status, qty, total, city, pincode FROM orders WHERE id = ? AND phone = ?').get(String(id || '').toUpperCase(), p);
  return o || null;
}

export function listOrders(db, { limit = 200, status } = {}) {
  const lim = Math.min(1000, Math.max(1, +limit || 200));
  return status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, lim)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(lim);
}

export function updateOrderStatus(db, id, status) {
  if (!ORDER_STATUSES.includes(status)) throw new ValidationError({ status: 'Unknown status' });
  const r = db.prepare(`UPDATE orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(status, id);
  if (!r.changes) {
    const e = new Error('Order not found');
    e.status = 404;
    throw e;
  }
  logEvent(db, 'order.status', id, { status });
  return { id, status };
}

export function orderStats(db) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled','refunded') THEN total END),0) AS revenue,
              COALESCE(SUM(CASE WHEN payment_method='cod' THEN 1 END),0) AS cod,
              COALESCE(SUM(CASE WHEN payment_status='paid' THEN 1 END),0) AS prepaid
         FROM orders`
    )
    .get();
  return row;
}
