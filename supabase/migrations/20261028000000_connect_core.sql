-- IELSco Connect, part 1 (2026-10-28): Passport, Discover People, Letter Intros, connections, direct messages,
-- blocks and reports. Additive only: no existing table, row, policy or grant is changed or removed. Safe to re-run.
-- docs/IELSCO-CONNECT.md explains the product; this file is the source of truth for the access rules.
--
-- Rules:
--   * Passport = new columns on public.member_profiles (the existing profile), written only through save_passport(),
--     which validates every value. The existing profile upsert in the app does not send these columns, so profile
--     saves keep working whether or not this migration is applied.
--   * Every new table has RLS on and no direct grants to anon/authenticated (except reading one's own blocks).
--     Everything goes through the security-definer functions below, which check auth.uid() themselves.
--   * Connect participation needs connect_ready(): a display name, the Connect guidelines accepted, and a self-confirmed
--     age of 18+ (a provisional policy, docs/IELSCO-CONNECT.md §6; change it here in one place).
--   * Discoverable = member_profiles.connect_discoverable (opt-in, default off), separate from the People directory's
--     is_public. Discovery shows only privacy-masked fields; city and time zone are shown to mutual connections only.
--   * A blocked pair (either direction) never sees, contacts, matches or messages each other. Errors say
--     "not_available" rather than revealing a block.
--   * A connection exists only after an accepted intro (or, in part 3, mutual consent after a Quick Match).
--   * Reports are readable by staff (public.is_site_admin()) only; the reported member never sees them.

-- ── Passport columns ────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.member_profiles add column if not exists city text;
alter table public.member_profiles add column if not exists timezone text;
alter table public.member_profiles add column if not exists languages_spoken text[] not null default '{}';
alter table public.member_profiles add column if not exists languages_learning text[] not null default '{}';
alter table public.member_profiles add column if not exists learning_goal text;
alter table public.member_profiles add column if not exists connect_topics text[] not null default '{}';
alter table public.member_profiles add column if not exists activities text[] not null default '{}';
alter table public.member_profiles add column if not exists connect_goals text[] not null default '{}';
alter table public.member_profiles add column if not exists availability_days text[] not null default '{}';
alter table public.member_profiles add column if not exists availability_times text[] not null default '{}';
alter table public.member_profiles add column if not exists connect_status text;
alter table public.member_profiles add column if not exists connect_discoverable boolean not null default false;
alter table public.member_profiles add column if not exists connect_guidelines_at timestamptz;
alter table public.member_profiles add column if not exists adult_confirmed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'member_profiles_passport_sizes'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_passport_sizes check (
      (city is null or char_length(city) <= 80) and
      (timezone is null or char_length(timezone) <= 64) and
      (learning_goal is null or char_length(learning_goal) <= 200) and
      cardinality(languages_spoken) <= 8 and cardinality(languages_learning) <= 5 and
      cardinality(connect_topics) <= 10 and cardinality(activities) <= 4 and cardinality(connect_goals) <= 7 and
      cardinality(availability_days) <= 7 and cardinality(availability_times) <= 4 and
      (connect_status is null or connect_status in ('open', 'busy'))
    );
  end if;
end $$;

create index if not exists member_profiles_connect_idx
  on public.member_profiles (updated_at desc, user_id) where connect_discoverable;
create index if not exists member_profiles_connect_langs_idx
  on public.member_profiles using gin (languages_spoken) where connect_discoverable;
create index if not exists member_profiles_connect_topics_idx
  on public.member_profiles using gin (connect_topics) where connect_discoverable;

-- ── Allowed values (the app's lib/connect/options.ts mirrors these lists) ────────────────────────────────────────────
create or replace function public.connect_allowed(p_kind text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'language' then array['en','id','ms','fil','th','vi','my','km','lo','tet','zh','ja','ko','ar','fr','de','es','nl','hi','ta','jv','su','ceb','other']
    when 'topic' then array['education','culture','technology','business','career','travel','music','sports','languages','food','books','film','science','social_impact']
    when 'activity' then array['high_school_student','university_student','professional','job_seeker','scholarship_applicant','entrepreneur','educator','other']
    when 'goal' then array['friends','practise_english','culture_exchange','study_together','scholarships','career_networking','collaborators']
    when 'day' then array['mon','tue','wed','thu','fri','sat','sun']
    when 'time' then array['morning','afternoon','evening','night']
    when 'english_level' then array['Beginner','Elementary','Intermediate','Upper-intermediate','Advanced']
    else '{}'::text[] end
$$;

-- Members can also update their own member_profiles row directly (existing owner policy), so the allowed values are
-- enforced on the table too, not only in save_passport().
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'member_profiles_passport_values'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_passport_values check (
      languages_spoken <@ public.connect_allowed('language') and languages_learning <@ public.connect_allowed('language') and
      connect_topics <@ public.connect_allowed('topic') and activities <@ public.connect_allowed('activity') and
      connect_goals <@ public.connect_allowed('goal') and availability_days <@ public.connect_allowed('day') and
      availability_times <@ public.connect_allowed('time')
    );
  end if;
end $$;

-- Trim, drop control characters, collapse to null when empty, cap length.
create or replace function public.connect_clean(p text, p_max int) returns text
language sql immutable set search_path = '' as $$
  select nullif(left(btrim(regexp_replace(coalesce(p, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g')), p_max), '')
$$;

-- jsonb array -> deduplicated text[] of allowed values. Raises on an unknown value or too many values.
create or replace function public.connect_pick(p jsonb, p_kind text, p_max int) returns text[]
language plpgsql immutable set search_path = '' as $$
declare v text[];
begin
  if p is null or jsonb_typeof(p) = 'null' then return '{}'; end if;
  if jsonb_typeof(p) <> 'array' then raise exception 'invalid_%', p_kind using errcode = '22023'; end if;
  select coalesce(array_agg(distinct x), '{}') into v from jsonb_array_elements_text(p) x;
  if not v <@ public.connect_allowed(p_kind) then raise exception 'invalid_%', p_kind using errcode = '22023'; end if;
  if cardinality(v) > p_max then raise exception 'too_many_%', p_kind using errcode = '22023'; end if;
  return v;
end $$;

-- ── Eligibility, blocks, connections (helpers) ───────────────────────────────────────────────────────────────────────
create or replace function public.connect_ready(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.member_profiles mp where mp.user_id = p_user and btrim(mp.display_name) <> ''
                 and mp.connect_guidelines_at is not null and mp.adult_confirmed_at is not null)
$$;

create table if not exists public.connect_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists connect_blocks_blocked_idx on public.connect_blocks (blocked_id);
alter table public.connect_blocks enable row level security;
revoke all on public.connect_blocks from anon, authenticated;
grant select on public.connect_blocks to authenticated;
drop policy if exists connect_blocks_own on public.connect_blocks;
create policy connect_blocks_own on public.connect_blocks for select to authenticated using (blocker_id = (select auth.uid()));

create or replace function public.connect_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.connect_blocks b
                 where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a))
$$;

create table if not exists public.connect_connections (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('intro', 'quick_match')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists connect_connections_b_idx on public.connect_connections (user_b);
alter table public.connect_connections enable row level security;
revoke all on public.connect_connections from anon, authenticated;

create or replace function public.connect_connected(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.connect_connections c where c.user_a = least(p_a, p_b) and c.user_b = greatest(p_a, p_b))
$$;

-- Creates the connection once (concurrent callers are safe: primary key + on conflict).
create or replace function public.connect_link(p_a uuid, p_b uuid, p_source text) returns void
language sql security definer set search_path = '' as $$
  insert into public.connect_connections (user_a, user_b, source) values (least(p_a, p_b), greatest(p_a, p_b), p_source)
  on conflict do nothing
$$;

-- Masked public card of one member, as JSON. Connections also get city and time zone.
create or replace function public.connect_card(p_user uuid, p_viewer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', mp.user_id, 'display_name', mp.display_name, 'avatar_url', mp.avatar_url,
    'origin_country', case when 'origin' = any(mp.public_fields) and mp.origin_country <> 'Prefer not to say' then mp.origin_country end,
    'country', case when 'country' = any(mp.public_fields) then mp.country end,
    'role_status', case when 'role_status' = any(mp.public_fields) then mp.role_status end,
    'bio', case when 'bio' = any(mp.public_fields) then mp.bio end,
    'english_level', mp.english_level, 'languages_spoken', mp.languages_spoken, 'languages_learning', mp.languages_learning,
    'learning_goal', mp.learning_goal, 'topics', mp.connect_topics, 'activities', mp.activities, 'goals', mp.connect_goals,
    'availability_days', mp.availability_days, 'availability_times', mp.availability_times, 'status', mp.connect_status,
    'city', case when public.connect_connected(p_user, p_viewer) then mp.city end,
    'timezone', case when public.connect_connected(p_user, p_viewer) then mp.timezone end)
  from public.member_profiles mp where mp.user_id = p_user
$$;

revoke all on function public.connect_clean(text, int), public.connect_pick(jsonb, text, int),
  public.connect_ready(uuid), public.connect_blocked(uuid, uuid), public.connect_connected(uuid, uuid),
  public.connect_link(uuid, uuid, text), public.connect_card(uuid, uuid) from public, anon, authenticated;
-- connect_allowed() returns static lists and is used by a member_profiles check constraint, so members writing their own
-- profile row (the existing profile form) must be able to execute it.
revoke all on function public.connect_allowed(text) from public, anon;
grant execute on function public.connect_allowed(text) to authenticated;

-- ── Passport ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.my_passport() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'exists', mp.user_id is not null, 'display_name', coalesce(mp.display_name, ''), 'avatar_url', mp.avatar_url,
    'origin_country', mp.origin_country, 'country', mp.country, 'city', mp.city, 'timezone', mp.timezone, 'bio', mp.bio,
    'english_level', mp.english_level, 'languages_spoken', coalesce(mp.languages_spoken, '{}'),
    'languages_learning', coalesce(mp.languages_learning, '{}'), 'learning_goal', mp.learning_goal,
    'topics', coalesce(mp.connect_topics, '{}'), 'activities', coalesce(mp.activities, '{}'), 'goals', coalesce(mp.connect_goals, '{}'),
    'availability_days', coalesce(mp.availability_days, '{}'), 'availability_times', coalesce(mp.availability_times, '{}'),
    'status', mp.connect_status, 'discoverable', coalesce(mp.connect_discoverable, false),
    'guidelines_accepted', mp.connect_guidelines_at is not null, 'adult_confirmed', mp.adult_confirmed_at is not null,
    'public_fields', coalesce(mp.public_fields, '{country,role_status,goals}'))
  from (select (select auth.uid()) as uid) me
  left join public.member_profiles mp on mp.user_id = me.uid
  where me.uid is not null
$$;
revoke all on function public.my_passport() from public, anon;
grant execute on function public.my_passport() to authenticated;

-- p: { display_name, origin_country, country, city, timezone, bio, english_level, languages_spoken[], languages_learning[],
--      learning_goal, topics[], activities[], goals[], availability_days[], availability_times[], status, discoverable,
--      accept_guidelines, confirm_adult }. Missing keys keep their current value.
create or replace function public.save_passport(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  cur public.member_profiles%rowtype;
  v_name text; v_tz text; v_level text; v_status text;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_input' using errcode = '22023'; end if;
  insert into public.member_profiles (user_id) values (uid) on conflict (user_id) do nothing;
  select * into cur from public.member_profiles where user_id = uid for update;

  v_name := case when p ? 'display_name' then public.connect_clean(p->>'display_name', 80) else cur.display_name end;
  if v_name is null or char_length(v_name) < 2 then raise exception 'display_name_required' using errcode = '22023'; end if;
  v_tz := case when p ? 'timezone' then public.connect_clean(p->>'timezone', 64) else cur.timezone end;
  if v_tz is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  v_level := case when p ? 'english_level' then public.connect_clean(p->>'english_level', 50) else cur.english_level end;
  if v_level is not null and not v_level = any(public.connect_allowed('english_level')) then
    raise exception 'invalid_english_level' using errcode = '22023';
  end if;
  v_status := case when p ? 'status' then public.connect_clean(p->>'status', 10) else cur.connect_status end;
  if v_status is not null and v_status not in ('open', 'busy') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if coalesce((p->>'discoverable')::boolean, false) and not (
       (coalesce((p->>'accept_guidelines')::boolean, false) or cur.connect_guidelines_at is not null)
       and (coalesce((p->>'confirm_adult')::boolean, false) or cur.adult_confirmed_at is not null)) then
    raise exception 'guidelines_and_age_required' using errcode = '22023';
  end if;

  update public.member_profiles set
    display_name = v_name,
    origin_country = case when p ? 'origin_country' then public.connect_clean(p->>'origin_country', 100) else origin_country end,
    country = case when p ? 'country' then public.connect_clean(p->>'country', 100) else country end,
    city = case when p ? 'city' then public.connect_clean(p->>'city', 80) else city end,
    timezone = v_tz,
    bio = case when p ? 'bio' then public.connect_clean(p->>'bio', 300) else bio end,
    english_level = v_level,
    languages_spoken = case when p ? 'languages_spoken' then public.connect_pick(p->'languages_spoken', 'language', 8) else languages_spoken end,
    languages_learning = case when p ? 'languages_learning' then public.connect_pick(p->'languages_learning', 'language', 5) else languages_learning end,
    learning_goal = case when p ? 'learning_goal' then public.connect_clean(p->>'learning_goal', 200) else learning_goal end,
    connect_topics = case when p ? 'topics' then public.connect_pick(p->'topics', 'topic', 10) else connect_topics end,
    activities = case when p ? 'activities' then public.connect_pick(p->'activities', 'activity', 4) else activities end,
    connect_goals = case when p ? 'goals' then public.connect_pick(p->'goals', 'goal', 7) else connect_goals end,
    availability_days = case when p ? 'availability_days' then public.connect_pick(p->'availability_days', 'day', 7) else availability_days end,
    availability_times = case when p ? 'availability_times' then public.connect_pick(p->'availability_times', 'time', 4) else availability_times end,
    connect_status = v_status,
    connect_discoverable = case when p ? 'discoverable' then coalesce((p->>'discoverable')::boolean, false) else connect_discoverable end,
    connect_guidelines_at = case when coalesce((p->>'accept_guidelines')::boolean, false) then coalesce(connect_guidelines_at, now()) else connect_guidelines_at end,
    adult_confirmed_at = case when coalesce((p->>'confirm_adult')::boolean, false) then coalesce(adult_confirmed_at, now()) else adult_confirmed_at end
  where user_id = uid;
  return public.my_passport();
end $$;
revoke all on function public.save_passport(jsonb) from public, anon;
grant execute on function public.save_passport(jsonb) to authenticated;

-- ── Letter Intros (connection requests) ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.connect_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 20 and 1000),
  reason text check (char_length(reason) <= 200),
  common text check (char_length(common) <= 200),
  topic text check (char_length(topic) <= 200),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> recipient_id)
);
create unique index if not exists connect_requests_one_pending on public.connect_requests (sender_id, recipient_id) where status = 'pending';
create index if not exists connect_requests_recipient_idx on public.connect_requests (recipient_id, status, created_at desc);
create index if not exists connect_requests_sender_idx on public.connect_requests (sender_id, created_at desc);
alter table public.connect_requests enable row level security;
revoke all on public.connect_requests from anon, authenticated;

-- Returns 'sent'. Raises: passport_required, not_available, already_connected, already_pending, they_asked_you,
-- cooldown (30 days after a decline), rate_limited (10 per 24 h, 20 pending), message_too_short.
create or replace function public.send_connect_request(p_recipient uuid, p_message text, p_reason text, p_common text, p_topic text)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); msg text := public.connect_clean(p_message, 1000); declines int; last_decline timestamptz;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  if p_recipient is null or p_recipient = uid then raise exception 'not_available' using errcode = 'P0001'; end if;
  if msg is null or char_length(msg) < 20 then raise exception 'message_too_short' using errcode = '22023'; end if;
  -- One sender/recipient pair at a time, whichever direction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(least(uid, p_recipient)::text || greatest(uid, p_recipient)::text));
  if public.connect_blocked(uid, p_recipient)
     or not exists (select 1 from public.member_profiles where user_id = p_recipient and connect_discoverable)
     or not public.connect_ready(p_recipient) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  if public.connect_connected(uid, p_recipient) then raise exception 'already_connected' using errcode = 'P0001'; end if;
  if exists (select 1 from public.connect_requests where sender_id = uid and recipient_id = p_recipient and status = 'pending') then
    raise exception 'already_pending' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.connect_requests where sender_id = p_recipient and recipient_id = uid and status = 'pending') then
    raise exception 'they_asked_you' using errcode = 'P0001';
  end if;
  select count(*), max(responded_at) into declines, last_decline
    from public.connect_requests where sender_id = uid and recipient_id = p_recipient and status = 'declined';
  if declines >= 2 then raise exception 'not_available' using errcode = 'P0001'; end if;
  if last_decline > now() - interval '30 days' then raise exception 'cooldown' using errcode = 'P0001'; end if;
  if (select count(*) from public.connect_requests where sender_id = uid and created_at > now() - interval '24 hours') >= 10
     or (select count(*) from public.connect_requests where sender_id = uid and status = 'pending') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.connect_requests (sender_id, recipient_id, message, reason, common, topic)
  values (uid, p_recipient, msg, public.connect_clean(p_reason, 200), public.connect_clean(p_common, 200), public.connect_clean(p_topic, 200));
  return 'sent';
end $$;
revoke all on function public.send_connect_request(uuid, text, text, text, text) from public, anon;
grant execute on function public.send_connect_request(uuid, text, text, text, text) to authenticated;

-- Recipient accepts (creates the connection) or declines. Returns 'accepted' | 'declined'.
create or replace function public.respond_connect_request(p_id uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); r public.connect_requests%rowtype;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into r from public.connect_requests where id = p_id and recipient_id = uid for update;
  if not found or r.status <> 'pending' then raise exception 'request_not_pending' using errcode = 'P0001'; end if;
  if p_accept and public.connect_blocked(uid, r.sender_id) then raise exception 'not_available' using errcode = 'P0001'; end if;
  update public.connect_requests set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now() where id = p_id;
  if p_accept then perform public.connect_link(uid, r.sender_id, 'intro'); end if;
  return case when p_accept then 'accepted' else 'declined' end;
end $$;
revoke all on function public.respond_connect_request(uuid, boolean) from public, anon;
grant execute on function public.respond_connect_request(uuid, boolean) to authenticated;

create or replace function public.cancel_connect_request(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.connect_requests set status = 'cancelled', responded_at = now()
   where id = p_id and sender_id = (select auth.uid()) and status = 'pending';
  if not found then raise exception 'request_not_pending' using errcode = 'P0001'; end if;
  return 'cancelled';
end $$;
revoke all on function public.cancel_connect_request(uuid) from public, anon;
grant execute on function public.cancel_connect_request(uuid) to authenticated;

-- p_box: 'incoming' (pending, to me) | 'outgoing' (sent by me, last 90 days). Requests from/to blocked members are hidden.
create or replace function public.list_connect_requests(p_box text) returns table (
  id uuid, box text, status text, message text, reason text, common text, topic text, created_at timestamptz,
  responded_at timestamptz, person jsonb
)
language sql stable security definer set search_path = '' as $$
  select r.id, p_box, r.status, r.message, r.reason, r.common, r.topic, r.created_at, r.responded_at,
         public.connect_card(case when p_box = 'incoming' then r.sender_id else r.recipient_id end, (select auth.uid()))
    from public.connect_requests r
   where (select auth.uid()) is not null
     and ((p_box = 'incoming' and r.recipient_id = (select auth.uid()) and r.status = 'pending')
       or (p_box = 'outgoing' and r.sender_id = (select auth.uid()) and r.created_at > now() - interval '90 days'))
     and not public.connect_blocked(r.sender_id, r.recipient_id)
   order by r.created_at desc
   limit 100
$$;
revoke all on function public.list_connect_requests(text) from public, anon;
grant execute on function public.list_connect_requests(text) to authenticated;

-- ── Discover People ──────────────────────────────────────────────────────────────────────────────────────────────────
-- Rule-based, explainable ranking (no AI): +3 for each language they speak that I'm learning, +3 for each language they're
-- learning that I speak, +2 per shared connection goal, +1 per shared topic, +1 if any availability day overlaps,
-- +1 same country of origin. Filters and scores use only fields the member shows in Connect.
create or replace function public.list_connect_people(
  p_search text default null, p_country text default null, p_speaks text default null, p_learning text default null,
  p_english_level text default null, p_topic text default null, p_goal text default null, p_activity text default null,
  p_day text default null, p_limit int default 12, p_offset int default 0
) returns table (person jsonb, score int, they_teach text[], they_learn text[], shared_topics text[], shared_goals text[],
                 shared_days text[], relation text)
language sql stable security definer set search_path = '' as $$
  with me as (
    select mp.* from public.member_profiles mp where mp.user_id = (select auth.uid())
  ), cand as (
    select mp.user_id, mp.updated_at,
      case when 'origin' = any(mp.public_fields) and mp.origin_country <> 'Prefer not to say' then mp.origin_country end as origin_v,
      case when 'country' = any(mp.public_fields) then mp.country end as country_v,
      array(select unnest(mp.languages_spoken) intersect select unnest(coalesce(me.languages_learning, '{}'))) as teach,
      array(select unnest(mp.languages_learning) intersect select unnest(coalesce(me.languages_spoken, '{}'))) as learn,
      array(select unnest(mp.connect_topics) intersect select unnest(coalesce(me.connect_topics, '{}'))) as topics,
      array(select unnest(mp.connect_goals) intersect select unnest(coalesce(me.connect_goals, '{}'))) as goals,
      array(select unnest(mp.availability_days) intersect select unnest(coalesce(me.availability_days, '{}'))) as days,
      me.origin_country as my_origin, mp
    from public.member_profiles mp
    left join me on true
    where (select auth.uid()) is not null
      and mp.connect_discoverable and mp.user_id <> (select auth.uid())
      and public.connect_ready(mp.user_id)
      and not public.connect_blocked(mp.user_id, (select auth.uid()))
  )
  select public.connect_card(c.user_id, (select auth.uid())),
    (3 * cardinality(c.teach) + 3 * cardinality(c.learn) + 2 * cardinality(c.goals) + cardinality(c.topics)
      + (case when cardinality(c.days) > 0 then 1 else 0 end)
      + (case when c.origin_v is not null and c.origin_v = c.my_origin then 1 else 0 end))::int as score,
    c.teach, c.learn, c.topics, c.goals, c.days,
    case when public.connect_connected(c.user_id, (select auth.uid())) then 'connected'
         when exists (select 1 from public.connect_requests r where r.status = 'pending' and r.sender_id = (select auth.uid()) and r.recipient_id = c.user_id) then 'request_sent'
         when exists (select 1 from public.connect_requests r where r.status = 'pending' and r.recipient_id = (select auth.uid()) and r.sender_id = c.user_id) then 'request_received'
         end
  from cand c
  where (p_country is null or c.origin_v = p_country or c.country_v = p_country)
    and (p_speaks is null or p_speaks = any((c.mp).languages_spoken))
    and (p_learning is null or p_learning = any((c.mp).languages_learning))
    and (p_english_level is null or (c.mp).english_level = p_english_level)
    and (p_topic is null or p_topic = any((c.mp).connect_topics))
    and (p_goal is null or p_goal = any((c.mp).connect_goals))
    and (p_activity is null or p_activity = any((c.mp).activities))
    and (p_day is null or p_day = any((c.mp).availability_days))
    and (p_search is null or (c.mp).display_name ilike '%' || replace(replace(p_search, '%', ''), '_', '') || '%')
  order by 2 desc, c.updated_at desc, c.user_id
  limit least(greatest(coalesce(p_limit, 12), 1), 30)
  offset least(greatest(coalesce(p_offset, 0), 0), 1000)
$$;
revoke all on function public.list_connect_people(text, text, text, text, text, text, text, text, text, int, int) from public, anon;
grant execute on function public.list_connect_people(text, text, text, text, text, text, text, text, text, int, int) to authenticated;

-- One member's card + relation. Visible when they are discoverable or already connected, and nobody blocked anybody.
create or replace function public.connect_person(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.connect_card(p_user, (select auth.uid())) || jsonb_build_object('relation',
    case when public.connect_connected(p_user, (select auth.uid())) then 'connected'
         when exists (select 1 from public.connect_requests r where r.status = 'pending' and r.sender_id = (select auth.uid()) and r.recipient_id = p_user) then 'request_sent'
         when exists (select 1 from public.connect_requests r where r.status = 'pending' and r.recipient_id = (select auth.uid()) and r.sender_id = p_user) then 'request_received'
         end)
   where (select auth.uid()) is not null and p_user <> (select auth.uid())
     and not public.connect_blocked(p_user, (select auth.uid()))
     and (public.connect_connected(p_user, (select auth.uid()))
          or exists (select 1 from public.member_profiles mp where mp.user_id = p_user and mp.connect_discoverable and public.connect_ready(p_user)))
$$;
revoke all on function public.connect_person(uuid) from public, anon;
grant execute on function public.connect_person(uuid) to authenticated;

-- ── Direct messages (mutual connections only) ────────────────────────────────────────────────────────────────────────
create table if not exists public.connect_messages (
  id bigint generated always as identity primary key,
  user_a uuid not null,
  user_b uuid not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (user_a, user_b) references public.connect_connections (user_a, user_b) on delete cascade,
  check (sender_id in (user_a, user_b))
);
create index if not exists connect_messages_pair_idx on public.connect_messages (user_a, user_b, id desc);
create index if not exists connect_messages_sender_idx on public.connect_messages (sender_id, created_at desc);
alter table public.connect_messages enable row level security;
revoke all on public.connect_messages from anon, authenticated;

create table if not exists public.connect_message_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  other_id uuid not null references auth.users(id) on delete cascade,
  last_read_id bigint not null default 0,
  primary key (user_id, other_id)
);
alter table public.connect_message_reads enable row level security;
revoke all on public.connect_message_reads from anon, authenticated;

-- Returns the new message. Raises not_connected, not_available (blocked), empty_message, rate_limited (20 per minute).
create or replace function public.send_connect_message(p_to uuid, p_body text) returns table (id bigint, created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b text := public.connect_clean(p_body, 2000);
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_connected(uid, p_to) then raise exception 'not_connected' using errcode = '42501'; end if;
  if public.connect_blocked(uid, p_to) then raise exception 'not_available' using errcode = 'P0001'; end if;
  if b is null then raise exception 'empty_message' using errcode = '22023'; end if;
  if (select count(*) from public.connect_messages m where m.sender_id = uid and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return query insert into public.connect_messages as m (user_a, user_b, sender_id, body)
    values (least(uid, p_to), greatest(uid, p_to), uid, b) returning m.id, m.created_at;
end $$;
revoke all on function public.send_connect_message(uuid, text) from public, anon;
grant execute on function public.send_connect_message(uuid, text) to authenticated;

-- Newest first, keyset pagination (p_before = smallest id already shown).
create or replace function public.list_connect_messages(p_with uuid, p_before bigint default null, p_limit int default 30)
returns table (id bigint, mine boolean, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not public.connect_connected(uid, p_with) then raise exception 'not_connected' using errcode = '42501'; end if;
  return query select m.id, m.sender_id = uid, m.body, m.created_at from public.connect_messages m
    where m.user_a = least(uid, p_with) and m.user_b = greatest(uid, p_with) and (p_before is null or m.id < p_before)
    order by m.id desc limit least(greatest(coalesce(p_limit, 30), 1), 100);
end $$;
revoke all on function public.list_connect_messages(uuid, bigint, int) from public, anon;
grant execute on function public.list_connect_messages(uuid, bigint, int) to authenticated;

create or replace function public.mark_connect_read(p_with uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); top bigint;
begin
  if uid is null or not public.connect_connected(uid, p_with) then raise exception 'not_connected' using errcode = '42501'; end if;
  select max(m.id) into top from public.connect_messages m where m.user_a = least(uid, p_with) and m.user_b = greatest(uid, p_with);
  insert into public.connect_message_reads (user_id, other_id, last_read_id) values (uid, p_with, coalesce(top, 0))
  on conflict (user_id, other_id) do update set last_read_id = greatest(public.connect_message_reads.last_read_id, excluded.last_read_id);
end $$;
revoke all on function public.mark_connect_read(uuid) from public, anon;
grant execute on function public.mark_connect_read(uuid) to authenticated;

-- My connections with the latest message and unread count, most recent activity first.
create or replace function public.list_connect_connections() returns table (
  person jsonb, source text, connected_at timestamptz, last_body text, last_at timestamptz, last_mine boolean, unread int, blocked boolean
)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end as other, c.*
      from public.connect_connections c
     where (select auth.uid()) in (c.user_a, c.user_b)
  )
  select public.connect_card(x.other, (select auth.uid())), x.source, x.created_at,
         left(lm.body, 140), lm.created_at, lm.sender_id = (select auth.uid()),
         (select count(*)::int from public.connect_messages m
           where m.user_a = x.user_a and m.user_b = x.user_b and m.sender_id = x.other
             and m.id > coalesce((select r.last_read_id from public.connect_message_reads r where r.user_id = (select auth.uid()) and r.other_id = x.other), 0)),
         public.connect_blocked(x.other, (select auth.uid()))
    from mine x
    left join lateral (select m.body, m.created_at, m.sender_id from public.connect_messages m
                        where m.user_a = x.user_a and m.user_b = x.user_b order by m.id desc limit 1) lm on true
   order by coalesce(lm.created_at, x.created_at) desc
   limit 200
$$;
revoke all on function public.list_connect_connections() from public, anon;
grant execute on function public.list_connect_connections() to authenticated;

-- ── Blocks and reports ───────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.block_member(p_user uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_user is null or p_user = uid or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  insert into public.connect_blocks (blocker_id, blocked_id) values (uid, p_user) on conflict do nothing;
  update public.connect_requests set status = 'cancelled', responded_at = now()
   where status = 'pending' and ((sender_id = uid and recipient_id = p_user) or (sender_id = p_user and recipient_id = uid));
  return 'blocked';
end $$;
revoke all on function public.block_member(uuid) from public, anon;
grant execute on function public.block_member(uuid) to authenticated;

create or replace function public.unblock_member(p_user uuid) returns text
language sql security definer set search_path = '' as $$
  delete from public.connect_blocks where blocker_id = (select auth.uid()) and blocked_id = p_user;
  select 'unblocked'
$$;
revoke all on function public.unblock_member(uuid) from public, anon;
grant execute on function public.unblock_member(uuid) to authenticated;

-- Display name only (the blocked member may no longer be discoverable).
create or replace function public.list_my_blocks() returns table (id uuid, display_name text, blocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.blocked_id, coalesce(nullif(mp.display_name, ''), 'IELS member'), b.created_at
    from public.connect_blocks b left join public.member_profiles mp on mp.user_id = b.blocked_id
   where b.blocker_id = (select auth.uid()) order by b.created_at desc
$$;
revoke all on function public.list_my_blocks() from public, anon;
grant execute on function public.list_my_blocks() to authenticated;

create table if not exists public.connect_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  context text not null check (context in ('profile', 'request', 'message', 'call', 'room')),
  context_id text check (char_length(context_id) <= 100),
  reason text not null check (reason in ('harassment', 'spam', 'inappropriate', 'fake_profile', 'underage', 'safety', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reporter_id <> reported_id)
);
create index if not exists connect_reports_open_idx on public.connect_reports (status, created_at desc);
alter table public.connect_reports enable row level security;
revoke all on public.connect_reports from anon, authenticated;
grant select, update on public.connect_reports to authenticated;
drop policy if exists connect_reports_admin_read on public.connect_reports;
create policy connect_reports_admin_read on public.connect_reports for select to authenticated using (public.is_site_admin());
drop policy if exists connect_reports_admin_update on public.connect_reports;
create policy connect_reports_admin_update on public.connect_reports for update to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

-- Returns 'reported'. Optionally blocks as well. 10 reports per 24 h.
create or replace function public.report_member(p_user uuid, p_context text, p_context_id text, p_reason text, p_details text, p_block boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_user is null or p_user = uid or not exists (select 1 from auth.users where id = p_user) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  if (select count(*) from public.connect_reports where reporter_id = uid and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.connect_reports (reporter_id, reported_id, context, context_id, reason, details)
  values (uid, p_user, p_context, public.connect_clean(p_context_id, 100), p_reason, public.connect_clean(p_details, 1000));
  if coalesce(p_block, false) then perform public.block_member(p_user); end if;
  return 'reported';
end $$;
revoke all on function public.report_member(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.report_member(uuid, text, text, text, text, boolean) to authenticated;

-- ── Connect home summary (real counts only) ──────────────────────────────────────────────────────────────────────────
create or replace function public.connect_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ready', public.connect_ready(me.uid),
    'discoverable', coalesce((select connect_discoverable from public.member_profiles where user_id = me.uid), false),
    'incoming', (select count(*) from public.connect_requests r where r.recipient_id = me.uid and r.status = 'pending'
                  and not public.connect_blocked(r.sender_id, me.uid)),
    'outgoing', (select count(*) from public.connect_requests r where r.sender_id = me.uid and r.status = 'pending'),
    'connections', (select count(*) from public.connect_connections c where me.uid in (c.user_a, c.user_b)),
    'unread', (select coalesce(sum(u.unread), 0) from public.list_connect_connections() u where not u.blocked))
  from (select (select auth.uid()) as uid) me where me.uid is not null
$$;
revoke all on function public.connect_summary() from public, anon;
grant execute on function public.connect_summary() to authenticated;
