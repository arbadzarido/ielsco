-- Company OS, phase 1 foundation: people, roles, divisions, grants, audit log, Drive folder routes, document numbers.
--
-- Docs: docs/COMPANY-OS.md. Tests: tests/db/company-os.pglite.mjs.
-- Additive only: creates new os_* tables and functions in public; changes no existing table, policy or data.
-- Re-runnable: every object uses "if not exists" / "create or replace" / "drop ... if exists" before create.
--
-- Access rules (see "Company OS: Audit and Architecture Proposal", Permission model):
--   founder  : everything, including Restricted
--   manager  : their division's records up to Confidential; may grant view/edit on their division, with an end date
--   member   : their division's records up to Internal (Confidential only inside their own division); assigned items
--   guest    : only records explicitly granted to them
-- Sensitivity labels are the existing ones from Operations Master Config_Lists: Internal, Confidential, Restricted.
-- Everything is enforced by RLS and security-definer helpers; the UI only arranges what the database returns.

-- ── Reference data ─────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_companies (
  code        text primary key check (code in ('HQ', 'IEL', 'ELC')),
  name        text not null,
  legal_name  text
);

insert into public.os_companies (code, name, legal_name) values
  ('HQ',  'HQ (shared founders office)', null),
  ('IEL', 'IELSco', 'PT English Space Berkah Indonesia'),
  ('ELC', 'Elco AI', 'PT Elco Edukasi Berkah Indonesia')
on conflict (code) do nothing;

-- The seven divisions from DOC-0053 (Seven-Division Operating Model). Owners are set later, once people exist.
create table if not exists public.os_divisions (
  id               text primary key check (id ~ '^DIV-[0-9]{2}$'),
  code             text not null unique check (code ~ '^[A-Z]{2,3}$'),
  name             text not null,
  owner_person_id  text,
  drive_folder_id  text
);

insert into public.os_divisions (id, code, name, drive_folder_id) values
  ('DIV-01', 'COM', 'Community',          '1Pqefr5rOR4mO_V0f6dmeK3jsbTZS6F4i'),
  ('DIV-02', 'OPS', 'Operations',         '1xyNPw3y2KTCMLswji_6nhmI5ocmPB1_N'),
  ('DIV-03', 'GRO', 'Growth',             '1Ripo54IiO5EZFDF1WSnTzSWfAxIuT6sP'),
  ('DIV-04', 'CRE', 'Creative',           '1VZvpKBrLCuKDXhkt6RWzOrvQNbMQT1Dx'),
  ('DIV-05', 'PPL', 'People',             '1THj7czC4nLmLR6gTioZgUwBT6P9PALBM'),
  ('DIV-06', 'PAR', 'Partnerships',       '1elvc0Gyz9m-71aWWm5VFcAHhdC5vgfQ5'),
  ('DIV-07', 'CRS', 'Courses & Learning', '1OzFEQDaMrRBupHrPQssQRAq9lLblnAfn')
on conflict (id) do nothing;

-- ── People and membership ──────────────────────────────────────────────────────────────────────────────────────────

-- Person IDs keep the Operations Master format (PPL-0001). user_id links the IELSco login; null until the person signs in
-- and a founder links the account (never matched automatically by email).
create table if not exists public.os_people (
  id             text primary key check (id ~ '^PPL-[0-9]{4}$'),
  user_id        uuid unique references auth.users (id) on delete set null,
  full_name      text not null,
  short_name     text,
  org_role       text not null default 'member' check (org_role in ('founder', 'manager', 'member', 'guest')),
  status         text not null default 'onboarding' check (status in ('onboarding', 'active', 'inactive', 'offboarded')),
  google_account text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

do $$ begin
  alter table public.os_divisions
    add constraint os_divisions_owner_fk foreign key (owner_person_id) references public.os_people (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.os_person_companies (
  person_id     text not null references public.os_people (id) on delete cascade,
  company_code  text not null references public.os_companies (code),
  primary key (person_id, company_code)
);

create table if not exists public.os_person_divisions (
  person_id    text not null references public.os_people (id) on delete cascade,
  division_id  text not null references public.os_divisions (id),
  is_manager   boolean not null default false,
  primary key (person_id, division_id)
);

-- Extra, explicit access. Expiry is checked at read time, so an expired grant stops working without a clean-up job.
create table if not exists public.os_grants (
  id             uuid primary key default gen_random_uuid(),
  person_id      text not null references public.os_people (id) on delete cascade,
  resource_type  text not null check (resource_type in ('division', 'document', 'project')),
  resource_id    text not null,
  level          text not null check (level in ('view', 'edit')),
  reason         text not null check (length(trim(reason)) > 0),
  granted_by     text not null references public.os_people (id),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     text references public.os_people (id),
  check (expires_at is null or expires_at > created_at)
);
create index if not exists os_grants_person_idx on public.os_grants (person_id) where revoked_at is null;

-- Append-only. Written only by triggers and security-definer functions; nobody can update or delete rows through the API.
create table if not exists public.os_audit_log (
  id               bigint generated always as identity primary key,
  at               timestamptz not null default now(),
  actor_user_id    uuid default auth.uid(),
  actor_person_id  text,
  action           text not null,
  target_type      text not null,
  target_id        text,
  detail           jsonb not null default '{}'::jsonb
);

-- ── Drive folder routes and document numbers ───────────────────────────────────────────────────────────────────────

-- Maps (company, division, doc type, sensitivity) to an EXISTING Drive folder. Rows start as 'proposed'; only
-- 'approved' rows are used for routing. The app never creates, renames or moves folders.
create table if not exists public.os_folder_routes (
  id               uuid primary key default gen_random_uuid(),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  doc_type         text,
  sensitivity      text not null check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  drive_folder_id  text not null,
  folder_name      text not null,
  status           text not null default 'proposed' check (status in ('proposed', 'approved', 'retired')),
  approved_by      text references public.os_people (id),
  approved_at      timestamptz,
  note             text
);
create unique index if not exists os_folder_routes_key on public.os_folder_routes
  (company_code, coalesce(division_id, '*'), coalesce(doc_type, '*'), sensitivity) where status = 'approved';

create table if not exists public.os_doc_counters (
  company_code  text not null references public.os_companies (code),
  doc_type      text not null check (doc_type ~ '^[A-Z]{2,4}$'),
  year          int  not null check (year between 2020 and 2100),
  last_number   int  not null default 0,
  primary key (company_code, doc_type, year)
);

-- ── Helpers (security definer: they read os tables regardless of the caller's RLS) ─────────────────────────────────

create or replace function public.os_current_person() returns text
language sql stable security definer set search_path = '' as $$
  select p.id from public.os_people p
  where p.user_id = (select auth.uid()) and p.status in ('onboarding', 'active')
$$;

create or replace function public.os_is_founder() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_people p
                 where p.user_id = (select auth.uid()) and p.status = 'active' and p.org_role = 'founder')
$$;

-- Staff = a founder, or a non-guest who belongs to at least one company. Someone just added (onboarding, no company
-- yet) sees only their own person row until a founder adds a company.
create or replace function public.os_is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_people p
                 where p.user_id = (select auth.uid()) and p.status in ('onboarding', 'active') and p.org_role <> 'guest'
                   and (p.org_role = 'founder'
                        or exists (select 1 from public.os_person_companies c where c.person_id = p.id)))
$$;

create or replace function public.os_in_division(p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_person_divisions d
                 where d.person_id = public.os_current_person() and d.division_id = p_division)
$$;

create or replace function public.os_manages_division(p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_person_divisions d
                 join public.os_people p on p.id = d.person_id
                 where d.person_id = public.os_current_person() and d.division_id = p_division
                   and d.is_manager and p.org_role in ('manager', 'founder'))
$$;

create or replace function public.os_in_company(p_company text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_person_companies c
                 where c.person_id = public.os_current_person() and (c.company_code = p_company or p_company = 'HQ'))
$$;

create or replace function public.os_has_grant(p_type text, p_id text, p_level text default 'view') returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_grants g
                 where g.person_id = public.os_current_person()
                   and g.resource_type = p_type and g.resource_id = p_id
                   and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
                   and (p_level = 'view' or g.level = 'edit'))
$$;

-- The single read rule every later OS table (documents, tasks, projects) calls from its RLS policy.
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
    when p_sensitivity = 'Confidential' then p_division is not null and public.os_in_division(p_division)
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
    else p_division is not null and public.os_in_division(p_division)
  end
$$;

-- Next document number, e.g. os_next_doc_number('IEL', 'LET', 2026) -> 1, 2, 3 ... The row lock in the upsert makes
-- concurrent callers wait, so two people never receive the same number.
create or replace function public.os_next_doc_number(p_company text, p_type text, p_year int) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  if not public.os_is_staff() then
    raise exception 'Only staff can reserve document numbers' using errcode = '42501';
  end if;
  if not (public.os_is_founder() or public.os_in_company(p_company)) then
    raise exception 'You can only reserve numbers for a company you work in' using errcode = '42501';
  end if;
  insert into public.os_doc_counters as c (company_code, doc_type, year, last_number)
  values (p_company, p_type, p_year, 1)
  on conflict (company_code, doc_type, year) do update set last_number = c.last_number + 1
  returning last_number into n;
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), 'doc_number.reserve', 'doc_counter',
          p_company || '-' || p_type || '-' || p_year, jsonb_build_object('number', n));
  return n;
end $$;

-- Link a person record to their IELSco login. Founders only; the account must have a confirmed email, so a typo or an
-- unverified sign-up cannot be linked. The audit trigger on os_people records the change.
create or replace function public.os_link_account(p_person text, p_email text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.os_is_founder() then
    raise exception 'Only founders can link accounts' using errcode = '42501';
  end if;
  select u.id into uid from auth.users u
  where lower(u.email) = lower(trim(p_email)) and u.email_confirmed_at is not null;
  if uid is null then
    raise exception 'No confirmed IELSco account uses that email' using errcode = 'P0002';
  end if;
  update public.os_people set user_id = uid where id = p_person;
  if not found then
    raise exception 'Unknown person %', p_person using errcode = 'P0002';
  end if;
  return uid;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'os_current_person()', 'os_is_founder()', 'os_is_staff()', 'os_in_division(text)', 'os_manages_division(text)',
    'os_in_company(text)', 'os_has_grant(text, text, text)', 'os_can_view(text, text, text, text, text)',
    'os_can_edit(text, text, text, text, text)', 'os_next_doc_number(text, text, int)', 'os_link_account(text, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ── Audit triggers ─────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.os_audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target text := coalesce(rec ->> 'id', rec ->> 'person_id');
begin
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), tg_table_name || '.' || lower(tg_op), tg_table_name, target,
          jsonb_build_object('old', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
                             'new', case when tg_op = 'DELETE' then null else to_jsonb(new) end));
  return null;
end $$;
revoke all on function public.os_audit_row() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['os_people', 'os_person_companies', 'os_person_divisions', 'os_grants', 'os_folder_routes', 'os_divisions']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.os_audit_row()', t || '_audit', t);
  end loop;
end $$;

create or replace function public.os_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
revoke all on function public.os_touch_updated_at() from public, anon, authenticated;
drop trigger if exists os_people_touch on public.os_people;
create trigger os_people_touch before update on public.os_people for each row execute function public.os_touch_updated_at();

-- Grants: the grantor is always the caller (cannot be forged), and managers must give an end date.
create or replace function public.os_grants_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.granted_by := public.os_current_person();
    new.created_at := now();
    new.revoked_at := null;
    new.revoked_by := null;
    if new.granted_by is null then
      raise exception 'Only Company OS staff can grant access' using errcode = '42501';
    end if;
    if not public.os_is_founder() and new.expires_at is null then
      raise exception 'Grants made by managers need an end date' using errcode = '23514';
    end if;
    if not public.os_is_founder() and new.expires_at > now() + interval '90 days' then
      raise exception 'Grants made by managers can last at most 90 days' using errcode = '23514';
    end if;
  elsif tg_op = 'UPDATE' then
    -- Only revoking is allowed after creation.
    if (new.person_id, new.resource_type, new.resource_id, new.level, new.reason, new.granted_by, new.created_at, new.expires_at)
       is distinct from (old.person_id, old.resource_type, old.resource_id, old.level, old.reason, old.granted_by, old.created_at, old.expires_at) then
      raise exception 'A grant cannot be changed; revoke it and create a new one' using errcode = '42501';
    end if;
    if old.revoked_at is not null then
      raise exception 'Grant already revoked' using errcode = '42501';
    end if;
    if new.revoked_at is not null then
      new.revoked_at := now();
      new.revoked_by := public.os_current_person();
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_grants_before_write() from public, anon, authenticated;
drop trigger if exists os_grants_before_write on public.os_grants;
create trigger os_grants_before_write before insert or update on public.os_grants
  for each row execute function public.os_grants_before_write();

-- Folder routes: who approved and when are set here from the caller, never taken from the request. Changing where an
-- approved route points counts as a new approval by whoever made the change.
create or replace function public.os_folder_routes_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved'
       or (new.company_code, new.division_id, new.doc_type, new.sensitivity, new.drive_folder_id)
          is distinct from (old.company_code, old.division_id, old.doc_type, old.sensitivity, old.drive_folder_id)) then
    new.approved_by := public.os_current_person();
    new.approved_at := now();
  elsif tg_op = 'INSERT' then
    new.approved_by := null;
    new.approved_at := null;
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  return new;
end $$;
revoke all on function public.os_folder_routes_before_write() from public, anon, authenticated;
drop trigger if exists os_folder_routes_before_write on public.os_folder_routes;
create trigger os_folder_routes_before_write before insert or update on public.os_folder_routes
  for each row execute function public.os_folder_routes_before_write();

-- ── Row level security ─────────────────────────────────────────────────────────────────────────────────────────────

alter table public.os_companies        enable row level security;
alter table public.os_divisions        enable row level security;
alter table public.os_people           enable row level security;
alter table public.os_person_companies enable row level security;
alter table public.os_person_divisions enable row level security;
alter table public.os_grants           enable row level security;
alter table public.os_audit_log        enable row level security;
alter table public.os_folder_routes    enable row level security;
alter table public.os_doc_counters     enable row level security;

-- Supabase grants every new table to anon and authenticated by default; start from nothing and grant only what is used.
revoke all on public.os_companies, public.os_divisions, public.os_people, public.os_person_companies,
              public.os_person_divisions, public.os_grants, public.os_audit_log, public.os_folder_routes,
              public.os_doc_counters from anon, authenticated;
grant select on public.os_companies, public.os_divisions, public.os_people, public.os_person_companies,
                public.os_person_divisions, public.os_grants, public.os_audit_log, public.os_folder_routes to authenticated;
grant insert, update, delete on public.os_divisions, public.os_person_companies,
                                public.os_person_divisions, public.os_folder_routes to authenticated;
-- os_people: user_id, created_at and updated_at are not writable through the API. Logins are linked only by
-- os_link_account(), which checks the email is confirmed.
grant insert (id, full_name, short_name, org_role, status, google_account) on public.os_people to authenticated;
grant update (full_name, short_name, org_role, status, google_account) on public.os_people to authenticated;
grant delete on public.os_people to authenticated;
grant insert, update on public.os_grants to authenticated;
-- os_doc_counters: no grants at all; numbers come only from os_next_doc_number().

-- Companies and divisions: readable by staff and guests with an OS account; divisions edited by founders.
drop policy if exists os_companies_read on public.os_companies;
create policy os_companies_read on public.os_companies for select to authenticated
  using ((select public.os_current_person()) is not null);

drop policy if exists os_divisions_read on public.os_divisions;
create policy os_divisions_read on public.os_divisions for select to authenticated
  using ((select public.os_is_staff()));
drop policy if exists os_divisions_founder_write on public.os_divisions;
create policy os_divisions_founder_write on public.os_divisions for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

-- People: staff see the directory; a guest sees only their own row. Founders manage people.
drop policy if exists os_people_read on public.os_people;
create policy os_people_read on public.os_people for select to authenticated
  using ((select public.os_is_staff()) or user_id = (select auth.uid()));
drop policy if exists os_people_founder_write on public.os_people;
create policy os_people_founder_write on public.os_people for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

drop policy if exists os_person_companies_read on public.os_person_companies;
create policy os_person_companies_read on public.os_person_companies for select to authenticated
  using ((select public.os_is_staff()));
drop policy if exists os_person_companies_founder_write on public.os_person_companies;
create policy os_person_companies_founder_write on public.os_person_companies for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

drop policy if exists os_person_divisions_read on public.os_person_divisions;
create policy os_person_divisions_read on public.os_person_divisions for select to authenticated
  using ((select public.os_is_staff()));
drop policy if exists os_person_divisions_founder_write on public.os_person_divisions;
create policy os_person_divisions_founder_write on public.os_person_divisions for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

-- Grants: you see your own, those you gave, and (managers) those on your division. Founders see all.
drop policy if exists os_grants_read on public.os_grants;
create policy os_grants_read on public.os_grants for select to authenticated
  using ((select public.os_is_founder())
         or person_id = (select public.os_current_person())
         or granted_by = (select public.os_current_person())
         or (resource_type = 'division' and public.os_manages_division(resource_id)));
drop policy if exists os_grants_insert on public.os_grants;
create policy os_grants_insert on public.os_grants for insert to authenticated
  with check ((select public.os_is_founder())
              or (resource_type = 'division' and public.os_manages_division(resource_id)));
drop policy if exists os_grants_revoke on public.os_grants;
create policy os_grants_revoke on public.os_grants for update to authenticated
  using ((select public.os_is_founder()) or granted_by = (select public.os_current_person()))
  with check ((select public.os_is_founder()) or granted_by = (select public.os_current_person()));
-- No delete policy: grants are revoked, never deleted.

-- Audit log: founders read; nobody writes directly (no insert/update/delete policies).
drop policy if exists os_audit_log_read on public.os_audit_log;
create policy os_audit_log_read on public.os_audit_log for select to authenticated
  using ((select public.os_is_founder()));

-- Folder routes: staff read (the upload form needs them); founders write and approve.
drop policy if exists os_folder_routes_read on public.os_folder_routes;
create policy os_folder_routes_read on public.os_folder_routes for select to authenticated
  using ((select public.os_is_staff()));
drop policy if exists os_folder_routes_founder_write on public.os_folder_routes;
create policy os_folder_routes_founder_write on public.os_folder_routes for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

-- ── Proposed folder routes (status 'proposed'; nothing routes until a founder approves each row) ───────────────────
-- Folder IDs read from the shared drive "Company OS — IELSco & Elco" on 2026-11-06.

insert into public.os_folder_routes (company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, note)
select * from (values
  ('HQ',  null::text, 'TPL', 'Internal',     '1deyBzqGI5e1zj1cl3smndFDfqWPbWcz1', '02.1 Master Templates', 'Templates only; generated documents never land here'),
  ('HQ',  null,       'SOP', 'Internal',     '1GeVUV1xe2o9DyXSx9auJJPsghMZQs6HM', '02.3 Operating Manuals & SOPs', null),
  ('HQ',  null,       'POL', 'Internal',     '1GeVUV1xe2o9DyXSx9auJJPsghMZQs6HM', '02.3 Operating Manuals & SOPs', null),
  ('HQ',  null,       'MOM', 'Internal',     '1-Y5wZ2JzRZuje2V3XvRWGXDjUJqTP0lg', '03 HQ — Team Hub', 'HQ meeting minutes'),
  ('HQ',  null,       null,  'Internal',     '1R-xtBqljabEupGbvsOGJNNo0SlHsdocJ', '01 HQ — Operations Hub', 'Default for HQ Internal'),
  ('HQ',  null,       null,  'Confidential', '1amWFXz_INdq_f_uTBr62vsOTPfigLoAJ', '00 HQ — Founders Office', 'Default for HQ Confidential'),
  ('HQ',  null,       'FIN', 'Restricted',   '1V_UHFeRTgDzt9uKjPcT55zgJ4ZFgU9KI', '00.9 HQ Finance Overview (Restricted)', null),
  ('HQ',  'DIV-01',   null,  'Internal',     '1Pqefr5rOR4mO_V0f6dmeK3jsbTZS6F4i', 'DIV-01 Community', null),
  ('HQ',  'DIV-02',   null,  'Internal',     '1xyNPw3y2KTCMLswji_6nhmI5ocmPB1_N', 'DIV-02 Operations', null),
  ('HQ',  'DIV-03',   null,  'Internal',     '1Ripo54IiO5EZFDF1WSnTzSWfAxIuT6sP', 'DIV-03 Growth', null),
  ('HQ',  'DIV-04',   null,  'Internal',     '1VZvpKBrLCuKDXhkt6RWzOrvQNbMQT1Dx', 'DIV-04 Creative', null),
  ('HQ',  'DIV-05',   null,  'Internal',     '1THj7czC4nLmLR6gTioZgUwBT6P9PALBM', 'DIV-05 People', null),
  ('HQ',  'DIV-06',   null,  'Internal',     '1elvc0Gyz9m-71aWWm5VFcAHhdC5vgfQ5', 'DIV-06 Partnerships', null),
  ('HQ',  'DIV-07',   null,  'Internal',     '1OzFEQDaMrRBupHrPQssQRAq9lLblnAfn', 'DIV-07 Courses & Learning', null),
  ('IEL', null,       null,  'Internal',     '1YVuYGpaYVSAGSRWmzoc1EuzKS-BJXzHN', '11 IELSco — Programs, Events & Products', 'Default for IELSco Internal'),
  ('IEL', 'DIV-03',   null,  'Internal',     '1eIV7zsJOpuRHn4TFs63_5ioRHQH-hTbf', '12 IELSco — Marketing & Community', null),
  ('IEL', 'DIV-01',   null,  'Internal',     '1eIV7zsJOpuRHn4TFs63_5ioRHQH-hTbf', '12 IELSco — Marketing & Community', null),
  ('IEL', 'DIV-06',   null,  'Confidential', '1eyLEKLyXLG4tN0D9S-NfaX_iHQR7IFye', '13 IELSco — Partnerships & Clients', null),
  ('IEL', null,       'FIN', 'Restricted',   '1IkBdQRFUMeuPAhpi2muRm-EcSXMRk2C6', '14 IELSco — Finance (Restricted)', null),
  ('IEL', null,       'GOV', 'Restricted',   '1jImUZM_y2KihI-x2lxLgZZ60OZB5di4O', '15 IELSco — Legal & Corporate (Restricted)', null),
  ('IEL', 'DIV-05',   null,  'Restricted',   '1OtXyFBqXk0W9oP2yPjDWtJJh-N3IBwcq', '16 IELSco — Personnel Records (Restricted)', null),
  ('ELC', null,       null,  'Internal',     '1KkjhGXBlUjSznAQJ62yX7QyNCmM9kddE', '21 Elco — Programs, Events & Products', 'Default for Elco Internal'),
  ('ELC', 'DIV-03',   null,  'Internal',     '1eJ-U-kYWhajJPjFKrLldXJA92f1SuabX', '22 Elco — Marketing & Community', null),
  ('ELC', 'DIV-06',   null,  'Confidential', '1bxnZ5TceScQwISALHx0RpFK5ttm_dps5', '23 Elco — Partnerships & Clients', null),
  ('ELC', null,       'FIN', 'Restricted',   '1Lkt6DqFQinRBMzh9OTsKD2ez0e18-yc7', '24 Elco — Finance (Restricted)', null),
  ('ELC', null,       'GOV', 'Restricted',   '1AlhEeKScaK2iruYZmUPS84l4_sam5KAX', '25 Elco — Legal & Corporate (Restricted)', null),
  ('ELC', 'DIV-05',   null,  'Restricted',   '1qFYkW7Y8lP3_vTlYrE5MQDHVPMl8p8sR', '26 Elco — Personnel Records (Restricted)', null)
) as v(company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, note)
where not exists (select 1 from public.os_folder_routes r
                  where r.drive_folder_id = v.drive_folder_id and r.company_code = v.company_code
                    and r.division_id is not distinct from v.division_id and r.doc_type is not distinct from v.doc_type
                    and r.sensitivity = v.sensitivity);

-- People are NOT seeded here: work Google accounts are still "NEEDS INPUT" in the Operations Master. After applying,
-- a founder row is created once, by hand, in the SQL editor (see IMPLEMENTATION-LOG.md, step "Bootstrap").
