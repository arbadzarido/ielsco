-- Company OS: Google Drive writing through a founder's Google account.
--
-- The Drive folders live in a personal (gmail) My Drive. A Google service account has no storage of its own, so it
-- can read those folders but cannot create a file in them ("Service Accounts do not have storage quota"). Documents
-- are therefore created with a founder's own Google account, connected once from Admin. Files are then owned by
-- that founder, exactly as if they had made them in Drive.
--
-- This table holds that one connection. The refresh token is encrypted by the server (AES-256-GCM) before it is
-- stored, and the table is reachable only with the service role: no policy exists for anon or authenticated users.
-- Additive and re-runnable; touches no existing table.

create table if not exists public.os_drive_connection (
  id               boolean primary key default true check (id),
  google_email     text not null,
  token_sealed     text not null,
  scopes           text not null,
  connected_by     text not null references public.os_people (id),
  connected_at     timestamptz not null default now()
);
alter table public.os_drive_connection enable row level security;
revoke all on public.os_drive_connection from public, anon, authenticated;
grant select, insert, update, delete on public.os_drive_connection to service_role;
