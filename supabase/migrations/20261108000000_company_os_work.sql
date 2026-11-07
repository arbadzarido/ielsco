-- Company OS, phases 2 to 5: work (projects, tasks, comments, activity), documents, HQ records (announcements,
-- decisions, meetings), partnerships and campaigns, Elco product items, KPIs and KPI values, OKRs, the Master Timeline,
-- people profiles and performance reviews, and the AI assistant's conversations, actions and budget ledger.
--
-- Docs: docs/COMPANY-OS.md. Tests: tests/db/company-os.pglite.mjs.
-- Additive only: creates new os_* tables and functions. The one change to an existing object is widening the
-- os_grants.resource_type check so a founder can grant "people" access (the People Lead grant).
-- Re-runnable: "if not exists" / "create or replace" / "drop ... if exists" before create.
--
-- Vocabularies (status, priority, type lists) are the ones in Operations Master → Config_Lists, so records keep
-- meaning the same thing in the sheet and in Company OS.
--
-- Every table carries company_code, division_id and sensitivity and its read policy calls os_can_view(); writes call
-- os_can_edit() or the narrower rules below. The UI only arranges what these policies return.

-- ── IDs ────────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Record IDs keep the Operations Master formats (PRJ-0001, TSK-0001 ...). Counters start after the highest ID already in
-- the sheet (read 2026-11-07), so a later import of the sheet's own rows keeps their IDs without colliding.
create table if not exists public.os_id_counters (
  prefix  text primary key check (prefix ~ '^[A-Z]{2,4}$'),
  last    int  not null default 0
);
insert into public.os_id_counters (prefix, last) values
  ('PRJ', 27), ('TSK', 80), ('OD', 8), ('DOC', 94), ('OPP', 3), ('MTG', 1), ('MKT', 0), ('EP', 0),
  ('KPI', 68), ('LOG', 0), ('OBJ', 0), ('KR', 0), ('TL', 104), ('ANN', 0), ('RC', 0), ('REV', 0)
on conflict (prefix) do nothing;
alter table public.os_id_counters enable row level security;
revoke all on public.os_id_counters from anon, authenticated;

create or replace function public.os_next_id(p_prefix text, p_width int default 4) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  insert into public.os_id_counters as c (prefix, last) values (p_prefix, 1)
  on conflict (prefix) do update set last = c.last + 1
  returning last into n;
  return p_prefix || '-' || lpad(n::text, p_width, '0');
end $$;
revoke all on function public.os_next_id(text, int) from public, anon, authenticated;

-- ── Grants: the People Lead grant ──────────────────────────────────────────────────────────────────────────────────
-- resource_type 'people', resource_id = a company code (HQ means every company). Only founders can give it (the
-- os_grants_insert policy lets managers grant only on their own division).
do $$ begin
  alter table public.os_grants drop constraint if exists os_grants_resource_type_check;
  alter table public.os_grants add constraint os_grants_resource_type_check
    check (resource_type in ('division', 'document', 'project', 'people'));
end $$;

-- ── Shared helpers ─────────────────────────────────────────────────────────────────────────────────────────────────

-- True when the statement does not come from a signed-in user through the API (SQL editor, migrations, the service
-- role). Inside a security-definer function current_user is the owner, so the caller's role is read from the setting.
create or replace function public.os_caller_is_privileged() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('role', true), 'none'), session_user::text) not in ('authenticated', 'anon')
$$;
revoke all on function public.os_caller_is_privileged() from public, anon, authenticated;

-- Create rule for records that are not tied to a parent: founders anywhere; other staff in a company they work in, in a
-- division they belong to (or company-wide when no division), never Restricted.
create or replace function public.os_can_create(p_company text, p_division text, p_sensitivity text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when not public.os_is_staff() then false
    when p_sensitivity = 'Restricted' then false
    when not public.os_in_company(p_company) then false
    when p_division is null then true
    else public.os_in_division(p_division) or public.os_has_grant('division', p_division, 'edit')
  end
$$;

-- Founders, and managers of the division (in a company they work in), may publish, decide and approve. Records with
-- no division (company-wide) are founders' only.
create or replace function public.os_is_manager_for(p_company text, p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_founder()
      or (p_division is not null and public.os_in_company(p_company) and public.os_manages_division(p_division))
$$;

create or replace function public.os_set_created_by() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.os_current_person();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_set_created_by() from public, anon, authenticated;

-- ── Projects and tasks ─────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_projects (
  id               text primary key check (id ~ '^PRJ-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  name             text not null check (length(trim(name)) between 1 and 200),
  project_type     text check (project_type in ('Program', 'Event', 'Product', 'Campaign', 'Partnership', 'Internal', 'Hiring', 'Finance / Admin')),
  description      text,
  definition_of_done text,
  success_metric   text,
  owner_person_id  text references public.os_people (id) on delete set null,
  status           text not null default 'Proposed' check (status in ('Proposed', 'Approved', 'Active', 'On Hold', 'Completed', 'Cancelled')),
  priority         text not null default 'P3 Normal' check (priority in ('P1 Critical', 'P2 High', 'P3 Normal', 'P4 Low')),
  start_date       date,
  due_date         date,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  drive_folder_id  text,
  next_action      text,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (due_date is null or start_date is null or due_date >= start_date)
);
create index if not exists os_projects_company_idx on public.os_projects (company_code, division_id);

create table if not exists public.os_project_members (
  project_id  text not null references public.os_projects (id) on delete cascade,
  person_id   text not null references public.os_people (id) on delete cascade,
  role        text not null default 'member' check (role in ('lead', 'member', 'reviewer')),
  primary key (project_id, person_id)
);

create table if not exists public.os_tasks (
  id               text primary key check (id ~ '^TSK-[0-9]{4,}$'),
  project_id       text references public.os_projects (id) on delete set null,
  parent_task_id   text references public.os_tasks (id) on delete cascade,
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  title            text not null check (length(trim(title)) between 1 and 300),
  description      text,
  definition_of_done text,
  owner_person_id  text references public.os_people (id) on delete set null,
  reviewer_person_id text references public.os_people (id) on delete set null,
  status           text not null default 'Backlog' check (status in ('Backlog', 'Ready', 'In Progress', 'In Review', 'Blocked', 'Done', 'Cancelled')),
  priority         text not null default 'P3 Normal' check (priority in ('P1 Critical', 'P2 High', 'P3 Normal', 'P4 Low')),
  due_date         date,
  no_deadline_reason text,
  blocker          text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort_order       double precision not null default 0,
  completed_at     timestamptz,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (parent_task_id is null or parent_task_id <> id)
);
create index if not exists os_tasks_project_idx on public.os_tasks (project_id);
create index if not exists os_tasks_owner_idx on public.os_tasks (owner_person_id) where status not in ('Done', 'Cancelled');
create index if not exists os_tasks_due_idx on public.os_tasks (due_date) where status not in ('Done', 'Cancelled');
create index if not exists os_tasks_parent_idx on public.os_tasks (parent_task_id);

create table if not exists public.os_task_assignees (
  task_id    text not null references public.os_tasks (id) on delete cascade,
  person_id  text not null references public.os_people (id) on delete cascade,
  primary key (task_id, person_id)
);
create index if not exists os_task_assignees_person_idx on public.os_task_assignees (person_id);

create or replace function public.os_is_project_member(p_project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_project_members m where m.project_id = p_project and m.person_id = public.os_current_person())
      or exists (select 1 from public.os_projects p where p.id = p_project and p.owner_person_id = public.os_current_person())
$$;

-- Row checks take the row's columns (policies pass them), so they also work for the row being inserted. The *_id
-- variants look the row up and are used for references from other tables (comments, links, child rows).
create or replace function public.os_project_row_visible(p_id text, p_company text, p_division text, p_sensitivity text, p_owner text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_can_view(p_company, p_division, p_sensitivity, 'project', p_id)
      or (public.os_is_staff() and (p_owner = public.os_current_person() or public.os_is_project_member(p_id)))
$$;

create or replace function public.os_task_row_visible(p_id text, p_project text, p_company text, p_division text, p_sensitivity text,
                                                      p_owner text, p_reviewer text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_can_view(p_company, p_division, p_sensitivity, 'project', coalesce(p_project, ''))
      or (public.os_current_person() is not null
          and (p_owner = public.os_current_person() or p_reviewer = public.os_current_person()
               or exists (select 1 from public.os_task_assignees a where a.task_id = p_id and a.person_id = public.os_current_person())))
      or (p_project is not null and p_sensitivity <> 'Restricted' and public.os_is_staff() and public.os_is_project_member(p_project))
$$;

create or replace function public.os_can_view_project(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_projects p where p.id = p_id
                 and public.os_project_row_visible(p.id, p.company_code, p.division_id, p.sensitivity, p.owner_person_id))
$$;

create or replace function public.os_can_edit_project(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_projects p where p.id = p_id
                 and (public.os_can_edit(p.company_code, p.division_id, p.sensitivity, 'project', p.id)
                      or (public.os_is_staff() and public.os_is_project_member(p.id))))
$$;

create or replace function public.os_is_task_person(p_task text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_tasks t where t.id = p_task
                 and (t.owner_person_id = public.os_current_person() or t.reviewer_person_id = public.os_current_person()))
      or exists (select 1 from public.os_task_assignees a where a.task_id = p_task and a.person_id = public.os_current_person())
$$;

create or replace function public.os_can_view_task(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_tasks t where t.id = p_id
                 and public.os_task_row_visible(t.id, t.project_id, t.company_code, t.division_id, t.sensitivity, t.owner_person_id, t.reviewer_person_id))
$$;

create or replace function public.os_can_edit_task(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_tasks t where t.id = p_id
                 and (public.os_can_edit(t.company_code, t.division_id, t.sensitivity, 'project', coalesce(t.project_id, ''))
                      or (public.os_is_staff() and public.os_is_task_person(t.id))
                      or (t.project_id is not null and t.sensitivity <> 'Restricted' and public.os_can_edit_project(t.project_id))))
$$;

-- Tasks inherit their project's company, and its division and sensitivity unless set; a subtask inherits its parent's.
-- completed_at follows the status.
create or replace function public.os_tasks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('TSK'); end if;
  if new.parent_task_id is not null and (tg_op = 'INSERT' or new.parent_task_id is distinct from old.parent_task_id) then
    select company_code, division_id, sensitivity, project_id into p from public.os_tasks where id = new.parent_task_id;
    if p is null then raise exception 'Unknown parent task' using errcode = '23503'; end if;
    if exists (select 1 from public.os_tasks where id = new.parent_task_id and parent_task_id is not null) then
      raise exception 'Subtasks go one level deep' using errcode = '23514';
    end if;
    new.project_id := p.project_id;
    new.company_code := p.company_code;
    new.division_id := coalesce(new.division_id, p.division_id);
    new.sensitivity := case when p.sensitivity = 'Restricted' or new.sensitivity = 'Restricted' then 'Restricted'
                            when p.sensitivity = 'Confidential' or new.sensitivity = 'Confidential' then 'Confidential'
                            else 'Internal' end;
  elsif new.project_id is not null and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id) then
    select company_code, division_id, sensitivity into p from public.os_projects where id = new.project_id;
    if p is null then raise exception 'Unknown project' using errcode = '23503'; end if;
    new.company_code := p.company_code;
    new.division_id := coalesce(new.division_id, p.division_id);
    if tg_op = 'INSERT' and new.sensitivity = 'Internal' then new.sensitivity := p.sensitivity; end if;
  end if;
  if new.status = 'Done' and (tg_op = 'INSERT' or old.status <> 'Done') then new.completed_at := now();
  elsif new.status <> 'Done' then new.completed_at := null;
  end if;
  return new;
end $$;
revoke all on function public.os_tasks_before_write() from public, anon, authenticated;

create or replace function public.os_projects_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('PRJ'); end if;
  return new;
end $$;
revoke all on function public.os_projects_before_write() from public, anon, authenticated;

drop trigger if exists os_projects_a_id on public.os_projects;
create trigger os_projects_a_id before insert on public.os_projects for each row execute function public.os_projects_before_write();
drop trigger if exists os_projects_b_stamp on public.os_projects;
create trigger os_projects_b_stamp before insert or update on public.os_projects for each row execute function public.os_set_created_by();
drop trigger if exists os_tasks_a_rules on public.os_tasks;
create trigger os_tasks_a_rules before insert or update on public.os_tasks for each row execute function public.os_tasks_before_write();
drop trigger if exists os_tasks_b_stamp on public.os_tasks;
create trigger os_tasks_b_stamp before insert or update on public.os_tasks for each row execute function public.os_set_created_by();

-- ── Documents ──────────────────────────────────────────────────────────────────────────────────────────────────────
-- The register of documents Company OS knows about. Files stay in Google Drive, in the existing folders; Drive sharing
-- is NOT derived from these rows and is never changed by the app. drive_* and drift_* columns are written only by the
-- server (service role) after it reads Drive.
create table if not exists public.os_documents (
  id               text primary key check (id ~ '^DOC-[0-9]{4,}$'),
  reference_number text unique,
  title            text not null check (length(trim(title)) between 1 and 300),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  doc_type         text not null check (doc_type in ('GOV', 'POL', 'SOP', 'TPL', 'PLN', 'RPT', 'MIN', 'PRP', 'CTR', 'FIN', 'REF', 'LET', 'MOM')),
  category         text,
  status           text not null default 'Draft' check (status in ('Draft', 'In Review', 'Approved', 'Superseded', 'Archived')),
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  owner_person_id  text references public.os_people (id) on delete set null,
  approver_person_id text references public.os_people (id) on delete set null,
  approved_at      timestamptz,
  version          text,
  next_review_date date,
  notes            text,
  drive_file_id    text unique,
  drive_url        text check (drive_url is null or drive_url ~ '^https://(docs|drive)\.google\.com/'),
  drive_mime_type  text,
  drive_folder_id  text,
  folder_route_id  uuid references public.os_folder_routes (id) on delete set null,
  template_file_id text,
  drive_modified_at timestamptz,
  drive_checked_at timestamptz,
  drift_findings   jsonb not null default '[]'::jsonb,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists os_documents_company_idx on public.os_documents (company_code, division_id, doc_type);

-- Links a document to the work it belongs to.
create table if not exists public.os_document_links (
  document_id  text not null references public.os_documents (id) on delete cascade,
  entity_type  text not null check (entity_type in ('project', 'task', 'meeting', 'partnership', 'decision', 'campaign', 'objective', 'kpi')),
  entity_id    text not null,
  created_by   text,
  created_at   timestamptz not null default now(),
  primary key (document_id, entity_type, entity_id)
);
create index if not exists os_document_links_entity_idx on public.os_document_links (entity_type, entity_id);

create or replace function public.os_document_links_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := public.os_current_person();
  new.created_at := now();
  return new;
end $$;
revoke all on function public.os_document_links_before_write() from public, anon, authenticated;
drop trigger if exists os_document_links_before_write on public.os_document_links;
create trigger os_document_links_before_write before insert on public.os_document_links for each row execute function public.os_document_links_before_write();

create or replace function public.os_can_view_document(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_documents d where d.id = p_id
                 and (public.os_can_view(d.company_code, d.division_id, d.sensitivity, 'document', d.id)
                      or (public.os_is_staff() and d.owner_person_id = public.os_current_person())))
$$;

create or replace function public.os_documents_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.id is null then new.id := public.os_next_id('DOC'); end if;
  if new.status = 'Approved' and (tg_op = 'INSERT' or old.status <> 'Approved') then
    -- Approval is recorded against the caller and needs a manager of the division or a founder.
    if not public.os_is_manager_for(new.company_code, new.division_id) and not public.os_caller_is_privileged() then
      raise exception 'Only a founder or the division manager can approve a document' using errcode = '42501';
    end if;
    new.approver_person_id := coalesce(public.os_current_person(), new.approver_person_id);
    new.approved_at := now();
  elsif tg_op = 'UPDATE' and new.status = old.status then
    new.approver_person_id := old.approver_person_id;
    new.approved_at := old.approved_at;
  end if;
  return new;
end $$;
revoke all on function public.os_documents_before_write() from public, anon, authenticated;
drop trigger if exists os_documents_a_rules on public.os_documents;
create trigger os_documents_a_rules before insert or update on public.os_documents for each row execute function public.os_documents_before_write();
drop trigger if exists os_documents_b_stamp on public.os_documents;
create trigger os_documents_b_stamp before insert or update on public.os_documents for each row execute function public.os_set_created_by();

-- ── HQ records: announcements, decisions, meetings ─────────────────────────────────────────────────────────────────

create table if not exists public.os_announcements (
  id               text primary key check (id ~ '^ANN-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  title            text not null check (length(trim(title)) between 1 and 200),
  body             text not null check (length(body) <= 10000),
  pinned           boolean not null default false,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  expires_at       timestamptz,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.os_decisions (
  id               text primary key check (id ~ '^OD-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  project_id       text references public.os_projects (id) on delete set null,
  decision         text not null check (length(trim(decision)) between 1 and 2000),
  rationale        text,
  changes          text,
  decided_by       text references public.os_people (id) on delete set null,
  decided_on       date,
  status           text not null default 'Proposed' check (status in ('Proposed', 'Approved', 'Rejected', 'Superseded')),
  source_link      text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.os_meetings (
  id               text primary key check (id ~ '^MTG-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  meeting_type     text not null default 'Other' check (meeting_type in ('Weekly Review', 'Division Stand-up', 'Founders Review', 'Quarterly Planning', 'Partner Meeting', 'Other')),
  title            text not null,
  held_on          date not null,
  facilitator_person_id text references public.os_people (id) on delete set null,
  attendees        text[] not null default '{}',
  notes            text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Partnerships, campaigns, Elco product ──────────────────────────────────────────────────────────────────────────

create table if not exists public.os_partnerships (
  id               text primary key check (id ~ '^OPP-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id) default 'DIV-06',
  opportunity_type text,
  organisation     text not null check (length(trim(organisation)) between 1 and 300),
  contact          text,                       -- business contact and role only, never personal data
  source           text,
  stage            text not null default '1 Identified',
  evidence_status  text check (evidence_status is null or evidence_status in ('1 Researched (no contact yet)', '2 Contacted', '3 Interested', '4 Verbally discussed', '5 Formally confirmed in writing')),
  owner_person_id  text references public.os_people (id) on delete set null,
  estimated_value  numeric check (estimated_value is null or estimated_value >= 0),
  value_basis      text,
  probability      int check (probability is null or probability between 0 and 100),
  next_action      text,
  follow_up_date   date,
  related_project_id text references public.os_projects (id) on delete set null,
  outcome          text,
  closed_on        date,
  notes            text,
  sensitivity      text not null default 'Confidential' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.os_campaign_items (
  id               text primary key check (id ~ '^MKT-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id) default 'DIV-03',
  campaign         text,
  title            text not null,
  audience         text,
  objective        text,
  channel          text,
  format           text,
  planned_publish_date date,
  production_deadline date,
  owner_person_id  text references public.os_people (id) on delete set null,
  status           text not null default 'Planned' check (status in ('Idea', 'Planned', 'In production', 'Ready to publish', 'Published', 'Cancelled')),
  actual_publish_date date,
  call_to_action   text,
  published_link   text,
  kpi_id           text,
  related_project_id text references public.os_projects (id) on delete set null,
  results          text,                       -- measured figures only, with the date read
  review           text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.os_product_items (
  id               text primary key check (id ~ '^EP-[0-9]{4,}$'),
  company_code     text not null default 'ELC' references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  item_type        text not null check (item_type in ('Release', 'Feature', 'Defect', 'Pilot cohort')),
  title            text not null,
  status           text not null default 'Planned' check (status in ('Planned', 'In progress', 'In QA', 'Released', 'Fixed', 'Open', 'Held', 'Cancelled')),
  version          text,
  severity         text check (severity is null or severity in ('Low', 'Medium', 'High', 'Critical')),
  owner_person_id  text references public.os_people (id) on delete set null,
  planned_date     date,
  actual_date      date,
  opened_on        date,
  qa_signed_off    boolean,
  link             text,
  related_item_id  text,
  notes            text,                       -- no pilot user names or contact details
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── KPIs, KPI values, OKRs, Master Timeline ────────────────────────────────────────────────────────────────────────

-- The KPI Dictionary. Targets are stored only as the sheet gives them, with their target status; nothing is filled in.
create table if not exists public.os_kpis (
  id               text primary key check (id ~ '^KPI-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  level            text check (level in ('Company', 'Function', 'Role')),
  function         text,
  name             text not null,
  business_purpose text,
  definition       text,
  formula          text,
  indicator_type   text check (indicator_type in ('Leading', 'Lagging')),
  unit             text,
  reporting_period text,
  data_source      text,
  collection_method text,
  owner_text       text,                       -- the sheet's wording, e.g. "PPL-0001 Arba (provisional ...)"
  owner_person_id  text,                       -- first PPL ID in owner_text; not a foreign key (owners may not have OS accounts yet)
  baseline         text,
  target_value     numeric,
  target_status    text,
  reference_target text,                       -- old Master Plan figure, NOT approved
  green_threshold  text,
  amber_threshold  text,
  red_threshold    text,
  action_when_missed text,
  measurable_today text,
  sheet_latest_value text,                     -- the sheet's live-calculated value on the read date (not a logged value)
  sheet_latest_period_end date,
  data_status      text,
  notes            text,
  review_forum     text,
  track_now        text,
  start_condition  text,
  values_restricted boolean not null default false,  -- values live in a Restricted Finance Control; never stored here
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  source           jsonb,                      -- the source row as read, for audit
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- The KPI Log. Blank means not measured: there is no row, never a 0.
create table if not exists public.os_kpi_values (
  id               text primary key check (id ~ '^LOG-[0-9]{4,}$'),
  kpi_id           text not null references public.os_kpis (id) on delete restrict,
  period_label     text not null check (length(trim(period_label)) between 1 and 40),
  period_end       date not null,
  value            numeric not null,
  value_basis      text,
  recorded_by      text,
  recorded_at      timestamptz not null default now(),
  evidence_link    text,
  unique (kpi_id, period_label)
);
create index if not exists os_kpi_values_kpi_idx on public.os_kpi_values (kpi_id, period_end);

create table if not exists public.os_objectives (
  id               text primary key check (id ~ '^OBJ-[0-9]{4,}$'),
  company_code     text not null references public.os_companies (code),
  division_id      text references public.os_divisions (id),
  parent_objective_id text references public.os_objectives (id) on delete set null,
  title            text not null check (length(trim(title)) between 1 and 300),
  description      text,
  period           text not null check (period ~ '^[0-9]{4}(-(Q[1-4]|H[12]))?$'),
  owner_person_id  text references public.os_people (id) on delete set null,
  status           text not null default 'Draft' check (status in ('Draft', 'Active', 'Achieved', 'Partly achieved', 'Missed', 'Dropped')),
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.os_key_results (
  id               text primary key check (id ~ '^KR-[0-9]{4,}$'),
  objective_id     text not null references public.os_objectives (id) on delete cascade,
  title            text not null,
  kpi_id           text references public.os_kpis (id) on delete set null,
  owner_person_id  text references public.os_people (id) on delete set null,
  unit             text,
  start_value      numeric,
  target_value     numeric,                    -- null until someone sets it; never defaulted
  target_status    text not null default 'No approved target' check (target_status in ('No approved target', 'Proposed — awaiting approval', 'Approved')),
  current_value    numeric,
  status           text not null default 'Not started' check (status in ('Not started', 'On track', 'At risk', 'Off track', 'Done', 'Dropped')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- The Master Timeline. Owner IDs keep the sheet's Person IDs as text: several owners have no OS account yet.
create table if not exists public.os_timeline_items (
  id               text primary key check (id ~ '^TL-[0-9]{3,}$'),
  company_code     text not null default 'HQ' references public.os_companies (code),
  workstream_code  text not null check (workstream_code ~ '^WS[0-9]+$'),
  workstream_name  text not null,
  title            text not null,
  deliverable      text,
  owner_person_id  text,
  owner_name       text,
  lead_division    text,
  lead_division_id text references public.os_divisions (id),
  supporting_divisions text,
  dependencies     text,
  planned_start    date,
  due_date         date,
  status           text not null default 'Not started' check (status in ('Not started', 'In progress', 'Done', 'Blocked', 'Deferred', 'Cancelled')),
  decision_gate    text,
  budget_dependency text,
  evidence         text,
  risk             text,
  related_event    text,
  linked_refs      text,
  is_major         boolean not null default false,
  planning_label   text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  source           jsonb,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (due_date is null or planned_start is null or due_date >= planned_start)
);
create index if not exists os_timeline_due_idx on public.os_timeline_items (due_date);

-- ── People: profiles, employment, reviews ──────────────────────────────────────────────────────────────────────────

-- Visible to all staff: what someone does and who they report to.
create table if not exists public.os_person_profiles (
  person_id        text primary key references public.os_people (id) on delete cascade,
  title            text,
  responsibilities text,
  manager_person_id text references public.os_people (id) on delete set null,
  location         text,
  updated_at       timestamptz not null default now(),
  check (manager_person_id is null or manager_person_id <> person_id)
);

-- Employment details: the person, their managers, founders and People Leads only.
create table if not exists public.os_person_employment (
  person_id        text primary key references public.os_people (id) on delete cascade,
  membership_type  text check (membership_type in ('Founder', 'Manager', 'Employee', 'Contractor', 'Volunteer', 'Intern', 'Partner', 'AI Assistant')),
  employing_company text references public.os_companies (code),
  start_date       date,
  end_date         date,
  notes            text,
  updated_at       timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- Who may see a person's private records (employment, reviews): themselves, founders, a manager of a division they
-- are in, and holders of an active People Lead grant for a company they work in.
create or replace function public.os_is_people_lead_for(p_person text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and exists (
    select 1 from public.os_grants g
    where g.person_id = public.os_current_person() and g.resource_type = 'people'
      and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
      and (g.resource_id = 'HQ' or exists (select 1 from public.os_person_companies c
                                          where c.person_id = p_person and c.company_code = g.resource_id)))
$$;

create or replace function public.os_manages_person(p_person text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_person <> coalesce(public.os_current_person(), '')
     and (exists (select 1 from public.os_person_divisions d
                  where d.person_id = p_person and public.os_manages_division(d.division_id))
          or exists (select 1 from public.os_person_profiles pr
                     where pr.person_id = p_person and pr.manager_person_id = public.os_current_person()
                       and public.os_is_staff()))
$$;

-- Reporting lines decide who may read private records and write reviews, so only founders set them.
create or replace function public.os_person_profiles_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and new.manager_person_id is not null) or (tg_op = 'UPDATE' and new.manager_person_id is distinct from old.manager_person_id) then
    if not public.os_is_founder() and not public.os_caller_is_privileged() then
      raise exception 'Only a founder can change who someone reports to' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_person_profiles_before_write() from public, anon, authenticated;
drop trigger if exists os_person_profiles_a_rules on public.os_person_profiles;
create trigger os_person_profiles_a_rules before insert or update on public.os_person_profiles for each row execute function public.os_person_profiles_before_write();

create or replace function public.os_can_view_person_private(p_person text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_current_person() is not null and (
    p_person = public.os_current_person()
    or public.os_is_founder()
    or public.os_manages_person(p_person)
    or public.os_is_people_lead_for(p_person))
$$;

create table if not exists public.os_review_cycles (
  id               text primary key check (id ~ '^RC-[0-9]{4,}$'),
  name             text not null check (length(trim(name)) between 1 and 120),
  company_code     text not null references public.os_companies (code),
  period_start     date not null,
  period_end       date not null,
  self_due         date,
  manager_due      date,
  status           text not null default 'Draft' check (status in ('Draft', 'Open', 'Closed')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (period_end >= period_start)
);

-- One review per person per cycle. No scores or ranks: written assessments only. Task counts are never inputs.
create table if not exists public.os_reviews (
  id               text primary key check (id ~ '^REV-[0-9]{4,}$'),
  cycle_id         text not null references public.os_review_cycles (id) on delete cascade,
  person_id        text not null references public.os_people (id) on delete cascade,
  reviewer_person_id text references public.os_people (id) on delete set null,
  status           text not null default 'Not started' check (status in ('Not started', 'Self-assessment', 'Manager review', 'Completed', 'Acknowledged')),
  self_assessment  text,
  self_submitted_at timestamptz,
  manager_assessment text,
  kpi_achievement  text,
  objective_achievement text,
  feedback         text,
  strengths        text,
  development_areas text,
  development_plan text,
  manager_submitted_at timestamptz,
  acknowledged_at  timestamptz,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (cycle_id, person_id)
);

-- Who writes what: the person writes the self-assessment (and acknowledges); the reviewer, a manager of the person,
-- a founder or a People Lead with an edit grant writes the manager side. Enforced here, not in the UI.
create or replace function public.os_reviews_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me text := public.os_current_person();
  is_self boolean;
  is_manager boolean;
  privileged boolean := public.os_caller_is_privileged();
begin
  if tg_op = 'INSERT' then
    if new.id is null then new.id := public.os_next_id('REV'); end if;
    new.self_assessment := null; new.self_submitted_at := null; new.manager_submitted_at := null; new.acknowledged_at := null;
    new.status := 'Not started';
    return new;
  end if;
  if privileged then return new; end if;
  is_self := old.person_id = me;
  is_manager := not is_self and (old.reviewer_person_id = me or public.os_is_founder() or public.os_manages_person(old.person_id)
                 or exists (select 1 from public.os_grants g where g.person_id = me and g.resource_type = 'people' and g.level = 'edit'
                            and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
                            and (g.resource_id = 'HQ' or exists (select 1 from public.os_person_companies c where c.person_id = old.person_id and c.company_code = g.resource_id))));
  if (new.cycle_id, new.person_id) is distinct from (old.cycle_id, old.person_id) then
    raise exception 'A review cannot move to another person or cycle' using errcode = '42501';
  end if;
  if not is_self and (new.self_assessment is distinct from old.self_assessment) then
    raise exception 'Only the person writes their self-assessment' using errcode = '42501';
  end if;
  if not is_manager and (new.manager_assessment, new.kpi_achievement, new.objective_achievement, new.feedback, new.strengths,
                         new.development_areas, new.development_plan, new.reviewer_person_id)
       is distinct from (old.manager_assessment, old.kpi_achievement, old.objective_achievement, old.feedback, old.strengths,
                         old.development_areas, old.development_plan, old.reviewer_person_id) then
    raise exception 'Only the reviewer writes the manager assessment' using errcode = '42501';
  end if;
  if old.status in ('Completed', 'Acknowledged') and new.status not in ('Completed', 'Acknowledged') and not public.os_is_founder() then
    raise exception 'A completed review can only be reopened by a founder' using errcode = '42501';
  end if;
  if old.status in ('Completed', 'Acknowledged') and new.status = old.status
     and (new.manager_assessment, new.self_assessment) is distinct from (old.manager_assessment, old.self_assessment) then
    raise exception 'A completed review is read-only' using errcode = '42501';
  end if;
  -- Status moves and their timestamps.
  if new.status <> old.status then
    if new.status = 'Self-assessment' and not (is_self or is_manager) then raise exception 'Not allowed' using errcode = '42501'; end if;
    if new.status = 'Manager review' then
      if not is_self and not is_manager then raise exception 'Not allowed' using errcode = '42501'; end if;
      if is_self then new.self_submitted_at := now(); end if;
    end if;
    if new.status = 'Completed' then
      if not is_manager then raise exception 'Only the reviewer completes a review' using errcode = '42501'; end if;
      new.manager_submitted_at := now();
    end if;
    if new.status = 'Acknowledged' then
      if not is_self or old.status <> 'Completed' then raise exception 'Only the person acknowledges a completed review' using errcode = '42501'; end if;
      new.acknowledged_at := now();
    end if;
  else
    new.self_submitted_at := old.self_submitted_at;
    new.manager_submitted_at := old.manager_submitted_at;
    new.acknowledged_at := old.acknowledged_at;
  end if;
  return new;
end $$;
revoke all on function public.os_reviews_before_write() from public, anon, authenticated;
drop trigger if exists os_reviews_a_rules on public.os_reviews;
create trigger os_reviews_a_rules before insert or update on public.os_reviews for each row execute function public.os_reviews_before_write();
drop trigger if exists os_reviews_b_stamp on public.os_reviews;
create trigger os_reviews_b_stamp before insert or update on public.os_reviews for each row execute function public.os_set_created_by();

-- ── Comments and activity (shared by every record type) ────────────────────────────────────────────────────────────

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
    else false
  end
$$;

create table if not exists public.os_comments (
  id               bigint generated always as identity primary key,
  entity_type      text not null check (entity_type in ('project', 'task', 'document', 'partnership', 'decision', 'meeting', 'campaign', 'objective', 'kpi', 'product', 'timeline')),
  entity_id        text not null,
  author_person_id text,
  body             text not null check (length(trim(body)) between 1 and 5000),
  created_at       timestamptz not null default now(),
  edited_at        timestamptz,
  deleted_at       timestamptz
);
create index if not exists os_comments_entity_idx on public.os_comments (entity_type, entity_id, created_at);

create or replace function public.os_comments_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_person_id := public.os_current_person();
    new.created_at := now(); new.edited_at := null; new.deleted_at := null;
  else
    if (new.entity_type, new.entity_id, new.author_person_id, new.created_at) is distinct from
       (old.entity_type, old.entity_id, old.author_person_id, old.created_at) then
      raise exception 'Only the text of a comment can change' using errcode = '42501';
    end if;
    if old.deleted_at is not null then raise exception 'Comment was deleted' using errcode = '42501'; end if;
    if new.deleted_at is not null then new.deleted_at := now(); new.body := old.body;
    elsif new.body is distinct from old.body then new.edited_at := now(); end if;
  end if;
  return new;
end $$;
revoke all on function public.os_comments_before_write() from public, anon, authenticated;
drop trigger if exists os_comments_before_write on public.os_comments;
create trigger os_comments_before_write before insert or update on public.os_comments for each row execute function public.os_comments_before_write();

-- Activity: written only by triggers. Readable by whoever can read the record.
create table if not exists public.os_activity (
  id               bigint generated always as identity primary key,
  at               timestamptz not null default now(),
  entity_type      text not null,
  entity_id        text not null,
  company_code     text,
  actor_person_id  text,
  action           text not null,
  summary          text,
  changes          jsonb not null default '{}'::jsonb
);
create index if not exists os_activity_entity_idx on public.os_activity (entity_type, entity_id, at desc);
create index if not exists os_activity_at_idx on public.os_activity (at desc);

create or replace function public.os_activity_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  entity text := tg_argv[0];
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  before jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  diff jsonb := '{}'::jsonb;
  k text;
  label text := coalesce(rec ->> 'name', rec ->> 'title', rec ->> 'organisation', rec ->> 'decision', rec ->> 'body');
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(rec) loop
      if k not in ('updated_at', 'created_at', 'source', 'sort_order', 'drive_checked_at', 'drift_findings', 'drive_modified_at')
         and (rec -> k) is distinct from (before -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', before -> k, 'to', rec -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return null; end if;
  end if;
  insert into public.os_activity (entity_type, entity_id, company_code, actor_person_id, action, summary, changes)
  values (entity, coalesce(rec ->> 'id', rec ->> 'task_id', rec ->> 'project_id', rec ->> 'document_id', rec ->> 'entity_id'),
          rec ->> 'company_code', public.os_current_person(), lower(tg_op), left(label, 200), diff);
  return null;
end $$;
revoke all on function public.os_activity_row() from public, anon, authenticated;

-- ── AI assistant ───────────────────────────────────────────────────────────────────────────────────────────────────

-- One row. The budget is a hard cap: os_ai_reserve() refuses any call whose worst-case cost would pass it.
create table if not exists public.os_ai_settings (
  id                   boolean primary key default true check (id),
  monthly_budget_usd   numeric not null default 25 check (monthly_budget_usd >= 0 and monthly_budget_usd <= 25),
  enabled              boolean not null default true,
  routine_model        text not null default 'gemini-3.1-flash-lite',
  complex_model        text not null default 'gemini-3-flash-preview',
  per_person_daily_usd numeric not null default 2 check (per_person_daily_usd >= 0),
  updated_by           text,
  updated_at           timestamptz not null default now()
);
insert into public.os_ai_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.os_ai_conversations (
  id               uuid primary key default gen_random_uuid(),
  person_id        text not null references public.os_people (id) on delete cascade,
  agent            text not null check (agent in ('assistant', 'operations', 'partnerships', 'growth')),
  company_code     text references public.os_companies (code),
  title            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists os_ai_conversations_person_idx on public.os_ai_conversations (person_id, updated_at desc);

create table if not exists public.os_ai_messages (
  id               bigint generated always as identity primary key,
  conversation_id  uuid not null references public.os_ai_conversations (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'tool')),
  content          text not null,
  tool_name        text,
  model            text,
  created_at       timestamptz not null default now()
);
create index if not exists os_ai_messages_conv_idx on public.os_ai_messages (conversation_id, id);

-- The cost ledger. A row is reserved at the worst-case cost before the model is called and settled to the real cost
-- afterwards, so concurrent calls can never spend past the cap.
create table if not exists public.os_ai_usage (
  id               uuid primary key default gen_random_uuid(),
  at               timestamptz not null default now(),
  person_id        text references public.os_people (id) on delete set null,
  agent            text not null,
  model            text not null,
  conversation_id  uuid references public.os_ai_conversations (id) on delete set null,
  status           text not null default 'reserved' check (status in ('reserved', 'settled', 'failed')),
  input_tokens     int not null default 0,
  output_tokens    int not null default 0,
  cost_usd         numeric(12, 6) not null default 0 check (cost_usd >= 0)
);
create index if not exists os_ai_usage_at_idx on public.os_ai_usage (at);

-- Changes an agent proposes. Nothing runs until the person confirms; execution goes through the person's own
-- database session, so RLS applies exactly as if they had made the change themselves.
create table if not exists public.os_ai_actions (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references public.os_ai_conversations (id) on delete set null,
  person_id        text not null references public.os_people (id) on delete cascade,
  agent            text not null,
  action_type      text not null check (action_type in ('create_task', 'update_task_status', 'create_project', 'add_comment', 'log_kpi_value', 'create_partnership', 'draft_document')),
  payload          jsonb not null,
  preview          text not null,
  status           text not null default 'proposed' check (status in ('proposed', 'confirmed', 'executed', 'rejected', 'failed', 'expired')),
  result           jsonb,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz
);
create index if not exists os_ai_actions_person_idx on public.os_ai_actions (person_id, created_at desc);

create or replace function public.os_ai_month_spend() returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(cost_usd), 0) from public.os_ai_usage
  where status in ('reserved', 'settled') and at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
$$;

-- Server only (service role). Returns the reservation id, or null when the call would pass the monthly cap or the
-- person's daily limit. The settings row lock serialises reservations.
create or replace function public.os_ai_reserve(p_person text, p_agent text, p_model text, p_max_cost numeric,
                                                p_conversation uuid default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare s record; spent numeric; today numeric; rid uuid;
begin
  select * into s from public.os_ai_settings where id for update;
  if not s.enabled then return null; end if;
  -- Reservations older than 15 minutes that were never settled count at their reserved cost (pessimistic).
  spent := public.os_ai_month_spend();
  if spent + p_max_cost > s.monthly_budget_usd then return null; end if;
  select coalesce(sum(cost_usd), 0) into today from public.os_ai_usage
  where person_id = p_person and status in ('reserved', 'settled') and at >= now() - interval '1 day';
  if today + p_max_cost > s.per_person_daily_usd then return null; end if;
  insert into public.os_ai_usage (person_id, agent, model, conversation_id, cost_usd)
  values (p_person, p_agent, p_model, p_conversation, p_max_cost) returning id into rid;
  return rid;
end $$;

create or replace function public.os_ai_settle(p_id uuid, p_input int, p_output int, p_cost numeric, p_failed boolean default false) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.os_ai_usage
  set status = case when p_failed then 'failed' else 'settled' end,
      input_tokens = greatest(p_input, 0), output_tokens = greatest(p_output, 0),
      -- Never settle above the reservation: the cap was checked against it.
      cost_usd = case when p_failed then 0 else least(greatest(p_cost, 0), cost_usd) end
  where id = p_id and status = 'reserved';
end $$;

revoke all on function public.os_ai_reserve(text, text, text, numeric, uuid) from public, anon, authenticated;
revoke all on function public.os_ai_settle(uuid, int, int, numeric, boolean) from public, anon, authenticated;
grant execute on function public.os_ai_reserve(text, text, text, numeric, uuid) to service_role;
grant execute on function public.os_ai_settle(uuid, int, int, numeric, boolean) to service_role;

-- Budget summary for the Admin screen and the assistant's "budget used" line.
create or replace function public.os_ai_budget() returns table (budget_usd numeric, spent_usd numeric, enabled boolean)
language sql stable security definer set search_path = '' as $$
  select s.monthly_budget_usd, public.os_ai_month_spend(), s.enabled from public.os_ai_settings s
  where public.os_current_person() is not null
$$;

-- ── Function grants ────────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare f text;
begin
  foreach f in array array[
    'os_can_create(text, text, text)', 'os_project_row_visible(text, text, text, text, text)',
    'os_task_row_visible(text, text, text, text, text, text, text)', 'os_is_manager_for(text, text)', 'os_is_project_member(text)',
    'os_can_view_project(text)', 'os_can_edit_project(text)', 'os_is_task_person(text)', 'os_can_view_task(text)',
    'os_can_edit_task(text)', 'os_can_view_document(text)', 'os_is_people_lead_for(text)', 'os_manages_person(text)',
    'os_can_view_person_private(text)', 'os_can_view_entity(text, text)', 'os_ai_month_spend()', 'os_ai_budget()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;

-- ── Generic ID triggers for the simpler tables ─────────────────────────────────────────────────────────────────────

create or replace function public.os_assign_id() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.id is null then new.id := public.os_next_id(tg_argv[0]); end if;
  return new;
end $$;
revoke all on function public.os_assign_id() from public, anon, authenticated;

do $$
declare r record;
begin
  for r in select * from (values
    ('os_announcements', 'ANN'), ('os_decisions', 'OD'), ('os_meetings', 'MTG'), ('os_partnerships', 'OPP'),
    ('os_campaign_items', 'MKT'), ('os_product_items', 'EP'), ('os_kpis', 'KPI'), ('os_kpi_values', 'LOG'),
    ('os_objectives', 'OBJ'), ('os_key_results', 'KR'), ('os_timeline_items', 'TL'), ('os_review_cycles', 'RC')
  ) as v(tbl, prefix)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_a_id', r.tbl);
    execute format('create trigger %I before insert on public.%I for each row execute function public.os_assign_id(%L)', r.tbl || '_a_id', r.tbl, r.prefix);
  end loop;
  -- created_by / created_at / updated_at stamped from the caller
  for r in select * from (values ('os_announcements'), ('os_decisions'), ('os_meetings'), ('os_partnerships'),
    ('os_campaign_items'), ('os_product_items'), ('os_kpis'), ('os_objectives'), ('os_key_results'),
    ('os_timeline_items'), ('os_review_cycles')) as v(tbl)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_b_stamp', r.tbl);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.os_set_created_by()', r.tbl || '_b_stamp', r.tbl);
  end loop;
end $$;

-- KPI values: who recorded it and when come from the caller.
create or replace function public.os_kpi_values_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.recorded_by := coalesce(public.os_current_person(), new.recorded_by);
    if not public.os_caller_is_privileged() then new.recorded_at := now(); end if;
  else
    new.recorded_by := old.recorded_by; new.recorded_at := old.recorded_at; new.kpi_id := old.kpi_id;
  end if;
  if exists (select 1 from public.os_kpis k where k.id = new.kpi_id and k.values_restricted) then
    raise exception 'Values for this KPI stay in the Restricted Finance Control' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.os_kpi_values_before_write() from public, anon, authenticated;
drop trigger if exists os_kpi_values_b_rules on public.os_kpi_values;
create trigger os_kpi_values_b_rules before insert or update on public.os_kpi_values for each row execute function public.os_kpi_values_before_write();

-- Activity triggers
do $$
declare r record;
begin
  for r in select * from (values ('os_projects', 'project'), ('os_tasks', 'task'), ('os_documents', 'document'),
    ('os_partnerships', 'partnership'), ('os_decisions', 'decision'), ('os_campaign_items', 'campaign'),
    ('os_product_items', 'product'), ('os_objectives', 'objective'), ('os_timeline_items', 'timeline'),
    ('os_kpis', 'kpi')) as v(tbl, entity)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_activity', r.tbl);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.os_activity_row(%L)', r.tbl || '_activity', r.tbl, r.entity);
  end loop;
end $$;

-- Audit (the founders' audit log) for the sensitive tables.
do $$
declare t text;
begin
  foreach t in array array['os_person_profiles', 'os_person_employment', 'os_review_cycles', 'os_reviews', 'os_ai_settings', 'os_ai_actions', 'os_kpi_values', 'os_documents']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.os_audit_row()', t || '_audit', t);
  end loop;
end $$;

-- ── Row level security ─────────────────────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['os_projects', 'os_project_members', 'os_tasks', 'os_task_assignees', 'os_documents',
    'os_document_links', 'os_announcements', 'os_decisions', 'os_meetings', 'os_partnerships', 'os_campaign_items',
    'os_product_items', 'os_kpis', 'os_kpi_values', 'os_objectives', 'os_key_results', 'os_timeline_items',
    'os_person_profiles', 'os_person_employment', 'os_review_cycles', 'os_reviews', 'os_comments', 'os_activity',
    'os_ai_settings', 'os_ai_conversations', 'os_ai_messages', 'os_ai_usage', 'os_ai_actions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- Table privileges: read everything RLS allows; write only the columns people may set. IDs, created_by and the
-- server-only Drive columns are never writable through the API.
grant select on public.os_projects, public.os_project_members, public.os_tasks, public.os_task_assignees,
  public.os_documents, public.os_document_links, public.os_announcements, public.os_decisions, public.os_meetings,
  public.os_partnerships, public.os_campaign_items, public.os_product_items, public.os_kpis, public.os_kpi_values,
  public.os_objectives, public.os_key_results, public.os_timeline_items, public.os_person_profiles,
  public.os_person_employment, public.os_review_cycles, public.os_reviews, public.os_comments, public.os_activity,
  public.os_ai_settings, public.os_ai_conversations, public.os_ai_messages, public.os_ai_usage, public.os_ai_actions
  to authenticated;

grant insert (company_code, division_id, name, project_type, description, definition_of_done, success_metric, owner_person_id,
              status, priority, start_date, due_date, sensitivity, drive_folder_id, next_action),
      update (division_id, name, project_type, description, definition_of_done, success_metric, owner_person_id,
              status, priority, start_date, due_date, sensitivity, drive_folder_id, next_action)
  on public.os_projects to authenticated;
grant delete on public.os_projects to authenticated;
grant insert, delete on public.os_project_members to authenticated;
grant update (role) on public.os_project_members to authenticated;

grant insert (project_id, parent_task_id, company_code, division_id, title, description, definition_of_done, owner_person_id,
              reviewer_person_id, status, priority, due_date, no_deadline_reason, blocker, sensitivity, sort_order),
      update (project_id, division_id, title, description, definition_of_done, owner_person_id, reviewer_person_id, status,
              priority, due_date, no_deadline_reason, blocker, sensitivity, sort_order)
  on public.os_tasks to authenticated;
grant delete on public.os_tasks to authenticated;
grant insert, delete on public.os_task_assignees to authenticated;

grant insert (title, company_code, division_id, doc_type, category, status, sensitivity, owner_person_id, version,
              next_review_date, notes, drive_url),
      update (title, division_id, category, status, sensitivity, owner_person_id, version, next_review_date, notes, drive_url)
  on public.os_documents to authenticated;
grant insert, delete on public.os_document_links to authenticated;

grant insert (company_code, division_id, title, body, pinned, sensitivity, expires_at),
      update (title, body, pinned, sensitivity, expires_at) on public.os_announcements to authenticated;
grant delete on public.os_announcements to authenticated;
grant insert (company_code, division_id, project_id, decision, rationale, changes, decided_by, decided_on, status, source_link, sensitivity),
      update (division_id, project_id, decision, rationale, changes, decided_by, decided_on, status, source_link, sensitivity)
  on public.os_decisions to authenticated;
grant insert (company_code, division_id, meeting_type, title, held_on, facilitator_person_id, attendees, notes, sensitivity),
      update (division_id, meeting_type, title, held_on, facilitator_person_id, attendees, notes, sensitivity)
  on public.os_meetings to authenticated;
grant insert (company_code, division_id, opportunity_type, organisation, contact, source, stage, evidence_status, owner_person_id,
              estimated_value, value_basis, probability, next_action, follow_up_date, related_project_id, outcome, closed_on, notes, sensitivity),
      update (division_id, opportunity_type, organisation, contact, source, stage, evidence_status, owner_person_id,
              estimated_value, value_basis, probability, next_action, follow_up_date, related_project_id, outcome, closed_on, notes, sensitivity)
  on public.os_partnerships to authenticated;
grant insert (company_code, division_id, campaign, title, audience, objective, channel, format, planned_publish_date,
              production_deadline, owner_person_id, status, actual_publish_date, call_to_action, published_link, kpi_id,
              related_project_id, results, review, sensitivity),
      update (division_id, campaign, title, audience, objective, channel, format, planned_publish_date,
              production_deadline, owner_person_id, status, actual_publish_date, call_to_action, published_link, kpi_id,
              related_project_id, results, review, sensitivity)
  on public.os_campaign_items to authenticated;
grant insert (company_code, division_id, item_type, title, status, version, severity, owner_person_id, planned_date, actual_date,
              opened_on, qa_signed_off, link, related_item_id, notes, sensitivity),
      update (division_id, item_type, title, status, version, severity, owner_person_id, planned_date, actual_date,
              opened_on, qa_signed_off, link, related_item_id, notes, sensitivity)
  on public.os_product_items to authenticated;

-- KPI definitions and the timeline are maintained by founders (and division managers for their division's KPIs).
grant insert (company_code, division_id, level, function, name, business_purpose, definition, formula, indicator_type, unit,
              reporting_period, data_source, collection_method, owner_text, owner_person_id, baseline, target_value, target_status,
              action_when_missed, measurable_today, notes, values_restricted, sensitivity),
      update (division_id, owner_person_id, baseline, target_value, target_status, green_threshold, amber_threshold, red_threshold,
              action_when_missed, data_status, notes, track_now)
  on public.os_kpis to authenticated;
grant insert (kpi_id, period_label, period_end, value, value_basis, evidence_link),
      update (period_label, period_end, value, value_basis, evidence_link) on public.os_kpi_values to authenticated;
grant insert (company_code, division_id, parent_objective_id, title, description, period, owner_person_id, status, sensitivity),
      update (division_id, parent_objective_id, title, description, period, owner_person_id, status, sensitivity)
  on public.os_objectives to authenticated;
grant delete on public.os_objectives to authenticated;
grant insert (objective_id, title, kpi_id, owner_person_id, unit, start_value, target_value, target_status, current_value, status),
      update (title, kpi_id, owner_person_id, unit, start_value, target_value, target_status, current_value, status)
  on public.os_key_results to authenticated;
grant delete on public.os_key_results to authenticated;
grant update (status, due_date, planned_start, owner_person_id, owner_name, decision_gate, risk, evidence) on public.os_timeline_items to authenticated;

grant insert (person_id, title, responsibilities, manager_person_id, location),
      update (title, responsibilities, manager_person_id, location) on public.os_person_profiles to authenticated;
grant insert (person_id, membership_type, employing_company, start_date, end_date, notes),
      update (membership_type, employing_company, start_date, end_date, notes) on public.os_person_employment to authenticated;
grant insert (name, company_code, period_start, period_end, self_due, manager_due, status),
      update (name, period_start, period_end, self_due, manager_due, status) on public.os_review_cycles to authenticated;
grant insert (cycle_id, person_id, reviewer_person_id),
      update (reviewer_person_id, status, self_assessment, manager_assessment, kpi_achievement, objective_achievement, feedback,
              strengths, development_areas, development_plan) on public.os_reviews to authenticated;

grant insert (entity_type, entity_id, body), update (body, deleted_at) on public.os_comments to authenticated;
grant update (monthly_budget_usd, enabled, routine_model, complex_model, per_person_daily_usd) on public.os_ai_settings to authenticated;
grant insert (agent, company_code, title), update (title), delete on public.os_ai_conversations to authenticated;
grant update (status) on public.os_ai_actions to authenticated;
-- os_ai_messages, os_ai_usage, os_activity: no write grants. The server writes messages and usage with the service role.

-- Policies ----------------------------------------------------------------------------------------------------------

-- Projects
drop policy if exists os_projects_read on public.os_projects;
create policy os_projects_read on public.os_projects for select to authenticated
  using (public.os_project_row_visible(id, company_code, division_id, sensitivity, owner_person_id));
drop policy if exists os_projects_insert on public.os_projects;
create policy os_projects_insert on public.os_projects for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_projects_update on public.os_projects;
create policy os_projects_update on public.os_projects for update to authenticated
  using (public.os_can_edit_project(id))
  with check (public.os_can_create(company_code, division_id, sensitivity) or public.os_can_edit(company_code, division_id, sensitivity, 'project', id)
              or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));
drop policy if exists os_projects_delete on public.os_projects;
create policy os_projects_delete on public.os_projects for delete to authenticated using ((select public.os_is_founder()));

drop policy if exists os_project_members_read on public.os_project_members;
create policy os_project_members_read on public.os_project_members for select to authenticated using (public.os_can_view_project(project_id));
drop policy if exists os_project_members_write on public.os_project_members;
create policy os_project_members_write on public.os_project_members for all to authenticated
  using (public.os_can_edit_project(project_id)) with check (public.os_can_edit_project(project_id));

-- Tasks
drop policy if exists os_tasks_read on public.os_tasks;
create policy os_tasks_read on public.os_tasks for select to authenticated
  using (public.os_task_row_visible(id, project_id, company_code, division_id, sensitivity, owner_person_id, reviewer_person_id));
drop policy if exists os_tasks_insert on public.os_tasks;
create policy os_tasks_insert on public.os_tasks for insert to authenticated
  with check (case
    when parent_task_id is not null then public.os_can_edit_task(parent_task_id)
    when project_id is not null then (public.os_can_edit_project(project_id) and sensitivity <> 'Restricted') or public.os_is_founder()
    else public.os_can_create(company_code, division_id, sensitivity)
  end);
drop policy if exists os_tasks_update on public.os_tasks;
create policy os_tasks_update on public.os_tasks for update to authenticated
  using (public.os_can_edit_task(id))
  with check (public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(project_id, ''))
              or (sensitivity <> 'Restricted' and public.os_is_staff()
                  and (owner_person_id = public.os_current_person() or reviewer_person_id = public.os_current_person()
                       or exists (select 1 from public.os_task_assignees a where a.task_id = id and a.person_id = public.os_current_person())
                       or (project_id is not null and public.os_can_edit_project(project_id)))));
drop policy if exists os_tasks_delete on public.os_tasks;
create policy os_tasks_delete on public.os_tasks for delete to authenticated
  using ((select public.os_is_founder()) or (created_by = public.os_current_person() and public.os_can_edit_task(id)));

drop policy if exists os_task_assignees_read on public.os_task_assignees;
create policy os_task_assignees_read on public.os_task_assignees for select to authenticated using (public.os_can_view_task(task_id));
drop policy if exists os_task_assignees_write on public.os_task_assignees;
create policy os_task_assignees_write on public.os_task_assignees for all to authenticated
  using (public.os_can_edit_task(task_id))
  with check (public.os_can_edit_task(task_id) and exists (select 1 from public.os_people p where p.id = person_id and p.org_role <> 'guest'));

-- Documents
drop policy if exists os_documents_read on public.os_documents;
create policy os_documents_read on public.os_documents for select to authenticated
  using (public.os_can_view(company_code, division_id, sensitivity, 'document', id)
         or (public.os_is_staff() and owner_person_id = public.os_current_person()));
drop policy if exists os_documents_insert on public.os_documents;
create policy os_documents_insert on public.os_documents for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_documents_update on public.os_documents;
create policy os_documents_update on public.os_documents for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'document', id)
         or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_can_edit(company_code, division_id, sensitivity, 'document', id)
              or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));

drop policy if exists os_document_links_read on public.os_document_links;
create policy os_document_links_read on public.os_document_links for select to authenticated
  using (public.os_can_view_document(document_id) and public.os_can_view_entity(entity_type, entity_id));
drop policy if exists os_document_links_write on public.os_document_links;
create policy os_document_links_write on public.os_document_links for all to authenticated
  using (public.os_is_staff() and public.os_can_view_document(document_id) and public.os_can_view_entity(entity_type, entity_id))
  with check (public.os_is_staff() and public.os_can_view_document(document_id) and public.os_can_view_entity(entity_type, entity_id));

-- Announcements: managers and founders publish; everyone in scope reads unexpired ones (authors and founders see all).
drop policy if exists os_announcements_read on public.os_announcements;
create policy os_announcements_read on public.os_announcements for select to authenticated
  using (public.os_can_view(company_code, division_id, sensitivity, 'project', '')
         and (expires_at is null or expires_at > now() or created_by = public.os_current_person() or public.os_is_founder()));
drop policy if exists os_announcements_write on public.os_announcements;
create policy os_announcements_write on public.os_announcements for all to authenticated
  using (public.os_is_manager_for(company_code, division_id) and (created_by = public.os_current_person() or public.os_is_founder()))
  with check (public.os_is_manager_for(company_code, division_id) and public.os_can_create(company_code, division_id, sensitivity));

-- Decisions and meetings: read by scope; recorded by managers and founders.
drop policy if exists os_decisions_read on public.os_decisions;
create policy os_decisions_read on public.os_decisions for select to authenticated using (public.os_can_view(company_code, division_id, sensitivity, 'project', coalesce(project_id, '')));
drop policy if exists os_decisions_insert on public.os_decisions;
create policy os_decisions_insert on public.os_decisions for insert to authenticated
  with check (public.os_is_manager_for(company_code, division_id) and public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_decisions_update on public.os_decisions;
create policy os_decisions_update on public.os_decisions for update to authenticated
  using (public.os_is_manager_for(company_code, division_id)) with check (public.os_is_manager_for(company_code, division_id));

drop policy if exists os_meetings_read on public.os_meetings;
create policy os_meetings_read on public.os_meetings for select to authenticated using (public.os_can_view(company_code, division_id, sensitivity, 'project', ''));
drop policy if exists os_meetings_insert on public.os_meetings;
create policy os_meetings_insert on public.os_meetings for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_meetings_update on public.os_meetings;
create policy os_meetings_update on public.os_meetings for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', '') or created_by = public.os_current_person())
  with check (public.os_can_create(company_code, division_id, sensitivity) or created_by = public.os_current_person());

-- Partnerships, campaigns, product items: division-scoped like projects.
drop policy if exists os_partnerships_read on public.os_partnerships;
create policy os_partnerships_read on public.os_partnerships for select to authenticated using ((public.os_can_view(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, '')) or (public.os_is_staff() and owner_person_id = public.os_current_person())));
drop policy if exists os_partnerships_insert on public.os_partnerships;
create policy os_partnerships_insert on public.os_partnerships for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_partnerships_update on public.os_partnerships;
create policy os_partnerships_update on public.os_partnerships for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, ''))
         or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_can_create(company_code, division_id, sensitivity) or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));

drop policy if exists os_campaign_items_read on public.os_campaign_items;
create policy os_campaign_items_read on public.os_campaign_items for select to authenticated using ((public.os_can_view(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, '')) or (public.os_is_staff() and owner_person_id = public.os_current_person())));
drop policy if exists os_campaign_items_insert on public.os_campaign_items;
create policy os_campaign_items_insert on public.os_campaign_items for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_campaign_items_update on public.os_campaign_items;
create policy os_campaign_items_update on public.os_campaign_items for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', coalesce(related_project_id, '')) or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_can_create(company_code, division_id, sensitivity) or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));

drop policy if exists os_product_items_read on public.os_product_items;
create policy os_product_items_read on public.os_product_items for select to authenticated using ((public.os_can_view(company_code, division_id, sensitivity, 'project', '') or (public.os_is_staff() and owner_person_id = public.os_current_person())));
drop policy if exists os_product_items_insert on public.os_product_items;
create policy os_product_items_insert on public.os_product_items for insert to authenticated
  with check (public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_product_items_update on public.os_product_items;
create policy os_product_items_update on public.os_product_items for update to authenticated
  using (public.os_can_edit(company_code, division_id, sensitivity, 'project', '') or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_can_create(company_code, division_id, sensitivity) or (public.os_is_staff() and owner_person_id = public.os_current_person() and sensitivity <> 'Restricted'));

-- KPIs: definitions read by scope; edited by founders and the division's manager. Values: read with the KPI; logged by
-- the KPI's owner, the division's people, managers and founders.
drop policy if exists os_kpis_read on public.os_kpis;
create policy os_kpis_read on public.os_kpis for select to authenticated using (public.os_can_view(company_code, division_id, sensitivity, 'project', ''));
drop policy if exists os_kpis_insert on public.os_kpis;
create policy os_kpis_insert on public.os_kpis for insert to authenticated
  with check (public.os_is_manager_for(company_code, division_id) and public.os_can_create(company_code, division_id, sensitivity));
drop policy if exists os_kpis_update on public.os_kpis;
create policy os_kpis_update on public.os_kpis for update to authenticated
  using (public.os_is_manager_for(company_code, division_id)) with check (public.os_is_manager_for(company_code, division_id));

drop policy if exists os_kpi_values_read on public.os_kpi_values;
create policy os_kpi_values_read on public.os_kpi_values for select to authenticated using (public.os_can_view_entity('kpi', kpi_id));
drop policy if exists os_kpi_values_insert on public.os_kpi_values;
create policy os_kpi_values_insert on public.os_kpi_values for insert to authenticated
  with check (exists (select 1 from public.os_kpis k where k.id = kpi_id and public.os_is_staff()
                      and (public.os_is_manager_for(k.company_code, k.division_id)
                           or k.owner_person_id = public.os_current_person()
                           or (k.division_id is not null and public.os_in_division(k.division_id)))));
drop policy if exists os_kpi_values_update on public.os_kpi_values;
create policy os_kpi_values_update on public.os_kpi_values for update to authenticated
  using (recorded_by = public.os_current_person() or exists (select 1 from public.os_kpis k where k.id = kpi_id and public.os_is_manager_for(k.company_code, k.division_id)))
  with check (recorded_by = public.os_current_person() or exists (select 1 from public.os_kpis k where k.id = kpi_id and public.os_is_manager_for(k.company_code, k.division_id)));

-- OKRs: company objectives by founders; division objectives by the division's manager; key results follow the objective.
drop policy if exists os_objectives_read on public.os_objectives;
create policy os_objectives_read on public.os_objectives for select to authenticated using ((public.os_can_view(company_code, division_id, sensitivity, 'project', '') or (public.os_is_staff() and owner_person_id = public.os_current_person())));
drop policy if exists os_objectives_write on public.os_objectives;
create policy os_objectives_write on public.os_objectives for all to authenticated
  using (public.os_is_manager_for(company_code, division_id) or (public.os_is_staff() and owner_person_id = public.os_current_person()))
  with check (public.os_is_manager_for(company_code, division_id) and public.os_can_create(company_code, division_id, sensitivity));

drop policy if exists os_key_results_read on public.os_key_results;
create policy os_key_results_read on public.os_key_results for select to authenticated using (public.os_can_view_entity('objective', objective_id));
drop policy if exists os_key_results_write on public.os_key_results;
create policy os_key_results_write on public.os_key_results for all to authenticated
  using (exists (select 1 from public.os_objectives o where o.id = objective_id
                 and (public.os_is_manager_for(o.company_code, o.division_id) or owner_person_id = public.os_current_person())))
  with check (exists (select 1 from public.os_objectives o where o.id = objective_id
                      and (public.os_is_manager_for(o.company_code, o.division_id) or (public.os_is_staff() and owner_person_id = public.os_current_person()))));

-- Timeline: everyone in the company reads; founders and the lead division's manager update.
drop policy if exists os_timeline_items_read on public.os_timeline_items;
create policy os_timeline_items_read on public.os_timeline_items for select to authenticated
  using (public.os_can_view(company_code, null, sensitivity, 'project', ''));
drop policy if exists os_timeline_items_update on public.os_timeline_items;
create policy os_timeline_items_update on public.os_timeline_items for update to authenticated
  using (public.os_is_founder() or (lead_division_id is not null and public.os_manages_division(lead_division_id)))
  with check (public.os_is_founder() or (lead_division_id is not null and public.os_manages_division(lead_division_id)));

-- People profiles: staff read; the person, their managers, founders and People Leads with edit write.
drop policy if exists os_person_profiles_read on public.os_person_profiles;
create policy os_person_profiles_read on public.os_person_profiles for select to authenticated
  using ((select public.os_is_staff()) or person_id = (select public.os_current_person()));
drop policy if exists os_person_profiles_write on public.os_person_profiles;
create policy os_person_profiles_write on public.os_person_profiles for all to authenticated
  using (person_id = public.os_current_person() or public.os_is_founder() or public.os_manages_person(person_id))
  with check (person_id = public.os_current_person() or public.os_is_founder() or public.os_manages_person(person_id));

drop policy if exists os_person_employment_read on public.os_person_employment;
create policy os_person_employment_read on public.os_person_employment for select to authenticated
  using (public.os_can_view_person_private(person_id));
drop policy if exists os_person_employment_write on public.os_person_employment;
create policy os_person_employment_write on public.os_person_employment for all to authenticated
  using ((select public.os_is_founder()) or (exists (select 1 from public.os_grants g where g.person_id = public.os_current_person()
           and g.resource_type = 'people' and g.level = 'edit' and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
           and public.os_is_people_lead_for(person_id)))
  with check ((select public.os_is_founder()) or (exists (select 1 from public.os_grants g where g.person_id = public.os_current_person()
           and g.resource_type = 'people' and g.level = 'edit' and g.revoked_at is null and (g.expires_at is null or g.expires_at > now()))
           and public.os_is_people_lead_for(person_id)));

-- Review cycles: staff in the company read; founders run them.
drop policy if exists os_review_cycles_read on public.os_review_cycles;
create policy os_review_cycles_read on public.os_review_cycles for select to authenticated
  using ((select public.os_is_staff()) and (public.os_in_company(company_code) or public.os_is_founder()));
drop policy if exists os_review_cycles_write on public.os_review_cycles;
create policy os_review_cycles_write on public.os_review_cycles for all to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

-- Reviews: the person, their managers, founders, People Leads. Founders (and People Leads with edit) open reviews.
drop policy if exists os_reviews_read on public.os_reviews;
create policy os_reviews_read on public.os_reviews for select to authenticated
  using (public.os_can_view_person_private(person_id) or reviewer_person_id = public.os_current_person());
drop policy if exists os_reviews_insert on public.os_reviews;
create policy os_reviews_insert on public.os_reviews for insert to authenticated
  with check (public.os_is_founder() or public.os_manages_person(person_id));
drop policy if exists os_reviews_update on public.os_reviews;
create policy os_reviews_update on public.os_reviews for update to authenticated
  using (public.os_can_view_person_private(person_id) or reviewer_person_id = public.os_current_person())
  with check (public.os_can_view_person_private(person_id) or reviewer_person_id = public.os_current_person());

-- Comments and activity
drop policy if exists os_comments_read on public.os_comments;
create policy os_comments_read on public.os_comments for select to authenticated using (public.os_can_view_entity(entity_type, entity_id));
drop policy if exists os_comments_insert on public.os_comments;
create policy os_comments_insert on public.os_comments for insert to authenticated
  with check ((select public.os_is_staff()) and public.os_can_view_entity(entity_type, entity_id));
drop policy if exists os_comments_update on public.os_comments;
create policy os_comments_update on public.os_comments for update to authenticated
  using (author_person_id = public.os_current_person() or public.os_is_founder())
  with check (author_person_id = public.os_current_person() or public.os_is_founder());

drop policy if exists os_activity_read on public.os_activity;
create policy os_activity_read on public.os_activity for select to authenticated using (public.os_can_view_entity(entity_type, entity_id));

-- AI: settings readable by anyone in the OS, changed by founders; conversations, messages and actions are private to
-- their person; the cost ledger is readable by founders (and each person sees their own rows).
drop policy if exists os_ai_settings_read on public.os_ai_settings;
create policy os_ai_settings_read on public.os_ai_settings for select to authenticated using ((select public.os_current_person()) is not null);
drop policy if exists os_ai_settings_write on public.os_ai_settings;
create policy os_ai_settings_write on public.os_ai_settings for update to authenticated
  using ((select public.os_is_founder())) with check ((select public.os_is_founder()));

drop policy if exists os_ai_conversations_own on public.os_ai_conversations;
create policy os_ai_conversations_own on public.os_ai_conversations for all to authenticated
  using (person_id = (select public.os_current_person()))
  with check (person_id = (select public.os_current_person()) and (select public.os_is_staff()));
drop policy if exists os_ai_messages_own on public.os_ai_messages;
create policy os_ai_messages_own on public.os_ai_messages for select to authenticated
  using (exists (select 1 from public.os_ai_conversations c where c.id = conversation_id and c.person_id = public.os_current_person()));
drop policy if exists os_ai_usage_read on public.os_ai_usage;
create policy os_ai_usage_read on public.os_ai_usage for select to authenticated
  using ((select public.os_is_founder()) or person_id = (select public.os_current_person()));
drop policy if exists os_ai_actions_own on public.os_ai_actions;
create policy os_ai_actions_own on public.os_ai_actions for select to authenticated
  using (person_id = (select public.os_current_person()) or (select public.os_is_founder()));
drop policy if exists os_ai_actions_decide on public.os_ai_actions;
create policy os_ai_actions_decide on public.os_ai_actions for update to authenticated
  using (person_id = (select public.os_current_person()) and status = 'proposed')
  with check (person_id = (select public.os_current_person()) and status in ('rejected'));

-- The conversation's owner is always the caller.
create or replace function public.os_ai_conversations_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.os_caller_is_privileged() then new.person_id := public.os_current_person(); end if;
    new.created_at := now();
  else
    new.person_id := old.person_id; new.agent := old.agent; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_ai_conversations_before_write() from public, anon, authenticated;
drop trigger if exists os_ai_conversations_before_write on public.os_ai_conversations;
create trigger os_ai_conversations_before_write before insert or update on public.os_ai_conversations for each row execute function public.os_ai_conversations_before_write();

-- Settings: who changed them comes from the caller.
create or replace function public.os_ai_settings_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := public.os_current_person();
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_ai_settings_before_write() from public, anon, authenticated;
drop trigger if exists os_ai_settings_before_write on public.os_ai_settings;
create trigger os_ai_settings_before_write before update on public.os_ai_settings for each row execute function public.os_ai_settings_before_write();

-- ── Dashboard counts (respect RLS: they run as the caller) ─────────────────────────────────────────────────────────

create or replace function public.os_my_work_summary() returns table (open_tasks int, overdue_tasks int, due_this_week int, in_review int)
language sql stable security invoker set search_path = '' as $$
  with mine as (
    select t.* from public.os_tasks t
    where t.status not in ('Done', 'Cancelled')
      and (t.owner_person_id = public.os_current_person()
           or exists (select 1 from public.os_task_assignees a where a.task_id = t.id and a.person_id = public.os_current_person())))
  select count(*)::int,
         count(*) filter (where due_date < (now() at time zone 'Asia/Jakarta')::date)::int,
         count(*) filter (where due_date between (now() at time zone 'Asia/Jakarta')::date and (now() at time zone 'Asia/Jakarta')::date + 7)::int,
         count(*) filter (where status = 'In Review')::int
  from mine
$$;
revoke all on function public.os_my_work_summary() from public, anon;
grant execute on function public.os_my_work_summary() to authenticated;
