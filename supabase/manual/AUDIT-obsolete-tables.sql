-- READ-ONLY audit for docs/OBSOLETE-TABLE-AUDIT.md. Changes nothing. Run in the Supabase SQL editor.
-- 1) Row counts and last activity for candidate tables (missing tables are reported, not errors).
do $$
declare t text; n bigint; has_upd boolean; last_ts timestamptz;
begin
  foreach t in array array['goal_progress_logs','user_profiles','membership_transactions','resources','stories','careers',
    'events','feedback','contact_messages','admins','otp_codes','tests','test_questions','test_scores','gif_mentoring_sessions',
    'goals','goal_tasks','goal_templates','mentor_consultations','memberships','transactions']
  loop
    if to_regclass('public.' || t) is null then raise notice '% : (does not exist)', t; continue; end if;
    execute format('select count(*) from public.%I', t) into n;
    select exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='updated_at') into has_upd;
    if has_upd then execute format('select max(updated_at) from public.%I', t) into last_ts;
    elsif exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='created_at') then
      execute format('select max(created_at) from public.%I', t) into last_ts;
    else last_ts := null; end if;
    raise notice '% : % rows, last activity %', t, n, coalesce(last_ts::text, 'n/a');
  end loop;
end $$;

-- 2) Foreign keys pointing at candidate tables
select tc.table_name as referencing_table, kcu.column_name, ccu.table_name as referenced_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and ccu.table_schema = 'public'
  and ccu.table_name in ('goals','events','resources','stories','careers','user_profiles','admins','tests','test_questions','membership_transactions');

-- 3) Views, functions and policies mentioning candidate tables
select 'view' as kind, table_name as name from information_schema.views
  where table_schema='public' and view_definition ~* '(user_profiles|membership_transactions|admins|otp_codes|goal_progress_logs|test_scores|test_questions|stories|careers|feedback|contact_messages)'
union all
select 'function', p.proname from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
  where ns.nspname='public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ~* '(user_profiles|membership_transactions|admins|otp_codes|goal_progress_logs|test_scores|test_questions)'
union all
select 'policy', tablename || '.' || policyname from pg_policies
  where schemaname='public' and (coalesce(qual,'') || coalesce(with_check,'')) ~* '(admins|user_profiles|memberships)';

-- 4) Triggers on candidate tables
select event_object_table, trigger_name, action_statement from information_schema.triggers
where event_object_schema='public';
