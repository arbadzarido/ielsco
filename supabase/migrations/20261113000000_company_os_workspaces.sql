-- Company OS division workspaces, phase 1: workspace access control.
--
-- Additive. Adds Finance (DIV-08) and Legal (DIV-09) as divisions with no members; a privacy level per division;
-- workspace roles (separate from the division manager flag); access requests that become expiring grants when
-- approved. The access helpers learn one new rule: records of a RESTRICTED division (Finance, Legal) are visible only
-- to people with access to that workspace (members, active workspace roles, division grants, founders), whatever
-- their sensitivity. Nothing existing is dropped, renamed or moved; open divisions behave exactly as before, except
-- that an active workspace role now counts like membership.

-- ── Divisions: privacy, Finance and Legal ──────────────────────────────────────────────────────────────────────────
alter table public.os_divisions add column if not exists privacy text not null default 'open';
do $$ begin
  alter table public.os_divisions drop constraint if exists os_divisions_privacy_check;
  alter table public.os_divisions add constraint os_divisions_privacy_check check (privacy in ('open', 'restricted'));
end $$;
-- Drive folders are left empty: they are added through the Drive routes admin when the founders choose them.
insert into public.os_divisions (id, code, name, privacy) values
  ('DIV-08', 'FIN', 'Finance', 'restricted'),
  ('DIV-09', 'LEG', 'Legal', 'restricted')
on conflict (id) do nothing;

create or replace function public.os_division_restricted(p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select d.privacy = 'restricted' from public.os_divisions d where d.id = p_division), false)
$$;

-- ── Workspace roles ────────────────────────────────────────────────────────────────────────────────────────────────
-- A role in one division's workspace. Viewer reads; the others read and edit. Approver exists only in Finance and
-- Signatory only in Legal (they gate approvals in phase 3). Lead runs the workspace: decides access requests and
-- grants the other roles. Roles are revoked, never deleted.
create table if not exists public.os_workspace_roles (
  id           uuid primary key default gen_random_uuid(),
  person_id    text not null references public.os_people (id) on delete cascade,
  division_id  text not null references public.os_divisions (id),
  role         text not null check (role in ('viewer', 'member', 'officer', 'approver', 'signatory', 'lead')),
  reason       text not null check (length(trim(reason)) between 1 and 500),
  granted_by   text references public.os_people (id),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  revoked_at   timestamptz,
  revoked_by   text references public.os_people (id),
  check (expires_at is null or expires_at > created_at)
);
create unique index if not exists os_workspace_roles_live_idx on public.os_workspace_roles (person_id, division_id, role) where revoked_at is null;
create index if not exists os_workspace_roles_division_idx on public.os_workspace_roles (division_id) where revoked_at is null;

create or replace function public.os_workspace_role_active(p_division text, p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_workspace_roles r
                 where r.person_id = public.os_current_person() and r.division_id = p_division
                   and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())
                   and r.role = any (p_roles))
$$;

-- Whether the caller can work in a division's workspace: view or edit. Founders always; staff through membership, an
-- active role or a division grant; guests through a grant only.
create or replace function public.os_workspace_access(p_division text, p_level text default 'view') returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when p_division is null or public.os_current_person() is null then false
    when public.os_is_founder() then true
    when public.os_has_grant('division', p_division, p_level) then true
    when not public.os_is_staff() then false
    when public.os_in_division(p_division) then true
    else public.os_workspace_role_active(p_division,
           case when p_level = 'view' then array['viewer', 'member', 'officer', 'approver', 'signatory', 'lead']
                else array['member', 'officer', 'approver', 'signatory', 'lead'] end)
  end
$$;

-- Who runs a workspace: founders, an active Lead, or (open divisions only) the division manager. Finance and Legal
-- managers are not implied: being a manager elsewhere gives nothing there.
create or replace function public.os_workspace_lead(p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_current_person() is not null and public.os_is_staff() and (
    public.os_is_founder()
    or public.os_workspace_role_active(p_division, array['lead'])
    or (not public.os_division_restricted(p_division) and public.os_manages_division(p_division)))
$$;

create or replace function public.os_workspace_roles_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare code text;
begin
  if tg_op = 'INSERT' then
    new.granted_by := public.os_current_person();
    new.created_at := now();
    new.revoked_at := null;
    new.revoked_by := null;
    if new.granted_by is null and not public.os_caller_is_privileged() then
      raise exception 'Only Company OS staff can give workspace roles' using errcode = '42501';
    end if;
    select d.code into code from public.os_divisions d where d.id = new.division_id;
    if new.role = 'approver' and code <> 'FIN' then raise exception 'Approver is a Finance role' using errcode = '23514'; end if;
    if new.role = 'signatory' and code <> 'LEG' then raise exception 'Signatory is a Legal role' using errcode = '23514'; end if;
    if not exists (select 1 from public.os_people p where p.id = new.person_id and p.status in ('active', 'onboarding')) then
      raise exception 'Roles go to active people only' using errcode = '23514';
    end if;
    if not public.os_caller_is_privileged() and not public.os_is_founder() then
      if new.role in ('lead', 'approver', 'signatory') then
        raise exception 'Only founders give the Lead, Approver and Signatory roles' using errcode = '42501';
      end if;
      if new.expires_at is null or new.expires_at > now() + interval '365 days' then
        raise exception 'Roles given by a workspace lead need an end date within a year' using errcode = '23514';
      end if;
    end if;
  else
    if (new.person_id, new.division_id, new.role, new.reason, new.granted_by, new.created_at, new.expires_at)
       is distinct from (old.person_id, old.division_id, old.role, old.reason, old.granted_by, old.created_at, old.expires_at) then
      raise exception 'A role cannot be changed; revoke it and give a new one' using errcode = '42501';
    end if;
    if old.revoked_at is not null then raise exception 'Role already revoked' using errcode = '42501'; end if;
    if new.revoked_at is not null then new.revoked_at := now(); new.revoked_by := public.os_current_person(); end if;
  end if;
  return new;
end $$;
revoke all on function public.os_workspace_roles_before_write() from public, anon, authenticated;
drop trigger if exists os_workspace_roles_before_write on public.os_workspace_roles;
create trigger os_workspace_roles_before_write before insert or update on public.os_workspace_roles
  for each row execute function public.os_workspace_roles_before_write();
drop trigger if exists os_workspace_roles_audit on public.os_workspace_roles;
create trigger os_workspace_roles_audit after insert or update or delete on public.os_workspace_roles
  for each row execute function public.os_audit_row();

alter table public.os_workspace_roles enable row level security;
revoke all on public.os_workspace_roles from anon, authenticated;
grant select, insert, update on public.os_workspace_roles to authenticated;
grant all on public.os_workspace_roles to service_role;
drop policy if exists os_workspace_roles_read on public.os_workspace_roles;
create policy os_workspace_roles_read on public.os_workspace_roles for select to authenticated
  using (person_id = (select public.os_current_person()) or public.os_workspace_access(division_id, 'view'));
drop policy if exists os_workspace_roles_insert on public.os_workspace_roles;
create policy os_workspace_roles_insert on public.os_workspace_roles for insert to authenticated
  with check (public.os_workspace_lead(division_id));
drop policy if exists os_workspace_roles_revoke on public.os_workspace_roles;
create policy os_workspace_roles_revoke on public.os_workspace_roles for update to authenticated
  using (public.os_workspace_lead(division_id) or granted_by = (select public.os_current_person()))
  with check (public.os_workspace_lead(division_id) or granted_by = (select public.os_current_person()));
-- No delete policy: roles are revoked, never deleted.

-- Workspace leads see and give division grants for their workspace, as division managers already can.
drop policy if exists os_grants_read_lead on public.os_grants;
create policy os_grants_read_lead on public.os_grants for select to authenticated
  using (resource_type = 'division' and public.os_workspace_lead(resource_id));
drop policy if exists os_grants_insert_lead on public.os_grants;
create policy os_grants_insert_lead on public.os_grants for insert to authenticated
  with check (resource_type = 'division' and public.os_workspace_lead(resource_id));

-- ── The access rules, with restricted divisions ────────────────────────────────────────────────────────────────────
-- Same as 20261107010000 plus: (a) a restricted division's records need workspace access, whatever their
-- sensitivity; (b) an active workspace role counts like membership for Confidential records and for editing.
-- A division manager's existing Finance-division rights do not exist (nobody is in Finance yet), so nothing loses
-- access it has today.
create or replace function public.os_can_view(p_company text, p_division text, p_sensitivity text,
                                              p_resource_type text, p_resource_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when public.os_has_grant(p_resource_type, p_resource_id, 'view') then true
    when p_division is not null and public.os_has_grant('division', p_division, 'view')
         and p_sensitivity <> 'Restricted' then true
    when not public.os_is_staff() then false                       -- guests: explicit grants only
    when p_sensitivity = 'Restricted' then false
    when p_division is not null and public.os_division_restricted(p_division)
      then public.os_in_company(p_company) and public.os_workspace_access(p_division, 'view')
    when p_sensitivity = 'Confidential' then p_division is not null and public.os_workspace_access(p_division, 'view')
                                             and public.os_in_company(p_company)
    else public.os_in_company(p_company)                           -- Internal
  end
$$;

create or replace function public.os_can_edit(p_company text, p_division text, p_sensitivity text,
                                              p_resource_type text, p_resource_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when public.os_has_grant(p_resource_type, p_resource_id, 'edit') then true
    when p_division is not null and public.os_has_grant('division', p_division, 'edit')
         and p_sensitivity <> 'Restricted' then true
    when not public.os_is_staff() then false
    when p_sensitivity = 'Restricted' then false
    else p_division is not null and public.os_workspace_access(p_division, 'edit') and public.os_in_company(p_company)
  end
$$;

create or replace function public.os_can_create(p_company text, p_division text, p_sensitivity text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when not public.os_is_staff() then false
    when p_sensitivity = 'Restricted' then false
    when not public.os_in_company(p_company) then false
    when p_division is null then true
    else public.os_workspace_access(p_division, 'edit')
  end
$$;

-- ── My workspaces (for the switcher and sidebar) ───────────────────────────────────────────────────────────────────
-- Every division, with the caller's access to it. Divisions are not secret (the directory shows them); their records
-- are. 'none' rows let the app offer an access request.
create or replace function public.os_my_workspaces()
returns table (division_id text, code text, name text, privacy text, access text, roles text[], is_member boolean, is_manager boolean, is_lead boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.code, d.name, d.privacy,
         case when public.os_workspace_access(d.id, 'edit') then 'edit' when public.os_workspace_access(d.id, 'view') then 'view' else 'none' end,
         coalesce(array(select r.role from public.os_workspace_roles r where r.person_id = public.os_current_person() and r.division_id = d.id
                          and r.revoked_at is null and (r.expires_at is null or r.expires_at > now()) order by r.role), '{}'),
         public.os_in_division(d.id), public.os_manages_division(d.id), public.os_workspace_lead(d.id)
  from public.os_divisions d
  where public.os_current_person() is not null and public.os_is_staff()
  order by d.id
$$;

-- ── Access requests ────────────────────────────────────────────────────────────────────────────────────────────────
-- Ask for a workspace, project or document; the person who runs it decides; approval writes an expiring grant.
create table if not exists public.os_access_requests (
  id                  text primary key check (id ~ '^ACR-[0-9]{4,}$'),
  requester_person_id text not null references public.os_people (id) on delete cascade,
  resource_type       text not null check (resource_type in ('division', 'project', 'document')),
  resource_id         text not null,
  level               text not null check (level in ('view', 'edit')),
  reason              text not null check (length(trim(reason)) between 3 and 1000),
  until               date not null,
  status              text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  decided_by          text references public.os_people (id),
  decided_at          timestamptz,
  decision_note       text check (decision_note is null or length(decision_note) <= 1000),
  grant_id            uuid references public.os_grants (id),
  created_at          timestamptz not null default now()
);
create unique index if not exists os_access_requests_pending_idx on public.os_access_requests (requester_person_id, resource_type, resource_id) where status = 'pending';
create index if not exists os_access_requests_resource_idx on public.os_access_requests (resource_type, resource_id, status);

-- Who may decide a request for a resource (never the requester; checked by the caller).
create or replace function public.os_can_decide_access(p_type text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_current_person() is not null and public.os_is_staff() and case p_type
    when 'division' then public.os_workspace_lead(p_id)
    when 'project' then exists (select 1 from public.os_projects x where x.id = p_id and x.sensitivity <> 'Restricted'
                                and (public.os_is_founder() or x.owner_person_id = public.os_current_person()
                                     or (x.division_id is not null and public.os_workspace_lead(x.division_id))))
                        or exists (select 1 from public.os_projects x where x.id = p_id and public.os_is_founder())
    when 'document' then exists (select 1 from public.os_documents x where x.id = p_id
                                 and (public.os_is_founder()
                                      or (x.sensitivity <> 'Restricted' and (x.owner_person_id = public.os_current_person()
                                          or (x.division_id is not null and public.os_workspace_lead(x.division_id))))))
    else false
  end
$$;

-- Who is told about a new request: the leads of the division (managers of an open division, active Lead roles), or
-- the project/document owner and the leads of its division. Founders only when nobody else can decide.
create or replace function public.os_access_deciders(p_type text, p_id text) returns setof text
language sql stable security definer set search_path = '' as $$
  with div as (
    select case p_type when 'division' then p_id
                       when 'project' then (select division_id from public.os_projects where id = p_id)
                       when 'document' then (select division_id from public.os_documents where id = p_id) end as d,
           case p_type when 'project' then (select owner_person_id from public.os_projects where id = p_id)
                       when 'document' then (select owner_person_id from public.os_documents where id = p_id) end as owner
  ), named as (
    select owner as person_id from div where owner is not null
    union select r.person_id from public.os_workspace_roles r, div
      where r.division_id = div.d and r.role = 'lead' and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())
    union select pd.person_id from public.os_person_divisions pd join public.os_people p on p.id = pd.person_id, div
      where pd.division_id = div.d and pd.is_manager and p.org_role in ('manager', 'founder') and not public.os_division_restricted(div.d)
  )
  select person_id from named
  union select p.id from public.os_people p where p.org_role = 'founder' and p.status = 'active' and not exists (select 1 from named)
$$;

create or replace function public.os_request_access(p_type text, p_id text, p_level text, p_reason text, p_until date)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); new_id text; label text; who text;
begin
  if me is null or not public.os_is_staff() then raise exception 'Only Company OS staff can ask for access' using errcode = '42501'; end if;
  if p_type not in ('division', 'project', 'document') or p_level not in ('view', 'edit') then
    raise exception 'Unknown access type' using errcode = '22023';
  end if;
  if p_until is null or p_until < (now() at time zone 'Asia/Jakarta')::date or p_until > (now() at time zone 'Asia/Jakarta')::date + 90 then
    raise exception 'Access ends within 90 days' using errcode = '22023';
  end if;
  label := case p_type
    when 'division' then (select name from public.os_divisions where id = p_id)
    when 'project' then (select name from public.os_projects where id = p_id)
    when 'document' then (select coalesce(reference_number, id) from public.os_documents where id = p_id) end;
  if label is null then raise exception 'Nothing to ask access for' using errcode = 'P0002'; end if;
  if (p_type = 'division' and public.os_workspace_access(p_id, p_level))
     or (p_type = 'project' and p_level = 'view' and public.os_can_view_project(p_id))
     or (p_type = 'document' and p_level = 'view' and public.os_can_view_document(p_id)) then
    raise exception 'You already have this access' using errcode = '23505';
  end if;
  new_id := public.os_next_id('ACR');
  insert into public.os_access_requests (id, requester_person_id, resource_type, resource_id, level, reason, until)
  values (new_id, me, p_type, p_id, p_level, trim(p_reason), p_until);
  for who in select * from public.os_access_deciders(p_type, p_id) loop
    perform public.os_notify(who, 'access_requested', 'access_request', new_id,
      'Access request: ' || label, (select full_name from public.os_people where id = me) || ' asks to ' || p_level || ' until ' || p_until || '.',
      'acr:' || new_id || ':' || who);
  end loop;
  return new_id;
end $$;

create or replace function public.os_decide_access_request(p_id text, p_approve boolean, p_note text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); r record; g uuid;
begin
  select * into r from public.os_access_requests where id = p_id for update;
  if r is null or r.status <> 'pending' then raise exception 'This request is not open' using errcode = 'P0002'; end if;
  if r.requester_person_id = me then raise exception 'You can''t decide your own request' using errcode = '42501'; end if;
  if not public.os_can_decide_access(r.resource_type, r.resource_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_approve then
    if r.until < (now() at time zone 'Asia/Jakarta')::date then raise exception 'This request has expired' using errcode = '22023'; end if;
    insert into public.os_grants (person_id, resource_type, resource_id, level, reason, expires_at)
    values (r.requester_person_id, r.resource_type, r.resource_id, r.level, left('Access request ' || r.id || ': ' || r.reason, 500),
            least((r.until + 1)::timestamp at time zone 'Asia/Jakarta', now() + interval '90 days'))
    returning id into g;
  end if;
  update public.os_access_requests set status = case when p_approve then 'approved' else 'declined' end,
    decided_by = me, decided_at = now(), decision_note = nullif(trim(coalesce(p_note, '')), ''), grant_id = g
  where id = p_id;
  perform public.os_notify(r.requester_person_id, 'access_decided', 'access_request', r.id,
    case when p_approve then 'Access approved' else 'Access declined' end,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), case when p_approve then 'Until ' || r.until || '.' else null end), 'acr-d:' || r.id);
  return case when p_approve then 'approved' else 'declined' end;
end $$;

create or replace function public.os_withdraw_access_request(p_id text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.os_access_requests set status = 'withdrawn', decided_at = now()
  where id = p_id and requester_person_id = public.os_current_person() and status = 'pending';
  if not found then raise exception 'This request is not open' using errcode = 'P0002'; end if;
end $$;

drop trigger if exists os_access_requests_audit on public.os_access_requests;
create trigger os_access_requests_audit after insert or update or delete on public.os_access_requests
  for each row execute function public.os_audit_row();

alter table public.os_access_requests enable row level security;
revoke all on public.os_access_requests from anon, authenticated;
grant select on public.os_access_requests to authenticated;
grant all on public.os_access_requests to service_role;
drop policy if exists os_access_requests_read on public.os_access_requests;
create policy os_access_requests_read on public.os_access_requests for select to authenticated
  using (requester_person_id = (select public.os_current_person()) or public.os_can_decide_access(resource_type, resource_id));
-- Writes only through the functions above.

-- ── Notifications about access ─────────────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter table public.os_notifications drop constraint if exists os_notifications_kind_check;
  alter table public.os_notifications add constraint os_notifications_kind_check check (kind in
    ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed', 'candidate_new', 'candidate_assigned',
     'access_requested', 'access_decided'));
  alter table public.os_notifications drop constraint if exists os_notifications_entity_type_check;
  alter table public.os_notifications add constraint os_notifications_entity_type_check check (entity_type in ('event', 'task', 'candidate', 'access_request'));
end $$;

-- ── Function privileges ────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'os_division_restricted(text)', 'os_workspace_role_active(text, text[])', 'os_workspace_access(text, text)',
    'os_workspace_lead(text)', 'os_my_workspaces()', 'os_can_decide_access(text, text)',
    'os_request_access(text, text, text, text, date)', 'os_decide_access_request(text, boolean, text)', 'os_withdraw_access_request(text)',
    'os_can_view(text, text, text, text, text)', 'os_can_edit(text, text, text, text, text)', 'os_can_create(text, text, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
revoke all on function public.os_access_deciders(text, text) from public, anon, authenticated;
