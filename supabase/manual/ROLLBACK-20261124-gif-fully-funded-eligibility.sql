-- ROLLBACK for 20261124000000_gif_fully_funded_eligibility (+ 20261124000100 activation).
-- DESTRUCTIVE for eligibility data: drops anonymous messages, verification reviews/requests and the scoring config. Export first
-- (/api/gif/admin/export?report=eligibility). Submissions to Reels / Story activation / Feedback / Letters stay in gif_submissions
-- but their tasks are deactivated. Day 1–4 programme data is not touched.
begin;
update public.gif_assignments set is_active = false where track = 'eligibility';
drop table if exists public.gif_messages, public.gif_verification_requests, public.gif_eligibility_reviews,
  public.gif_eligibility_requirements, public.gif_eligibility_categories cascade;
drop function if exists public.gif_message_recipients(), public.gif_send_message(uuid, text, text, boolean), public.gif_my_received_messages(),
  public.gif_my_sent_messages(), public.gif_update_received_message(uuid, boolean, boolean, boolean), public.gif_wall_messages(),
  public.gif_admin_messages(), public.gif_admin_moderate_message(uuid, boolean, text, text), public.gif_signals_for(uuid[]),
  public.gif_my_eligibility_signals(), public.gif_admin_eligibility_signals(), public.gif_eligibility_review_guard(),
  public.gif_eligibility_review_notify(), public.gif_verification_request_guard(), public.gif_eligibility_touch();
drop trigger if exists gif_submission_ratings_trg on public.gif_submissions;
drop function if exists public.gif_submission_ratings_ok();
-- gif_assignments.track / window_label and gif_assignment_label() can stay (harmless); the notification functions keep working.
commit;
