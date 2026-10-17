/* =====================================================
   BOOKING — free strategy call scheduler
   Topic → time → details → confirmation.

   To receive bookings automatically, put a form endpoint
   (e.g. a Formspree / Web3Forms / your own API URL) in
   CONFIG.endpoint. Without one, the booking is sent by email
   from the visitor's own mail app (mailto) — nothing is lost,
   but it needs one extra click.
   ===================================================== */
(() => {
  'use strict';
  const CONFIG = {
    endpoint: '',                       // e.g. 'https://formspree.io/f/xxxxxxx'
    email: 'info@primeera.us',
    teamTz: 'Asia/Dubai',               // Ras Al Khaimah — all slots are defined in this zone (UTC+4, no DST)
    teamLabel: 'Dubai',
    startHour: 10, endHour: 18,         // 10:00 – 18:00, last slot starts 17:30
    slotMinutes: 30,
    daysAhead: 14,                      // business days offered
    minLeadHours: 3                     // earliest bookable slot from "now"
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = $('#booking');
  if (!root) return;

  const TOPICS = [
    ['marketplace', 'Marketplace management'],
    ['wholesale', 'Wholesale sourcing'],
    ['white-label', 'White & private label'],
    ['dropshipping', 'Dropshipping'],
    ['lead-gen', 'Lead generation'],
    ['cold-calling', 'Cold calling & appointment setting'],
    ['ads', 'Ads, content & design'],
    ['question', 'Just a question']
  ];
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const st = { step: 1, topic: null, date: null, slot: null, mode: 'video' };

  /* ---------- helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const teamParts = d => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.teamTz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
      .reduce((a, x) => (a[x.type] = x.value, a), {});
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
  };
  const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const slotInstant = (date, slot) => new Date(`${date}T${slot}:00+05:00`);
  const fmtLocalTime = d => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: userTz }).format(d);
  const fmtLocalDay = d => new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: userTz }).format(d);
  const teamDayLabel = d => new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: CONFIG.teamTz }).format(d);

  function businessDays() {
    const now = teamParts(new Date());
    const out = []; let cur = Date.UTC(now.y, now.m - 1, now.d);
    while (out.length < CONFIG.daysAhead) {
      const dt = new Date(cur), dow = dt.getUTCDay();
      if (dow !== 0 && dow !== 6) out.push({ date: ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()), dt });
      cur += 86400000;
    }
    return out;
  }
  function slotsFor(date) {
    const out = [], minTime = Date.now() + CONFIG.minLeadHours * 3600e3;
    for (let m = CONFIG.startHour * 60; m < CONFIG.endHour * 60; m += CONFIG.slotMinutes) {
      const s = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      if (slotInstant(date, s).getTime() >= minTime) out.push(s);
    }
    return out;
  }

  /* ---------- step 1: topics ---------- */
  const topicBox = $('#bkTopics');
  topicBox.innerHTML = TOPICS.map(([k, t]) => `<button type="button" class="bk-chip" data-k="${k}" aria-pressed="false">${t}</button>`).join('');
  const pickTopic = k => {
    st.topic = k;
    $$('.bk-chip', topicBox).forEach(b => { const on = b.dataset.k === k; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $('#to2').disabled = !k;
    summary();
  };
  topicBox.addEventListener('click', e => { const b = e.target.closest('.bk-chip'); if (b) pickTopic(b.dataset.k); });
  const qp = new URLSearchParams(location.search).get('topic');
  if (qp && TOPICS.some(t => t[0] === qp)) pickTopic(qp);

  /* ---------- step 2: day + time ---------- */
  const days = businessDays();
  const dayBox = $('#bkDays'), slotBox = $('#bkSlots');
  dayBox.innerHTML = days.map(({ date, dt }, i) => {
    const wd = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(dt);
    const dd = dt.getUTCDate(), mo = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(dt);
    const n = slotsFor(date).length;
    return `<button type="button" class="bk-day${n ? '' : ' is-full'}" data-date="${date}" ${n ? '' : 'disabled'} aria-pressed="false"><small>${wd}</small><b>${dd}</b><em>${mo}</em></button>`;
  }).join('');

  function renderSlots() {
    if (!st.date) { slotBox.innerHTML = '<p class="bk-hint">Pick a day to see available times.</p>'; return; }
    const list = slotsFor(st.date);
    slotBox.innerHTML = list.map(s => {
      const inst = slotInstant(st.date, s);
      const local = fmtLocalTime(inst);
      const sameDay = new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(inst) === st.date;
      const tag = sameDay ? '' : `<i>${new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: userTz }).format(inst)}</i>`;
      return `<button type="button" class="bk-slot${st.slot === s ? ' is-on' : ''}" data-s="${s}" aria-pressed="${st.slot === s}">${local}${tag}</button>`;
    }).join('') || '<p class="bk-hint">No times left that day — please pick another.</p>';
  }
  dayBox.addEventListener('click', e => {
    const b = e.target.closest('.bk-day'); if (!b || b.disabled) return;
    st.date = b.dataset.date; st.slot = null;
    $$('.bk-day', dayBox).forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    $('#to3').disabled = true; renderSlots(); summary();
  });
  slotBox.addEventListener('click', e => {
    const b = e.target.closest('.bk-slot'); if (!b) return;
    st.slot = b.dataset.s;
    $$('.bk-slot', slotBox).forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
    $('#to3').disabled = false; summary();
  });
  renderSlots();
  $('#bkTz').textContent = userTz.replace(/_/g, ' ');

  /* ---------- how we meet ---------- */
  $$('input[name="mode"]').forEach(r => r.addEventListener('change', () => { st.mode = r.value; summary(); }));

  /* ---------- steps ---------- */
  const panes = $$('[data-pane]'), stepDots = $$('.bk-step');
  function go(n, scroll = true) {
    st.step = n;
    panes.forEach(p => p.hidden = p.dataset.pane !== String(n));
    stepDots.forEach((s, i) => { s.classList.toggle('is-on', i + 1 === n); s.classList.toggle('is-done', i + 1 < n); });
    if (scroll) root.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  $('#to2').addEventListener('click', () => go(2));
  $('#to3').addEventListener('click', () => go(3));
  $$('[data-back]').forEach(b => b.addEventListener('click', () => go(+b.dataset.back)));
  stepDots.forEach((s, i) => s.addEventListener('click', () => {
    if (i + 1 < st.step) go(i + 1);
  }));

  /* ---------- sidebar summary ---------- */
  function summary() {
    const t = TOPICS.find(x => x[0] === st.topic);
    $('#sTopic').textContent = t ? t[1] : '—';
    if (st.date && st.slot) {
      const inst = slotInstant(st.date, st.slot);
      $('#sWhen').textContent = `${fmtLocalDay(inst)} · ${fmtLocalTime(inst)}`;
      $('#sTeam').textContent = `${teamDayLabel(inst)} ${st.slot} ${CONFIG.teamLabel} time`;
    } else if (st.date) {
      const dt = slotInstant(st.date, '12:00');
      $('#sWhen').textContent = fmtLocalDay(dt) + ' · pick a time';
      $('#sTeam').textContent = '—';
    } else { $('#sWhen').textContent = '—'; $('#sTeam').textContent = '—'; }
    $('#sMode').textContent = st.mode === 'phone' ? 'Phone call' : 'Video call';
  }
  summary();

  /* ---------- step 3: details + submit ---------- */
  const form = $('#bkForm'), note = $('#bkNote');
  const val = id => $('#' + id).value.trim();
  form.addEventListener('input', e => {
    const f = e.target.closest('.bk-field'); if (f) f.classList.remove('err');
    if (!$('.bk-field.err', form)) note.textContent = '';
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    const bad = (id, cond) => { const f = $('#' + id).closest('.bk-field'); f.classList.toggle('err', cond); if (cond) ok = false; };
    bad('bName', !val('bName'));
    bad('bMail', !/^\S+@\S+\.\S+$/.test(val('bMail')));
    if (!ok) { note.textContent = 'Please add your name and a valid email so we can confirm the time.'; return; }
    if (!st.topic || !st.date || !st.slot) { note.textContent = 'Please choose a topic and a time first.'; return; }
    note.textContent = '';

    const inst = slotInstant(st.date, st.slot);
    const topicLabel = TOPICS.find(x => x[0] === st.topic)[1];
    const booking = {
      topic: topicLabel, mode: st.mode === 'phone' ? 'Phone call' : 'Video call',
      startUtc: inst.toISOString(), teamTime: `${st.date} ${st.slot} ${CONFIG.teamLabel} (UTC+4)`,
      visitorTime: `${fmtLocalDay(inst)} ${fmtLocalTime(inst)} (${userTz})`,
      name: val('bName'), email: val('bMail'), phone: val('bPhone'), company: val('bCo'), message: val('bMsg')
    };
    const btn = $('#bkSubmit'); btn.disabled = true; btn.querySelector('.pill__txt').textContent = 'Booking…';
    let delivered = false;
    if (CONFIG.endpoint) {
      try {
        const r = await fetch(CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(booking) });
        delivered = r.ok;
      } catch (err) { delivered = false; }
    }
    showDone(booking, inst, delivered);
    btn.disabled = false; btn.querySelector('.pill__txt').textContent = 'Confirm booking';
  });

  /* ---------- confirmation ---------- */
  const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function showDone(b, inst, delivered) {
    panes.forEach(p => p.hidden = p.dataset.pane !== 'done');
    stepDots.forEach(s => { s.classList.remove('is-on'); s.classList.add('is-done'); });
    $('#dTitle').textContent = delivered ? "You're booked in." : 'One last step.';
    $('#dLead').textContent = delivered
      ? `Thanks, ${b.name.split(' ')[0]}. We've received your request and will confirm by email shortly.`
      : `Thanks, ${b.name.split(' ')[0]}. Send the pre-filled email below to lock in your slot — we'll confirm it by reply.`;
    $('#dWhen').textContent = b.visitorTime;
    $('#dTeam').textContent = b.teamTime;
    $('#dTopic').textContent = b.topic;
    $('#dMode').textContent = b.mode;

    const end = new Date(inst.getTime() + 30 * 60e3);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prime Era//Booking//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${Date.now()}@primeera.us`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(inst)}`, `DTEND:${utc(end)}`,
      'SUMMARY:Prime Era — free strategy call', `DESCRIPTION:Topic: ${b.topic}\\nFormat: ${b.mode}\\nWe will email the link or number before the call.`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = $('#dIcs'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'prime-era-call.ics';

    const body = [`Hello Prime Era,`, ``, `I'd like to book a free call.`, ``,
      `Topic: ${b.topic}`, `Format: ${b.mode}`, `Time (my time zone): ${b.visitorTime}`, `Time (${CONFIG.teamLabel}): ${b.teamTime}`, ``,
      `Name: ${b.name}`, `Email: ${b.email}`, `Phone / WhatsApp: ${b.phone || '-'}`, `Company / store: ${b.company || '-'}`, ``, `${b.message || ''}`].join('\n');
    const mail = $('#dMail');
    mail.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Call booking: ' + b.topic + ' — ' + b.teamTime)}&body=${encodeURIComponent(body)}`;
    mail.hidden = delivered;
    $('#dMailNote').hidden = delivered;
    root.scrollIntoView({ block: 'start' });
  }

  go(1, false);
})();
