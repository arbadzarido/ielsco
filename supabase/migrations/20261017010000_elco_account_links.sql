-- Phase 5: IELSco <-> Elco account linking (docs/INTEGRATION-ARCHITECTURE.md §4-5). Additive only; idempotent.
--
-- Flow (authorization-code pattern):
--   1. IELSco member consents on /connect/elco  -> create_elco_link_code()  (member's own session, auth.uid())
--   2. Elco API exchanges the code server-to-server -> consume_elco_link_code()  (service role only)
--   3. Elco API reads goals / writes a summary for an active link with the matching scope (service role only)
--   4. Either side can revoke.
-- Codes and states are stored only as SHA-256 hashes. Accounts are never matched by email.
-- Members can read their own link and summary; they cannot insert, update or delete anything directly.

create table if not exists public.elco_account_links (
  id uuid primary key default gen_random_uuid(),
  ielsco_user_id uuid not null references auth.users(id) on delete cascade,
  elco_user_id uuid not null,
  scopes text[] not null check (cardinality(scopes) between 1 and 2 and scopes <@ array['goals:read', 'summary:write']::text[]),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
-- One active link per account on each side ("unlink first").
create unique index if not exists elco_account_links_one_active_ielsco on public.elco_account_links (ielsco_user_id) where revoked_at is null;
create unique index if not exists elco_account_links_one_active_elco on public.elco_account_links (elco_user_id) where revoked_at is null;

create table if not exists public.elco_link_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  state_hash text not null check (state_hash ~ '^[0-9a-f]{64}$'),
  ielsco_user_id uuid not null references auth.users(id) on delete cascade,
  scopes text[] not null check (cardinality(scopes) between 1 and 2 and scopes <@ array['goals:read', 'summary:write']::text[]),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists elco_link_codes_user_idx on public.elco_link_codes (ielsco_user_id, created_at desc);

-- Latest Elco learning snapshot per member (only while a link with summary:write is active). Labelled as an estimate in the UI.
create table if not exists public.elco_learning_summaries (
  ielsco_user_id uuid primary key references auth.users(id) on delete cascade,
  link_id uuid not null references public.elco_account_links(id) on delete cascade,
  level_estimate text check (level_estimate is null or level_estimate in ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced')),
  focus_skills text[] not null default '{}' check (cardinality(focus_skills) <= 3 and char_length(array_to_string(focus_skills, '')) <= 120),
  practice_count_30d int not null default 0 check (practice_count_30d between 0 and 100000),
  last_active_at timestamptz,
  generated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.elco_account_links enable row level security;
alter table public.elco_link_codes enable row level security;
alter table public.elco_learning_summaries enable row level security;

revoke all on public.elco_account_links, public.elco_link_codes, public.elco_learning_summaries from anon, authenticated;
-- Owners may read their own link (without the other product's user id) and summary. No client writes at all.
grant select (id, ielsco_user_id, scopes, created_at, revoked_at) on public.elco_account_links to authenticated;
grant select on public.elco_learning_summaries to authenticated;

drop policy if exists "elco_links_select_own" on public.elco_account_links;
create policy "elco_links_select_own" on public.elco_account_links for select to authenticated using (auth.uid() = ielsco_user_id);
drop policy if exists "elco_summaries_select_own" on public.elco_learning_summaries;
create policy "elco_summaries_select_own" on public.elco_learning_summaries for select to authenticated using (auth.uid() = ielsco_user_id);
-- elco_link_codes: RLS on, no policies, no grants -> unreachable from the browser.

-- 1. Member consents: store a one-time code (5 min) bound to the member, scopes and state. Called with the member's
--    own session, so the user id comes from auth.uid(), never from the request body.
create or replace function public.create_elco_link_code(p_code_hash text, p_state_hash text, p_scopes text[])
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_expires timestamptz := now() + interval '5 minutes';
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.elco_account_links where ielsco_user_id = v_uid and revoked_at is null) then
    raise exception 'already_linked' using errcode = 'P0001';
  end if;
  -- Housekeeping + abuse limit: drop this member's spent/expired codes; at most 5 open codes at a time.
  delete from public.elco_link_codes where ielsco_user_id = v_uid and (used_at is not null or expires_at < now());
  if (select count(*) from public.elco_link_codes where ielsco_user_id = v_uid) >= 5 then
    raise exception 'too_many_codes' using errcode = 'P0001';
  end if;
  insert into public.elco_link_codes (code_hash, state_hash, ielsco_user_id, scopes, expires_at)
  values (p_code_hash, p_state_hash, v_uid, p_scopes, v_expires);
  return v_expires;
end $$;

-- 2. Elco exchanges the code. Single use even when it fails (the code is spent first, then checked), atomic under
--    concurrency (row lock via UPDATE ... RETURNING). Returns {"error": ...} instead of raising, so the spend sticks.
create or replace function public.consume_elco_link_code(p_code_hash text, p_state_hash text, p_elco_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_code public.elco_link_codes%rowtype;
  v_link_id uuid;
begin
  update public.elco_link_codes set used_at = now()
   where code_hash = p_code_hash and used_at is null
  returning * into v_code;
  if not found then return jsonb_build_object('error', 'invalid_code'); end if;
  if v_code.expires_at < now() then return jsonb_build_object('error', 'expired_code'); end if;
  if v_code.state_hash <> p_state_hash then return jsonb_build_object('error', 'state_mismatch'); end if;
  if exists (select 1 from public.elco_account_links where ielsco_user_id = v_code.ielsco_user_id and revoked_at is null) then
    return jsonb_build_object('error', 'already_linked');
  end if;
  if exists (select 1 from public.elco_account_links where elco_user_id = p_elco_user_id and revoked_at is null) then
    return jsonb_build_object('error', 'elco_already_linked');
  end if;
  insert into public.elco_account_links (ielsco_user_id, elco_user_id, scopes)
  values (v_code.ielsco_user_id, p_elco_user_id, v_code.scopes)
  returning id into v_link_id;
  return jsonb_build_object('link_id', v_link_id, 'scopes', to_jsonb(v_code.scopes), 'ielsco_user_id', v_code.ielsco_user_id);
exception when unique_violation then
  return jsonb_build_object('error', 'already_linked');
end $$;

-- 3a. Goals for an active link with goals:read (null when not allowed).
create or replace function public.elco_goals_for_link(p_link_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
           'direction', mp.direction, 'destination_country', mp.destination_country,
           'destination_countries', to_jsonb(coalesce(mp.destination_countries, '{}')), 'interests', to_jsonb(coalesce(mp.interests, '{}')),
           'english_level', mp.english_level, 'updated_at', mp.updated_at)
    from public.elco_account_links l
    left join public.member_profiles mp on mp.user_id = l.ielsco_user_id
   where l.id = p_link_id and l.revoked_at is null and 'goals:read' = any(l.scopes)
$$;

-- 3b. Latest summary for an active link with summary:write. Older snapshots (replays) never overwrite newer ones.
create or replace function public.upsert_elco_summary(p_link_id uuid, p_level_estimate text, p_focus_skills text[],
  p_practice_count_30d int, p_last_active_at timestamptz, p_generated_at timestamptz)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_link public.elco_account_links%rowtype;
  v_rows int;
begin
  select * into v_link from public.elco_account_links where id = p_link_id and revoked_at is null;
  if not found then return 'not_found'; end if;
  if not ('summary:write' = any(v_link.scopes)) then return 'scope_missing'; end if;
  if p_generated_at > now() + interval '5 minutes' then return 'invalid_time'; end if;
  insert into public.elco_learning_summaries as s (ielsco_user_id, link_id, level_estimate, focus_skills, practice_count_30d, last_active_at, generated_at)
  values (v_link.ielsco_user_id, v_link.id, p_level_estimate, coalesce(p_focus_skills, '{}'), coalesce(p_practice_count_30d, 0), p_last_active_at, p_generated_at)
  on conflict (ielsco_user_id) do update set
    link_id = excluded.link_id, level_estimate = excluded.level_estimate, focus_skills = excluded.focus_skills,
    practice_count_30d = excluded.practice_count_30d, last_active_at = excluded.last_active_at,
    generated_at = excluded.generated_at, updated_at = now()
  where s.generated_at < excluded.generated_at or s.link_id <> excluded.link_id;
  get diagnostics v_rows = row_count;
  return case when v_rows = 1 then 'ok' else 'stale' end;
end $$;

-- 4a. Revoke by link id (Elco side unlinked). Idempotent. Consent ends, so the summary copy is deleted too.
create or replace function public.revoke_elco_link(p_link_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_found boolean;
begin
  update public.elco_account_links set revoked_at = coalesce(revoked_at, now()) where id = p_link_id;
  v_found := found;
  delete from public.elco_learning_summaries where link_id = p_link_id;
  return v_found;
end $$;

-- 4b. Member unlinks from IELSco (own session). Returns the revoked link id so the server can notify Elco.
create or replace function public.revoke_my_elco_link()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.elco_account_links set revoked_at = now()
   where ielsco_user_id = auth.uid() and revoked_at is null
  returning id into v_id;
  if v_id is not null then delete from public.elco_learning_summaries where link_id = v_id; end if;
  return v_id;
end $$;

revoke all on function public.create_elco_link_code(text, text, text[]) from public, anon;
revoke all on function public.consume_elco_link_code(text, text, uuid) from public, anon, authenticated;
revoke all on function public.elco_goals_for_link(uuid) from public, anon, authenticated;
revoke all on function public.upsert_elco_summary(uuid, text, text[], int, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_elco_link(uuid) from public, anon, authenticated;
revoke all on function public.revoke_my_elco_link() from public, anon;

grant execute on function public.create_elco_link_code(text, text, text[]) to authenticated;
grant execute on function public.revoke_my_elco_link() to authenticated;
grant execute on function public.consume_elco_link_code(text, text, uuid) to service_role;
grant execute on function public.elco_goals_for_link(uuid) to service_role;
grant execute on function public.upsert_elco_summary(uuid, text, text[], int, timestamptz, timestamptz) to service_role;
grant execute on function public.revoke_elco_link(uuid) to service_role;
