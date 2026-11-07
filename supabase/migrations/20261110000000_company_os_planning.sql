-- Company OS: unified planning and execution (Timeline, Calendar, Tasks, Projects, Marketing).
--
-- Additive and re-runnable. Nothing is dropped and no existing row is rewritten, except:
--   * os_event_tasks is back-filled from os_events.task_id (a copy of an existing link into the new link table);
--   * check constraints widen: os_events.status gains Tentative and Completed; os_campaign_items.status gains In review;
--     os_document_links and os_comments accept event, timeline and campaign_plan;
--   * os_events_before_write, os_create_event, os_can_view_entity and the os_campaign_items policies are redefined
--     (same rules plus the new links).
--
-- Ownership (one record per thing, no copies):
--   os_timeline_items   strategic milestones (TL-xxx). Not calendar events. Optional project, priority, description,
--                       and dependencies (os_timeline_dependencies).
--   os_events           scheduled time (EV-xxxx). A recurring event is ONE row (the master) with a recurrence rule;
--                       single occurrences that were moved, edited or cancelled are os_event_exceptions rows keyed by the
--                       occurrence's original start. "This and following" splits the series into two masters.
--   os_tasks            work (TSK-xxxx). A deadline is not an event. A task appears on the calendar only when it is
--                       scheduled (scheduled_start/end), pinned (on_calendar) or linked to an event (os_event_tasks).
--   os_campaigns        marketing campaigns (CMP-xxxx); os_campaign_items are their content pieces (not tasks).
--   Links               os_event_tasks (event ↔ many tasks), os_events.timeline_item_id / project_id / campaign_id /
--                       partnership_id, os_tasks.timeline_item_id, os_task_dependencies, os_timeline_dependencies.
--   Invitations         os_event_attendees keeps who was invited, through which group (via_group), by whom and when:
--                       the snapshot at invite time. Groups are resolved when inviting and never re-applied silently.
--   Notifications       os_notifications, written only by triggers here (never by the browser), one per person and change.

insert into public.os_id_counters (prefix, last) values ('CMP', 0) on conflict (prefix) do nothing;

-- ── Recurrence rules ───────────────────────────────────────────────────────────────────────────────────────────────
-- {"freq": "daily"|"weekly"|"monthly"|"yearly", "interval": 1-99, "byweekday": ["MO",...] (weekly only),
--  "until": "YYYY-MM-DD" | "count": 1-730}   (biweekly = weekly with interval 2; at most one of until/count)
create or replace function public.os_valid_recurrence(j jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; d text;
begin
  if j is null then return true; end if;
  if jsonb_typeof(j) <> 'object' then return false; end if;
  for k in select jsonb_object_keys(j) loop
    if k not in ('freq', 'interval', 'byweekday', 'until', 'count') then return false; end if;
  end loop;
  if coalesce(j->>'freq', '') not in ('daily', 'weekly', 'monthly', 'yearly') then return false; end if;
  if j ? 'interval' and (jsonb_typeof(j->'interval') <> 'number' or (j->>'interval')::numeric not between 1 and 99 or (j->>'interval')::numeric % 1 <> 0) then return false; end if;
  if j ? 'count' and (jsonb_typeof(j->'count') <> 'number' or (j->>'count')::numeric not between 1 and 730 or (j->>'count')::numeric % 1 <> 0) then return false; end if;
  if j ? 'until' and (jsonb_typeof(j->'until') <> 'string' or (j->>'until') !~ '^\d{4}-\d{2}-\d{2}$') then return false; end if;
  if j ? 'until' and j ? 'count' then return false; end if;
  if j ? 'until' then perform (j->>'until')::date; end if;
  if j ? 'byweekday' then
    if j->>'freq' <> 'weekly' or jsonb_typeof(j->'byweekday') <> 'array' or jsonb_array_length(j->'byweekday') not between 1 and 7 then return false; end if;
    for d in select jsonb_array_elements_text(j->'byweekday') loop
      if d not in ('SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA') then return false; end if;
    end loop;
  end if;
  return true;
exception when others then return false;
end $$;
grant execute on function public.os_valid_recurrence(jsonb) to authenticated, service_role;

-- ── Events: recurrence, more links, statuses, Google invitations ───────────────────────────────────────────────────
alter table public.os_events add column if not exists recurrence jsonb;
-- The last instant any occurrence can reach (null = no end). Kept by the trigger; used to find series in a window.
alter table public.os_events add column if not exists series_ends_at timestamptz;
-- A master split off by "this and following" points at the series it came from.
alter table public.os_events add column if not exists series_id text references public.os_events (id) on delete set null;
alter table public.os_events add column if not exists partnership_id text references public.os_partnerships (id) on delete set null;
-- When pushed to Google, also add the attendees as Google guests (Google then emails them). Off unless chosen.
alter table public.os_events add column if not exists google_invites boolean not null default false;
do $$ begin
  alter table public.os_events add constraint os_events_recurrence_check check (public.os_valid_recurrence(recurrence));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.os_events drop constraint if exists os_events_status_check;
  alter table public.os_events add constraint os_events_status_check check (status in ('Scheduled', 'Tentative', 'Completed', 'Cancelled'));
end $$;
create index if not exists os_events_series_idx on public.os_events (starts_at, series_ends_at) where recurrence is not null;

-- ── Campaigns (marketing) ──────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_campaigns (
  id               text primary key check (id ~ '^CMP-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id) default 'DIV-03',
  name             text not null check (length(trim(name)) between 1 and 200),
  objective        text check (objective is null or length(objective) <= 2000),
  description      text check (description is null or length(description) <= 5000),
  owner_person_id  text references public.os_people (id) on delete set null,
  start_date       date,
  end_date         date,
  status           text not null default 'Planned' check (status in ('Idea', 'Planned', 'Active', 'Paused', 'Completed', 'Cancelled')),
  project_id       text references public.os_projects (id) on delete set null,
  timeline_item_id text references public.os_timeline_items (id) on delete set null,
  kpi_id           text references public.os_kpis (id) on delete set null,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists os_campaigns_company_idx on public.os_campaigns (company_code, status);

alter table public.os_events add column if not exists campaign_id text references public.os_campaigns (id) on delete set null;
create index if not exists os_events_campaign_idx on public.os_events (campaign_id) where campaign_id is not null;
create index if not exists os_events_timeline_idx on public.os_events (timeline_item_id) where timeline_item_id is not null;

-- Content items belong to a campaign and get a real publication time, a creator and a reviewer. Not tasks.
alter table public.os_campaign_items add column if not exists campaign_id text references public.os_campaigns (id) on delete set null;
alter table public.os_campaign_items add column if not exists pillar text check (pillar is null or length(pillar) <= 100);
alter table public.os_campaign_items add column if not exists publish_at timestamptz;
alter table public.os_campaign_items add column if not exists creator_person_id text references public.os_people (id) on delete set null;
alter table public.os_campaign_items add column if not exists reviewer_person_id text references public.os_people (id) on delete set null;
alter table public.os_campaign_items add column if not exists brief text check (brief is null or length(brief) <= 5000);
alter table public.os_campaign_items add column if not exists asset_url text check (asset_url is null or (asset_url ~ '^https://' and length(asset_url) <= 500));
create index if not exists os_campaign_items_campaign_idx on public.os_campaign_items (campaign_id) where campaign_id is not null;
create index if not exists os_campaign_items_publish_idx on public.os_campaign_items (publish_at) where publish_at is not null;
do $$ begin
  alter table public.os_campaign_items drop constraint if exists os_campaign_items_status_check;
  alter table public.os_campaign_items add constraint os_campaign_items_status_check
    check (status in ('Idea', 'Planned', 'In production', 'In review', 'Ready to publish', 'Published', 'Cancelled'));
end $$;

-- ── Tasks: start date, explicit scheduling, pin to calendar ────────────────────────────────────────────────────────
alter table public.os_tasks add column if not exists start_date date;
alter table public.os_tasks add column if not exists scheduled_start timestamptz;
alter table public.os_tasks add column if not exists scheduled_end timestamptz;
alter table public.os_tasks add column if not exists on_calendar boolean not null default false;
do $$ begin
  alter table public.os_tasks add constraint os_tasks_schedule_check
    check ((scheduled_start is null) = (scheduled_end is null) and (scheduled_end is null or scheduled_end > scheduled_start));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.os_tasks add constraint os_tasks_start_check check (start_date is null or due_date is null or due_date >= start_date);
exception when duplicate_object then null; end $$;
create index if not exists os_tasks_scheduled_idx on public.os_tasks (scheduled_start) where scheduled_start is not null;
grant insert (start_date, scheduled_start, scheduled_end, on_calendar), update (start_date, scheduled_start, scheduled_end, on_calendar)
  on public.os_tasks to authenticated;

-- Who assigned someone, and when (the assigning user).
alter table public.os_task_assignees add column if not exists added_by text;
alter table public.os_task_assignees add column if not exists added_at timestamptz not null default now();
create or replace function public.os_task_assignees_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.added_by := coalesce(public.os_current_person(), new.added_by);
  new.added_at := now();
  return new;
end $$;
revoke all on function public.os_task_assignees_stamp() from public, anon, authenticated;
drop trigger if exists os_task_assignees_stamp on public.os_task_assignees;
create trigger os_task_assignees_stamp before insert on public.os_task_assignees for each row execute function public.os_task_assignees_stamp();

-- ── Timeline: project, priority, description ──────────────────────────────────────────────────────────────────────
alter table public.os_timeline_items add column if not exists project_id text references public.os_projects (id) on delete set null;
alter table public.os_timeline_items add column if not exists priority text check (priority is null or priority in ('P1 Critical', 'P2 High', 'P3 Normal', 'P4 Low'));
alter table public.os_timeline_items add column if not exists description text check (description is null or length(description) <= 5000);
create index if not exists os_timeline_project_idx on public.os_timeline_items (project_id) where project_id is not null;
grant insert (project_id, priority, description), update (project_id, priority, description, title, deliverable, lead_division_id, is_major)
  on public.os_timeline_items to authenticated;

-- ── Attendees: the invitation snapshot ─────────────────────────────────────────────────────────────────────────────
alter table public.os_event_attendees add column if not exists via_group text check (via_group is null or length(via_group) <= 120);
alter table public.os_event_attendees add column if not exists added_by text;
alter table public.os_event_attendees add column if not exists added_at timestamptz not null default now();
-- Google's answer for this guest, read back by the server when the event is synced with invitations.
alter table public.os_event_attendees add column if not exists response_status text
  check (response_status is null or response_status in ('needsAction', 'accepted', 'declined', 'tentative'));
revoke insert on public.os_event_attendees from authenticated;
grant insert (event_id, person_id, via_group) on public.os_event_attendees to authenticated;
create or replace function public.os_event_attendees_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.os_caller_is_privileged() then
    new.added_by := public.os_current_person(); new.added_at := now(); new.response_status := null;
  end if;
  return new;
end $$;
revoke all on function public.os_event_attendees_stamp() from public, anon, authenticated;
drop trigger if exists os_event_attendees_stamp on public.os_event_attendees;
create trigger os_event_attendees_stamp before insert on public.os_event_attendees for each row execute function public.os_event_attendees_stamp();

-- ── Occurrence exceptions ──────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_event_exceptions (
  event_id          text not null references public.os_events (id) on delete cascade,
  occurrence_start  timestamptz not null,           -- the occurrence's original start, as the rule generates it
  cancelled         boolean not null default false,
  title             text check (title is null or length(trim(title)) between 1 and 200),
  description       text check (description is null or length(description) <= 5000),
  starts_at         timestamptz,
  ends_at           timestamptz,
  location          text check (location is null or length(location) <= 300),
  meeting_url       text check (meeting_url is null or (meeting_url ~ '^https://' and length(meeting_url) <= 500)),
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (event_id, occurrence_start),
  check ((starts_at is null) = (ends_at is null) and (ends_at is null or ends_at >= starts_at))
);
alter table public.os_event_exceptions enable row level security;
revoke all on public.os_event_exceptions from anon, authenticated;
grant select, delete on public.os_event_exceptions to authenticated;
grant insert (event_id, occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url),
      update (cancelled, title, description, starts_at, ends_at, location, meeting_url) on public.os_event_exceptions to authenticated;
grant select, insert, update, delete on public.os_event_exceptions to service_role;

create or replace function public.os_event_exceptions_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.os_events e where e.id = new.event_id and e.recurrence is not null) then
    raise exception 'Only a recurring event has occurrences' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then new.created_by := public.os_current_person(); new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_event_exceptions_before_write() from public, anon, authenticated;
drop trigger if exists os_event_exceptions_rules on public.os_event_exceptions;
create trigger os_event_exceptions_rules before insert or update on public.os_event_exceptions for each row execute function public.os_event_exceptions_before_write();

drop policy if exists os_event_exceptions_read on public.os_event_exceptions;
create policy os_event_exceptions_read on public.os_event_exceptions for select to authenticated using (public.os_can_view_event(event_id));
drop policy if exists os_event_exceptions_write on public.os_event_exceptions;
create policy os_event_exceptions_write on public.os_event_exceptions for all to authenticated
  using (public.os_can_edit_event(event_id)) with check (public.os_can_edit_event(event_id));

-- ── Event ↔ tasks (one event, many tasks; a task, many events) ─────────────────────────────────────────────────────
create table if not exists public.os_event_tasks (
  event_id    text not null references public.os_events (id) on delete cascade,
  task_id     text not null references public.os_tasks (id) on delete cascade,
  created_by  text,
  created_at  timestamptz not null default now(),
  primary key (event_id, task_id)
);
create index if not exists os_event_tasks_task_idx on public.os_event_tasks (task_id);
alter table public.os_event_tasks enable row level security;
revoke all on public.os_event_tasks from anon, authenticated;
grant select, delete on public.os_event_tasks to authenticated;
grant insert (event_id, task_id) on public.os_event_tasks to authenticated;
grant select, insert, update, delete on public.os_event_tasks to service_role;

create or replace function public.os_same_company_event_task(p_event text, p_task text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_events e join public.os_tasks t on t.id = p_task
                 where e.id = p_event and (t.company_code = e.company_code or e.company_code = 'HQ'))
$$;
revoke all on function public.os_same_company_event_task(text, text) from public, anon;
grant execute on function public.os_same_company_event_task(text, text) to authenticated, service_role;

drop policy if exists os_event_tasks_read on public.os_event_tasks;
create policy os_event_tasks_read on public.os_event_tasks for select to authenticated
  using (public.os_can_view_event(event_id) and public.os_can_view_task(task_id));
drop policy if exists os_event_tasks_insert on public.os_event_tasks;
create policy os_event_tasks_insert on public.os_event_tasks for insert to authenticated
  with check (public.os_same_company_event_task(event_id, task_id)
              and ((public.os_can_edit_event(event_id) and public.os_can_view_task(task_id))
                   or (public.os_can_edit_task(task_id) and public.os_can_view_event(event_id))));
drop policy if exists os_event_tasks_delete on public.os_event_tasks;
create policy os_event_tasks_delete on public.os_event_tasks for delete to authenticated
  using (public.os_can_edit_event(event_id) or public.os_can_edit_task(task_id));

create or replace function public.os_event_tasks_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.created_by := coalesce(public.os_current_person(), new.created_by); new.created_at := now(); return new; end $$;
revoke all on function public.os_event_tasks_stamp() from public, anon, authenticated;
drop trigger if exists os_event_tasks_stamp on public.os_event_tasks;
create trigger os_event_tasks_stamp before insert on public.os_event_tasks for each row execute function public.os_event_tasks_stamp();

-- The single task link on an event (os_events.task_id, from the first calendar release) is kept as a link row too.
insert into public.os_event_tasks (event_id, task_id)
  select e.id, e.task_id from public.os_events e where e.task_id is not null
  on conflict do nothing;
create or replace function public.os_events_task_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.task_id is not null and (tg_op = 'INSERT' or new.task_id is distinct from old.task_id) then
    insert into public.os_event_tasks (event_id, task_id) values (new.id, new.task_id) on conflict do nothing;
  end if;
  return null;
end $$;
revoke all on function public.os_events_task_link() from public, anon, authenticated;
drop trigger if exists os_events_task_link on public.os_events;
create trigger os_events_task_link after insert or update of task_id on public.os_events for each row execute function public.os_events_task_link();

-- ── Dependencies ───────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_task_dependencies (
  task_id             text not null references public.os_tasks (id) on delete cascade,
  depends_on_task_id  text not null references public.os_tasks (id) on delete cascade,
  created_by          text,
  created_at          timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);
create index if not exists os_task_dependencies_on_idx on public.os_task_dependencies (depends_on_task_id);
create table if not exists public.os_timeline_dependencies (
  item_id        text not null references public.os_timeline_items (id) on delete cascade,
  depends_on_id  text not null references public.os_timeline_items (id) on delete cascade,
  created_by     text,
  created_at     timestamptz not null default now(),
  primary key (item_id, depends_on_id),
  check (item_id <> depends_on_id)
);
create index if not exists os_timeline_dependencies_on_idx on public.os_timeline_dependencies (depends_on_id);

-- No cycles: a new edge A → B is refused when A is already reachable from B.
create or replace function public.os_dependency_rules() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a text; b text; cyc boolean;
begin
  if tg_table_name = 'os_task_dependencies' then
    a := new.task_id; b := new.depends_on_task_id;
    with recursive r(id) as (select b union select d.depends_on_task_id from public.os_task_dependencies d join r on d.task_id = r.id)
    select exists (select 1 from r where id = a) into cyc;
    if not exists (select 1 from public.os_tasks x join public.os_tasks y on y.id = b where x.id = a and x.company_code = y.company_code) then
      raise exception 'Dependent tasks must be in the same company' using errcode = '23514';
    end if;
  else
    a := new.item_id; b := new.depends_on_id;
    with recursive r(id) as (select b union select d.depends_on_id from public.os_timeline_dependencies d join r on d.item_id = r.id)
    select exists (select 1 from r where id = a) into cyc;
  end if;
  if cyc then raise exception 'That dependency would make a loop' using errcode = '23514'; end if;
  new.created_by := public.os_current_person(); new.created_at := now();
  return new;
end $$;
revoke all on function public.os_dependency_rules() from public, anon, authenticated;
drop trigger if exists os_task_dependencies_rules on public.os_task_dependencies;
create trigger os_task_dependencies_rules before insert on public.os_task_dependencies for each row execute function public.os_dependency_rules();
drop trigger if exists os_timeline_dependencies_rules on public.os_timeline_dependencies;
create trigger os_timeline_dependencies_rules before insert on public.os_timeline_dependencies for each row execute function public.os_dependency_rules();

alter table public.os_task_dependencies enable row level security;
alter table public.os_timeline_dependencies enable row level security;
revoke all on public.os_task_dependencies, public.os_timeline_dependencies from anon, authenticated;
grant select, delete on public.os_task_dependencies, public.os_timeline_dependencies to authenticated;
grant insert (task_id, depends_on_task_id) on public.os_task_dependencies to authenticated;
grant insert (item_id, depends_on_id) on public.os_timeline_dependencies to authenticated;
grant select, insert, update, delete on public.os_task_dependencies, public.os_timeline_dependencies to service_role;

drop policy if exists os_task_dependencies_read on public.os_task_dependencies;
create policy os_task_dependencies_read on public.os_task_dependencies for select to authenticated
  using (public.os_can_view_task(task_id) and public.os_can_view_task(depends_on_task_id));
drop policy if exists os_task_dependencies_write on public.os_task_dependencies;
create policy os_task_dependencies_write on public.os_task_dependencies for all to authenticated
  using (public.os_can_edit_task(task_id))
  with check (public.os_can_edit_task(task_id) and public.os_can_view_task(depends_on_task_id));

create or replace function public.os_can_edit_timeline(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_timeline_items x where x.id = p_id
                 and (public.os_is_founder() or (x.lead_division_id is not null and public.os_manages_division(x.lead_division_id))))
$$;
revoke all on function public.os_can_edit_timeline(text) from public, anon;
grant execute on function public.os_can_edit_timeline(text) to authenticated, service_role;

drop policy if exists os_timeline_dependencies_read on public.os_timeline_dependencies;
create policy os_timeline_dependencies_read on public.os_timeline_dependencies for select to authenticated
  using (public.os_can_view_entity('timeline', item_id) and public.os_can_view_entity('timeline', depends_on_id));
drop policy if exists os_timeline_dependencies_write on public.os_timeline_dependencies;
create policy os_timeline_dependencies_write on public.os_timeline_dependencies for all to authenticated
  using (public.os_can_edit_timeline(item_id))
  with check (public.os_can_edit_timeline(item_id) and public.os_can_view_entity('timeline', depends_on_id));

-- ── Campaign rules, grants and policies ────────────────────────────────────────────────────────────────────────────
create or replace function public.os_campaign_row_visible(p_company text, p_division text, p_sensitivity text, p_project text, p_owner text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_can_view(p_company, p_division, p_sensitivity, 'project', coalesce(p_project, ''))
      or (public.os_is_staff() and p_owner = public.os_current_person())
$$;
create or replace function public.os_can_view_campaign(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_campaigns c where c.id = p_id
                 and public.os_campaign_row_visible(c.company_code, c.division_id, c.sensitivity, c.project_id, c.owner_person_id))
$$;
revoke all on function public.os_campaign_row_visible(text, text, text, text, text), public.os_can_view_campaign(text) from public, anon;
grant execute on function public.os_campaign_row_visible(text, text, text, text, text), public.os_can_view_campaign(text) to authenticated, service_role;

create or replace function public.os_campaigns_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; privileged boolean := public.os_caller_is_privileged();
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('CMP'); end if;
  if tg_op = 'UPDATE' then new.company_code := old.company_code; end if;
  if new.project_id is not null and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id) then
    select company_code into p from public.os_projects where id = new.project_id;
    if p is null or (not privileged and not public.os_can_view_project(new.project_id)) then
      raise exception 'A linked project doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if p.company_code <> new.company_code then raise exception 'A linked project must be in the same company' using errcode = '23514'; end if;
  end if;
  if new.timeline_item_id is not null and (tg_op = 'INSERT' or new.timeline_item_id is distinct from old.timeline_item_id)
     and not privileged and not public.os_can_view_entity('timeline', new.timeline_item_id) then
    raise exception 'A linked milestone doesn''t exist or you can''t see it' using errcode = '23503';
  end if;
  return new;
end $$;
revoke all on function public.os_campaigns_before_write() from public, anon, authenticated;
drop trigger if exists os_campaigns_a_rules on public.os_campaigns;
create trigger os_campaigns_a_rules before insert or update on public.os_campaigns for each row execute function public.os_campaigns_before_write();
drop trigger if exists os_campaigns_b_stamp on public.os_campaigns;
create trigger os_campaigns_b_stamp before insert or update on public.os_campaigns for each row execute function public.os_set_created_by();
drop trigger if exists os_campaigns_activity on public.os_campaigns;
create trigger os_campaigns_activity after insert or update or delete on public.os_campaigns for each row execute function public.os_activity_row('campaign_plan');

alter table public.os_campaigns enable row level security;
revoke all on public.os_campaigns from anon, authenticated;
grant select, delete on public.os_campaigns to authenticated;
grant insert (company_code, division_id, name, objective, description, owner_person_id, start_date, end_date, status, project_id, timeline_item_id, kpi_id, sensitivity),
      update (division_id, name, objective, description, owner_person_id, start_date, end_date, status, project_id, timeline_item_id, kpi_id, sensitivity)
  on public.os_campaigns to authenticated;
grant select, insert, update, delete on public.os_campaigns to service_role;

drop policy if exists os_campaigns_read on public.os_campaigns;
create policy os_campaigns_read on public.os_campaigns for select to authenticated
  using (public.os_campaign_row_visible(company_code, division_id, sensitivity, project_id, owner_person_id));
drop policy if exists os_campaigns_insert on public.os_campaigns;
create policy os_campaigns_insert on public.os_campaigns for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_campaigns_update on public.os_campaigns;
create policy os_campaigns_update on public.os_campaigns for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(project_id, '')) or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_can_create(company_code, division_id, sensitivity) or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));
drop policy if exists os_campaigns_delete on public.os_campaigns;
create policy os_campaigns_delete on public.os_campaigns for delete to authenticated
  using ((select public.os_is_founder()) or public.os_is_manager_for(company_code, division_id));

-- Content items: the creator and reviewer see and work on their pieces; a campaign link must be visible and in the
-- same company (the item takes the campaign's company on insert).
grant insert (campaign_id, pillar, publish_at, creator_person_id, reviewer_person_id, brief, asset_url),
      update (campaign_id, pillar, publish_at, creator_person_id, reviewer_person_id, brief, asset_url)
  on public.os_campaign_items to authenticated;
create or replace function public.os_campaign_items_links() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  if new.campaign_id is not null and (tg_op = 'INSERT' or new.campaign_id is distinct from old.campaign_id) then
    select company_code, name into c from public.os_campaigns where id = new.campaign_id;
    if c is null or (not public.os_caller_is_privileged() and not public.os_can_view_campaign(new.campaign_id)) then
      raise exception 'The campaign doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if tg_op = 'INSERT' then new.company_code := c.company_code;
    elsif c.company_code <> new.company_code then raise exception 'The campaign must be in the same company' using errcode = '23514';
    end if;
    new.campaign := coalesce(new.campaign, c.name);
  end if;
  return new;
end $$;
revoke all on function public.os_campaign_items_links() from public, anon, authenticated;
drop trigger if exists os_campaign_items_c_links on public.os_campaign_items;
create trigger os_campaign_items_c_links before insert or update on public.os_campaign_items for each row execute function public.os_campaign_items_links();

drop policy if exists os_campaign_items_read on public.os_campaign_items;
create policy os_campaign_items_read on public.os_campaign_items for select to authenticated
  using (public.os_can_view(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, ''))
         or (public.os_is_staff() and public.os_current_person() in (owner_person_id, creator_person_id, reviewer_person_id)));
drop policy if exists os_campaign_items_update on public.os_campaign_items;
create policy os_campaign_items_update on public.os_campaign_items for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, ''))
         or (public.os_is_staff() and public.os_current_person() in (owner_person_id, creator_person_id, reviewer_person_id)))
  with check (public.os_can_create(company_code, division_id, sensitivity)
              or (public.os_is_staff() and public.os_current_person() in (owner_person_id, creator_person_id, reviewer_person_id) and sensitivity <> 'Restricted'));

-- ── Events: the write rules, now with campaign, partnership and series links and the series window ─────────────────
create or replace function public.os_series_ends_at(p_recurrence jsonb, p_starts timestamptz, p_ends timestamptz, p_tz text) returns timestamptz
language sql immutable set search_path = '' as $$
  select case
    when p_recurrence is null or not public.os_valid_recurrence(p_recurrence) then null
    when p_recurrence ? 'until' then (((p_recurrence->>'until')::date + 1)::timestamp at time zone p_tz) + (p_ends - p_starts)
    when p_recurrence ? 'count' then p_starts + (p_ends - p_starts) + ((p_recurrence->>'count')::int * coalesce((p_recurrence->>'interval')::int, 1)) *
      case p_recurrence->>'freq' when 'daily' then interval '1 day' when 'weekly' then interval '7 days' when 'monthly' then interval '1 month' else interval '1 year' end
    else null end
$$;
grant execute on function public.os_series_ends_at(jsonb, timestamptz, timestamptz, text) to authenticated, service_role;

create or replace function public.os_events_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; privileged boolean := public.os_caller_is_privileged();
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('EV'); end if;
  if tg_op = 'UPDATE' then new.company_code := old.company_code; new.series_id := old.series_id; end if;

  if new.project_id is not null and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id) then
    select company_code, division_id into p from public.os_projects where id = new.project_id;
    if p is null or (not privileged and not public.os_can_view_project(new.project_id)) then
      raise exception 'A linked project doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if tg_op = 'INSERT' then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id);
    elsif p.company_code <> new.company_code then
      raise exception 'A linked project must be in the same company as the event' using errcode = '23514';
    end if;
  end if;
  if new.campaign_id is not null and (tg_op = 'INSERT' or new.campaign_id is distinct from old.campaign_id) then
    select company_code, division_id into p from public.os_campaigns where id = new.campaign_id;
    if p is null or (not privileged and not public.os_can_view_campaign(new.campaign_id)) then
      raise exception 'A linked campaign doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if tg_op = 'INSERT' and new.project_id is null then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id); end if;
    if p.company_code <> new.company_code then
      raise exception 'A linked campaign must be in the same company as the event' using errcode = '23514';
    end if;
  end if;
  if new.partnership_id is not null and (tg_op = 'INSERT' or new.partnership_id is distinct from old.partnership_id) then
    select company_code into p from public.os_partnerships where id = new.partnership_id;
    if p is null or (not privileged and not public.os_can_view_entity('partnership', new.partnership_id)) then
      raise exception 'A linked partnership doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if p.company_code <> new.company_code then
      raise exception 'A linked partnership must be in the same company as the event' using errcode = '23514';
    end if;
  end if;
  if new.task_id is not null and (tg_op = 'INSERT' or new.task_id is distinct from old.task_id) then
    select company_code into p from public.os_tasks where id = new.task_id;
    if p is null or (not privileged and not public.os_can_view_task(new.task_id)) then
      raise exception 'A linked task doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if p.company_code <> new.company_code and new.company_code <> 'HQ' then
      raise exception 'A linked task must be in the same company as the event' using errcode = '23514';
    end if;
  end if;
  if new.timeline_item_id is not null and (tg_op = 'INSERT' or new.timeline_item_id is distinct from old.timeline_item_id) then
    if not exists (select 1 from public.os_timeline_items where id = new.timeline_item_id)
       or (not privileged and not public.os_can_view_entity('timeline', new.timeline_item_id)) then
      raise exception 'A linked milestone doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
  end if;
  if tg_op = 'INSERT' and new.series_id is not null and not privileged and not public.os_can_edit_event(new.series_id) then
    raise exception 'You can''t change that series' using errcode = '42501';
  end if;
  new.series_ends_at := public.os_series_ends_at(new.recurrence, new.starts_at, new.ends_at, coalesce(new.timezone, 'Asia/Jakarta'));

  if not privileged then
    if tg_op = 'INSERT' then
      new.google_synced_by := null; new.google_calendar_id := null; new.google_event_id := null; new.google_etag := null;
      new.google_synced_at := null; new.sync_state := 'local'; new.sync_error := null;
    else
      new.google_synced_by := old.google_synced_by; new.google_calendar_id := old.google_calendar_id;
      new.google_event_id := old.google_event_id; new.google_etag := old.google_etag; new.google_synced_at := old.google_synced_at;
      new.sync_error := old.sync_error;
      -- An edit in the OS to an event that is in Google marks it as waiting to be pushed (it is never pushed silently).
      if old.sync_state = 'synced' and (new.title, new.description, new.starts_at, new.ends_at, new.all_day, new.timezone,
            new.location, new.meeting_url, new.status, new.recurrence, new.google_invites) is distinct from (old.title, old.description, old.starts_at, old.ends_at,
            old.all_day, old.timezone, old.location, old.meeting_url, old.status, old.recurrence, old.google_invites) then
        new.sync_state := 'pending';
      else
        new.sync_state := old.sync_state;
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_events_before_write() from public, anon, authenticated;

grant insert (recurrence, series_id, campaign_id, partnership_id, google_invites),
      update (recurrence, campaign_id, partnership_id, google_invites) on public.os_events to authenticated;

-- ── Documents, comments and activity on the new record types ───────────────────────────────────────────────────────
do $$ begin
  alter table public.os_document_links drop constraint if exists os_document_links_entity_type_check;
  alter table public.os_document_links add constraint os_document_links_entity_type_check check (entity_type in
    ('project', 'task', 'meeting', 'partnership', 'decision', 'campaign', 'objective', 'kpi', 'event', 'timeline', 'campaign_plan'));
  alter table public.os_comments drop constraint if exists os_comments_entity_type_check;
  alter table public.os_comments add constraint os_comments_entity_type_check check (entity_type in
    ('project', 'task', 'document', 'partnership', 'decision', 'meeting', 'campaign', 'objective', 'kpi', 'product', 'timeline', 'event', 'campaign_plan'));
end $$;

create or replace function public.os_can_view_entity(p_type text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'project' then public.os_can_view_project(p_id)
    when 'task' then public.os_can_view_task(p_id)
    when 'document' then public.os_can_view_document(p_id)
    when 'partnership' then exists (select 1 from public.os_partnerships x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'decision' then exists (select 1 from public.os_decisions x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.project_id, '')))
    when 'meeting' then exists (select 1 from public.os_meetings x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'campaign' then exists (select 1 from public.os_campaign_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and public.os_current_person() in (x.owner_person_id, x.creator_person_id, x.reviewer_person_id))))
    when 'campaign_plan' then public.os_can_view_campaign(p_id)
    when 'objective' then exists (select 1 from public.os_objectives x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'kpi' then exists (select 1 from public.os_kpis x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'product' then exists (select 1 from public.os_product_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'timeline' then exists (select 1 from public.os_timeline_items x where x.id = p_id and public.os_can_view(x.company_code, null, x.sensitivity, 'project', ''))
    when 'event' then public.os_can_view_event(p_id)
    else false
  end
$$;

-- History for link and occurrence changes, recorded on the event (or task / milestone) they belong to.
create or replace function public.os_link_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
        before jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
        entity text := tg_argv[0]; id_col text := tg_argv[1]; what text := tg_argv[2];
        company text;
begin
  if entity = 'event' then select company_code into company from public.os_events where id = rec->>id_col;
  elsif entity = 'task' then select company_code into company from public.os_tasks where id = rec->>id_col;
  else select company_code into company from public.os_timeline_items where id = rec->>id_col; end if;
  insert into public.os_activity (entity_type, entity_id, company_code, actor_person_id, action, summary, changes)
  values (entity, rec->>id_col, company, public.os_current_person(), what || '_' || lower(tg_op), left(what || ' ' || coalesce(rec->>'occurrence_start', rec->>'task_id', rec->>'depends_on_task_id', rec->>'depends_on_id', ''), 200),
          case when tg_op = 'UPDATE' then jsonb_build_object('from', before, 'to', rec) else rec end);
  return null;
end $$;
revoke all on function public.os_link_activity() from public, anon, authenticated;
drop trigger if exists os_event_exceptions_activity on public.os_event_exceptions;
create trigger os_event_exceptions_activity after insert or update or delete on public.os_event_exceptions for each row execute function public.os_link_activity('event', 'event_id', 'occurrence');
drop trigger if exists os_event_tasks_activity on public.os_event_tasks;
create trigger os_event_tasks_activity after insert or delete on public.os_event_tasks for each row execute function public.os_link_activity('event', 'event_id', 'task_link');
drop trigger if exists os_task_dependencies_activity on public.os_task_dependencies;
create trigger os_task_dependencies_activity after insert or delete on public.os_task_dependencies for each row execute function public.os_link_activity('task', 'task_id', 'dependency');
drop trigger if exists os_timeline_dependencies_activity on public.os_timeline_dependencies;
create trigger os_timeline_dependencies_activity after insert or delete on public.os_timeline_dependencies for each row execute function public.os_link_activity('timeline', 'item_id', 'dependency');

-- ── Notifications ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Written only by the triggers below. Never to the person who made the change, at most once per person and change
-- (dedupe_key), and only about records the person is part of (an attendee, an assignee or the owner).
create table if not exists public.os_notifications (
  id              bigint generated always as identity primary key,
  person_id       text not null references public.os_people (id) on delete cascade,
  kind            text not null check (kind in ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed')),
  entity_type     text not null check (entity_type in ('event', 'task')),
  entity_id       text not null,
  title           text not null,
  body            text,
  actor_person_id text,
  dedupe_key      text not null unique,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists os_notifications_person_idx on public.os_notifications (person_id, created_at desc);
alter table public.os_notifications enable row level security;
revoke all on public.os_notifications from anon, authenticated;
grant select, update (read_at) on public.os_notifications to authenticated;
grant select, insert, update, delete on public.os_notifications to service_role;
drop policy if exists os_notifications_read on public.os_notifications;
create policy os_notifications_read on public.os_notifications for select to authenticated using (person_id = public.os_current_person());
drop policy if exists os_notifications_update on public.os_notifications;
create policy os_notifications_update on public.os_notifications for update to authenticated
  using (person_id = public.os_current_person()) with check (person_id = public.os_current_person());

create or replace function public.os_notify(p_person text, p_kind text, p_type text, p_id text, p_title text, p_body text, p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor text := public.os_current_person();
begin
  if p_person is null or p_person = actor then return; end if;
  if not exists (select 1 from public.os_people where id = p_person and status in ('active', 'onboarding') and org_role <> 'guest') then return; end if;
  insert into public.os_notifications (person_id, kind, entity_type, entity_id, title, body, actor_person_id, dedupe_key)
  values (p_person, p_kind, p_type, p_id, left(p_title, 200), left(p_body, 500), actor, p_key)
  on conflict (dedupe_key) do nothing;
end $$;
revoke all on function public.os_notify(text, text, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.os_notify_attendee_added() returns trigger
language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  -- Copying a series' attendees when it is split is not a new invitation.
  if coalesce(current_setting('os.quiet_invites', true), '') = '1' then return null; end if;
  select id, title, starts_at, timezone into e from public.os_events where id = new.event_id;
  perform public.os_notify(new.person_id, 'event_invited', 'event', e.id, 'Invited: ' || e.title,
    to_char(e.starts_at at time zone e.timezone, 'Dy DD Mon YYYY HH24:MI'), 'invite:' || e.id || ':' || new.person_id);
  return null;
end $$;
revoke all on function public.os_notify_attendee_added() from public, anon, authenticated;
drop trigger if exists os_event_attendees_notify on public.os_event_attendees;
create trigger os_event_attendees_notify after insert on public.os_event_attendees for each row execute function public.os_notify_attendee_added();

create or replace function public.os_notify_event_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record; k text; label text;
begin
  if new.status = 'Cancelled' and old.status <> 'Cancelled' then k := 'event_cancelled'; label := 'Cancelled: ';
  elsif (new.starts_at, new.ends_at, new.all_day, new.recurrence) is distinct from (old.starts_at, old.ends_at, old.all_day, old.recurrence) then k := 'event_rescheduled'; label := 'Rescheduled: ';
  else return null; end if;
  for a in select person_id from public.os_event_attendees where event_id = new.id loop
    perform public.os_notify(a.person_id, k, 'event', new.id, label || new.title,
      to_char(new.starts_at at time zone new.timezone, 'Dy DD Mon YYYY HH24:MI') || case when new.recurrence is not null then ' (repeating)' else '' end,
      k || ':' || new.id || ':' || a.person_id || ':' || md5(coalesce(new.starts_at::text, '') || coalesce(new.ends_at::text, '') || new.status || coalesce(new.recurrence::text, '')));
  end loop;
  return null;
end $$;
revoke all on function public.os_notify_event_changed() from public, anon, authenticated;
drop trigger if exists os_events_notify on public.os_events;
create trigger os_events_notify after update on public.os_events for each row execute function public.os_notify_event_changed();

create or replace function public.os_notify_occurrence_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record; e record; k text;
begin
  if new.cancelled and (tg_op = 'INSERT' or not old.cancelled) then k := 'event_cancelled';
  elsif new.starts_at is not null and (tg_op = 'INSERT' or (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at)) then k := 'event_rescheduled';
  else return null; end if;
  select id, title, timezone into e from public.os_events where id = new.event_id;
  for a in select person_id from public.os_event_attendees where event_id = new.event_id loop
    perform public.os_notify(a.person_id, k, 'event', e.id, case k when 'event_cancelled' then 'Cancelled: ' else 'Moved: ' end || coalesce(new.title, e.title),
      'The ' || to_char(new.occurrence_start at time zone e.timezone, 'Dy DD Mon HH24:MI') || ' occurrence' ||
        case when k = 'event_rescheduled' then ' now starts ' || to_char(new.starts_at at time zone e.timezone, 'Dy DD Mon HH24:MI') else ' is cancelled' end,
      k || ':' || e.id || ':' || a.person_id || ':' || md5(new.occurrence_start::text || coalesce(new.starts_at::text, '') || new.cancelled::text));
  end loop;
  return null;
end $$;
revoke all on function public.os_notify_occurrence_changed() from public, anon, authenticated;
drop trigger if exists os_event_exceptions_notify on public.os_event_exceptions;
create trigger os_event_exceptions_notify after insert or update on public.os_event_exceptions for each row execute function public.os_notify_occurrence_changed();

create or replace function public.os_notify_task_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select id, title, due_date into t from public.os_tasks where id = new.task_id;
  perform public.os_notify(new.person_id, 'task_assigned', 'task', t.id, 'Assigned: ' || t.title,
    case when t.due_date is not null then 'Due ' || to_char(t.due_date, 'Dy DD Mon YYYY') end, 'assign:' || t.id || ':' || new.person_id);
  return null;
end $$;
revoke all on function public.os_notify_task_assigned() from public, anon, authenticated;
drop trigger if exists os_task_assignees_notify on public.os_task_assignees;
create trigger os_task_assignees_notify after insert on public.os_task_assignees for each row execute function public.os_notify_task_assigned();

create or replace function public.os_notify_task_due() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  if new.due_date is not distinct from old.due_date then return null; end if;
  for a in select person_id from public.os_task_assignees where task_id = new.id
           union select new.owner_person_id where new.owner_person_id is not null loop
    perform public.os_notify(a.person_id, 'task_due_changed', 'task', new.id, 'Deadline changed: ' || new.title,
      coalesce('Now due ' || to_char(new.due_date, 'Dy DD Mon YYYY'), 'The deadline was removed'),
      'due:' || new.id || ':' || a.person_id || ':' || coalesce(new.due_date::text, 'none'));
  end loop;
  return null;
end $$;
revoke all on function public.os_notify_task_due() from public, anon, authenticated;
drop trigger if exists os_tasks_notify_due on public.os_tasks;
create trigger os_tasks_notify_due after update of due_date on public.os_tasks for each row execute function public.os_notify_task_due();

-- ── Invitation groups and free/busy ────────────────────────────────────────────────────────────────────────────────
-- The people who can be invited to an event in a company: active, non-guest staff of that company (HQ events: any
-- company). Returns only what grouping needs: role, companies, divisions and which divisions they manage. Groups
-- (C-Level = founders, Managers, Associates = members, divisions) are built from these by the app at invite time.
create or replace function public.os_invite_candidates(p_company text)
returns table (person_id text, full_name text, short_name text, org_role text, companies text[], divisions text[], managed_divisions text[])
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.short_name, p.org_role,
         coalesce(array(select c.company_code from public.os_person_companies c where c.person_id = p.id order by 1), '{}'),
         coalesce(array(select d.division_id from public.os_person_divisions d where d.person_id = p.id order by 1), '{}'),
         coalesce(array(select d.division_id from public.os_person_divisions d where d.person_id = p.id and d.is_manager order by 1), '{}')
  from public.os_people p
  where public.os_is_staff()
    and (public.os_is_founder() or p_company = 'HQ' or public.os_in_company(p_company))
    and p.status = 'active' and p.org_role <> 'guest'
    and (p.org_role = 'founder' or p_company = 'HQ'
         or exists (select 1 from public.os_person_companies c where c.person_id = p.id and c.company_code = p_company))
  order by p.full_name
$$;
revoke all on function public.os_invite_candidates(text) from public, anon;
grant execute on function public.os_invite_candidates(text) to authenticated, service_role;

-- When people are busy, for conflict warnings. Only for people who share a company with the caller; titles only for
-- events and tasks the caller can see ("Busy" otherwise). Recurring masters come back with their exceptions so the
-- app can expand them; at most 100 people and 62 days.
create or replace function public.os_busy(p_people text[], p_from timestamptz, p_to timestamptz)
returns table (person_id text, source text, ref_id text, title text, starts_at timestamptz, ends_at timestamptz, all_day boolean,
               timezone text, recurrence jsonb, exceptions jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare me text := public.os_current_person();
begin
  if me is null or not public.os_is_staff() then return; end if;
  if p_to <= p_from or p_to - p_from > interval '62 days' or coalesce(array_length(p_people, 1), 0) > 100 then
    raise exception 'Ask for up to 100 people and 62 days' using errcode = '22023';
  end if;
  return query
    with ppl as (
      select x.id from public.os_people x where x.id = any (p_people)
        and (public.os_is_founder() or x.id = me or exists (
          select 1 from public.os_person_companies a join public.os_person_companies b on a.company_code = b.company_code
          where a.person_id = x.id and b.person_id = me)))
    select a.person_id, 'event'::text,
           case when public.os_can_view_event(e.id) then e.id end,
           case when public.os_can_view_event(e.id) then e.title else 'Busy' end,
           e.starts_at, e.ends_at, e.all_day, e.timezone, e.recurrence,
           case when e.recurrence is null then null else (select coalesce(jsonb_agg(jsonb_build_object('occurrence_start', x.occurrence_start, 'cancelled', x.cancelled, 'starts_at', x.starts_at, 'ends_at', x.ends_at)), '[]'::jsonb)
                                                         from public.os_event_exceptions x where x.event_id = e.id) end
    from public.os_events e
    join (select ea.event_id, ea.person_id from public.os_event_attendees ea where ea.person_id in (select id from ppl)
          union select e2.id, e2.created_by from public.os_events e2 where e2.created_by in (select id from ppl)) a on a.event_id = e.id
    where e.status <> 'Cancelled'
      and ((e.recurrence is null and e.starts_at < p_to and e.ends_at > p_from)
           or (e.recurrence is not null and e.starts_at < p_to and (e.series_ends_at is null or e.series_ends_at > p_from)))
    union all
    select w.person_id, 'task'::text,
           case when public.os_can_view_task(t.id) then t.id end,
           case when public.os_can_view_task(t.id) then t.title else 'Busy' end,
           t.scheduled_start, t.scheduled_end, false, 'Asia/Jakarta'::text, null::jsonb, null::jsonb
    from public.os_tasks t
    join (select ta.task_id, ta.person_id from public.os_task_assignees ta where ta.person_id in (select id from ppl)
          union select t2.id, t2.owner_person_id from public.os_tasks t2 where t2.owner_person_id in (select id from ppl)) w on w.task_id = t.id
    where t.scheduled_start is not null and t.scheduled_start < p_to and t.scheduled_end > p_from and t.status not in ('Done', 'Cancelled');
end $$;
revoke all on function public.os_busy(text[], timestamptz, timestamptz) from public, anon;
grant execute on function public.os_busy(text[], timestamptz, timestamptz) to authenticated, service_role;

-- ── Writing events: create (with links), split a series ("this and following") ─────────────────────────────────────
-- SECURITY INVOKER: every row passes the same RLS policies, column grants and triggers as the forms.
create or replace function public.os_create_event(p jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare a jsonb; t text; new_id text;
begin
  insert into public.os_events (title, category, company_code, division_id, project_id, task_id, timeline_item_id, campaign_id, partnership_id,
                                starts_at, ends_at, all_day, timezone, location, meeting_url, description, recurrence, sensitivity, status)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), p->>'company_code', nullif(p->>'division_id', ''), nullif(p->>'project_id', ''),
          nullif(p->>'task_id', ''), nullif(p->>'timeline_item_id', ''), nullif(p->>'campaign_id', ''), nullif(p->>'partnership_id', ''),
          (p->>'starts_at')::timestamptz, (p->>'ends_at')::timestamptz,
          coalesce((p->>'all_day')::boolean, false), coalesce(nullif(p->>'timezone', ''), 'Asia/Jakarta'), nullif(p->>'location', ''),
          nullif(p->>'meeting_url', ''), nullif(p->>'description', ''), case when jsonb_typeof(p->'recurrence') = 'object' then p->'recurrence' end,
          coalesce(nullif(p->>'sensitivity', ''), 'Internal'), coalesce(nullif(p->>'status', ''), 'Scheduled'))
  returning id into new_id;
  -- Attendees: plain IDs, or {"person_id", "via_group"} for people added through a group.
  for a in select value from jsonb_array_elements(coalesce(p->'attendees', '[]'::jsonb)) loop
    insert into public.os_event_attendees (event_id, person_id, via_group)
    values (new_id, case when jsonb_typeof(a) = 'string' then a #>> '{}' else a->>'person_id' end,
            case when jsonb_typeof(a) = 'object' then nullif(a->>'via_group', '') end)
    on conflict do nothing;
  end loop;
  for t in select jsonb_array_elements_text(coalesce(p->'task_ids', '[]'::jsonb)) loop
    insert into public.os_event_tasks (event_id, task_id) values (new_id, t) on conflict do nothing;
  end loop;
  return new_id;
end $$;
revoke all on function public.os_create_event(jsonb) from public, anon;
grant execute on function public.os_create_event(jsonb) to authenticated;

-- Split a series at an occurrence: the original keeps the occurrences before it (its rule gets an end date) and a new
-- master, linked by series_id, takes over from that occurrence with the changes in p (any event field plus a
-- recurrence). Attendees and task links are copied; exceptions from the split point move along only when the times
-- did not change (p_keep_exceptions), otherwise they are dropped because they no longer line up.
create or replace function public.os_split_series(p_event text, p_from timestamptz, p_until date, p jsonb, p_keep_exceptions boolean default true) returns text
language plpgsql security invoker set search_path = '' as $$
declare m public.os_events; new_id text;
begin
  select * into m from public.os_events where id = p_event;
  if m.id is null or m.recurrence is null then raise exception 'Not a recurring event' using errcode = '42501'; end if;
  if p_from <= m.starts_at then raise exception 'Split after the first occurrence, or edit the whole series' using errcode = '22023'; end if;
  update public.os_events set recurrence = (m.recurrence - 'count') || jsonb_build_object('until', p_until::text) where id = m.id;
  if not found then raise exception 'You can''t change this event' using errcode = '42501'; end if;
  insert into public.os_events (title, category, company_code, division_id, project_id, task_id, timeline_item_id, campaign_id, partnership_id,
                                starts_at, ends_at, all_day, timezone, location, meeting_url, description, recurrence, sensitivity, status, series_id, google_invites)
  values (coalesce(p->>'title', m.title), coalesce(p->>'category', m.category), m.company_code,
          case when p ? 'division_id' then nullif(p->>'division_id', '') else m.division_id end,
          case when p ? 'project_id' then nullif(p->>'project_id', '') else m.project_id end, m.task_id,
          case when p ? 'timeline_item_id' then nullif(p->>'timeline_item_id', '') else m.timeline_item_id end,
          case when p ? 'campaign_id' then nullif(p->>'campaign_id', '') else m.campaign_id end, m.partnership_id,
          (p->>'starts_at')::timestamptz, (p->>'ends_at')::timestamptz, coalesce((p->>'all_day')::boolean, m.all_day), coalesce(p->>'timezone', m.timezone),
          case when p ? 'location' then nullif(p->>'location', '') else m.location end,
          case when p ? 'meeting_url' then nullif(p->>'meeting_url', '') else m.meeting_url end,
          case when p ? 'description' then nullif(p->>'description', '') else m.description end,
          coalesce(p->'recurrence', m.recurrence), coalesce(p->>'sensitivity', m.sensitivity), coalesce(p->>'status', m.status),
          coalesce(m.series_id, m.id), m.google_invites)
  returning id into new_id;
  perform set_config('os.quiet_invites', '1', true);
  insert into public.os_event_attendees (event_id, person_id, via_group) select new_id, person_id, via_group from public.os_event_attendees where event_id = m.id;
  perform set_config('os.quiet_invites', '', true);
  insert into public.os_event_tasks (event_id, task_id) select new_id, task_id from public.os_event_tasks where event_id = m.id on conflict do nothing;
  if p_keep_exceptions then
    insert into public.os_event_exceptions (event_id, occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url)
      select new_id, occurrence_start, cancelled, title, description, starts_at, ends_at, location, meeting_url
      from public.os_event_exceptions where event_id = m.id and occurrence_start >= p_from;
  end if;
  delete from public.os_event_exceptions where event_id = m.id and occurrence_start >= p_from;
  return new_id;
end $$;
revoke all on function public.os_split_series(text, timestamptz, date, jsonb, boolean) from public, anon;
grant execute on function public.os_split_series(text, timestamptz, date, jsonb, boolean) to authenticated;

-- Content slots in one go (e.g. "every weekday next week"), all or nothing. 1-31 items.
create or replace function public.os_create_content_items(p_items jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare i jsonb; new_id text; out jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 31 then
    raise exception 'Between 1 and 31 content items' using errcode = '22023';
  end if;
  for i in select value from jsonb_array_elements(p_items) loop
    insert into public.os_campaign_items (company_code, division_id, campaign_id, title, channel, format, pillar, publish_at, planned_publish_date,
                                          owner_person_id, creator_person_id, reviewer_person_id, brief, status)
    values (i->>'company_code', coalesce(nullif(i->>'division_id', ''), 'DIV-03'), nullif(i->>'campaign_id', ''), i->>'title', nullif(i->>'channel', ''),
            nullif(i->>'format', ''), nullif(i->>'pillar', ''), nullif(i->>'publish_at', '')::timestamptz,
            coalesce(nullif(i->>'planned_publish_date', '')::date, ((nullif(i->>'publish_at', '')::timestamptz) at time zone 'Asia/Jakarta')::date),
            nullif(i->>'owner_person_id', ''), nullif(i->>'creator_person_id', ''), nullif(i->>'reviewer_person_id', ''), nullif(i->>'brief', ''),
            coalesce(nullif(i->>'status', ''), 'Planned'))
    returning id into new_id;
    out := out || jsonb_build_array(jsonb_build_object('id', new_id, 'title', i->>'title'));
  end loop;
  return out;
end $$;
revoke all on function public.os_create_content_items(jsonb) from public, anon;
grant execute on function public.os_create_content_items(jsonb) to authenticated;

-- ── AI actions: the new kinds ──────────────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_ai_actions drop constraint if exists os_ai_actions_action_type_check;
  alter table public.os_ai_actions add constraint os_ai_actions_action_type_check check (action_type in (
    'create_task', 'create_tasks', 'update_task_status', 'create_project', 'add_comment', 'log_kpi_value', 'create_partnership',
    'create_event', 'create_timeline_item', 'draft_document', 'create_campaign', 'create_content_items', 'move_event', 'invite_to_event'));
end $$;

do $$
declare f text;
begin
  foreach f in array array['os_can_view_entity(text, text)', 'os_valid_recurrence(jsonb)', 'os_series_ends_at(jsonb, timestamptz, timestamptz, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
