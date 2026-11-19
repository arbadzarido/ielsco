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
| DNS: `CNAME gif → cname.vercel-dns.com` | gif.ielsco.com | DNS host of ielsco.com |
| Elco: partner endpoint to grant Pro (optional) | Automate Elco Pro activation; until then finance does it in Elco admin | Elco team |
| Xendit (optional): written confirmation of USD card processing for PT English Space Berkah Indonesia | Second gateway for USD | Email to Xendit |
| Counsel review of the 9 legal drafts + Bahasa Indonesia versions | Legal pages are drafts | Legal |
| Decisions in DECISIONS.md (award coverage, Partial Funded amount, Early Bird end, balance due, refund tiers) | Several screens show "to be announced" until set | Admin → Content & settings |
| Real testimonials (with written consent), confirmed mentor names/photos | None are shown until supplied | Admin → Content |
| Staff list (emails + roles) | Admin access | Admin → Staff |
| Brand guidelines / Apple Garamond web licence (optional) | Typography; EB Garamond is the fallback | `apps/gif/src/app` |
