// Razorpay (UPI / cards / netbanking). Uses the REST API directly: no SDK needed.
// Signature checks follow Razorpay's docs: HMAC-SHA256 with the key secret / webhook secret.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { settings } from '../config.js';

export const razorpayEnabled = () => Boolean(settings.razorpay.keyId && settings.razorpay.keySecret);

const safeEqualHex = (a, b) => {
  const A = Buffer.from(String(a), 'utf8');
  const B = Buffer.from(String(b), 'utf8');
  return A.length === B.length && timingSafeEqual(A, B);
};

/** Create a Razorpay order. Amount in rupees, sent to Razorpay in paise. */
export async function createRazorpayOrder({ receipt, amountINR, notes }) {
  const auth = Buffer.from(`${settings.razorpay.keyId}:${settings.razorpay.keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amountINR * 100), currency: 'INR', receipt, notes }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Razorpay order failed (${res.status})`);
    err.status = 502;
    err.detail = text.slice(0, 300);
    throw err;
  }
  return res.json();
}

/** Checkout success handler signature: HMAC(order_id|payment_id, key_secret). */
export function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
  const expected = createHmac('sha256', settings.razorpay.keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  return safeEqualHex(expected, razorpay_signature);
}

/** Webhook signature: HMAC(raw body, webhook_secret). Needs the RAW body, not parsed JSON. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!settings.razorpay.webhookSecret || !signature) return false;
  const expected = createHmac('sha256', settings.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
