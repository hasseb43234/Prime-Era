/* =====================================================
   SERVICES ORBIT
   The page pins a big circle (centre off-screen left). Scrolling
   rotates it so the next number lands on the gold dot, while each
   service slides up out of blur and its photo disc drifts past.
   ===================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const sec = $('#orb');
  if (!sec) return;
  const stick = $('.orb__stick', sec);
  const circles = $$('.orb__ring', sec);
  const dot = $('.orb__dot', sec);
  const nums = $$('.orb__num', sec);
  const items = $$('.orb__item', sec);
  const copies = items.map(i => $('.orb__copy', i));
  const medias = items.map(i => $('.orb__media', i));
  const counter = $('#oNum');
  const N = items.length;
  const STEP = 31;                       // degrees between numbers on the circle
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let vw = innerWidth, vh = innerHeight, cx = 0, cy = 0, R = 0, narrow = false;
  let target = 0, cur = 0, lastIdx = -1;

  function measure() {
    vw = innerWidth; vh = innerHeight; narrow = vw <= 800;
    if (narrow) { R = vw * 0.78; cx = -R + 20; cy = vh * 0.5; }
    else { R = Math.min(vh * 0.5, vw * 0.34); cx = -vw * 0.075; cy = vh * 0.52; }
    circles[0].setAttribute('cx', cx); circles[0].setAttribute('cy', cy); circles[0].setAttribute('r', R);
    circles[1].setAttribute('cx', cx); circles[1].setAttribute('cy', cy); circles[1].setAttribute('r', R * 1.34);
    dot.style.transform = `translate3d(${(cx + R).toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    readTarget();
  }

  function readTarget() {
    const r = sec.getBoundingClientRect();
    const span = Math.max(1, r.height - vh);
    target = clamp(-r.top / span) * (N - 1);
  }

  function render(p) {
    // numbers ride the circle
    nums.forEach((el, i) => {
      const d = i - p;
      const a = d * STEP * Math.PI / 180;
      const rr = R + (narrow ? 26 : 34);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const c = clamp(1 - Math.abs(d));
      el.style.setProperty('--c', c.toFixed(3));
      el.style.transform = `translate3d(${(x - 35).toFixed(1)}px,${(y - 24).toFixed(1)}px,0) rotate(${(d * STEP * 0.55).toFixed(1)}deg)`;
      el.style.visibility = Math.abs(d) > 4 ? 'hidden' : 'visible';
    });

    // services slide through a vertical lane
    items.forEach((_, i) => {
      const d = i - p, ad = Math.abs(d);
      const copy = copies[i], media = medias[i];
      const vis = clamp(1 - ad * 1.35);
      const lane = vh * (narrow ? 0.55 : 0.62);
      copy.style.transform = `translate3d(0,${(d * lane).toFixed(1)}px,0)`;
      copy.style.opacity = vis.toFixed(3);
      copy.style.filter = ad < 0.02 ? 'none' : `blur(${Math.min(14, ad * 18).toFixed(1)}px)`;
      const mv = clamp(1 - ad * 1.15);
      media.style.transform = `translate3d(0,${(d * vh * 0.92).toFixed(1)}px,0) rotate(${(d * 18).toFixed(1)}deg) scale(${(1 - Math.min(ad, 1) * 0.16).toFixed(3)})`;
      media.style.opacity = mv.toFixed(3);
      items[i].style.visibility = ad > 1.2 ? 'hidden' : 'visible';
    });

    const idx = Math.round(p);
    if (idx !== lastIdx && counter) { lastIdx = idx; counter.textContent = String(idx + 1).padStart(2, '0'); }
    sec.classList.toggle('is-moved', p > 0.05);
  }

  let raf = 0;
  function loop() {
    readTarget();
    cur += (target - cur) * (reduced ? 1 : 0.12);
    if (Math.abs(target - cur) < 0.0005) cur = target;
    render(cur);
    raf = requestAnimationFrame(loop);
  }

  addEventListener('resize', measure);
  measure();
  cur = target;
  render(cur);
  raf = requestAnimationFrame(loop);
})();
