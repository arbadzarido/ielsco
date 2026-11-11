-- Rollback for 20261120000000_users_timezone.sql. Drops members' saved time zone choices.
alter table public.users drop constraint if exists users_timezone_format;
alter table public.users drop column if exists timezone;
delete from supabase_migrations.schema_migrations where version = '20261120000000';
