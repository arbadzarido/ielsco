-- Company OS: HQ plus three business streams (IELSco, Elco AI, GIF).
--
-- Docs: docs/COMPANY-OS-STREAMS.md. Tests: tests/db/company-os-streams.pglite.mjs. Rollback:
-- supabase/manual/ROLLBACK-20261213000000-company-os-business-streams.sql (tested by the same test file).
--
-- What changes
--   * A business stream says WHAT a record is about: HQ (central management), IELSco, Elco AI or GIF. A record can
--     belong to several streams, or to none yet (shown in HQ as "not assigned"). Streams never decide who can see or
--     edit a record: sensitivity, divisions, workspace roles and grants still do, exactly as before.
--   * company_code keeps its own, narrower meaning: the legal entity (PT English Space Berkah Indonesia, PT Elco
--     Edukasi Berkah Indonesia, or HQ) whose books, letterhead, numbering and employment a record belongs to. It stays
--     required on finance, legal, number and document records, and becomes optional on operational records (projects,
--     tasks, events, meetings, decisions, announcements, partnerships, campaigns, content, product items, KPIs,
--     objectives, timeline items, requests). Existing values are kept untouched.
--   * Company membership (os_person_companies) no longer limits operational work. Every active staff member can work
--     across all streams. Membership stays as the record of which entity employs or contracts a person (HR, reviews and
--     the People Lead grant still use it).
--   * Same-company rules on links are removed: a GIF task can be linked to an IELSco event, an Elco project can carry a
--     budget booked in another entity's ledger, and so on.
--
-- Additive and reversible: new tables, a new column on existing tables, NOT NULL dropped (not data changed) on
-- operational company_code, and small, guarded patches to existing functions. Every patch is applied with
-- os_patch_function(), which refuses to run if the text it expects is not there exactly once, so it can never edit a
-- function it does not understand. No row is deleted, and existing company_code values are never rewritten.
-- Re-runnable: running it again changes nothing.

-- ── 0. Guarded function patcher (dropped at the end; the rollback brings its own copy) ────────────────────────────
create or replace function public.os_patch_function(p_fn regprocedure, p_old text, p_new text) returns void
language plpgsql set search_path = '' as $$
declare src text := pg_get_functiondef(p_fn); n_old int; n_new int;
begin
  n_old := (length(src) - length(replace(src, p_old, ''))) / greatest(length(p_old), 1);
  n_new := (length(src) - length(replace(src, p_new, ''))) / greatest(length(p_new), 1);
  if n_old = 1 then execute replace(src, p_old, p_new); return; end if;
  if n_old = 0 and n_new >= 1 then return; end if;  -- already applied
  raise exception 'os_patch_function: expected the text once in %, found it % times', p_fn, n_old;
end $$;
revoke all on function public.os_patch_function(regprocedure, text, text) from public, anon, authenticated;

-- ── 1. The streams ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_streams (
  code         text primary key check (code in ('HQ', 'IEL', 'ELC', 'GIF')),
  slug         text not null unique,
  name         text not null,
  kind         text not null check (kind in ('management', 'business')),
  description  text not null,
  sort_order   int  not null,
  -- The entity that normally books this stream's money. Information only; nothing is filled in automatically from it.
  -- GIF has none until the founders decide which entity contracts and invoices it.
  default_company_code text references public.os_companies (code)
);
insert into public.os_streams (code, slug, name, kind, description, sort_order, default_company_code) values
  ('HQ',  'hq',     'HQ',                         'management', 'Central management: governance, administration, finance, legal, people, shared resources and company-wide operations.', 0, 'HQ'),
  ('IEL', 'ielsco', 'IELSco',                     'business',   'English education, events, community and related business.', 1, 'IEL'),
  ('ELC', 'elco',   'Elco AI',                    'business',   'AI products, technology, automation and related business.', 2, 'ELC'),
  ('GIF', 'gif',    'GIF (Global Impact Fellowship)', 'business', 'GIF Summer, GIF Winter, international delegations, partnerships, sponsorships and related programmes.', 3, null)
on conflict (code) do nothing;
alter table public.os_streams enable row level security;
revoke all on public.os_streams from anon, authenticated;
grant select on public.os_streams to authenticated;
grant select, insert, update, delete on public.os_streams to service_role;
drop policy if exists os_streams_read on public.os_streams;
create policy os_streams_read on public.os_streams for select to authenticated using ((select public.os_current_person()) is not null);

-- Canonical order HQ, IEL, ELC, GIF; duplicates removed; blanks dropped. Unknown codes are kept so the check rejects them.
create or replace function public.os_streams_normalize(p text[]) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array(select s.x from (select distinct upper(trim(u)) as x from unnest(coalesce(p, '{}'::text[])) u
                                        where u is not null and trim(u) <> '') s
                        order by coalesce(array_position(array['HQ', 'IEL', 'ELC', 'GIF'], s.x), 99), s.x), '{}')
$$;
create or replace function public.os_streams_valid(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select p is not null and p <@ array['HQ', 'IEL', 'ELC', 'GIF']::text[]
     and cardinality(p) = (select count(distinct x) from unnest(p) x)
$$;
-- The stream a legacy business-unit value stood for. HQ stays HQ: it was the shared founders' office.
create or replace function public.os_company_stream(p_company text) returns text
language sql immutable set search_path = '' as $$
  select case p_company when 'HQ' then 'HQ' when 'IEL' then 'IEL' when 'ELC' then 'ELC' end
$$;
create or replace function public.os_streams_from_json(p jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'array' then public.os_streams_normalize(array(select jsonb_array_elements_text(p))) else '{}'::text[] end
$$;
-- Which streams a piece of text names. Used only to flag records for review, never to assign a stream.
create or replace function public.os_stream_hints(p text) returns text[]
language sql immutable set search_path = '' as $$
  select public.os_streams_normalize(array_remove(array[
    case when coalesce(p, '') ~* '\m(iels|ielsco)' then 'IEL' end,
    case when coalesce(p, '') ~* '\melco\M' then 'ELC' end,
    case when coalesce(p, '') ~* '(\mgif|global impact fellowship)' then 'GIF' end], null))
$$;
grant execute on function public.os_streams_normalize(text[]), public.os_streams_valid(text[]), public.os_company_stream(text),
  public.os_streams_from_json(jsonb), public.os_stream_hints(text) to authenticated, service_role;

-- ── 2. The streams column ─────────────────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_documents', 'os_announcements', 'os_decisions', 'os_meetings',
    'os_partnerships', 'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items',
    'os_requests', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements', 'os_activity'] loop
    execute format('alter table public.%I add column if not exists streams text[] not null default ''{}''', t);
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_streams_valid');
    execute format('alter table public.%I add constraint %I check (public.os_streams_valid(streams))', t, t || '_streams_valid');
    execute format('create index if not exists %I on public.%I using gin (streams)', t || '_streams_idx', t);
    execute format('comment on column public.%I.streams is %L', t,
      'Business streams this record belongs to (HQ, IEL, ELC, GIF); empty = not assigned. Never used for access.');
  end loop;
  -- Operational records no longer need a business unit. Finance, legal, numbering and documents keep their entity.
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_announcements', 'os_decisions', 'os_meetings', 'os_partnerships',
    'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items', 'os_requests'] loop
    execute format('alter table public.%I alter column company_code drop not null', t);
    execute format('comment on column public.%I.company_code is %L', t,
      'Legacy business unit, kept as history. Optional; the business stream is in streams.');
  end loop;
  -- The timeline default put every new milestone in HQ; a new milestone now has no unit unless one is given.
  alter table public.os_timeline_items alter column company_code drop default;
end $$;
comment on column public.os_documents.company_code is 'Issuing legal entity (letterhead, numbering, Drive route). The business stream is in streams.';

-- People and forms may set streams wherever they may already insert or update the record (RLS still decides).
grant insert (streams), update (streams) on public.os_projects, public.os_tasks, public.os_events, public.os_documents,
  public.os_announcements, public.os_decisions, public.os_meetings, public.os_partnerships, public.os_campaigns,
  public.os_campaign_items, public.os_product_items, public.os_kpis, public.os_objectives, public.os_timeline_items, public.os_requests
  to authenticated;

-- ── 3. Streams follow the work they belong to ─────────────────────────────────────────────────────────────────────
create or replace function public.os_entity_streams(p_type text, p_id text) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(case p_type
    when 'project' then (select streams from public.os_projects where id = p_id)
    when 'task' then (select streams from public.os_tasks where id = p_id)
    when 'event' then (select streams from public.os_events where id = p_id)
    when 'document' then (select streams from public.os_documents where id = p_id)
    when 'announcement' then (select streams from public.os_announcements where id = p_id)
    when 'decision' then (select streams from public.os_decisions where id = p_id)
    when 'meeting' then (select streams from public.os_meetings where id = p_id)
    when 'partnership' then (select streams from public.os_partnerships where id = p_id)
    when 'campaign_plan' then (select streams from public.os_campaigns where id = p_id)
    when 'campaign' then (select streams from public.os_campaign_items where id = p_id)
    when 'product' then (select streams from public.os_product_items where id = p_id)
    when 'kpi' then (select streams from public.os_kpis where id = p_id)
    when 'objective' then (select streams from public.os_objectives where id = p_id)
    when 'timeline' then (select streams from public.os_timeline_items where id = p_id)
    when 'request' then (select streams from public.os_requests where id = p_id)
    when 'budget' then (select streams from public.os_fin_budgets where id = p_id)
    when 'transaction' then (select streams from public.os_fin_transactions where id = p_id)
    when 'letter' then (select streams from public.os_letters where id = p_id)
    when 'agreement' then (select streams from public.os_agreements where id = p_id)
  end, '{}')
$$;
create or replace function public.os_entity_company(p_type text, p_id text) returns text
language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'project' then (select company_code from public.os_projects where id = p_id)
    when 'task' then (select company_code from public.os_tasks where id = p_id)
    when 'event' then (select company_code from public.os_events where id = p_id)
    when 'partnership' then (select company_code from public.os_partnerships where id = p_id)
    when 'campaign_plan' then (select company_code from public.os_campaigns where id = p_id)
    when 'request' then (select company_code from public.os_requests where id = p_id)
  end
$$;
revoke all on function public.os_entity_streams(text, text), public.os_entity_company(text, text) from public, anon, authenticated;

-- A new record with no stream takes its parent's (subtask -> task, task -> project, event -> project/campaign/
-- partnership/task/series, meeting -> project/event, content -> campaign/project, finance -> project, request link).
-- Operational records written the old way (a company but no stream, e.g. an older client) get that unit's stream.
-- Finance, legal and document records never take a stream from their legal entity.
create or replace function public.os_streams_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := to_jsonb(new); v text[]; pair text[];
begin
  v := public.os_streams_normalize(new.streams);
  if tg_op = 'INSERT' and cardinality(v) = 0 then
    foreach pair slice 1 in array array[
      array['parent_task_id', 'task'], array['project_id', 'project'], array['related_project_id', 'project'],
      array['series_id', 'event'], array['event_id', 'event'], array['campaign_id', 'campaign_plan'],
      array['partnership_id', 'partnership'], array['request_id', 'request'], array['task_id', 'task']] loop
      if nullif(r ->> pair[1], '') is not null then
        v := public.os_entity_streams(pair[2], r ->> pair[1]);
        exit when cardinality(v) > 0;
      end if;
    end loop;
    if cardinality(v) = 0 and r ->> 'related_type' in ('project', 'task', 'event', 'partnership', 'request') and r ->> 'related_id' is not null then
      v := public.os_entity_streams(r ->> 'related_type', r ->> 'related_id');
    end if;
    if cardinality(v) = 0 and tg_table_name not in ('os_documents', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements')
       and public.os_company_stream(r ->> 'company_code') is not null then
      v := array[public.os_company_stream(r ->> 'company_code')];
    end if;
  end if;
  new.streams := v;
  return new;
end $$;
revoke all on function public.os_streams_before_write() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_documents', 'os_announcements', 'os_decisions', 'os_meetings',
    'os_partnerships', 'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items',
    'os_requests', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements'] loop
    -- "zz" so it runs after each table's own rules (which may fill project_id from a parent first).
    execute format('drop trigger if exists os_zz_streams on public.%I', t);
    execute format('create trigger os_zz_streams before insert or update of streams on public.%I for each row execute function public.os_streams_before_write()', t);
  end loop;
end $$;

-- A document with no stream takes the streams of the first project it is linked to.
create or replace function public.os_document_links_streams() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.entity_type = 'project' then
    update public.os_documents d set streams = public.os_entity_streams('project', new.entity_id)
    where d.id = new.document_id and d.streams = '{}' and cardinality(public.os_entity_streams('project', new.entity_id)) > 0;
  end if;
  return null;
end $$;
revoke all on function public.os_document_links_streams() from public, anon, authenticated;
drop trigger if exists os_document_links_streams on public.os_document_links;
create trigger os_document_links_streams after insert on public.os_document_links for each row execute function public.os_document_links_streams();

-- Activity carries the streams of the record it is about, so each stream has its own feed.
create or replace function public.os_activity_streams() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if cardinality(coalesce(new.streams, '{}')) = 0 then
    new.streams := public.os_entity_streams(case new.entity_type when 'project_member' then 'project' else new.entity_type end, new.entity_id);
  end if;
  return new;
end $$;
revoke all on function public.os_activity_streams() from public, anon, authenticated;
drop trigger if exists os_activity_streams on public.os_activity;
create trigger os_activity_streams before insert on public.os_activity for each row execute function public.os_activity_streams();

-- ── 4. Business-unit membership no longer limits work ─────────────────────────────────────────────────────────────
-- Every staff member (active or onboarding, not a guest) now counts as "in" every company for operational rules. The
-- Internal / Confidential / Restricted, division, workspace-role and grant rules inside os_can_view, os_can_edit,
-- os_can_create and os_is_manager_for are unchanged.
create or replace function public.os_in_company(p_company text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff()
$$;

-- Sign-in no longer requires a company: approval (status), the verified Google identity and a live session still do.
select public.os_patch_function('public.os_current_person()'::regprocedure,
$o$    and exists (select 1 from public.os_person_companies c where c.person_id = p.id)
$o$,
$o$    -- streams: company membership is no longer required to use the Company OS
$o$);
select public.os_patch_function('public.os_access_reason(uuid)'::regprocedure,
$o$    when not exists (select 1 from public.os_person_companies c where c.person_id = (select id from p)) then 'no_company'
$o$,
$o$    -- streams: no company membership needed (was 'no_company')
$o$);

-- Any active staff member can be invited to any event.
drop policy if exists os_event_attendees_write on public.os_event_attendees;
create policy os_event_attendees_write on public.os_event_attendees for all to authenticated
  using (public.os_can_edit_event(event_id))
  with check (public.os_can_edit_event(event_id)
              and exists (select 1 from public.os_people p
                          where p.id = person_id and p.org_role <> 'guest' and p.status in ('onboarding', 'active')));

create or replace function public.os_invite_candidates(p_company text)
returns table (person_id text, full_name text, short_name text, org_role text, companies text[], divisions text[], managed_divisions text[])
language sql stable security definer set search_path = '' as $$
  -- p_company is ignored: everyone active can work on any stream. Kept for the existing callers.
  select p.id, p.full_name, p.short_name, p.org_role,
         coalesce(array(select c.company_code from public.os_person_companies c where c.person_id = p.id order by 1), '{}'),
         coalesce(array(select d.division_id from public.os_person_divisions d where d.person_id = p.id order by 1), '{}'),
         coalesce(array(select d.division_id from public.os_person_divisions d where d.person_id = p.id and d.is_manager order by 1), '{}')
  from public.os_people p
  where public.os_is_staff() and p.status = 'active' and p.org_role <> 'guest'
  order by p.full_name
$$;

-- Free/busy for any staff member (titles still only for what the caller can see).
select public.os_patch_function('public.os_busy(text[], timestamptz, timestamptz)'::regprocedure,
$o$          select 1 from public.os_person_companies a join public.os_person_companies b on a.company_code = b.company_code
          where a.person_id = x.id and b.person_id = me)))$o$,
$o$          select 1 where x.org_role <> 'guest' and x.status in ('onboarding', 'active'))))$o$);

-- Links between records no longer need the same company.
create or replace function public.os_same_company_event_task(p_event text, p_task text) returns boolean
language sql stable security definer set search_path = '' as $$
  -- Name kept for the existing policy; the same-company part is gone.
  select exists (select 1 from public.os_events e where e.id = p_event) and exists (select 1 from public.os_tasks t where t.id = p_task)
$$;

select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    if tg_op = 'INSERT' then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id);
    elsif p.company_code <> new.company_code then
      raise exception 'A linked project must be in the same company as the event' using errcode = '23514';
    end if;$o$,
$o$    -- streams: a linked project may be in another company
    if tg_op = 'INSERT' then new.company_code := coalesce(new.company_code, p.company_code); new.division_id := coalesce(new.division_id, p.division_id);
    end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    if tg_op = 'INSERT' and new.project_id is null then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id); end if;
    if p.company_code <> new.company_code then
      raise exception 'A linked campaign must be in the same company as the event' using errcode = '23514';
    end if;$o$,
$o$    -- streams: a linked campaign may be in another company
    if tg_op = 'INSERT' and new.project_id is null then new.company_code := coalesce(new.company_code, p.company_code); new.division_id := coalesce(new.division_id, p.division_id); end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    if p.company_code <> new.company_code then
      raise exception 'A linked partnership must be in the same company as the event' using errcode = '23514';
    end if;$o$,
$o$    -- streams: a linked partnership may be in another company$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    if p.company_code <> new.company_code and new.company_code <> 'HQ' then
      raise exception 'A linked task must be in the same company as the event' using errcode = '23514';
    end if;$o$,
$o$    -- streams: a linked task may be in another company$o$);

select public.os_patch_function('public.os_campaigns_before_write()'::regprocedure,
$o$    if p.company_code <> new.company_code then raise exception 'A linked project must be in the same company' using errcode = '23514'; end if;$o$,
$o$    -- streams: a linked project may be in another company$o$);
select public.os_patch_function('public.os_campaign_items_links()'::regprocedure,
$o$    if tg_op = 'INSERT' then new.company_code := c.company_code;
    elsif c.company_code <> new.company_code then raise exception 'The campaign must be in the same company' using errcode = '23514';
    end if;$o$,
$o$    -- streams: the campaign may be in another company
    if tg_op = 'INSERT' then new.company_code := coalesce(new.company_code, c.company_code); end if;$o$);
select public.os_patch_function('public.os_dependency_rules()'::regprocedure,
$o$    if not exists (select 1 from public.os_tasks x join public.os_tasks y on y.id = b where x.id = a and x.company_code = y.company_code) then
      raise exception 'Dependent tasks must be in the same company' using errcode = '23514';
    end if;$o$,
$o$    -- streams: dependent tasks may be in different companies$o$);

-- Finance: the books stay per legal entity; a budget or expense may serve a project of any stream.
select public.os_patch_function('public.os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)'::regprocedure,
$o$x.id = p_project and x.company_code = p_company and public.os_can_view_project(x.id)) then
    raise exception 'That project isn''t in this company or you can''t see it'$o$,
$o$x.id = p_project and public.os_can_view_project(x.id)) then
    raise exception 'That project doesn''t exist or you can''t see it'$o$);
select public.os_patch_function('public.os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)'::regprocedure,
$o$'Choose a company you work in'$o$, $o$'Choose which company''s books this belongs to'$o$);
select public.os_patch_function('public.os_fin_budget_save(text, text, text, text, text, text, date, date, bigint, text, text)'::regprocedure,
$o$x.id = p_project and x.company_code = p_company) then
    raise exception 'That project isn''t in this company or you can''t see it'$o$,
$o$x.id = p_project) then
    raise exception 'That project doesn''t exist'$o$);

-- The batch writers take streams too.
select public.os_patch_function('public.os_create_event(jsonb)'::regprocedure,
$o$sensitivity, status)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), p->>'company_code',$o$,
$o$sensitivity, status, streams)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), nullif(p->>'company_code', ''),$o$);
select public.os_patch_function('public.os_create_event(jsonb)'::regprocedure,
$o$coalesce(nullif(p->>'status', ''), 'Scheduled'))
  returning id into new_id;$o$,
$o$coalesce(nullif(p->>'status', ''), 'Scheduled'), public.os_streams_from_json(p->'streams'))
  returning id into new_id;$o$);
select public.os_patch_function('public.os_create_tasks(jsonb)'::regprocedure,
$o$owner_person_id, due_date, priority, description)
    values (t->>'title', t->>'company_code',$o$,
$o$owner_person_id, due_date, priority, description, streams)
    values (t->>'title', nullif(t->>'company_code', ''),$o$);
select public.os_patch_function('public.os_create_tasks(jsonb)'::regprocedure,
$o$coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''))$o$,
$o$coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''), public.os_streams_from_json(t->'streams'))$o$);

-- AI-planned content slots: streams can be given; without them (and without a campaign to inherit from) they stay
-- unassigned. company_code may be empty now.
select public.os_patch_function('public.os_create_content_items(jsonb)'::regprocedure,
$o$insert into public.os_campaign_items (company_code, division_id,$o$,
$o$insert into public.os_campaign_items (company_code, streams, division_id,$o$);
select public.os_patch_function('public.os_create_content_items(jsonb)'::regprocedure,
$o$values (i->>'company_code', coalesce(nullif(i->>'division_id', ''), 'DIV-03'),$o$,
$o$values (nullif(i->>'company_code', ''), public.os_streams_from_json(i->'streams'), coalesce(nullif(i->>'division_id', ''), 'DIV-03'),$o$);

-- Streams on finance, legal and request records are set through here (those tables are written by functions only).
create or replace function public.os_set_streams(p_type text, p_id text, p_streams text[]) returns text[]
language plpgsql volatile security definer set search_path = '' as $$
declare v text[] := public.os_streams_normalize(p_streams); ok boolean;
begin
  if public.os_current_person() is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if not public.os_streams_valid(v) then raise exception 'Unknown business stream' using errcode = '22023'; end if;
  ok := public.os_is_founder() or case p_type
    when 'budget' then public.os_fin_operate()
    when 'transaction' then public.os_fin_operate()
      or exists (select 1 from public.os_fin_transactions t where t.id = p_id and t.requested_by = public.os_current_person() and t.status = 'requested')
    when 'letter' then public.os_leg_operate()
    when 'agreement' then public.os_leg_operate()
    when 'request' then exists (select 1 from public.os_requests r where r.id = p_id and public.os_can_view_request(r.id)
                                and public.os_current_person() in (r.requester_person_id, r.owner_person_id))
    else false end;
  if not ok then raise exception 'You can''t change the streams of this record' using errcode = '42501'; end if;
  case p_type
    when 'budget' then update public.os_fin_budgets set streams = v, updated_at = now() where id = p_id;
    when 'transaction' then update public.os_fin_transactions set streams = v, updated_at = now() where id = p_id;
    when 'letter' then update public.os_letters set streams = v, updated_at = now() where id = p_id;
    when 'agreement' then update public.os_agreements set streams = v, updated_at = now() where id = p_id;
    when 'request' then update public.os_requests set streams = v, updated_at = now() where id = p_id;
  end case;
  if not found then raise exception 'Record not found' using errcode = 'P0002'; end if;
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), 'streams.set', p_type, p_id, jsonb_build_object('streams', v));
  return v;
end $$;
revoke all on function public.os_set_streams(text, text, text[]) from public, anon;
grant execute on function public.os_set_streams(text, text, text[]) to authenticated;

-- ── 5. Migration record and review queue ──────────────────────────────────────────────────────────────────────────
-- How every existing record got its streams (one row per record), so the result can be audited and explained.
create table if not exists public.os_stream_assignments (
  entity_type   text not null,
  entity_id     text not null,
  company_code  text,               -- the business unit the record had at migration time
  streams       text[] not null,
  rule          text not null,      -- gif_programme | project | project+company | campaign | event | ... | company | workstream_name | unattributed
  assigned_at   timestamptz not null default now(),
  primary key (entity_type, entity_id)
);
-- Records whose stream could not be settled from the data alone. Nothing is guessed: the record keeps the stream of its
-- old business unit until someone confirms or changes it here.
create table if not exists public.os_stream_reviews (
  id                bigint generated always as identity primary key,
  entity_type       text not null,
  entity_id         text not null,
  title             text,
  reason            text not null check (reason in ('company_differs_from_parent', 'text_mentions_other_stream', 'workstream_unclear')),
  detail            text not null,
  current_streams   text[] not null,
  suggested_streams text[] not null check (public.os_streams_valid(suggested_streams)),
  status            text not null default 'open' check (status in ('open', 'applied', 'kept', 'changed')),
  resolved_streams  text[],
  resolved_by       text references public.os_people (id),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  unique (entity_type, entity_id, reason)
);
create index if not exists os_stream_reviews_open_idx on public.os_stream_reviews (status, entity_type) where status = 'open';
alter table public.os_stream_assignments enable row level security;
alter table public.os_stream_reviews enable row level security;
revoke all on public.os_stream_assignments, public.os_stream_reviews from anon, authenticated;
grant select on public.os_stream_assignments, public.os_stream_reviews to authenticated;
grant select, insert, update, delete on public.os_stream_assignments, public.os_stream_reviews to service_role;
drop policy if exists os_stream_assignments_read on public.os_stream_assignments;
create policy os_stream_assignments_read on public.os_stream_assignments for select to authenticated
  using ((select public.os_is_founder()) or public.os_can_view_entity(entity_type, entity_id));
drop policy if exists os_stream_reviews_read on public.os_stream_reviews;
create policy os_stream_reviews_read on public.os_stream_reviews for select to authenticated
  using ((select public.os_is_founder()) or public.os_can_view_entity(entity_type, entity_id));

-- Founders, and managers who can see the record, settle a review: apply the suggestion, keep the current streams, or
-- set other streams. The record's streams are written as the database owner, and the decision is audited.
create or replace function public.os_stream_review_resolve(p_ids bigint[], p_action text, p_streams text[] default null) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); r public.os_stream_reviews; v text[]; n int := 0;
begin
  if me is null or not (public.os_is_founder()
     or exists (select 1 from public.os_people p where p.id = me and p.org_role in ('founder', 'manager'))) then
    raise exception 'Only founders and managers settle stream reviews' using errcode = '42501';
  end if;
  if p_action not in ('apply', 'keep', 'change') then raise exception 'Unknown action' using errcode = '22023'; end if;
  if p_action = 'change' and not public.os_streams_valid(public.os_streams_normalize(p_streams)) then
    raise exception 'Unknown business stream' using errcode = '22023';
  end if;
  for r in select * from public.os_stream_reviews where id = any (p_ids) and status = 'open' for update loop
    if not (public.os_is_founder() or public.os_can_view_entity(r.entity_type, r.entity_id)) then
      raise exception 'You can''t see one of these records' using errcode = '42501';
    end if;
    v := case p_action when 'apply' then r.suggested_streams when 'keep' then public.os_entity_streams(r.entity_type, r.entity_id)
              else public.os_streams_normalize(p_streams) end;
    if p_action <> 'keep' then
      case r.entity_type
        when 'project' then update public.os_projects set streams = v where id = r.entity_id;
        when 'task' then update public.os_tasks set streams = v where id = r.entity_id;
        when 'event' then update public.os_events set streams = v where id = r.entity_id;
        when 'document' then update public.os_documents set streams = v where id = r.entity_id;
        when 'announcement' then update public.os_announcements set streams = v where id = r.entity_id;
        when 'decision' then update public.os_decisions set streams = v where id = r.entity_id;
        when 'meeting' then update public.os_meetings set streams = v where id = r.entity_id;
        when 'partnership' then update public.os_partnerships set streams = v where id = r.entity_id;
        when 'campaign_plan' then update public.os_campaigns set streams = v where id = r.entity_id;
        when 'campaign' then update public.os_campaign_items set streams = v where id = r.entity_id;
        when 'product' then update public.os_product_items set streams = v where id = r.entity_id;
        when 'kpi' then update public.os_kpis set streams = v where id = r.entity_id;
        when 'objective' then update public.os_objectives set streams = v where id = r.entity_id;
        when 'timeline' then update public.os_timeline_items set streams = v where id = r.entity_id;
        when 'request' then update public.os_requests set streams = v where id = r.entity_id;
        when 'budget' then update public.os_fin_budgets set streams = v where id = r.entity_id;
        when 'transaction' then update public.os_fin_transactions set streams = v where id = r.entity_id;
        when 'letter' then update public.os_letters set streams = v where id = r.entity_id;
        when 'agreement' then update public.os_agreements set streams = v where id = r.entity_id;
        else raise exception 'Unknown record type' using errcode = '22023';
      end case;
    end if;
    -- The same record may be flagged for more than one reason: settling it settles all of them.
    update public.os_stream_reviews set status = case p_action when 'apply' then 'applied' when 'keep' then 'kept' else 'changed' end,
      resolved_streams = v, resolved_by = me, resolved_at = now()
    where entity_type = r.entity_type and entity_id = r.entity_id and status = 'open';
    insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
    values (me, 'streams.review_' || p_action, r.entity_type, r.entity_id, jsonb_build_object('review', r.id, 'from', r.current_streams, 'to', v));
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.os_stream_review_resolve(bigint[], text, text[]) from public, anon;
grant execute on function public.os_stream_review_resolve(bigint[], text, text[]) to authenticated;

-- ── 6. Backfill: give every existing record the streams its data supports ─────────────────────────────────────────
-- Rules, in order (first match wins), recorded per record in os_stream_assignments:
--   gif_programme   the project is a GIF programme (os_programmes.code GIF…) → GIF only
--   <parent>        the record hangs off a project / campaign / event / task / partnership → that parent's streams
--   <parent>+company  ... but the record's own unit differs from the parent's → both, and flagged for review
--   workstream_name a timeline item whose workstream name names exactly one stream (e.g. "GIF program & logistics")
--   linked_project  a document linked to projects → those projects' streams
--   company         otherwise the stream of the record's old business unit (HQ, IEL, ELC)
--   unattributed    finance and legal records with no project link stay without a stream (their entity is unchanged)
-- Flags (os_stream_reviews), never applied automatically:
--   company_differs_from_parent  see above
--   text_mentions_other_stream   the title names a stream the record isn't in (e.g. an IELSco project called "GIF …")
--   workstream_unclear           an HQ timeline item whose workstream names no stream
create or replace function public.os_streams_backfill() returns int
language plpgsql volatile security definer set search_path = '' as $$
declare n int := 0; rec record; d record; gif text[];
begin
  gif := coalesce(array(select pg.project_id from public.os_programmes pg where upper(pg.code) like 'GIF%'), '{}');
  create temp table if not exists _os_sa (entity_type text, entity_id text, company text, streams text[], rule text, conflict boolean,
                                         title text, hints text[]) on commit drop;
  truncate _os_sa;

  -- Projects first: everything else follows them.
  insert into _os_sa
    select 'project', p.id, p.company_code,
           case when p.id = any (gif) then array['GIF'] else array_remove(array[public.os_company_stream(p.company_code)], null) end,
           case when p.id = any (gif) then 'gif_programme' else 'company' end, false, p.name, public.os_stream_hints(p.name)
    from public.os_projects p
    where p.streams = '{}' and not exists (select 1 from public.os_stream_assignments a where a.entity_type = 'project' and a.entity_id = p.id);
  update public.os_projects x set streams = s.streams from _os_sa s where s.entity_type = 'project' and s.entity_id = x.id;

  -- Everything that can hang off a parent. derive(company, parent type, parent id).
  for rec in select * from (
    select 'task' t, x.id, x.company_code c, case when x.parent_task_id is not null then 'task' when x.project_id is not null then 'project' end pt,
           coalesce(x.parent_task_id, x.project_id) pid, x.title ttl, x.streams s from public.os_tasks x
    union all select 'event', x.id, x.company_code, case when x.project_id is not null then 'project' when x.campaign_id is not null then 'campaign_plan'
           when x.partnership_id is not null then 'partnership' when x.task_id is not null then 'task' end,
           coalesce(x.project_id, x.campaign_id, x.partnership_id, x.task_id), x.title, x.streams from public.os_events x
    union all select 'decision', x.id, x.company_code, case when x.project_id is not null then 'project' end, x.project_id, x.decision, x.streams from public.os_decisions x
    union all select 'meeting', x.id, x.company_code, case when x.project_id is not null then 'project' when x.event_id is not null then 'event' end,
           coalesce(x.project_id, x.event_id), x.title, x.streams from public.os_meetings x
    union all select 'partnership', x.id, x.company_code, case when x.related_project_id is not null then 'project' end, x.related_project_id, x.organisation, x.streams from public.os_partnerships x
    union all select 'campaign_plan', x.id, x.company_code, case when x.project_id is not null then 'project' end, x.project_id, x.name, x.streams from public.os_campaigns x
    union all select 'campaign', x.id, x.company_code, case when x.campaign_id is not null then 'campaign_plan' when x.related_project_id is not null then 'project' end,
           coalesce(x.campaign_id, x.related_project_id), x.title, x.streams from public.os_campaign_items x
    union all select 'announcement', x.id::text, x.company_code, null, null, x.title, x.streams from public.os_announcements x
    union all select 'product', x.id, x.company_code, null, null, x.title, x.streams from public.os_product_items x
    union all select 'kpi', x.id, x.company_code, null, null, x.name, x.streams from public.os_kpis x
    union all select 'objective', x.id, x.company_code, null, null, x.title, x.streams from public.os_objectives x
    union all select 'request', x.id, x.company_code, case when x.related_type in ('project', 'task', 'event', 'partnership') then x.related_type end,
           x.related_id, x.title, x.streams from public.os_requests x
    union all select 'timeline', x.id, x.company_code, case when x.project_id is not null then 'project' end, x.project_id,
           x.workstream_name || ': ' || x.title, x.streams from public.os_timeline_items x
    -- finance and legal: a project link, or nothing
    union all select 'budget', x.id, null, case when x.project_id is not null then 'project' end, x.project_id, x.name, x.streams from public.os_fin_budgets x
    union all select 'transaction', x.id, null, case when x.project_id is not null then 'project' end, x.project_id, x.description, x.streams from public.os_fin_transactions x
    union all select 'letter', x.id, null, case when x.related_type in ('project', 'task', 'event', 'partnership') then x.related_type end, x.related_id, x.subject, x.streams from public.os_letters x
    union all select 'agreement', x.id, null, case when x.related_type in ('project', 'task', 'event', 'partnership') then x.related_type end, x.related_id, x.title, x.streams from public.os_agreements x
  ) u
  -- Parents before children: tasks (top-level, then project tasks, then subtasks), campaigns and partnerships before
  -- the events, meetings and content that hang off them.
  order by array_position(array['task', 'campaign_plan', 'partnership', 'event', 'meeting', 'campaign', 'decision', 'request', 'timeline',
                                'announcement', 'product', 'kpi', 'objective', 'budget', 'transaction', 'letter', 'agreement'], u.t),
           (u.pt is not null), u.pt, u.id
  loop
    continue when rec.s <> '{}' or exists (select 1 from public.os_stream_assignments a where a.entity_type = rec.t and a.entity_id = rec.id);
    declare ps text[] := case when rec.pid is not null then public.os_entity_streams(rec.pt, rec.pid) end;
            pc text := case when rec.pid is not null then public.os_entity_company(rec.pt, rec.pid) end;
            base text[] := array_remove(array[public.os_company_stream(rec.c)], null);
            v text[]; rule text; conflict boolean := false; wh text[];
    begin
      if coalesce(cardinality(ps), 0) > 0 then
        if rec.c is null or pc is not distinct from rec.c or base <@ ps then v := ps; rule := rec.pt;
        else v := public.os_streams_normalize(ps || base); rule := rec.pt || '+company'; conflict := true; end if;
      elsif rec.t = 'timeline' and cardinality(public.os_stream_hints(split_part(rec.ttl, ': ', 1))) = 1 then
        v := public.os_stream_hints(split_part(rec.ttl, ': ', 1)); rule := 'workstream_name';
      elsif rec.t in ('budget', 'transaction', 'letter', 'agreement') then
        v := '{}'; rule := 'unattributed';
      else
        v := base; rule := 'company';
      end if;
      insert into _os_sa values (rec.t, rec.id, rec.c, v, rule, conflict, rec.ttl, public.os_stream_hints(rec.ttl));
      -- write at once, so children later in the loop see it
      case rec.t
        when 'task' then update public.os_tasks set streams = v where id = rec.id;
        when 'event' then update public.os_events set streams = v where id = rec.id;
        when 'decision' then update public.os_decisions set streams = v where id = rec.id;
        when 'meeting' then update public.os_meetings set streams = v where id = rec.id;
        when 'partnership' then update public.os_partnerships set streams = v where id = rec.id;
        when 'campaign_plan' then update public.os_campaigns set streams = v where id = rec.id;
        when 'campaign' then update public.os_campaign_items set streams = v where id = rec.id;
        when 'announcement' then update public.os_announcements set streams = v where id::text = rec.id;
        when 'product' then update public.os_product_items set streams = v where id = rec.id;
        when 'kpi' then update public.os_kpis set streams = v where id = rec.id;
        when 'objective' then update public.os_objectives set streams = v where id = rec.id;
        when 'request' then update public.os_requests set streams = v where id = rec.id;
        when 'timeline' then update public.os_timeline_items set streams = v where id = rec.id;
        when 'budget' then update public.os_fin_budgets set streams = v where id = rec.id;
        when 'transaction' then update public.os_fin_transactions set streams = v where id = rec.id;
        when 'letter' then update public.os_letters set streams = v where id = rec.id;
        when 'agreement' then update public.os_agreements set streams = v where id = rec.id;
      end case;
    end;
  end loop;

  -- Documents: the projects they are linked to, else their old unit.
  for d in
    select x.id, x.company_code, x.title,
           public.os_streams_normalize(array(select unnest(p.streams) from public.os_document_links l join public.os_projects p on p.id = l.entity_id
                                             where l.document_id = x.id and l.entity_type = 'project')) ls
    from public.os_documents x
    where x.streams = '{}' and not exists (select 1 from public.os_stream_assignments a where a.entity_type = 'document' and a.entity_id = x.id)
  loop
    insert into _os_sa values ('document', d.id, d.company_code,
      case when cardinality(d.ls) > 0 then d.ls else array_remove(array[public.os_company_stream(d.company_code)], null) end,
      case when cardinality(d.ls) > 0 then 'linked_project' else 'company' end, false, d.title, public.os_stream_hints(d.title));
    update public.os_documents set streams = (select streams from _os_sa where entity_type = 'document' and entity_id = d.id) where id = d.id;
  end loop;

  insert into public.os_stream_assignments (entity_type, entity_id, company_code, streams, rule)
    select entity_type, entity_id, company, streams, rule from _os_sa on conflict do nothing;
  get diagnostics n = row_count;

  -- Flags.
  insert into public.os_stream_reviews (entity_type, entity_id, title, reason, detail, current_streams, suggested_streams)
    select entity_type, entity_id, left(title, 200), 'company_differs_from_parent',
           'Its old business unit (' || coalesce(company, '—') || ') differs from the record it belongs to. It now carries both.',
           streams, streams
    from _os_sa where conflict
  on conflict do nothing;
  insert into public.os_stream_reviews (entity_type, entity_id, title, reason, detail, current_streams, suggested_streams)
    select entity_type, entity_id, left(title, 200), 'text_mentions_other_stream',
           'The title mentions ' || array_to_string(array(select h from unnest(hints) h where h <> all (streams)), ', ') || ' but the record is in ' ||
           coalesce(nullif(array_to_string(streams, ', '), ''), 'no stream') || '.',
           streams, public.os_streams_normalize(streams || hints)
    from _os_sa where entity_type <> 'timeline' and exists (select 1 from unnest(hints) h where h <> all (streams))
  on conflict do nothing;
  insert into public.os_stream_reviews (entity_type, entity_id, title, reason, detail, current_streams, suggested_streams)
    select entity_type, entity_id, left(title, 200),
           case when rule = 'company' and company = 'HQ' and cardinality(public.os_stream_hints(split_part(title, ': ', 1))) = 0 then 'workstream_unclear' else 'text_mentions_other_stream' end,
           case when rule = 'company' and company = 'HQ' and cardinality(public.os_stream_hints(split_part(title, ': ', 1))) = 0
                then 'Master Timeline workstream "' || split_part(title, ': ', 1) || '" names no stream; kept in HQ.'
                else 'The milestone mentions a stream it isn''t in.' end,
           streams,
           case when cardinality(public.os_stream_hints(split_part(title, ': ', 2))) > 0 then public.os_streams_normalize(streams || public.os_stream_hints(split_part(title, ': ', 2))) else streams end
    from _os_sa
    where entity_type = 'timeline' and rule <> 'workstream_name' and not (rule like 'project%')
      and ((rule = 'company' and company = 'HQ' and cardinality(public.os_stream_hints(split_part(title, ': ', 1))) = 0)
           or exists (select 1 from unnest(public.os_stream_hints(split_part(title, ': ', 2))) h where h <> all (streams)))
  on conflict do nothing;

  -- Activity follows its record.
  update public.os_activity a set streams = public.os_entity_streams(a.entity_type, a.entity_id)
  where a.streams = '{}' and a.entity_type in ('project', 'task', 'event', 'document', 'announcement', 'decision', 'meeting', 'partnership',
    'campaign_plan', 'campaign', 'product', 'kpi', 'objective', 'timeline', 'request')
    and cardinality(public.os_entity_streams(a.entity_type, a.entity_id)) > 0;
  return n;
end $$;
revoke all on function public.os_streams_backfill() from public, anon, authenticated;

-- Run with the tables' own triggers off, so the backfill neither bumps updated_at nor writes an activity entry or a
-- notification for every record. Constraint checks stay on.
do $$
declare t text;
        tabs text[] := array['os_projects', 'os_tasks', 'os_events', 'os_documents', 'os_announcements', 'os_decisions', 'os_meetings',
          'os_partnerships', 'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items',
          'os_requests', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements', 'os_activity'];
begin
  foreach t in array tabs loop execute format('alter table public.%I disable trigger user', t); end loop;
  perform public.os_streams_backfill();
  foreach t in array tabs loop execute format('alter table public.%I enable trigger user', t); end loop;
end $$;

-- ── 7. Per-stream summary for HQ (runs as the caller, so it counts only what they can see) ─────────────────────────
create or replace function public.os_stream_summary()
returns table (stream_code text, active_projects int, open_tasks int, overdue_tasks int, blocked_tasks int, events_next_30 int,
               open_partnerships int, documents int, open_reviews int)
language sql stable security invoker set search_path = '' as $$
  with s as (select code from public.os_streams),
       today as (select (now() at time zone 'Asia/Jakarta')::date d)
  select s.code,
    (select count(*)::int from public.os_projects p where p.status not in ('Completed', 'Cancelled')
       and (s.code = any (p.streams) or (s.code = 'HQ' and p.streams = '{}'))),
    (select count(*)::int from public.os_tasks t where t.status not in ('Done', 'Cancelled')
       and (s.code = any (t.streams) or (s.code = 'HQ' and t.streams = '{}'))),
    (select count(*)::int from public.os_tasks t, today where t.status not in ('Done', 'Cancelled') and t.due_date < today.d
       and (s.code = any (t.streams) or (s.code = 'HQ' and t.streams = '{}'))),
    (select count(*)::int from public.os_tasks t where t.status = 'Blocked'
       and (s.code = any (t.streams) or (s.code = 'HQ' and t.streams = '{}'))),
    (select count(*)::int from public.os_events e where e.status <> 'Cancelled' and e.starts_at >= now() and e.starts_at < now() + interval '30 days'
       and (s.code = any (e.streams) or (s.code = 'HQ' and e.streams = '{}'))),
    (select count(*)::int from public.os_partnerships x where x.stage not in ('6 Won', '7 Lost')
       and (s.code = any (x.streams) or (s.code = 'HQ' and x.streams = '{}'))),
    (select count(*)::int from public.os_documents x where x.status <> 'Archived'
       and (s.code = any (x.streams) or (s.code = 'HQ' and x.streams = '{}'))),
    (select count(*)::int from public.os_stream_reviews r where r.status = 'open' and (s.code = any (r.current_streams) or s.code = any (r.suggested_streams)))
  from s order by (select sort_order from public.os_streams x where x.code = s.code)
$$;
revoke all on function public.os_stream_summary() from public, anon;
grant execute on function public.os_stream_summary() to authenticated;

drop function if exists public.os_patch_function(regprocedure, text, text);
