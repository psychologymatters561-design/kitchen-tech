// Owner dashboard: orders and leads from the API. Token lives only in this browser tab (sessionStorage).
import { fmtINR } from './lib/cost-engine.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ORDER_ST = ['new', 'awaiting_payment', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];
const LEAD_ST = ['new', 'contacted', 'qualified', 'won', 'lost'];
let token = '';
try { token = sessionStorage.getItem('kt_admin') || ''; } catch {}
let tab = 'orders';
let rows = [];

async function api(path, opts = {}) {
  const r = await fetch('api/admin' + path, { ...opts, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Request failed'), { status: r.status });
  return j;
}
const when = (s) => new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const wa = (p, text) => `https://wa.me/91${p}?text=${encodeURIComponent(text)}`;

async function load() {
  const [stats, data] = await Promise.all([api('/stats'), api('/' + tab + '?limit=500')]);
  rows = data;
  const o = stats.orders;
  const leads = stats.leads.reduce((s, l) => s + l.n, 0);
  $('#kpis').innerHTML = [
    [o.orders, 'orders'],
    [fmtINR(o.revenue), 'order value (not cancelled)'],
    [o.cod, 'cash on delivery'],
    [o.prepaid, 'paid online'],
    [leads, 'leads: ' + stats.leads.map((l) => `${l.type} ${l.n}`).join(', ')],
  ].map(([b, s]) => `<div class="kpi"><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('');

  if (tab === 'orders') {
    $('#thead').innerHTML = '<tr><th>Order</th><th>When</th><th>Customer</th><th>Address</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th></tr>';
    $('#tbody').innerHTML = rows.map((r) => `<tr>
      <td><strong>${esc(r.id)}</strong>${r.utm ? `<br><small>${esc(r.utm)}</small>` : ''}</td>
      <td>${esc(when(r.created_at))}</td>
      <td>${esc(r.name)}<br><a href="${wa(r.phone, `Hi ${r.name}, this is Kitchen Tech India about your order ${r.id}.`)}" target="_blank" rel="noopener">${esc(r.phone)}</a>${r.email ? `<br><small>${esc(r.email)}</small>` : ''}</td>
      <td>${esc(r.address)}<br>${esc(r.city)} ${esc(r.pincode)}${r.state ? ', ' + esc(r.state) : ''}${r.notes ? `<br><small>${esc(r.notes)}</small>` : ''}</td>
      <td>${r.qty}</td><td>${fmtINR(r.total)}${r.discount ? `<br><small>-${fmtINR(r.discount)}</small>` : ''}</td>
      <td>${r.payment_method === 'cod' ? 'COD' : 'Online'}<br><small>${esc(r.payment_status)}</small></td>
      <td><select class="st" data-id="${esc(r.id)}">${ORDER_ST.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="8">No orders yet.</td></tr>';
  } else {
    $('#thead').innerHTML = '<tr><th>#</th><th>When</th><th>Type</th><th>Contact</th><th>Firm / city</th><th>Details</th><th>Status</th></tr>';
    $('#tbody').innerHTML = rows.map((r) => `<tr>
      <td>${r.id}</td><td>${esc(when(r.created_at))}</td><td><strong>${esc(r.type)}</strong></td>
      <td>${esc(r.name)}<br><a href="${wa(r.phone, `Hi ${r.name}, this is Kitchen Tech India replying to your enquiry.`)}" target="_blank" rel="noopener">${esc(r.phone)}</a>${r.email ? `<br><small>${esc(r.email)}</small>` : ''}</td>
      <td>${esc(r.firm || '')}<br>${esc(r.city || '')}${r.gstin ? `<br><small>${esc(r.gstin)}</small>` : ''}</td>
      <td>${r.volume ? `<small>Volume:</small> ${esc(r.volume)}<br>` : ''}${esc(r.message || '')}</td>
      <td><select class="st" data-id="${r.id}">${LEAD_ST.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="7">No leads yet.</td></tr>';
  }
}

function csv() {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([[keys.join(','), ...rows.map((r) => keys.map((k) => q(r[k])).join(','))].join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kitchentech-${tab}-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
}

async function start() {
  try {
    await load();
    $('#login').hidden = true;
    $('#app').hidden = false;
  } catch (e) {
    $('#login').hidden = false;
    $('#app').hidden = true;
    $('#login-err').textContent = token ? e.message : '';
  }
}

$('#login').addEventListener('submit', (e) => {
  e.preventDefault();
  token = $('#tok').value.trim();
  try { sessionStorage.setItem('kt_admin', token); } catch {}
  start();
});
$('#logout').addEventListener('click', () => { token = ''; try { sessionStorage.removeItem('kt_admin'); } catch {} start(); });
$('#refresh').addEventListener('click', load);
$('#csv').addEventListener('click', csv);
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === b));
  load();
}));
$('#tbody').addEventListener('change', async (e) => {
  const s = e.target.closest('select.st');
  if (!s) return;
  try {
    await api(`/${tab}/${encodeURIComponent(s.dataset.id)}`, { method: 'PATCH', body: JSON.stringify({ status: s.value }) });
    s.style.outline = '2px solid #4f7a4a';
    setTimeout(() => (s.style.outline = ''), 900);
  } catch (err) {
    alert(err.message);
  }
});
start();
