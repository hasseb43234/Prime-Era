/* =====================================================
   PRIME ERA — interactions
   ===================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const body = document.body;

  /* ---------- Deep links (#section) ---------- */
  function jumpToHash() {
    if (!location.hash || location.hash.length < 2) return;
    let t = null; try { t = document.querySelector(location.hash); } catch (e) { return; }
    if (!t) return;
    const root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto'; t.scrollIntoView(); root.style.scrollBehavior = prev;
  }

  /* ---------- Preloader ---------- */
  const pre = $('#preloader'), preBar = $('#preBar'), preNum = $('#preNum');
  let prog = 0, fontsReady = false, finished = false;
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => (fontsReady = true));
  const t0 = performance.now();
  // arriving through the page curtain (flow.js): skip the preloader and start the page animations when the curtain lifts
  const viaCurtain = document.documentElement.classList.contains('pt-in');
  if (pre && viaCurtain) pre.style.display = 'none';
  if (!pre || viaCurtain) {
    finished = true;
    const go = () => { body.classList.remove('is-loading'); body.classList.add('loaded'); document.documentElement.classList.add('loaded'); setTimeout(jumpToHash, 50); };
    if (viaCurtain) { let done = false; const once = () => { if (!done) { done = true; go(); } }; addEventListener('pe-reveal', once); setTimeout(once, 3500); }
    else { body.classList.remove('is-loading'); body.classList.add('loaded'); document.documentElement.classList.add('loaded'); addEventListener('load', () => setTimeout(jumpToHash, 50)); }
  }
  if (pre && !viaCurtain) setTimeout(finish, 3500); // safety net if animation frames are throttled
  if (pre && !viaCurtain) (function tick(now) {
    const target = fontsReady ? 100 : 88;
    const timeP = clamp((now - t0) / 1400) * 100;
    prog += (Math.min(target, timeP) - prog) * 0.12;
    const v = Math.round(prog);
    preBar.style.width = prog + '%';
    preNum.textContent = v;
    if (prog > 99.2 || (now - t0) > 3000) return finish();
    requestAnimationFrame(tick);
  })(t0);
  function finish() {
    if (finished) return; finished = true;
    preBar.style.width = '100%'; preNum.textContent = '100';
    setTimeout(() => {
      pre.classList.add('is-done');
      body.classList.remove('is-loading');
      document.documentElement.classList.add('loaded');
      body.classList.add('loaded');
      jumpToHash();
      setTimeout(() => (pre.style.display = 'none'), 1300);
    }, 250);
  }

  /* ---------- Clocks ---------- */
  const fmt = (tz, opts = {}) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz, ...opts }).format(new Date());
  const hdr = $('#hdrClock span');
  const cities = [['Dubai · RAK', 'Asia/Dubai'], ['London', 'Europe/London'], ['New York', 'America/New_York'], ['Sydney', 'Australia/Sydney']];
  const clocksEl = $('#clocks');
  clocksEl.innerHTML = cities.map(([n, tz]) => `<div>${n}<b data-tz="${tz}">--:--</b></div>`).join('');
  const updClocks = () => {
    hdr.textContent = 'Local ' + new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    $$('[data-tz]').forEach(b => (b.textContent = fmt(b.dataset.tz)));
  };
  updClocks(); setInterval(updClocks, 15000);
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- Menu ---------- */
  $$('.menu a').forEach(a => { if (a.getAttribute('href') === location.pathname.split('/').pop() && a.getAttribute('href')) a.setAttribute('aria-current', 'page'); });
  const menuBtn = $('#menuBtn'), menuTxt = $('#menuTxt');
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuTxt.textContent = open ? 'Close' : 'Menu';
    onScroll();
  };
  menuBtn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));
  $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Header hide + progress ---------- */
  const header = $('#header'), progress = $('#progress');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (y / h * 100) + '%';
    header.classList.toggle('is-hidden', y > lastY && y > 400 && !body.classList.contains('menu-open'));
    lastY = y;
    header.classList.toggle('is-scrolled', y > 80);
    const under = document.elementsFromPoint(innerWidth / 2, 34).find(el => !header.contains(el));
    header.classList.toggle('on-light', !!(under && under.closest('.section--accent')) && !body.classList.contains('menu-open'));
    updateSplit();
  };

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (el.matches('.stat,.why__item,.faq__list details') ? (i % 4) * 80 : 0) + 'ms';
    io.observe(el);
  });

  /* ---------- Word-by-word statement ---------- */
  const splitEl = $('[data-split]');
  const words = [];
  if (splitEl) (function wrap(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t.trim()) return frag.append(t);
          const s = document.createElement('span'); s.className = 'w'; s.textContent = t;
          frag.append(s); words.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
  })(splitEl);
  function updateSplit() {
    if (!splitEl) return;
    const r = splitEl.getBoundingClientRect();
    const p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .25));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || '', d = 1600, s = performance.now();
    (function step(now) {
      const p = clamp((now - s) / d), v = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * v) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(s);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Services accordion ---------- */
  $$('.svc__item').forEach(item => {
    const btn = $('.svc__head', item);
    btn.addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      $$('.svc__item').forEach(i => { i.classList.remove('is-open'); $('.svc__head', i).setAttribute('aria-expanded', false); });
      if (!open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', true); }
    });
  });

  /* ---------- Platform card glow ---------- */
  $$('.pcard').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));

  /* ---------- Model tabs ---------- */
  const tabs = $$('.tab'), ink = $('.tabs__ink');
  const moveInk = t => { ink.style.left = t.offsetLeft + 'px'; ink.style.width = t.offsetWidth + 'px'; };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.remove('is-active'); x.setAttribute('aria-selected', false); });
    t.classList.add('is-active'); t.setAttribute('aria-selected', true); moveInk(t);
    $$('.model').forEach(m => m.classList.remove('is-active'));
    $('#m-' + t.dataset.tab).classList.add('is-active');
  }));
  const placeInk = () => { const t = $('.tab.is-active'); if (t && ink) moveInk(t); };
  addEventListener('resize', placeInk);
  document.fonts && document.fonts.ready.then(placeInk);
  placeInk();

  /* ---------- Magnetic buttons ---------- */
  if (fine && !reduced) $$('[data-magnetic]').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });

  /* ---------- Custom cursor ---------- */
  const cur = $('#cursor');
  if (fine) {
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; });
    (function loop() { x += (tx - x) * .18; y += (ty - y) * .18; cur.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(loop); })();
    let dragging = false;
    const lbl = $('span', cur);
    addEventListener('pointerover', e => {
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (t && !dragging) { lbl.textContent = t.dataset.cursor; cur.classList.add('is-on'); } else cur.classList.remove('is-on');
    });
    addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('#globe')) { dragging = true; cur.classList.remove('is-on'); } });
    addEventListener('pointerup', () => { dragging = false; });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
  }

  /* ---------- Live outreach panel ---------- */
  const feed = $('#feed'), kD = $('#kDials'), kC = $('#kConv'), kM = $('#kMeet');
  const events = [
    ['#4ade80', 'Call connected — decision maker reached'],
    ['#d4af37', 'Email reply — "Send over details"'],
    ['#4ade80', 'Meeting booked — Thursday 3:00 PM'],
    ['#f5f5f5', 'LinkedIn connection accepted'],
    ['#d4af37', 'Voicemail left — follow-up queued'],
    ['#4ade80', 'Qualified lead passed to your CRM'],
    ['#f5f5f5', 'Call back requested — Monday 10:30 AM'],
    ['#4ade80', 'Meeting booked — Friday 11:15 AM']
  ];
  let dials = 118, conv = 24, meet = 5, ei = 0, liveTimer = null;
  const paint = () => { if (!kD) return; kD.textContent = dials; kC.textContent = conv; kM.textContent = meet; };
  const push = () => {
    const [c, t] = events[ei++ % events.length];
    const li = document.createElement('li');
    li.innerHTML = `<i style="background:${c}"></i>${t}<span>${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>`;
    feed.append(li);
    while (feed.children.length > 4) feed.firstChild.remove();
    dials += 1 + Math.floor(Math.random() * 4);
    if (/connected|reply|accepted|Call back/.test(t)) conv++;
    if (/booked/.test(t)) meet++;
    paint();
  };
  paint();
  const lio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) {
      if (!liveTimer) { for (let i = 0; i < 3; i++) push(); liveTimer = setInterval(push, 2300); }
      $$('.funnel div').forEach((d, i) => setTimeout(() => (d.style.width = d.dataset.w), i * 140));
    } else { clearInterval(liveTimer); liveTimer = null; }
  }), { threshold: .3 });
  $$('.funnel div').forEach(d => { d.dataset.w = getComputedStyle(d).getPropertyValue('--w').trim(); d.style.width = '0%'; });
  if ($('.growth__panel')) lio.observe($('.growth__panel'));

  /* ---------- Contact form ---------- */
  const form = $('#leadForm'), note = $('#formNote');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fName'), mail = $('#fMail');
    let ok = true;
    [name, mail].forEach(f => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.parentElement.classList.toggle('err', bad); if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please add your name and a valid email.'; return; }
    const interests = $$('.chips input:checked').map(i => i.value).join(', ') || 'Not specified';
    const subject = encodeURIComponent('New enquiry from ' + name.value.trim());
    const text = encodeURIComponent(`Name: ${name.value.trim()}\nEmail: ${mail.value.trim()}\nCompany: ${$('#fCo').value.trim() || '-'}\nInterested in: ${interests}\n\n${$('#fMsg').value.trim()}`);
    note.textContent = 'Thanks! Opening your email app to send this to our team…';
    location.href = `mailto:info@primeera.us?subject=${subject}&body=${text}`;
  });

  /* ---------- Globe ---------- */
  const cv = $('#globe');
  if (cv) (() => {
  const ctx = cv.getContext('2d');
  let W, H, DPR, R, CX, CY;
  const resize = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.min(H * .44, W * .37);
    CX = W * .5;
    CY = H * .5;
  };
  addEventListener('resize', resize); resize();

  // land mask (assets/js/landmask.js): 360x180 bitmap, 1 bit per degree
  const MASK = (() => { try { const b = atob(window.PE_LAND || ''); return Uint8Array.from(b, c => c.charCodeAt(0)); } catch (e) { return null; } })();
  const isLand = (lat, lon) => {
    if (!MASK || MASK.length < 8100) return false;
    const i = Math.min(359, Math.max(0, Math.floor(lon + 180))), j = Math.min(179, Math.max(0, Math.floor(90 - lat))), n = j * 360 + i;
    return (MASK[n >> 3] >> (n & 7)) & 1;
  };
  const pts = [];
  const N = 12000, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + .5) / N) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
    const x = Math.sin(th) * rr, z = Math.cos(th) * rr;
    const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(x, z) * 180 / Math.PI;
    pts.push({ x, y, z, land: isLand(lat, lon) });
  }
  // faint starfield inside the canvas
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + .3, p: Math.random() * 6.3 }));
  const ll = (lat, lon) => { const a = lat * Math.PI / 180, b = lon * Math.PI / 180; return { x: Math.cos(a) * Math.sin(b), y: Math.sin(a), z: Math.cos(a) * Math.cos(b) }; };
  const hubs = [
    { n: 'Amazon', ...ll(47.6, -122.3) }, { n: 'eBay', ...ll(37.3, -121.9) }, { n: 'Etsy', ...ll(40.7, -74) },
    { n: 'TikTok Shop', ...ll(1.35, 103.8) }, { n: 'Shopify', ...ll(45.4, -75.7) }, { n: 'Walmart', ...ll(36.4, -94.2) },
    { n: 'HQ · Ras Al Khaimah', ...ll(25.8, 55.95) }, { n: '', ...ll(51.5, -0.1) }, { n: '', ...ll(-33.9, 151.2) }, { n: '', ...ll(24.9, 67) }
  ];
  const links = [[0, 3], [2, 7], [7, 6], [6, 9], [9, 3], [3, 8], [5, 7], [1, 3], [4, 7], [2, 6]];
  const slerp = (a, b, t) => {
    const d = clamp(a.x * b.x + a.y * b.y + a.z * b.z, -1, 1), om = Math.acos(d), s = Math.sin(om) || 1;
    const k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
    return { x: a.x * k1 + b.x * k2, y: a.y * k1 + b.y * k2, z: a.z * k1 + b.z * k2 };
  };

  let rotY = 4.1, rotX = .38, vel = .0016, drag = false, lx = 0, ly = 0, visible = true;
  cv.addEventListener('pointerdown', e => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
    rotY += dx * .006; rotX = clamp(rotX + dy * .004, -.9, .9); vel = dx * .0006;
  });
  const up = () => (drag = false);
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  new IntersectionObserver(es => (visible = es[0].isIntersecting)).observe(cv);

  let cY = 1, sY = 0, cX = 1, sX = 0;
  const setRot = () => { cY = Math.cos(rotY); sY = Math.sin(rotY); cX = Math.cos(rotX); sX = Math.sin(rotX); };
  setRot();
  const rot = p => {
    const x = p.x * cY + p.z * sY, z = -p.x * sY + p.z * cY;
    return { x, y: p.y * cX - z * sX, z: p.y * sX + z * cX };
  };
  const scr = (p, k = 1) => ({ x: CX + p.x * R * k, y: CY - p.y * R * k });

  /* ---------- people popping up around the world ----------
     SAMPLE DATA: these names are illustrative placeholders (each pop-up is
     labelled "Sample"). Replace GLOBE_PEOPLE with real, consented clients
     or leads, then remove the "Sample" badge in the markup below. */
  const GLOBE_PEOPLE = [
    ['Ayesha', 'Lahore', 31.52, 74.36, 'Wholesale'], ['Daniel', 'New York', 40.71, -74.0, 'Amazon store'],
    ['Sofia', 'Madrid', 40.42, -3.7, 'White label'], ['Omar', 'Dubai', 25.2, 55.27, 'Dropshipping'],
    ['Emily', 'London', 51.5, -0.12, 'TikTok Shop'], ['Kenji', 'Tokyo', 35.68, 139.69, 'Shopify'],
    ['Priya', 'Mumbai', 19.08, 72.88, 'Lead generation'], ['Lucas', 'São Paulo', -23.55, -46.63, 'Walmart'],
    ['Hannah', 'Sydney', -33.87, 151.21, 'eBay'], ['Mohammed', 'Riyadh', 24.71, 46.68, 'Cold calling'],
    ['Chloe', 'Toronto', 43.65, -79.38, 'Etsy'], ['Thabo', 'Johannesburg', -26.2, 28.05, 'Wholesale'],
    ['Lena', 'Berlin', 52.52, 13.4, 'Amazon store'], ['Wei', 'Singapore', 1.35, 103.82, 'TikTok Shop'],
    ['Fatima', 'Karachi', 24.86, 67.0, 'Dropshipping'], ['Mateo', 'Mexico City', 19.43, -99.13, 'White label'],
    ['Aisha', 'Lagos', 6.52, 3.38, 'Shopify'], ['Ivan', 'Istanbul', 41.01, 28.98, 'Walmart']
  ].map(([name, city, lat, lon, tag]) => ({ name, city, tag, v: ll(lat, lon) }));
  const popLayer = document.getElementById('globePops');
  const pops = [];
  const POP_LIFE = 5600;
  let avoid = [];
  function measureAvoid() { avoid = []; }   // nothing overlays the globe stage
  const hits = (x, y, w, h) => avoid.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  const cardBox = (sx, sy, w, h) => ({ x: sx > W * .62 ? sx - w - 16 : sx + 16, y: sy - h - 10, w, h });
  addEventListener('resize', () => setTimeout(measureAvoid, 120));
  function spawnPop() {
    if (!popLayer || !visible || document.hidden) return;
    if (pops.length >= (W < 900 ? 2 : 3)) return;
    measureAvoid();
    const cands = GLOBE_PEOPLE.filter(p => {
      if (pops.some(x => x.p === p)) return false;
      const q = rot(p.v); if (q.z <= .35) return false;
      const sp = scr(q), b = cardBox(sp.x, sp.y, 200, 46);
      return !hits(b.x, b.y, b.w, b.h) && !hits(sp.x - 6, sp.y - 6, 12, 12);
    });
    if (!cands.length) return;
    const p = cands[Math.random() * cands.length | 0];
    const el = document.createElement('div');
    el.className = 'gpop';
    el.innerHTML = `<i>${p.name[0]}</i><span><b>${p.name}</b><small>${p.city} · ${p.tag}</small></span><em>Sample</em>`;
    popLayer.append(el);
    pops.push({ p, el, born: performance.now(), h: el.offsetHeight || 46, shown: false });
    requestAnimationFrame(() => el.classList.add('on'));
  }
  function updatePops(now, t) {
    for (let i = pops.length - 1; i >= 0; i--) {
      const o = pops[i], q = rot(o.p.v), age = now - o.born;
      const sp0 = scr(q), b0 = cardBox(sp0.x, sp0.y, o.el.offsetWidth || 190, o.h);
      const gone = age > POP_LIFE || q.z < .1 || (age > 700 && hits(b0.x, b0.y, b0.w, b0.h));
      if (gone) { const el = o.el; el.style.transition = 'opacity .35s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 380); pops.splice(i, 1); continue; }
      const s = scr(q), fade = clamp(Math.min(age / 500, (POP_LIFE - age) / 500, q.z * 3));
      // pin on the globe
      const pulse = (age / 900) % 1;
      ctx.strokeStyle = `rgba(241,213,138,${(1 - pulse) * .7 * fade})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 4 + pulse * 18, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,236,190,${fade})`; ctx.beginPath(); ctx.arc(s.x, s.y, 3.4, 0, 7); ctx.fill();
      // card anchored to the pin, leaning away from the nearest screen edge
      const flip = s.x > W * .62;
      const w = o.el.offsetWidth || 190;
      const x = flip ? s.x - w - 16 : s.x + 16;
      o.el.style.transform = `translate3d(${x.toFixed(1)}px,${(s.y - o.h - 10).toFixed(1)}px,0)`;
      o.el.style.opacity = fade.toFixed(2);
    }
  }
  setInterval(spawnPop, 1700);
  setTimeout(spawnPop, 900);

  // light comes from the upper-left, towards the viewer
  const LX = -.5, LY = .55, LZ = .67;
  function draw(now) {
    requestAnimationFrame(draw);
    if (!visible) return;
    if (!drag) { rotY += vel; vel += (.0016 - vel) * .02; }
    setRot();
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    // stars
    stars.forEach(s => {
      ctx.fillStyle = `rgba(245,236,205,${(.18 + .22 * Math.sin(t * .9 + s.p)) * .9})`;
      ctx.fillRect(s.x * W, s.y * H, s.r, s.r);
    });

    // outer atmosphere (two soft layers)
    const gr = Math.min(R * 1.7, W / 2, H / 2), g0 = R * .92 / gr;   // fade out before the canvas edge, no seam
    let g = ctx.createRadialGradient(CX, CY, R * .92, CX, CY, gr);
    g.addColorStop(0, 'rgba(212,175,55,.20)'); g.addColorStop(Math.min(.9, g0 + (1 - g0) * .35), 'rgba(212,175,55,.07)'); g.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, gr, 0, 7); ctx.fill();

    // ocean body
    const b = ctx.createRadialGradient(CX - R * .35, CY - R * .4, R * .05, CX, CY, R);
    b.addColorStop(0, 'rgba(46,38,20,.97)'); b.addColorStop(.55, 'rgba(18,16,12,.98)'); b.addColorStop(1, 'rgba(6,6,7,.99)');
    ctx.fillStyle = b; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();

    // graticule
    ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.clip();
    ctx.strokeStyle = 'rgba(212,175,55,.09)'; ctx.lineWidth = .7;
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath(); let st = false;
      for (let lon = -180; lon <= 180; lon += 6) {
        const q = rot(ll(lat, lon)); if (q.z < 0) { st = false; continue; }
        const s = scr(q); st ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); st = true;
      }
      ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath(); let st = false;
      for (let lat = -90; lat <= 90; lat += 6) {
        const q = rot(ll(lat, lon)); if (q.z < 0) { st = false; continue; }
        const s = scr(q); st ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); st = true;
      }
      ctx.stroke();
    }

    // dots: continents glow warm gold, oceans are a faint mist
    const dl = Math.max(1.6, R / 190);
    for (let i = 0; i < pts.length; i++) {
      const q = rot(pts[i]);
      if (q.z < -.02) continue;
      const s = scr(q);
      const lit = Math.max(0, q.x * LX + q.y * LY + q.z * LZ);          // 0..1 day side
      const edge = Math.pow(1 - q.z, 2.2);                              // brighter rim
      if (pts[i].land) {
        const a = .30 + .62 * lit + .25 * edge;
        ctx.fillStyle = `rgba(${226 + lit * 29 | 0},${176 + lit * 52 | 0},${58 + lit * 70 | 0},${Math.min(1, a)})`;
        ctx.fillRect(s.x - dl / 2, s.y - dl / 2, dl * (1 + .35 * lit), dl * (1 + .35 * lit));
      } else {
        ctx.fillStyle = `rgba(236,222,176,${.05 + lit * .09})`;
        ctx.fillRect(s.x, s.y, dl * .55, dl * .55);
      }
    }

    // rim light (fresnel) + soft specular
    const rim = ctx.createRadialGradient(CX, CY, R * .72, CX, CY, R);
    rim.addColorStop(0, 'rgba(212,175,55,0)'); rim.addColorStop(.8, 'rgba(212,175,55,.07)'); rim.addColorStop(1, 'rgba(246,220,147,.42)');
    ctx.fillStyle = rim; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    const sp = ctx.createRadialGradient(CX - R * .42, CY - R * .45, 0, CX - R * .42, CY - R * .45, R * .7);
    sp.addColorStop(0, 'rgba(255,240,200,.16)'); sp.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sp; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(246,220,147,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.stroke();

    // arcs with comet pulses
    const arcPt = (A, B, u) => { const m = slerp(A, B, u), lift = 1 + .24 * Math.sin(Math.PI * u); return rot({ x: m.x * lift, y: m.y * lift, z: m.z * lift }); };
    links.forEach(([ia, ib], li) => {
      const A = hubs[ia], B = hubs[ib], seg = 40;
      ctx.beginPath(); let started = false;
      for (let k = 0; k <= seg; k++) {
        const q = arcPt(A, B, k / seg);
        if (q.z < -.02) { started = false; continue; }
        const s = scr(q); started ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); started = true;
      }
      ctx.strokeStyle = 'rgba(246,220,147,.30)'; ctx.lineWidth = 1; ctx.stroke();
      const u0 = (t * .13 + li * .21) % 1;
      for (let k = 0; k < 14; k++) {                                    // comet trail
        const u = u0 - k * .012; if (u < 0) break;
        const q = arcPt(A, B, u); if (q.z <= 0) continue;
        const s = scr(q), f = 1 - k / 14;
        ctx.fillStyle = `rgba(255,236,170,${.85 * f * f})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, 1 + 2.2 * f, 0, 7); ctx.fill();
      }
      const q = arcPt(A, B, u0);
      if (q.z > 0) {
        const s = scr(q), gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
        gg.addColorStop(0, 'rgba(255,244,205,.9)'); gg.addColorStop(1, 'rgba(212,175,55,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, 7); ctx.fill();
      }
    });

    // hub markers + labels
    ctx.font = '600 11px "Inter",sans-serif'; ctx.textBaseline = 'middle';
    hubs.forEach(h => {
      const q = rot(h); if (q.z < .08) return;
      const s = scr(q), pulse = (Math.sin(t * 2.4 + h.x * 5) + 1) / 2, v = clamp(q.z * 2);
      ctx.strokeStyle = `rgba(246,220,147,${(.55 - pulse * .45) * v})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 4 + pulse * 11, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(255,240,200,${v})`; ctx.beginPath(); ctx.arc(s.x, s.y, 3.2, 0, 7); ctx.fill();
      if (h.n) {
        const label = h.n.toUpperCase(), tw = ctx.measureText(label).width;
        ctx.fillStyle = `rgba(11,11,11,${.55 * v})`;
        ctx.fillRect(s.x + 11, s.y - 21, tw + 12, 18);
        ctx.fillStyle = `rgba(246,220,147,${v})`; ctx.fillRect(s.x + 11, s.y - 21, 2, 18);
        ctx.fillStyle = `rgba(245,245,245,${v})`; ctx.fillText(label, s.x + 19, s.y - 12);
      }
    });

    updatePops(now, t);
  }
  if (reduced) { visible = true; }
  requestAnimationFrame(draw);
  })();
})();
