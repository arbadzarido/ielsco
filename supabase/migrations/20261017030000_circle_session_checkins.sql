-- IELS Circle weekly session check-ins. Additive and safe to re-run.
-- Sessions recur every Wednesday 19:00 and Saturday 13:00 Asia/Jakarta (src/lib/circle/sessions.ts); they are not
-- stored as rows. A check-in is (session_start, user_id): session_start is the session's real instant (timestamptz),
-- checked here against the same Asia/Jakarta slots. One check-in per member per session; members manage only their own.

create table if not exists public.circle_session_checkins (
  session_start timestamptz not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_start, user_id),
  constraint circle_session_checkins_valid_slot check (
    date_trunc('minute', session_start) = session_start and (
      (extract(isodow from session_start at time zone 'Asia/Jakarta') = 3 and (session_start at time zone 'Asia/Jakarta')::time = time '19:00')
      or (extract(isodow from session_start at time zone 'Asia/Jakarta') = 6 and (session_start at time zone 'Asia/Jakarta')::time = time '13:00')
    )
  )
);
create index if not exists circle_session_checkins_user_idx on public.circle_session_checkins (user_id, session_start);

alter table public.circle_session_checkins enable row level security;

-- Members see only their own check-ins (participant numbers come from the aggregate function below).
drop policy if exists "circle_checkins_select_own" on public.circle_session_checkins;
create policy "circle_checkins_select_own" on public.circle_session_checkins
  for select to authenticated using (auth.uid() = user_id);

-- Check in only as yourself, only for an upcoming session within the next 5 weeks.
drop policy if exists "circle_checkins_insert_own" on public.circle_session_checkins;
create policy "circle_checkins_insert_own" on public.circle_session_checkins
  for insert to authenticated
  with check (auth.uid() = user_id and session_start > now() and session_start < now() + interval '35 days');

-- Cancel only your own check-in, and only before the session starts.
drop policy if exists "circle_checkins_delete_own" on public.circle_session_checkins;
create policy "circle_checkins_delete_own" on public.circle_session_checkins
  for delete to authenticated using (auth.uid() = user_id and session_start > now());

revoke all on public.circle_session_checkins from anon, authenticated;
grant select, insert, delete on public.circle_session_checkins to authenticated;

-- Real participant counts for the given sessions: numbers only, never who.
create or replace function public.circle_session_counts(p_starts timestamptz[])
returns table (session_start timestamptz, checkins int)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select c.session_start, count(*)::int
    from public.circle_session_checkins c
   where c.session_start = any(p_starts[1:20])
   group by c.session_start
$$;
revoke all on function public.circle_session_counts(timestamptz[]) from public;
grant execute on function public.circle_session_counts(timestamptz[]) to anon, authenticated;

-- Organisers (SQL editor / service role only): who checked in, with account contact details.
--   select * from public.circle_session_attendees where session_start = '2026-10-21 19:00+07';
create or replace view public.circle_session_attendees as
select c.session_start, c.created_at as checked_in_at, u.full_name, a.email
  from public.circle_session_checkins c
  join auth.users a on a.id = c.user_id
  left join public.users u on u.id = c.user_id;
revoke all on public.circle_session_attendees from anon, authenticated;
