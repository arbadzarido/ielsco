-- READ-ONLY preflight for Release 2 (run once in Supabase → SQL Editor on PRODUCTION; it changes nothing).
-- Every statement is a SELECT. Output: one table of (check, detail). No names, emails or other personal data:
-- registrations are reported only as (user_id, event_id) key pairs.
--
-- What it answers before release/dashboard is merged (merging makes the GitHub integration run the 8 migrations):
--   1. duplicate (user_id, event_id) pairs in event_registrations  → would make the new unique index fail
--   2. column types of the existing event_registrations table       → user_id must be uuid for the RLS policies
--   3. existing RLS policies on event_registrations                  → older permissive policies would stay active
--   4. migration history already recorded in production             → versions the integration thinks are applied
--   5. public.users columns used by the two admin views              → views fail if a column is missing
--   6. objects the migrations create that already exist              → name clashes

with
dups as (
  select user_id::text as u, event_id::text as e, count(*) as n
  from public.event_registrations
  group by 1, 2
  having count(*) > 1
)
select 'duplicates: total pairs' as check, count(*)::text as detail from dups
union all
select 'duplicates: pair', u || ' / ' || e || ' (x' || n || ')' from (select * from dups order by n desc limit 50) d
union all
select 'event_registrations: column', column_name || ' ' || data_type || case when is_nullable = 'NO' then ' not null' else '' end
from information_schema.columns where table_schema = 'public' and table_name = 'event_registrations'
union all
select 'event_registrations: row count', count(*)::text from public.event_registrations
union all
select 'event_registrations: policy', policyname || ' [' || cmd || '] roles=' || array_to_string(roles, ',')
from pg_policies where schemaname = 'public' and tablename = 'event_registrations'
union all
select 'event_registrations: RLS enabled', relrowsecurity::text from pg_class where oid = 'public.event_registrations'::regclass
union all
select 'migration history: table exists', (to_regclass('supabase_migrations.schema_migrations') is not null)::text
union all
select 'public.users: column present', c from unnest(array['full_name','phone','domicile','occupation','institution_name','institution_role']) c
where exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = c)
union all
select 'public.users: column MISSING', c from unnest(array['full_name','phone','domicile','occupation','institution_name','institution_role']) c
where not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = c)
union all
select 'already exists', n from unnest(array[
  'public.member_profiles','public.member_bookmarks','public.product_tours','public.elco_account_links','public.elco_link_codes',
  'public.elco_learning_summaries','public.circle_session_checkins','public.event_registrants','public.circle_session_attendees']) n
where to_regclass(n) is not null
union all
select 'already exists: function', p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
where s.nspname = 'public' and p.proname in ('list_member_directory','member_profiles_touch_updated_at','create_elco_link_code',
  'consume_elco_link_code','elco_goals_for_link','upsert_elco_summary','revoke_elco_link','revoke_my_elco_link','circle_session_counts');

-- Separately (only if the row above says the history table exists), list what production thinks is applied:
-- select version, name from supabase_migrations.schema_migrations order by version;
