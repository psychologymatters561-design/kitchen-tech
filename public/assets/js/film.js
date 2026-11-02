// "Ek Rasoi" scroll film: one continuous first-person walk, scrubbed by scroll.
// Engineering rules (10K websites standard):
//  - the film is fetched whole as a Blob behind an honest loading ring, so seeks never wait on the network
//  - displayed time is lerped toward the scroll target in a rAF loop that rests when there is nothing to do
//  - one seek at a time (gated on 'seeked'), DOM written only when a value changes
//  - five gates serve the designed still instead: reduced motion, small/touch screens, Save-Data,
//    slow connection, and any load failure or timeout. The page is complete without the film.
import { KT } from './core.js';

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function gateReason() {
  const c = navigator.connection || {};
  if (KT.reduce) return 'reduced-motion';
  if (matchMedia('(max-width: 860px), (hover: none)').matches) return 'small-screen';
  if (c.saveData) return 'save-data';
  if (/(^|-)(2g|3g)$/.test(c.effectiveType || '')) return 'slow-connection';
  return null;
}

export async function initFilm(media) {
  const sec = document.querySelector('#film');
  if (!sec) return;
  const stage = sec.querySelector('.film-stage');
  const video = sec.querySelector('.film-video');
  const loader = sec.querySelector('.film-loader');
  const ring = loader?.querySelector('.ring-fg');
  const pctEl = loader?.querySelector('b');
  const caps = [...sec.querySelectorAll('[data-in]')];
  const settle = sec.querySelector('.film-settle');
  const cue = sec.querySelector('.film-cue');

  const goStatic = (why) => {
    sec.classList.remove('is-film', 'is-loading');
    sec.classList.add('is-static');
    sec.dataset.gate = why;
    caps.forEach((c) => (c.style.opacity = ''));
  };

  const why = gateReason();
  if (why || !window.gsap || !media?.film) return goStatic(why || 'no-film');

  sec.classList.add('is-film', 'is-loading');

  // playback state, declared before anything can call wake()
  let target = 0;
  let lastP = -1;
  let duration = media.film.seconds || 17.4;
  let shown = 0;
  let seeking = false;
  let running = false;
  let visible = true;

  /* ---- scroll -> progress (pin the stage for the length of the walk) ---- */
  const paint = (p) => {
    if (Math.abs(p - lastP) < 0.0005) return;
    lastP = p;
    for (const c of caps) {
      const a = +c.dataset.in, b = +c.dataset.out;
      const o = b >= 1 ? smooth(a, a + 0.035, p) : Math.min(smooth(a, a + 0.035, p), 1 - smooth(b - 0.035, b, p));
      const v = o.toFixed(3);
      if (c._o !== v) {
        c._o = v;
        c.style.opacity = v;
        c.style.transform = `translate3d(0, ${((1 - o) * 18).toFixed(1)}px, 0)`;
        c.style.visibility = o > 0.001 ? 'visible' : 'hidden';
      }
    }
    if (cue) cue.style.opacity = (1 - smooth(0, 0.04, p)).toFixed(3);
    sec.style.setProperty('--p', p.toFixed(4));
  };
  ScrollTrigger.create({
    trigger: sec,
    start: 'top top',
    end: () => '+=' + Math.round(innerHeight * (media.scrollScreens || 5)),
    pin: stage,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (s) => {
      target = s.progress;
      paint(target);
      wake();
    },
  });
  paint(0);

  /* ---- load the film whole, with an honest ring ---- */
  const fast = (navigator.connection?.downlink ?? 10) >= 5 && innerWidth >= 1400;
  const url = fast ? media.film.full : media.film.light || media.film.full;
  const setPct = (f) => {
    const v = Math.round(f * 100);
    if (pctEl && pctEl._v !== v) {
      pctEl._v = v;
      pctEl.textContent = v + '%';
      if (ring) ring.style.strokeDashoffset = (1 - f).toFixed(3);
    }
  };
  const timeout = setTimeout(() => goStatic('timeout'), 30000);
  try {
    let src;
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const total = +res.headers.get('content-length') || media.film.bytes || 0;
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total) setPct(Math.min(0.99, got / total));
      }
      src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    } catch {
      src = url; // host without CORS: stream it instead, seeks still work once buffered
    }
    video.src = src;
    video.load();
    await new Promise((ok, bad) => {
      video.addEventListener('loadeddata', ok, { once: true });
      video.addEventListener('error', () => bad(new Error('video error')), { once: true });
    });
  } catch (e) {
    clearTimeout(timeout);
    return goStatic('load-failed');
  }
  clearTimeout(timeout);
  if (sec.classList.contains('is-static')) return; // timed out meanwhile
  setPct(1);
  sec.classList.remove('is-loading');
  sec.classList.add('is-ready');

  /* ---- lerp loop that rests ---- */
  duration = Math.max(0.1, (video.duration || duration) - 0.06);
  video.addEventListener('seeked', () => (seeking = false));
  const tick = () => {
    const goal = target * duration;
    shown += (goal - shown) * 0.14;
    if (Math.abs(goal - shown) < 0.004) shown = goal;
    if (!seeking && Math.abs(video.currentTime - shown) > 0.012) {
      seeking = true;
      video.currentTime = shown;
    }
    if (shown === goal && !seeking) {
      running = false; // rest until the next scroll
      return;
    }
    requestAnimationFrame(tick);
  };
  function wake() {
    if (!running && visible && sec.classList.contains('is-ready')) {
      running = true;
      requestAnimationFrame(tick);
    }
  }
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) wake();
  }).observe(sec);
  wake();
  if (settle) settle.querySelector('a')?.setAttribute('tabindex', '0');
}
