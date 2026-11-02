import { boot, KT, ico, esc, track, wireForm, waLink, priceHTML, initMotion } from './core.js';
import { monthlyCost, utensilCheck, UTENSILS, nationalImpact, fmtINR } from './lib/cost-engine.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const site = await boot();
const P = site.product;
const hasG = typeof window.gsap !== 'undefined' && !KT.reduce;

/* Indian number words: 12,50,000 -> 12.5 lakh */
const inWords = (n) => (n >= 1e7 ? `${+(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)} crore` : n >= 1e5 ? `${+(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)} lakh` : Math.round(n).toLocaleString('en-IN'));

/* =================================================================== 1. hero film */
function heroFilm() {
  const hero = $('.ir-hero');
  const svg = $('.ir-scene', hero);
  const setVB = () => svg.setAttribute('viewBox', innerWidth < 720 ? '130 120 740 420' : '0 110 1000 420');
  setVB();
  addEventListener('resize', setVB, { passive: true });

  const rings = $$('.coil-ring', hero);
  const bloom = $('.ir-bloom', hero);
  const floor = $('.ir-glow-floor', hero);
  const led = $('.ir-led', hero);
  const refl = $('.ir-refl', hero);
  const intro = $('.ir-intro', hero);
  const caps = $$('.ir-cap', hero);
  const settle = $('.ir-settle', hero);
  const cue = $('.ir-cue', hero);
  const roti = $('.ir-roti', hero);
  const puff = $('.ir-puff', hero);
  const steam = $('.ir-steam', hero);
  const uts = $$('.ir-ut', hero);
  const label = $('.ir-ut-label', hero);
  const count = $('.ir-ut-count', hero);
  const heat = { v: 1 };
  KT.heat = heat;

  const cold = '#2a2320', hot = '#ff5a1f';
  const paintHeat = () => {
    const c = gsap.utils.interpolate(cold, hot, heat.v);
    rings.forEach((r) => r.setAttribute('stroke', c));
    hero.style.setProperty('--heat', heat.v.toFixed(3));
    bloom.setAttribute('opacity', heat.v.toFixed(3));
    led.setAttribute('opacity', heat.v > 0.05 ? 1 : 0.15);
    floor.style.setProperty('--heat', heat.v.toFixed(3));
  };

  if (!hasG) {
    paintHeat();
    return;
  }

  heat.v = 0;
  paintHeat();
  gsap.set(roti, { y: -280, opacity: 0 });
  gsap.set(puff, { scaleY: 0.12, svgOrigin: '500 364' });
  gsap.set(steam, { opacity: 0 });
  gsap.set(uts, { x: 560, opacity: 0 });
  gsap.set([...caps, settle], { autoAlpha: 0, y: 34 });

  // gentle intro on load, before any scroll
  gsap.from(intro.children, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.1 });
  gsap.to(heat, { v: 0.18, duration: 2.2, ease: 'power2.inOut', delay: 0.4, onUpdate: paintHeat });

  const U0 = 6.8, US = 0.36; // utensil parade start and slot length
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  const capIn = (el, t) => tl.to(el, { autoAlpha: 1, y: 0, duration: 0.4 }, t);
  const capOut = (el, t) => tl.to(el, { autoAlpha: 0, y: -30, duration: 0.35, ease: 'power2.in' }, t);

  tl.to(intro, { autoAlpha: 0, y: -50, duration: 0.8, ease: 'power2.in' }, 0)
    .to(cue, { autoAlpha: 0, duration: 0.3 }, 0)
    .fromTo(heat, { v: 0.18 }, { v: 1, duration: 1.8, ease: 'power1.in', onUpdate: paintHeat, immediateRender: false }, 0.5)
    .fromTo(refl, { x: -120 }, { x: 520, duration: 3, ease: 'none' }, 0.4);
  capIn(caps[0], 1.0); capOut(caps[0], 2.4);
  capIn(caps[1], 2.8); capOut(caps[1], 4.0);

  // roti drops, lands, puffs, steams, slides away
  tl.to(roti, { y: 0, opacity: 1, duration: 0.7, ease: 'bounce.out' }, 4.2)
    .to(puff, { scaleY: 1, duration: 0.8, ease: 'back.out(2)' }, 5.0)
    .to(steam, { opacity: 0.9, duration: 0.5 }, 5.3)
    .fromTo($$('path', steam), { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.9, stagger: 0.12, ease: 'none' }, 5.3)
    .to(steam, { opacity: 0, duration: 0.3 }, 6.2)
    .to(roti, { x: -640, opacity: 0, duration: 0.5, ease: 'power2.in' }, 6.3);
  capIn(caps[2], 4.6); capOut(caps[2], 6.2);

  // six bartan, one after another
  capIn(caps[3], U0);
  uts.forEach((u, i) => {
    const t = U0 + i * US;
    tl.to(u, { x: 0, opacity: 1, duration: US * 0.4, ease: 'power3.out' }, t);
    if (i < uts.length - 1) tl.to(u, { x: -560, opacity: 0, duration: US * 0.4, ease: 'power3.in' }, t + US * 0.6);
  });
  const end = U0 + uts.length * US;
  tl.to(uts[uts.length - 1], { x: -560, opacity: 0, duration: 0.3, ease: 'power3.in' }, end + 0.1);
  capOut(caps[3], end + 0.1);
  tl.to(settle, { autoAlpha: 1, y: 0, duration: 0.5 }, end + 0.45)
    .to(svg, { scale: 1.06, transformOrigin: '50% 80%', duration: 0.8, ease: 'none' }, end + 0.2)
    .to({}, { duration: 0.6 }); // a beat of rest on the settle before the page moves on

  let lastIdx = -1;
  const onUpdate = () => {
    if (tl.time() < U0 && lastIdx !== -1) { lastIdx = -1; label.innerHTML = ''; count.textContent = ''; }
    const t = tl.time();
    const idx = Math.max(0, Math.min(uts.length - 1, Math.floor((t - U0) / US)));
    if (t >= U0 && idx !== lastIdx) {
      lastIdx = idx;
      label.innerHTML = `${ico.check} ${esc(uts[idx].dataset.name)}`;
      count.textContent = `${idx + 1} of ${uts.length} bartan · works`;
    }
  };

  tl.eventCallback('onUpdate', onUpdate); // fires during scrub catch-up too
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => '+=' + Math.round(innerHeight * (innerWidth < 720 ? 3.6 : 4.2)),
    pin: true,
    scrub: 0.8,
    anticipatePin: 1,
    animation: tl,
    invalidateOnRefresh: true,
  });

  sparks(hero, svg, heat);
}

/* embers rising from the coil, whisper level, only while the hero is on screen */
function sparks(hero, svg, heat) {
  const cv = $('.ir-sparks', hero);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let W = 0, H = 0, run = false, ps = [];
  const size = () => {
    W = cv.width = hero.clientWidth * dpr;
    H = cv.height = hero.clientHeight * dpr;
  };
  size();
  addEventListener('resize', size, { passive: true });
  const origin = () => {
    const m = svg.getScreenCTM();
    const hr = hero.getBoundingClientRect();
    if (!m) return { x: W / 2, y: H * 0.7, w: W * 0.2 };
    const pt = svg.createSVGPoint();
    pt.x = 500; pt.y = 362;
    const c = pt.matrixTransform(m);
    pt.x = 700;
    const e = pt.matrixTransform(m);
    return { x: (c.x - hr.left) * dpr, y: (c.y - hr.top) * dpr, w: (e.x - c.x) * dpr };
  };
  const max = KT.isTouch ? 26 : 54;
  const tick = () => {
    if (!run) return;
    ctx.clearRect(0, 0, W, H);
    const o = origin();
    if (ps.length < max * heat.v && Math.random() < 0.5) {
      ps.push({ x: o.x + (Math.random() - 0.5) * o.w * 1.8, y: o.y, vx: (Math.random() - 0.5) * 0.3 * dpr, vy: -(0.4 + Math.random() * 0.9) * dpr, life: 1, r: (0.6 + Math.random() * 1.6) * dpr });
    }
    ctx.globalCompositeOperation = 'lighter';
    ps = ps.filter((p) => {
      p.x += p.vx + Math.sin(p.y * 0.01) * 0.2;
      p.y += p.vy;
      p.life -= 0.006;
      if (p.life <= 0) return false;
      const a = p.life * heat.v * 0.8;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,${120 + Math.round(p.life * 80)},60,${a.toFixed(3)})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
    requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    run = e.isIntersecting;
    if (run) requestAnimationFrame(tick);
  }).observe(hero);
}

/* =================================================================== 2. scrubbed story words */
function storyWords() {
  const el = $('[data-scrub-words]');
  if (!el) return;
  const walk = (node, hot) => {
    const out = [];
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => out.push(/^\s+$/.test(w) || !w ? w : `<span class="w${hot ? ' hot' : ''}">${esc(w)}</span>`));
      else out.push(walk(n, hot || n.classList?.contains('hot')));
    });
    return out.join('');
  };
  el.innerHTML = walk(el, false);
  const words = $$('.w', el);
  if (!hasG) return words.forEach((w) => w.classList.add('on'));
  ScrollTrigger.create({
    trigger: el,
    start: 'top 78%',
    end: 'bottom 42%',
    scrub: true,
    onUpdate: (s) => {
      const n = Math.round(s.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    },
  });
}

/* =================================================================== 3. bartan checker */
const UT_ICON = {
  'steel-kadai': (c = '#a9aeb2') => `<path d="M8 22 Q10 40 32 41 Q54 40 56 22Z" fill="${c}"/><ellipse cx="32" cy="22" rx="25" ry="6" fill="#6d7378" stroke="${c}" stroke-width="2"/><path d="M7 23q-5-1-6 2q1 3 6 1M57 23q5-1 6 2q-1 3-6 1" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  'alu-cooker': () => `<rect x="16" y="16" width="30" height="26" rx="4" fill="#cfd0cb"/><path d="M17 16Q31 9 45 16Z" fill="#b4b5b0"/><rect x="29" y="7" width="5" height="6" rx="1.5" fill="#2a2827"/><path d="M45 14 L62 12 L62 16 L45 19Z" fill="#2a2827"/>`,
  'alu-patila': () => `<path d="M12 18 L52 18 L49 40 Q48 43 44 43 L20 43 Q16 43 15 40Z" fill="#c9cac5"/><ellipse cx="32" cy="18" rx="20" ry="4.5" fill="#9fa09a" stroke="#e6e6e2" stroke-width="1.5"/>`,
  'iron-tawa': () => `<ellipse cx="28" cy="32" rx="24" ry="9" fill="#2b2a28"/><ellipse cx="28" cy="30" rx="21" ry="6.5" fill="#3d3b39"/><path d="M50 29 L63 25 L63 29 L51 33Z" fill="#6b4524"/>`,
  'copper-pot': () => `<path d="M14 17 L50 17 L47 40 Q46 43 42 43 L22 43 Q18 43 17 40Z" fill="#cc7a45"/><ellipse cx="32" cy="17" rx="18" ry="4" fill="#7a3a1c" stroke="#f3b27e" stroke-width="1.5"/>`,
  'glass-kettle': () => `<path d="M20 42 L44 42 Q48 42 47 38 L44 16 Q43 13 40 13 L24 13 Q21 13 20 16 L17 38 Q16 42 20 42Z" fill="rgba(150,190,215,.25)" stroke="#7fa7bf" stroke-width="1.6"/><path d="M45 18 Q56 18 55 28 Q54 37 46 37" stroke="#2a2827" stroke-width="3" fill="none"/><path d="M20 20 L10 15" stroke="#7fa7bf" stroke-width="2"/>`,
  'clay-handi': () => `<path d="M24 12 Q25 17 18 21 Q10 28 16 37 Q20 43 26 43 L38 43 Q44 43 48 37 Q54 28 46 21 Q39 17 40 12Z" fill="#b8613a"/><ellipse cx="32" cy="12" rx="9" ry="2.5" fill="#6e3218" stroke="#de9068"/>`,
  'nonstick-pan': () => `<ellipse cx="26" cy="31" rx="21" ry="8" fill="#232120"/><ellipse cx="26" cy="29" rx="18" ry="5.5" fill="#3a3634"/><path d="M45 28 L63 22 L63 26 L46 32Z" fill="#232120"/>`,
};
function bartanChecker() {
  const grid = $('#ut-grid');
  const preset = new Set(['steel-kadai', 'alu-cooker', 'iron-tawa', 'alu-patila']);
  grid.innerHTML = UTENSILS.map(
    (u) => `<button type="button" class="ut" data-id="${u.id}" aria-pressed="${preset.has(u.id)}"><svg viewBox="0 0 64 48" aria-hidden="true">${UT_ICON[u.id]()}</svg>${esc(u.label)}<small>${esc(u.material)}</small></button>`
  ).join('');
  const update = () => {
    const ids = $$('.ut[aria-pressed="true"]', grid).map((b) => b.dataset.id);
    const r = utensilCheck(ids);
    $('#ut-aanch').innerHTML = `${r.aanchWorks}<small>/${r.picked}</small>`;
    $('#ut-ind').innerHTML = `${r.inductionWorks}<small>/${r.picked}</small>`;
    $('#ut-ind-p').textContent = r.picked ? `work for sure. ${r.inductionMaybe} only if the base is magnetic, ${r.inductionNo} won't work at all.` : 'work for sure.';
    $('#ut-note').innerHTML = r.picked
      ? r.inductionNo
        ? `To cook these on induction you would replace ${r.inductionNo} bartan, roughly <strong>${fmtINR(r.replaceCost)}</strong> at typical online prices (our estimate). On Aanch you replace nothing.`
        : `Some of these work on induction only if they have a magnetic base. Try a fridge magnet on the bottom. On Aanch, they all work.`
      : 'Tap the bartan you own.';
  };
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.ut');
    if (!b) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
    update();
    if (hasG) gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  });
  update();
}

/* =================================================================== 4. calculator */
function calculator() {
  const f = $('#calc-form');
  const E = site.energy;
  const el = (id) => document.getElementById(id);
  const fill = (r) => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
  const read = () => {
    const kind = f.cyl.value;
    el('custom-wrap').hidden = kind !== 'custom';
    if (kind !== 'custom') el('custom-wrap').style.display = 'none';
    else el('custom-wrap').style.display = 'flex';
    const cyl = kind === 'home' ? E.lpgDomestic : kind === 'commercial' ? E.lpgCommercial : { price: +el('my-price').value || 1500, kg: +el('my-kg').value || 14.2 };
    return { cylinderPrice: cyl.price, cylinderKg: cyl.kg, daysPerCylinder: +el('days').value, tariff: +el('tariff').value, shareOnAanch: +el('share').value / 100 };
  };
  const render = () => {
    const i = read();
    const r = monthlyCost(i);
    $$('input[type=range]', f).forEach(fill);
    el('days-o').textContent = `${i.daysPerCylinder} days`;
    el('tariff-o').textContent = `₹${i.tariff.toFixed(1)}`;
    el('share-o').textContent = `${Math.round(i.shareOnAanch * 100)}%`;
    el('o-share-l').textContent = `${Math.round(i.shareOnAanch * 100)}%`;
    const vals = { gas: r.gasOnly, mix: r.mixed.total, aanch: r.aanchOnly, ind: r.inductionOnly };
    const max = Math.max(...Object.values(vals));
    for (const [k, v] of Object.entries(vals)) {
      el('o-' + k).textContent = fmtINR(v);
      el('b-' + k).style.width = ((v / max) * 100).toFixed(1) + '%';
    }
    const d1 = i.daysPerCylinder;
    el('o-cyl').textContent = i.shareOnAanch >= 1 ? `${d1} days → never runs out` : i.shareOnAanch <= 0 ? `${d1} days` : `${d1} → ${Math.round(r.cylinderLastsDays)} days`;
    el('m-units').textContent = Math.round(r.aanchUnits);
    const diff = r.aanchVsGas;
    const be = `₹${r.breakEvenTariff.toFixed(1)}`;
    const mixDiff = r.mixed.total - r.gasOnly;
    let v;
    if (diff <= -20) v = `Aanch saves you about <b>${fmtINR(-diff)} a month</b> if it does all your cooking. With ${Math.round(i.shareOnAanch * 100)}% on Aanch you save about <b>${fmtINR(-mixDiff)}</b>, and your cylinder lasts far longer.`;
    else if (diff < 20) v = `Gas and Aanch cost <b>about the same</b> for your home, within ₹20 a month. The difference is everything else: no booking, no waiting, every bartan works.`;
    else v = `Honest answer: at ₹${i.tariff.toFixed(1)} a unit, cooking everything on Aanch costs about <b>${fmtINR(diff)} more a month</b> than gas. Below <b>${be} a unit</b> Aanch is cheaper. ${i.shareOnAanch > 0 && i.shareOnAanch < 1 ? `With ${Math.round(i.shareOnAanch * 100)}% on Aanch, you pay about ${fmtINR(Math.abs(mixDiff))} ${mixDiff >= 0 ? 'extra' : 'less'} a month and book a cylinder every ${Math.round(r.cylinderLastsDays)} days instead of every ${d1}.` : ''}`;
    el('verdict').innerHTML = v;
  };
  f.addEventListener('input', render);
  f.addEventListener('change', render);
  render();
  const be = monthlyCost({ cylinderPrice: E.lpgDomestic.price, tariff: E.tariffDefault, daysPerCylinder: E.daysPerCylinderDefault }).breakEvenTariff;
  const faq = $('#faq-be');
  if (faq) faq.textContent = `₹${be.toFixed(1)}`;
}

/* =================================================================== 5. comparison table */
function comparison() {
  const E = site.energy;
  const r = monthlyCost({ cylinderPrice: E.lpgDomestic.price, tariff: E.tariffDefault, daysPerCylinder: E.daysPerCylinderDefault });
  const m = (k) => `<span class="mark ${k}">${k === 'y' ? ico.check : k === 'n' ? ico.cross : ico.maybe}</span>`;
  const rows = [
    ['Bartan that work', [m('y'), 'Any flat bottom: steel, aluminium, copper, iron, glass, clay'], [m('n'), 'Only magnetic (iron-based) bottoms'], [m('y'), 'Any']],
    ['Needs a cylinder or pipeline', [m('y'), 'No'], [m('y'), 'No'], [m('n'), 'Yes']],
    ['Wait for a refill', [m('y'), 'Never'], [m('y'), 'Never'], [m('n'), `Minimum ${site.india.bookingGapUrbanDays} days between city bookings (Mar 2026)`]],
    ['Open flame or gas leak risk', [m('y'), 'None'], [m('y'), 'None'], [m('n'), 'Yes, needs pipe and regulator checks']],
    ['Roti right on the surface', [m('y'), 'Yes, puffs on the glass'], [m('n'), 'No, needs a tawa'], [m('y'), 'Yes, on the flame']],
    [`Monthly cost, typical home<br><small class="muted">₹${E.lpgDomestic.price} cylinder lasting ${E.daysPerCylinderDefault} days, ₹${E.tariffDefault}/unit</small>`, ['', `<strong>${fmtINR(r.aanchOnly)}</strong>`], ['', `<strong>${fmtINR(r.inductionOnly)}</strong>`], ['', `<strong>${fmtINR(r.gasOnly)}</strong>`]],
    ['Heat that reaches the pot', ['', 'About 72%'], ['', 'About 85%'], ['', 'About 60%']],
    ['Works in a power cut', [m('n'), 'No'], [m('n'), 'No'], [m('y'), 'Yes']],
    ['After cooking', [m('m'), 'Glass stays hot for a few minutes'], [m('y'), 'Surface stays cooler'], [m('m'), 'Burner and pan support stay hot']],
    ['Cleaning', [m('y'), 'One flat glass, wipe when cool'], [m('y'), 'Flat glass'], [m('n'), 'Burners, pan supports, drip tray']],
    ['Runs on rooftop solar', [m('y'), 'Yes'], [m('y'), 'Yes'], [m('n'), 'No']],
    ['Extra cost to start', [m('y'), 'Nothing. Use the bartan you own.'], [m('n'), 'New magnetic cookware for many homes'], [m('m'), 'Connection, deposit, regulator']],
    ['Who stands behind it', ['', `Kitchen Tech India, Delhi stove maker for ${esc(site.brand.years)} years`], ['', 'Varies'], ['', 'Varies']],
  ];
  $('#cmp-body').innerHTML = rows.map(([h, a, b, c]) => `<tr><th scope="row">${h}</th><td class="col-aanch">${a.join('')}</td><td>${b.join('')}</td><td>${c.join('')}</td></tr>`).join('');
}

/* =================================================================== 6. India: route + national impact */
function india() {
  $('#sources').innerHTML = site.india.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.label)}</a></li>`).join('');
  const range = $('#homes');
  const LMIN = 4, LMAX = Math.log10(5e7);
  const render = () => {
    range.style.setProperty('--p', range.value + '%');
    const homes = Math.round(10 ** (LMIN + (range.value / 100) * (LMAX - LMIN)));
    const r = nationalImpact({ homes, shareOnElectric: 0.5, importShare: site.india.importShare });
    $('#homes-o').textContent = inWords(homes);
    $('#i-tonnes').textContent = inWords(r.importedTonnes);
    $('#i-cyl').textContent = inWords(r.cylinders);
    $('#i-ships').textContent = r.ships < 1 ? r.ships.toFixed(2) : r.ships < 10 ? r.ships.toFixed(1) : Math.round(r.ships).toLocaleString('en-IN');
  };
  range.addEventListener('input', render);
  render();

  if (!hasG) return;
  const line = $('[data-route-line]');
  const ship = $('[data-ship]');
  const len = line.getTotalLength();
  gsap.fromTo(line, { drawSVG: '0%' }, {
    drawSVG: '100%', ease: 'none',
    scrollTrigger: {
      trigger: '[data-route]', start: 'top 80%', end: 'bottom 35%', scrub: 0.6,
      onUpdate: (s) => {
        const p = line.getPointAtLength(s.progress * len);
        ship.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      },
    },
  });
}

/* =================================================================== 7. buy box, sticky bar, tracking */
function buy() {
  let q = 1;
  const max = P.maxQtyPerOrder || 9;
  const out = $('#qty');
  const btn = $('#buy-btn');
  const set = () => {
    out.textContent = q;
    if (P.orderable) {
      btn.href = `checkout.html?qty=${q}`;
      btn.textContent = site.payments?.online ? 'Buy now' : 'Buy now, pay on delivery';
    } else {
      btn.href = waLink(`Hi, I want to book ${q} Aanch infrared cooktop${q > 1 ? 's' : ''}. Please share the launch price.`);
      btn.target = '_blank';
      btn.className = 'btn btn-wa btn-lg';
      btn.innerHTML = `${ico.wa} Book yours on WhatsApp`;
      $('#buy-wa')?.remove();
    }
  };
  $$('[data-q]').forEach((b) => b.addEventListener('click', () => {
    q = Math.min(max, Math.max(1, q + +b.dataset.q));
    set();
  }));
  set();

  // structured data: add the offer once a real price exists
  if (P.price) {
    const ld = JSON.parse($('#ld-product').textContent);
    ld.offers = { '@type': 'Offer', priceCurrency: 'INR', price: P.price, availability: 'https://schema.org/InStock', url: 'https://kitchentechindia.com/aanch' };
    $('#ld-product').textContent = JSON.stringify(ld);
  }

  track('ViewContent', { content_name: P.fullName, content_type: 'product', currency: 'INR', value: P.price || undefined });
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-track]');
    if (t) track(t.dataset.track, { content_name: P.fullName, currency: 'INR', value: P.price || undefined });
  });

  // sticky bar: after the hero, hidden while the buy box itself is on screen
  const bar = $('#sticky-buy');
  if (hasG) {
    let pastHero = false, atBuy = false;
    const sync = () => {
      const show = pastHero && !atBuy;
      bar.classList.toggle('show', show);
      bar.setAttribute('aria-hidden', !show);
      bar.querySelector('a').tabIndex = show ? 0 : -1;
      document.body.classList.toggle('has-sticky', show);
    };
    ScrollTrigger.create({ trigger: '#why', start: 'top 60%', onToggle: (s) => { pastHero = s.isActive || s.progress > 0; sync(); }, end: 'max' });
    ScrollTrigger.create({ trigger: '#buy', start: 'top 80%', end: 'bottom 20%', onToggle: (s) => { atBuy = s.isActive; sync(); } });
  }
}

/* card tilt on desktop */
function tilt() {
  if (KT.isTouch || !hasG) return;
  $$('.ben .card').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      gsap.to(c, { rotateY: ((e.clientX - r.left) / r.width - 0.5) * 8, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 8, transformPerspective: 800, duration: 0.5 });
    });
    c.addEventListener('pointerleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1,.5)' }));
  });
}

function demoForm() {
  const form = $('#demo-form');
  wireForm(form, {
    endpoint: 'api/leads',
    onSuccess: (out) => {
      form.classList.add('done');
      $('#demo-wa').href = out.whatsapp || waLink('Hi, please send me an Aanch cooking video.');
    },
    waFallback: (d) => `Hi, I'm ${d.name || ''}. Please send me a cooking video of Aanch. My WhatsApp: ${d.phone || ''}`,
  });
}

heroFilm();
storyWords();
bartanChecker();
calculator();
comparison();
india();
buy();
tilt();
demoForm();
if (hasG) ScrollTrigger.refresh();
