/* =====================================================
   TALK ORB
   A living, breathing wireframe orb. Hover wakes it up;
   a tap sends the visitor to the booking page.
   ===================================================== */
(() => {
  'use strict';
  const orb = document.getElementById('talkOrb');
  if (!orb) return;
  const cv = orb.querySelector('canvas'), ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  let W = 0, H = 0, DPR = 1, visible = true, boost = 0, boostTarget = 0, going = 0, goTarget = 0;
  const parts = Array.from({ length: 46 }, () => ({
    a: Math.random() * 6.283, r: .55 + Math.random() * .75, s: (Math.random() - .5) * .0016,
    z: Math.random() * 6.283, size: .6 + Math.random() * 1.5
  }));

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  addEventListener('resize', resize); resize();
  new IntersectionObserver(es => (visible = es[0].isIntersecting)).observe(orb);

  // copper → gold ramp used for the layered outlines
  const ramp = f => {
    const a = [168, 96, 52], b = [241, 205, 120];
    return a.map((v, i) => Math.round(lerp(v, b[i], f)));
  };

  function draw(now) {
    requestAnimationFrame(draw);
    if (!visible) return;
    const t = now / 1000;
    boost += (boostTarget - boost) * .06;
    going += (goTarget - going) * .08;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * (.34 + going * .22);
    const speed = (reduced ? 0 : 1) * (1 + boost * 1.6 + going * 4);

    // soft core glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
    g.addColorStop(0, `rgba(212,150,70,${.12 + boost * .1})`);
    g.addColorStop(.6, 'rgba(212,150,70,.03)');
    g.addColorStop(1, 'rgba(212,150,70,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, 7); ctx.fill();

    // a twisting tunnel of nested hexagons
    const L = 30, sides = 6;
    ctx.lineWidth = 1;
    for (let i = 0; i < L; i++) {
      const f = i / (L - 1);
      const base = R * (.3 + .7 * f);
      const rot = t * speed * .06 + i * .118 + Math.sin(t * .35 * speed + f * 3) * .08;
      const breathe = 1 + .018 * Math.sin(t * .9 + i * .3) + boost * .025;
      const [r, gg, b] = ramp(f);
      ctx.strokeStyle = `rgba(${r},${gg},${b},${(.14 + .55 * f) * (.78 + boost * .25 + going * .3)})`;
      ctx.beginPath();
      for (let k = 0; k <= sides; k++) {
        const a = rot + k / sides * Math.PI * 2;
        const rr = base * breathe * (1 + .012 * Math.sin(t * speed * .5 + k * 2.1 + i * .4));
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // drifting dust
    parts.forEach(p => {
      p.a += p.s * speed * 60 * .016;
      const rr = R * (1.05 + p.r * .9);
      const x = cx + Math.cos(p.a) * rr, y = cy + Math.sin(p.a) * rr * .92;
      const tw = .35 + .65 * Math.abs(Math.sin(t * .8 + p.z));
      ctx.fillStyle = `rgba(232,178,100,${tw * (.5 + boost * .4)})`;
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 7); ctx.fill();
    });
  }
  requestAnimationFrame(draw);

  // wake on hover / focus
  ['pointerenter', 'focus'].forEach(e => orb.addEventListener(e, () => { boostTarget = 1; }));
  ['pointerleave', 'blur'].forEach(e => orb.addEventListener(e, () => { boostTarget = 0; }));

  // tap → ripple, expand, open the booking page
  orb.addEventListener('click', e => {
    e.preventDefault();
    if (orb.classList.contains('is-go')) return;
    orb.classList.add('is-go'); goTarget = 1;
    const href = orb.getAttribute('href') || 'booking.html';
    setTimeout(() => { location.href = href; }, reduced ? 50 : 750);
  });
})();
