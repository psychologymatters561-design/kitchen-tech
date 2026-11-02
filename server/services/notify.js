// Tells the business about new orders and leads.
// 1) Always logs to the server console.
// 2) If NOTIFY_WEBHOOK_URL is set, POSTs a JSON summary (works with Make, Zapier, n8n, Slack, Google Sheets scripts).
// The owner can also open /admin any time.
import { settings } from '../config.js';

export async function notify(kind, payload) {
  const summary = { kind, at: new Date().toISOString(), ...payload };
  console.log(`[notify] ${kind}`, JSON.stringify(summary));
  if (!settings.notifyWebhook) return;
  try {
    await fetch(settings.notifyWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.warn('[notify] webhook failed:', e.message);
  }
}

/** WhatsApp click-to-chat link with a pre-filled message. */
export function waLink(number, text) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
