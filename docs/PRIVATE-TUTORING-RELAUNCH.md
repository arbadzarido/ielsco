# Private Tutoring relaunch: pricing and decisions

Page: `/products/courses` (src/app/products/courses/page.tsx). All package figures live in
`src/components/tutoring/packages.ts`; mentor identity in `src/data/courses.ts` (MENTORS) and `MENTOR_TITLE`.

## Proposed prices (NEED FOUNDER APPROVAL BEFORE RELEASE)

Reference: single session Rp90,000 (unchanged). Elco AI Starter list price Rp69,000 per month (Elco billing config,
backend migration 015; confirm on elcoai.com/pricing, Elco billing was still Sandbox on 4 Nov).

| Package | Sessions | Price | Per session | Bought separately* | Saving |
|---|---:|---:|---:|---:|---:|
| Starter | 2 | Rp179,000 | Rp89,500 | Rp249,000 | Rp70,000 |
| Growth (recommended) | 4 | Rp329,000 | Rp82,250 | Rp429,000 | Rp100,000 |
| Intensive | 8 | Rp599,000 | Rp74,875 | Rp789,000 | Rp190,000 |

*sessions at Rp90,000 + 1 month Elco Starter Rp69,000.

Assumptions: the mentor's session rate is discounted at most ~17% (Intensive), the same ceiling Elco uses for its
6-month plan, so the mentor is never presented as cheap. Starter sessions are effectively at list price; the free Elco
month is the incentive. Elco's marginal cost per month is mostly AI usage (see Elco docs/ops/COST_MODEL.md); mentor time is
the real cost, so check Intensive at Rp74,875 per session against the mentor payout before approving.

**Status 22 Nov 2026: founder APPROVED these prices.**

## Payment options (approved 22 Nov 2026)
- Option A, full payment: any package; activated after payment verification.
- Option B, deposit + instalments: ONLY packages of more than 4 sessions (Intensive). 50% deposit before the first session is
  scheduled; 25% after the 2nd completed session; 25% before the final two sessions or before the exam/application deadline,
  whichever comes first. Intensive: Rp299,500 / Rp149,750 / Rp149,750 = Rp599,000 (same total, not a discount).
- Gates: no scheduling and no Elco AI activation before the deposit is verified; sessions 3-6 after instalment 1 is verified;
  sessions 7-8 after instalment 2. Agreement to the schedule is obtained before the booking is confirmed.
- Code: `src/lib/tutoring/payments.ts` (rules, schedule, ledger, session gating), `documents.ts` (invoice and receipt HTML),
  tests in `tests/tutoring-payments.test.mjs`. Samples and tracker in `output/private-tutoring-relaunch/templates/`.
- NOT built: a database table or admin screen. Tutoring payments are still manual (WhatsApp + bank transfer); the tracker CSV
  holds the ledger fields until a table is approved. The GIF invoice system is GIF-specific and was not reused.

## Remaining decisions (original list; items 1 is done)
1. Approve or change the three prices.
2. Which Elco plan is granted: Starter assumed (Pro includes monthly mentoring and would overlap).
3. How the free Elco month is activated (manual grant by an admin, partner grant API, or code) and when it starts
   (at payment, or at first session). The page says the team activates it after booking is confirmed.
4. Session validity window and rescheduling rules (not stated on the page beyond "tell us in advance").
5. Circle: the page promises only the IELS Circle speaking club that comes with Elco Starter (12 sessions a month, after
   linking accounts) and the free open sessions. Confirm this wording.
6. Payment method (page says bank transfer, as before) and whether Midtrans should be used.
7. Mentor photo: `/images/people/leadership/arbadza.png` (the About page photo) is used. The old tutoring data pointed to
   `/images/people/directors/arba.png`, which looks like a different photo; confirm the right one.
8. Shared mentor data in `courses.ts` was changed to the approved title and credentials; it previously listed TEFL/TESL ASU,
   Pertamina and TOEFL iBT 110+, which were removed because they were not in the brief. Re-add only if verified.
