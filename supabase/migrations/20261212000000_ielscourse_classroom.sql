-- IELScourse classroom for Collective and Studio groups: tutor assignment, class sessions, attendance, materials,
-- announcements and per-student progress notes. ADDITIVE ONLY (one nullable column on course_cohorts plus new tables and
-- functions). Rollback: supabase/manual/ROLLBACK-20261212-ielscourse-classroom.sql.
--
-- Permissions: admins (staff_roles 'admin') manage every group and assign tutors. A tutor (an active tutoring_mentors row)
-- manages only the groups assigned to them and never sees payments. Students read only the groups they have paid for, and
-- only their own attendance and progress notes. All writes go through the SECURITY DEFINER functions below.

alter table public.course_cohorts add column if not exists tutor_id uuid references auth.users(id);

-- A student counts as a member of a group while they hold an active, unexpired paid period in it (an upcoming renewal included).
create or replace function public.course_is_member(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_memberships m where m.cohort_id = p_cohort and m.student_id = (select auth.uid())
    and m.status = 'active' and m.period_end > now())
$$;

create or replace function public.course_can_teach(p_cohort uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.tutoring_is_admin() or exists (
    select 1 from public.course_cohorts c join public.tutoring_mentors t on t.user_id = c.tutor_id and t.is_active
    where c.id = p_cohort and c.tutor_id = (select auth.uid()))
$$;

create table if not exists public.course_class_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  topic text check (topic is null or length(topic) <= 200),
  meeting_url text check (meeting_url is null or meeting_url ~ '^https://'),
  status text not null default 'scheduled' check (status in ('scheduled', 'held', 'cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (cohort_id, starts_at)
);
create index if not exists course_class_sessions_cohort on public.course_class_sessions (cohort_id, starts_at);

create table if not exists public.course_attendance (
  session_id uuid not null references public.course_class_sessions(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('present', 'late', 'absent', 'excused')),
  note text check (note is null or length(note) <= 300),
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  title text not null check (length(trim(title)) between 2 and 140),
  url text not null check (url ~ '^https://'),
  note text check (note is null or length(note) <= 300),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);

create table if not exists public.course_announcements (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  title text not null check (length(trim(title)) between 2 and 140),
  body text not null check (length(trim(body)) between 2 and 2000),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.course_progress_notes (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (length(trim(note)) between 2 and 1500),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists course_progress_notes_student on public.course_progress_notes (student_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['course_class_sessions','course_attendance','course_materials','course_announcements','course_progress_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- Tutors also see the groups assigned to them (members and admins already can, via course_cohorts_read).
create policy course_cohorts_read_tutor on public.course_cohorts for select to authenticated using (tutor_id = (select auth.uid()));
create policy course_class_sessions_read on public.course_class_sessions for select to authenticated using (public.course_is_member(cohort_id) or public.course_can_teach(cohort_id));
create policy course_materials_read on public.course_materials for select to authenticated using (removed_at is null and (public.course_is_member(cohort_id) or public.course_can_teach(cohort_id)));
create policy course_announcements_read on public.course_announcements for select to authenticated using (public.course_is_member(cohort_id) or public.course_can_teach(cohort_id));
create policy course_attendance_read on public.course_attendance for select to authenticated using (
  student_id = (select auth.uid()) or exists (select 1 from public.course_class_sessions s where s.id = session_id and public.course_can_teach(s.cohort_id)));
create policy course_progress_notes_read on public.course_progress_notes for select to authenticated using (student_id = (select auth.uid()) or public.course_can_teach(cohort_id));

-- ── Admin: assign a tutor (must be an active mentor) ──────────────────────────────────────────────────────────────────
create or replace function public.course_admin_set_tutor(p_cohort uuid, p_tutor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_tutor is not null then
    select display_name into v_name from public.tutoring_mentors where user_id = p_tutor and is_active;
    if v_name is null then raise exception 'not_a_tutor'; end if;
  end if;
  update public.course_cohorts set tutor_id = p_tutor, tutor_name = coalesce(v_name, tutor_name), updated_at = now() where id = p_cohort;
  if not found then raise exception 'not_found'; end if;
  perform public.course_audit_log((select auth.uid()), 'tutor_assigned', 'cohort', p_cohort::text, jsonb_build_object('tutor', p_tutor));
end $$;

-- ── Tutor or admin: class sessions ────────────────────────────────────────────────────────────────────────────────────
create or replace function public.course_save_session(p_id uuid, p_cohort uuid, p_starts timestamptz, p_ends timestamptz, p_topic text, p_url text, p_status text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.course_can_teach(p_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('scheduled', 'held', 'cancelled') then raise exception 'bad_status'; end if;
  if p_id is null then
    insert into public.course_class_sessions (cohort_id, starts_at, ends_at, topic, meeting_url, status, created_by)
      values (p_cohort, p_starts, p_ends, nullif(trim(p_topic), ''), nullif(trim(p_url), ''), p_status, (select auth.uid())) returning id into v;
  else
    update public.course_class_sessions set starts_at = p_starts, ends_at = p_ends, topic = nullif(trim(p_topic), ''), meeting_url = nullif(trim(p_url), ''), status = p_status
      where id = p_id and cohort_id = p_cohort returning id into v;
    if v is null then raise exception 'not_found'; end if;
  end if;
  perform public.course_audit_log((select auth.uid()), 'session_saved', 'cohort', p_cohort::text, jsonb_build_object('session', v, 'status', p_status));
  return v;
end $$;

-- Attendance only for students with a paid period that covers the session.
create or replace function public.course_record_attendance(p_session uuid, p_student uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.course_class_sessions;
begin
  select * into s from public.course_class_sessions where id = p_session;
  if s.id is null then raise exception 'not_found'; end if;
  if not public.course_can_teach(s.cohort_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('present', 'late', 'absent', 'excused') then raise exception 'bad_status'; end if;
  if not exists (select 1 from public.course_memberships m where m.cohort_id = s.cohort_id and m.student_id = p_student and m.status = 'active'
                 and m.period_start <= s.starts_at and m.period_end > s.starts_at) then raise exception 'not_enrolled'; end if;
  insert into public.course_attendance (session_id, student_id, status, note, recorded_by)
    values (p_session, p_student, p_status, nullif(trim(p_note), ''), (select auth.uid()))
    on conflict (session_id, student_id) do update set status = excluded.status, note = excluded.note, recorded_by = excluded.recorded_by, recorded_at = now();
  update public.course_class_sessions set status = 'held' where id = p_session and status = 'scheduled';
end $$;

-- ── Tutor or admin: materials, announcements, progress notes ──────────────────────────────────────────────────────────
create or replace function public.course_add_material(p_cohort uuid, p_title text, p_url text, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.course_can_teach(p_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.course_materials (cohort_id, title, url, note, created_by) values (p_cohort, trim(p_title), trim(p_url), nullif(trim(p_note), ''), (select auth.uid())) returning id into v;
  return v;
end $$;

create or replace function public.course_remove_material(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_cohort uuid;
begin
  select cohort_id into v_cohort from public.course_materials where id = p_id;
  if v_cohort is null or not public.course_can_teach(v_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.course_materials set removed_at = now() where id = p_id;
end $$;

create or replace function public.course_post_announcement(p_cohort uuid, p_title text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid; r record;
begin
  if not public.course_can_teach(p_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.course_announcements (cohort_id, title, body, created_by) values (p_cohort, trim(p_title), trim(p_body), (select auth.uid())) returning id into v;
  for r in select distinct m.student_id from public.course_memberships m where m.cohort_id = p_cohort and m.status = 'active' and m.period_end > now() loop
    perform public.tutoring_notify(r.student_id, 'course_announcement', 'New announcement in your class: ' || left(trim(p_title), 100));
  end loop;
  return v;
end $$;

create or replace function public.course_add_progress_note(p_cohort uuid, p_student uuid, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.course_can_teach(p_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.course_memberships m where m.cohort_id = p_cohort and m.student_id = p_student and m.status = 'active') then raise exception 'not_enrolled'; end if;
  insert into public.course_progress_notes (cohort_id, student_id, note, created_by) values (p_cohort, p_student, trim(p_note), (select auth.uid())) returning id into v;
  perform public.tutoring_notify(p_student, 'course_progress', 'Your tutor added feedback on your progress.');
  return v;
end $$;

-- Roster for a tutor or admin: students with an active period in the group (names only, no payment data for tutors).
create or replace function public.course_roster(p_cohort uuid) returns table (student_id uuid, student_name text, paid_until timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.course_can_teach(p_cohort) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select m.student_id, coalesce(nullif(u.full_name, ''), split_part(au.email, '@', 1))::text, max(m.period_end)
  from public.course_memberships m join auth.users au on au.id = m.student_id left join public.users u on u.id = m.student_id
  where m.cohort_id = p_cohort and m.status = 'active' and m.period_end > now() - interval '7 days'
  group by m.student_id, u.full_name, au.email order by 2;
end $$;

-- Groups the caller teaches (admins: all groups).
create or replace function public.course_my_teaching() returns table (id uuid, product text, name text, status text, schedule_text text, starts_on date, meeting_url text, capacity int, tutor_id uuid, tutor_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.product, c.name, c.status, c.schedule_text, c.starts_on, c.meeting_url, c.capacity, c.tutor_id, c.tutor_name
  from public.course_cohorts c where public.course_can_teach(c.id) order by c.status, c.name
$$;

do $$
declare f text;
begin
  foreach f in array array['course_is_member(uuid)','course_can_teach(uuid)','course_admin_set_tutor(uuid,uuid)',
    'course_save_session(uuid,uuid,timestamptz,timestamptz,text,text,text)','course_record_attendance(uuid,uuid,text,text)',
    'course_add_material(uuid,text,text,text)','course_remove_material(uuid)','course_post_announcement(uuid,text,text)',
    'course_add_progress_note(uuid,uuid,text)','course_roster(uuid)','course_my_teaching()'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
