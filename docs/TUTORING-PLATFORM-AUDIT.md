# Private Tutoring platform: audit, target schema, deployment

## 1. Audit of the existing implementation (22 Nov 2026, origin/main d5753a3)
- **No tutoring data model exists.** No migration mentions tutoring enrolments, bookings, sessions or tutoring payments. The "old flow" is
  static data (`src/data/courses.ts` COURSE_PACKAGES / MENTORS), the pages under `/dashboard/programs/courses/[track]`, and a WhatsApp
  request link. So there are no student, payment or package records to migrate or lose, and the new schema is purely additive.
- **Problems:** package/price data duplicated in code; no payment record, invoice or receipt; no access control tied to payment; no
  scheduling or session record; progress is not stored; mentor identity is static display data, not an account.
- **Auth and roles that exist and are reused:** Supabase auth; `public.staff_roles` (role 'admin'), already seeded for
  `arbadzarido03@gmail.com` by migration 20261019000000 when that verified account exists; Company OS roles and `gif.staff` are separate
  systems and are not reused. No email-hardcoded access is added: the new migration only *seeds a mentor row* for that verified account,
  and every permission is checked in the database by role.
- **Elco relationship:** Elco -> IELSco benefits flow through `elco_benefit_grants` / `apply_elco_benefit` (server to server, linked accounts).
  There is no verified IELSco -> Elco "grant one month of Starter" call for tutoring buyers. Therefore `tutoring_enrolments.elco_access_*`
  is set only by an admin (`tutoring_set_elco_access`) after the grant is made on Elco, and the dashboard may show only that recorded
  status and date. Wiring the Elco partner grant API (used for GIF) is a follow-up, not claimed here.

## 2. Target schema (migration `20261201000000_tutoring_platform.sql`, additive)
mentors, enrolments, invoices, instalments, payments, receipts, goals, roadmap stages, mentor notes, availability, blocks, bookings,
session records, notifications, audit. Users and profiles reuse `auth.users`; no duplicate user table.
- RLS on every table; no direct write grants; all writes via SECURITY DEFINER functions that check the caller.
- Students read only their own rows; mentors/admin read all; mentor notes and the audit trail are staff/admin-only.
- Only a staff admin verifies payments (`tutoring_verify_payment`), which issues the receipt and activates the package on the first
  verified payment, never automatically and never out of order. Overdue instalments are flagged `payment_review`, nothing is deleted.
- Session unlock rules in the database: full = all; deposit = 2 -> total-2 -> total as instalments are verified. Deposit is constrained to
  packages above 4 sessions.
- Booking: student proposes up to 5 slots; only mentor confirmation creates a booking; a GiST exclusion constraint makes double-booking
  impossible; blocked times are rejected; reschedule by proposal/accept; cancel/no-show require a reason; every change is audited.
- A session is deducted only in `tutoring_complete_session` (mentor/admin), which also writes the session record and notifies the student.

## 3. Test results
`tests/db/tutoring-platform.pglite.mjs` on PGlite: 39 of 39 pass, covering scenarios A (full payment to confirmed session), B (deposit,
ordering, unlock, receipts, overdue flag), C (completion deducts once, feedback visible), D (reschedule, no double-booking) and E (isolation,
admin-only verification, no direct writes). Also `tests/tutoring-payments.test.mjs` (7 pass). Not yet tested: UI, desktop/mobile, real Supabase.

## 4. Deployment and rollback
1. Take a backup (Supabase dashboard backup or `pg_dump`), confirm `arbadzarido03@gmail.com` is a verified user with the `staff_roles` row.
2. Apply with `supabase db push` (or the project's usual release step); the migration is additive and re-runnable for the seeds.
3. Verify: tables exist, `select tutoring_is_admin()` as the admin returns true, the mentor row exists.
4. Rollback: `supabase/manual/ROLLBACK-20261201-tutoring.sql` (drops only the new objects; back up first if real enrolments exist).
Production migrations need the founder's explicit go-ahead; nothing has been applied.

## 5. Dashboards (built 22 Nov 2026)
- Student workspace `/dashboard/tutoring` (src/components/tutoring/dashboard/Student.tsx): next action, package progress, onboarding form, booking
  (open slots + own proposal, timezone), roadmap, session history with feedback, payments with invoice/receipt downloads, Elco status, notifications.
- Mentor/admin `/dashboard/tutoring/mentor` (Mentor.tsx): overview stats, booking requests (confirm/propose/decline), week calendar, completion form
  (also cancel/no-show with reason), students list and profile (roadmap editor, private notes), payments (admin only: create invoice, record agreement,
  verify payment, record Elco grant, flag overdue), availability and blocked time. Sidebar: Discover > Private Tutoring.
- Verified in a browser against a local PGlite Supabase stand-in (full payment -> verify -> onboarding -> request -> confirm -> complete -> student sees
  feedback and 3 of 4 remaining), plus mobile width (no overflow). Deposit (B) and reschedule (D) are covered by the 45 database tests, not clicked through the UI.
- Migration 20261201010000 also adds tutoring_find_student, tutoring_roster, tutoring_open_slots and tutoring_mark_notifications_read.

## 6. Not built / limits
Email and WhatsApp notification delivery (in-dashboard only; WhatsApp stays manual), automatic Elco AI grant (admin records it), tutoring link on the public
page to the dashboard, a visual month calendar (week view only), PDF export of invoices (HTML download), production deploy and migration, and a real
Supabase test (only PGlite so far).
