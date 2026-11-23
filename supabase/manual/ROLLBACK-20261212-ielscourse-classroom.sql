-- Rollback for 20261212000000_ielscourse_classroom.sql (drops only what it added). Back up the five tables first if they hold data.
drop function if exists public.course_my_teaching(), public.course_roster(uuid), public.course_add_progress_note(uuid, uuid, text),
  public.course_post_announcement(uuid, text, text), public.course_remove_material(uuid), public.course_add_material(uuid, text, text, text),
  public.course_record_attendance(uuid, uuid, text, text), public.course_save_session(uuid, uuid, timestamptz, timestamptz, text, text, text),
  public.course_admin_set_tutor(uuid, uuid);
drop policy if exists course_cohorts_read_tutor on public.course_cohorts;
drop table if exists public.course_progress_notes, public.course_announcements, public.course_materials, public.course_attendance, public.course_class_sessions;
drop function if exists public.course_can_teach(uuid), public.course_is_member(uuid);
alter table public.course_cohorts drop column if exists tutor_id;
