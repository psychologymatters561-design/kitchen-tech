import { boot, KT } from './core.js';
import { monthlyCost } from './lib/cost-engine.js';

const $ = (s, r = document) => r.querySelector(s);
const site = await boot();
const hasG = typeof window.gsap !== 'undefined' && !KT.reduce;

/* flames around the brass burner */
const flames = $('.h-flames');
const N = 22;
flames.innerHTML = Array.from({ length: N }, (_, i) => {
  const a = (i / N) * Math.PI * 2;
  const x = 350 + Math.cos(a) * 92;
  const y = 262 + Math.sin(a) * 35;
  const s = 0.75 + (Math.sin(a) + 1) * 0.2; // nearer flames look bigger
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})"><path class="flame" d="M0 0 C -8 -10 -6 -26 0 -40 C 6 -26 8 -10 0 0Z" fill="url(#hs-flame)" opacity=".92"/></g>`;
}).join('');
// paint back flames first so front ones overlap
[...flames.children].sort((a, b) => parseFloat(a.getAttribute('transform').split(' ')[1]) - parseFloat(b.getAttribute('transform').split(' ')[1])).forEach((f) => flames.append(f));

/* numbers that come from data, not from guesses */
const r = monthlyCost({ cylinderPrice: site.energy.lpgDomestic.price, daysPerCylinder: site.energy.daysPerCylinderDefault, shareOnAanch: 0.5 });
$('#t-days').textContent = Math.round(r.cylinderLastsDays);
$('#t-base').textContent = site.energy.daysPerCylinderDefault;
fetch('assets/data/catalogue.json')
  .then((x) => x.json())
  .then((c) => {
    const n = c.items.filter((i) => i.cat === 'gas').length;
    $('#model-count').textContent = n + '';
    const names = c.items.filter((i) => i.cat === 'gas').map((i) => i.name.replace(/\s*\(.*\)$/, ''));
    const pick = [...new Set(names)].filter((n) => n.length < 16).slice(0, 26);
    const row = pick.map((n) => `<span>${n}</span><i>●</i>`).join('');
    $('#marquee').innerHTML = row + row;
  })
  .catch(() => {});

if (hasG) {
  /* the flame becomes aanch */
  const tl = gsap.timeline();
  tl.to('.flame', { scaleY: 0, opacity: 0, duration: 0.6, stagger: { each: 0.015, from: 'random' }, ease: 'power2.in' }, 0)
    .to('.h-gas', { opacity: 0, y: 24, duration: 0.6 }, 0.45)
    .fromTo('.h-ir', { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.6 }, 0.5)
    .fromTo('.h-heat', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.9)
    .fromTo('.h-rings', { stroke: '#2a2320' }, { stroke: '#ff5a1f', duration: 0.6 }, 0.9)
    .to('.h-swap .a', { opacity: 0, y: -30, duration: 0.4 }, 0.5)
    .fromTo('.h-swap .b', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, 0.75)
    .to({}, { duration: 0.3 });
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.2), pin: true, scrub: 0.7, animation: tl, anticipatePin: 1 });

  /* range: horizontal travel on desktop */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.cats-track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.cats', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  });
  ScrollTrigger.refresh();
}
