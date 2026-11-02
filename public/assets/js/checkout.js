import { boot, KT, track, waLink, esc, getUtm } from './core.js';
import { fmtINR } from './lib/cost-engine.js';

const $ = (s, r = document) => r.querySelector(s);
const site = await boot();
const P = site.product;
const max = P.maxQtyPerOrder || 9;
let qty = Math.min(max, Math.max(1, parseInt(new URLSearchParams(location.search).get('qty'), 10) || 1));
const form = $('#order-form');
const online = Boolean(site.payments?.online);

if (!online) {
  $('#pm-online').disabled = true;
  $('#pm-online-note').textContent = 'Coming soon. Choose cash on delivery for now.';
}
if (!P.cod) {
  $('#pm-cod').disabled = true;
  if (online) $('#pm-online').checked = true;
}
if (!P.orderable) {
  const note = $('#price-note');
  note.hidden = false;
  note.innerHTML = `Online orders open as soon as our launch price is live. You can still book yours today on WhatsApp. <div class="btn-row" style="margin-top:10px"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waLink('Hi, I want to book Aanch. Please share the launch price.')}">Book on WhatsApp</a></div>`;
}

function summary() {
  $('#qty').textContent = qty;
  const method = form.paymentMethod.value;
  if (!P.orderable) {
    $('#s-unit').innerHTML = '<span class="tbc">launch price soon</span>';
    $('#s-total').textContent = '-';
    return;
  }
  const sub = P.price * qty;
  const disc = method === 'online' ? (P.prepaidDiscount || 0) * qty : 0;
  $('#s-unit').textContent = `${fmtINR(P.price)} × ${qty}`;
  $('#s-disc-row').hidden = !disc;
  $('#s-disc').textContent = '-' + fmtINR(disc);
  $('#s-total').textContent = fmtINR(sub - disc);
  if (P.prepaidDiscount && online) $('#pm-online-note').textContent = `Save ${fmtINR(P.prepaidDiscount)} per cooktop when you pay now. Secure payment by Razorpay.`;
}
document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { qty = Math.min(max, Math.max(1, qty + +b.dataset.q)); summary(); }));
form.addEventListener('change', summary);
summary();
track('InitiateCheckout', { currency: 'INR', value: P.price ? P.price * qty : undefined, num_items: qty });

/* PIN code -> city and state (India Post public API). Best effort, never blocks the form. */
$('#o-pin').addEventListener('input', async (e) => {
  const v = e.target.value.replace(/\D/g, '');
  e.target.value = v;
  if (v.length !== 6) return;
  try {
    const r = await fetch(`https://api.postalpincode.in/pincode/${v}`, { signal: AbortSignal.timeout(4000) });
    const [d] = await r.json();
    const po = d?.PostOffice?.[0];
    if (po) {
      if (!$('#o-city').value) $('#o-city').value = po.District;
      if (!$('#o-state').value) $('#o-state').value = po.State;
    }
  } catch {}
});

function showErrors(fields) {
  for (const [k, msg] of Object.entries(fields || {})) {
    const f = form.querySelector(`[name="${k}"]`)?.closest('.field');
    if (f) { f.classList.add('err'); const em = f.querySelector('.error'); if (em) em.textContent = msg; }
  }
  form.querySelector('.field.err')?.scrollIntoView({ behavior: KT.reduce ? 'auto' : 'smooth', block: 'center' });
}
function done(o, method) {
  $('#co').classList.add('done');
  $('#done-id').textContent = o.id;
  $('#done-wa').href = o.whatsapp || waLink(`Hi, I placed order ${o.id}. Please confirm.`);
  $('#done-msg').textContent = method === 'online' ? 'Payment received. We will WhatsApp you the dispatch details.' : `Please keep ${fmtINR(o.total)} ready for cash on delivery. We'll call or WhatsApp you to confirm before we ship.`;
  $('#done').focus();
  scrollTo({ top: 0, behavior: KT.reduce ? 'auto' : 'smooth' });
  track('Purchase', { currency: 'INR', value: o.total, num_items: o.qty, eventID: o.id });
}
function loadRazorpay() {
  return new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = res;
    s.onerror = () => rej(new Error('Could not load the payment window. Check your connection or choose cash on delivery.'));
    document.head.append(s);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  form.querySelectorAll('.field.err').forEach((f) => f.classList.remove('err'));
  if (!P.orderable) {
    const d = Object.fromEntries(new FormData(form));
    open(waLink(`Hi, I want to book ${qty} Aanch. Name: ${d.name}. Phone: ${d.phone}. Address: ${d.address}, ${d.city} ${d.pincode}.`), '_blank');
    return;
  }
  const btn = $('#place');
  const label = btn.textContent;
  btn.setAttribute('aria-disabled', 'true');
  btn.textContent = 'Placing order…';
  const body = { ...Object.fromEntries(new FormData(form)), qty, utm: getUtm() };
  try {
    const r = await fetch('api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const o = await r.json().catch(() => ({}));
    if (r.status === 422) return showErrors(o.fields);
    if (!r.ok) throw new Error(o.error || 'Could not place the order.');
    if (body.paymentMethod === 'online' && o.razorpay) {
      await loadRazorpay();
      const rz = new window.Razorpay({
        ...o.razorpay,
        handler: async (resp) => {
          const c = await fetch('api/orders/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
          const cj = await c.json().catch(() => ({}));
          if (!c.ok) return alert(cj.error || 'We could not verify the payment. WhatsApp us your order ID: ' + o.id);
          done({ ...o, ...cj }, 'online');
        },
        modal: { ondismiss: () => alert(`Payment not completed. Your order ${o.id} is saved. Try again, or WhatsApp us to switch to cash on delivery.`) },
      });
      rz.open();
    } else {
      done(o, 'cod');
    }
  } catch (err) {
    const box = $('#price-note');
    box.hidden = false;
    box.innerHTML = `${esc(err.message)} <div class="btn-row" style="margin-top:10px"><a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${waLink(`Hi, I tried to order ${qty} Aanch on the website and it failed. Name: ${body.name}. Phone: ${body.phone}. PIN: ${body.pincode}.`)}">Order on WhatsApp instead</a></div>`;
    box.scrollIntoView({ block: 'center' });
  } finally {
    btn.removeAttribute('aria-disabled');
    btn.textContent = label;
  }
});

$('#track-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  const out = $('#track-out');
  try {
    const r = await fetch(`api/orders/track?id=${encodeURIComponent(d.id)}&phone=${encodeURIComponent(d.phone)}`);
    const o = await r.json();
    if (!r.ok) throw new Error(o.error);
    const label = { new: 'Received', awaiting_payment: 'Waiting for payment', paid: 'Paid', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled', refunded: 'Refunded' }[o.status] || o.status;
    out.innerHTML = `<strong>${esc(o.id)}</strong>: ${esc(label)} · ${o.qty} × Aanch · ${fmtINR(o.total)} · ${o.payment_method === 'cod' ? 'cash on delivery' : 'prepaid'}`;
  } catch (err) {
    out.textContent = err.message || 'Could not check right now. WhatsApp us your order ID.';
  }
});
