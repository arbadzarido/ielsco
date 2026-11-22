# IELScourse on Midtrans: payment audit, readiness and proposed architecture (22 Nov 2026)

Status: SUPERSEDED by docs/IELSCOURSE-PAYMENTS.md (production-only implementation, 22 Nov 2026). The Sandbox steps below were dropped on the founder's instruction; kept for the audit history.

## 1. Current payment architecture (audit)

| Area | What exists | State |
|---|---|---|
| IELSco membership checkout | `src/lib/payments/midtrans.ts` (pure Snap + signature + status re-read), `POST /api/payments/midtrans/notification`, `src/lib/membership/server.ts`, tables `membership_orders`, `membership_periods`, `membership_payment_notifications` | Built and reviewed, tested only against a fake Midtrans. **Production has zero orders and zero notifications; both plans have `billing_enabled=false`.** Retired as a purchase path (IELSco has no own membership). |
| GIF Summer 2027 | `apps/gif/src/lib/payments/*`: Midtrans service, gateway, attempts, signature-key rotation, invoice requests, receipts; `GIF_MIDTRANS_*` env on the separate GIF Vercel project; fake-Midtrans e2e | Separate, working stack with its own keys and DB schema (`gif.*`). Leave alone. |
| Elco AI | `backend/payments.py` (FastAPI), Midtrans Sandbox as of 4 Nov; Railway variable `MIDTRANS_PRODUCTION_ENABLED` | The reviewed reference implementation. Production state not verified from here. |
| Mayar | Retired (`docs/MAYAR-RETIREMENT.md`); `MAYAR_*` variables still sit in the IELSco Vercel project | Remove later. |
| Private Tutoring | `tutoring_*` tables; admin verifies a bank transfer by hand (`tutoring_verify_payment`); invoice/receipt generated in the DB | Live. **No payment records exist** (the production scenario test was rolled back). |
| Legacy courses | `course_enrollments` (37 rows) and `course_sessions` (11), no payment columns | Untouched. |

Facts that matter for the redesign: the existing IELSco Midtrans module already implements the rules you asked for (server decides amount and order id, never trusts the redirect, SHA-512 signature check, re-reads status from Midtrans, idempotent activation, sandbox/production separation, per-request `X-Override-Notification` so a shared merchant account never sends IELSco events to Elco). It should be generalised, not rewritten.

## 2. Midtrans account readiness (what I could and could not check)

| Question | Answer |
|---|---|
| Account approved and activated? | **Unknown.** It can only be seen in the Midtrans dashboard; nothing in the repo or in Vercel records it. |
| Production credentials available? | **No evidence.** The IELSco Vercel project (`prj_F6zw22…`, production) has NO `MIDTRANS_*` variables and no `MEMBERSHIP_CHECKOUT_ENABLED`. Elco (Railway) and GIF (own Vercel project) were not inspected for production keys. |
| Payment methods enabled? | **Unknown** (dashboard setting). |
| Recurring payments? | **Do not assume.** To my knowledge Midtrans Subscription works only for cards and GoPay account linking, and needs separate activation; it does not cover bank-transfer virtual accounts or QRIS. Verify in the dashboard before building on it. Plan A: monthly checkout plus renewal reminders. |
| Existing integrations to reuse? | Yes: section 1 (IELSco module and notification route; GIF patterns for key rotation and attempts). |
| Fees | Not recorded. The 3% in the unit economics is a placeholder; real fees differ by method (virtual account flat fee, QRIS percentage, cards percentage plus fixed). Re-run the economics with the real rate card. |

Blocked until you supply: Sandbox server and client keys for the merchant you want to use (same as Elco or a new one), the production approval status, and the enabled methods.

## 3. Proposed unified payment architecture

One generic layer, product-specific fulfilment.

```
checkout (server action / API)  ->  payment_orders (our order id, amount decided server-side)
            |                                  |
            v                                  v
   Midtrans Snap token  ---- customer pays ---> Midtrans
                                               | server-to-server notification
                                               v
   POST /api/payments/midtrans/notification
      1 verify SHA-512 signature (+ optional key rotation)
      2 re-read status from Midtrans status API (authority)
      3 insert payment_events row (unique key = idempotency)
      4 transition payment_orders state machine
      5 on settlement/capture(accept): call fulfil(order) once
```

Fulfilment dispatcher (`fulfil(order)`), one function per product type, each idempotent and run with the service role:
- `one`: `tutoring_apply_payment(instalment, midtrans ref)`. This is the existing `tutoring_verify_payment` logic extracted so the webhook and the admin manual path share it (activation on first payment, receipt, session unlock, audit). Each instalment is its own order, so an Intensive deposit is three orders on one invoice and the outstanding balance updates per verified order.
- `collective`: create or extend a `course_memberships` period (start, expiry, renewal_of) and the Elco AI and IELS Circle entitlements, then notify.
- `studio`: convert a **seat hold** into a cohort membership (see below).
Frontend redirects (finish, unfinish, error) only show status read from our database; they never activate anything.

### Studio seat safety
`course_seat_holds(cohort_id, student_id, expires_at, order_id)` created in the same transaction as the order, taking `SELECT ... FOR UPDATE` on the cohort row and counting members plus unexpired holds against capacity. The last seat can only be held once; a hold lapses after the Snap order TTL; the webhook converts the hold or, if the hold expired and the cohort is full, flags the order for refund and admin review instead of overbooking. Checkout is refused for a cohort without a confirmed schedule.

### Status mapping
settlement, and capture with fraud_status accept -> `paid`; pending -> `pending`; deny, cancel, expire -> `failed|cancelled|expired`; refund and partial_refund -> `refunded|partially_refunded` (entitlements are flagged for admin review, never silently revoked); late pending after paid is ignored; capture with fraud challenge -> `review`.

### Admin payment centre
One page (`/dashboard/tutoring/mentor` payments area or `/dashboard/admin/payments`, admin only): all orders with product, student, invoice number, Midtrans transaction id, amount, method, status, paid time, refund status; filters by product, date, status, student; reconciliation button (re-query pending orders), audit trail, and the manual bank-transfer path kept as an exception tool only.

## 4. Database changes (additive)

- `payment_orders`: id, order_id (unique, `IELS-<P>-YYMMDD-XXXXXXXXXX`), product_type, product_ref (enrolment/instalment/membership/cohort), student_id, amount_idr, environment, status, snap_token, midtrans_transaction_id, payment_type, fraud_status, expires_at, paid_at, refunded_idr, fulfilled_at.
- `payment_events`: id, order_id, midtrans_transaction_id, transaction_status, status_code, signature_ok, raw (no personal data), created_at, unique (order_id, midtrans_transaction_id, transaction_status) for duplicate protection.
- `course_products`, `course_plans`, `course_memberships`, `course_cohorts`, `course_cohort_members`, `course_seat_holds`, and the attendance/materials tables from `IELSCOURSE-ARCHITECTURE.md`.
- `tutoring_instalments` gains nullable `payment_order_id`; `tutoring_payments.method` already free text; `tutoring_apply_payment()` extracted from `tutoring_verify_payment`.
- RLS: students read their own orders; no direct writes; webhook uses the service role; admin reads all.
- Legacy: `membership_orders` stays (empty in production); no records to migrate. Tutoring has no payment history yet; legacy course tables are untouched.

Migration and rollback: additive migrations only, each with a rollback file, run on a Supabase branch or a restored copy first; production applied only after a verified backup and Sandbox end-to-end pass, exactly as for the tutoring migrations.

## 5. Environment variables (names only, server-side except the client key)

`MIDTRANS_ENV` (`sandbox` or `production`), `MIDTRANS_SANDBOX_SERVER_KEY`, `MIDTRANS_SANDBOX_CLIENT_KEY`, `MIDTRANS_PRODUCTION_SERVER_KEY`, `MIDTRANS_PRODUCTION_CLIENT_KEY`, `MIDTRANS_PRODUCTION_ENABLED` (true only after the controlled production test), optional `MIDTRANS_SIGNATURE_KEYS` for key rotation, `COURSE_CHECKOUT_ENABLED` (replaces `MEMBERSHIP_CHECKOUT_ENABLED`), `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already set). The client key is the only value that may reach the browser (Snap.js); the server key never does. `MIDTRANS_TEST_BASE` is for local fakes only.

## 6. Implementation plan (safe order)

1. You provide Sandbox keys and confirm the merchant, methods and recurring availability.
2. Generalise `src/lib/payments/midtrans.ts` and the notification route to `payment_orders` plus the `fulfil()` dispatcher; unit-test with the existing fake Midtrans (forged signature, duplicate, late pending, refund, expiry).
3. One: extract `tutoring_apply_payment`, add the checkout buttons on the student dashboard (pay this instalment), keep manual verification as fallback; Sandbox end-to-end for Growth and for the three Intensive instalments.
4. Collective and Studio: data model, seat holds, checkout, membership periods, renewal reminders (in-dashboard now, WhatsApp manual).
5. Admin payment centre, reconciliation job (cron), audit.
6. Sandbox pass on a Vercel preview with the real Midtrans simulator, then a controlled production test with the smallest real payment you approve, then enable production.
Nothing reaches production before steps 1-6 pass and production credentials are confirmed.

## 7. Decisions and inputs needed
1. Sandbox keys, and whether to use Elco's merchant account (needs `X-Override-Notification`, already supported) or a separate one.
2. Production approval status and enabled payment methods; confirm the fee rate card.
3. Studio billing: monthly (assumed) or per cohort period.
4. Refund policy (who decides, whether sessions already delivered are deducted).
5. Whether GIF stays on its own Midtrans stack (recommended for now).
