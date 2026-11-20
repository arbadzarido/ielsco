# What the founder needs to supply

| Item | Why | Where it goes |
|---|---|---|
| Approve and merge the PR | Merging applies the migration to production (Supabase GitHub integration) | GitHub |
| New Vercel project for `apps/gif` (team ielscommunity) | The GIF app deploys separately from ielsco.com | Vercel |
| `GIF_DATABASE_URL` (transaction pooler) | Database access | Vercel env |
| `GIF_AUTH_SECRET`, `CRON_SECRET` | Sessions, cron auth (generate randomly) | Vercel env |
| `GIF_SUPABASE_SERVICE_ROLE_KEY` | Private file storage | Vercel env |
| Resend sending-only key, sender `gif@ielsco.com` | Emails (codes, receipts, results) | Vercel env, Resend domain |
| Midtrans sandbox keys + Signature Secret Key | Sandbox payments | Vercel env (Preview + Production) |
| Midtrans confirmation: foreign cards on the MID, business category OK for youth programme with travel | Account eligibility (see PAYMENTS.md) | Email to Midtrans |
| Midtrans production keys + `GIF_MIDTRANS_PRODUCTION_ENABLED=true` | Real payments, only after the sandbox run-through | Vercel env |
| **Move `gif.ielsco.com` off the main `ielsco` Vercel project** (it is attached there today, which is why it shows the IELSco homepage) and onto a new `gif` project, Root Directory `apps/gif` — see DEPLOYMENT.md §4 | gif.ielsco.com serving the GIF app | Vercel (team ielscommunity) |
| DNS: `CNAME gif → cname.vercel-dns.com` (already resolves to Vercel; no DNS change expected) | gif.ielsco.com | DNS host of ielsco.com |
| Elco: partner endpoint to grant Pro (optional) | Automate Elco Pro activation; until then finance does it in Elco admin | Elco team |
| Counsel review of the 10 legal drafts (Bahasa Indonesia primary, English translation) | Legal pages are drafts | Legal |
| Real testimonials (with written consent), confirmed mentor names/photos | None are shown until supplied | Admin → Content |
| Staff list (emails + roles) | Admin access | Admin → Staff |

## Added 21 Nov 2026 (founder decisions)

| Item | Why | Where it goes |
|---|---|---|
| `GIF_IELSCO_SUPABASE_URL`, `GIF_IELSCO_SUPABASE_ANON_KEY` | Sign in with IELSco account (combined accounts) | Vercel env |
| `ELCO_GRANT_URL`, `IELSCO_TO_ELCO_SECRET` (after Elco builds the endpoint) | Automatic Elco Pro activation | Vercel env |
| Confirm deposit amount, recruitment post URL, cashback timing, minors' operations, insurance minimum | See DECISIONS.md "Still open" | Admin → Content & settings |
| Approve merging the follow-up PR | Applies migration 20261126000000 (additive) | GitHub |
