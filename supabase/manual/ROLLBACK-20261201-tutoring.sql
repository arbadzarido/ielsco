-- Rollback for 20261201000000_tutoring_platform.sql. The migration only ADDS objects, so rollback only drops them.
-- BACK UP FIRST (pg_dump of the tutoring_* tables) if any real enrolments or payments exist: this destroys them.
drop function if exists public.tutoring_add_block(timestamptz, timestamptz, text), public.tutoring_set_availability(jsonb), public.tutoring_add_note(uuid, text),
  public.tutoring_set_roadmap(uuid, jsonb), public.tutoring_complete_session(uuid, int, text, text[], text, text, text, text, text), public.tutoring_cancel_booking(uuid, text, boolean),
  public.tutoring_accept_alternative(uuid), public.tutoring_decide_booking(uuid, text, timestamptz, timestamptz, text), public.tutoring_request_booking(uuid, jsonb, text, text),
  public.tutoring_submit_goals(uuid, text, text, text, text, date, text, text), public.tutoring_set_elco_access(uuid, text, timestamptz), public.tutoring_flag_overdue(),
  public.tutoring_verify_payment(uuid, text, text), public.tutoring_record_agreement(uuid), public.tutoring_create_enrolment(uuid, uuid, text, text, date, date),
  public.tutoring_sessions_unlocked(uuid), public.tutoring_notify(uuid, text, text), public.tutoring_audit_log(text, text, uuid, jsonb),
  public.tutoring_is_staff(), public.tutoring_is_mentor(), public.tutoring_is_admin();
drop table if exists public.tutoring_audit, public.tutoring_notifications, public.tutoring_session_records, public.tutoring_bookings, public.tutoring_blocks,
  public.tutoring_availability, public.tutoring_mentor_notes, public.tutoring_roadmap_stages, public.tutoring_goals, public.tutoring_receipts, public.tutoring_payments,
  public.tutoring_instalments, public.tutoring_invoices, public.tutoring_enrolments, public.tutoring_mentors;
drop sequence if exists public.tutoring_invoice_seq, public.tutoring_receipt_seq;
-- btree_gist is left installed (other objects may use it).
