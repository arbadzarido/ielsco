-- One-click event registration (IELS events + IELS Circle cohorts). Additive and safe to re-run.
-- A registration is only (user_id, event_id): no per-event form data is stored. Member details come from
-- public.users (Account details page) through the admin-only view public.event_registrants.
-- event_id = EventData.id in src/data/events.ts, or CIRCLE_COHORT.eventId (e.g. 'circle-2026-oct').

create table if not exists public.event_registrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 100),
  attended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  primary key (user_id, event_id)
);

-- The table may predate this migration (older code wrote name/email snapshots). Keep those columns but stop
-- requiring them, and make sure the columns/constraint the app relies on exist.
alter table public.event_registrations add column if not exists attended boolean not null default false;
alter table public.event_registrations add column if not exists created_at timestamptz not null default now();
alter table public.event_registrations add column if not exists updated_at timestamptz;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'event_registrations' and column_name = 'name') then
    alter table public.event_registrations alter column name drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'event_registrations' and column_name = 'email') then
    alter table public.event_registrations alter column email drop not null;
  end if;
end $$;
-- Production's existing table has created_at NOT NULL without a default (the add-column above is skipped there), and
-- the app inserts only (user_id, event_id). Defaults are metadata-only changes; existing rows are untouched.
alter table public.event_registrations alter column created_at set default now();
alter table public.event_registrations alter column attended set default false;
-- One unique (user_id, event_id) is required for upserts. Production already has one (a unique constraint), and a
-- fresh install gets the primary key, so only create it when no unique index on exactly these columns exists.
do $$
begin
  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.event_registrations'::regclass and i.indisunique
      and (select array_agg(a.attname::text order by k.ord)
           from unnest(i.indkey::int2[]) with ordinality k(attnum, ord)
           join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum) = array['user_id', 'event_id']
  ) then
    create unique index event_registrations_user_event_key on public.event_registrations (user_id, event_id);
  end if;
end $$;

alter table public.event_registrations enable row level security;

drop policy if exists "event_registrations_select_own" on public.event_registrations;
create policy "event_registrations_select_own" on public.event_registrations
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "event_registrations_insert_own" on public.event_registrations;
create policy "event_registrations_insert_own" on public.event_registrations
  for insert to authenticated with check (auth.uid() = user_id);

-- Members mark their own attendance on /dashboard/events.
drop policy if exists "event_registrations_update_own" on public.event_registrations;
create policy "event_registrations_update_own" on public.event_registrations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.event_registrations to authenticated;
revoke all on public.event_registrations from anon;

-- ---------------------------------------------------------------------------
-- Organisers: who registered for what, with contact details, for reminder emails.
-- Supabase → SQL editor:  select * from public.event_registrants where event_id = 'circle-2026-oct';
-- Not readable by members or anonymous visitors.
create or replace view public.event_registrants as
select
  r.event_id,
  r.created_at as registered_at,
  r.attended,
  u.full_name,
  a.email,
  u.phone,
  u.domicile,
  u.occupation,
  u.institution_name,
  u.institution_role
from public.event_registrations r
join auth.users a on a.id = r.user_id
left join public.users u on u.id = r.user_id;

revoke all on public.event_registrants from anon, authenticated;
