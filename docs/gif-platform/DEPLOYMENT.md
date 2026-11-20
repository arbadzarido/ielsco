# Deploying gif.ielsco.com

Nothing in this branch is live. These are the steps to launch; each one needs the founder (accounts, keys, DNS).

## 1. Architecture

- `apps/gif` is a self-contained Next.js 16 app inside the IELSco repo, deployed as its **own Vercel project** (Root
  Directory `apps/gif`). It does not change the main ielsco.com app; the root `tsconfig.json` only includes `src/**`.
- Data lives in the existing IELSco Supabase project (hkubzamchahvdpvojepc) in a separate schema `gif`, which PostgREST
  does not expose. RLS is on with no policies; only the server (via the pooled connection string) reads and writes.
- Files: private Supabase Storage bucket `gif-applications` (signed upload/download URLs, 5-minute links).
- Email: Resend (outbox table first, then send; daily retry). Payments: Midtrans Snap (IDR) + manual verification.

## 2. Database migration

`supabase/migrations/20261123000000_gif_programme_platform.sql` (applied to production when PR #50 merged on 20 Nov 2026) and `20261126000000_gif_accounts_guardians_tasks.sql` (additive; applies when its PR merges). **The Supabase GitHub integration applies new migrations
to production when a PR is merged to `main`**, so merging this PR creates the `gif` schema and the bucket. It is additive
(new schema only; no existing table is touched). Rollback: `supabase/manual/ROLLBACK-20261123-gif-programme-platform.sql`
(drops the `gif` schema and bucket — only before real applicants exist). Dry run before merging:
`supabase db push --dry-run` against production, as done for earlier releases.

## 3. Vercel project (team ielscommunity)

1. New project → import `arbadzarido/ielsco` → **Root Directory `apps/gif`**, framework Next.js, Node 20+.
2. Ignored Build Step (so ielsco.com changes don't rebuild GIF): `git diff --quiet HEAD^ HEAD -- . ../../supabase/migrations`
3. Environment variables (Production; Preview gets sandbox/test values and `GIF_NOINDEX=true`) — see `apps/gif/.env.example`:
   - `GIF_DATABASE_URL` — Supabase → Project Settings → Database → Connection string → **Transaction pooler** (port 6543).
   - `GIF_AUTH_SECRET` — new random 48 chars. `GIF_SITE_URL=https://gif.ielsco.com`.
   - `GIF_SUPABASE_URL`, `GIF_SUPABASE_SERVICE_ROLE_KEY` — for Storage.
   - `RESEND_API_KEY` (a **sending-only** key), `GIF_EMAIL_FROM="IELSco GIF <gif@ielsco.com>"`, `GIF_FINANCE_EMAIL`.
   - `GIF_PAYMENTS_ENABLED=true`, `GIF_MIDTRANS_ENV=sandbox`, sandbox `GIF_MIDTRANS_SERVER_KEY` / `GIF_MIDTRANS_CLIENT_KEY`,
     `GIF_MIDTRANS_SIGNATURE_KEYS` (Signature Secret Key). Switch to production only after a sandbox run-through:
     `GIF_MIDTRANS_ENV=production`, `GIF_MIDTRANS_PRODUCTION_ENABLED=true`, production keys.
   - `CRON_SECRET` — random 32 chars (Vercel Cron sends it as a Bearer token).
4. `vercel.json` registers the daily cron (`/api/cron/daily`, 01:00 UTC = 08:00 WIB) and the `sin1` region.

## 4. DNS and SSL

Add `gif.ielsco.com` to the new Vercel project → Vercel shows the record; at the DNS host of ielsco.com add
`CNAME gif → cname.vercel-dns.com` (or the value Vercel displays). SSL is issued automatically once the record resolves.
Verify: `https://gif.ielsco.com/api/health` returns `{"ok":true,...}`.

## 5. Midtrans

- Dashboard → Settings → Payment → **Notification URL** is used by Elco today; GIF sends `X-Override-Notification:
  https://gif.ielsco.com/api/payments/midtrans/notification` per order, so the shared merchant needs no change.
- Finish redirect URL is also sent per order. Confirm with Midtrans: foreign cards on the MID, business category (see PAYMENTS.md).
- Sandbox run-through: pay with Midtrans sandbox test cards, check the receipt, check `/admin/payments`.

## 6. Email (Resend)

Verify the sending domain (ielsco.com is already used for notifications@ / noreply@). Use `gif@ielsco.com` or
`notifications@ielsco.com` as sender. Check SPF/DKIM in Resend. Admin → Emails shows every message and failures.

## 7. After launch

- Redirect `https://www.ielsco.com/events/gif` → `https://gif.ielsco.com` (main app `next.config.ts` redirect), and update
  the GIF links/banners in the IELSco dashboard (`src/lib/gif-summer-2027.ts` still points to the old Google Form).
- Monitoring: add `https://gif.ielsco.com/api/health` to an uptime monitor (e.g. Better Stack / UptimeRobot, 5-minute
  interval). Vercel → Observability for function errors; Admin → Overview flags payments that are off or in sandbox.
- Backups: Supabase daily backups depend on the plan; check Database → Backups and enable PITR if available. For an extra
  copy, schedule `pg_dump --schema=gif` weekly to private storage. Storage objects are not in database backups.
- Firewall: the Vercel firewall rule suggested on 11 Nov (per-IP POST /api/* limit) must exclude
  `/api/payments/midtrans/notification` and `/api/cron/daily`.

## 8. Future batches (e.g. GIF Winter 2027, China)

Insert a new row in `gif.cohorts` (id `winter-2027`, code prefix e.g. `GIFW27`), set its `settings`, then switch
`is_current`. Applications, payments and content are all keyed by cohort. Copy/route text in `src/lib/content.ts` and
the homepage is Summer-specific and would be adapted per batch.
