/* =====================================================
   SHOWREEL — a real-footage player
   Five stock clips play in sequence with crossfades.
   ===================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  const player = $('#player');
  if (!player) return;

  const vids = $$('.player__stage video', player);
  const segs = $$('#reelSegs button');
  const cap = { n: $('#capNum'), t: $('#capTitle'), d: $('#capText') };
  const timeEl = $('#reelTime'), btn = $('#reelBtn');
  const icPause = $('#icPause'), icPlay = $('#icPlay');

  const SCENES = [
    { t: 'Pack', d: 'Orders prepped, packed and shipped on time, every time.' },
    { t: 'Reach', d: 'Outbound calls and email that reach the people who can buy.' },
    { t: 'Ship', d: 'Global logistics behind every marketplace we run.' },
    { t: 'Move', d: 'Goods in motion, day and night, across every market.' },
    { t: 'Scale', d: 'From one port to every market, one partner all the way.' }
  ];
  const LEN = 6.5;                     // seconds shown from each clip
  let idx = 0, playing = true, visible = false, started = false;

  const pad = n => String(n).padStart(2, '0');

  function setCaption(i) {
    cap.n.textContent = pad(i + 1);
    cap.t.textContent = SCENES[i].t;
    cap.d.textContent = SCENES[i].d;
    timeEl.textContent = `Scene ${i + 1} / ${SCENES.length}`;
    player.classList.remove('cap-in'); void player.offsetWidth; player.classList.add('cap-in');
  }

  function show(i) {
    idx = (i + vids.length) % vids.length;
    vids.forEach((v, k) => {
      v.classList.toggle('is-active', k === idx);
      if (k !== idx) setTimeout(() => { if (k !== idx) v.pause(); }, 900);   // let the crossfade finish
    });
    const v = vids[idx];
    try { v.currentTime = 0; } catch (e) { /* not seekable yet */ }
    if (playing && visible) v.play().catch(() => {});
    // warm the next clip
    const nxt = vids[(idx + 1) % vids.length]; if (nxt.preload !== 'auto') nxt.preload = 'auto';
    setCaption(idx);
  }

  function setPlaying(p) {
    playing = p;
    icPause.style.display = p ? '' : 'none';
    icPlay.style.display = p ? 'none' : '';
    btn.setAttribute('aria-label', p ? 'Pause showreel' : 'Play showreel');
    player.dataset.cursor = p ? 'Pause' : 'Play';
    player.classList.toggle('is-paused', !p);
    const v = vids[idx];
    if (p && visible) v.play().catch(() => {}); else v.pause();
  }

  const toggle = () => setPlaying(!playing);
  player.addEventListener('click', e => { if (e.target.closest('.player__segs')) return; toggle(); });
  player.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
  segs.forEach((b, i) => b.addEventListener('click', () => { if (!playing) setPlaying(true); show(i); }));

  new IntersectionObserver(es => {
    visible = es[0].isIntersecting;
    if (visible) { if (!started) { started = true; show(0); } else if (playing) vids[idx].play().catch(() => {}); }
    else vids[idx].pause();
  }, { threshold: .25 }).observe(player);

  // driven by rAF, a timer and video events so a throttled tab never leaves a clip frozen
  function tick() {
    const v = vids[idx];
    const t = v.currentTime || 0;
    segs.forEach((b, i) => { $('i', b).style.width = (i < idx ? 100 : i === idx ? clamp(t / LEN) * 100 : 0) + '%'; });
    if (playing && visible && (t >= LEN || v.ended)) show(idx + 1);
  }
  (function frame() { requestAnimationFrame(frame); tick(); })();
  setInterval(tick, 250);
  vids.forEach(v => { v.addEventListener('ended', tick); v.addEventListener('timeupdate', tick); });

  setCaption(0);
  setPlaying(true);
})();
