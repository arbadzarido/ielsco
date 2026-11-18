-- ROLLBACK for 20261122000000_gif_assessment_portal + 20261122000100_gif_story_retention_cron.
-- DESTRUCTIVE: drops every GIF assignment, submission, file record, assessment and notification. Export CSVs first.
-- Storage objects in gif-story-proofs / gif-submission-files must be emptied in the dashboard before the buckets can be removed.
-- public.gif_delegates and the existing gif-2026-documents bucket are NOT touched.
begin;
select cron.unschedule('gif-story-retention-daily') where exists (select 1 from cron.job where jobname = 'gif-story-retention-daily');
drop policy if exists "gif story proofs: upload own" on storage.objects;
drop policy if exists "gif story proofs: read own or admin" on storage.objects;
drop policy if exists "gif story proofs: delete own while open" on storage.objects;
drop policy if exists "gif submission files: upload while open" on storage.objects;
drop policy if exists "gif submission files: read if submission visible" on storage.objects;
drop policy if exists "gif submission files: delete while open" on storage.objects;
drop table if exists public.gif_retention_runs, public.gif_notifications, public.gif_assessments, public.gif_submission_files,
  public.gif_submissions, public.gif_assignments, public.gif_programme_days, public.gif_team_members, public.gif_teams, public.gif_admins cascade;
drop function if exists public.gif_retention_secret_ok(text), public.gif_submission_missing(uuid), public.gif_submission_guard(),
  public.gif_submission_after(), public.gif_file_guard(), public.gif_assessment_before(), public.gif_assessment_after(), public.gif_touch_updated(),
  public.gif_notification_guard(), public.gif_admin_roster(), public.gif_my_team(), public.gif_can_edit_submission(uuid),
  public.gif_can_view_submission(uuid), public.gif_my_team_id(), public.gif_my_delegate_id(), public.gif_is_admin(), public.gif_try_uuid(text);
delete from vault.secrets where name in ('gif_retention_cron_secret', 'gif_project_url');
commit;
-- then: delete buckets gif-story-proofs and gif-submission-files (Storage dashboard), and the Edge Function gif-story-retention.
