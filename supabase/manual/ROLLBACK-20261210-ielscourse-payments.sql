-- Rollback for 20261210000000_ielscourse_payments.sql. Run only if NO real IELScourse payment exists
-- (select count(*) from public.course_payment_orders where status in ('paid','partially_refunded','refunded') must be 0).
-- Restores the original tutoring_verify_payment / tutoring_create_enrolment by re-running their definitions from
-- 20261201000000_tutoring_platform.sql (copy those two function bodies here before running).
begin;
drop function if exists public.course_admin_set_elco(uuid, text, text);
drop function if exists public.course_admin_resolve_review(text, text);
drop function if exists public.course_admin_save_cohort(uuid, text, text, int, text, text, date, text, text);
drop function if exists public.course_join_waitlist(text, text);
drop function if exists public.course_send_renewal_reminders();
drop function if exists public.course_expire_stale();
drop function if exists public.course_apply_payment(text, text, numeric, text, text, text, text, text);
drop function if exists public.course_self_enrol_one(uuid, text, text, date);
drop function if exists public.course_order_snap(text, text, text);
drop function if exists public.course_create_order(uuid, text, uuid, uuid, text, text, int, boolean);
drop function if exists public.course_seats_taken(uuid, uuid);
drop function if exists public.course_audit_log(uuid, text, text, text, jsonb);
drop table if exists public.course_payment_events, public.course_audit, public.course_seat_holds, public.course_entitlements,
  public.course_waitlist, public.course_memberships, public.course_payment_orders, public.course_cohorts, public.course_plans;
drop sequence if exists public.course_invoice_seq, public.course_receipt_seq;
alter table public.tutoring_payments drop constraint if exists tutoring_payments_verifier;
alter table public.tutoring_payments drop column if exists order_id;
-- verified_by NOT NULL is restored only if every row has a verifier:
-- alter table public.tutoring_payments alter column verified_by set not null;
-- Then re-create tutoring_verify_payment and tutoring_create_enrolment from 20261201000000 and drop the two *_core functions.
commit;
