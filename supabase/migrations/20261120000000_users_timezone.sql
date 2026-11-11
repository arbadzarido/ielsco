-- public.users.timezone: the member's chosen IANA time zone (e.g. 'Asia/Jakarta', 'Europe/Berlin', 'UTC').
-- The app read and wrote this column (dashboard settings, school settings), but no migration ever created it, so
-- production answered GET /rest/v1/users?select=timezone with 400 "column users.timezone does not exist".
--
-- Additive and safe: nullable, no default, existing rows untouched. NULL means "follow the browser's time zone".
-- Timestamps stay stored in UTC (timestamptz); this column only chooses how they are displayed.
-- RLS is unchanged: the existing own-row SELECT/UPDATE policies and table-level grants already cover new columns.
-- The signup trigger (handle_new_user) does not reference it.
-- Rollback: supabase/manual/ROLLBACK-20261120000000-users-timezone.sql

alter table public.users add column if not exists timezone text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_timezone_format' and conrelid = 'public.users'::regclass) then
    -- Shape check only (Area/Location[/Sub] or UTC); the app validates against Intl's zone list before saving.
    alter table public.users add constraint users_timezone_format
      check (timezone is null or (length(timezone) <= 64 and (timezone = 'UTC' or timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+){1,2}$')));
  end if;
end $$;

comment on column public.users.timezone is 'IANA time zone chosen by the member for displaying times; NULL = use the browser zone.';
