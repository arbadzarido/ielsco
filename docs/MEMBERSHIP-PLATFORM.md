# IELSco membership platform (October 2026)

What changed, why, and what still needs a decision or an operator action before it goes live.
Branch: `feat/membership-platform` (PR #8, includes the SEO work from PR #7).

## 1. Positioning

**IELSco** = international opportunities, plus the people and preparation to go after them (scholarships, fellowships,
programs; community; application support). **Elco AI** = the separate AI English-learning product. IELSco links to
Elco where English practice is relevant; membership does **not** include Elco plans, and IELSco does not rebuild any
Elco feature. The Elco robot stays the shared mascot; the old owl is retired everywhere.

## 2. Free account vs membership

| | Free account | IELS Member |
|---|---|---|
| Opportunity board + filters | ✓ | ✓ |
| Track opportunities | up to 10 (DB trigger) | unlimited |
| IELS Circle weekly sessions | ✓ (unchanged, stays free) | ✓ |
| Free resources, directory, public events | ✓ | ✓ |
| Live member sessions (clinics, interview practice) | – | ✓ (`register_member_session`) |
| Written feedback on one document | – | 1 per rolling 90 days (`request_feedback`) |
| Study buddy matching (peer, not mentoring) | – | ✓ (`request_buddy`, staff match by hand) |
| Private member group link | – | ✓ (`member_links`, RLS) |

Why these benefits: each is something IELSco controls and can deliver with a small team (sessions are batched,
feedback is capped, buddy matching is manual but cheap, the group is self-sustaining). Rejected for launch: named mentor
office hours (no confirmed mentor capacity), bundling courses or GIF (breaks their own revenue), Elco Pro access
(different cost base), deadline e-mails (outgoing e-mail is not configured: `lib/email.ts` is disabled).

## 3. Pricing (PROPOSED, not approved)

| Plan | Price | ≈ per month |
|---|---|---|
| 3 months | Rp129.000 | Rp43.000 |
| 12 months | Rp399.000 | Rp33.000 |

Reasoning: one paid tier is enough until demand is known. 3 months matches the Circle cohort rhythm and the 90-day
feedback cap; there is no 1-month plan because it would let people buy one feedback review for a month's price.
Anchors: the retired IELS Lounge was Rp50.000/month; Elco Starter/Pro are Rp69.000/Rp99.000 per month for AI usage, so
human support capped like this sits below them. Payment is one-time per period (no recurring billing is configured in
Midtrans), so "no automatic renewal" is stated everywhere.

The plans are seeded with `billing_enabled = false`. Prices appear publicly only when
`NEXT_PUBLIC_MEMBERSHIP_PRICES_PUBLIC=true`; until then `/membership` collects a founding-member waitlist.

## 4. Decisions needed from the owner

1. **Approve or change the prices** above (then `update public.membership_plans set price_idr=…, billing_enabled=true`).
2. **Session cadence** you can keep (then set `APPROVED_CADENCE` in `src/data/membership.ts`). Until then the page says
   "published at least two weeks ahead" without a number.
3. **Feedback turnaround** "we aim to reply within 7 days" and the **3-working-day reply** promise on the Partners and
   Schools forms: confirm the team can keep them.
4. **Refund policy wording** in the membership FAQ, and add membership to the Terms of Service before charging.
5. **Midtrans merchant**: same account as Elco, or a separate one (see §6).
6. **Unverified claims left on the Circle page**: "19K+ learners & teachers / 93% from Southeast Asia". Confirm the
   source or remove them. (The AI-looking "Linh / Rafi / Sokha" testimonials and the "+19k" collage were replaced with
   real, published member stories and a real photo.)
7. **Recruitment**: the next Associate intake (set `RECRUITMENT.open` and `applyUrl` in `src/data/careers/recruitment.ts`).

## 5. Database (migration `20261026000000_membership_platform.sql` + `20261026010000_opportunities_seed.sql`)

Additive only. New tables: `membership_plans`, `membership_orders`, `membership_periods`,
`membership_payment_notifications`, `member_links`, `member_sessions`, `member_session_registrations`,
`feedback_requests`, `buddy_requests`, `opportunities`, `opportunity_tracker`, `inquiries`. Functions:
`is_site_admin`, `is_active_member`, `my_membership`, `apply_membership_payment` (service role only),
`grant_staff_membership`, `admin_membership_roster`, `list_member_sessions`, `register_member_session`,
`member_session_join_url`, `request_feedback`, `request_buddy`, `pause_buddy`, `submit_inquiry`.
The legacy Mayar tables (`memberships`, `transactions`) are not touched. Tests: `tests/db/membership.pglite.mjs`
(65 checks: idempotent re-run, RLS, payment state machine, caps, flood control).

Seeded opportunities: 12 long-running programs with official links only. No deadlines or eligibility were invented;
each says "check the official page" until staff verify the current cycle in Dashboard → Admin → Opportunity board.

## 6. Payments (Midtrans Snap)

Same design as Elco's reviewed `backend/payments.py`, ported to Next.js route handlers:

- `POST /api/membership/orders` (signed in): price from the database, server-side order id `IELS-M-…`, Snap token. A
  second click reuses the open order.
- `POST /api/payments/midtrans/notification`: SHA-512 signature check, then the status is **re-read from Midtrans**, then
  `apply_membership_payment()` (row lock, amount/currency check, idempotent; refunds/cancellations end access;
  late "pending" after payment is ignored). Every notification is logged without personal data.
- `GET /api/membership/orders/:id?refresh=1`: the return page asks the server; the redirect is never trusted.
- Every Snap request sends `X-Override-Notification` with IELSco's own URL, so a shared merchant account never sends
  IELSco notifications to Elco's API (and Elco's dashboard setting stays as it is).
- Renewals start when the current period ends. No recurring billing.

Environment variables (server unless noted):

| Name | Value |
|---|---|
| `MEMBERSHIP_CHECKOUT_ENABLED` | `true` to allow checkout at all (default off) |
| `MIDTRANS_ENV` | `sandbox` or `production` |
| `MIDTRANS_SANDBOX_SERVER_KEY` / `MIDTRANS_SANDBOX_CLIENT_KEY` | Sandbox keys |
| `MIDTRANS_PRODUCTION_SERVER_KEY` / `MIDTRANS_PRODUCTION_CLIENT_KEY` | only after approval |
| `MIDTRANS_PRODUCTION_ENABLED` | `true` only after a controlled production test |
| `SUPABASE_SERVICE_ROLE_KEY` | required (orders and payment verification) |
| `NEXT_PUBLIC_APP_URL` | `https://ielsco.com` (finish and notification URLs) |
| `NEXT_PUBLIC_MEMBERSHIP_PRICES_PUBLIC` | `true` once prices are approved |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` once Vercel Web Analytics is switched on |

Tested locally against a fake Midtrans (`workspace/local-stack/tests/fake-providers.mjs`): order creation and reuse,
server-side price, bad JSON/unknown order/forged signature rejected, re-read status overriding a notification's claim,
single activation, idempotent duplicate, return page. **Not tested against the real Midtrans Sandbox** (no Sandbox keys
are available to this workspace).

## 7. Production database record

- **2026-10-25:** `20261026000000_membership_platform` and `20261026010000_opportunities_seed` applied to the production
  project `hkubzamchahvdpvojepc` with `supabase db push` (dry run first; it listed exactly these two). Recorded in
  `supabase_migrations.schema_migrations`, so the GitHub integration treats them as applied on merge.
- Verified afterwards: a catalog diff of `public` shows 79 added objects and **no existing object changed**; all 12 new
  tables have RLS on; anonymous REST calls can read plans (billing off) and the 12 published opportunities, and are
  denied on inquiries, member links, orders, sessions and the privileged functions.
- Rollback (emergency only; deletes everything these migrations created): `supabase/manual/ROLLBACK-20261026-membership-platform.sql`,
  tested by `tests/db/membership-rollback.pglite.mjs`.

## 8. Operator checklist before charging anyone

1. Set the Sandbox env vars on a Vercel preview, run one Sandbox payment with Midtrans's simulator, check the order turns
   `paid` and the dashboard shows member tools.
2. Add the private group link (Admin → Operations → Member links) and the first member sessions.
3. Approve prices (§4), set `billing_enabled`, then production keys + `MIDTRANS_PRODUCTION_ENABLED=true`.
4. When a membership ends, remove the person from the external group (roster lists "expired").

## 9. Analytics

`src/lib/analytics.ts` sends Vercel Web Analytics custom events (CTA clicks, inquiry submitted, opportunity saved /
status changed, checkout started, payment returned, session registered, feedback and buddy requested) only when
`NEXT_PUBLIC_ANALYTICS_ENABLED=true`. Custom events need Vercel Web Analytics on a paid plan. The authoritative funnel
numbers (orders, paid periods, renewals, registrations, inquiries) are in the database tables above.
