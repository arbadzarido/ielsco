-- Company OS: programme workspaces (first user: GIF Summer 2027, project PRJ-0033).
--
-- A programme is an existing os_projects row with extra registers the OS did not have: canonical programme facts,
-- decisions with options and a founder answer workflow, research and verification, risks, a budget model, outputs
-- (documents, website, dashboard, emails, agreements) with versions, country plans, checklists and run sheets, local
-- partners, a proposed team allocation, data-quality findings, and one dependency graph that connects all of them.
--
-- Reused, not duplicated: tasks are os_tasks (with a 1:1 os_programme_task_meta row), approved decisions are also
-- written to os_decisions (the company decision log), milestones are os_timeline_items, partners are os_partnerships,
-- documents link to os_documents, access is os_can_view / os_can_edit_project. Nothing here changes Drive, the GIF
-- engine (schema gif), the public website or payments: the change-impact workflow only flags outputs and creates
-- revision tasks; publishing stays a human step.
--
-- Additive and idempotent: create ... if not exists, create or replace, drop policy/trigger if exists.

-- ── Programmes ─────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programmes (
  project_id          text primary key references public.os_projects (id) on delete cascade,
  code                text not null unique check (code ~ '^[A-Z][A-Z0-9]{1,11}$'),
  name                text not null check (length(trim(name)) between 1 and 200),
  starts_on           date,
  ends_on             date,
  gif_cohort_id       text,                       -- gif.cohorts.id when the programme runs on the GIF engine
  countries           text[] not null default '{}',
  approver_person_ids text[] not null default '{}', -- who may answer decisions (Arba and Farrel for GIF)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- Access follows the project: Internal rows for everyone in the project's company, Confidential rows for the project's
-- division (and founders), Restricted rows for founders and explicit grants. Project members who are staff also read
-- non-Restricted rows.
create or replace function public.os_programme_can_view(p_project text, p_sensitivity text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_projects p join public.os_programmes g on g.project_id = p.id
                 where p.id = p_project
                   and (public.os_can_view(p.company_code, p.division_id, coalesce(p_sensitivity, 'Internal'), 'project', p.id)
                        or (coalesce(p_sensitivity, 'Internal') <> 'Restricted' and public.os_is_staff() and public.os_is_project_member(p.id))))
$$;

create or replace function public.os_programme_can_edit(p_project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_programmes g where g.project_id = p_project) and public.os_can_edit_project(p_project)
$$;

create or replace function public.os_programme_is_approver(p_project text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_current_person() is not null and public.os_is_staff()
     and exists (select 1 from public.os_programmes g where g.project_id = p_project
                 and public.os_current_person() = any (g.approver_person_ids))
$$;

create or replace function public.os_programme_code(p_project text) returns text
language sql stable security definer set search_path = '' as $$
  select code from public.os_programmes where project_id = p_project
$$;

-- Codes like GIF-DEC-001, numbered per programme and kind. Own counters: the shared os_id_counters only takes 2–4
-- letter prefixes (PRJ, TSK, ...).
create table if not exists public.os_programme_counters (
  prefix text primary key check (prefix ~ '^[A-Z][A-Z0-9]{1,11}-[A-Z]{1,4}$'),
  last   int  not null default 0
);
alter table public.os_programme_counters enable row level security;
revoke all on public.os_programme_counters from anon, authenticated;

create or replace function public.os_programme_next_code(p_prefix text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare n int;
begin
  insert into public.os_programme_counters as c (prefix, last) values (p_prefix, 1)
  on conflict (prefix) do update set last = c.last + 1
  returning last into n;
  return p_prefix || '-' || lpad(n::text, 3, '0');
end $$;
revoke all on function public.os_programme_next_code(text) from public, anon, authenticated;

create or replace function public.os_programme_assign_code() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pre text;
begin
  if new.code is null then
    pre := public.os_programme_code(new.project_id) || '-' || tg_argv[0];
    if pre is null then raise exception 'Unknown programme' using errcode = '23503'; end if;
    new.code := public.os_programme_next_code(pre);
  end if;
  return new;
end $$;

create or replace function public.os_programme_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Canonical programme facts (the single source of truth) ─────────────────────────────────────────────────────────

create table if not exists public.os_programme_facts (
  project_id       text not null references public.os_programmes (project_id) on delete cascade,
  key              text not null check (key ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'),
  label            text not null,
  category         text not null,
  value            text not null,
  unit             text,
  status           text not null check (status in ('Confirmed', 'Decided', 'Proposed', 'Estimated', 'Pending', 'Unverified', 'Unknown', 'Outdated')),
  public_facing    boolean not null default false,  -- appears on the website, dashboard or participant material
  source           text,
  source_decision  text,
  notes            text,
  sort             int not null default 0,
  version          int not null default 1,
  updated_by       text references public.os_people (id) on delete set null,
  updated_at       timestamptz not null default now(),
  primary key (project_id, key)
);

create table if not exists public.os_programme_fact_versions (
  id          bigint generated always as identity primary key,
  project_id  text not null,
  key         text not null,
  version     int not null,
  value       text not null,
  status      text not null,
  source      text,
  reason      text,
  change_code text,
  changed_by  text,
  changed_at  timestamptz not null default now(),
  foreign key (project_id, key) references public.os_programme_facts (project_id, key) on delete cascade
);
create index if not exists os_programme_fact_versions_key_idx on public.os_programme_fact_versions (project_id, key, version);

-- ── Decisions ───────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_decisions (
  code               text primary key check (code ~ '^[A-Z][A-Z0-9]*-DEC-[0-9]{3,}$'),
  project_id         text not null references public.os_programmes (project_id) on delete cascade,
  title              text not null check (length(trim(title)) between 1 and 300),
  question           text not null,
  background         text,
  why_it_matters     text,
  current_situation  text,
  evidence           text,               -- conflicting or supporting evidence, with sources
  -- [{key, label, summary, pros, cons, cost, operations, participant, fact_updates: {fact_key: value}, rejected}]
  options            jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  recommended_option text,
  recommendation     text,
  info_needed        text,
  delay_consequence  text,
  dependencies       text,
  priority           text not null check (priority in ('Critical', 'High', 'Medium', 'Low')),
  phase              text,
  suggested_deadline date,
  deadline_basis     text,
  owner_person_id    text references public.os_people (id) on delete set null,
  status             text not null default 'Pending Decision'
                     check (status in ('Decided', 'Pending Decision', 'Needs Research', 'Needs External Confirmation', 'Awaiting Approval', 'Revisit Later', 'Not Applicable')),
  final_option       text,
  final_decision     text,
  decision_reason    text,
  decided_by         text references public.os_people (id) on delete set null,
  decided_on         date,
  os_decision_id     text references public.os_decisions (id) on delete set null,
  sensitivity        text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort               int not null default 0,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists os_programme_decisions_project_idx on public.os_programme_decisions (project_id, status, priority);

-- Append-only history of every answer, comment, research request, deferral and rejected option.
create table if not exists public.os_programme_decision_log (
  id            bigint generated always as identity primary key,
  decision_code text not null references public.os_programme_decisions (code) on delete cascade,
  action        text not null check (action in ('approve_recommendation', 'select_option', 'custom', 'request_research',
                  'needs_external', 'awaiting_approval', 'defer', 'reject_option', 'comment', 'reopen', 'not_applicable')),
  option_key    text,
  note          text,
  status_before text,
  status_after  text,
  person_id     text references public.os_people (id) on delete set null,
  at            timestamptz not null default now()
);
create index if not exists os_programme_decision_log_code_idx on public.os_programme_decision_log (decision_code, at);

-- ── Research and verification ──────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_research (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  question        text not null,
  why_it_matters  text,
  country         text not null default 'All' check (country in ('All', 'Indonesia', 'Singapore', 'Malaysia', 'Thailand')),
  info_required   text,
  source_type     text,
  owner_person_id text references public.os_people (id) on delete set null,
  status          text not null default 'To research'
                  check (status in ('To research', 'In progress', 'Findings recorded', 'Verified', 'Needs re-verification', 'Not applicable')),
  findings        text,
  source_links    text,
  verified_on     date,
  reverify_on     date,
  due_date        date,
  sensitivity     text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ── Risks ──────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_risks (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  title           text not null,
  description     text,
  category        text not null,
  country         text not null default 'All' check (country in ('All', 'Indonesia', 'Singapore', 'Malaysia', 'Thailand')),
  likelihood      int not null check (likelihood between 1 and 5),
  impact          int not null check (impact between 1 and 5),
  rating          int generated always as (likelihood * impact) stored,
  prevention      text,
  mitigation      text,
  contingency     text,
  escalation      text,
  owner_person_id text references public.os_people (id) on delete set null,
  review_on       date,
  status          text not null default 'Open' check (status in ('Open', 'Monitoring', 'Closed')),
  decide_before   text check (decide_before is null or decide_before in ('Recruitment', 'Payments', 'Bookings', 'Travel')),
  sensitivity     text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ── Budget model ───────────────────────────────────────────────────────────────────────────────────────────────────
-- Amounts are only ever estimates, quotes or actuals, and say which. A line with no amount is "not yet estimated";
-- the summary counts those instead of treating them as zero. Revenue lines can be driven by facts (price × count).

create table if not exists public.os_programme_budget_lines (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  section         text not null check (section in ('Revenue', 'Cost', 'Reserve')),
  category        text not null,
  country         text not null default 'All' check (country in ('All', 'Indonesia', 'Singapore', 'Malaysia', 'Thailand')),
  activity        text,
  description     text not null,
  basis           text not null default 'Not estimated'
                  check (basis in ('Not estimated', 'Placeholder estimate', 'Formula', 'Quote', 'Contracted', 'Actual')),
  currency        text not null default 'IDR' check (currency in ('IDR', 'USD', 'SGD', 'MYR', 'THB')),
  unit_amount     numeric check (unit_amount is null or unit_amount >= 0),
  quantity        numeric check (quantity is null or quantity >= 0),
  unit_fact       text,             -- fact key for the unit amount (e.g. prices.self_funded.idr)
  quantity_fact   text,             -- fact key for the quantity (e.g. scenario.base.self_funded)
  amount_idr      bigint check (amount_idr is null or amount_idr >= 0),  -- set for non-formula lines, in IDR
  owner_person_id text references public.os_people (id) on delete set null,
  approval        text not null default 'Draft' check (approval in ('Draft', 'Proposed', 'Approved', 'Rejected')),
  notes           text,
  sensitivity     text not null default 'Confidential' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ── Outputs: documents, website, dashboard, emails, agreements, financial model, run sheets ────────────────────────

create table if not exists public.os_programme_outputs (
  code             text primary key,
  project_id       text not null references public.os_programmes (project_id) on delete cascade,
  title            text not null,
  output_type      text not null check (output_type in ('Document', 'Website page', 'Dashboard screen', 'Email template',
                     'Legal document', 'Financial model', 'Operational plan', 'Run sheet', 'Handbook', 'Template', 'Campaign asset', 'Report')),
  audience         text not null default 'Internal' check (audience in ('Internal', 'Participants', 'Parents and guardians', 'Partners', 'Public', 'Volunteers', 'Vendors')),
  location         text,             -- URL, repo path or Drive link
  os_document_id   text references public.os_documents (id) on delete set null,
  owner_person_id  text references public.os_people (id) on delete set null,
  version          text not null default 'v0',
  approval_status  text not null default 'Not started'
                   check (approval_status in ('Not started', 'Draft', 'In review', 'Approved', 'Published', 'Needs revision', 'Outdated')),
  needs_revision   boolean not null default false,
  last_updated     date,
  updated_by       text references public.os_people (id) on delete set null,
  previous_version text,
  change_summary   text,
  notes            text,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  sort             int not null default 0,
  updated_at       timestamptz not null default now()
);

-- ── Country plans, checklists, run sheets ──────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_country_plans (
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  country         text not null check (country in ('Singapore', 'Malaysia', 'Thailand')),
  section         text not null,
  status          text not null default 'Unknown' check (status in ('Confirmed', 'Decided', 'Proposed', 'Pending', 'Unknown')),
  known           text,
  open_items      text,
  local_support   text,
  lead_person_id  text references public.os_people (id) on delete set null,
  sort            int not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (project_id, country, section)
);

create table if not exists public.os_programme_checklist_items (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  checklist       text not null check (checklist in ('Pre-event readiness', 'Daily on-site', 'Post-event',
                    'Journey: before departure', 'Journey: during programme', 'Journey: after programme')),
  item            text not null,
  country         text not null default 'All' check (country in ('All', 'Indonesia', 'Singapore', 'Malaysia', 'Thailand')),
  owner_person_id text references public.os_people (id) on delete set null,
  due_date        date,
  timing          text,
  status          text not null default 'Not started' check (status in ('Not started', 'In progress', 'Done', 'Not applicable')),
  prepare_before_event boolean not null default false,
  notes           text,
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

create table if not exists public.os_programme_run_sheet (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  day             date not null,
  country         text not null default 'TBD' check (country in ('TBD', 'Singapore', 'Malaysia', 'Thailand', 'In transit')),
  starts          time,
  ends            time,
  activity        text not null,
  location        text,
  lead_person_id  text references public.os_people (id) on delete set null,
  local_support   text,
  status          text not null default 'Skeleton' check (status in ('Skeleton', 'Proposed', 'Confirmed', 'Cancelled')),
  notes           text,
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ── People: proposed allocation of the travelling core team ────────────────────────────────────────────────────────

create table if not exists public.os_programme_team (
  project_id        text not null references public.os_programmes (project_id) on delete cascade,
  person_id         text not null references public.os_people (id) on delete cascade,
  programme_role    text not null,
  accountable_for   text[] not null default '{}',  -- workstream (category) letters A..O
  supports          text[] not null default '{}',
  approves          text,
  escalates_to      text,
  country_lead      text check (country_lead is null or country_lead in ('Singapore', 'Malaysia', 'Thailand')),
  on_site_role      text,
  capacity_note     text,
  basis             text,                           -- the evidence used for the proposal
  status            text not null default 'Proposed' check (status in ('Proposed', 'Approved', 'Changed')),
  travelling        boolean not null default true,
  updated_at        timestamptz not null default now(),
  primary key (project_id, person_id)
);

create table if not exists public.os_programme_workstreams (
  project_id          text not null references public.os_programmes (project_id) on delete cascade,
  letter              text not null check (letter ~ '^[A-Z]$'),
  name                text not null,
  accountable_person_id text references public.os_people (id) on delete set null,
  support_person_ids  text[] not null default '{}',
  local_support       text,
  status              text not null default 'Proposed' check (status in ('Proposed', 'Approved')),
  primary key (project_id, letter)
);

-- ── Tasks: os_tasks plus programme metadata ────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_task_meta (
  task_id             text primary key references public.os_tasks (id) on delete cascade,
  project_id          text not null references public.os_programmes (project_id) on delete cascade,
  code                text not null unique,
  category            text not null check (category ~ '^[A-Z]$'),
  phase               int not null check (phase between 1 and 16),
  country             text not null default 'All' check (country in ('All', 'Indonesia', 'Singapore', 'Malaysia', 'Thailand')),
  supporting          text,
  external_dependency text,
  effort_hours        numeric check (effort_hours is null or effort_hours >= 0),
  deliverable         text,
  needs_core          boolean not null default true,
  local_support       boolean not null default false,
  needs_vendor        boolean not null default false,
  needs_approval      boolean not null default false,
  automatable         text,
  simplify            text,
  waiting_on          text check (waiting_on is null or waiting_on in ('decision', 'external')),
  critical_path       boolean not null default false,
  updated_at          timestamptz not null default now()
);
create index if not exists os_programme_task_meta_project_idx on public.os_programme_task_meta (project_id, category);

-- ── Local partners: os_partnerships plus programme metadata ────────────────────────────────────────────────────────

create table if not exists public.os_programme_partner_meta (
  partnership_id  text primary key references public.os_partnerships (id) on delete cascade,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  code            text not null unique,
  country         text not null check (country in ('Indonesia', 'Singapore', 'Malaysia', 'Thailand', 'Regional')),
  city            text,
  party_kind      text not null check (party_kind in ('University', 'Student organisation', 'Youth community', 'Volunteer pool',
                    'Paid local coordinator', 'Vendor', 'Institution', 'Sponsor', 'Mentor or judge')),
  support_types   text[] not null default '{}',
  status          text not null default 'To research' check (status in ('Identified', 'To research', 'Contacted', 'In discussion', 'Confirmed', 'Declined')),
  supervisor_person_id text references public.os_people (id) on delete set null,
  updated_at      timestamptz not null default now()
);

-- ── Findings: duplicated, inconsistent, outdated or incomplete information ─────────────────────────────────────────

create table if not exists public.os_programme_findings (
  code            text primary key,
  project_id      text not null references public.os_programmes (project_id) on delete cascade,
  title           text not null,
  detail          text not null,
  evidence        text,
  severity        text not null check (severity in ('High', 'Medium', 'Low')),
  proposed_action text,
  decision_code   text references public.os_programme_decisions (code) on delete set null,
  status          text not null default 'Open' check (status in ('Open', 'Resolved', 'Accepted as is')),
  sort            int not null default 0,
  updated_at      timestamptz not null default now()
);

-- ── One dependency graph ───────────────────────────────────────────────────────────────────────────────────────────
-- from → to means "a change to `from` may require `to` to be revised". Kinds: fact, decision, task (programme task
-- code), output, budget, research, risk, milestone (TL id), partner, checklist, country_plan (country:section).

create table if not exists public.os_programme_links (
  project_id  text not null references public.os_programmes (project_id) on delete cascade,
  from_kind   text not null check (from_kind in ('fact', 'decision', 'task', 'output', 'budget', 'research', 'risk', 'milestone', 'partner', 'checklist', 'country_plan')),
  from_ref    text not null,
  to_kind     text not null check (to_kind in ('fact', 'decision', 'task', 'output', 'budget', 'research', 'risk', 'milestone', 'partner', 'checklist', 'country_plan')),
  to_ref      text not null,
  relation    text not null default 'affects' check (relation in ('affects', 'informs', 'blocks', 'uses', 'evidence_for')),
  created_at  timestamptz not null default now(),
  primary key (project_id, from_kind, from_ref, to_kind, to_ref)
);
create index if not exists os_programme_links_to_idx on public.os_programme_links (project_id, to_kind, to_ref);

-- ── Change impact ──────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_programme_changes (
  code         text primary key,
  project_id   text not null references public.os_programmes (project_id) on delete cascade,
  trigger_kind text not null,
  trigger_ref  text not null,
  summary      text not null,
  old_value    text,
  new_value    text,
  reason       text,
  status       text not null default 'Open' check (status in ('Open', 'Revisions in progress', 'Awaiting approval', 'Closed')),
  created_by   text references public.os_people (id) on delete set null,
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);

create table if not exists public.os_programme_change_items (
  change_code      text not null references public.os_programme_changes (code) on delete cascade,
  kind             text not null,
  ref              text not null,
  title            text,
  depth            int not null default 1,
  via              text,
  action           text not null check (action in ('Revise', 'Review', 'Recompute', 'Re-plan')),
  revision_task_id text references public.os_tasks (id) on delete set null,
  status           text not null default 'Pending' check (status in ('Pending', 'Done', 'Not needed')),
  primary key (change_code, kind, ref)
);

-- ── Triggers: codes, timestamps ────────────────────────────────────────────────────────────────────────────────────

do $$
declare r record;
begin
  for r in select * from (values ('os_programme_decisions', 'DEC'), ('os_programme_research', 'RES'), ('os_programme_risks', 'RSK'),
    ('os_programme_budget_lines', 'BUD'), ('os_programme_outputs', 'OUT'), ('os_programme_checklist_items', 'CHK'),
    ('os_programme_run_sheet', 'RUN'), ('os_programme_findings', 'FND'), ('os_programme_task_meta', 'T'),
    ('os_programme_partner_meta', 'LP'), ('os_programme_changes', 'CHG')) as v(tbl, kind)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_a_code', r.tbl);
    execute format('create trigger %I before insert on public.%I for each row execute function public.os_programme_assign_code(%L)', r.tbl || '_a_code', r.tbl, r.kind);
  end loop;
  for r in select * from (values ('os_programmes'), ('os_programme_decisions'), ('os_programme_research'), ('os_programme_risks'),
    ('os_programme_budget_lines'), ('os_programme_outputs'), ('os_programme_country_plans'), ('os_programme_checklist_items'),
    ('os_programme_run_sheet'), ('os_programme_team'), ('os_programme_task_meta'), ('os_programme_partner_meta'), ('os_programme_findings')) as v(tbl)
  loop
    execute format('drop trigger if exists %I on public.%I', r.tbl || '_b_touch', r.tbl);
    execute format('create trigger %I before update on public.%I for each row execute function public.os_programme_touch()', r.tbl || '_b_touch', r.tbl);
  end loop;
end $$;

drop trigger if exists os_programme_decisions_b_stamp on public.os_programme_decisions;
create trigger os_programme_decisions_b_stamp before insert on public.os_programme_decisions for each row execute function public.os_set_created_by();

-- Final decision fields are written only by os_programme_decide (it sets os.programme_deciding for its transaction).
create or replace function public.os_programme_decisions_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('os.programme_deciding', true), '') = 'on' or public.os_caller_is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status = 'Decided' or new.final_decision is not null or new.decided_by is not null or new.os_decision_id is not null then
      raise exception 'Decisions are answered with os_programme_decide' using errcode = '42501';
    end if;
  elsif new.status is distinct from old.status or new.final_option is distinct from old.final_option
     or new.final_decision is distinct from old.final_decision or new.decision_reason is distinct from old.decision_reason
     or new.decided_by is distinct from old.decided_by or new.decided_on is distinct from old.decided_on
     or new.os_decision_id is distinct from old.os_decision_id
     or (old.status = 'Decided' and new.options is distinct from old.options) then
    raise exception 'Decisions are answered with os_programme_decide' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.os_programme_decisions_guard() from public, anon, authenticated;
drop trigger if exists os_programme_decisions_c_guard on public.os_programme_decisions;
create trigger os_programme_decisions_c_guard before insert or update on public.os_programme_decisions for each row execute function public.os_programme_decisions_guard();

-- ── Impact walk ────────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.os_programme_impact(p_project text, p_kind text, p_ref text, p_max_depth int default 4)
returns table (kind text, ref text, depth int, relation text, via text)
language sql stable security definer set search_path = '' as $$
  with recursive w (kind, ref, depth, relation, via, path) as (
    select l.to_kind, l.to_ref, 1, l.relation, l.from_kind || ':' || l.from_ref,
           array[p_kind || ':' || p_ref, l.to_kind || ':' || l.to_ref]
    from public.os_programme_links l
    where l.project_id = p_project and l.from_kind = p_kind and l.from_ref = p_ref
      and public.os_programme_can_view(p_project, 'Internal')
    union all
    select l.to_kind, l.to_ref, w.depth + 1, l.relation, l.from_kind || ':' || l.from_ref, w.path || (l.to_kind || ':' || l.to_ref)
    from w join public.os_programme_links l on l.project_id = p_project and l.from_kind = w.kind and l.from_ref = w.ref
    where w.depth < least(greatest(p_max_depth, 1), 8) and not ((l.to_kind || ':' || l.to_ref) = any (w.path))
  )
  select distinct on (w.kind, w.ref) w.kind, w.ref, w.depth, w.relation, w.via from w order by w.kind, w.ref, w.depth
$$;

create or replace function public.os_programme_ref_title(p_project text, p_kind text, p_ref text) returns text
language sql stable security definer set search_path = '' as $$
  select case p_kind
    when 'fact' then (select label from public.os_programme_facts where project_id = p_project and key = p_ref)
    when 'decision' then (select title from public.os_programme_decisions where code = p_ref)
    when 'task' then (select t.title from public.os_programme_task_meta m join public.os_tasks t on t.id = m.task_id where m.code = p_ref)
    when 'output' then (select title from public.os_programme_outputs where code = p_ref)
    when 'budget' then (select description from public.os_programme_budget_lines where code = p_ref)
    when 'research' then (select question from public.os_programme_research where code = p_ref)
    when 'risk' then (select title from public.os_programme_risks where code = p_ref)
    when 'milestone' then (select title from public.os_timeline_items where id = p_ref)
    when 'partner' then (select p.organisation from public.os_programme_partner_meta m join public.os_partnerships p on p.id = m.partnership_id where m.code = p_ref)
    when 'checklist' then (select item from public.os_programme_checklist_items where code = p_ref)
    when 'country_plan' then p_ref
  end
$$;

-- Records a change and everything downstream of it. Outputs are flagged "Needs revision" and get one revision task
-- each (owner = the output's owner, reviewed by the decision approvers). Tasks, milestones, budget lines and plans are
-- listed for review, without new tasks, so a change never floods the board. Nothing is published or deployed.
-- p_change appends to an existing change (a decision that also updates facts makes one change record, not several).
create or replace function public.os_programme_record_change(p_project text, p_kind text, p_ref text, p_summary text,
  p_old text, p_new text, p_reason text, p_change text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := p_change;
  r record;
  o record;
  v_task text;
  v_prog text := public.os_programme_code(p_project);
  v_reviewer text;
begin
  if v_prog is null then raise exception 'Unknown programme' using errcode = '23503'; end if;
  if v_code is null then
    insert into public.os_programme_changes (project_id, trigger_kind, trigger_ref, summary, old_value, new_value, reason, created_by)
    values (p_project, p_kind, p_ref, left(p_summary, 1000), p_old, p_new, p_reason, public.os_current_person())
    returning code into v_code;
  end if;
  select approver_person_ids[1] into v_reviewer from public.os_programmes where project_id = p_project;
  for r in select * from public.os_programme_impact(p_project, p_kind, p_ref, 4) loop
    insert into public.os_programme_change_items (change_code, kind, ref, title, depth, via, action)
    values (v_code, r.kind, r.ref, public.os_programme_ref_title(p_project, r.kind, r.ref), r.depth, r.via,
            case r.kind when 'output' then 'Revise' when 'budget' then 'Recompute' when 'milestone' then 'Re-plan' else 'Review' end)
    on conflict (change_code, kind, ref) do nothing;
    if r.kind = 'output' then
      select * into o from public.os_programme_outputs where code = r.ref and project_id = p_project;
      if o.code is not null and not exists (select 1 from public.os_programme_change_items where change_code = v_code and kind = 'output' and ref = r.ref and revision_task_id is not null) then
        update public.os_programme_outputs
           set needs_revision = true,
               approval_status = case when approval_status in ('Not started') then approval_status else 'Needs revision' end
         where code = o.code;
        insert into public.os_tasks (project_id, title, description, definition_of_done, owner_person_id, reviewer_person_id, status, priority, due_date)
        values (p_project, left('Revise ' || o.title || ' (' || v_code || ')', 300),
                'Change ' || v_code || ': ' || left(p_summary, 800) || coalesce(E'\nFrom: ' || p_old, '') || coalesce(E'\nTo: ' || p_new, '')
                  || E'\nPrepare the revised draft. Do not publish or deploy until it is approved.',
                'A revised draft of ' || o.code || ' reflects the change, its version and change summary are updated in the output register, and an approver has signed it off before anything is published.',
                o.owner_person_id, v_reviewer, 'Ready', 'P2 High', current_date + 7)
        returning id into v_task;
        insert into public.os_programme_task_meta (task_id, project_id, category, phase, deliverable, needs_approval, automatable)
        values (v_task, p_project, 'M', 2, 'Revised ' || o.output_type || ': ' || o.title, true, 'Created automatically by the change-impact workflow');
        update public.os_programme_change_items set revision_task_id = v_task where change_code = v_code and kind = 'output' and ref = r.ref;
      end if;
    end if;
  end loop;
  return v_code;
end $$;
revoke all on function public.os_programme_record_change(text, text, text, text, text, text, text, text) from public, anon, authenticated;

-- For editors: preview what a change would touch (no writes), and record a manual change (e.g. a venue confirmed).
create or replace function public.os_programme_preview_impact(p_project text, p_kind text, p_ref text)
returns table (kind text, ref text, title text, depth int, via text)
language sql stable security definer set search_path = '' as $$
  select i.kind, i.ref, public.os_programme_ref_title(p_project, i.kind, i.ref), i.depth, i.via
  from public.os_programme_impact(p_project, p_kind, p_ref, 4) i
  where public.os_programme_can_view(p_project, 'Internal')
  order by i.depth, i.kind, i.ref
$$;

create or replace function public.os_programme_register_change(p_project text, p_kind text, p_ref text, p_summary text,
  p_old text default null, p_new text default null, p_reason text default null) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.os_programme_can_edit(p_project) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_summary is null or length(trim(p_summary)) < 3 then raise exception 'Say what changed' using errcode = '22023'; end if;
  return public.os_programme_record_change(p_project, p_kind, p_ref, p_summary, p_old, p_new, p_reason);
end $$;

-- ── Facts: versions and change impact on every change of value or status ───────────────────────────────────────────

create or replace function public.os_programme_facts_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(public.os_current_person(), new.updated_by);
  if tg_op = 'UPDATE' then
    new.project_id := old.project_id; new.key := old.key;
    if new.value is distinct from old.value or new.status is distinct from old.status then
      new.version := old.version + 1;
      if new.status = 'Decided' and coalesce(current_setting('os.programme_deciding', true), '') <> 'on'
         and not public.os_programme_is_approver(new.project_id) and not public.os_caller_is_privileged() then
        raise exception 'Only a decision approver can mark a fact Decided' using errcode = '42501';
      end if;
    else
      new.version := old.version;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_programme_facts_before() from public, anon, authenticated;

create or replace function public.os_programme_facts_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_reason text := nullif(current_setting('os.programme_reason', true), '');
  v_change text := nullif(current_setting('os.programme_change', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.os_programme_fact_versions (project_id, key, version, value, status, source, reason, changed_by)
    values (new.project_id, new.key, new.version, new.value, new.status, new.source, 'Initial record', new.updated_by);
    return null;
  end if;
  if new.version = old.version then return null; end if;
  v_change := public.os_programme_record_change(new.project_id, 'fact', new.key,
    new.label || ': ' || old.value || ' (' || old.status || ') → ' || new.value || ' (' || new.status || ')',
    old.value, new.value, v_reason, v_change);
  insert into public.os_programme_fact_versions (project_id, key, version, value, status, source, reason, change_code, changed_by)
  values (new.project_id, new.key, new.version, new.value, new.status, new.source, v_reason, v_change, new.updated_by);
  return null;
end $$;
revoke all on function public.os_programme_facts_after() from public, anon, authenticated;

drop trigger if exists os_programme_facts_a_before on public.os_programme_facts;
create trigger os_programme_facts_a_before before insert or update on public.os_programme_facts for each row execute function public.os_programme_facts_before();
drop trigger if exists os_programme_facts_b_after on public.os_programme_facts;
create trigger os_programme_facts_b_after after insert or update on public.os_programme_facts for each row execute function public.os_programme_facts_after();

-- Set a fact with a reason (the reason lands in the version history and the change record).
create or replace function public.os_programme_set_fact(p_project text, p_key text, p_value text, p_status text, p_reason text,
  p_source text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.os_programme_facts; v_change text;
begin
  if not public.os_programme_can_edit(p_project) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'Give a reason for the change' using errcode = '22023'; end if;
  perform set_config('os.programme_reason', p_reason, true);
  update public.os_programme_facts set value = p_value, status = coalesce(p_status, status), source = coalesce(p_source, source)
   where project_id = p_project and key = p_key returning * into f;
  if f.key is null then raise exception 'Unknown fact %', p_key using errcode = '22023'; end if;
  select change_code into v_change from public.os_programme_fact_versions where project_id = p_project and key = p_key and version = f.version;
  perform set_config('os.programme_reason', '', true);
  return jsonb_build_object('key', f.key, 'version', f.version, 'change', v_change);
end $$;

-- ── The decision workflow ──────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.os_programme_decide(p_code text, p_action text, p_option text default null,
  p_text text default null, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d public.os_programme_decisions;
  opt jsonb;
  k text;
  v text;
  me text := public.os_current_person();
  approver boolean;
  editor boolean;
  v_status text;
  v_final text;
  v_od text;
  v_change text;
  v_note text := nullif(trim(coalesce(p_reason, p_text, '')), '');
  t record;
begin
  select * into d from public.os_programme_decisions where code = p_code for update;
  if d.code is null or not public.os_programme_can_view(d.project_id, d.sensitivity) then
    raise exception 'Unknown decision' using errcode = '22023';
  end if;
  approver := public.os_programme_is_approver(d.project_id);
  editor := public.os_programme_can_edit(d.project_id);
  if p_action in ('approve_recommendation', 'select_option', 'custom', 'defer', 'reject_option', 'reopen', 'not_applicable', 'request_research') and not approver then
    raise exception 'Only the programme''s decision approvers can do this' using errcode = '42501';
  end if;
  if p_action in ('comment', 'needs_external', 'awaiting_approval') and not (approver or editor) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if d.status = 'Decided' and p_action not in ('comment', 'reopen') then
    raise exception 'Already decided. Reopen it first.' using errcode = '22023';
  end if;
  perform set_config('os.programme_deciding', 'on', true);
  v_status := d.status;

  if p_action in ('approve_recommendation', 'select_option') then
    k := case when p_action = 'approve_recommendation' then d.recommended_option else p_option end;
    if k is null then raise exception 'There is no recommended option to approve' using errcode = '22023'; end if;
    select o into opt from jsonb_array_elements(d.options) o where o ->> 'key' = k;
    if opt is null then raise exception 'Unknown option %', k using errcode = '22023'; end if;
    if coalesce((opt ->> 'rejected')::boolean, false) then raise exception 'That option was rejected' using errcode = '22023'; end if;
    v_final := (opt ->> 'label') || coalesce('. ' || nullif(opt ->> 'summary', ''), '');
    if p_text is not null and length(trim(p_text)) > 0 then v_final := v_final || ' Note: ' || trim(p_text); end if;
    v_note := coalesce(nullif(trim(coalesce(p_reason, '')), ''),
                       case when p_action = 'approve_recommendation' then 'Approved the recommendation: ' || coalesce(d.recommendation, v_final) end);
    if v_note is null then raise exception 'Give the reason for this decision' using errcode = '22023'; end if;
    v_status := 'Decided';
  elsif p_action = 'custom' then
    if p_text is null or length(trim(p_text)) < 3 then raise exception 'Write the decision' using errcode = '22023'; end if;
    if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'Give the reason for this decision' using errcode = '22023'; end if;
    k := 'custom'; v_final := trim(p_text); v_note := trim(p_reason); v_status := 'Decided';
  elsif p_action = 'request_research' then v_status := 'Needs Research';
  elsif p_action = 'needs_external' then v_status := 'Needs External Confirmation';
  elsif p_action = 'awaiting_approval' then v_status := 'Awaiting Approval';
  elsif p_action = 'defer' then v_status := 'Revisit Later';
  elsif p_action = 'not_applicable' then v_status := 'Not Applicable';
  elsif p_action = 'reopen' then
    if d.status <> 'Decided' and d.status <> 'Not Applicable' then raise exception 'Only a decided item can be reopened' using errcode = '22023'; end if;
    if v_note is null then raise exception 'Say why it is reopened' using errcode = '22023'; end if;
    v_status := 'Pending Decision';
  elsif p_action = 'reject_option' then
    if p_option is null or not exists (select 1 from jsonb_array_elements(d.options) o where o ->> 'key' = p_option) then
      raise exception 'Unknown option %', p_option using errcode = '22023';
    end if;
    update public.os_programme_decisions
       set options = (select jsonb_agg(case when o ->> 'key' = p_option then o || jsonb_build_object('rejected', true, 'rejected_note', v_note) else o end order by n)
                      from jsonb_array_elements(d.options) with ordinality as x(o, n)),
           recommended_option = case when recommended_option = p_option then null else recommended_option end
     where code = d.code;
  elsif p_action = 'comment' then
    if v_note is null then raise exception 'Write a comment' using errcode = '22023'; end if;
  else
    raise exception 'Unknown action %', p_action using errcode = '22023';
  end if;

  insert into public.os_programme_decision_log (decision_code, action, option_key, note, status_before, status_after, person_id)
  values (d.code, p_action, coalesce(k, p_option), coalesce(v_note, p_text), d.status, v_status, me);

  if v_status = 'Decided' then
    insert into public.os_decisions (company_code, division_id, project_id, decision, rationale, changes, decided_by, decided_on, status, source_link, sensitivity)
    select p.company_code, p.division_id, p.id, left(d.code || ' ' || d.title || ': ' || v_final, 2000), v_note,
           'Recorded from the programme decision register', me, current_date, 'Approved', '/os/gif/decisions/' || d.code, d.sensitivity
    from public.os_projects p where p.id = d.project_id
    returning id into v_od;
    update public.os_programme_decisions
       set status = 'Decided', final_option = k, final_decision = v_final, decision_reason = v_note,
           decided_by = me, decided_on = current_date, os_decision_id = v_od
     where code = d.code;
    v_change := public.os_programme_record_change(d.project_id, 'decision', d.code, d.code || ' decided: ' || v_final, d.status, v_final, v_note);
    -- Facts the chosen option sets: updated as Decided, versioned, and added to the same change record.
    if opt is not null and jsonb_typeof(opt -> 'fact_updates') = 'object' then
      perform set_config('os.programme_change', v_change, true);
      perform set_config('os.programme_reason', d.code || ': ' || v_note, true);
      for k, v in select * from jsonb_each_text(opt -> 'fact_updates') loop
        update public.os_programme_facts set value = v, status = 'Decided', source_decision = d.code, source = 'Decision ' || d.code
         where project_id = d.project_id and key = k;
      end loop;
      perform set_config('os.programme_change', '', true);
      perform set_config('os.programme_reason', '', true);
    end if;
    -- Tasks that were waiting for decisions: released once none of their linked decisions is still open.
    for t in select m.task_id, m.code from public.os_programme_links l
             join public.os_programme_task_meta m on m.code = l.to_ref and m.project_id = l.project_id
             where l.project_id = d.project_id and l.from_kind = 'decision' and l.from_ref = d.code and l.to_kind = 'task' and m.waiting_on = 'decision'
    loop
      if not exists (select 1 from public.os_programme_links l2 join public.os_programme_decisions d2 on d2.code = l2.from_ref
                     where l2.project_id = d.project_id and l2.from_kind = 'decision' and l2.to_kind = 'task' and l2.to_ref = t.code
                       and d2.status not in ('Decided', 'Not Applicable')) then
        update public.os_programme_task_meta set waiting_on = null where task_id = t.task_id;
      end if;
    end loop;
  elsif p_action = 'reopen' then
    update public.os_decisions set status = 'Superseded', changes = coalesce(changes || E'\n', '') || 'Reopened ' || current_date || ': ' || v_note
     where id = d.os_decision_id;
    update public.os_programme_decisions
       set status = 'Pending Decision', final_option = null, final_decision = null, decision_reason = null,
           decided_by = null, decided_on = null, os_decision_id = null
     where code = d.code;
    v_change := public.os_programme_record_change(d.project_id, 'decision', d.code, d.code || ' reopened: ' || v_note, d.final_decision, null, v_note);
  elsif v_status is distinct from d.status then
    update public.os_programme_decisions set status = v_status where code = d.code;
  end if;
  perform set_config('os.programme_deciding', '', true);
  return jsonb_build_object('code', d.code, 'status', v_status, 'os_decision', v_od, 'change', v_change);
end $$;

-- ── Live recruitment numbers from the GIF engine (aggregates only, no personal data) ──────────────────────────────

create or replace function public.os_programme_live_stats(p_project text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  cohort text;
  out jsonb := '{}'::jsonb;
  j jsonb;
begin
  if not public.os_programme_can_view(p_project, 'Internal') then return null; end if;
  select gif_cohort_id into cohort from public.os_programmes where project_id = p_project;
  if cohort is null or to_regclass('gif.applications') is null then
    return jsonb_build_object('available', false);
  end if;
  execute $q$ select coalesce(jsonb_object_agg(pathway || ':' || status, n), '{}'::jsonb) from (
      select pathway, status, count(*) n from gif.applications where cohort_id = $1 and withdrawn_at is null group by 1, 2) x $q$
    into j using cohort;
  out := out || jsonb_build_object('applications_by_pathway_status', j);
  execute $q$ select count(*) from gif.participants where cohort_id = $1 and withdrawn_at is null $q$ into j using cohort;
  out := out || jsonb_build_object('participants', j);
  execute $q$ select count(*) from gif.participants where cohort_id = $1 and withdrawn_at is null and seat_status = 'confirmed' $q$ into j using cohort;
  out := out || jsonb_build_object('seats_confirmed', j);
  if public.os_programme_is_approver(p_project) or public.os_is_founder() then
    execute $q$ select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (
        select p.currency, sum(p.amount) total from gif.payments p join gif.applications a on a.id = p.application_id
        where a.cohort_id = $1 and p.paid_at is not null and not coalesce(p.is_duplicate, false) group by 1) x $q$
      into j using cohort;
    out := out || jsonb_build_object('paid_by_currency', j);
  end if;
  return out || jsonb_build_object('available', true, 'as_of', now());
exception when others then
  return jsonb_build_object('available', false, 'error', sqlstate);
end $$;

-- ── Task view: OS task + programme metadata + the programme status vocabulary ──────────────────────────────────────

create or replace view public.os_programme_tasks with (security_invoker = true) as
select t.id as task_id, m.code, m.project_id, t.title, t.description, t.definition_of_done, m.category, m.phase, m.country,
       t.priority, t.status as os_status,
       case t.status when 'Done' then 'Completed' when 'Cancelled' then 'Cancelled' when 'Blocked' then 'Blocked'
                     when 'In Review' then 'Under Review' when 'In Progress' then 'In Progress'
                     else case m.waiting_on when 'decision' then 'Waiting for Decision' when 'external' then 'Waiting for External Party' else 'Not Started' end
       end as programme_status,
       t.owner_person_id, t.reviewer_person_id, t.start_date, t.due_date, t.blocker,
       m.supporting, m.external_dependency, m.effort_hours, m.deliverable, m.needs_core, m.local_support, m.needs_vendor,
       m.needs_approval, m.automatable, m.simplify, m.waiting_on, m.critical_path,
       (t.due_date < current_date and t.status not in ('Done', 'Cancelled')) as overdue
from public.os_tasks t join public.os_programme_task_meta m on m.task_id = t.id;

-- ── Row level security and privileges ──────────────────────────────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['os_programmes', 'os_programme_facts', 'os_programme_fact_versions', 'os_programme_decisions',
    'os_programme_decision_log', 'os_programme_research', 'os_programme_risks', 'os_programme_budget_lines', 'os_programme_outputs',
    'os_programme_country_plans', 'os_programme_checklist_items', 'os_programme_run_sheet', 'os_programme_team',
    'os_programme_workstreams', 'os_programme_task_meta', 'os_programme_partner_meta', 'os_programme_findings',
    'os_programme_links', 'os_programme_changes', 'os_programme_change_items']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
revoke all on public.os_programme_tasks from anon, authenticated;
grant select on public.os_programme_tasks to authenticated;

-- Read: by the project and the row's sensitivity.
do $$
declare r record;
begin
  for r in select * from (values
    ('os_programmes', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_facts', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_fact_versions', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_decisions', 'public.os_programme_can_view(project_id, sensitivity)'),
    ('os_programme_decision_log', 'exists (select 1 from public.os_programme_decisions d where d.code = decision_code and public.os_programme_can_view(d.project_id, d.sensitivity))'),
    ('os_programme_research', 'public.os_programme_can_view(project_id, sensitivity)'),
    ('os_programme_risks', 'public.os_programme_can_view(project_id, sensitivity)'),
    ('os_programme_budget_lines', 'public.os_programme_can_view(project_id, sensitivity)'),
    ('os_programme_outputs', 'public.os_programme_can_view(project_id, sensitivity)'),
    ('os_programme_country_plans', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_checklist_items', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_run_sheet', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_team', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_workstreams', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_task_meta', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_partner_meta', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_findings', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_links', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_changes', 'public.os_programme_can_view(project_id, ''Internal'')'),
    ('os_programme_change_items', 'exists (select 1 from public.os_programme_changes c where c.code = change_code and public.os_programme_can_view(c.project_id, ''Internal''))')
  ) as v(tbl, cond)
  loop
    execute format('drop policy if exists %I on public.%I', r.tbl || '_read', r.tbl);
    execute format('create policy %I on public.%I for select to authenticated using (%s)', r.tbl || '_read', r.tbl, r.cond);
  end loop;
end $$;

-- Write: project editors (founders, the project's division, project members who are staff) edit the working registers.
-- Facts, decisions, the team allocation and workstream ownership have stricter rules (below).
do $$
declare t text;
begin
  foreach t in array array['os_programme_research', 'os_programme_risks', 'os_programme_budget_lines', 'os_programme_outputs',
    'os_programme_country_plans', 'os_programme_checklist_items', 'os_programme_run_sheet', 'os_programme_task_meta',
    'os_programme_partner_meta', 'os_programme_findings', 'os_programme_links']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.os_programme_can_edit(project_id)) with check (public.os_programme_can_edit(project_id))', t || '_write', t);
  end loop;
end $$;

grant insert (project_id, code, question, why_it_matters, country, info_required, source_type, owner_person_id, status, findings, source_links, verified_on, reverify_on, due_date, sensitivity, sort),
      update (question, why_it_matters, country, info_required, source_type, owner_person_id, status, findings, source_links, verified_on, reverify_on, due_date, sensitivity, sort),
      delete on public.os_programme_research to authenticated;
grant insert (project_id, code, title, description, category, country, likelihood, impact, prevention, mitigation, contingency, escalation, owner_person_id, review_on, status, decide_before, sensitivity, sort),
      update (title, description, category, country, likelihood, impact, prevention, mitigation, contingency, escalation, owner_person_id, review_on, status, decide_before, sensitivity, sort),
      delete on public.os_programme_risks to authenticated;
grant insert (project_id, code, section, category, country, activity, description, basis, currency, unit_amount, quantity, unit_fact, quantity_fact, amount_idr, owner_person_id, notes, sensitivity, sort),
      update (section, category, country, activity, description, basis, currency, unit_amount, quantity, unit_fact, quantity_fact, amount_idr, owner_person_id, notes, sensitivity, sort),
      delete on public.os_programme_budget_lines to authenticated;
grant insert (project_id, code, title, output_type, audience, location, os_document_id, owner_person_id, version, approval_status, needs_revision, last_updated, updated_by, previous_version, change_summary, notes, sensitivity, sort),
      update (title, output_type, audience, location, os_document_id, owner_person_id, version, approval_status, needs_revision, last_updated, updated_by, previous_version, change_summary, notes, sensitivity, sort),
      delete on public.os_programme_outputs to authenticated;
grant insert, update (status, known, open_items, local_support, lead_person_id, sort) on public.os_programme_country_plans to authenticated;
grant insert (project_id, code, checklist, item, country, owner_person_id, due_date, timing, status, prepare_before_event, notes, sort),
      update (checklist, item, country, owner_person_id, due_date, timing, status, prepare_before_event, notes, sort),
      delete on public.os_programme_checklist_items to authenticated;
grant insert (project_id, code, day, country, starts, ends, activity, location, lead_person_id, local_support, status, notes, sort),
      update (day, country, starts, ends, activity, location, lead_person_id, local_support, status, notes, sort),
      delete on public.os_programme_run_sheet to authenticated;
grant insert (task_id, project_id, code, category, phase, country, supporting, external_dependency, effort_hours, deliverable, needs_core, local_support, needs_vendor, needs_approval, automatable, simplify, waiting_on, critical_path),
      update (category, phase, country, supporting, external_dependency, effort_hours, deliverable, needs_core, local_support, needs_vendor, needs_approval, automatable, simplify, waiting_on, critical_path)
  on public.os_programme_task_meta to authenticated;
grant insert (partnership_id, project_id, code, country, city, party_kind, support_types, status, supervisor_person_id),
      update (country, city, party_kind, support_types, status, supervisor_person_id) on public.os_programme_partner_meta to authenticated;
grant insert (project_id, code, title, detail, evidence, severity, proposed_action, decision_code, status, sort),
      update (title, detail, evidence, severity, proposed_action, decision_code, status, sort) on public.os_programme_findings to authenticated;
grant insert, delete on public.os_programme_links to authenticated;

-- Facts: editors may update values (with a reason through os_programme_set_fact, or directly); only approvers set
-- "Decided" (enforced in the trigger). New facts and deletions are approver-only.
drop policy if exists os_programme_facts_update on public.os_programme_facts;
create policy os_programme_facts_update on public.os_programme_facts for update to authenticated
  using (public.os_programme_can_edit(project_id)) with check (public.os_programme_can_edit(project_id));
drop policy if exists os_programme_facts_insert on public.os_programme_facts;
create policy os_programme_facts_insert on public.os_programme_facts for insert to authenticated
  with check (public.os_programme_is_approver(project_id) and status <> 'Decided');
grant insert (project_id, key, label, category, value, unit, status, public_facing, source, notes, sort),
      update (label, value, unit, status, public_facing, source, notes, sort) on public.os_programme_facts to authenticated;

-- Decisions: editors draft and refine them; answering goes only through os_programme_decide (guard trigger).
drop policy if exists os_programme_decisions_insert on public.os_programme_decisions;
create policy os_programme_decisions_insert on public.os_programme_decisions for insert to authenticated
  with check (public.os_programme_can_edit(project_id) and status = 'Pending Decision');
drop policy if exists os_programme_decisions_update on public.os_programme_decisions;
create policy os_programme_decisions_update on public.os_programme_decisions for update to authenticated
  using (public.os_programme_can_edit(project_id)) with check (public.os_programme_can_edit(project_id));
grant insert (project_id, code, title, question, background, why_it_matters, current_situation, evidence, options, recommended_option,
              recommendation, info_needed, delay_consequence, dependencies, priority, phase, suggested_deadline, deadline_basis, owner_person_id, sensitivity, sort),
      update (title, question, background, why_it_matters, current_situation, evidence, options, recommended_option, recommendation,
              info_needed, delay_consequence, dependencies, priority, phase, suggested_deadline, deadline_basis, owner_person_id, sensitivity, sort)
  on public.os_programme_decisions to authenticated;

-- Team allocation and workstream owners: proposed by editors, approved by an approver.
drop policy if exists os_programme_team_write on public.os_programme_team;
create policy os_programme_team_write on public.os_programme_team for all to authenticated
  using (public.os_programme_can_edit(project_id))
  with check (public.os_programme_can_edit(project_id) and (status <> 'Approved' or public.os_programme_is_approver(project_id)));
grant insert (project_id, person_id, programme_role, accountable_for, supports, approves, escalates_to, country_lead, on_site_role, capacity_note, basis, status, travelling),
      update (programme_role, accountable_for, supports, approves, escalates_to, country_lead, on_site_role, capacity_note, basis, status, travelling)
  on public.os_programme_team to authenticated;
drop policy if exists os_programme_workstreams_write on public.os_programme_workstreams;
create policy os_programme_workstreams_write on public.os_programme_workstreams for all to authenticated
  using (public.os_programme_can_edit(project_id))
  with check (public.os_programme_can_edit(project_id) and (status <> 'Approved' or public.os_programme_is_approver(project_id)));
grant insert (project_id, letter, name, accountable_person_id, support_person_ids, local_support, status),
      update (name, accountable_person_id, support_person_ids, local_support, status) on public.os_programme_workstreams to authenticated;

-- Change items: editors tick them off. Change records: approvers close them.
drop policy if exists os_programme_change_items_update on public.os_programme_change_items;
create policy os_programme_change_items_update on public.os_programme_change_items for update to authenticated
  using (exists (select 1 from public.os_programme_changes c where c.code = change_code and public.os_programme_can_edit(c.project_id)))
  with check (exists (select 1 from public.os_programme_changes c where c.code = change_code and public.os_programme_can_edit(c.project_id)));
grant update (status) on public.os_programme_change_items to authenticated;
drop policy if exists os_programme_changes_update on public.os_programme_changes;
create policy os_programme_changes_update on public.os_programme_changes for update to authenticated
  using (public.os_programme_can_edit(project_id))
  with check (public.os_programme_can_edit(project_id) and (status <> 'Closed' or public.os_programme_is_approver(project_id)));
grant update (status, closed_at) on public.os_programme_changes to authenticated;

-- Functions: helpers and the public RPCs for signed-in staff only; internal ones stay revoked.
revoke all on function public.os_programme_can_view(text, text), public.os_programme_can_edit(text), public.os_programme_is_approver(text),
  public.os_programme_code(text), public.os_programme_assign_code(), public.os_programme_impact(text, text, text, int),
  public.os_programme_ref_title(text, text, text), public.os_programme_preview_impact(text, text, text),
  public.os_programme_register_change(text, text, text, text, text, text, text), public.os_programme_set_fact(text, text, text, text, text, text),
  public.os_programme_decide(text, text, text, text, text), public.os_programme_live_stats(text), public.os_programme_touch()
  from public, anon, authenticated;
grant execute on function public.os_programme_can_view(text, text), public.os_programme_can_edit(text), public.os_programme_is_approver(text),
  public.os_programme_preview_impact(text, text, text), public.os_programme_register_change(text, text, text, text, text, text, text),
  public.os_programme_set_fact(text, text, text, text, text, text), public.os_programme_decide(text, text, text, text, text),
  public.os_programme_live_stats(text)
  to authenticated;

-- Audit: decisions, facts and the team allocation are founder-visible in the audit log.
do $$
declare t text;
begin
  foreach t in array array['os_programme_decisions', 'os_programme_facts', 'os_programme_team', 'os_programme_workstreams']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.os_audit_row()', t || '_audit', t);
  end loop;
end $$;
