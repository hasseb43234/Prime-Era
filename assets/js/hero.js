/* =====================================================
   HERO REEL — full-bleed real footage
   Four stock clips crossfade behind the headline while the
   marketplace word in the headline rotates.
   ===================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const reel = $('#hreel');
  if (!reel) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- footage ---------- */
  const vids = $$('video', reel);
  const segs = $$('#hSegs i');
  const capEl = $('#hCap'), numEl = $('#hNum');
  const SCENES = ['Shoppers, everywhere', 'Strategy, in real time', 'Brands worth unboxing', 'Stores that convert', 'Growth in every market'];
  const LEN = 7;                 // seconds shown from each clip
  let idx = 0, visible = true;

  function show(i) {
    idx = (i + vids.length) % vids.length;
    vids.forEach((v, k) => {
      v.classList.toggle('is-active', k === idx);
      if (k !== idx) setTimeout(() => {
        if (k === idx) return;
        v.pause();
        try { if (v.currentTime > .05) v.currentTime = 0; } catch (e) { /* not ready */ }   // rewind while hidden, never on screen
      }, 1500);                                                                           // after the crossfade
    });
    const v = vids[idx];
    if (v.currentTime > LEN + .5 || v.ended) { try { v.currentTime = 0; } catch (e) { /* not ready */ } }
    if (!reduced && visible && !document.hidden) v.play().catch(() => {});
    const nxt = vids[(idx + 1) % vids.length];
    if (nxt.preload !== 'auto') nxt.preload = 'auto';
    capEl.textContent = SCENES[idx];
    numEl.textContent = `0${idx + 1} / 0${vids.length}`;
  }

  const playIdx = () => { if (!reduced && visible && !document.hidden) vids[idx].play().catch(() => {}); };

  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible) playIdx(); else vids[idx].pause();
  }, { threshold: .1 }).observe(reel);
  document.addEventListener('visibilitychange', () => { if (document.hidden) vids[idx].pause(); else playIdx(); });

  // one tick drives progress + scene changes. It runs from rAF, a timer and the
  // video's own events, so the reel keeps moving even when rAF is throttled and
  // a clip can never sit frozen on its last frame.
  function tick() {
    const v = vids[idx], t = v.currentTime || 0;
    segs.forEach((s, i) => { s.style.width = (i < idx ? 100 : i === idx ? clamp(t / LEN) * 100 : 0) + '%'; });
    if (reduced || !visible || document.hidden) return;
    if (t >= LEN || v.ended) show(idx + 1);
    else if (v.paused && v.readyState >= 2) v.play().catch(() => {});   // stalled or blocked: nudge it
  }
  (function frame() { requestAnimationFrame(frame); tick(); })();
  setInterval(tick, 250);
  vids.forEach(v => { v.addEventListener('ended', tick); v.addEventListener('timeupdate', tick); v.addEventListener('canplay', () => { if (v === vids[idx]) playIdx(); }); });
  // if the browser blocked autoplay, the first touch/click/scroll starts it
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, playIdx, { once: true, passive: true }));

  $$('#hSegs button').forEach((b, i) => b.addEventListener('click', () => show(i)));
  show(0);

  /* ---------- rotating marketplace word ---------- */
  const words = $$('#rotor b');
  if (words.length) {
    let w = 0;
    words[0].classList.add('on');
    if (!reduced) setInterval(() => {
      if (document.hidden) return;
      const cur = words[w]; w = (w + 1) % words.length; const nxt = words[w];
      cur.classList.remove('on'); cur.classList.add('off');
      nxt.classList.remove('off'); nxt.classList.add('on');
      setTimeout(() => cur.classList.remove('off'), 900);
    }, 2600);
  }
})();
