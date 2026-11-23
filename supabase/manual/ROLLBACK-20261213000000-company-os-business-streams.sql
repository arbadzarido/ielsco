-- ROLLBACK for 20261213000000_company_os_business_streams.sql. Manual: run it only on a founder's decision.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 -f supabase/manual/ROLLBACK-20261213000000-company-os-business-streams.sql
--
-- What it does, in one transaction:
--   1. Saves every record's streams to os_streams_rollback_backup (kept), so the decision can be re-applied later.
--   2. Gives a business unit back to operational records created without one (single stream IEL/ELC/HQ -> that unit;
--      GIF only -> IEL, where GIF lived before; several or none -> HQ), and lists them in os_streams_rollback_units.
--      Nothing else in company_code is touched: the migration never rewrote existing values.
--   3. Restores NOT NULL on company_code, the timeline's 'HQ' default, the company-membership sign-in rule and every
--      same-company rule, using the exact original text of each function.
--   4. Drops the streams column, its triggers and functions, the review queue and the assignment record.
-- Existing cross-company links made while streams were live are left as they are (the restored rules check new links).
-- Tested by tests/db/company-os-streams.pglite.mjs (apply -> use -> roll back -> re-apply).

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

-- 1. Backup
create table if not exists public.os_streams_rollback_backup (
  entity_type text not null, entity_id text not null, streams text[] not null, saved_at timestamptz not null default now(),
  primary key (entity_type, entity_id, saved_at));
alter table public.os_streams_rollback_backup enable row level security;
revoke all on public.os_streams_rollback_backup from anon, authenticated;
do $$
declare t text; ty text;
begin
  foreach t in array array['os_projects:project', 'os_tasks:task', 'os_events:event', 'os_documents:document', 'os_announcements:announcement',
    'os_decisions:decision', 'os_meetings:meeting', 'os_partnerships:partnership', 'os_campaigns:campaign_plan', 'os_campaign_items:campaign',
    'os_product_items:product', 'os_kpis:kpi', 'os_objectives:objective', 'os_timeline_items:timeline', 'os_requests:request',
    'os_fin_budgets:budget', 'os_fin_transactions:transaction', 'os_letters:letter', 'os_agreements:agreement'] loop
    ty := split_part(t, ':', 2); t := split_part(t, ':', 1);
    execute format('insert into public.os_streams_rollback_backup (entity_type, entity_id, streams) select %L, id::text, streams from public.%I where streams <> ''{}''', ty, t);
  end loop;
end $$;

-- 2. Units for records created without one
create table if not exists public.os_streams_rollback_units (
  table_name text not null, id text not null, streams text[] not null, company_code text not null, at timestamptz not null default now());
alter table public.os_streams_rollback_units enable row level security;
revoke all on public.os_streams_rollback_units from anon, authenticated;
do $$
declare t text;
begin
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_announcements', 'os_decisions', 'os_meetings', 'os_partnerships',
    'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items', 'os_requests'] loop
    execute format($f$
      with u as (
        update public.%1$I x set company_code = case when x.streams in ('{IEL}', '{ELC}', '{HQ}') then x.streams[1] when x.streams = '{GIF}' then 'IEL' else 'HQ' end
        where x.company_code is null returning x.id::text, x.streams, x.company_code)
      insert into public.os_streams_rollback_units (table_name, id, streams, company_code) select %1$L, id, streams, company_code from u$f$, t);
    execute format('alter table public.%I alter column company_code set not null', t);
  end loop;
  alter table public.os_timeline_items alter column company_code set default 'HQ';
end $$;

-- 3. Original rules
create or replace function public.os_in_company(p_company text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_person_companies c
                 where c.person_id = public.os_current_person() and (c.company_code = p_company or p_company = 'HQ'))
$$;

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

create or replace function public.os_same_company_event_task(p_event text, p_task text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_events e join public.os_tasks t on t.id = p_task
                 where e.id = p_event and (t.company_code = e.company_code or e.company_code = 'HQ'))
$$;

drop policy if exists os_event_attendees_write on public.os_event_attendees;
create policy os_event_attendees_write on public.os_event_attendees for all to authenticated
  using (public.os_can_edit_event(event_id))
  with check (public.os_can_edit_event(event_id)
              and exists (select 1 from public.os_people p join public.os_events e on e.id = event_id
                          where p.id = person_id and p.org_role <> 'guest' and p.status in ('onboarding', 'active')
                            and (p.org_role = 'founder'
                                 or exists (select 1 from public.os_person_companies c where c.person_id = p.id
                                            and (c.company_code = e.company_code or e.company_code = 'HQ')))));

select public.os_patch_function('public.os_create_content_items(jsonb)'::regprocedure,
$o$values (nullif(i->>'company_code', ''), public.os_streams_from_json(i->'streams'), coalesce(nullif(i->>'division_id', ''), 'DIV-03'),$o$,
$o$values (i->>'company_code', coalesce(nullif(i->>'division_id', ''), 'DIV-03'),$o$);
select public.os_patch_function('public.os_create_content_items(jsonb)'::regprocedure,
$o$insert into public.os_campaign_items (company_code, streams, division_id,$o$,
$o$insert into public.os_campaign_items (company_code, division_id,$o$);
select public.os_patch_function('public.os_create_tasks(jsonb)'::regprocedure,
$o$coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''), public.os_streams_from_json(t->'streams'))$o$,
$o$coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''))$o$);
select public.os_patch_function('public.os_create_tasks(jsonb)'::regprocedure,
$o$owner_person_id, due_date, priority, description, streams)
    values (t->>'title', nullif(t->>'company_code', ''),$o$,
$o$owner_person_id, due_date, priority, description)
    values (t->>'title', t->>'company_code',$o$);
select public.os_patch_function('public.os_create_event(jsonb)'::regprocedure,
$o$coalesce(nullif(p->>'status', ''), 'Scheduled'), public.os_streams_from_json(p->'streams'))
  returning id into new_id;$o$,
$o$coalesce(nullif(p->>'status', ''), 'Scheduled'))
  returning id into new_id;$o$);
select public.os_patch_function('public.os_create_event(jsonb)'::regprocedure,
$o$sensitivity, status, streams)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), nullif(p->>'company_code', ''),$o$,
$o$sensitivity, status)
  values (p->>'title', coalesce(nullif(p->>'category', ''), 'Meeting'), p->>'company_code',$o$);
select public.os_patch_function('public.os_fin_budget_save(text, text, text, text, text, text, date, date, bigint, text, text)'::regprocedure,
$o$x.id = p_project) then
    raise exception 'That project doesn''t exist'$o$,
$o$x.id = p_project and x.company_code = p_company) then
    raise exception 'That project isn''t in this company or you can''t see it'$o$);
select public.os_patch_function('public.os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)'::regprocedure,
$o$'Choose which company''s books this belongs to'$o$,
$o$'Choose a company you work in'$o$);
select public.os_patch_function('public.os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)'::regprocedure,
$o$x.id = p_project and public.os_can_view_project(x.id)) then
    raise exception 'That project doesn''t exist or you can''t see it'$o$,
$o$x.id = p_project and x.company_code = p_company and public.os_can_view_project(x.id)) then
    raise exception 'That project isn''t in this company or you can''t see it'$o$);
select public.os_patch_function('public.os_dependency_rules()'::regprocedure,
$o$    -- streams: dependent tasks may be in different companies$o$,
$o$    if not exists (select 1 from public.os_tasks x join public.os_tasks y on y.id = b where x.id = a and x.company_code = y.company_code) then
      raise exception 'Dependent tasks must be in the same company' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_campaign_items_links()'::regprocedure,
$o$    -- streams: the campaign may be in another company
    if tg_op = 'INSERT' then new.company_code := coalesce(new.company_code, c.company_code); end if;$o$,
$o$    if tg_op = 'INSERT' then new.company_code := c.company_code;
    elsif c.company_code <> new.company_code then raise exception 'The campaign must be in the same company' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_campaigns_before_write()'::regprocedure,
$o$    -- streams: a linked project may be in another company$o$,
$o$    if p.company_code <> new.company_code then raise exception 'A linked project must be in the same company' using errcode = '23514'; end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    -- streams: a linked task may be in another company$o$,
$o$    if p.company_code <> new.company_code and new.company_code <> 'HQ' then
      raise exception 'A linked task must be in the same company as the event' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    -- streams: a linked partnership may be in another company$o$,
$o$    if p.company_code <> new.company_code then
      raise exception 'A linked partnership must be in the same company as the event' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    -- streams: a linked campaign may be in another company
    if tg_op = 'INSERT' and new.project_id is null then new.company_code := coalesce(new.company_code, p.company_code); new.division_id := coalesce(new.division_id, p.division_id); end if;$o$,
$o$    if tg_op = 'INSERT' and new.project_id is null then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id); end if;
    if p.company_code <> new.company_code then
      raise exception 'A linked campaign must be in the same company as the event' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_events_before_write()'::regprocedure,
$o$    -- streams: a linked project may be in another company
    if tg_op = 'INSERT' then new.company_code := coalesce(new.company_code, p.company_code); new.division_id := coalesce(new.division_id, p.division_id);
    end if;$o$,
$o$    if tg_op = 'INSERT' then new.company_code := p.company_code; new.division_id := coalesce(new.division_id, p.division_id);
    elsif p.company_code <> new.company_code then
      raise exception 'A linked project must be in the same company as the event' using errcode = '23514';
    end if;$o$);
select public.os_patch_function('public.os_busy(text[], timestamptz, timestamptz)'::regprocedure,
$o$          select 1 where x.org_role <> 'guest' and x.status in ('onboarding', 'active'))))$o$,
$o$          select 1 from public.os_person_companies a join public.os_person_companies b on a.company_code = b.company_code
          where a.person_id = x.id and b.person_id = me)))$o$);
select public.os_patch_function('public.os_access_reason(uuid)'::regprocedure,
$o$    -- streams: no company membership needed (was 'no_company')
$o$,
$o$    when not exists (select 1 from public.os_person_companies c where c.person_id = (select id from p)) then 'no_company'
$o$);
select public.os_patch_function('public.os_current_person()'::regprocedure,
$o$    -- streams: company membership is no longer required to use the Company OS
$o$,
$o$    and exists (select 1 from public.os_person_companies c where c.person_id = p.id)
$o$);

-- 4. Drop the streams layer
do $$
declare t text;
begin
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_documents', 'os_announcements', 'os_decisions', 'os_meetings',
    'os_partnerships', 'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items',
    'os_requests', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements'] loop
    execute format('drop trigger if exists os_zz_streams on public.%I', t);
  end loop;
  foreach t in array array['os_projects', 'os_tasks', 'os_events', 'os_documents', 'os_announcements', 'os_decisions', 'os_meetings',
    'os_partnerships', 'os_campaigns', 'os_campaign_items', 'os_product_items', 'os_kpis', 'os_objectives', 'os_timeline_items',
    'os_requests', 'os_fin_budgets', 'os_fin_transactions', 'os_letters', 'os_agreements', 'os_activity'] loop
    execute format('alter table public.%I drop column if exists streams', t);
  end loop;
end $$;
drop trigger if exists os_document_links_streams on public.os_document_links;
drop trigger if exists os_activity_streams on public.os_activity;
comment on column public.os_documents.company_code is null;
drop function if exists public.os_stream_summary();
drop function if exists public.os_streams_backfill();
drop function if exists public.os_stream_review_resolve(bigint[], text, text[]);
drop function if exists public.os_set_streams(text, text, text[]);
drop function if exists public.os_document_links_streams();
drop function if exists public.os_activity_streams();
drop function if exists public.os_streams_before_write();
drop function if exists public.os_entity_streams(text, text);
drop function if exists public.os_entity_company(text, text);
drop table if exists public.os_stream_reviews;
drop table if exists public.os_stream_assignments;
drop table if exists public.os_streams;
drop function if exists public.os_streams_from_json(jsonb);
drop function if exists public.os_stream_hints(text);
drop function if exists public.os_company_stream(text);
drop function if exists public.os_streams_valid(text[]);
drop function if exists public.os_streams_normalize(text[]);
drop function if exists public.os_patch_function(regprocedure, text, text);
