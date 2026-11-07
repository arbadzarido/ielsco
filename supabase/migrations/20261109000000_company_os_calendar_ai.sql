-- Company OS: Calendar, Google Calendar sync, actionable AI and folder-route administration.
--
-- Additive and re-runnable. Nothing existing is dropped or rewritten except:
--   * os_can_view_entity() gains an 'event' case (so activity on events is readable by whoever can read the event);
--   * the os_ai_actions.action_type check gains create_event, create_tasks and create_timeline_item;
--   * the os_folder_routes.status check gains 'rejected', and its trigger clears the approver on reject.
-- No existing row is updated.
--
-- Data model (one record per thing, no copies):
--   os_events             day-to-day scheduling: meetings, internal activities, events, deadlines, campaigns...
--                         An event can link to one project, one task and one timeline milestone.
--   os_event_attendees    the people invited to an OS event.
--   os_calendar_connections  per-person Google Calendar connection (sealed refresh token). Service role only.
--   Task deadlines are NOT copied into os_events; the calendar reads os_tasks.due_date directly. Timeline milestones
--   stay in os_timeline_items; the calendar shows their due dates. Google events are read live for the person who
--   connected them and never stored, except the link fields on an OS event that was pushed to Google.

-- ── Events ─────────────────────────────────────────────────────────────────────────────────────────────────────────

insert into public.os_id_counters (prefix, last) values ('EV', 0) on conflict (prefix) do nothing;

create table if not exists public.os_events (
  id                 text primary key check (id ~ '^EV-[0-9]{4,}$'),
  company_code       text not null references public.os_companies (code),
  division_id        text references public.os_divisions (id),
  project_id         text references public.os_projects (id) on delete set null,
  task_id            text references public.os_tasks (id) on delete set null,
  timeline_item_id   text references public.os_timeline_items (id) on delete set null,
  title              text not null check (length(trim(title)) between 1 and 200),
  description        text check (description is null or length(description) <= 5000),
  category           text not null default 'Meeting'
                       check (category in ('Meeting', 'Internal Activity', 'Event', 'Deadline', 'Campaign', 'Partnership', 'Other')),
  -- Timed events: the real instants. All-day events: midnight in the event's time zone, end exclusive (the day after
  -- the last day), the same convention Google Calendar uses for all-day dates.
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  all_day            boolean not null default false,
  timezone           text not null default 'Asia/Jakarta' check (timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$'),
  location           text check (location is null or length(location) <= 300),
  meeting_url        text check (meeting_url is null or (meeting_url ~ '^https://' and length(meeting_url) <= 500)),
  sensitivity        text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  status             text not null default 'Scheduled' check (status in ('Scheduled', 'Cancelled')),
  -- Google Calendar link, written only by the server. A pushed event lives in the calendar of the person who pushed it.
  google_synced_by   text references public.os_people (id) on delete set null,
  google_calendar_id text,
  google_event_id    text,
  google_etag        text,
  google_synced_at   timestamptz,
  sync_state         text not null default 'local'
                       check (sync_state in ('local', 'pending', 'synced', 'conflict', 'error', 'deleted_remote')),
  sync_error         text,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at >= starts_at),
  check ((google_event_id is null) = (google_synced_by is null))
);
create index if not exists os_events_range_idx on public.os_events (starts_at, ends_at);
create index if not exists os_events_company_idx on public.os_events (company_code, division_id);
create index if not exists os_events_project_idx on public.os_events (project_id) where project_id is not null;
create index if not exists os_events_task_idx on public.os_events (task_id) where task_id is not null;
-- One OS event per Google event per calendar owner: pushing twice can never make a duplicate.
create unique index if not exists os_events_google_key on public.os_events (google_synced_by, google_event_id) where google_event_id is not null;

create table if not exists public.os_event_attendees (
  event_id   text not null references public.os_events (id) on delete cascade,
  person_id  text not null references public.os_people (id) on delete cascade,
  primary key (event_id, person_id)
);
create index if not exists os_event_attendees_person_idx on public.os_event_attendees (person_id);

-- Row checks take the row's columns so they also work for the row being inserted (as for tasks).
create or replace function public.os_event_row_visible(p_id text, p_company text, p_division text, p_sensitivity text,
                                                       p_project text, p_created_by text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_can_view(p_company, p_division, p_sensitivity, 'project', coalesce(p_project, ''))
      or (public.os_current_person() is not null
          and (p_created_by = public.os_current_person()
               or exists (select 1 from public.os_event_attendees a where a.event_id = p_id and a.person_id = public.os_current_person())))
      or (p_project is not null and p_sensitivity <> 'Restricted' and public.os_is_staff() and public.os_is_project_member(p_project))
$$;

create or replace function public.os_event_row_editable(p_company text, p_division text, p_sensitivity text,
                                                        p_project text, p_created_by text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_can_edit(p_company, p_division, p_sensitivity, 'project', coalesce(p_project, ''))
      or (public.os_is_staff() and p_created_by = public.os_current_person())
      or (p_project is not null and p_sensitivity <> 'Restricted' and public.os_can_edit_project(p_project))
$$;

create or replace function public.os_can_view_event(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_events e where e.id = p_id
                 and public.os_event_row_visible(e.id, e.company_code, e.division_id, e.sensitivity, e.project_id, e.created_by))
$$;

create or replace function public.os_can_edit_event(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_events e where e.id = p_id
                 and public.os_event_row_editable(e.company_code, e.division_id, e.sensitivity, e.project_id, e.created_by))
$$;

-- Links inherit and must be visible; the company follows the project; Google link fields come only from the server.
create or replace function public.os_events_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; privileged boolean := public.os_caller_is_privileged();
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('EV'); end if;
  if tg_op = 'UPDATE' then new.company_code := old.company_code; end if;

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
  if new.task_id is not null and (tg_op = 'INSERT' or new.task_id is distinct from old.task_id) then
    select company_code into p from public.os_tasks where id = new.task_id;
    if p is null or (not privileged and not public.os_can_view_task(new.task_id)) then
      raise exception 'A linked task doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
    if p.company_code <> new.company_code then
      raise exception 'A linked task must be in the same company as the event' using errcode = '23514';
    end if;
  end if;
  if new.timeline_item_id is not null and (tg_op = 'INSERT' or new.timeline_item_id is distinct from old.timeline_item_id) then
    if not exists (select 1 from public.os_timeline_items where id = new.timeline_item_id)
       or (not privileged and not public.os_can_view_entity('timeline', new.timeline_item_id)) then
      raise exception 'A linked milestone doesn''t exist or you can''t see it' using errcode = '23503';
    end if;
  end if;

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
            new.location, new.meeting_url, new.status) is distinct from (old.title, old.description, old.starts_at, old.ends_at,
            old.all_day, old.timezone, old.location, old.meeting_url, old.status) then
        new.sync_state := 'pending';
      else
        new.sync_state := old.sync_state;
      end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_events_before_write() from public, anon, authenticated;

drop trigger if exists os_events_a_rules on public.os_events;
create trigger os_events_a_rules before insert or update on public.os_events for each row execute function public.os_events_before_write();
drop trigger if exists os_events_b_stamp on public.os_events;
create trigger os_events_b_stamp before insert or update on public.os_events for each row execute function public.os_set_created_by();
drop trigger if exists os_events_activity on public.os_events;
create trigger os_events_activity after insert or update or delete on public.os_events for each row execute function public.os_activity_row('event');

alter table public.os_events enable row level security;
alter table public.os_event_attendees enable row level security;
revoke all on public.os_events, public.os_event_attendees from anon, authenticated;
grant select on public.os_events, public.os_event_attendees to authenticated;
grant insert (company_code, division_id, project_id, task_id, timeline_item_id, title, description, category, starts_at, ends_at,
              all_day, timezone, location, meeting_url, sensitivity, status),
      update (division_id, project_id, task_id, timeline_item_id, title, description, category, starts_at, ends_at,
              all_day, timezone, location, meeting_url, sensitivity, status)
  on public.os_events to authenticated;
grant delete on public.os_events to authenticated;
grant insert, delete on public.os_event_attendees to authenticated;
grant select, insert, update, delete on public.os_events, public.os_event_attendees to service_role;

drop policy if exists os_events_read on public.os_events;
create policy os_events_read on public.os_events for select to authenticated
  using (public.os_event_row_visible(id, company_code, division_id, sensitivity, project_id, created_by));
drop policy if exists os_events_insert on public.os_events;
create policy os_events_insert on public.os_events for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity)
              or (project_id is not null and sensitivity <> 'Restricted' and public.os_can_edit_project(project_id)));
drop policy if exists os_events_update on public.os_events;
create policy os_events_update on public.os_events for update to authenticated
  using (public.os_event_row_editable(company_code, division_id, sensitivity, project_id, created_by))
  with check (public.os_can_create(company_code, division_id, sensitivity)
              or public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(project_id, ''))
              or (public.os_is_staff() and created_by = public.os_current_person() and sensitivity <> 'Restricted' and public.os_in_company(company_code))
              or (project_id is not null and sensitivity <> 'Restricted' and public.os_can_edit_project(project_id)));
drop policy if exists os_events_delete on public.os_events;
create policy os_events_delete on public.os_events for delete to authenticated
  using ((select public.os_is_founder()) or public.os_is_manager_for(company_code, division_id)
         or (public.os_is_staff() and created_by = public.os_current_person()));

drop policy if exists os_event_attendees_read on public.os_event_attendees;
create policy os_event_attendees_read on public.os_event_attendees for select to authenticated using (public.os_can_view_event(event_id));
drop policy if exists os_event_attendees_write on public.os_event_attendees;
create policy os_event_attendees_write on public.os_event_attendees for all to authenticated
  using (public.os_can_edit_event(event_id))
  with check (public.os_can_edit_event(event_id)
              and exists (select 1 from public.os_people p join public.os_events e on e.id = event_id
                          where p.id = person_id and p.org_role <> 'guest' and p.status in ('onboarding', 'active')
                            and (p.org_role = 'founder'
                                 or exists (select 1 from public.os_person_companies c where c.person_id = p.id
                                            and (c.company_code = e.company_code or e.company_code = 'HQ')))));

-- Activity on events is readable by whoever can read the event.
create or replace function public.os_can_view_entity(p_type text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'project' then public.os_can_view_project(p_id)
    when 'task' then public.os_can_view_task(p_id)
    when 'document' then public.os_can_view_document(p_id)
    when 'partnership' then exists (select 1 from public.os_partnerships x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'decision' then exists (select 1 from public.os_decisions x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.project_id, '')))
    when 'meeting' then exists (select 1 from public.os_meetings x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'campaign' then exists (select 1 from public.os_campaign_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'objective' then exists (select 1 from public.os_objectives x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'kpi' then exists (select 1 from public.os_kpis x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'product' then exists (select 1 from public.os_product_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'timeline' then exists (select 1 from public.os_timeline_items x where x.id = p_id and public.os_can_view(x.company_code, null, x.sensitivity, 'project', ''))
    when 'event' then public.os_can_view_event(p_id)
    else false
  end
$$;

do $$
declare f text;
begin
  foreach f in array array['os_event_row_visible(text, text, text, text, text, text)', 'os_event_row_editable(text, text, text, text, text)',
                           'os_can_view_event(text)', 'os_can_edit_event(text)', 'os_can_view_entity(text, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ── Google Calendar connections (one per person, server only) ──────────────────────────────────────────────────────
-- The refresh token is sealed (AES-256-GCM) by the server before it is stored. No policy exists for anon or
-- authenticated, so the browser can never read it; the server reads it with the service role for the signed-in
-- person only.
create table if not exists public.os_calendar_connections (
  person_id      text primary key references public.os_people (id) on delete cascade,
  google_email   text not null,
  token_sealed   text not null,
  scopes         text not null,
  calendar_id    text not null default 'primary',
  timezone       text,
  connected_at   timestamptz not null default now(),
  last_used_at   timestamptz,
  last_error     text
);
alter table public.os_calendar_connections enable row level security;
revoke all on public.os_calendar_connections from public, anon, authenticated;
grant select, insert, update, delete on public.os_calendar_connections to service_role;

-- ── Timeline milestones: founders and the lead division's manager may add them ─────────────────────────────────────
grant insert (company_code, workstream_code, workstream_name, title, deliverable, owner_person_id, owner_name, lead_division,
              lead_division_id, planned_start, due_date, status, is_major, sensitivity, linked_refs)
  on public.os_timeline_items to authenticated;
drop policy if exists os_timeline_items_insert on public.os_timeline_items;
create policy os_timeline_items_insert on public.os_timeline_items for insert to authenticated
  with check (public.os_is_founder()
              or (lead_division_id is not null and sensitivity <> 'Restricted' and public.os_in_company(company_code)
                  and public.os_manages_division(lead_division_id)));

-- Milestone IDs keep the sheet's three-digit format (TL-001 … TL-104, then TL-105), not os_next_id's default four.
create or replace function public.os_assign_id() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.id is null then new.id := public.os_next_id(tg_argv[0], coalesce(nullif(tg_argv[1], '')::int, 4)); end if;
  return new;
end $$;
revoke all on function public.os_assign_id() from public, anon, authenticated;
drop trigger if exists os_timeline_items_a_id on public.os_timeline_items;
create trigger os_timeline_items_a_id before insert on public.os_timeline_items for each row execute function public.os_assign_id('TL', '3');

-- Tasks can point at the milestone they deliver (milestone → tasks). Optional, additive.
alter table public.os_tasks add column if not exists timeline_item_id text references public.os_timeline_items (id) on delete set null;
create index if not exists os_tasks_timeline_idx on public.os_tasks (timeline_item_id) where timeline_item_id is not null;
grant insert (timeline_item_id), update (timeline_item_id) on public.os_tasks to authenticated;

-- ── AI actions: new action types and display details ───────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_ai_actions drop constraint if exists os_ai_actions_action_type_check;
  alter table public.os_ai_actions add constraint os_ai_actions_action_type_check check (action_type in (
    'create_task', 'create_tasks', 'update_task_status', 'create_project', 'add_comment', 'log_kpi_value', 'create_partnership',
    'create_event', 'create_timeline_item', 'draft_document'));
end $$;
-- What the confirmation card shows (resolved names, and the choices still needed). Written by the server only.
alter table public.os_ai_actions add column if not exists details jsonb;

-- ── Folder routes: reject, and the last access check ───────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_folder_routes drop constraint if exists os_folder_routes_status_check;
  alter table public.os_folder_routes add constraint os_folder_routes_status_check check (status in ('proposed', 'approved', 'rejected', 'retired'));
end $$;
alter table public.os_folder_routes add column if not exists access_checked_at timestamptz;
alter table public.os_folder_routes add column if not exists access_ok boolean;
alter table public.os_folder_routes add column if not exists access_detail text;

create or replace function public.os_folder_routes_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved'
       or (new.company_code, new.division_id, new.doc_type, new.sensitivity, new.drive_folder_id)
          is distinct from (old.company_code, old.division_id, old.doc_type, old.sensitivity, old.drive_folder_id)) then
    new.approved_by := public.os_current_person();
    new.approved_at := now();
  elsif new.status <> 'approved' then
    -- Proposed, rejected or retired routes carry no approval.
    new.approved_by := null;
    new.approved_at := null;
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  -- A changed folder needs a fresh access check.
  if tg_op = 'UPDATE' and new.drive_folder_id is distinct from old.drive_folder_id and not public.os_caller_is_privileged() then
    new.access_checked_at := null; new.access_ok := null; new.access_detail := null;
  end if;
  return new;
end $$;
revoke all on function public.os_folder_routes_before_write() from public, anon, authenticated;

-- ── Creating records from a confirmed AI action ──────────────────────────────────────────────────────────────────────
-- SECURITY INVOKER: these run as the signed-in person, so every insert passes the same RLS policies, column grants
-- and triggers as the normal forms. They exist so a batch is all-or-nothing (one transaction) and a task and its
-- assignees, or an event and its attendees, are written together. The server resolves every ID before calling.

create or replace function public.os_create_tasks(p_tasks jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare t jsonb; a text; new_id text; out jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_tasks) is distinct from 'array' or jsonb_array_length(p_tasks) not between 1 and 10 then
    raise exception 'Between 1 and 10 tasks' using errcode = '22023';
  end if;
  for t in select value from jsonb_array_elements(p_tasks) loop
    insert into public.os_tasks (title, company_code, division_id, project_id, timeline_item_id, owner_person_id, due_date, priority, description)
    values (t->>'title', t->>'company_code', nullif(t->>'division_id', ''), nullif(t->>'project_id', ''), nullif(t->>'timeline_item_id', ''),
            nullif(t->>'owner_person_id', ''), nullif(t->>'due_date', '')::date, coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''))
    returning id into new_id;
    for a in select jsonb_array_elements_text(coalesce(t->'assignees', '[]'::jsonb)) loop
      insert into public.os_task_assignees (task_id, person_id) values (new_id, a) on conflict do nothing;
    end loop;
    out := out || jsonb_build_array(jsonb_build_object('id', new_id, 'title', t->>'title'));
  end loop;
  return out;
end $$;
revoke all on function public.os_create_tasks(jsonb) from public, anon;
grant execute on function public.os_create_tasks(jsonb) to authenticated;

create or replace function public.os_create_event(p jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare a text; new_id text;
begin
  insert into public.os_events (title, category, company_code, division_id, project_id, task_id, timeline_item_id, starts_at, ends_at, all_day,
                                timezone, location, meeting_url, description)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), p->>'company_code', nullif(p->>'division_id', ''), nullif(p->>'project_id', ''),
          nullif(p->>'task_id', ''), nullif(p->>'timeline_item_id', ''), (p->>'starts_at')::timestamptz, (p->>'ends_at')::timestamptz,
          coalesce((p->>'all_day')::boolean, false), coalesce(nullif(p->>'timezone', ''), 'Asia/Jakarta'), nullif(p->>'location', ''),
          nullif(p->>'meeting_url', ''), nullif(p->>'description', ''))
  returning id into new_id;
  for a in select jsonb_array_elements_text(coalesce(p->'attendees', '[]'::jsonb)) loop
    insert into public.os_event_attendees (event_id, person_id) values (new_id, a) on conflict do nothing;
  end loop;
  return new_id;
end $$;
revoke all on function public.os_create_event(jsonb) from public, anon;
grant execute on function public.os_create_event(jsonb) to authenticated;

-- Add (or, with p_replace, set) a task's assignees; a task with no owner gets the first one as owner.
create or replace function public.os_assign_task(p_task text, p_people text[], p_replace boolean default false) returns text
language plpgsql security invoker set search_path = '' as $$
declare a text;
begin
  if not exists (select 1 from public.os_tasks where id = p_task) then raise exception 'Unknown task' using errcode = '42501'; end if;
  if p_replace then delete from public.os_task_assignees where task_id = p_task and person_id <> all (p_people); end if;
  foreach a in array p_people loop
    insert into public.os_task_assignees (task_id, person_id) values (p_task, a) on conflict do nothing;
  end loop;
  update public.os_tasks set owner_person_id = p_people[1] where id = p_task and owner_person_id is null and array_length(p_people, 1) > 0;
  return p_task;
end $$;
revoke all on function public.os_assign_task(text, text[], boolean) from public, anon;
grant execute on function public.os_assign_task(text, text[], boolean) to authenticated;
