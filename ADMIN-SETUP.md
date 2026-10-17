# Booking backend + admin portal — setup

Bookings made on the website are saved by `api/book.js` and managed at **`/admin/`**
(for example `https://primeera1.vercel.app/admin/`). Nothing works until you do the
three steps below once. Until then the booking page keeps working the old way
(it opens an email to info@primeera.us), so no booking is lost.

## 1. Connect a database (free, ~2 minutes)
1. Open your project on Vercel → **Storage** (or **Integrations / Marketplace**).
2. Add **Upstash Redis** (free plan is plenty) and connect it to this project.
3. Vercel adds the connection variables for you (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`,
   or `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Nothing to copy by hand.

## 2. Set the admin password
Project → **Settings → Environment Variables** → add:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | a long password you choose (at least 8 characters — use 12+ with a mix of words) |
| `SESSION_SECRET` | *(optional)* any long random text; makes sign-in cookies harder to forge |

## 3. Redeploy
Deployments → the latest one → **Redeploy** (environment variables only apply to new deployments).

Then open `/admin/`, sign in, and make a test booking on `/booking.html` to see it appear.

## Optional: email me when someone books
Create a free account at resend.com, make an API key, then add these variables and redeploy:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | your key |
| `NOTIFY_TO` | where alerts go (default `info@primeera.us`) |
| `NOTIFY_FROM` | e.g. `Prime Era Bookings <bookings@yourdomain>` — needs a domain verified in Resend. Without it, Resend's test sender can only email the account owner. |

## What the system does
- Visitors pick a topic and a Dubai-time slot (Mon–Fri, 10:00–17:30). Taken slots disappear for everyone else.
- The server re-checks every booking (valid slot, no double-booking, field limits, 6 bookings/hour per visitor, bot trap).
- `/admin/`: sign in, see all bookings, search/filter, change status (new → confirmed → done / cancelled / no-show),
  add private notes, call/WhatsApp/email the visitor, add to calendar, export CSV, delete.
- Cancelling a booking frees its time slot again.
- Sign-in uses an HttpOnly cookie that expires after 12 hours; 8 wrong passwords locks sign-in for 15 minutes.

## Trying it on your own computer
```
cd tools && npm install        # once
cd ..
ADMIN_PASSWORD=choose-a-long-password node tools/dev-server.mjs
```
Then open http://127.0.0.1:5181/ — local bookings are kept in `.data/store.json` (git-ignored).
On Windows PowerShell: `$env:ADMIN_PASSWORD="choose-a-long-password"; node tools/dev-server.mjs`
