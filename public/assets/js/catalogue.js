import { boot, KT, esc, ico, waLink, initImgFallback } from './core.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
await boot();
const hasG = typeof window.gsap !== 'undefined' && !KT.reduce;

let items = [];
try {
  items = (await (await fetch('api/catalogue')).json()).items;
} catch {
  items = (await (await fetch('assets/data/catalogue.json')).json()).items;
}

const FILTERS = {
  all: () => true,
  b1: (i) => i.burners === 1,
  b2: (i) => i.burners === 2,
  b3: (i) => i.burners === 3,
  b4: (i) => i.burners === 4,
  glass: (i) => i.top === 'glass',
  steel: (i) => i.cat === 'gas' && i.top === 'steel',
  spares: (i) => i.cat === 'spares',
  appliances: (i) => i.cat === 'appliance',
};
const store = { get: () => { try { return JSON.parse(sessionStorage.getItem('kt_pick') || '[]'); } catch { return []; } }, set: (v) => { try { sessionStorage.setItem('kt_pick', JSON.stringify(v)); } catch {} } };
const picked = new Set(store.get());
let f = (location.hash.slice(1) in FILTERS && location.hash.slice(1)) || 'all';
let q = '';

const meta = (i) => (i.cat === 'gas' ? `${i.burners} burner · ${i.top === 'glass' ? 'glass-top' : 'stainless steel'}` : i.cat === 'spares' ? 'Spare part' : 'Home appliance');
const card = (i) => {
  const fb = JSON.stringify({ burners: i.burners, top: i.top, cat: i.cat }).replace(/'/g, '&#39;');
  const media = i.img
    ? `<img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy" referrerpolicy="no-referrer" data-fallback='${fb}'>`
    : `<img alt="" data-fallback='${fb}'>`;
  const ask = `Hi Kitchen Tech, I want the dealer price for ${i.name}${i.code ? ' (' + i.code + ')' : ''}.`;
  return `<article class="prod" data-id="${esc(i.id)}">
    ${i.gift ? '<span class="tag chip" style="background:#fff">Gift pick</span>' : ''}
    <button class="pick" type="button" aria-pressed="${picked.has(i.id)}" aria-label="Add ${esc(i.name)} to my price list">${ico.check}</button>
    <div class="img-frame">${media}</div>
    <div class="prod-body">
      <span class="prod-meta">${esc(meta(i))}${i.code ? ' · ' + esc(i.code) : ''}</span>
      <h3 class="prod-name">${esc(i.name)}</h3>
      ${i.specs.length ? `<ul class="prod-specs">${i.specs.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
      ${i.note ? `<span class="tbc" style="width:max-content">${esc('code to confirm')}</span>` : ''}
      <a class="btn btn-sm btn-dark" href="${waLink(ask)}" target="_blank" rel="noopener">${i.cat === 'appliance' ? 'Enquire' : 'Get dealer price'}</a>
    </div>
  </article>`;
};

function render() {
  const s = q.toLowerCase();
  const list = items.filter(FILTERS[f]).filter((i) => !s || (i.name + ' ' + (i.code || '') + ' ' + i.specs.join(' ')).toLowerCase().includes(s));
  const grid = $('#grid');
  grid.innerHTML = list.length ? list.map(card).join('') : '<p class="muted">No model matches. Try another word, or WhatsApp us what you need.</p>';
  // images with no src go straight to line-art
  initImgFallback(grid);
  $$('img[data-fallback]:not([src])', grid).forEach((img) => img.dispatchEvent(new Event('error')));
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'model' : 'models'}`;
  $$('.filters [data-f]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === f));
  if (hasG) {
    ScrollTrigger.batch(grid.children, { start: 'top 95%', once: true, interval: 0.08, batchMax: 8, onEnter: (els) => gsap.fromTo(els, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', overwrite: true }) });
    ScrollTrigger.refresh();
  }
}

function tray() {
  const n = picked.size;
  const t = $('#tray');
  t.classList.toggle('show', n > 0);
  document.body.classList.toggle('has-tray', n > 0);
  $('#tray-n').textContent = `${n} ${n === 1 ? 'model' : 'models'}`;
  const names = items.filter((i) => picked.has(i.id)).map((i) => `• ${i.name}${i.code ? ' (' + i.code + ')' : ''}`);
  $('#tray-send').href = waLink(`Hi Kitchen Tech, please send dealer prices for:\n${names.join('\n')}\n\nCity: \nQuantity: `);
  store.set([...picked]);
}

$('.filters').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  f = b.dataset.f;
  history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
  render();
});
let t;
$('#q').addEventListener('input', (e) => {
  clearTimeout(t);
  t = setTimeout(() => {
    q = e.target.value.trim();
    render();
  }, 150);
});
$('#grid').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (!b) return;
  const id = b.closest('.prod').dataset.id;
  picked.has(id) ? picked.delete(id) : picked.add(id);
  b.setAttribute('aria-pressed', picked.has(id));
  if (hasG) gsap.fromTo(b, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  tray();
});
$('#tray-clear').addEventListener('click', () => {
  picked.clear();
  $$('.pick').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  tray();
});
addEventListener('hashchange', () => {
  const h = location.hash.slice(1);
  if (h in FILTERS) {
    f = h;
    render();
  }
});
render();
tray();
