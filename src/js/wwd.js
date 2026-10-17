/* =====================================================
   WHAT WE DO — page interactions
   1) Hero photo card that grows as you scroll
   2) Photo strip that travels sideways with the scroll
   3) Service rows reveal a photo that follows the cursor
   ===================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- 1. expanding hero card ---------- */
  const sec = $('#xhero'), card = $('#xcard');
  const imgs = card ? $$('.xhero__img', card) : [];
  const dots = $$('.xhero__dots i');
  const num = $('#xnum'), lab = $('#xlabel');
  const head = $('.xhero__head'), meta = $('.xhero__meta');
  let cur = -1;

  function updateHero() {
    if (!sec || !card) return;
    const r = sec.getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
    const p = clamp(-r.top / (r.height - vh));
    const gut = clamp(vw * .032, 20, 48), narrow = vw < 700;
    const w0 = narrow ? vw * .62 : clamp(vw * .27, 260, 420), w1 = vw - gut * 2;
    const t0 = vh * (narrow ? .6 : .58), t1 = narrow ? 76 : 92;
    const h0 = vh * .62, h1 = vh - t1 - 20;
    const e = ease(clamp(p / .6));
    card.style.width = lerp(w0, w1, e).toFixed(1) + 'px';
    card.style.height = lerp(h0, h1, e).toFixed(1) + 'px';
    card.style.top = lerp(t0, t1, e).toFixed(1) + 'px';
    card.style.borderRadius = lerp(26, 12, e).toFixed(1) + 'px';
    if (head) { head.style.opacity = (1 - clamp(p / .26)).toFixed(3); head.style.transform = `translate3d(0,${(-p * 110).toFixed(1)}px,0)`; }
    if (meta) meta.style.opacity = (1 - clamp(p / .12)).toFixed(3);

    const idx = Math.min(imgs.length - 1, Math.floor(clamp((p - .1) / .9) * imgs.length));
    if (idx !== cur) {
      cur = idx;
      imgs.forEach((im, i) => im.classList.toggle('is-active', i === idx));
      dots.forEach((d, i) => d.classList.toggle('on', i <= idx));
      if (num) num.textContent = '0' + (idx + 1);
      if (lab) lab.textContent = imgs[idx].dataset.label;
    }
    if (imgs[idx]) imgs[idx].style.setProperty('--s', (1.16 - .12 * p).toFixed(3));
  }

  /* ---------- 2. photo strip travels with scroll ---------- */
  const strip = $('#strip'), track = $('#stripTrack');
  function updateStrip() {
    if (!strip || !track) return;
    const r = strip.getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
    const prog = clamp((vh - r.top) / (vh + r.height));
    const gut = clamp(vw * .032, 20, 48);
    const max = Math.max(0, track.scrollWidth - vw + gut * 2);
    track.style.transform = `translate3d(${(gut - prog * max).toFixed(1)}px,0,0)`;
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { updateHero(); updateStrip(); ticking = false; });
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  addEventListener('load', onScroll);
  updateHero(); updateStrip();

  /* ---------- 3. photo that follows the cursor over a service row ---------- */
  const peek = $('#peek');
  if (peek && fine) {
    const pimg = $('img', peek);
    const rows = $$('.wrow[data-peek]');
    const cache = {};
    const warm = () => rows.forEach(r => { const u = r.dataset.peek; if (!cache[u]) { cache[u] = new Image(); cache[u].src = u; } });
    ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(warm);
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    const W = () => peek.offsetWidth, H = () => peek.offsetHeight;
    (function loop() {
      x += (tx - x) * .14; y += (ty - y) * .14;
      peek.style.transform = `translate3d(${(x - W() / 2).toFixed(1)}px,${(y - H() / 2).toFixed(1)}px,0)`;
      requestAnimationFrame(loop);
    })();
    rows.forEach(row => {
      row.addEventListener('pointerenter', e => {
        pimg.src = row.dataset.peek; tx = x = e.clientX + 40; ty = y = e.clientY;
        peek.classList.add('on'); on = true;
      });
      row.addEventListener('pointermove', e => { tx = e.clientX + W() * .62; ty = e.clientY; });
      row.addEventListener('pointerleave', () => { peek.classList.remove('on'); on = false; });
    });
    addEventListener('scroll', () => { if (on) peek.classList.remove('on'); }, { passive: true });
  }
})();
