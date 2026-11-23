# IELScourse payments on Midtrans (production only)

Status (22 Nov 2026): built and tested locally; **not live**. Checkout stays closed until the production variables below are set on the IELSco Vercel project and the controlled production check (section 6) passes. There is no Sandbox path.

## 1. What was reused from Elco AI

Elco AI's `backend/payments.py` is live on Midtrans **production** (`/api/billing/config` on www.elcoai.com reports `environment: production`, client key `Mid-client-bx73…`). Reused, unchanged in behaviour:

| From Elco | Where in IELSco |
|---|---|
| Variable names `MIDTRANS_ENV`, `MIDTRANS_PRODUCTION_ENABLED`, `MIDTRANS_PRODUCTION_SERVER_KEY`, `MIDTRANS_PRODUCTION_CLIENT_KEY`, key-prefix checks (`Mid-server-`/`Mid-client-`, never `SB-`) | `src/lib/payments/gateway.ts` |
| SHA-512 signature check, status classification (settlement / capture+accept = paid, capture+challenge = pending, refund, partial refund…) | `src/lib/payments/midtrans.ts` (`signatureOk`, `classify`), already a port of Elco's |
| Server decides amount and order id; Snap body; 60-minute order window; "Continue payment" reuses a live order | `course_create_order()` + `startCheckout()` |
| Notification → verify signature → **re-read status from Midtrans** → apply under a row lock; paid always wins; stale/late statuses ignored; refund after paid revokes | `handleCourseNotification()` + `course_apply_payment()` |
| Reconcile open orders on return / dashboard visit | `reconcile()` |
| Paid-over-capacity is honoured and flagged (Elco tournaments) | `course_apply_payment()` |

Elco AI itself is **not modified**: no file in the Elco repo, no Elco variable, no Elco table, no Elco price. IELScourse data lives only in the IELSco database (`course_*` tables) and its order ids start with `IELS-C-` (Elco `ELCO-`, IELSco membership `IELS-M-`). Every IELScourse Snap request sends `X-Override-Notification: https://www.ielsco.com/api/payments/midtrans/notification`, so on a shared merchant account Midtrans notifies IELSco for IELScourse orders and Elco (its dashboard URL) for Elco orders. Elco's handler answers 404 for any non-Elco order id anyway.

## 2. What was added for IELScourse

- **One gateway** `src/lib/payments/gateway.ts`: production only (Sandbox refused, never a fallback), www canonical URLs (Midtrans doesn't follow the apex redirect), local fake gateway for automated tests only (loopback, never on Vercel).
- **One payment service** `src/lib/ielscourse/payments.ts`: checkout for Collective, Studio and One; notification handler; return-page refresh; reconcile; daily job.
- **Database** `supabase/migrations/20261210000000_ielscourse_payments.sql` (additive; rollback in `supabase/manual/ROLLBACK-20261210-ielscourse-payments.sql`):
  - `course_plans` (Collective Rp199,000 / Studio Rp399,000 per month, approved prices), `course_cohorts` (an open group must have a confirmed schedule; Collective ≤ 20, Studio ≤ 5), `course_memberships` (one paid month per order; renewals start when the current month ends), `course_entitlements` (IELS Circle active; Elco AI `pending_activation` until the team records the grant), `course_waitlist`.
  - `course_payment_orders` (invoice no. `ICS-YYYY-NNNNN`, receipt no. `ICR-YYYY-NNNNN`; One uses its tutoring invoice `TUT-…-<instalment>` and receipt `RCP-…`), `course_seat_holds` (taken with the order under a cohort lock: the last seat can't be sold twice), `course_payment_events` (every notification/re-check, duplicates recorded once), `course_audit`.
  - Product fulfilment kept separate: memberships for Collective/Studio; for One the existing tutoring instalment is verified through `tutoring_record_payment_core()`, the same core the admin bank-transfer path now uses (behaviour unchanged, regression-tested). Each Intensive instalment (50/25/25) is its own order; an earlier instalment must be paid first.
- **Routes**: `POST /api/ielscourse/checkout`, `GET /api/ielscourse/orders/[id]?refresh=1`, `GET /api/ielscourse/config`, `POST /api/ielscourse/admin/reconcile` (admin), `GET /api/cron/ielscourse` (Vercel Cron daily 01:00 UTC, `CRON_SECRET`), and the existing `POST /api/payments/midtrans/notification` now routes `IELS-C-` orders to IELScourse (membership unchanged).
- **Pages**: `/dashboard/courses` (My Courses: classes, renewals, join Collective/Studio by group, buy One, waiting list, payments with invoices/receipts), `/dashboard/courses/return`, `/dashboard/courses/invoice/[order]` (print / save as PDF), `/dashboard/admin/payments` (all orders with filters, totals per product, review queue, audit trail per order, re-check pending, renewals due, class groups and seats, Elco AI activations, waiting list). The tutoring workspace gets "Pay online" for the next due instalment. Sidebar: Discover → **My Courses**.
- `/products/courses`: when checkout is open, Join/package buttons go to My Courses and the FAQ describes online payment; while closed the page keeps the WhatsApp flow. The page decides at build time, so **redeploy after changing the variables**.
- Manual bank transfer is no longer the standard: it remains in the mentor dashboard as an exception and is blocked while an online payment for the same instalment is open.

## 3. Production configuration required (names only)

IELSco Vercel project that serves www.ielsco.com (team ielscommunity), Production environment:

| Variable | Value |
|---|---|
| `MIDTRANS_ENV` | `production` |
| `MIDTRANS_PRODUCTION_ENABLED` | `true` |
| `MIDTRANS_PRODUCTION_SERVER_KEY` | Elco's production Server Key (secret; copy the value from Elco's Railway service variables) |
| `MIDTRANS_PRODUCTION_CLIENT_KEY` | Elco's production Client Key (`Mid-client-bx73…`, from the same Railway service) |
| `IELSCOURSE_CHECKOUT_ENABLED` | `true` (the on/off switch; notifications for existing orders are still verified when it's off) |
| `CRON_SECRET` | a random string ≥ 16 characters (daily reconcile + renewal reminders) |

`MEMBERSHIP_CHECKOUT_ENABLED` must stay unset (legacy membership stays off). Copy the keys in the Vercel/Railway dashboards yourself; never paste them in chat, code or docs. Midtrans dashboard: no change needed (the override header sets the URL per transaction).

## 4. Decisions for the founder

1. **Merchant account: DECIDED 22 Nov 2026 by the founder — use Elco AI's existing Midtrans production merchant.** IELScourse uses the same `MIDTRANS_PRODUCTION_SERVER_KEY` / `MIDTRANS_PRODUCTION_CLIENT_KEY` values as Elco's Railway service. Snap and bank statements show the Elco merchant name and settlement lands in that account; IELScourse orders stay separable by their `IELS-C-` ids and `custom_field1 = product:ielscourse_*`.
2. Elco AI for Collective/Studio is recorded as "being activated" until the team grants it in Elco and clicks *Mark granted* (no automatic Elco grant: which Elco plan the membership includes is not decided).
3. Refund policy text (refunds are made in the Midtrans dashboard; IELSco then ends the month and puts the order in the review queue automatically).

## 5. Tests (all local, no real money, no Sandbox)

- `tests/db/ielscourse-payments.pglite.mjs`: 63 scenarios (capacity, seat holds, renewals, refunds, over-capacity, One instalments, RLS, permissions). Existing `tests/db/tutoring-platform.pglite.mjs` with this migration: 45/45.
- `tests/e2e/ielscourse-payments.e2e.mjs`: 26 checks running the real service against the local Postgres stub and fake Midtrans (forged signature, unknown order, claimed-but-unsettled status, amount tampering, duplicate notification, missed notification → reconcile, refund).
- `tests/ielscourse-gateway.test.mjs` in `npm test` (307/307).

## 6. Going live (in order)

1. Merge the PR (the Supabase integration applies the migration), set the variables, redeploy.
2. `GET https://www.ielsco.com/api/ielscourse/config` → `"enabled": true, "environment": "production"`.
3. Admin: `/dashboard/admin/payments` → create a class group with its confirmed schedule (status Open).
4. Signed in, start a checkout and close the Snap window without paying: an order appears as *Waiting for payment* and expires; nothing is charged. This proves the production keys and Snap.
5. First real payment (founder-approved, smallest amount, e.g. a real Starter or Collective purchase): confirm in the admin audit trail that the notification arrived with a valid signature and the order became Paid with a receipt. Only then announce online payment.

## 7. Classroom (added 23 Nov 2026, migration 20261212000000)

Collective and Studio groups now have a classroom: `course_class_sessions`, `course_attendance`, `course_materials`, `course_announcements`, `course_progress_notes`, and `course_cohorts.tutor_id`. Additive; rollback `supabase/manual/ROLLBACK-20261212-ielscourse-classroom.sql`.
- Admin assigns a tutor (an active mentor) per group. Tutors see and manage only their groups and never see payments; admins see all.
- Teach page `/dashboard/courses/teach`: add or cancel sessions, mark attendance (only students whose paid month covers the session), share materials (https links), post announcements (members are notified), write per-student progress feedback.
- My Courses shows each paying student their upcoming sessions, announcements, materials, own attendance and own feedback. Access ends when the paid month ends.
- Tests: `tests/db/ielscourse-classroom.pglite.mjs` 28/28; payments 63/63 and tutoring 45/45 unchanged. Teach and My Courses were exercised in a browser against the local database (tutor flow and student view, desktop and mobile width).

## 8. Go-live log
- 23 Nov 2026: founder reports the production variables are set on the IELSco Vercel project. This docs-only change redeploys production so the variables take effect (Vercel applies changed variables only to new deployments, and `/products/courses` reads the checkout switch at build time).
