// "Ek Rasoi": one continuous first-person walk, played by scroll. Three modes, chosen per device:
//  film   PCs and tablets: the real film, fetched whole as a Blob behind an honest loading ring,
//         displayed time lerped toward the scroll target in a rAF loop that rests, one seek at a time.
//         Tablets and smaller screens get the lighter 1280 encode, big fast desktops the 1600 one.
//  story  phones (and slow connections): the same walk told with four stills cut for the screen's
//         shape, cross-fading and slowly pushing in as you scroll. About 450 KB instead of 4.5 MB.
//  static reduced motion or Save-Data: the designed settle frame with the buy buttons.
// If the film fails or times out, the walk falls back to story mode, then to static.
import { KT } from './core.js';

const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function pickMode() {
  const c = navigator.connection || {};
  const type = c.effectiveType || '';
  if (KT.reduce) return ['static', 'reduced-motion'];
  if (c.saveData) return ['static', 'save-data'];
  if (/(^|-)2g$/.test(type)) return ['static', 'slow-connection'];
  if (matchMedia('(max-width: 767px), (max-height: 520px) and (orientation: landscape)').matches) return ['story', 'phone'];
  if (type === '3g') return ['story', 'slow-connection'];
  return ['film', ''];
}

export async function initFilm(media) {
  const sec = document.querySelector('#film');
  if (!sec || !window.gsap || !window.ScrollTrigger) return sec?.classList.add('is-static');
  const stage = sec.querySelector('.film-stage');
  const video = sec.querySelector('.film-video');
  const loader = sec.querySelector('.film-loader');
  const ring = loader?.querySelector('.ring-fg');
  const pctEl = loader?.querySelector('b');
  const caps = [...sec.querySelectorAll('[data-in]')];
  const cue = sec.querySelector('.film-cue');

  let [mode, why] = pickMode();
  let target = 0;
  let lastP = -1;
  let layers = [];
  let trigger = null;

  const setMode = (m, reason) => {
    mode = m;
    sec.classList.remove('is-film', 'is-loading', 'is-story', 'is-static');
    sec.classList.add('is-' + m);
    sec.dataset.mode = m;
    sec.dataset.gate = reason || '';
  };

  /* ---- captions (and story layers) follow scroll progress; DOM written only on change ---- */
  const paint = (p, force) => {
    if (!force && Math.abs(p - lastP) < 0.0005) return;
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
    if (mode === 'story') {
      // layer i fades in over its predecessor, then keeps pushing in slowly: a walk, not a slideshow
      layers.forEach((img, i) => {
        const start = i * 0.25;
        const o = i === 0 ? 1 : smooth(start - 0.04, start + 0.04, p);
        const z = 1 + 0.09 * Math.min(1, Math.max(0, (p - start + 0.04) / 0.34));
        const ov = o.toFixed(3), zv = z.toFixed(4);
        if (img._o !== ov) { img._o = ov; img.style.opacity = ov; }
        if (img._z !== zv) { img._z = zv; img.style.transform = `scale(${zv})`; }
      });
    }
    if (cue) cue.style.opacity = (1 - smooth(0, 0.04, p)).toFixed(3);
    sec.style.setProperty('--p', p.toFixed(4));
  };

  const pin = (screens) => {
    trigger?.kill();
    trigger = ScrollTrigger.create({
      trigger: sec,
      start: 'top top',
      end: () => '+=' + Math.round(innerHeight * screens),
      pin: stage,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (s) => {
        target = s.progress;
        paint(target);
        wake();
      },
    });
    paint(0, true);
    ScrollTrigger.refresh();
  };

  /* ---- static: the settle frame and its buttons ---- */
  const goStatic = (reason) => {
    trigger?.kill();
    trigger = null;
    setMode('static', reason);
    caps.forEach((c) => {
      c.style.opacity = '';
      c.style.transform = '';
      c.style.visibility = '';
    });
  };

  /* ---- story: four stills cut for this screen's shape ---- */
  const goStory = (reason) => {
    const portrait = innerHeight > innerWidth;
    const list = (portrait ? media.story?.portrait : media.story?.landscape) || [];
    if (list.length < 4) return goStatic(reason || 'no-stills');
    setMode('story', reason);
    const box = document.createElement('div');
    box.className = 'film-story';
    box.setAttribute('aria-hidden', 'true');
    layers = list.map((src, i) => {
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      if (i === 0) img.fetchPriority = 'high';
      else img.loading = 'eager';
      img.src = src;
      img.addEventListener('error', () => goStatic('story-failed'), { once: true });
      box.append(img);
      return img;
    });
    stage.prepend(box);
    pin(media.storyScreens || 3.4);
  };

  if (mode === 'static') return goStatic(why);
  if (mode === 'story') return goStory(why);

  /* ---- film ---- */
  setMode('film', '');
  sec.classList.add('is-loading');
  let duration = media.film?.seconds || 17.4;
  let shown = 0;
  let seeking = false;
  let running = false;
  let visible = true;

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
    if (mode === 'film' && !running && visible && sec.classList.contains('is-ready')) {
      running = true;
      requestAnimationFrame(tick);
    }
  }
  pin(media.scrollScreens || 5);

  const big = innerWidth >= 1400 && !matchMedia('(hover: none)').matches && (navigator.connection?.downlink ?? 10) >= 5;
  const url = big ? media.film.full : media.film.light || media.film.full;
  const setPct = (f) => {
    const v = Math.round(f * 100);
    if (pctEl && pctEl._v !== v) {
      pctEl._v = v;
      pctEl.textContent = v + '%';
      if (ring) ring.style.strokeDashoffset = (1 - f).toFixed(3);
    }
  };
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    goStory('timeout');
  }, 30000);
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
    if (timedOut) return;
    video.src = src;
    video.load();
    await new Promise((ok, bad) => {
      video.addEventListener('loadeddata', ok, { once: true });
      video.addEventListener('error', () => bad(new Error('video error')), { once: true });
    });
    // iPad / iPhone Safari only paints sought frames after one play: prime it silently
    try {
      await video.play();
      video.pause();
    } catch {}
  } catch {
    clearTimeout(timeout);
    if (!timedOut) goStory('load-failed');
    return;
  }
  clearTimeout(timeout);
  if (timedOut || mode !== 'film') return;
  setPct(1);
  sec.classList.remove('is-loading');
  sec.classList.add('is-ready');
  duration = Math.max(0.1, (video.duration || duration) - 0.06);
  video.addEventListener('seeked', () => (seeking = false));
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) wake();
  }).observe(sec);
  wake();
}
