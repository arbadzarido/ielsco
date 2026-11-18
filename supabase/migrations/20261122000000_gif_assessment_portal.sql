-- =====================================================================================================================
-- GIF 2026 Assignment & Assessment Portal
-- ---------------------------------------------------------------------------------------------------------------------
-- Extends the existing delegate portal (public.gif_delegates, untouched) with:
--   gif_admins            allowlist of assessment admins (auth user ids, never emails from the browser)
--   gif_teams             fixed teams per edition
--   gif_team_members      one team per delegate (unique), linked to gif_delegates
--   gif_programme_days    day title / theme / summary, editable by admins
--   gif_assignments       one row per deliverable (group or individual) with its field + rubric config (jsonb)
--   gif_submissions       one per (assignment, delegate) for individual work, one per (assignment, team) for group work
--   gif_submission_files  uploaded files; Instagram Story proofs carry 7-day retention metadata
--   gif_assessments       append-only assessment history (rubric scores, status, feedback, assessor)
--   gif_notifications     in-dashboard status notifications, written by triggers
-- Storage: private buckets gif-story-proofs ({delegate_id}/{submission_id}/{file}) and gif-submission-files
-- ({submission_id}/{file}). Story proofs are deleted after 7 days by the gif-story-retention Edge Function (daily cron,
-- see 20261122000100_gif_story_retention_cron.sql).
-- Nothing here deletes or rewrites existing data. Rollback: supabase/manual/ROLLBACK-20261122-gif-assessment-portal.sql
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.gif_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  granted_at timestamptz not null default now()
);

create table if not exists public.gif_teams (
  id          uuid primary key default gen_random_uuid(),
  edition     text not null default 'GIF 2026',
  team_number smallint not null check (team_number between 1 and 50),
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (edition, team_number)
);

create table if not exists public.gif_team_members (
  team_id     uuid not null references public.gif_teams(id) on delete restrict,
  delegate_id uuid not null references public.gif_delegates(id) on delete restrict,
  joined_at   timestamptz not null default now(),
  primary key (team_id, delegate_id),
  unique (delegate_id)
);
create index if not exists gif_team_members_team_idx on public.gif_team_members(team_id);

create table if not exists public.gif_programme_days (
  edition    text not null default 'GIF 2026',
  day_number smallint not null check (day_number between 1 and 14),
  title      text not null,
  theme      text,
  summary    text,
  day_date   date,
  updated_at timestamptz not null default now(),
  primary key (edition, day_number)
);

create table if not exists public.gif_assignments (
  id              uuid primary key default gen_random_uuid(),
  edition         text not null default 'GIF 2026',
  day_number      smallint not null,
  slug            text not null,
  title           text not null,
  purpose         text,
  instructions    text,
  deliverables    text[] not null default '{}',
  submission_type text not null check (submission_type in ('group', 'individual')),
  submission_format text,
  fields          jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  rubric          jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  sort_order      smallint not null default 0,
  opens_at        timestamptz,
  due_at          timestamptz,
  allow_late      boolean not null default true,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null,
  unique (edition, slug),
  foreign key (edition, day_number) references public.gif_programme_days(edition, day_number) on delete restrict
);
create index if not exists gif_assignments_day_idx on public.gif_assignments(edition, day_number, sort_order);

create table if not exists public.gif_submissions (
  id                 uuid primary key default gen_random_uuid(),
  assignment_id      uuid not null references public.gif_assignments(id) on delete restrict,
  delegate_id        uuid references public.gif_delegates(id) on delete restrict,
  team_id            uuid references public.gif_teams(id) on delete restrict,
  status             text not null default 'in_progress'
                     check (status in ('in_progress', 'submitted', 'under_review', 'approved', 'revision_required')),
  responses          jsonb not null default '{}'::jsonb check (jsonb_typeof(responses) = 'object'),
  version            integer not null default 1,
  created_by         uuid references auth.users(id) on delete set null,
  last_edited_by     uuid references auth.users(id) on delete set null,
  submitted_by_delegate_id uuid references public.gif_delegates(id) on delete set null,
  first_submitted_at timestamptz,
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((delegate_id is null) <> (team_id is null))
);
create unique index if not exists gif_submissions_individual_uq on public.gif_submissions(assignment_id, delegate_id) where delegate_id is not null;
create unique index if not exists gif_submissions_group_uq on public.gif_submissions(assignment_id, team_id) where team_id is not null;
create index if not exists gif_submissions_status_idx on public.gif_submissions(status, submitted_at);
create index if not exists gif_submissions_delegate_idx on public.gif_submissions(delegate_id);
create index if not exists gif_submissions_team_idx on public.gif_submissions(team_id);

create table if not exists public.gif_submission_files (
  id               uuid primary key default gen_random_uuid(),
  submission_id    uuid not null references public.gif_submissions(id) on delete restrict,
  field_key        text not null,
  kind             text not null check (kind in ('story_proof', 'file')),
  bucket           text not null check (bucket in ('gif-story-proofs', 'gif-submission-files')),
  storage_path     text not null,
  original_name    text,
  mime_type        text not null,
  size_bytes       bigint not null check (size_bytes > 0),
  story_day        smallint,
  description      text check (description is null or length(description) <= 500),
  uploaded_by      uuid references auth.users(id) on delete set null,
  uploaded_at      timestamptz not null default now(),
  expires_at       timestamptz,
  deleted_at       timestamptz,
  retention_status text not null default 'active'
                   check (retention_status in ('active', 'expired', 'deleted', 'deletion_failed', 'not_applicable')),
  deletion_attempts integer not null default 0,
  last_deletion_error text,
  unique (bucket, storage_path),
  check (kind <> 'story_proof' or (bucket = 'gif-story-proofs' and expires_at is not null))
);
create index if not exists gif_submission_files_submission_idx on public.gif_submission_files(submission_id);
create index if not exists gif_submission_files_retention_idx on public.gif_submission_files(expires_at)
  where kind = 'story_proof' and retention_status in ('active', 'expired', 'deletion_failed');

create table if not exists public.gif_assessments (
  id                    uuid primary key default gen_random_uuid(),
  submission_id         uuid not null references public.gif_submissions(id) on delete restrict,
  submission_version    integer not null,
  assessor_id           uuid not null references auth.users(id) on delete restrict,
  status                text not null check (status in ('under_review', 'approved', 'revision_required')),
  rubric_scores         jsonb not null default '{}'::jsonb check (jsonb_typeof(rubric_scores) = 'object'),
  score                 numeric(6,2),
  max_score             numeric(6,2),
  feedback              text check (feedback is null or length(feedback) <= 5000),
  revision_instructions text check (revision_instructions is null or length(revision_instructions) <= 5000),
  created_at            timestamptz not null default now(),
  check (status <> 'revision_required' or coalesce(btrim(revision_instructions), '') <> '' or coalesce(btrim(feedback), '') <> '')
);
create index if not exists gif_assessments_submission_idx on public.gif_assessments(submission_id, created_at desc);

create table if not exists public.gif_notifications (
  id            uuid primary key default gen_random_uuid(),
  delegate_id   uuid not null references public.gif_delegates(id) on delete cascade,
  submission_id uuid references public.gif_submissions(id) on delete set null,
  kind          text not null,
  message       text not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists gif_notifications_delegate_idx on public.gif_notifications(delegate_id, created_at desc);

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Identity helpers
-- Safe text -> uuid (storage policies are evaluated for every bucket; a failing cast must never raise)
create or replace function public.gif_try_uuid(p text) returns uuid
language plpgsql immutable set search_path = ''
as $$ begin return p::uuid; exception when others then return null; end $$;
-- Identity helpers are SECURITY DEFINER: they read tables the caller cannot see; they only ever describe the caller.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.gif_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.gif_admins a where a.user_id = (select auth.uid())) $$;

create or replace function public.gif_my_delegate_id() returns uuid
language sql stable security definer set search_path = ''
as $$
  select d.id from public.gif_delegates d
   where d.access_granted
     and lower(d.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
     and (d.user_id is null or d.user_id = (select auth.uid()))
   limit 1
$$;

create or replace function public.gif_my_team_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select m.team_id from public.gif_team_members m where m.delegate_id = public.gif_my_delegate_id() $$;

create or replace function public.gif_can_view_submission(p_submission uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.gif_is_admin() or exists (
    select 1 from public.gif_submissions s
     where s.id = p_submission
       and ((s.delegate_id is not null and s.delegate_id = public.gif_my_delegate_id())
         or (s.team_id is not null and s.team_id = public.gif_my_team_id()))
  )
$$;

-- Delegates may change a submission (and its files) while it is theirs/their team's, the assignment is active and open,
-- and it is not locked by review: in_progress, submitted (not yet picked up) or revision_required.
create or replace function public.gif_can_edit_submission(p_submission uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.gif_submissions s
      join public.gif_assignments a on a.id = s.assignment_id
     where s.id = p_submission
       and s.status in ('in_progress', 'submitted', 'revision_required')
       and a.is_active
       and (a.opens_at is null or a.opens_at <= now())
       and (a.allow_late or a.due_at is null or now() <= a.due_at or s.status = 'revision_required')
       and ((s.delegate_id is not null and s.delegate_id = public.gif_my_delegate_id())
         or (s.team_id is not null and s.team_id = public.gif_my_team_id()))
  )
$$;

-- The signed-in delegate's own team and teammates (names only; biodata stays private).
create or replace function public.gif_my_team() returns table (team_id uuid, team_number smallint, team_name text, delegate_id uuid, full_name text, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.team_number, t.name, d.id, coalesce(nullif(d.preferred_name, ''), d.full_name), d.id = public.gif_my_delegate_id()
    from public.gif_teams t
    join public.gif_team_members m on m.team_id = t.id
    join public.gif_delegates d on d.id = m.delegate_id
   where t.id = public.gif_my_team_id()
   order by d.full_name
$$;

-- Admin roster (names + team only). Raises for anyone who is not an admin.
create or replace function public.gif_admin_roster() returns table (delegate_id uuid, participant_id text, full_name text, email text, linked boolean, team_id uuid, team_number smallint, team_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.gif_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select d.id, d.participant_id, d.full_name, d.email, d.user_id is not null, t.id, t.team_number, t.name
      from public.gif_delegates d
      left join public.gif_team_members m on m.delegate_id = d.id
      left join public.gif_teams t on t.id = m.team_id
     where d.access_granted
     order by t.team_number nulls last, d.full_name;
end $$;

revoke all on function public.gif_admin_roster() from public, anon;
grant execute on function public.gif_is_admin(), public.gif_my_delegate_id(), public.gif_my_team_id(),
  public.gif_can_view_submission(uuid), public.gif_can_edit_submission(uuid), public.gif_my_team(), public.gif_admin_roster()
  to authenticated;
revoke execute on function public.gif_is_admin(), public.gif_my_delegate_id(), public.gif_my_team_id(),
  public.gif_can_view_submission(uuid), public.gif_can_edit_submission(uuid), public.gif_my_team() from anon;

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Guards and side-effect triggers
-- ---------------------------------------------------------------------------------------------------------------------
-- Which required fields are still missing for a submission (text-like fields from responses, uploads from files).
create or replace function public.gif_submission_missing(p_submission uuid) returns text[]
language plpgsql stable security definer set search_path = ''
as $$
declare
  s record; f jsonb; k text; t text; v jsonb; n int; missing text[] := '{}';
begin
  select sub.*, a.fields into s from public.gif_submissions sub join public.gif_assignments a on a.id = sub.assignment_id where sub.id = p_submission;
  if not found then return missing; end if;
  for f in select * from jsonb_array_elements(s.fields) loop
    k := f ->> 'key'; t := coalesce(f ->> 'type', 'text');
    if t in ('members', 'heading') or coalesce((f ->> 'required')::boolean, false) = false then continue; end if;
    if t in ('files', 'story_proof') then
      select count(*) into n from public.gif_submission_files x where x.submission_id = p_submission and x.field_key = k;
      if n < greatest(coalesce((f ->> 'min_files')::int, 1), 1) then
        -- a link field can stand in for an upload ("link or upload")
        if f ? 'or_field' and coalesce(btrim(s.responses ->> (f ->> 'or_field')), '') <> '' then continue; end if;
        missing := missing || k;
      end if;
    else
      v := s.responses -> k;
      if t = 'checkbox' then
        if coalesce(v = 'true'::jsonb, false) = false then missing := missing || k; end if;
      elsif v is null or v = 'null'::jsonb or coalesce(btrim(s.responses ->> k), '') = '' then
        if f ? 'or_field' and exists (select 1 from public.gif_submission_files x where x.submission_id = p_submission and x.field_key = (f ->> 'or_field')) then continue; end if;
        missing := missing || k;
      end if;
    end if;
  end loop;
  return missing;
end $$;
grant execute on function public.gif_submission_missing(uuid) to authenticated;
revoke execute on function public.gif_submission_missing(uuid) from anon;

create or replace function public.gif_submission_guard() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  a record;
  me uuid;
begin
  if uid is null then return new; end if;   -- service role / SQL editor
  select * into a from public.gif_assignments where id = new.assignment_id;
  me := public.gif_my_delegate_id();

  if tg_op = 'INSERT' then
    if me is null then raise exception 'Only GIF delegates can submit.' using errcode = '42501'; end if;
    if not a.is_active or (a.opens_at is not null and a.opens_at > now()) then
      raise exception 'This assignment is not open.' using errcode = '42501';
    end if;
    if not a.allow_late and a.due_at is not null and now() > a.due_at then
      raise exception 'The deadline for this assignment has passed.' using errcode = '42501';
    end if;
    if a.submission_type = 'individual' and (new.delegate_id is distinct from me or new.team_id is not null) then
      raise exception 'Individual work belongs to your own delegate record.' using errcode = '42501';
    end if;
    if a.submission_type = 'group' and (new.team_id is distinct from public.gif_my_team_id() or new.delegate_id is not null or new.team_id is null) then
      raise exception 'Group work belongs to your own team.' using errcode = '42501';
    end if;
    if new.status not in ('in_progress', 'submitted') then raise exception 'Invalid status.' using errcode = '42501'; end if;
    new.version := 1;
    new.created_by := uid; new.last_edited_by := uid;
    new.created_at := now(); new.updated_at := now();
    if new.status = 'submitted' then
      new.first_submitted_at := now(); new.submitted_at := now(); new.submitted_by_delegate_id := me;
    else
      new.first_submitted_at := null; new.submitted_at := null; new.submitted_by_delegate_id := null;
    end if;
    return new;   -- required fields of a 'submitted' row are checked by the AFTER trigger below
  end if;

  -- UPDATE by a signed-in user. Admin status changes come only from gif_assessments (that trigger runs as definer
  -- and sets gif.assessing), so a direct update is always treated as a delegate edit.
  if current_setting('gif.assessing', true) = 'on' then return new; end if;
  if new.assignment_id <> old.assignment_id or new.delegate_id is distinct from old.delegate_id or new.team_id is distinct from old.team_id
     or new.created_by is distinct from old.created_by or new.created_at <> old.created_at or new.first_submitted_at is distinct from old.first_submitted_at then
    raise exception 'These fields cannot be changed.' using errcode = '42501';
  end if;
  if not public.gif_can_edit_submission(old.id) then
    raise exception 'This submission is locked while it is reviewed or after approval.' using errcode = '42501';
  end if;
  -- delegates move a submission to in_progress / submitted; saving a draft during a revision keeps revision_required
  if new.status not in ('in_progress', 'submitted') and not (new.status = 'revision_required' and old.status = 'revision_required') then
    raise exception 'Only IELSco can set this status.' using errcode = '42501';
  end if;
  new.last_edited_by := uid; new.updated_at := now();
  new.version := old.version + case when old.status = 'revision_required' and new.status = 'submitted' then 1 else 0 end;
  if new.status = 'submitted' then
    new.submitted_at := now(); new.submitted_by_delegate_id := me;
    new.first_submitted_at := coalesce(old.first_submitted_at, now());
  else
    new.submitted_at := old.submitted_at; new.submitted_by_delegate_id := old.submitted_by_delegate_id;
  end if;
  return new;
end $$;

-- AFTER trigger: required-field check on the stored row (so responses and files are both current), plus notifications.
create or replace function public.gif_submission_after() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  missing text[];
  dayno smallint;
  label text;
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted' or old.responses is distinct from new.responses)
     and (select auth.uid()) is not null and current_setting('gif.assessing', true) is distinct from 'on' then
    missing := public.gif_submission_missing(new.id);
    if array_length(missing, 1) > 0 then
      raise exception 'Please complete the required fields before submitting: %', array_to_string(missing, ', ') using errcode = '23514';
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    select a.day_number, a.title into dayno, label from public.gif_assignments a where a.id = new.assignment_id;
    insert into public.gif_notifications (delegate_id, submission_id, kind, message)
    select r.delegate_id, new.id, 'received',
           format('Your Day %s submission "%s" has been received.', dayno, label)
      from (select new.delegate_id as delegate_id where new.delegate_id is not null
            union select m.delegate_id from public.gif_team_members m where m.team_id = new.team_id) r;
  end if;
  return null;
end $$;

drop trigger if exists gif_submission_guard_trg on public.gif_submissions;
create trigger gif_submission_guard_trg before insert or update on public.gif_submissions
  for each row execute function public.gif_submission_guard();
drop trigger if exists gif_submission_after_trg on public.gif_submissions;
create trigger gif_submission_after_trg after insert or update on public.gif_submissions
  for each row execute function public.gif_submission_after();

-- Files: server-set timestamps and retention (7 days from the upload timestamp, UTC).
create or replace function public.gif_file_guard() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.uploaded_at := now();
    if new.kind = 'story_proof' then
      new.expires_at := new.uploaded_at + interval '7 days';
      new.retention_status := 'active';
    else
      new.expires_at := null;
      new.retention_status := 'not_applicable';
    end if;
    new.deleted_at := null; new.deletion_attempts := 0; new.last_deletion_error := null;
    return new;
  end if;
  -- UPDATE: only the service role (retention job) may touch retention columns; delegates may edit the description.
  if (select auth.uid()) is not null then
    if (to_jsonb(new) - 'description') is distinct from (to_jsonb(old) - 'description') then
      raise exception 'Only the description of an upload can be changed.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists gif_file_guard_trg on public.gif_submission_files;
create trigger gif_file_guard_trg before insert or update on public.gif_submission_files
  for each row execute function public.gif_file_guard();

-- Assessments: admin only, append-only; sets the submission status and notifies the delegate(s).
create or replace function public.gif_assessment_before() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare s record; total numeric := 0; maxs numeric := 0; c jsonb; v numeric;
begin
  if (select auth.uid()) is not null and not public.gif_is_admin() then
    raise exception 'Only GIF admins can assess.' using errcode = '42501';
  end if;
  select sub.*, a.rubric into s from public.gif_submissions sub join public.gif_assignments a on a.id = sub.assignment_id where sub.id = new.submission_id;
  if s.status = 'in_progress' then raise exception 'This submission has not been submitted yet.' using errcode = '23514'; end if;
  new.assessor_id := coalesce((select auth.uid()), new.assessor_id);
  new.submission_version := s.version;
  new.created_at := now();
  for c in select * from jsonb_array_elements(s.rubric) loop
    if new.rubric_scores ? (c ->> 'key') and jsonb_typeof(new.rubric_scores -> (c ->> 'key')) = 'number' then
      v := (new.rubric_scores ->> (c ->> 'key'))::numeric;
      if v < 1 or v > 5 or v <> trunc(v) then raise exception 'Rubric scores must be whole numbers from 1 to 5.' using errcode = '23514'; end if;
      total := total + v;
    end if;
    maxs := maxs + 5;
  end loop;
  if exists (select 1 from jsonb_object_keys(new.rubric_scores) k where not exists (select 1 from jsonb_array_elements(s.rubric) c2 where c2 ->> 'key' = k)) then
    raise exception 'Unknown rubric criterion.' using errcode = '23514';
  end if;
  new.score := case when new.rubric_scores = '{}'::jsonb then null else total end;
  new.max_score := case when new.rubric_scores = '{}'::jsonb then null else maxs end;
  return new;
end $$;

create or replace function public.gif_assessment_after() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare s record; msg text;
begin
  select sub.*, a.day_number, a.title into s from public.gif_submissions sub join public.gif_assignments a on a.id = sub.assignment_id where sub.id = new.submission_id;
  perform set_config('gif.assessing', 'on', true);
  update public.gif_submissions set status = new.status, updated_at = now() where id = new.submission_id;
  perform set_config('gif.assessing', 'off', true);
  msg := case new.status
    when 'under_review' then format('Your Day %s submission "%s" is currently under review.', s.day_number, s.title)
    when 'approved' then format('Your Day %s assignment "%s" has been approved.', s.day_number, s.title)
    else format('Your Day %s submission "%s" requires revision. Please check Arba''s feedback.', s.day_number, s.title) end;
  insert into public.gif_notifications (delegate_id, submission_id, kind, message)
  select r.delegate_id, new.submission_id, new.status, msg
    from (select s.delegate_id as delegate_id where s.delegate_id is not null
          union select m.delegate_id from public.gif_team_members m where m.team_id = s.team_id) r;
  return null;
end $$;
drop trigger if exists gif_assessment_before_trg on public.gif_assessments;
create trigger gif_assessment_before_trg before insert on public.gif_assessments
  for each row execute function public.gif_assessment_before();
drop trigger if exists gif_assessment_after_trg on public.gif_assessments;
create trigger gif_assessment_after_trg after insert on public.gif_assessments
  for each row execute function public.gif_assessment_after();

create or replace function public.gif_touch_updated() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.submission_type is distinct from old.submission_type
     and exists (select 1 from public.gif_submissions s where s.assignment_id = old.id) then
    raise exception 'The submission type cannot change once submissions exist.' using errcode = '23514';
  end if;
  if new.edition is distinct from old.edition or new.day_number is distinct from old.day_number or new.slug is distinct from old.slug then
    raise exception 'Edition, day and slug are fixed after creation.' using errcode = '23514';
  end if;
  new.updated_at := now();
  if (select auth.uid()) is not null then new.updated_by := (select auth.uid()); end if;
  return new;
end $$;
drop trigger if exists gif_assignments_touch_trg on public.gif_assignments;
create trigger gif_assignments_touch_trg before update on public.gif_assignments for each row execute function public.gif_touch_updated();

-- Notifications: delegates may only mark their own as read.
create or replace function public.gif_notification_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Only read_at can change.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists gif_notification_guard_trg on public.gif_notifications;
create trigger gif_notification_guard_trg before update on public.gif_notifications for each row execute function public.gif_notification_guard();

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.gif_admins enable row level security;
alter table public.gif_teams enable row level security;
alter table public.gif_team_members enable row level security;
alter table public.gif_programme_days enable row level security;
alter table public.gif_assignments enable row level security;
alter table public.gif_submissions enable row level security;
alter table public.gif_submission_files enable row level security;
alter table public.gif_assessments enable row level security;
alter table public.gif_notifications enable row level security;

revoke all on public.gif_admins, public.gif_teams, public.gif_team_members, public.gif_programme_days, public.gif_assignments,
  public.gif_submissions, public.gif_submission_files, public.gif_assessments, public.gif_notifications from anon, authenticated;

-- admins: you can see only whether you yourself are one; nobody can write through the API
drop policy if exists "gif admins: read self" on public.gif_admins;
create policy "gif admins: read self" on public.gif_admins for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "gif teams: own team or admin" on public.gif_teams;
create policy "gif teams: own team or admin" on public.gif_teams for select to authenticated
  using (public.gif_is_admin() or id = public.gif_my_team_id());

drop policy if exists "gif team members: own team or admin" on public.gif_team_members;
create policy "gif team members: own team or admin" on public.gif_team_members for select to authenticated
  using (public.gif_is_admin() or team_id = public.gif_my_team_id());

drop policy if exists "gif days: delegates and admins read" on public.gif_programme_days;
create policy "gif days: delegates and admins read" on public.gif_programme_days for select to authenticated
  using (public.gif_is_admin() or public.gif_my_delegate_id() is not null);
drop policy if exists "gif days: admins write" on public.gif_programme_days;
create policy "gif days: admins write" on public.gif_programme_days for update to authenticated
  using (public.gif_is_admin()) with check (public.gif_is_admin());

drop policy if exists "gif assignments: delegates read active, admins all" on public.gif_assignments;
create policy "gif assignments: delegates read active, admins all" on public.gif_assignments for select to authenticated
  using (public.gif_is_admin() or (is_active and public.gif_my_delegate_id() is not null));
drop policy if exists "gif assignments: admins insert" on public.gif_assignments;
create policy "gif assignments: admins insert" on public.gif_assignments for insert to authenticated with check (public.gif_is_admin());
drop policy if exists "gif assignments: admins update" on public.gif_assignments;
create policy "gif assignments: admins update" on public.gif_assignments for update to authenticated
  using (public.gif_is_admin()) with check (public.gif_is_admin());

drop policy if exists "gif submissions: read own, team or admin" on public.gif_submissions;
create policy "gif submissions: read own, team or admin" on public.gif_submissions for select to authenticated
  using (public.gif_is_admin()
         or (delegate_id is not null and delegate_id = public.gif_my_delegate_id())
         or (team_id is not null and team_id = public.gif_my_team_id()));
drop policy if exists "gif submissions: delegates create own" on public.gif_submissions;
create policy "gif submissions: delegates create own" on public.gif_submissions for insert to authenticated
  with check ((delegate_id is not null and delegate_id = public.gif_my_delegate_id())
           or (team_id is not null and team_id = public.gif_my_team_id()));
drop policy if exists "gif submissions: delegates edit own while open" on public.gif_submissions;
create policy "gif submissions: delegates edit own while open" on public.gif_submissions for update to authenticated
  using (public.gif_can_edit_submission(id))
  with check ((delegate_id is not null and delegate_id = public.gif_my_delegate_id())
           or (team_id is not null and team_id = public.gif_my_team_id()));

drop policy if exists "gif files: read if submission visible" on public.gif_submission_files;
create policy "gif files: read if submission visible" on public.gif_submission_files for select to authenticated
  using (public.gif_can_view_submission(submission_id));
-- inserts go through /api/gif/files (server checks ownership and the real file type, then writes as service role)
drop policy if exists "gif files: edit description while open" on public.gif_submission_files;
create policy "gif files: edit description while open" on public.gif_submission_files for update to authenticated
  using (public.gif_can_edit_submission(submission_id)) with check (public.gif_can_edit_submission(submission_id));
drop policy if exists "gif files: remove while open" on public.gif_submission_files;
create policy "gif files: remove while open" on public.gif_submission_files for delete to authenticated
  using (public.gif_can_edit_submission(submission_id) and retention_status in ('active', 'not_applicable'));

drop policy if exists "gif assessments: read if submission visible" on public.gif_assessments;
create policy "gif assessments: read if submission visible" on public.gif_assessments for select to authenticated
  using (public.gif_can_view_submission(submission_id));
drop policy if exists "gif assessments: admins create" on public.gif_assessments;
create policy "gif assessments: admins create" on public.gif_assessments for insert to authenticated
  with check (public.gif_is_admin() and assessor_id = (select auth.uid()));

drop policy if exists "gif notifications: own" on public.gif_notifications;
create policy "gif notifications: own" on public.gif_notifications for select to authenticated
  using (delegate_id = public.gif_my_delegate_id());
drop policy if exists "gif notifications: mark own read" on public.gif_notifications;
create policy "gif notifications: mark own read" on public.gif_notifications for update to authenticated
  using (delegate_id = public.gif_my_delegate_id()) with check (delegate_id = public.gif_my_delegate_id());

grant select on public.gif_admins, public.gif_teams, public.gif_team_members, public.gif_programme_days, public.gif_assignments,
  public.gif_submissions, public.gif_submission_files, public.gif_assessments, public.gif_notifications to authenticated;
grant update on public.gif_programme_days, public.gif_assignments, public.gif_submissions, public.gif_notifications to authenticated;
grant update (description) on public.gif_submission_files to authenticated;
grant insert on public.gif_assignments, public.gif_submissions, public.gif_assessments to authenticated;
grant delete on public.gif_submission_files to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. Storage: private buckets + policies
-- ---------------------------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gif-story-proofs', 'gif-story-proofs', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gif-submission-files', 'gif-submission-files', false, 52428800, array[
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4', 'video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- gif-story-proofs/{delegate_id}/{submission_id}/{file}
drop policy if exists "gif story proofs: upload own" on storage.objects;
create policy "gif story proofs: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'gif-story-proofs'
              and (storage.foldername(name))[1] = public.gif_my_delegate_id()::text
              and public.gif_can_edit_submission(public.gif_try_uuid((storage.foldername(name))[2])));
drop policy if exists "gif story proofs: read own or admin" on storage.objects;
create policy "gif story proofs: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'gif-story-proofs'
         and (public.gif_is_admin() or (storage.foldername(name))[1] = public.gif_my_delegate_id()::text));
drop policy if exists "gif story proofs: delete own while open" on storage.objects;
create policy "gif story proofs: delete own while open" on storage.objects for delete to authenticated
  using (bucket_id = 'gif-story-proofs'
         and (storage.foldername(name))[1] = public.gif_my_delegate_id()::text
         and public.gif_can_edit_submission(public.gif_try_uuid((storage.foldername(name))[2])));

-- gif-submission-files/{submission_id}/{file}
drop policy if exists "gif submission files: upload while open" on storage.objects;
create policy "gif submission files: upload while open" on storage.objects for insert to authenticated
  with check (bucket_id = 'gif-submission-files' and public.gif_can_edit_submission(public.gif_try_uuid((storage.foldername(name))[1])));
drop policy if exists "gif submission files: read if submission visible" on storage.objects;
create policy "gif submission files: read if submission visible" on storage.objects for select to authenticated
  using (bucket_id = 'gif-submission-files' and public.gif_can_view_submission(public.gif_try_uuid((storage.foldername(name))[1])));
drop policy if exists "gif submission files: delete while open" on storage.objects;
create policy "gif submission files: delete while open" on storage.objects for delete to authenticated
  using (bucket_id = 'gif-submission-files' and public.gif_can_edit_submission(public.gif_try_uuid((storage.foldername(name))[1])));

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Seed: admin, teams, days, assignments (idempotent; never touches gif_delegates)
-- ---------------------------------------------------------------------------------------------------------------------
insert into public.gif_admins (user_id, note)
select u.id, 'GIF 2026 assessment admin (Arba)' from auth.users u where lower(u.email) = 'arbadzarido03@gmail.com'
on conflict (user_id) do nothing;

insert into public.gif_teams (edition, team_number, name) values
  ('GIF 2026', 1, 'Team 1'), ('GIF 2026', 2, 'Team 2'), ('GIF 2026', 3, 'Team 3'), ('GIF 2026', 4, 'Team 4')
on conflict (edition, team_number) do nothing;

insert into public.gif_team_members (team_id, delegate_id)
select t.id, d.id
  from (values
    (1, 'Osmar Zaidan'), (1, 'Philip Immanuel'), (1, 'Muhammad Rayyan Alvaro'),
    (2, 'Denver Wijaya'), (2, 'Razqa Binar Wiriadiredja'), (2, 'Muhammad Haidar Naufal Al Amien'),
    (3, 'Titania Nilam Alecea'), (3, 'Abdus Safi Aprilio'), (3, 'Agha Mahya Dayuga'),
    (4, 'Thepmontha Kayankij'), (4, 'Deana Adelia Chelsea'), (4, 'Xaviera Valentina')
  ) as m(team_number, full_name)
  join public.gif_teams t on t.edition = 'GIF 2026' and t.team_number = m.team_number
  join public.gif_delegates d on lower(btrim(d.full_name)) = lower(m.full_name)
on conflict do nothing;

insert into public.gif_programme_days (edition, day_number, title, theme, summary, day_date) values
  ('GIF 2026', 1, 'One City, Many Stories', 'Singapore Through Our Eyes',
   'The Singapore Story Hunt: explore the city with your team, meet people from other countries and capture the stories you find.', '2026-11-17'),
  ('GIF 2026', 2, 'From Regional Challenges to Winning Teams', 'Understand the Problem. Find Your Direction. Build Your Team.',
   'Build your team identity, choose an SDG 4 challenge area, and turn evidence into a clear problem statement and first solution direction.', '2026-11-18'),
  ('GIF 2026', 3, 'From Evidence to Impact', 'Validate the Problem. Design the Solution. Make Your Case.',
   'Validate your problem with evidence, design a solution for a real user, and make your case in a team pitch.', '2026-11-19'),
  ('GIF 2026', 4, 'Our Final Chapter', 'Reflect, Celebrate, and Carry the Impact Forward.',
   'Short, meaningful closing tasks: reflect on what changed, commit to one action at home, and document your GIF experience.', '2026-11-20')
on conflict (edition, day_number) do nothing;

insert into public.gif_assignments (edition, day_number, slug, sort_order, submission_type, title, purpose, instructions, deliverables, submission_format, fields, rubric) values
-- DAY 1 ------------------------------------------------------------------------------------------------------------
('GIF 2026', 1, 'day1-group-reels', 1, 'group', 'Group Reels: The Singapore Story Hunt',
 'Show Singapore through your team''s eyes in one collaborative Reels video.',
 'Make one Reels video together (about 30–60 seconds) from the Story Hunt. Every member should contribute ideas, footage or editing. One member submits for the whole team; everyone in the team sees the same submission and its assessment.',
 array['One collaborative Reels video per team (about 30–60 seconds)', 'Every group member contributes'],
 'Instagram Reels link (or Google Drive link), or a video upload (MP4/MOV, max 50 MB), plus a short concept description.',
 $j$[
  {"key":"group_name","label":"Group name","type":"text","required":true},
  {"key":"group_members","label":"Group members","type":"members"},
  {"key":"reels_link","label":"Reels video link","type":"url","required":true,"or_field":"reels_file","placeholder":"https://www.instagram.com/reel/…","help":"Instagram Reels or Google Drive link. Or upload the video below instead."},
  {"key":"reels_file","label":"Or upload the video","type":"files","accept":"video/mp4,video/quicktime","max_files":1},
  {"key":"concept","label":"Short description of the content concept","type":"textarea","required":true,"max":1000},
  {"key":"all_contributed","label":"We confirm that all group members contributed to this Reels video.","type":"checkbox","required":true}
 ]$j$::jsonb,
 $j$[{"key":"completion","label":"Completion"},{"key":"creativity","label":"Creativity"},{"key":"collaboration","label":"Collaboration"},{"key":"relevance","label":"Content relevance"},{"key":"evidence","label":"Quality of evidence"}]$j$::jsonb),
('GIF 2026', 1, 'day1-individual-content', 2, 'individual', 'Individual Content: Stories, Interview & Clips',
 'Document your own Story Hunt: what you saw, who you met and what stayed with you.',
 'Post at least two Instagram Stories during the Story Hunt and upload a screenshot of each one. Do at least one interview with someone from another country, and film at least five original video clips. Share links to your footage (a Google Drive folder works well) and answer the reflection question.',
 array['At least two Instagram Stories (screenshot proof)', 'At least one cross-country interview', 'At least five original video clips', 'Short reflection'],
 'Story screenshots (JPG, PNG or WEBP, max 10 MB each), links or uploads for your interview and clips, and a short text reflection.',
 $j$[
  {"key":"story_proof","label":"Instagram Story proof","type":"story_proof","required":true,"min_files":2,"story_day":1,"help":"Upload a screenshot of each Story you posted (at least two)."},
  {"key":"interview_link","label":"Interview footage link","type":"url","required":true,"or_field":"interview_file","placeholder":"https://drive.google.com/…","help":"Your cross-country interview. Or upload it below."},
  {"key":"interview_file","label":"Or upload the interview","type":"files","accept":"video/mp4,video/quicktime","max_files":1},
  {"key":"clips_link","label":"Original video clips (link to folder)","type":"url","required":true,"or_field":"clips_files","placeholder":"https://drive.google.com/…","help":"At least five clips you filmed yourself. A shared Drive folder is easiest, or upload them below."},
  {"key":"clips_files","label":"Or upload your clips","type":"files","accept":"video/mp4,video/quicktime","max_files":10},
  {"key":"reflection","label":"What was your most memorable interaction today?","type":"textarea","required":true,"max":2000}
 ]$j$::jsonb,
 $j$[{"key":"completion","label":"Completion"},{"key":"creativity","label":"Creativity"},{"key":"collaboration","label":"Collaboration"},{"key":"relevance","label":"Content relevance"},{"key":"evidence","label":"Quality of evidence"}]$j$::jsonb),
-- DAY 2 ------------------------------------------------------------------------------------------------------------
('GIF 2026', 2, 'day2-group-project', 1, 'group', 'Team Project: Problem & Direction',
 'Agree who you are as a team, which SDG 4 challenge you will work on, and why it matters.',
 'Work as a team to define your identity and vision, choose one SDG 4 challenge area, name your target beneficiary, and write an initial problem statement backed by evidence. Analyse the root cause and propose an initial solution direction. One member submits for the team.',
 array['Team identity and name', 'Shared team vision', 'Selected SDG 4 challenge area', 'Target beneficiary', 'Initial problem statement', 'Root cause analysis', 'Supporting evidence or research', 'Initial solution direction'],
 'Text fields, plus an optional supporting document or presentation (PDF, PPTX, DOCX) or link.',
 $j$[
  {"key":"team_name","label":"Team name","type":"text","required":true},
  {"key":"team_vision","label":"Team vision","type":"textarea","required":true,"max":1000},
  {"key":"sdg4_category","label":"Selected SDG 4 challenge area","type":"select","required":true,"options":["Foundational Learning Gaps","Unequal Access to Quality Education","Teacher Support and Capacity","Digital and AI Learning Readiness","Inclusive Education and Learning Barriers","Education-to-Employment Transitions","Other (explain in the problem statement)"]},
  {"key":"target_beneficiary","label":"Target beneficiary","type":"textarea","required":true,"max":1000},
  {"key":"problem_statement","label":"Problem statement","type":"textarea","required":true,"max":2000},
  {"key":"root_cause","label":"Root cause","type":"textarea","required":true,"max":2000},
  {"key":"evidence","label":"Supporting research / evidence","type":"textarea","required":true,"max":3000,"help":"Name your sources (organisation, year, link)."},
  {"key":"solution_direction","label":"Initial solution direction","type":"textarea","required":true,"max":2000},
  {"key":"discussion_summary","label":"Group discussion summary","type":"textarea","required":true,"max":2000},
  {"key":"supporting_link","label":"Supporting document or presentation link (optional)","type":"url"},
  {"key":"supporting_files","label":"Supporting document or presentation upload (optional)","type":"files","accept":"application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document","max_files":3}
 ]$j$::jsonb,
 $j$[{"key":"problem_clarity","label":"Problem clarity"},{"key":"beneficiary","label":"Beneficiary understanding"},{"key":"evidence","label":"Evidence quality"},{"key":"sdg4","label":"SDG 4 relevance"},{"key":"participation","label":"Team participation"}]$j$::jsonb),
('GIF 2026', 2, 'day2-individual-reflection', 2, 'individual', 'Individual Reflection',
 'Capture how today''s discussion shaped your thinking.',
 'Answer the reflection question in your own words and confirm your participation in today''s group discussions and activities. Everyone completes their own reflection.',
 array['Individual reflection', 'Confirmation of participation'],
 'Text response.',
 $j$[
  {"key":"reflection","label":"What was the most important insight you gained from today's discussion, and how did your perspective change?","type":"textarea","required":true,"max":2000},
  {"key":"participation_confirmed","label":"I confirm that I took part in today's group discussions and activities.","type":"checkbox","required":true}
 ]$j$::jsonb,
 $j$[{"key":"problem_clarity","label":"Problem clarity"},{"key":"beneficiary","label":"Beneficiary understanding"},{"key":"evidence","label":"Evidence quality"},{"key":"sdg4","label":"SDG 4 relevance"},{"key":"participation","label":"Team participation"}]$j$::jsonb),
-- DAY 3 ------------------------------------------------------------------------------------------------------------
('GIF 2026', 3, 'day3-group-project', 1, 'group', 'Team Project: Solution & Pitch',
 'Turn your validated problem into a solution concept and make your case.',
 'Improve your problem statement with what you validated, describe your target user and the alternatives that already exist, and explain your solution: how it works, what makes it different, and the impact you expect (with indicators). Share your prototype or demo and your pitch deck. One member submits for the team.',
 array['Improved problem statement', 'Evidence validation', 'Target user profile', 'Solution concept and value proposition', 'Prototype or demonstration', 'Impact logic and indicators', 'Initial implementation plan', 'Team pitch presentation'],
 'Text fields, prototype/demo and pitch deck as links or uploads (PDF, PPTX, images or video).',
 $j$[
  {"key":"updated_problem","label":"Updated problem statement","type":"textarea","required":true,"max":2000},
  {"key":"evidence_findings","label":"Evidence and validation findings","type":"textarea","required":true,"max":3000},
  {"key":"target_user","label":"Target user / beneficiary","type":"textarea","required":true,"max":1500},
  {"key":"alternatives","label":"Existing alternatives or solutions","type":"textarea","required":true,"max":2000},
  {"key":"proposed_solution","label":"Proposed solution","type":"textarea","required":true,"max":2000},
  {"key":"how_it_works","label":"How the solution works","type":"textarea","required":true,"max":2000},
  {"key":"differentiation","label":"What makes the solution different","type":"textarea","required":true,"max":1500},
  {"key":"prototype_link","label":"Prototype / demo link","type":"url","required":true,"or_field":"prototype_files"},
  {"key":"prototype_files","label":"Or upload the prototype / demo","type":"files","accept":"image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime","max_files":5},
  {"key":"expected_impact","label":"Expected impact","type":"textarea","required":true,"max":2000},
  {"key":"impact_indicators","label":"Impact indicators","type":"textarea","required":true,"max":1500,"help":"How would you measure that it works?"},
  {"key":"implementation","label":"Implementation direction","type":"textarea","required":true,"max":2000},
  {"key":"pitch_link","label":"Pitch deck link","type":"url","required":true,"or_field":"pitch_files"},
  {"key":"pitch_files","label":"Or upload the pitch deck","type":"files","accept":"application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation","max_files":1}
 ]$j$::jsonb,
 $j$[{"key":"validation","label":"Problem validation"},{"key":"relevance","label":"Solution relevance"},{"key":"feasibility","label":"Feasibility"},{"key":"impact","label":"Impact potential"},{"key":"presentation","label":"Presentation quality"}]$j$::jsonb),
('GIF 2026', 3, 'day3-individual-reflection', 2, 'individual', 'Individual Reflection',
 'Recognise your own contribution and what you learned.',
 'Answer the reflection question in your own words. Everyone completes their own reflection.',
 array['Individual reflection'],
 'Text response.',
 $j$[
  {"key":"reflection","label":"What is one contribution you made to your team, and what is one thing you learned about solving real-world problems?","type":"textarea","required":true,"max":2000}
 ]$j$::jsonb,
 $j$[{"key":"validation","label":"Problem validation"},{"key":"relevance","label":"Solution relevance"},{"key":"feasibility","label":"Feasibility"},{"key":"impact","label":"Impact potential"},{"key":"presentation","label":"Presentation quality"}]$j$::jsonb),
-- DAY 4 (admin-editable in /dashboard/gif/admin → Assignments) ------------------------------------------------------
('GIF 2026', 4, 'day4-individual-final', 1, 'individual', 'My Final Chapter',
 'Close your GIF journey: reflect, commit to one action and keep a record of the experience.',
 'Keep it short and honest. Write your final reflection and one concrete action you will take after returning home. Upload a screenshot of your final Instagram Story, share a short reflection video or Reels if you made one, and add a favourite memory or photo with a sentence about why it matters.',
 array['Final reflection', 'Personal commitment', 'Final Instagram Story proof', 'Short reflection video or Reels (optional)', 'Favourite memory / photo', 'Final participation confirmation'],
 'Short text answers, a Story screenshot, an optional video link and one photo (JPG, PNG or WEBP).',
 $j$[
  {"key":"final_reflection","label":"What has GIF changed in the way you see yourself, your future, or Southeast Asia?","type":"textarea","required":true,"max":2000},
  {"key":"commitment","label":"What is one concrete action you will take after returning home?","type":"textarea","required":true,"max":1000},
  {"key":"story_proof","label":"Final Instagram Story proof","type":"story_proof","required":true,"min_files":1,"story_day":4},
  {"key":"reflection_video_link","label":"Short reflection video or Reels link (optional)","type":"url"},
  {"key":"memory_photo","label":"Favourite memory / photo","type":"files","required":true,"accept":"image/jpeg,image/png,image/webp","max_files":1},
  {"key":"memory_caption","label":"Why this memory matters to you","type":"textarea","required":true,"max":500},
  {"key":"participation_confirmed","label":"I confirm that I took part in the GIF 2026 programme through to the final day.","type":"checkbox","required":true}
 ]$j$::jsonb,
 $j$[{"key":"reflection","label":"Reflection quality"},{"key":"learning","label":"Learning outcomes"},{"key":"commitment","label":"Commitment"},{"key":"completion","label":"Completion"}]$j$::jsonb),
('GIF 2026', 4, 'day4-group-final', 2, 'group', 'Our Team''s Next Step',
 'Agree as a team on what you take forward.',
 'Write a short team reflection, confirm your initial project direction for GIF Summer 2027, add one group photo or visual memory, and state your next-step commitment. One member submits for the team.',
 array['Final team reflection', 'Initial GIF Summer 2027 project direction', 'One group photo or visual memory', 'Next-step commitment'],
 'Short text answers and one photo (JPG, PNG or WEBP).',
 $j$[
  {"key":"team_reflection","label":"Final team reflection","type":"textarea","required":true,"max":1500},
  {"key":"summer_2027_direction","label":"Our initial GIF Summer 2027 project direction","type":"textarea","required":true,"max":1500},
  {"key":"group_photo","label":"Group photo or visual memory","type":"files","required":true,"accept":"image/jpeg,image/png,image/webp","max_files":1},
  {"key":"next_step","label":"Our next-step commitment","type":"textarea","required":true,"max":1000}
 ]$j$::jsonb,
 $j$[{"key":"reflection","label":"Reflection quality"},{"key":"learning","label":"Learning outcomes"},{"key":"commitment","label":"Commitment"},{"key":"completion","label":"Completion"}]$j$::jsonb)
on conflict (edition, slug) do nothing;
