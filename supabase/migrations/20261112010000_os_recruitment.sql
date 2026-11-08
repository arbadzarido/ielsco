-- Company OS → Recruitment: the internal pipeline for applications from the IELSco Careers page (idempotent).
--
-- Data: the applications stay where they are (public.career_applications, same Supabase project as the OS). The OS
-- adds pipeline state, assignments, evaluations and notes keyed by the application id; nothing is copied.
--
-- Who sees what (all enforced here, never only in the UI):
--   * Recruitment team: founders, and staff with a live 'recruitment' grant (os_grants, resource_id '2027' or 'ALL'),
--     which only founders can give. 'view' reads candidates, files and the team's notes and evaluations; 'edit' also
--     moves stages, assigns reviewers/interviewers, records decisions and campaign checks.
--   * Interviewers / reviewers assigned to a candidate: only that candidate, through os_recruitment_candidate_brief()
--     (no contact details beyond what the evaluation needs, no admin notes, no other people's evaluations or notes),
--     and only that candidate's CV/portfolio files.
--   * Everyone else in the OS: nothing. Applicants never see OS data (my_career_application() returns none of it).
--   * Evaluations and notes are private to their author unless shared with the team ('team' notes; evaluations are
--     visible to the recruitment team). No scores are totalled or ranked; decisions are made by people.
--   * Stage changes, assignments and conversions are written to os_audit_log and the candidate's stage history.

-- ── Access ─────────────────────────────────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_grants drop constraint if exists os_grants_resource_type_check;
  alter table public.os_grants add constraint os_grants_resource_type_check
    check (resource_type in ('division', 'document', 'project', 'people', 'recruitment'));
end $$;

create or replace function public.os_recruitment_access(p_level text default 'view') returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and (
    public.os_is_founder()
    or exists (select 1 from public.os_grants g
               where g.person_id = public.os_current_person() and g.resource_type = 'recruitment'
                 and g.resource_id in ('2027', 'ALL') and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
                 and (p_level = 'view' or g.level = 'edit')))
$$;

-- ── Stages (configurable by founders) ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_recruitment_stages (
  key              text primary key check (key ~ '^[a-z_]{2,30}$'),
  label            text not null check (length(trim(label)) between 1 and 60),
  sort             int not null,
  -- What the applicant sees on their status page for this stage (career_applications.status).
  applicant_status text not null check (applicant_status in ('submitted', 'under_review', 'invited', 'shortlisted', 'accepted', 'reserve', 'rejected', 'withdrawn')),
  is_final         boolean not null default false,
  active           boolean not null default true
);
insert into public.os_recruitment_stages (key, label, sort, applicant_status, is_final) values
  ('new', 'New application', 10, 'submitted', false),
  ('cv_screening', 'CV screening', 20, 'under_review', false),
  ('under_review', 'Under review', 30, 'under_review', false),
  ('interview', 'Interview', 40, 'invited', false),
  ('final_evaluation', 'Final evaluation', 50, 'shortlisted', false),
  ('accepted', 'Accepted', 60, 'accepted', true),
  ('rejected', 'Rejected', 70, 'rejected', true)
on conflict (key) do nothing;

-- ── Pipeline state, one row per application ────────────────────────────────────────────────────────────────────────
create table if not exists public.os_recruitment_candidates (
  application_id     uuid primary key references public.career_applications (id) on delete cascade,
  stage              text not null default 'new' references public.os_recruitment_stages (key),
  reviewer_person_id text references public.os_people (id) on delete set null,
  decision_note      text check (decision_note is null or length(decision_note) <= 2000),
  decided_by         text,
  decided_at         timestamptz,
  stage_changed_at   timestamptz not null default now(),
  employee_person_id text unique references public.os_people (id) on delete set null,
  converted_by       text,
  converted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists os_recruitment_candidates_stage_idx on public.os_recruitment_candidates (stage);

create table if not exists public.os_recruitment_stage_history (
  id              bigint generated always as identity primary key,
  application_id  uuid not null references public.career_applications (id) on delete cascade,
  from_stage      text,
  to_stage        text not null,
  actor_person_id text,
  note            text,
  at              timestamptz not null default now()
);
create index if not exists os_recruitment_stage_history_app_idx on public.os_recruitment_stage_history (application_id, at);

create table if not exists public.os_recruitment_assignments (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.career_applications (id) on delete cascade,
  person_id        text not null references public.os_people (id) on delete cascade,
  role             text not null check (role in ('reviewer', 'interviewer')),
  assigned_by      text,
  created_at       timestamptz not null default now(),
  revoked_at       timestamptz,
  revoked_by       text
);
create unique index if not exists os_recruitment_assignments_live on public.os_recruitment_assignments (application_id, person_id, role) where revoked_at is null;
create index if not exists os_recruitment_assignments_person_idx on public.os_recruitment_assignments (person_id) where revoked_at is null;

create or replace function public.os_recruitment_assigned(p_app uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and exists (select 1 from public.os_recruitment_assignments a
    where a.application_id = p_app and a.person_id = public.os_current_person() and a.revoked_at is null)
$$;
create or replace function public.os_recruitment_can_view(p_app uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_recruitment_access('view') or public.os_recruitment_assigned(p_app)
$$;

-- Structured evaluation. Ratings use words, not numbers, and are never totalled or ranked.
create table if not exists public.os_recruitment_evaluations (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references public.career_applications (id) on delete cascade,
  author_person_id   text not null references public.os_people (id) on delete cascade,
  kind               text not null check (kind in ('screening', 'interview', 'final')),
  ratings            jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object'),
  recommendation     text check (recommendation in ('advance', 'hold', 'decline')),
  summary            text check (summary is null or length(summary) <= 4000),
  interview_feedback text check (interview_feedback is null or length(interview_feedback) <= 6000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (application_id, author_person_id, kind)
);

create table if not exists public.os_recruitment_notes (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid not null references public.career_applications (id) on delete cascade,
  author_person_id text not null references public.os_people (id) on delete cascade,
  visibility       text not null default 'team' check (visibility in ('team', 'private')),
  body             text not null check (length(trim(body)) between 1 and 4000),
  created_at       timestamptz not null default now()
);
create index if not exists os_recruitment_notes_app_idx on public.os_recruitment_notes (application_id, created_at);

-- ── Triggers ───────────────────────────────────────────────────────────────────────────────────────────────────────

-- Every application gets a pipeline row, and the recruitment team is notified.
create or replace function public.os_recruitment_on_application() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  insert into public.os_recruitment_candidates (application_id) values (new.id) on conflict do nothing;
  for r in select distinct p.id from public.os_people p
           where p.status = 'active' and p.org_role <> 'guest'
             and (p.org_role = 'founder' or exists (select 1 from public.os_grants g where g.person_id = p.id and g.resource_type = 'recruitment'
                    and g.level = 'edit' and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())))
  loop
    perform public.os_notify(r.id, 'candidate_new', 'candidate', new.id::text, 'New application: ' || new.full_name,
      coalesce(new.role_id, '') || coalesce(' + ' || new.role_2_id, ''), 'candidate-new:' || new.id::text || ':' || r.id);
  end loop;
  return null;
end $$;
drop trigger if exists career_applications_os_pipeline on public.career_applications;
create trigger career_applications_os_pipeline after insert on public.career_applications
  for each row execute function public.os_recruitment_on_application();
insert into public.os_recruitment_candidates (application_id) select a.id from public.career_applications a on conflict do nothing;

create or replace function public.os_recruitment_candidates_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me text := public.os_current_person();
begin
  if tg_op = 'UPDATE' then
    -- Conversion fields and the audit columns are set by the database only (os_recruitment_convert sets a flag).
    if coalesce(current_setting('os.recruitment_convert', true), '') <> '1' then
      new.employee_person_id := old.employee_person_id; new.converted_by := old.converted_by; new.converted_at := old.converted_at;
    end if;
    new.created_at := old.created_at;
    new.updated_at := now();
    if new.reviewer_person_id is distinct from old.reviewer_person_id and new.reviewer_person_id is not null
       and not exists (select 1 from public.os_people p where p.id = new.reviewer_person_id and p.status = 'active' and p.org_role <> 'guest') then
      raise exception 'The reviewer must be active Company OS staff' using errcode = '23514';
    end if;
    if new.stage is distinct from old.stage then
      new.stage_changed_at := now();
      if (select is_final from public.os_recruitment_stages where key = new.stage) then
        new.decided_by := me; new.decided_at := now();
      else
        new.decided_by := null; new.decided_at := null;
      end if;
    else
      new.decided_by := old.decided_by; new.decided_at := old.decided_at; new.stage_changed_at := old.stage_changed_at;
    end if;
    if old.employee_person_id is not null and new.stage <> 'accepted' then
      raise exception 'This candidate has already been converted to a person record' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists os_recruitment_candidates_before_write on public.os_recruitment_candidates;
create trigger os_recruitment_candidates_before_write before update on public.os_recruitment_candidates
  for each row execute function public.os_recruitment_candidates_before_write();

-- History, audit, the applicant-facing status and notifications.
create or replace function public.os_recruitment_candidates_after_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me text := public.os_current_person(); v_name text;
begin
  select full_name into v_name from public.career_applications where id = new.application_id;
  if new.stage is distinct from old.stage then
    insert into public.os_recruitment_stage_history (application_id, from_stage, to_stage, actor_person_id, note)
    values (new.application_id, old.stage, new.stage, me, new.decision_note);
    update public.career_applications a set status = s.applicant_status
      from public.os_recruitment_stages s where s.key = new.stage and a.id = new.application_id and a.status <> s.applicant_status;
    insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
    values (me, 'recruitment.stage', 'candidate', new.application_id::text, jsonb_build_object('from', old.stage, 'to', new.stage));
  end if;
  if new.reviewer_person_id is distinct from old.reviewer_person_id then
    insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
    values (me, 'recruitment.reviewer', 'candidate', new.application_id::text, jsonb_build_object('from', old.reviewer_person_id, 'to', new.reviewer_person_id));
    perform public.os_notify(new.reviewer_person_id, 'candidate_assigned', 'candidate', new.application_id::text,
      'Review assigned: ' || coalesce(v_name, 'candidate'), 'You are the reviewer for this application.',
      'candidate-reviewer:' || new.application_id::text || ':' || coalesce(new.reviewer_person_id, ''));
  end if;
  return null;
end $$;
drop trigger if exists os_recruitment_candidates_after_write on public.os_recruitment_candidates;
create trigger os_recruitment_candidates_after_write after update on public.os_recruitment_candidates
  for each row execute function public.os_recruitment_candidates_after_write();

create or replace function public.os_recruitment_assignments_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me text := public.os_current_person(); v_name text;
begin
  if tg_op = 'INSERT' then
    new.assigned_by := me; new.created_at := now(); new.revoked_at := null; new.revoked_by := null;
    if not exists (select 1 from public.os_people p where p.id = new.person_id and p.status = 'active' and p.org_role <> 'guest') then
      raise exception 'Only active Company OS staff can be assigned' using errcode = '23514';
    end if;
    select full_name into v_name from public.career_applications where id = new.application_id;
    perform public.os_notify(new.person_id, 'candidate_assigned', 'candidate', new.application_id::text,
      initcap(new.role) || ': ' || coalesce(v_name, 'candidate'), 'You were asked to evaluate this candidate.',
      'candidate-assign:' || new.application_id::text || ':' || new.person_id || ':' || new.role);
    insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
    values (me, 'recruitment.assign', 'candidate', new.application_id::text, jsonb_build_object('person', new.person_id, 'role', new.role));
  else
    if (new.application_id, new.person_id, new.role, new.assigned_by, new.created_at) is distinct from (old.application_id, old.person_id, old.role, old.assigned_by, old.created_at)
       or old.revoked_at is not null or new.revoked_at is null then
      raise exception 'An assignment can only be revoked' using errcode = '42501';
    end if;
    new.revoked_at := now(); new.revoked_by := me;
    insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
    values (me, 'recruitment.unassign', 'candidate', new.application_id::text, jsonb_build_object('person', new.person_id, 'role', new.role));
  end if;
  return new;
end $$;
drop trigger if exists os_recruitment_assignments_write on public.os_recruitment_assignments;
create trigger os_recruitment_assignments_write before insert or update on public.os_recruitment_assignments
  for each row execute function public.os_recruitment_assignments_write();

-- Evaluations: the author is always the caller; ratings only use the agreed criteria and words.
create or replace function public.os_recruitment_evaluations_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare k text; v text;
begin
  if tg_op = 'INSERT' then
    new.author_person_id := public.os_current_person(); new.created_at := now();
  else
    new.author_person_id := old.author_person_id; new.application_id := old.application_id; new.kind := old.kind; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  for k, v in select key, value #>> '{}' from jsonb_each(new.ratings) loop
    if k not in ('cv_quality', 'portfolio_quality', 'relevant_experience', 'communication', 'motivation', 'role_fit', 'campaign_compliance') then
      raise exception 'Unknown evaluation criterion %', k using errcode = '23514';
    end if;
    if v not in ('strong', 'adequate', 'weak', 'not_applicable') then
      raise exception 'Ratings are strong, adequate, weak or not applicable' using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists os_recruitment_evaluations_write on public.os_recruitment_evaluations;
create trigger os_recruitment_evaluations_write before insert or update on public.os_recruitment_evaluations
  for each row execute function public.os_recruitment_evaluations_write();

create or replace function public.os_recruitment_notes_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.author_person_id := public.os_current_person(); new.created_at := now();
  return new;
end $$;
drop trigger if exists os_recruitment_notes_write on public.os_recruitment_notes;
create trigger os_recruitment_notes_write before insert on public.os_recruitment_notes
  for each row execute function public.os_recruitment_notes_write();

-- ── Row-level security ─────────────────────────────────────────────────────────────────────────────────────────────
alter table public.os_recruitment_stages enable row level security;
alter table public.os_recruitment_candidates enable row level security;
alter table public.os_recruitment_stage_history enable row level security;
alter table public.os_recruitment_assignments enable row level security;
alter table public.os_recruitment_evaluations enable row level security;
alter table public.os_recruitment_notes enable row level security;
revoke all on public.os_recruitment_stages, public.os_recruitment_candidates, public.os_recruitment_stage_history,
  public.os_recruitment_assignments, public.os_recruitment_evaluations, public.os_recruitment_notes from anon, authenticated;

grant select on public.os_recruitment_stages to authenticated;
grant insert, update (label, sort, applicant_status, is_final, active) on public.os_recruitment_stages to authenticated;
drop policy if exists os_recruitment_stages_read on public.os_recruitment_stages;
create policy os_recruitment_stages_read on public.os_recruitment_stages for select to authenticated using ((select public.os_is_staff()));
drop policy if exists os_recruitment_stages_founders on public.os_recruitment_stages;
create policy os_recruitment_stages_founders on public.os_recruitment_stages for insert to authenticated with check ((select public.os_is_founder()));
drop policy if exists os_recruitment_stages_founders_update on public.os_recruitment_stages;
create policy os_recruitment_stages_founders_update on public.os_recruitment_stages for update to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

grant select, update (stage, reviewer_person_id, decision_note) on public.os_recruitment_candidates to authenticated;
drop policy if exists os_recruitment_candidates_read on public.os_recruitment_candidates;
create policy os_recruitment_candidates_read on public.os_recruitment_candidates for select to authenticated
  using (public.os_recruitment_can_view(application_id));
drop policy if exists os_recruitment_candidates_edit on public.os_recruitment_candidates;
create policy os_recruitment_candidates_edit on public.os_recruitment_candidates for update to authenticated
  using ((select public.os_recruitment_access('edit'))) with check ((select public.os_recruitment_access('edit')));

grant select on public.os_recruitment_stage_history to authenticated;
drop policy if exists os_recruitment_history_read on public.os_recruitment_stage_history;
create policy os_recruitment_history_read on public.os_recruitment_stage_history for select to authenticated
  using ((select public.os_recruitment_access('view')));

grant select, insert (application_id, person_id, role), update (revoked_at) on public.os_recruitment_assignments to authenticated;
drop policy if exists os_recruitment_assignments_read on public.os_recruitment_assignments;
create policy os_recruitment_assignments_read on public.os_recruitment_assignments for select to authenticated
  using ((select public.os_recruitment_access('view')) or person_id = (select public.os_current_person()));
drop policy if exists os_recruitment_assignments_insert on public.os_recruitment_assignments;
create policy os_recruitment_assignments_insert on public.os_recruitment_assignments for insert to authenticated
  with check ((select public.os_recruitment_access('edit')));
drop policy if exists os_recruitment_assignments_revoke on public.os_recruitment_assignments;
create policy os_recruitment_assignments_revoke on public.os_recruitment_assignments for update to authenticated
  using ((select public.os_recruitment_access('edit'))) with check ((select public.os_recruitment_access('edit')));

grant select, insert (application_id, kind, ratings, recommendation, summary, interview_feedback),
  update (ratings, recommendation, summary, interview_feedback) on public.os_recruitment_evaluations to authenticated;
drop policy if exists os_recruitment_evaluations_read on public.os_recruitment_evaluations;
create policy os_recruitment_evaluations_read on public.os_recruitment_evaluations for select to authenticated
  using (author_person_id = (select public.os_current_person()) or (select public.os_recruitment_access('view')));
drop policy if exists os_recruitment_evaluations_insert on public.os_recruitment_evaluations;
create policy os_recruitment_evaluations_insert on public.os_recruitment_evaluations for insert to authenticated
  with check (public.os_recruitment_can_view(application_id));
drop policy if exists os_recruitment_evaluations_update on public.os_recruitment_evaluations;
create policy os_recruitment_evaluations_update on public.os_recruitment_evaluations for update to authenticated
  using (author_person_id = (select public.os_current_person())) with check (author_person_id = (select public.os_current_person()));

grant select, insert (application_id, visibility, body) on public.os_recruitment_notes to authenticated;
drop policy if exists os_recruitment_notes_read on public.os_recruitment_notes;
create policy os_recruitment_notes_read on public.os_recruitment_notes for select to authenticated
  using (author_person_id = (select public.os_current_person()) or (visibility = 'team' and (select public.os_recruitment_access('view'))));
drop policy if exists os_recruitment_notes_insert on public.os_recruitment_notes;
create policy os_recruitment_notes_insert on public.os_recruitment_notes for insert to authenticated
  with check (public.os_recruitment_can_view(application_id));

-- The application rows themselves: the recruitment team reads them; editors can record the campaign checks and notes
-- (column grants from 20261101000000/20261111000000). Site admins keep their existing access.
drop policy if exists career_applications_os_read on public.career_applications;
create policy career_applications_os_read on public.career_applications for select to authenticated
  using ((select public.os_recruitment_access('view')));
drop policy if exists career_applications_os_update on public.career_applications;
create policy career_applications_os_update on public.career_applications for update to authenticated
  using ((select public.os_recruitment_access('edit'))) with check ((select public.os_recruitment_access('edit')));

-- What an assigned interviewer/reviewer may see of a candidate (no WhatsApp/email, no admin notes).
create or replace function public.os_recruitment_candidate_brief(p_app uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when public.os_recruitment_can_view(p_app) then (
    select jsonb_build_object('id', a.id, 'full_name', a.full_name, 'university', a.university, 'academic_year', a.academic_year,
      'batch_year', a.batch_year, 'domicile_country', a.domicile_country, 'domicile_city', a.domicile_city, 'division', a.division,
      'role_id', a.role_id, 'role_2_id', a.role_2_id, 'motivation', a.motivation, 'instagram_url', a.instagram_url,
      'linkedin_url', a.linkedin_url, 'cv_path', a.cv_path, 'portfolio_path', a.portfolio_path, 'portfolio_url', a.portfolio_url,
      'campaign_tasks', a.campaign_tasks, 'campaign_verification', a.campaign_verification, 'submitted_at', a.submitted_at,
      'stage', c.stage)
    from public.career_applications a left join public.os_recruitment_candidates c on c.application_id = a.id where a.id = p_app)
  end
$$;

-- Candidates assigned to me (the "My reviews" list for interviewers who aren't on the recruitment team).
create or replace function public.os_recruitment_my_assignments() returns table (application_id uuid, role text, full_name text, role_id text, role_2_id text, stage text, assigned_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.application_id, x.role, a.full_name, a.role_id, a.role_2_id, c.stage, x.created_at
  from public.os_recruitment_assignments x
  join public.career_applications a on a.id = x.application_id
  left join public.os_recruitment_candidates c on c.application_id = x.application_id
  where x.person_id = public.os_current_person() and x.revoked_at is null and public.os_is_staff()
  order by x.created_at desc
$$;

-- ── CV and portfolio files ─────────────────────────────────────────────────────────────────────────────────────────
-- An assigned interviewer/reviewer may open exactly that candidate's CV and portfolio (they can't read the
-- application row itself, so the lookup runs here).
create or replace function public.os_recruitment_file_allowed(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.career_applications a
                 where (a.cv_path = p_name or a.portfolio_path = p_name) and public.os_recruitment_assigned(a.id))
$$;

do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  drop policy if exists "career_applications_os_read" on storage.objects;
  execute $p$create policy "career_applications_os_read" on storage.objects for select to authenticated using (
    bucket_id = 'career-applications' and (
      (select public.os_recruitment_access('view'))
      or public.os_recruitment_file_allowed(name)))$p$;
end $$;

-- ── Calendar and tasks: interviews and screening work linked to a candidate ────────────────────────────────────────
alter table public.os_events add column if not exists candidate_id uuid references public.career_applications (id) on delete set null;
alter table public.os_tasks add column if not exists candidate_id uuid references public.career_applications (id) on delete set null;
create index if not exists os_events_candidate_idx on public.os_events (candidate_id) where candidate_id is not null;
create index if not exists os_tasks_candidate_idx on public.os_tasks (candidate_id) where candidate_id is not null;
grant insert (candidate_id), update (candidate_id) on public.os_events to authenticated;
grant insert (candidate_id), update (candidate_id) on public.os_tasks to authenticated;

-- Linking needs recruitment access to that candidate, and a linked record is always Restricted (founders, the creator,
-- attendees / assignees only), so a candidate's name never shows up in someone else's calendar or task list.
create or replace function public.os_recruitment_link_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.candidate_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.candidate_id is not distinct from old.candidate_id then
    new.sensitivity := 'Restricted'; return new;
  end if;
  if not public.os_caller_is_privileged() and not public.os_recruitment_can_view(new.candidate_id) then
    raise exception 'You can only link candidates you have recruitment access to' using errcode = '42501';
  end if;
  new.sensitivity := 'Restricted';
  return new;
end $$;
drop trigger if exists os_events_recruitment_link on public.os_events;
create trigger os_events_recruitment_link before insert or update on public.os_events for each row execute function public.os_recruitment_link_check();
drop trigger if exists os_tasks_recruitment_link on public.os_tasks;
create trigger os_tasks_recruitment_link before insert or update on public.os_tasks for each row execute function public.os_recruitment_link_check();

-- Restricted records can normally be created only by founders; candidate-linked ones also by the recruitment team.
drop policy if exists os_tasks_insert_recruitment on public.os_tasks;
create policy os_tasks_insert_recruitment on public.os_tasks for insert to authenticated
  with check (candidate_id is not null and (select public.os_recruitment_access('edit')));
drop policy if exists os_tasks_update_recruitment on public.os_tasks;
create policy os_tasks_update_recruitment on public.os_tasks for update to authenticated
  using (candidate_id is not null and (select public.os_recruitment_access('edit')))
  with check (candidate_id is not null and (select public.os_recruitment_access('edit')));
drop policy if exists os_events_insert_recruitment on public.os_events;
create policy os_events_insert_recruitment on public.os_events for insert to authenticated
  with check (candidate_id is not null and (select public.os_recruitment_access('edit')));
drop policy if exists os_events_update_recruitment on public.os_events;
create policy os_events_update_recruitment on public.os_events for update to authenticated
  using (candidate_id is not null and (select public.os_recruitment_access('edit')))
  with check (candidate_id is not null and (select public.os_recruitment_access('edit')));

-- ── Notifications about candidates ─────────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_notifications drop constraint if exists os_notifications_kind_check;
  alter table public.os_notifications add constraint os_notifications_kind_check check (kind in
    ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed', 'candidate_new', 'candidate_assigned'));
  alter table public.os_notifications drop constraint if exists os_notifications_entity_type_check;
  alter table public.os_notifications add constraint os_notifications_entity_type_check check (entity_type in ('event', 'task', 'candidate'));
end $$;

-- ── Accepted candidate → person record (founders) ──────────────────────────────────────────────────────────────────
-- Creates an *invited* os_people row through the normal invitation path; access still needs the person's Google
-- sign-in and a founder's approval, exactly like any other invitation. One person per candidate, never twice.
create or replace function public.os_recruitment_convert(p_app uuid, p_google_account text, p_companies text[], p_division text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_app public.career_applications;
  v_c public.os_recruitment_candidates;
  v_id text;
  v_email text := lower(trim(coalesce(p_google_account, '')));
  v_code text;
begin
  if not public.os_is_founder() then raise exception 'Only founders can create person records' using errcode = '42501'; end if;
  select * into v_c from public.os_recruitment_candidates where application_id = p_app for update;
  if not found then raise exception 'Candidate not found' using errcode = 'P0002'; end if;
  if v_c.stage <> 'accepted' then raise exception 'Only accepted candidates can be converted' using errcode = '23514'; end if;
  if v_c.employee_person_id is not null then raise exception 'already_converted' using errcode = '23505'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A work Google email is required' using errcode = '22023'; end if;
  if exists (select 1 from public.os_people p where p.google_account = v_email) then raise exception 'person_exists' using errcode = '23505'; end if;
  if coalesce(array_length(p_companies, 1), 0) = 0 then raise exception 'Pick at least one company' using errcode = '22023'; end if;
  select * into v_app from public.career_applications where id = p_app;
  select 'PPL-' || lpad((coalesce(max(substring(id from 5)::int), 0) + 1)::text, 4, '0') into v_id from public.os_people where id ~ '^PPL-[0-9]{4}$';
  insert into public.os_people (id, full_name, org_role, status, google_account) values (v_id, v_app.full_name, 'member', 'invited', v_email);
  foreach v_code in array p_companies loop
    insert into public.os_person_companies (person_id, company_code) values (v_id, v_code);
  end loop;
  if p_division is not null then insert into public.os_person_divisions (person_id, division_id) values (v_id, p_division); end if;
  perform set_config('os.recruitment_convert', '1', true);
  update public.os_recruitment_candidates set employee_person_id = v_id, converted_by = public.os_current_person(), converted_at = now()
    where application_id = p_app;
  perform set_config('os.recruitment_convert', '', true);
  insert into public.os_recruitment_stage_history (application_id, from_stage, to_stage, actor_person_id, note)
  values (p_app, 'accepted', 'accepted', public.os_current_person(), 'Person record ' || v_id || ' created (invited)');
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), 'recruitment.convert', 'candidate', p_app::text, jsonb_build_object('person', v_id));
  return v_id;
end $$;

-- ── Function privileges ────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['os_recruitment_access(text)', 'os_recruitment_assigned(uuid)', 'os_recruitment_can_view(uuid)',
    'os_recruitment_candidate_brief(uuid)', 'os_recruitment_my_assignments()', 'os_recruitment_file_allowed(text)', 'os_recruitment_convert(uuid, text, text[], text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['os_recruitment_on_application()', 'os_recruitment_candidates_before_write()', 'os_recruitment_candidates_after_write()',
    'os_recruitment_assignments_write()', 'os_recruitment_evaluations_write()', 'os_recruitment_notes_write()', 'os_recruitment_link_check()']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;
