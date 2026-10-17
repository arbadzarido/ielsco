-- READ-ONLY preflight, part 2 (Release 2). Run in Supabase → SQL Editor on PRODUCTION. Changes nothing, no personal data.
-- Shows the exact existing access rules on public.event_registrations so they can be compared with the migration.
select 'policy' as check, policyname || ' | ' || permissive || ' | ' || cmd || ' | roles=' || array_to_string(roles, ',')
       || ' | USING: ' || coalesce(qual, '(none)') || ' | WITH CHECK: ' || coalesce(with_check, '(same as USING / none)') as detail
from pg_policies where schemaname = 'public' and tablename = 'event_registrations'
union all
select 'grant', grantee || ': ' || string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'event_registrations' and grantee in ('anon', 'authenticated', 'public')
group by grantee
union all
select 'column', column_name || ' ' || data_type || case when is_nullable = 'NO' then ' not null' else '' end
       || coalesce(' default ' || column_default, '')
from information_schema.columns where table_schema = 'public' and table_name = 'event_registrations'
union all
select 'constraint', conname || ' ' || pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.event_registrations'::regclass
union all
select 'index', indexname || ' ' || indexdef from pg_indexes where schemaname = 'public' and tablename = 'event_registrations'
union all
select 'trigger', tgname from pg_trigger where tgrelid = 'public.event_registrations'::regclass and not tgisinternal;
