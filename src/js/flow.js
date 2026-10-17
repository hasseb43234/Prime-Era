/* =====================================================
   FLOW — how pages open and how they scroll
   1. Page curtain: five panels sweep over the page on every
      navigation and lift off the next one, with the page title.
   2. Glide scroll: wheel scrolling eases (inertia) instead of
      jumping, and in-page links glide to their section.
   Both switch off for reduced-motion; glide is mouse-only,
   touch keeps native momentum.
   ===================================================== */
(() => {
  'use strict';
  const root = document.documentElement, body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- 1. Page curtain ---------- */
  const TITLES = {
    'index.html': 'Prime Era', '': 'Prime Era',
    'what-we-do.html': 'What we do', 'services.html': 'Our services',
    'book-a-call.html': 'Talk to us', 'booking.html': 'Book your call'
  };
  const titleFor = path => TITLES[path.split('/').pop()] || 'Prime Era';

  let curtain = null;
  function build(title) {
    if (curtain) curtain.remove();
    curtain = document.createElement('div');
    curtain.className = 'curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = '<div class="curtain__cols">' + [0, 1, 2, 3, 4].map(i => `<i class="curtain__col" style="--i:${i}"></i>`).join('') + '</div>' +
      '<div class="curtain__title"><svg class="curtain__mark"><use href="#pe-mark"/></svg><span class="curtain__kick mono">Prime Era</span><b></b><u></u></div>';
    curtain.querySelector('b').textContent = title;
    body.append(curtain);
    return curtain;
  }

  // arrival: the page loads behind a held curtain (html.pt-in paints black meanwhile), then the panels lift
  if (root.classList.contains('pt-in')) {
    const c = build(titleFor(location.pathname));
    c.classList.add('on', 'held');
    root.classList.remove('pt-in');
    let lifted = false;
    const lift = () => {
      if (lifted) return; lifted = true;
      c.classList.remove('held'); void c.offsetWidth; c.classList.add('reveal');
      dispatchEvent(new Event('pe-reveal'));
      setTimeout(() => { c.classList.remove('on'); c.remove(); if (curtain === c) curtain = null; }, 1700);
    };
    const ready = new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    const minShow = new Promise(r => setTimeout(r, 750));
    Promise.all([Promise.race([ready, new Promise(r => setTimeout(r, 2200))]), fonts, minShow]).then(lift);
    setTimeout(lift, 3200);            // never leave a visitor staring at the curtain
  }

  // departure: panels rise, then the browser navigates
  let leaving = false;
  function leave(url) {
    if (leaving) return; leaving = true;
    const c = build(titleFor(url.pathname));
    c.classList.add('on');
    void c.offsetWidth; c.classList.add('cover');
    try { sessionStorage.setItem('pe-pt', '1'); } catch (e) { /* private mode */ }
    setTimeout(() => (location.href = url.href), 780);
    setTimeout(() => { if (leaving && document.visibilityState === 'visible') unleave(); }, 5000);
  }
  function unleave() { leaving = false; if (curtain) { curtain.remove(); curtain = null; } }
  addEventListener('pageshow', e => { if (e.persisted) unleave(); });   // back/forward cache

  if (!reduced) document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    let url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;          // in-page anchor: handled by glide / native
    if (url.pathname === location.pathname && !url.search && !url.hash) return;
    e.preventDefault();
    leave(url);
  });

  /* ---------- 2. Glide scroll ---------- */
  if (reduced || !fine) return;
  let target = scrollY, cur = scrollY, running = false, last = 0, timer = 0, rafId = 0;
  const maxY = () => Math.max(0, root.scrollHeight - innerHeight);
  const TAU = 130;                                                         // ms — higher = longer glide

  function step() {
    const now = performance.now(), dt = Math.min(64, now - (last || now)); last = now;
    cur += (target - cur) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - cur) < .4) { cur = target; running = false; }
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, cur);
    if (!running) { last = 0; clearInterval(timer); cancelAnimationFrame(rafId); root.style.scrollBehavior = ''; }
  }
  function kick() {
    if (running) return;
    running = true; last = performance.now();
    const loop = () => { if (!running) return; step(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    timer = setInterval(() => { if (running && performance.now() - last > 40) step(); }, 34);   // keeps gliding if rAF is throttled
  }
  const glideTo = y => { if (!running) cur = target = scrollY; target = clamp(y, 0, maxY()); kick(); };

  const inScrollable = el => {
    for (; el && el.nodeType === 1 && el !== body && el !== root; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  };

  addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented || e.deltaX && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (body.classList.contains('menu-open') || body.classList.contains('is-loading') || curtain) return;
    if (inScrollable(e.target)) return;
    e.preventDefault();
    if (!running) cur = target = scrollY;
    let d = e.deltaY; if (e.deltaMode === 1) d *= 34; else if (e.deltaMode === 2) d *= innerHeight;
    target = clamp(target + d, 0, maxY());
    kick();
  }, { passive: false });

  // scrollbar drag, keyboard, find-in-page: follow whatever the browser did
  addEventListener('scroll', () => { if (!running) cur = target = scrollY; }, { passive: true });

  // in-page links glide to their section
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    let url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    if (url.hash === '#' || url.hash === '#top') { e.preventDefault(); glideTo(0); return; }
    let t = null; try { t = document.querySelector(url.hash); } catch (err) { return; }
    if (!t) return;
    e.preventDefault();
    history.replaceState(null, '', url.hash);
    glideTo(t.getBoundingClientRect().top + scrollY);
  });
})();
