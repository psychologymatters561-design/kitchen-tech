// Shared runtime for every page: config, header/footer, smooth scroll, motion system, forms, tracking.
// Vendor globals (loaded before this module): gsap, ScrollTrigger, SplitText, DrawSVGPlugin, Lenis.
import { fmtINR } from './lib/cost-engine.js';

const d = document;
const root = d.documentElement;
root.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
const hasGsap = typeof window.gsap !== 'undefined';
if (hasGsap) gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.DrawSVGPlugin].filter(Boolean));
// phones: the address bar showing/hiding must not re-measure every pinned section (stops jumps)
if (hasGsap && window.ScrollTrigger) ScrollTrigger.config({ ignoreMobileResize: true });

export const KT = (window.KT = { reduce, isTouch, site: null, server: false });

/* ------------------------------------------------------------------ icons */
export const ico = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.7-.4Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  maybe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
  cylinder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6v3H9zM7 8a5 5 0 0 1 10 0v10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3Z"/><path d="M7 13h10"/></svg>',
  pot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M5 10v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-6M2 10h2m16 0h2M10 6c0-1 1-1 1-2m3 2c0-1 1-1 1-2"/></svg>',
  wipe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="12" width="18" height="7" rx="2"/><path d="M7 12V9a5 5 0 0 1 10 0v3M8 16h8"/></svg>',
  flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-4 6-4 12a7 7 0 0 0 7 7Z"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2v6m6-6v6M6 8h12v3a6 6 0 0 1-12 0Zm6 9v5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m9 12 2 2 4-4"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  factory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21V10l6 4V10l6 4V6l6 4v11Z"/><path d="M7 17h2m4 0h2"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h12M6 9h12M9 4c4 0 6 1.5 6 4.5S13 13 9 13H6l8 8"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4 9 8 12 8Zm0 0s2-5 4.5-4S15 8 12 8Z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
  ship: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l2 4h14l2-4ZM5 17V9h14v8M9 9V5h6v4"/></svg>',
};

/* coil logo mark: three rings under glass */
const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="1" y="1" width="38" height="38" rx="11" fill="#14100d" stroke="rgba(244,237,226,.18)"/><circle cx="20" cy="20" r="12" fill="none" stroke="#e8461f" stroke-width="2"/><circle cx="20" cy="20" r="7.5" fill="none" stroke="#ff7a2e" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#ffb25e"/></svg>`;

/* ------------------------------------------------------------------ config */
/** Catalogue from the API, then the static file, or the copy embedded in a preview build. */
export async function loadCatalogue() {
  if (window.__KT_DATA__?.catalogue) return window.__KT_DATA__.catalogue;
  try {
    return await getJSON('api/catalogue');
  } catch {
    return getJSON('assets/data/catalogue.json');
  }
}
async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
export async function loadSite() {
  if (KT.site) return KT.site;
  const embedded = window.__KT_DATA__?.site; // single-file preview build carries its data inline
  if (embedded) {
    KT.site = structuredClone(embedded);
    KT.site.product.orderable = Number.isFinite(KT.site.product.price) && KT.site.product.price > 0;
    KT.site.payments = { ...(KT.site.payments || {}), online: false };
    return KT.site;
  }
  try {
    KT.site = await getJSON('api/config');
    KT.server = true;
  } catch {
    KT.site = await getJSON('assets/data/site.json');
    KT.site.product.orderable = Number.isFinite(KT.site.product.price) && KT.site.product.price > 0;
    KT.site.payments = { ...(KT.site.payments || {}), online: false };
  }
  return KT.site;
}

export const tbc = (label = 'to confirm') => `<span class="tbc" title="Waiting for this detail from Kitchen Tech India">${label}</span>`;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const waLink = (text) => `https://wa.me/${KT.site?.brand?.whatsapp || '918882266677'}?text=${encodeURIComponent(text)}`;
export function priceHTML(p) {
  if (!p?.price) return `<span class="price-tbc">Launch price ${tbc('coming')}</span>`;
  const mrp = p.mrp && p.mrp > p.price ? ` <s class="muted">${fmtINR(p.mrp)}</s> <span class="chip" style="padding:.2em .6em">${Math.round((1 - p.price / p.mrp) * 100)}% off</span>` : '';
  return `<strong class="price">${fmtINR(p.price)}</strong>${mrp}`;
}
/** Fill [data-site="product.name"] style bindings; null values become a visible "to confirm" chip. */
export function bindSite(site, scope = d) {
  scope.querySelectorAll('[data-site]').forEach((el) => {
    const v = el.dataset.site.split('.').reduce((o, k) => (o == null ? o : o[k]), site);
    if (v === null || v === undefined || v === '') el.innerHTML = tbc(el.dataset.tbc || 'to confirm');
    else el.textContent = Array.isArray(v) ? v.join(', ') : (el.dataset.prefix || '') + v + (el.dataset.suffix || '');
  });
  scope.querySelectorAll('[data-price]').forEach((el) => (el.innerHTML = priceHTML(site.product)));
  scope.querySelectorAll('[data-wa]').forEach((a) => (a.href = waLink(a.dataset.wa || `Hi Kitchen Tech, I have a question.`)));
  scope.querySelectorAll('[data-tel]').forEach((a) => (a.href = 'tel:' + site.brand.phoneE164));
  scope.querySelectorAll('[data-cat-link]').forEach((a) => (a.href = site.brand.catalogueUrl));
  scope.querySelectorAll('[data-ico]').forEach((el) => {
    if (!el.firstChild && ico[el.dataset.ico]) el.innerHTML = ico[el.dataset.ico];
  });
  scope.querySelectorAll('.btn-wa:not([data-ico-done])').forEach((a) => {
    a.dataset.icoDone = 1;
    if (!a.querySelector('svg')) a.insertAdjacentHTML('afterbegin', ico.wa);
  });
}

/* ------------------------------------------------------------------ chrome */
const NAV = [
  ['aanch.html', 'Aanch', 'new'],
  ['catalogue.html', 'Gas Stoves'],
  ['catalogue.html#spares', 'Spare Parts'],
  ['business.html', 'For Business'],
  ['about.html', 'About'],
  ['contact.html', 'Contact'],
];
function renderChrome(site) {
  const here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const cur = (href) => (href.split('#')[0].replace('.html', '') === here ? ' aria-current="page"' : '');
  const header = d.createElement('header');
  header.className = 'site-header' + (d.body.dataset.header === 'light' ? ' on-light' : '');
  header.innerHTML = `<div class="wrap">
    <a class="logo" href="./" aria-label="${esc(site.brand.name)} home">${LOGO}<span class="logo-word"><b>Kitchen Tech</b><small>INDIA · ${esc(site.brand.years)} YEARS</small></span></a>
    <nav class="nav" aria-label="Main">${NAV.map(([h, t, c]) => `<a href="${h}"${cur(h)}${c ? ` class="${c}"` : ''}>${t}</a>`).join('')}</nav>
    <a class="btn btn-sm header-cta" href="aanch.html#buy">Buy Aanch</a>
    <button class="menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"><span></span></button>
  </div>`;
  const menu = d.createElement('div');
  menu.className = 'mobile-menu';
  menu.id = 'mobile-menu';
  menu.innerHTML = `<a href="./">Home</a>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}<a class="btn btn-lg btn-block" href="aanch.html#buy">Buy Aanch</a>`;
  d.body.prepend(menu);
  d.body.prepend(header);
  const btn = header.querySelector('.menu-btn');
  btn.addEventListener('click', () => {
    const open = d.body.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', open);
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    KT.lenis?.[open ? 'stop' : 'start']();
  });
  menu.addEventListener('click', (e) => e.target.closest('a') && d.body.classList.remove('menu-open'));

  const env = d.createElement('div');
  env.className = 'env';
  env.setAttribute('aria-hidden', 'true');
  d.body.prepend(env);

  const b = site.brand;
  const a = b.address;
  const footer = d.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `<div class="wrap">
    <div class="foot-top">
      <div><p class="foot-big">Aanch wahi.<br><span class="hi">Gas nahi.</span></p><p style="margin-top:18px;max-width:34ch">${esc(b.years)} years of making India's stoves in Delhi. Now cooking without gas.</p>
        <div class="btn-row" style="margin-top:18px"><a class="btn btn-wa btn-sm" data-wa="Hi Kitchen Tech, I have a question.">${ico.wa} WhatsApp</a><a class="btn btn-ghost btn-sm" data-tel>${ico.phone} ${esc(b.phoneDisplay)}</a></div></div>
      <div><h4>Shop</h4><ul><li><a href="aanch.html">Aanch Infrared Cooktop</a></li><li><a href="catalogue.html">Gas stoves</a></li><li><a href="catalogue.html#glass">Glass-top stoves</a></li><li><a href="catalogue.html#spares">Spare parts</a></li><li><a href="catalogue.html#appliances">Home appliances</a></li></ul></div>
      <div><h4>Business</h4><ul><li><a href="business.html#dealer">Become a dealer</a></li><li><a href="business.html#oem">OEM / private label</a></li><li><a href="business.html#bulk">Bulk and gifting</a></li><li><a href="business.html#png">PNG stoves</a></li><li><a href="${esc(b.catalogueUrl)}" rel="noopener">Catalogue 2025-26 (PDF)</a></li></ul></div>
      <div><h4>Help</h4><ul><li><a href="contact.html">Contact and factory</a></li><li><a href="policies.html#shipping">Shipping</a></li><li><a href="policies.html#returns">Returns and refunds</a></li><li><a href="policies.html#warranty">Warranty</a></li><li><a href="policies.html#privacy">Privacy</a></li><li><a href="policies.html#terms">Terms</a></li><li><a href="checkout.html#track">Track my order</a></li></ul></div>
    </div>
    <div class="foot-legal">
      <div>${b.legalName ? esc(b.legalName) : `Legal entity ${tbc()}`} · GSTIN ${b.gstin ? esc(b.gstin) : tbc()}<br>${esc(a.line1)}, ${esc(a.line2)}, ${esc(a.city)} ${esc(a.pin)} · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a><br>Grievance Officer: ${b.grievanceOfficer ? esc(b.grievanceOfficer) : tbc()}</div>
      <div><a href="${esc(b.social.instagram)}" rel="noopener">Instagram</a> · <a href="${esc(b.social.facebook)}" rel="noopener">Facebook</a><br>© ${new Date().getFullYear()} ${esc(b.name)}</div>
    </div>
  </div>`;
  d.body.append(footer);

  if (!d.body.dataset.noWa) {
    const wa = d.createElement('a');
    wa.className = 'wa-float';
    wa.setAttribute('aria-label', 'Chat on WhatsApp');
    wa.dataset.wa = d.body.dataset.waText || 'Hi Kitchen Tech, I have a question.';
    wa.innerHTML = ico.wa;
    d.body.append(wa);
  }

  // header: solid after the hero, hides on scroll down, returns on scroll up
  let last = 0;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 40);
    header.classList.toggle('hide', y > 400 && y > last && !d.body.classList.contains('menu-open'));
    last = y;
    root.style.setProperty('--env-y', 15 + ((y / Math.max(1, d.body.scrollHeight - innerHeight)) * 70).toFixed(1) + '%');
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ------------------------------------------------------------------ smooth scroll */
function initLenis() {
  if (reduce || typeof window.Lenis === 'undefined' || !hasGsap) return;
  const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  KT.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash.length < 2) return;
    const t = d.querySelector(url.hash);
    if (!t) return;
    e.preventDefault();
    lenis.scrollTo(t, { offset: -70 });
    history.replaceState(null, '', url.hash);
  });
}

/* ------------------------------------------------------------------ motion system */
export function initMotion(scope = d) {
  const els = scope.querySelectorAll('[data-reveal]');
  if (!hasGsap || reduce) {
    els.forEach((el) => (el.style.opacity = 1));
    scope.querySelectorAll('[data-count]').forEach((el) => (el.textContent = el.dataset.count));
    return;
  }
  const from = {
    up: { y: 46, opacity: 0 },
    down: { y: -36, opacity: 0 },
    fade: { opacity: 0 },
    left: { x: -60, opacity: 0 },
    right: { x: 60, opacity: 0 },
    scale: { scale: 0.9, opacity: 0 },
    zoom: { scale: 0.92, opacity: 0, filter: 'blur(8px)' }, // grows into place; never wider than its column
    clip: { clipPath: 'inset(0 0 100% 0)', opacity: 1 },
  };
  els.forEach((el) => {
    const kind = el.dataset.reveal || 'up';
    if (kind === 'none') return;
    if (kind === 'split' && window.SplitText) {
      el.style.opacity = 1;
      const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'ln' });
      gsap.from(split.words, { yPercent: 115, duration: 1.1, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
      return;
    }
    if (kind === 'stagger') {
      el.style.opacity = 1;
      gsap.from(el.children, { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      return;
    }
    const f = from[kind] || from.up;
    const rest = { x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', clipPath: 'inset(0 0 0% 0)' };
    const to = Object.fromEntries(Object.keys(f).map((k) => [k, rest[k]])); // only tween what we set
    gsap.fromTo(el, f, {
      ...to,
      opacity: 1,
      duration: kind === 'clip' ? 1.3 : 1.05, ease: kind === 'clip' ? 'expo.inOut' : 'power3.out', delay: +(el.dataset.delay || 0),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      ...(kind === 'zoom' ? { clearProps: 'filter' } : {}),
    });
  });

  // parallax: data-parallax="-0.2" moves the element against scroll
  scope.querySelectorAll('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax) || 0.15;
    gsap.fromTo(el, { yPercent: -amt * 50 }, { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // zoom-out on scroll: images start big and settle
  scope.querySelectorAll('[data-zoom]').forEach((el) => {
    gsap.fromTo(el, { scale: parseFloat(el.dataset.zoom) || 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'center center', scrub: true } });
  });
  // self-drawing lines
  if (window.DrawSVGPlugin) {
    scope.querySelectorAll('[data-draw]').forEach((el) => {
      const paths = el.matches('path,line,circle,polyline,ellipse,rect') ? [el] : el.querySelectorAll('path,line,circle,polyline,ellipse');
      gsap.fromTo(paths, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 85%', end: el.dataset.draw === 'long' ? 'bottom 40%' : 'top 35%', scrub: 0.6 } });
    });
  }
  // number count-up
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = +(el.dataset.dec || 0);
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => (el.textContent = (el.dataset.pre || '') + o.v.toLocaleString('en-IN', { maximumFractionDigits: dec, minimumFractionDigits: dec }) + (el.dataset.suf || '')) });
  });
}

/* glow follows the pointer inside buttons */
function initButtons() {
  if (isTouch) return;
  d.addEventListener('pointermove', (e) => {
    const b = e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
  });
}

/* ------------------------------------------------------------------ stove line-art (shown when no photo exists) */
export function stoveArt({ burners = 2, top = 'steel', cat = 'gas' } = {}) {
  if (cat === 'infrared') {
    return `<svg viewBox="0 0 400 300" class="img-fallback" role="img" aria-label="Aanch infrared cooktop illustration"><defs><radialGradient id="fa-h"><stop offset="0" stop-color="#ffc77a"/><stop offset=".4" stop-color="#ff5a1f" stop-opacity=".85"/><stop offset="1" stop-color="#b3200e" stop-opacity="0"/></radialGradient><linearGradient id="fa-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2521"/><stop offset="1" stop-color="#070606"/></linearGradient></defs>
      <path d="M110 92 L290 92 Q300 92 304 100 L352 196 Q356 206 344 206 L56 206 Q44 206 48 196 L96 100 Q100 92 110 92Z" fill="url(#fa-g)" stroke="rgba(244,237,226,.2)"/><path d="M48 206 L352 206 L348 222 Q346 226 340 226 L60 226 Q54 226 52 222Z" fill="#1d1713"/>
      <ellipse cx="200" cy="150" rx="110" ry="46" fill="url(#fa-h)" opacity=".9"/>${[86, 66, 46, 26].map((r) => `<ellipse cx="200" cy="150" rx="${r}" ry="${(r * 0.42).toFixed(1)}" fill="none" stroke="#ff6a26" stroke-width="2.4"/>`).join('')}
      <g fill="none" stroke="rgba(244,237,226,.4)"><ellipse cx="270" cy="196" rx="5" ry="2.4"/><ellipse cx="290" cy="196" rx="5" ry="2.4"/><ellipse cx="310" cy="196" rx="5" ry="2.4"/></g><ellipse cx="200" cy="250" rx="160" ry="8" fill="#000" opacity=".45"/></svg>`;
  }
  if (cat !== 'gas') {
    return `<svg viewBox="0 0 200 150" class="img-fallback" aria-hidden="true"><g fill="none" stroke="#b4a796" stroke-width="2"><circle cx="100" cy="72" r="34"/><circle cx="100" cy="72" r="20"/><circle cx="100" cy="72" r="6"/><path d="M60 122h80" stroke-linecap="round"/></g></svg>`;
  }
  const n = Math.max(1, Math.min(4, burners));
  const W = 200, H = 150, bodyW = 60 + n * 30;
  const x0 = (W - bodyW) / 2;
  const glass = top === 'glass';
  const pos = { 1: [[100, 64]], 2: [[x0 + bodyW * 0.28, 64], [x0 + bodyW * 0.72, 64]], 3: [[x0 + bodyW * 0.2, 66], [100, 58], [x0 + bodyW * 0.8, 66]], 4: [[x0 + bodyW * 0.18, 66], [x0 + bodyW * 0.4, 58], [x0 + bodyW * 0.6, 58], [x0 + bodyW * 0.82, 66]] }[n];
  const r = n >= 3 ? 15 : 19;
  const burnerSVG = pos.map(([cx, cy]) => `<g><circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="${glass ? '#5b4f45' : '#c4bcb1'}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${r - 3}" fill="${glass ? '#2a211b' : '#d9d2c8'}" stroke="#c49a56" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#c49a56"/>${[0, 60, 120].map((a) => `<line x1="${cx - (r + 8) * Math.cos((a * Math.PI) / 180)}" y1="${cy - (r + 8) * 0.55 * Math.sin((a * Math.PI) / 180)}" x2="${cx + (r + 8) * Math.cos((a * Math.PI) / 180)}" y2="${cy + (r + 8) * 0.55 * Math.sin((a * Math.PI) / 180)}" stroke="${glass ? '#1b1511' : '#7d746a'}" stroke-width="3" stroke-linecap="round"/>`).join('')}</g>`).join('');
  const knobs = pos.map(([cx]) => `<circle cx="${cx}" cy="106" r="5.5" fill="${glass ? '#c49a56' : '#3a2f27'}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="img-fallback" role="img" aria-label="${n} burner ${glass ? 'glass-top' : 'stainless steel'} stove illustration">
    <defs><linearGradient id="st${n}${top}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${glass ? '#2b231d' : '#eceae6'}"/><stop offset="1" stop-color="${glass ? '#0f0c0a' : '#b9b5ae'}"/></linearGradient></defs>
    <rect x="${x0}" y="30" width="${bodyW}" height="88" rx="10" fill="url(#st${n}${top})" stroke="${glass ? '#4a3d33' : '#a39d94'}"/>
    <rect x="${x0}" y="96" width="${bodyW}" height="22" rx="6" fill="${glass ? '#1b1511' : '#a8a39b'}" opacity=".9"/>
    ${glass ? `<path d="M${x0 + 10} 36 L${x0 + 40} 36 L${x0 + 18} 92 L${x0 + 6} 92Z" fill="#fff" opacity=".06"/>` : ''}
    ${burnerSVG}${knobs}
    <ellipse cx="100" cy="128" rx="${bodyW * 0.55}" ry="5" fill="#1b1511" opacity=".12"/></svg>`;
}

/** <img data-fallback='{"burners":3,"top":"glass"}'>: swap broken remote photos for designed line-art. */
export function initImgFallback(scope = d) {
  scope.querySelectorAll('img[data-fallback]').forEach((img) => {
    const swap = () => {
      if (img.dataset.swapped) return;
      img.dataset.swapped = 1;
      let o = {};
      try {
        o = JSON.parse(img.dataset.fallback || '{}');
      } catch {}
      img.insertAdjacentHTML('afterend', stoveArt(o));
      img.remove();
    };
    if (img.complete && img.naturalWidth === 0 && img.src) swap();
    img.addEventListener('error', swap, { once: true });
  });
}

/* ------------------------------------------------------------------ tracking (Meta Pixel + GA4, only when ids exist) */
export function track(name, params = {}) {
  const id = params.eventID || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  try {
    window.fbq?.('track', name, params, { eventID: id });
    window.gtag?.('event', name, params);
  } catch {}
  return id;
}
function initTracking(site) {
  const pid = site.tracking?.metaPixelId;
  if (pid) {
    /* standard Meta Pixel bootstrap, written out so no inline script is needed (CSP stays strict) */
    const f = window;
    if (!f.fbq) {
      const n = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
      f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      const s = d.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      d.head.append(s);
    }
    fbq('init', pid);
    fbq('track', 'PageView');
  }
  const ga = site.tracking?.ga4Id;
  if (ga) {
    const s = d.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`;
    d.head.append(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', ga);
  }
  // keep ad attribution for forms
  const q = new URLSearchParams(location.search);
  const utm = {};
  for (const [k, v] of q) if (/^(utm_[a-z]+|fbclid|gclid)$/.test(k)) utm[k] = v;
  try {
    if (Object.keys(utm).length) sessionStorage.setItem('kt_utm', JSON.stringify(utm));
  } catch {}
}
export function getUtm() {
  try {
    return JSON.parse(sessionStorage.getItem('kt_utm') || 'null');
  } catch {
    return null;
  }
}
const cookie = (n) => (d.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')) || [])[1];

/* ------------------------------------------------------------------ forms */
/**
 * Posts a form as JSON. Shows per-field errors from the API (422).
 * If the server is unreachable (static preview), hands the visitor to WhatsApp with their details instead,
 * so a message is never silently lost.
 */
export function wireForm(form, { endpoint, extra = () => ({}), onSuccess, waFallback }) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type=submit]');
    const data = Object.fromEntries(new FormData(form));
    Object.assign(data, extra(data), { utm: getUtm(), fbp: cookie('_fbp'), fbc: cookie('_fbc') });
    form.querySelectorAll('.field.err').forEach((f) => f.classList.remove('err'));
    const label = btn?.innerHTML;
    if (btn) { btn.setAttribute('aria-disabled', 'true'); btn.innerHTML = 'Sending…'; }
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await r.json().catch(() => ({}));
      if (r.status === 422 && out.fields) {
        for (const [k, msg] of Object.entries(out.fields)) {
          const f = form.querySelector(`[name="${k}"]`)?.closest('.field');
          if (f) { f.classList.add('err'); const em = f.querySelector('.error'); if (em) em.textContent = msg; }
        }
        form.querySelector('.field.err [name]')?.focus();
        return;
      }
      if (!r.ok) throw Object.assign(new Error(out.error || 'Request failed'), { status: r.status, code: out.code });
      onSuccess?.(out, data);
    } catch (err) {
      if (waFallback && err.status !== 429 && (!err.status || err.status === 404 || err.status >= 405)) {
        const text = waFallback(data, err);
        const box = form.querySelector('.form-fallback') || form.appendChild(Object.assign(d.createElement('div'), { className: 'notice form-fallback' }));
        box.innerHTML = `${err.code === 'PRICE_NOT_SET' ? esc(err.message) : 'Our website inbox is offline right now.'} Tap below and your details go straight to our WhatsApp.<div class="btn-row" style="margin-top:12px"><a class="btn btn-wa" href="${waLink(text)}" target="_blank" rel="noopener">${ico.wa} Send on WhatsApp</a></div>`;
      } else {
        alert(err.message || 'Something went wrong. Please WhatsApp us.');
      }
    } finally {
      if (btn) { btn.removeAttribute('aria-disabled'); btn.innerHTML = label; }
    }
  });
}

/* ------------------------------------------------------------------ boot */
export async function boot() {
  const site = await loadSite();
  renderChrome(site);
  bindSite(site);
  initLenis();
  initButtons();
  initImgFallback();
  initTracking(site);
  initMotion();
  // fonts change line breaks; refresh trigger positions once they land
  d.fonts?.ready.then(() => hasGsap && ScrollTrigger.refresh());
  return site;
}
