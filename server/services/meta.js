// Meta Conversions API (server-side events). Pairs with the browser Pixel via a shared event_id,
// so Meta de-duplicates and ad optimisation still works when browsers block the Pixel.
// Silently does nothing until META_PIXEL_ID and META_CAPI_TOKEN are set.
import { settings } from '../config.js';
import { sha256 } from '../lib/validate.js';

export async function sendMetaEvent({ eventName, eventId, value, currency = 'INR', user = {}, sourceUrl, ip, ua }) {
  const { pixelId, capiToken, testCode } = settings.meta;
  if (!pixelId || !capiToken) return { skipped: true };
  const user_data = {
    client_ip_address: ip || undefined,
    client_user_agent: ua || undefined,
    ph: user.phone ? [sha256('91' + user.phone)] : undefined,
    em: user.email ? [sha256(user.email)] : undefined,
    ct: user.city ? [sha256(user.city.replace(/\s/g, ''))] : undefined,
    zp: user.pincode ? [sha256(user.pincode)] : undefined,
    country: [sha256('in')],
    fbp: user.fbp || undefined,
    fbc: user.fbc || undefined,
  };
  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: sourceUrl,
        user_data,
        custom_data: value !== undefined ? { value, currency } : undefined,
      },
    ],
    test_event_code: testCode || undefined,
  };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(capiToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
