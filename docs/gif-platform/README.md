# GIF programme platform (gif.ielsco.com)

Global Impact Fellowship Summer 2027: marketing site, native applications, candidate portal, payments, admin, legal
pages, notifications and analytics. Code: `apps/gif`. Migration: `supabase/migrations/20261123000000_gif_programme_platform.sql`.

| Document | What it covers |
|---|---|
| [DEPLOYMENT.md](DEPLOYMENT.md) | Vercel project, env vars, DNS/SSL, migration, monitoring, backups, future batches |
| [PAYMENTS.md](PAYMENTS.md) | Midtrans research (sources), payment design, Elco Pro fulfilment, second-gateway recommendation |
| [DECISIONS.md](DECISIONS.md) | Founder decisions, each with a recommended choice |
| [EXTERNAL-CONFIG.md](EXTERNAL-CONFIG.md) | Everything the founder must supply (keys, approvals, DNS, content) |

## Routes

Public: `/`, `/about`, `/program`, `/opportunities`, `/fully-funded`, `/mentoring`, `/self-funded`, `/selection-process`,
`/sponsorship`, `/previous-gif`, `/faq`, `/apply`, `/application-status`, `/login`, and the legal pages `/terms-and-conditions`,
`/refund-policy`, `/privacy-policy`, `/payment-terms`, `/selection-terms`, `/mentoring-terms`, `/code-of-conduct`,
`/travel-visa-disclaimer`, `/media-consent`.
Candidate portal: `/portal` (dashboard), `/portal/application`, `/portal/payments` (+ `/return`), `/portal/receipts/[id]`,
`/portal/documents`, `/portal/phase-2`, `/portal/phase-3`, `/portal/results`, `/portal/mentoring`, `/portal/onboarding`.
Admin: `/admin` (KPIs, funnel), `/admin/applicants` (+ detail), `/admin/evaluate`, `/admin/selection`, `/admin/payments`,
`/admin/content`, `/admin/sponsorship`, `/admin/emails`, `/admin/staff`, `/admin/audit`.
API: `/api/payments/midtrans/notification`, `/api/cron/daily`, `/api/analytics`, `/api/health`, `/api/admin/export`.

## Code map (`apps/gif/src`)

- `lib/settings.ts` — published facts as defaults (prices, dates, slots), deep-merged with admin overrides per cohort.
- `lib/status.ts` — the 15 statuses, transitions and progress steps. `lib/pricing.ts` — obligations per pathway, currency rules.
- `lib/applications.ts` — drafts, submission (one transaction: participants, obligations, Elco fulfilments, consents, emails),
  withdrawal, offer acceptance. `lib/phases.ts` — Phase 2/3 windows and submissions, evaluation, outcomes, publishing.
- `lib/payments/` — `midtrans.ts` (Snap, status, refund, signature), `gateway.ts` (abstraction), `service.ts` (checkout,
  verified status application, duplicates, manual payments, refunds, recompute).
- `lib/auth.ts` — email one-time codes, hashed sessions, staff roles (owner, admin, finance, evaluator, viewer).
- `lib/storage.ts`, `lib/documents.ts` — signed direct uploads, size and file-signature checks, private downloads.
- `lib/email/` — outbox + Resend, branded templates. `lib/legal.ts`, `lib/legal-docs.ts` — document registry and drafts.
- `proxy.ts` — CSRF origin check on API writes, burst limit, country cookie. Server Actions have Next's own origin check.

## Security summary

Server-side validation (zod) for every input; role checks on every admin action and page; evaluators see only assigned
applications; rate limits in Postgres (sign-in codes per email/IP, uploads, checkouts, sponsorship form); CSRF origin
check; HttpOnly SameSite=Lax `__Host-` session cookie; private storage with 5-minute signed links and audit of each
document opened; upload type checked on stored bytes; CSV formula-injection guard; CSP, HSTS, frame denial; secrets only
in environment variables; audit log for status, payment, refund, settings, staff and export actions.

## Run locally

```
cd apps/gif
npm install
cp .env.example .env.local   # point GIF_DATABASE_URL at a local Postgres with the migration applied
npm run dev                  # http://localhost:3400
npm test                     # unit tests (node --test)
npm run e2e                  # fresh DB + fake Midtrans + production build + Playwright (needs local Postgres)
```

## Test results (20 Nov 2026)

See the PR description for the latest numbers: unit tests, the e2e suite (individual and team registration, Fully Funded
with Elco Pro, mentoring, self-funded deposit and balance, payment failure/expiry/mismatch, duplicates and refunds,
webhook signatures and replays, uploads, candidate/staff/evaluator access, selection and publishing, emails, cron,
mobile layouts) and the production build.
