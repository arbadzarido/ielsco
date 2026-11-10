-- Company OS division workspaces, phase 2: cross-division requests.
--
-- One request system for every route. A route (os_request_types) names the requesting and receiving division and
-- whether the requester's division lead approves first. A request (os_requests, REQ-) keeps approval status and
-- execution status apart, records every step in os_request_events, approvals in os_approvals, and work as ordinary
-- tasks that point back to it (os_tasks.request_id). Every change goes through a security-definer function that checks
-- who may make it; there are no direct writes.
--
-- Who can read a request: the requester; its owner; the receiving workspace; the requesting division's lead; and, when
-- the receiving division is open, people who work in the requesting division. A request to Finance or Legal is never
-- visible to the rest of the requesting division. Founders see all.
--
-- Additive only: new tables, one new nullable column on os_tasks, new values in check lists.

-- ── Routes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_request_types (
  code              text primary key check (code ~ '^[a-z_]{3,40}$'),
  name              text not null check (length(trim(name)) between 1 and 120),
  description       text,
  from_division_id  text not null references public.os_divisions (id),
  to_division_id    text not null references public.os_divisions (id),
  needs_approval    boolean not null default false,
  active            boolean not null default true,
  sort_order        int not null default 0,
  check (from_division_id <> to_division_id)
);
-- The six routes from the brief (proposal "cross-division request map").
insert into public.os_request_types (code, name, description, from_division_id, to_division_id, needs_approval, sort_order) values
  ('design', 'Design request', 'Visual or content design from Creative.', 'DIV-03', 'DIV-04', false, 1),
  ('recruitment_campaign', 'Recruitment campaign request', 'Creative material for a recruitment campaign.', 'DIV-05', 'DIV-04', false, 2),
  ('contract_review', 'Contract or MoU review', 'Legal review of a contract or memorandum of understanding.', 'DIV-06', 'DIV-09', false, 3),
  ('budget', 'Budget or expense request', 'Budget or expense for Finance. The requesting division''s lead approves first.', 'DIV-02', 'DIV-08', true, 4),
  ('marketing_collaboration', 'Marketing collaboration request', 'A joint marketing activity with Growth.', 'DIV-01', 'DIV-03', false, 5),
  ('student_engagement', 'Student engagement request', 'Engagement activities with Community for learners.', 'DIV-07', 'DIV-01', false, 6)
on conflict (code) do nothing;

alter table public.os_request_types enable row level security;
revoke all on public.os_request_types from anon, authenticated;
grant select on public.os_request_types to authenticated;
grant all on public.os_request_types to service_role;
drop policy if exists os_request_types_read on public.os_request_types;
create policy os_request_types_read on public.os_request_types for select to authenticated using ((select public.os_is_staff()));

-- ── Requests ───────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_requests (
  id                  text primary key check (id ~ '^REQ-[0-9]{4,}$'),
  type_code           text not null references public.os_request_types (code),
  company_code        text not null references public.os_companies (code),
  from_division_id    text not null references public.os_divisions (id),
  to_division_id      text not null references public.os_divisions (id),
  requester_person_id text not null references public.os_people (id),
  owner_person_id     text references public.os_people (id),
  title               text not null check (length(trim(title)) between 3 and 200),
  brief               text not null check (length(trim(brief)) between 10 and 5000),
  priority            text not null default 'P3 Normal' check (priority in ('P1 Critical', 'P2 High', 'P3 Normal', 'P4 Low')),
  due_date            date not null,
  approval_status     text not null check (approval_status in ('not_needed', 'pending', 'approved', 'declined')),
  status              text not null default 'submitted'
                      check (status in ('submitted', 'info_needed', 'accepted', 'in_progress', 'delivered', 'closed', 'declined', 'cancelled')),
  revision_rounds     int not null default 0 check (revision_rounds >= 0),
  delivered_at        timestamptz,
  accepted_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists os_requests_to_idx on public.os_requests (to_division_id, status, due_date);
create index if not exists os_requests_from_idx on public.os_requests (from_division_id, status);
create index if not exists os_requests_requester_idx on public.os_requests (requester_person_id);

create table if not exists public.os_request_events (
  id               bigint generated always as identity primary key,
  request_id       text not null references public.os_requests (id) on delete cascade,
  at               timestamptz not null default now(),
  actor_person_id  text references public.os_people (id),
  action           text not null check (action in ('submitted', 'approved', 'approval_declined', 'accepted', 'info_requested', 'updated',
                                                    'declined', 'assigned', 'task_created', 'started', 'delivered', 'sent_back', 'closed', 'cancelled')),
  from_status      text,
  to_status        text,
  note             text check (note is null or length(note) <= 2000)
);
create index if not exists os_request_events_request_idx on public.os_request_events (request_id, at);

-- Approval decisions, shared later by Finance and Legal (entity_type grows then).
create table if not exists public.os_approvals (
  id                  uuid primary key default gen_random_uuid(),
  entity_type         text not null check (entity_type in ('request')),
  entity_id           text not null,
  step                int not null default 1 check (step >= 1),
  approver_person_id  text not null references public.os_people (id),
  decision            text not null check (decision in ('approved', 'declined')),
  note                text check (note is null or length(note) <= 2000),
  decided_at          timestamptz not null default now()
);
create index if not exists os_approvals_entity_idx on public.os_approvals (entity_type, entity_id);

alter table public.os_tasks add column if not exists request_id text references public.os_requests (id);
create index if not exists os_tasks_request_idx on public.os_tasks (request_id) where request_id is not null;

-- ── Who may do what ────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.os_can_view_request(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.os_requests r
    where r.id = p_id and public.os_is_staff()
      and (r.requester_person_id = public.os_current_person()
           or r.owner_person_id = public.os_current_person()
           or public.os_is_founder()
           or (public.os_in_company(r.company_code)
               and (public.os_workspace_access(r.to_division_id, 'view')
                    or public.os_workspace_lead(r.from_division_id)
                    or (not public.os_division_restricted(r.to_division_id) and public.os_workspace_access(r.from_division_id, 'edit'))))))
$$;

-- A person who can own work in a division: a founder, a division member, or someone with a working role there.
create or replace function public.os_person_works_in(p_person text, p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_people p where p.id = p_person and p.status in ('active', 'onboarding') and p.org_role <> 'guest'
                   and (p.org_role = 'founder'
                        or exists (select 1 from public.os_person_divisions d where d.person_id = p.id and d.division_id = p_division)
                        or exists (select 1 from public.os_workspace_roles w where w.person_id = p.id and w.division_id = p_division
                                     and w.role in ('member', 'officer', 'approver', 'signatory', 'lead')
                                     and w.revoked_at is null and (w.expires_at is null or w.expires_at > now()))))
$$;

create or replace function public.os_request_can_work(r public.os_requests) returns boolean
language sql stable security definer set search_path = '' as $$
  select r.owner_person_id = public.os_current_person() or public.os_workspace_lead(r.to_division_id)
$$;

-- History and notifications in one place.
create or replace function public.os_request_log(r public.os_requests, p_action text, p_from text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.os_request_events (request_id, actor_person_id, action, from_status, to_status, note)
  values (r.id, public.os_current_person(), p_action, p_from, r.status, nullif(trim(coalesce(p_note, '')), ''));
end $$;

create or replace function public.os_request_tell(r public.os_requests, p_who text, p_kind text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare who text; n bigint := (select max(id) from public.os_request_events where request_id = r.id);
begin
  if p_who = 'requester' then
    perform public.os_notify(r.requester_person_id, p_kind, 'request', r.id, p_title, p_body, 'req:' || r.id || ':' || n || ':' || r.requester_person_id);
  elsif p_who = 'owner' then
    perform public.os_notify(r.owner_person_id, p_kind, 'request', r.id, p_title, p_body, 'req:' || r.id || ':' || n || ':' || coalesce(r.owner_person_id, ''));
  else
    for who in select * from public.os_access_deciders('division', case p_who when 'approvers' then r.from_division_id else r.to_division_id end) loop
      if who <> r.requester_person_id or p_who = 'receivers' then
        perform public.os_notify(who, p_kind, 'request', r.id, p_title, p_body, 'req:' || r.id || ':' || n || ':' || who);
      end if;
    end loop;
  end if;
end $$;

-- ── The steps ──────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.os_request_submit(p_type text, p_company text, p_title text, p_brief text, p_priority text, p_due date)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); t public.os_request_types; r public.os_requests;
begin
  if me is null or not public.os_is_staff() then raise exception 'Only Company OS staff can send requests' using errcode = '42501'; end if;
  select * into t from public.os_request_types where code = p_type and active;
  if t.code is null then raise exception 'Unknown request type' using errcode = '22023'; end if;
  if not (public.os_is_founder() or (public.os_in_company(p_company) and public.os_workspace_access(t.from_division_id, 'edit'))) then
    raise exception 'Only people in the requesting division can send this request' using errcode = '42501';
  end if;
  if p_due is null or p_due < (now() at time zone 'Asia/Jakarta')::date then raise exception 'The deadline must be today or later' using errcode = '22023'; end if;
  insert into public.os_requests (id, type_code, company_code, from_division_id, to_division_id, requester_person_id, title, brief, priority, due_date, approval_status)
  values (public.os_next_id('REQ'), t.code, p_company, t.from_division_id, t.to_division_id, me, trim(p_title), trim(p_brief),
          coalesce(p_priority, 'P3 Normal'), p_due, case when t.needs_approval then 'pending' else 'not_needed' end)
  returning * into r;
  perform public.os_request_log(r, 'submitted', null, null);
  if t.needs_approval then
    perform public.os_request_tell(r, 'approvers', 'request_approval', 'Approve request: ' || r.title, t.name || ' to ' || (select name from public.os_divisions where id = t.to_division_id) || ', due ' || r.due_date || '.');
  else
    perform public.os_request_tell(r, 'receivers', 'request_new', 'New request: ' || r.title, t.name || ', due ' || r.due_date || '.');
  end if;
  return r.id;
end $$;

create or replace function public.os_request_approve(p_id text, p_approve boolean, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); r public.os_requests; prev text;
begin
  select * into r from public.os_requests where id = p_id for update;
  if r.id is null or r.approval_status <> 'pending' or r.status <> 'submitted' then raise exception 'This request is not waiting for approval' using errcode = 'P0002'; end if;
  if r.requester_person_id = me then raise exception 'You can''t approve your own request' using errcode = '42501'; end if;
  if not public.os_workspace_lead(r.from_division_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Give a reason for declining' using errcode = '22023'; end if;
  insert into public.os_approvals (entity_type, entity_id, step, approver_person_id, decision, note)
  values ('request', r.id, 1, me, case when p_approve then 'approved' else 'declined' end, nullif(trim(coalesce(p_note, '')), ''));
  prev := r.status;
  update public.os_requests set approval_status = case when p_approve then 'approved' else 'declined' end,
    status = case when p_approve then status else 'declined' end, closed_at = case when p_approve then null else now() end, updated_at = now()
  where id = r.id returning * into r;
  perform public.os_request_log(r, case when p_approve then 'approved' else 'approval_declined' end, prev, p_note);
  perform public.os_request_tell(r, 'requester', 'request_update', case when p_approve then 'Request approved: ' else 'Request declined: ' end || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), ''));
  if p_approve then perform public.os_request_tell(r, 'receivers', 'request_new', 'New request: ' || r.title, 'Approved by the requesting division, due ' || r.due_date || '.'); end if;
  return r.approval_status;
end $$;

create or replace function public.os_request_triage(p_id text, p_action text, p_owner text default null, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.os_requests; prev text;
begin
  select * into r from public.os_requests where id = p_id for update;
  if r.id is null or r.status <> 'submitted' or r.approval_status not in ('not_needed', 'approved') then raise exception 'This request is not waiting for triage' using errcode = 'P0002'; end if;
  if not public.os_workspace_lead(r.to_division_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  prev := r.status;
  if p_action = 'accept' then
    if p_owner is null or not public.os_person_works_in(p_owner, r.to_division_id) then raise exception 'Choose an owner who works in the receiving division' using errcode = '22023'; end if;
    update public.os_requests set status = 'accepted', owner_person_id = p_owner, accepted_at = now(), updated_at = now() where id = r.id returning * into r;
    perform public.os_request_log(r, 'accepted', prev, p_note);
    perform public.os_request_tell(r, 'requester', 'request_update', 'Request accepted: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), ''));
    perform public.os_request_tell(r, 'owner', 'request_update', 'Request assigned to you: ' || r.title, 'Due ' || r.due_date || '.');
  elsif p_action in ('info', 'decline') then
    if coalesce(trim(p_note), '') = '' then raise exception 'Say what is missing or why' using errcode = '22023'; end if;
    update public.os_requests set status = case when p_action = 'info' then 'info_needed' else 'declined' end,
      closed_at = case when p_action = 'decline' then now() end, updated_at = now() where id = r.id returning * into r;
    perform public.os_request_log(r, case when p_action = 'info' then 'info_requested' else 'declined' end, prev, p_note);
    perform public.os_request_tell(r, 'requester', 'request_update', case when p_action = 'info' then 'More information needed: ' else 'Request declined: ' end || r.title, trim(p_note));
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  return r.status;
end $$;

-- The requester edits the brief while it waits, or answers "more information needed" (which sends it back to triage).
create or replace function public.os_request_update(p_id text, p_title text, p_brief text, p_priority text, p_due date, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.os_requests; prev text;
begin
  select * into r from public.os_requests where id = p_id for update;
  if r.id is null or r.requester_person_id <> public.os_current_person() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if r.status not in ('submitted', 'info_needed') then raise exception 'This request can no longer be edited' using errcode = 'P0002'; end if;
  if p_due is null or p_due < (now() at time zone 'Asia/Jakarta')::date then raise exception 'The deadline must be today or later' using errcode = '22023'; end if;
  prev := r.status;
  update public.os_requests set title = trim(p_title), brief = trim(p_brief), priority = coalesce(p_priority, priority), due_date = p_due,
    status = 'submitted', updated_at = now() where id = r.id returning * into r;
  perform public.os_request_log(r, 'updated', prev, p_note);
  if prev = 'info_needed' then perform public.os_request_tell(r, 'receivers', 'request_update', 'Request updated: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), 'The requester added information.')); end if;
  return r.status;
end $$;

create or replace function public.os_request_act(p_id text, p_action text, p_note text default null, p_owner text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); r public.os_requests; prev text;
begin
  select * into r from public.os_requests where id = p_id for update;
  if r.id is null or not public.os_can_view_request(p_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  prev := r.status;
  if p_action in ('start', 'deliver', 'assign') then
    if not public.os_request_can_work(r) then raise exception 'Not allowed' using errcode = '42501'; end if;
    if p_action = 'assign' then
      if r.status not in ('accepted', 'in_progress') or not public.os_workspace_lead(r.to_division_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
      if p_owner is null or not public.os_person_works_in(p_owner, r.to_division_id) then raise exception 'Choose an owner who works in the receiving division' using errcode = '22023'; end if;
      update public.os_requests set owner_person_id = p_owner, updated_at = now() where id = r.id returning * into r;
      perform public.os_request_log(r, 'assigned', prev, p_note);
      perform public.os_request_tell(r, 'owner', 'request_update', 'Request assigned to you: ' || r.title, 'Due ' || r.due_date || '.');
    elsif p_action = 'start' then
      if r.status <> 'accepted' then raise exception 'This request can''t be started now' using errcode = 'P0002'; end if;
      update public.os_requests set status = 'in_progress', updated_at = now() where id = r.id returning * into r;
      perform public.os_request_log(r, 'started', prev, p_note);
    else
      if r.status not in ('accepted', 'in_progress') then raise exception 'This request can''t be delivered now' using errcode = 'P0002'; end if;
      update public.os_requests set status = 'delivered', delivered_at = now(), updated_at = now() where id = r.id returning * into r;
      perform public.os_request_log(r, 'delivered', prev, p_note);
      perform public.os_request_tell(r, 'requester', 'request_update', 'Delivered: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Review it and accept it or send it back.'));
    end if;
  elsif p_action in ('accept', 'send_back', 'cancel') then
    if r.requester_person_id <> me then raise exception 'Not allowed' using errcode = '42501'; end if;
    if p_action = 'accept' then
      if r.status <> 'delivered' then raise exception 'Only delivered work can be accepted' using errcode = 'P0002'; end if;
      update public.os_requests set status = 'closed', closed_at = now(), updated_at = now() where id = r.id returning * into r;
      perform public.os_request_log(r, 'closed', prev, p_note);
      perform public.os_request_tell(r, 'owner', 'request_update', 'Accepted: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), 'The requester accepted the work.'));
    elsif p_action = 'send_back' then
      if r.status <> 'delivered' then raise exception 'Only delivered work can be sent back' using errcode = 'P0002'; end if;
      if coalesce(trim(p_note), '') = '' then raise exception 'Say what needs to change' using errcode = '22023'; end if;
      update public.os_requests set status = 'in_progress', revision_rounds = revision_rounds + 1, delivered_at = null, updated_at = now()
      where id = r.id returning * into r;
      perform public.os_request_log(r, 'sent_back', prev, p_note);
      perform public.os_request_tell(r, 'owner', 'request_update', 'Sent back: ' || r.title, trim(p_note));
    else
      if r.status not in ('submitted', 'info_needed', 'accepted', 'in_progress') then raise exception 'This request can''t be cancelled now' using errcode = 'P0002'; end if;
      update public.os_requests set status = 'cancelled', closed_at = now(), updated_at = now() where id = r.id returning * into r;
      perform public.os_request_log(r, 'cancelled', prev, p_note);
      if r.owner_person_id is not null then perform public.os_request_tell(r, 'owner', 'request_update', 'Cancelled: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), 'The requester cancelled it.'));
      else perform public.os_request_tell(r, 'receivers', 'request_update', 'Cancelled: ' || r.title, coalesce(nullif(trim(coalesce(p_note, '')), ''), 'The requester cancelled it.')); end if;
    end if;
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  return r.status;
end $$;

-- A task for the work, in the receiving division and company. It points to the request; nothing is copied.
create or replace function public.os_request_create_task(p_id text, p_title text, p_owner text default null, p_due date default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.os_requests; tid text; prev text;
begin
  select * into r from public.os_requests where id = p_id for update;
  if r.id is null or not public.os_can_view_request(p_id) or not public.os_request_can_work(r) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if r.status not in ('accepted', 'in_progress') then raise exception 'Tasks are added once a request is accepted' using errcode = 'P0002'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Give the task a title' using errcode = '22023'; end if;
  if p_owner is not null and not public.os_person_works_in(p_owner, r.to_division_id) then raise exception 'Choose an owner who works in the receiving division' using errcode = '22023'; end if;
  insert into public.os_tasks (company_code, division_id, title, description, owner_person_id, status, priority, due_date, sensitivity, request_id)
  values (r.company_code, r.to_division_id, trim(p_title), 'For request ' || r.id || ': ' || r.title, coalesce(p_owner, r.owner_person_id), 'Ready', r.priority,
          coalesce(p_due, r.due_date), 'Internal', r.id)
  returning id into tid;
  prev := r.status;
  if r.status = 'accepted' then update public.os_requests set status = 'in_progress', updated_at = now() where id = r.id returning * into r; end if;
  perform public.os_request_log(r, 'task_created', prev, tid || ': ' || trim(p_title));
  return tid;
end $$;

-- A task may point to a request only in that request's receiving division and company, set by someone who works on
-- it, while it is open. (Authenticated users have no column grant on request_id; os_request_create_task sets it.)
create or replace function public.os_tasks_request_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.os_requests;
begin
  if new.request_id is null or public.os_caller_is_privileged() then return new; end if;
  if tg_op = 'UPDATE' and new.request_id is not distinct from old.request_id
     and new.division_id is not distinct from old.division_id and new.company_code is not distinct from old.company_code then return new; end if;
  select * into r from public.os_requests where id = new.request_id;
  if r.id is null or new.division_id is distinct from r.to_division_id or new.company_code <> r.company_code
     or (tg_op = 'INSERT' or new.request_id is distinct from old.request_id) and (r.status not in ('accepted', 'in_progress') or not public.os_request_can_work(r)) then
    raise exception 'A request''s tasks stay in its receiving division' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.os_tasks_request_guard() from public, anon, authenticated;
drop trigger if exists os_tasks_c_request on public.os_tasks;
create trigger os_tasks_c_request before insert or update on public.os_tasks for each row execute function public.os_tasks_request_guard();

-- ── Read access ────────────────────────────────────────────────────────────────────────────────────────────────────
drop trigger if exists os_requests_audit on public.os_requests;
create trigger os_requests_audit after insert or update or delete on public.os_requests for each row execute function public.os_audit_row();

alter table public.os_requests enable row level security;
revoke all on public.os_requests from anon, authenticated;
grant select on public.os_requests to authenticated;
grant all on public.os_requests to service_role;
drop policy if exists os_requests_read on public.os_requests;
create policy os_requests_read on public.os_requests for select to authenticated using (public.os_can_view_request(id));

alter table public.os_request_events enable row level security;
revoke all on public.os_request_events from anon, authenticated;
grant select on public.os_request_events to authenticated;
grant all on public.os_request_events to service_role;
drop policy if exists os_request_events_read on public.os_request_events;
create policy os_request_events_read on public.os_request_events for select to authenticated using (public.os_can_view_request(request_id));

alter table public.os_approvals enable row level security;
revoke all on public.os_approvals from anon, authenticated;
grant select on public.os_approvals to authenticated;
grant all on public.os_approvals to service_role;
drop policy if exists os_approvals_read on public.os_approvals;
create policy os_approvals_read on public.os_approvals for select to authenticated
  using (entity_type = 'request' and public.os_can_view_request(entity_id));

-- Comments, linked Drive documents and the activity feed work on requests like on any other record.
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
    when 'request' then public.os_can_view_request(p_id)
    else false
  end
$$;

do $$ begin
  alter table public.os_document_links drop constraint if exists os_document_links_entity_type_check;
  alter table public.os_document_links add constraint os_document_links_entity_type_check check (entity_type in
    ('project', 'task', 'meeting', 'partnership', 'decision', 'campaign', 'objective', 'kpi', 'event', 'timeline', 'campaign_plan', 'request'));
  alter table public.os_comments drop constraint if exists os_comments_entity_type_check;
  alter table public.os_comments add constraint os_comments_entity_type_check check (entity_type in
    ('project', 'task', 'document', 'partnership', 'decision', 'meeting', 'campaign', 'objective', 'kpi', 'product', 'timeline', 'event', 'campaign_plan', 'request'));
  alter table public.os_notifications drop constraint if exists os_notifications_kind_check;
  alter table public.os_notifications add constraint os_notifications_kind_check check (kind in
    ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed', 'candidate_new', 'candidate_assigned',
     'access_requested', 'access_decided', 'request_new', 'request_approval', 'request_update'));
  alter table public.os_notifications drop constraint if exists os_notifications_entity_type_check;
  alter table public.os_notifications add constraint os_notifications_entity_type_check check (entity_type in ('event', 'task', 'candidate', 'access_request', 'request'));
end $$;

-- ── Function privileges ────────────────────────────────────────────────────────────────────────────────────────────
revoke all on function public.os_request_log(public.os_requests, text, text, text) from public, anon, authenticated;
revoke all on function public.os_request_tell(public.os_requests, text, text, text, text) from public, anon, authenticated;
revoke all on function public.os_request_can_work(public.os_requests) from public, anon, authenticated;
revoke all on function public.os_person_works_in(text, text) from public, anon;
do $$
declare f text;
begin
  foreach f in array array['os_can_view_request(text)', 'os_person_works_in(text, text)',
    'os_request_submit(text, text, text, text, text, date)', 'os_request_approve(text, boolean, text)', 'os_request_triage(text, text, text, text)',
    'os_request_update(text, text, text, text, date, text)', 'os_request_act(text, text, text, text)', 'os_request_create_task(text, text, text, date)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
