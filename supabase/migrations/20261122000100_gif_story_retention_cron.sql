-- =====================================================================================================================
-- GIF Instagram Story proof retention: daily Supabase Cron -> Edge Function `gif-story-retention`
-- ---------------------------------------------------------------------------------------------------------------------
-- * The Edge Function (supabase/functions/gif-story-retention) runs with SUPABASE_SERVICE_ROLE_KEY (a built-in function
--   secret, never sent to the browser). It deletes Storage objects of story proofs whose expires_at (upload + 7 days,
--   UTC) has passed, marks the file rows deleted, and never touches submissions, assessments or other files.
-- * Cron authenticates to the function with a random shared secret kept in Supabase Vault (`gif_retention_cron_secret`);
--   the function checks it through gif_retention_secret_ok(), which only service_role may call.
-- * Every run is logged in public.gif_retention_runs (admins can read it).
-- =====================================================================================================================

create table if not exists public.gif_retention_runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  scanned     integer not null default 0,
  deleted     integer not null default 0,
  failed      integer not null default 0,
  orphans_deleted integer not null default 0,
  details     jsonb not null default '[]'::jsonb
);
alter table public.gif_retention_runs enable row level security;
revoke all on public.gif_retention_runs from anon, authenticated;
grant select on public.gif_retention_runs to authenticated;
drop policy if exists "gif retention runs: admins read" on public.gif_retention_runs;
create policy "gif retention runs: admins read" on public.gif_retention_runs for select to authenticated using (public.gif_is_admin());

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'supabase_vault') then
    if not exists (select 1 from vault.secrets where name = 'gif_retention_cron_secret') then
      perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'gif_retention_cron_secret',
                                  'Shared secret: Supabase Cron -> gif-story-retention Edge Function');
    end if;
    if not exists (select 1 from vault.secrets where name = 'gif_project_url') then
      perform vault.create_secret('https://hkubzamchahvdpvojepc.supabase.co', 'gif_project_url', 'Supabase project URL for cron HTTP calls');
    end if;
  end if;
end $$;

create or replace function public.gif_retention_secret_ok(p_secret text) returns boolean
language plpgsql stable security definer set search_path = ''
as $$
declare expected text;
begin
  select s.decrypted_secret into expected from vault.decrypted_secrets s where s.name = 'gif_retention_cron_secret';
  return coalesce(length(p_secret) >= 32 and p_secret = expected, false);
end $$;
revoke all on function public.gif_retention_secret_ok(text) from public, anon, authenticated;
grant execute on function public.gif_retention_secret_ok(text) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'gif-story-retention-daily',
      '15 0 * * *',   -- 00:15 UTC every day
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'gif_project_url') || '/functions/v1/gif-story-retention',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-gif-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gif_retention_cron_secret')),
          body := '{"source":"cron"}'::jsonb,
          timeout_milliseconds := 60000
        );
      $job$
    );
  end if;
end $$;
