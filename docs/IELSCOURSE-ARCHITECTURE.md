# IELScourse: product architecture and delivery phases (22 Nov 2026)

Brand IELScourse, tagline "Learn English. Practice Daily. Connect Globally." Mentor identity unchanged: Arbadza Rido — Lead English Mentor & Founder of IELSco and Elco AI.

| | Collective | Studio | One |
|---|---|---|---|
| Format | Public group, up to 20 | Small group, 3 to 5 | Private 1-on-1 |
| Price | Rp199,000 a month | Rp399,000 a month | Rp179,000 / 329,000 / 599,000 per package |
| Live sessions | 3 a week (target 12 a month) | 1 a week (target 4 a month) | 2, 4 or 8 by package |
| Model | Recurring monthly membership, assigned to a cohort | Recurring monthly membership, assigned to a cohort | Fixed-session package, student proposes, mentor confirms |
| Elco AI | While membership active | While membership active | 1 month |
| IELS Circle | Included | Included | With package |
| Payment | Monthly invoice, full, manual verification | Monthly invoice, full, manual verification | Full, or deposit 50/25/25 on Intensive |

Prices, the Wednesday/Saturday community sessions and the inclusions are from the founder's brief of 22 Nov 2026. Unit economics: `docs/IELSCOURSE-UNIT-ECONOMICS.md`.

## Phase 1 (this release): public page
`/products/courses` now presents all three products (hero, cards, comparison with a stacked mobile layout, "which fits you", Collective and Studio sections, One unchanged below, merged FAQ). Collective and Studio use a **registration by WhatsApp** flow: no place is held until payment is verified and the team confirms a cohort with an open schedule; otherwise the customer is waitlisted. No self-serve purchase exists, so nobody can buy a cohort without a schedule. GIF eligibility is deliberately NOT shown on the page (see below). IELScourse One (packages, deposit, `/dashboard/tutoring`, mentor dashboard) is untouched.

## Phase 2: data model for memberships and cohorts (not built)
Reuse `auth.users`, `staff_roles`, `tutoring_mentors` (as the tutor registry), the invoice/instalment/payment/receipt tables, `tutoring_notifications`, `tutoring_audit`. Proposed additions, all additive:
- `course_products` (collective, studio, one) and `course_plans` (price, billing period, sessions per month).
- `course_memberships` (student, plan, status pending_payment/active/expired/cancelled, period_start, period_end, renewal_of) with one row per month paid.
- `course_cohorts` (product, tutor, capacity 20 or 5, status open/full/closed, recurring schedule), `course_cohort_members`, `course_sessions` (generated class sessions, meeting link), `course_attendance`, `course_materials`, `course_announcements`, `course_feedback`, `course_waitlist`.
- Payments: generalise `tutoring_instalments/payments/receipts` with an optional `membership_id` (a monthly invoice is one full instalment), keeping the verify-before-activate rule. Capacity enforced by a trigger plus a unique member per cohort, with RLS identical in spirit to tutoring (students read their own rows, staff manage).
- One enrolments stay in `tutoring_*`; the dashboard "My Courses" merges both sources so a student can hold several products without a second account.

## Phase 3: dashboards (not built)
Student "My Courses" hub (Collective, Studio, One tabs shown by active enrolment), schedule, attendance, materials, announcements, renewal, payments. Admin: cohort creation, capacity, student and tutor assignment, attendance, waitlist, revenue by product, renewals due.

## Decisions needed
1. Real tutor rate for Collective/Studio and mentor rate for One (see unit economics; One loses money above about Rp70,000 per session).
2. Session length (proposed: Studio 75 minutes; Collective to confirm).
3. Whether Collective and Studio classes already exist. The page promises no start date; add cohort dates once real.
4. GIF: shown only when the programme is open to the buyer, terms are confirmed and the student is eligible. Not on the page until you confirm current GIF status; never a selection promise.
5. Elco AI activation stays manual (admin records grant and expiry).
