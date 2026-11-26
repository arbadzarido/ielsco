-- Company OS as the operating system: departments, the 2026 HQ structure, project portfolio, Growth/Marketing/Creative
-- and Business workflows. Additive and re-runnable. Nothing is deleted.
--
--   1. Divisions: two departments (Operations: Operations, Business, People; Growth: Growth, Marketing, Creative).
--      Partnerships is renamed Business (same id DIV-06, same code PAR, so every record and rule keeps working).
--      Marketing is a new division DIV-10 (MKT). Community (DIV-01) and Courses & Learning (DIV-07) are marked inactive:
--      they keep their rows and history, but no longer appear as workspaces. Neither has a task today.
--   2. Tasks: an optional department, kept consistent with the division by a trigger.
--   3. Partnerships: one of five categories (media, corporate, academic, community, recruitment).
--   4. Growth registers: KOL/UGC creators and growth experiments (Growth division, Internal by default).
--   5. Requests: routes from Marketing to Creative (content brief) and to Growth (distribution), and creative requests
--      from Operations and Business. Routes from the retired divisions are switched off.
--   6. Portfolio: the four HQ projects get a portfolio key; Elco AI and IELS Course get a project (none existed).
--   7. os_portfolio_live_stats(key): aggregate counts only, for staff. No personal data leaves the source tables.

-- ── 1. Departments and divisions ──────────────────────────────────────────────────────────────────────────────────
alter table public.os_divisions add column if not exists department text;
alter table public.os_divisions add column if not exists active boolean not null default true;
alter table public.os_divisions add column if not exists purpose text;
do $$ begin
  alter table public.os_divisions drop constraint if exists os_divisions_department_check;
  alter table public.os_divisions add constraint os_divisions_department_check check (department is null or department in ('operations', 'growth'));
end $$;

insert into public.os_divisions (id, code, name, privacy) values ('DIV-10', 'MKT', 'Marketing', 'open') on conflict (id) do nothing;

update public.os_divisions set name = 'Business' where id = 'DIV-06' and name = 'Partnerships';
update public.os_divisions set department = 'operations' where id in ('DIV-02', 'DIV-05', 'DIV-06') and department is null;
update public.os_divisions set department = 'growth' where id in ('DIV-03', 'DIV-04', 'DIV-10') and department is null;
update public.os_divisions set active = false where id in ('DIV-01', 'DIV-07');
update public.os_divisions set purpose = v.purpose from (values
  ('DIV-02', 'Execution and coordination across projects: plans, milestones, logistics, SOPs, workflows, reporting and operational risk.'),
  ('DIV-05', 'HR and people operations: recruitment, onboarding, team records and engagement, plus delegate and community care.'),
  ('DIV-06', 'Partnerships in five categories (media, corporate, academic, community, recruitment), from first contact to written confirmation.'),
  ('DIV-03', 'Social media distribution, audience growth, KOL and UGC creators, growth experiments and performance monitoring.'),
  ('DIV-10', 'Content strategy: content pillars, the content calendar, campaigns, content briefs to Creative, review and approval.'),
  ('DIV-04', 'Design and creative production: requests, the production queue, revisions, approval and final asset delivery.')
) v(id, purpose) where public.os_divisions.id = v.id and public.os_divisions.purpose is null;

-- The Marketing Manager (agreement IEL-AGR-0006) leads Marketing. Her Growth membership is left as it is; a founder can
-- remove it in Admin once the handover is agreed.
update public.os_divisions set owner_person_id = 'PPL-0008'
 where id = 'DIV-10' and owner_person_id is null and exists (select 1 from public.os_people where id = 'PPL-0008');
insert into public.os_person_divisions (person_id, division_id, is_manager)
select 'PPL-0008', 'DIV-10', true where exists (select 1 from public.os_people where id = 'PPL-0008')
on conflict do nothing;

-- Inactive divisions are not workspaces any more (founders still see their records through every other screen).
create or replace function public.os_my_workspaces()
returns table (division_id text, code text, name text, privacy text, access text, roles text[], is_member boolean, is_manager boolean, is_lead boolean)
language sql stable security definer set search_path = '' as $$
  select d.id, d.code, d.name, d.privacy,
         case when public.os_workspace_access(d.id, 'edit') then 'edit' when public.os_workspace_access(d.id, 'view') then 'view' else 'none' end,
         coalesce(array(select r.role from public.os_workspace_roles r where r.person_id = public.os_current_person() and r.division_id = d.id
                          and r.revoked_at is null and (r.expires_at is null or r.expires_at > now()) order by r.role), '{}'),
         public.os_in_division(d.id), public.os_manages_division(d.id), public.os_workspace_lead(d.id)
  from public.os_divisions d
  where public.os_current_person() is not null and public.os_is_staff() and d.active
  order by d.id
$$;

-- ── 2. Task department ─────────────────────────────────────────────────────────────────────────────────────────────
alter table public.os_tasks add column if not exists department text;
do $$ begin
  alter table public.os_tasks drop constraint if exists os_tasks_department_check;
  alter table public.os_tasks add constraint os_tasks_department_check check (department is null or department in ('operations', 'growth'));
end $$;
create index if not exists os_tasks_department_idx on public.os_tasks (department) where department is not null;

-- A division always decides the department. Choosing another department clears a division that doesn't belong to it.
create or replace function public.os_tasks_department_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare dep text;
begin
  if new.division_id is not null then
    select department into dep from public.os_divisions where id = new.division_id;
    if tg_op = 'UPDATE' and new.department is distinct from old.department and new.division_id is not distinct from old.division_id
       and dep is distinct from new.department then
      new.division_id := null;            -- the person changed the department: the old division no longer fits
      new.subdivision_id := null;
    elsif dep is not null then
      new.department := dep;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_tasks_department_rule() from public, anon, authenticated;
drop trigger if exists os_tasks_b_department on public.os_tasks;
create trigger os_tasks_b_department before insert or update on public.os_tasks for each row execute function public.os_tasks_department_rule();
grant insert (department), update (department) on public.os_tasks to authenticated;

-- Existing tasks: department from their division. Row triggers are paused for this one statement so no other column
-- (updated_at, notifications, activity) changes; only `department` is written.
alter table public.os_tasks disable trigger user;
update public.os_tasks t set department = d.department from public.os_divisions d
 where t.division_id = d.id and t.department is null and d.department is not null;
alter table public.os_tasks enable trigger user;

-- ── 3. Partnership categories ──────────────────────────────────────────────────────────────────────────────────────
alter table public.os_partnerships add column if not exists partner_category text;
do $$ begin
  alter table public.os_partnerships drop constraint if exists os_partnerships_category_check;
  alter table public.os_partnerships add constraint os_partnerships_category_check
    check (partner_category is null or partner_category in ('media', 'corporate', 'academic', 'community', 'recruitment'));
end $$;
grant insert (partner_category), update (partner_category) on public.os_partnerships to authenticated;
-- Only unambiguous types are classified; coordinators and vendors stay uncategorised for Business to decide.
alter table public.os_partnerships disable trigger user;
update public.os_partnerships set partner_category = 'academic'
 where partner_category is null and opportunity_type in ('GIF 2027: University', 'GIF 2027: Institution');
update public.os_partnerships set partner_category = 'community'
 where partner_category is null and opportunity_type in ('GIF 2027: Student organisation', 'GIF 2027: Youth community');
alter table public.os_partnerships enable trigger user;

-- ── 4. Growth registers ────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_growth_creators (
  id               bigint generated always as identity primary key,
  company_code     text not null references public.os_companies (code),
  division_id      text not null default 'DIV-03' references public.os_divisions (id),
  name             text not null check (length(trim(name)) between 1 and 160),
  handle           text check (handle is null or length(handle) <= 160),
  platform         text not null default 'Instagram' check (platform in ('Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'X', 'Other')),
  creator_type     text not null default 'KOL' check (creator_type in ('KOL', 'UGC', 'Community')),
  niche            text check (niche is null or length(niche) <= 200),
  followers        int check (followers is null or followers >= 0),
  project_id       text references public.os_projects (id) on delete set null,
  status           text not null default 'Researched' check (status in ('Researched', 'Shortlisted', 'Contacted', 'In talks', 'Agreed', 'Content live', 'Completed', 'Declined', 'Paused')),
  owner_person_id  text references public.os_people (id) on delete set null,
  last_contact_on  date,
  next_follow_up   date,
  fee_note         text check (fee_note is null or length(fee_note) <= 300),   -- terms are escalated, never agreed here
  deliverables     text check (deliverables is null or length(deliverables) <= 1000),
  results          text check (results is null or length(results) <= 1000),
  profile_url      text check (profile_url is null or profile_url ~ '^https?://'),
  notes            text check (notes is null or length(notes) <= 2000),
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists os_growth_creators_status_idx on public.os_growth_creators (status, next_follow_up);

create table if not exists public.os_growth_experiments (
  id               bigint generated always as identity primary key,
  company_code     text not null references public.os_companies (code),
  division_id      text not null default 'DIV-03' references public.os_divisions (id),
  title            text not null check (length(trim(title)) between 3 and 200),
  hypothesis       text check (hypothesis is null or length(hypothesis) <= 1000),
  channel          text check (channel is null or length(channel) <= 80),
  metric           text check (metric is null or length(metric) <= 200),
  baseline         text check (baseline is null or length(baseline) <= 200),
  result           text check (result is null or length(result) <= 1000),
  project_id       text references public.os_projects (id) on delete set null,
  status           text not null default 'Idea' check (status in ('Idea', 'Planned', 'Running', 'Analysing', 'Won', 'Lost', 'Inconclusive', 'Stopped')),
  owner_person_id  text references public.os_people (id) on delete set null,
  start_date       date,
  end_date         date,
  sensitivity      text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential')),
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create or replace function public.os_growth_touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.created_by := public.os_current_person(); new.created_at := now();
  else new.created_by := old.created_by; new.created_at := old.created_at; end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.os_growth_touch() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['os_growth_creators', 'os_growth_experiments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.os_growth_touch()', t || '_touch', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.os_can_view(company_code, division_id, sensitivity, ''division'', division_id) or (public.os_is_staff() and owner_person_id = public.os_current_person()))', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.os_can_create(company_code, division_id, sensitivity))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.os_can_edit(company_code, division_id, sensitivity, ''division'', division_id) or (public.os_is_staff() and owner_person_id = public.os_current_person())) with check (public.os_can_create(company_code, division_id, sensitivity) or (public.os_is_staff() and owner_person_id = public.os_current_person()))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.os_can_edit(company_code, division_id, sensitivity, ''division'', division_id))', t || '_delete', t);
  end loop;
end $$;

-- ── 5. Request routes ──────────────────────────────────────────────────────────────────────────────────────────────
insert into public.os_request_types (code, name, description, from_division_id, to_division_id, needs_approval, sort_order) values
  ('content_brief', 'Content brief', 'A structured content brief from Marketing for Creative to produce: objective, audience, key message, format, specs, assets and deadline.', 'DIV-10', 'DIV-04', false, 0),
  ('distribution_plan', 'Distribution request', 'Approved content from Marketing for Growth to schedule and distribute across channels, KOLs and UGC creators.', 'DIV-10', 'DIV-03', false, 7),
  ('creative_operations', 'Creative request (Operations)', 'Design or media for a project, event or document from Operations.', 'DIV-02', 'DIV-04', false, 8),
  ('creative_business', 'Creative request (Business)', 'Proposal decks, partner materials and co-branded assets from Business.', 'DIV-06', 'DIV-04', false, 9)
on conflict (code) do nothing;
update public.os_request_types set active = false where code in ('marketing_collaboration', 'student_engagement') and active;

-- Requests already name their project through related_type / related_id (os_request_submit, 20261115000000).

-- ── 6. Portfolio ───────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.os_projects add column if not exists portfolio_key text;
alter table public.os_projects add column if not exists portfolio_rank int;
do $$ begin
  alter table public.os_projects drop constraint if exists os_projects_portfolio_key_check;
  alter table public.os_projects add constraint os_projects_portfolio_key_check check (portfolio_key is null or portfolio_key in ('circle', 'gif', 'elco', 'course'));
end $$;
create unique index if not exists os_projects_portfolio_key_idx on public.os_projects (portfolio_key) where portfolio_key is not null;

update public.os_projects set portfolio_key = 'circle', portfolio_rank = 1 where id = 'PRJ-0032' and portfolio_key is null
  and not exists (select 1 from public.os_projects where portfolio_key = 'circle');
update public.os_projects set portfolio_key = 'gif', portfolio_rank = 2 where id = 'PRJ-0033' and portfolio_key is null
  and not exists (select 1 from public.os_projects where portfolio_key = 'gif');

-- Elco AI and IELS Course had no project. Owner is the CEO until the founders name one; no dates or targets are invented.
do $$
declare pid text;
begin
  if exists (select 1 from public.os_people where id = 'PPL-0001') then
    if not exists (select 1 from public.os_projects where portfolio_key = 'elco') then
      pid := public.os_next_id('PRJ');
      insert into public.os_projects (id, company_code, name, project_type, description, owner_person_id, status, priority, start_date, sensitivity, portfolio_key, portfolio_rank, next_action)
      values (pid, 'ELC', 'Elco AI', 'Product',
              'AI English practice app (PT Elco Edukasi Berkah Indonesia): General English practice, games and TOEFL ITP / IELTS / TOEIC preparation. HQ priority #3, Dec 2026 – Aug 2027.',
              'PPL-0001', 'Active', 'P2 High', '2026-12-01', 'Internal', 'elco', 3, 'Founders confirm the project owner, PICs and 2027 targets.');
    end if;
    if not exists (select 1 from public.os_projects where portfolio_key = 'course') then
      pid := public.os_next_id('PRJ');
      insert into public.os_projects (id, company_code, name, project_type, description, owner_person_id, status, priority, start_date, sensitivity, portfolio_key, portfolio_rank, next_action)
      values (pid, 'IEL', 'IELS Course', 'Product',
              'IELScourse paid English classes: Collective (group up to 20), Studio (3–5) and One (1-on-1). HQ priority #4, Dec 2026 – Aug 2027.',
              'PPL-0001', 'Active', 'P3 Normal', '2026-12-01', 'Internal', 'course', 4, 'Create the first real cohorts and decide tutor rates.');
    end if;
  end if;
end $$;

-- ── 7. Live numbers for the portfolio dashboards ──────────────────────────────────────────────────────────────────
-- Counts only. Each block is skipped when its table is missing, so the function works in any environment.
create or replace function public.os_portfolio_live_stats(p_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare out jsonb := '{}'::jsonb; j jsonb; pid text;
begin
  if public.os_current_person() is null or not public.os_is_staff() then return null; end if;
  if p_key = 'gif' then
    select id into pid from public.os_projects where portfolio_key = 'gif';
    return coalesce(public.os_programme_live_stats(pid), jsonb_build_object('available', false));
  elsif p_key = 'circle' then
    if to_regclass('public.event_registrations') is not null then
      select coalesce(jsonb_object_agg(event_id, jsonb_build_object('registered', n, 'attended', a)), '{}'::jsonb) into j
      from (select event_id, count(*) n, count(*) filter (where attended) a from public.event_registrations where event_id like 'circle%' group by 1) x;
      out := out || jsonb_build_object('cohort_registrations', j);
    end if;
    if to_regclass('public.circle_session_checkins') is not null then
      select coalesce(jsonb_agg(jsonb_build_object('session', s, 'checkins', n) order by s desc), '[]'::jsonb) into j
      from (select session_start s, count(*) n from public.circle_session_checkins group by 1 order by 1 desc limit 12) x;
      out := out || jsonb_build_object('recent_sessions', j);
      select count(distinct user_id) into j from public.circle_session_checkins where session_start > now() - interval '30 days';
      out := out || jsonb_build_object('active_members_30d', j);
    end if;
    if to_regclass('public.circles') is not null and to_regclass('public.circle_members') is not null then
      select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'members', (select count(*) from public.circle_members m where m.circle_id = c.id)) order by c.sort), '[]'::jsonb)
        into j from public.circles c where c.status = 'active';
      out := out || jsonb_build_object('circles', j);
    end if;
  elsif p_key = 'course' then
    if to_regclass('public.course_memberships') is not null then
      select coalesce(jsonb_object_agg(product, n), '{}'::jsonb) into j
      from (select product, count(*) n from public.course_memberships where status = 'active' and period_end > now() group by 1) x;
      out := out || jsonb_build_object('active_memberships', j);
    end if;
    if to_regclass('public.course_cohorts') is not null then
      select coalesce(jsonb_agg(jsonb_build_object('product', product, 'name', name, 'status', status, 'capacity', capacity, 'starts_on', starts_on,
               'members', (select count(*) from public.course_memberships m where m.cohort_id = c.id and m.status = 'active' and m.period_end > now()))
               order by starts_on nulls last), '[]'::jsonb) into j from public.course_cohorts c where status <> 'closed';
      out := out || jsonb_build_object('cohorts', j);
    end if;
    if to_regclass('public.course_waitlist') is not null then
      select coalesce(jsonb_object_agg(product, n), '{}'::jsonb) into j
      from (select product, count(*) n from public.course_waitlist where status = 'waiting' group by 1) x;
      out := out || jsonb_build_object('waitlist', j);
    end if;
    if to_regclass('public.course_payment_orders') is not null then
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into j
      from (select status, count(*) n from public.course_payment_orders where environment = 'production' group by 1) x;
      out := out || jsonb_build_object('orders_by_status', j);
    end if;
    if to_regclass('public.tutoring_enrolments') is not null then
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into j
      from (select status, count(*) n from public.tutoring_enrolments group by 1) x;
      out := out || jsonb_build_object('one_enrolments', j);
    end if;
  elsif p_key = 'elco' then
    if to_regclass('public.elco_account_links') is not null then
      select count(*) into j from public.elco_account_links where revoked_at is null;
      out := out || jsonb_build_object('linked_accounts', j);
    end if;
    if to_regclass('public.elco_benefit_grants') is not null then
      select coalesce(jsonb_object_agg(tier, n), '{}'::jsonb) into j
      from (select tier, count(*) n from public.elco_benefit_grants where status = 'active' and (ends_at is null or ends_at > now()) group by 1) x;
      out := out || jsonb_build_object('active_benefits_by_tier', j);
    end if;
  else
    return null;
  end if;
  return out || jsonb_build_object('available', true, 'as_of', now());
exception when others then
  return jsonb_build_object('available', false, 'error', sqlstate);
end $$;
revoke all on function public.os_portfolio_live_stats(text) from public, anon;
grant execute on function public.os_portfolio_live_stats(text) to authenticated;
