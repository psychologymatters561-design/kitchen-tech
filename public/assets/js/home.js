import { boot, KT, loadCatalogue } from './core.js';
import { monthlyCost } from './lib/cost-engine.js';
import { initFilm } from './film.js';

const $ = (s, r = document) => r.querySelector(s);
const site = await boot();
const hasG = typeof window.gsap !== 'undefined' && !KT.reduce;

/* the walk: one continuous first-person film, scrubbed by scroll */
const f = $('#film');
const testFilm = (new URLSearchParams(location.search).get('film') || '').replace(/^.*:.*$/, ''); // ?film=local/path stands in for testing (relative paths only)
initFilm({
  film: f ? { full: testFilm || f.dataset.full, light: testFilm || f.dataset.light, bytes: testFilm ? 0 : +f.dataset.bytes || 0, seconds: +f.dataset.seconds || 17.46 } : null,
  scrollScreens: 5,
});

/* numbers that come from data, not from guesses */
const r = monthlyCost({ cylinderPrice: site.energy.lpgDomestic.price, daysPerCylinder: site.energy.daysPerCylinderDefault, shareOnAanch: 0.5 });
$('#t-days').textContent = Math.round(r.cylinderLastsDays);
$('#t-base').textContent = site.energy.daysPerCylinderDefault;
loadCatalogue()
  .then((c) => {
    const gas = c.items.filter((i) => i.cat === 'gas');
    $('#model-count').textContent = gas.length + '';
    const names = gas.map((i) => i.name.replace(/\s*\(.*\)$/, ''));
    const pick = [...new Set(names)].filter((n) => n.length < 16).slice(0, 26);
    const row = pick.map((n) => `<span>${n}</span><i>●</i>`).join('');
    $('#marquee').innerHTML = row + row;
  })
  .catch(() => {});

if (hasG) {
  /* world stills drift against the scroll, so each section has depth */
  document.querySelectorAll('.world-img img').forEach((img) => {
    gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* range: horizontal travel on desktop */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const track = $('.cats-track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.cats', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  });
  ScrollTrigger.refresh();
}
