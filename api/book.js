/* Public booking endpoint.
   GET  /api/book  → { booked: [ISO start times already taken] }   (no personal data)
   POST /api/book  → stores a booking                                (JSON body)  */
'use strict';
const store = require('./_lib/store');
const { send, ip, body, isJson, cors } = require('./_lib/http');

const TOPICS = ['Marketplace management', 'Wholesale sourcing', 'White & private label', 'Dropshipping', 'Lead generation',
  'Cold calling & appointment setting', 'Ads, content & design', 'Just a question'];
const MODES = ['Video call', 'Phone call'];
const DUBAI_MS = 4 * 3600e3;          // Asia/Dubai is UTC+4 all year

// Same rule the booking page uses: Mon–Fri, 10:00–17:30 Dubai time, on the hour or half hour, soon but not too far ahead.
function validSlot(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  if (t < now + 2 * 3600e3 || t > now + 45 * 86400e3) return false;
  const d = new Date(t + DUBAI_MS), dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (d.getUTCSeconds() || d.getUTCMilliseconds()) return false;
  const m = d.getUTCMinutes(); if (m !== 0 && m !== 30) return false;
  const mins = d.getUTCHours() * 60 + m;
  return mins >= 600 && mins <= 1050;
}

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');

async function notify(b) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = process.env.NOTIFY_TO || 'info@primeera.us';
  const from = process.env.NOTIFY_FROM || 'Prime Era Bookings <onboarding@resend.dev>';
  const text = [
    `New call booking`, ``,
    `When (Dubai): ${b.teamTime}`, `When (visitor): ${b.visitorTime}`, `Topic: ${b.topic}`, `Format: ${b.mode}`, ``,
    `Name: ${b.name}`, `Email: ${b.email}`, `Phone / WhatsApp: ${b.phone || '-'}`, `Company / store: ${b.company || '-'}`, ``,
    b.message || '', ``, `Manage it in the admin portal: /admin/`
  ].join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: b.email, subject: `New call booking — ${b.name} (${b.teamTime})`, text }),
      signal: AbortSignal.timeout(4500)
    });
  } catch (e) { /* the booking is already saved; a failed email must not fail it */ }
}

module.exports = async function handler(req, res) {
  try {
    if (cors(req, res)) return;
    if (req.method === 'GET') {
      if (store.mode() === 'none') return send(res, 200, { booked: [], storage: false });
      return send(res, 200, { booked: await store.bookedSlots(), storage: true });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(res, 405, { error: 'method_not_allowed' }); }
    if (!isJson(req)) return send(res, 415, { error: 'json_required' });
    if (store.mode() === 'none') return send(res, 503, { error: 'storage_not_configured' });

    if (await store.limited('book:' + ip(req), Number(process.env.BOOK_RATE_LIMIT) || 6, 3600)) return send(res, 429, { error: 'too_many_requests' });

    const d = body(req);
    if (!d) return send(res, 400, { error: 'bad_request' });
    if (str(d.website, 50)) return send(res, 200, { ok: true });            // honeypot: bots fill this in; pretend success

    const startIso = Number.isFinite(Date.parse(d.startUtc)) ? new Date(Date.parse(d.startUtc)).toISOString() : '';
    const b = {
      name: str(d.name, 120), email: str(d.email, 200).toLowerCase(), phone: str(d.phone, 40), company: str(d.company, 160),
      message: str(d.message, 2000), topic: str(d.topic, 80), mode: str(d.mode, 20),
      startUtc: startIso, teamTime: str(d.teamTime, 80), visitorTime: str(d.visitorTime, 120), visitorTz: str(d.visitorTz, 60)
    };
    if (!b.name) return send(res, 400, { error: 'name_required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return send(res, 400, { error: 'email_invalid' });
    if (!TOPICS.includes(b.topic)) return send(res, 400, { error: 'topic_invalid' });
    if (!MODES.includes(b.mode)) return send(res, 400, { error: 'mode_invalid' });
    if (!validSlot(b.startUtc)) return send(res, 400, { error: 'slot_invalid' });

    const out = await store.createBooking(b);
    if (out.error === 'slot_taken') return send(res, 409, { error: 'slot_taken' });
    if (out.error) return send(res, 503, { error: 'storage_not_configured' });
    await notify(out.booking);
    return send(res, 201, { ok: true, id: out.booking.id });
  } catch (e) {
    console.error('book failed:', e && e.message);
    return send(res, 500, { error: 'server_error' });
  }
};
