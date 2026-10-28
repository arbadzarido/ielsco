-- IELSco Connect, part 3 (2026-10-28): Quick Match (one-to-one voice or video, 8 minutes, AI Topic or Free Talk).
-- Additive only; safe to re-run. Needs 20261028000000_connect_core.sql.
--
-- Rules:
--   * Ships switched OFF: connect_settings.quick_match_enabled = false. Staff turn it on with SQL once media relay (TURN)
--     is configured and tested (docs/IELSCO-CONNECT.md §5). While off, joining the queue is refused.
--   * Media is peer-to-peer WebRTC. The database only matches people and relays the WebRTC handshake
--     (connect_call_signals); it never sees audio or video. Nothing is recorded.
--   * The 8-minute limit is set by the server at match time (expires_at). After it, signalling is refused, the call reads
--     as ended ('timeout'), and the client hangs up. A peer-to-peer stream cannot be cut by the server itself; the TURN
--     credentials the app hands out (/api/connect/ice) expire with the call, which bounds relayed calls.
--   * Matching is serialised with a transaction-level advisory lock, so two people can't both claim the same partner.
--     Never matched: yourself, a blocked pair (either direction), or someone you were matched with in the last 24 h.
--   * A connection is created only when both participants independently say yes after the call.
--   * "AI Topic" means a prompt from the curated library below (no AI service is called).

create table if not exists public.connect_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,60}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.connect_settings enable row level security;
revoke all on public.connect_settings from anon, authenticated;
grant select, insert, update on public.connect_settings to authenticated;
drop policy if exists connect_settings_admin on public.connect_settings;
create policy connect_settings_admin on public.connect_settings for all to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
insert into public.connect_settings (key, value) values ('quick_match_enabled', 'false'::jsonb) on conflict (key) do nothing;

create table if not exists public.connect_prompts (
  id int primary key,
  body text not null check (char_length(body) between 10 and 200),
  topics text[] not null default '{}',
  active boolean not null default true
);
alter table public.connect_prompts enable row level security;
revoke all on public.connect_prompts from anon, authenticated;

-- Original IELSco prompts. Re-running updates the wording; ids are stable.
insert into public.connect_prompts (id, body, topics) values
  (1, 'What do you love most about the city or town you live in?', '{culture,travel}'),
  (2, 'Which tradition from your culture would you like other people to understand better?', '{culture}'),
  (3, 'What career would you like to have in five years, and why?', '{career}'),
  (4, 'Where is your dream travel destination, and what would you do first there?', '{travel}'),
  (5, 'What would you like to learn from someone who grew up in another country?', '{culture,languages}'),
  (6, 'Which dish from your home would you cook for a guest, and how is it made?', '{food,culture}'),
  (7, 'What is one word in your language that is hard to translate into English?', '{languages}'),
  (8, 'Tell me about a teacher or mentor who changed the way you think.', '{education}'),
  (9, 'If you could study abroad for one year, where would you go and what would you study?', '{education}'),
  (10, 'What app or piece of technology do you use every day, and what would you improve?', '{technology}'),
  (11, 'What problem in your community would you like to help solve?', '{social_impact,business}'),
  (12, 'If you started a small business tomorrow, what would it sell?', '{business}'),
  (13, 'What song or artist would you recommend to someone visiting your country?', '{music,culture}'),
  (14, 'Which sport or game is popular where you live, and do you play it?', '{sports}'),
  (15, 'What book, film or series have you enjoyed recently, and why?', '{books,film}'),
  (16, 'What helps you most when you practise speaking English?', '{languages,education}'),
  (17, 'Describe a perfect weekend in your city.', '{culture,travel}'),
  (18, 'What is a festival or holiday you look forward to every year?', '{culture}'),
  (19, 'What skill are you learning right now, and how is it going?', '{education,career}'),
  (20, 'What surprised you the first time you met someone from another country?', '{culture}'),
  (21, 'What does a normal school or work day look like for you?', '{education,career}'),
  (22, 'Which scientific discovery or invention do you find most interesting?', '{science,technology}'),
  (23, 'What advice would you give to someone preparing a scholarship application?', '{education}'),
  (24, 'What is something people often get wrong about your country?', '{culture}'),
  (25, 'If you could have dinner with anyone from history, who would it be?', '{books,culture}'),
  (26, 'What kind of job interview question makes you nervous, and how would you answer it?', '{career}'),
  (27, 'What place in Southeast Asia would you like to visit next?', '{travel}'),
  (28, 'What is a small habit that makes your day better?', '{}'),
  (29, 'What would you like to be able to say in English one year from now?', '{languages}'),
  (30, 'Which goal are you working towards this month?', '{}')
on conflict (id) do update set body = excluded.body, topics = excluded.topics;

create table if not exists public.connect_match_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text not null check (mode in ('voice', 'video')),
  style text not null check (style in ('ai_topic', 'free_talk')),
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);
create index if not exists connect_match_queue_mode_idx on public.connect_match_queue (mode, joined_at);
alter table public.connect_match_queue enable row level security;
revoke all on public.connect_match_queue from anon, authenticated;

create table if not exists public.connect_calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,  -- joined second; sends the WebRTC offer
  callee_id uuid not null references auth.users(id) on delete cascade,  -- was waiting in the queue
  mode text not null check (mode in ('voice', 'video')),
  style text not null check (style in ('ai_topic', 'free_talk')),
  prompt_id int references public.connect_prompts(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  end_reason text check (end_reason in ('left', 'skipped', 'timeout', 'failed', 'reported', 'blocked')),
  ended_by uuid,
  caller_connect boolean, callee_connect boolean,
  caller_enjoyed boolean, callee_enjoyed boolean,
  check (caller_id <> callee_id)
);
create index if not exists connect_calls_caller_idx on public.connect_calls (caller_id, created_at desc);
create index if not exists connect_calls_callee_idx on public.connect_calls (callee_id, created_at desc);
alter table public.connect_calls enable row level security;
revoke all on public.connect_calls from anon, authenticated;

create table if not exists public.connect_call_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.connect_calls(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('offer', 'answer', 'ice', 'bye')),
  payload jsonb not null check (pg_column_size(payload) <= 16000),
  created_at timestamptz not null default now()
);
create index if not exists connect_call_signals_call_idx on public.connect_call_signals (call_id, id);
alter table public.connect_call_signals enable row level security;
revoke all on public.connect_call_signals from anon, authenticated;

create or replace function public.quick_match_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value)::text = 'true' from public.connect_settings where key = 'quick_match_enabled'), false)
$$;
revoke all on function public.quick_match_enabled() from public, anon, authenticated;

-- Marks calls past expires_at as ended. Called by every Quick Match function, so the limit holds without a cron job.
create or replace function public.connect_expire_calls(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update public.connect_calls set ended_at = expires_at, end_reason = 'timeout'
   where ended_at is null and expires_at <= now() and p_user in (caller_id, callee_id)
$$;
revoke all on function public.connect_expire_calls(uuid) from public, anon, authenticated;

create or replace function public.connect_active_call(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.connect_calls where ended_at is null and expires_at > now() and p_user in (caller_id, callee_id)
   order by created_at desc limit 1
$$;
revoke all on function public.connect_active_call(uuid) from public, anon, authenticated;

-- { enabled, ready, adult_confirmed, waiting: {mode, style} | null, call_id | null }. Also keeps a queue entry alive.
create or replace function public.quick_match_poll() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); q public.connect_match_queue%rowtype;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  perform public.connect_expire_calls(uid);
  update public.connect_match_queue set seen_at = now() where user_id = uid returning * into q;
  return jsonb_build_object('enabled', public.quick_match_enabled(), 'ready', public.connect_ready(uid),
    'waiting', case when q.user_id is not null then jsonb_build_object('mode', q.mode, 'style', q.style, 'since', q.joined_at) end,
    'call_id', public.connect_active_call(uid));
end $$;
revoke all on function public.quick_match_poll() from public, anon;
grant execute on function public.quick_match_poll() to authenticated;

-- Returns { status: 'matched', call_id } or { status: 'waiting' }. Raises quick_match_disabled, passport_required,
-- rate_limited (30 calls per 24 h).
create or replace function public.quick_match_join(p_mode text, p_style text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); partner public.connect_match_queue%rowtype; v_call uuid; v_prompt int;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.quick_match_enabled() then raise exception 'quick_match_disabled' using errcode = 'P0001'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  if p_mode not in ('voice', 'video') or p_style not in ('ai_topic', 'free_talk') then raise exception 'invalid_input' using errcode = '22023'; end if;
  perform public.connect_expire_calls(uid);
  v_call := public.connect_active_call(uid);
  if v_call is not null then return jsonb_build_object('status', 'matched', 'call_id', v_call); end if;
  if (select count(*) from public.connect_calls where uid in (caller_id, callee_id) and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(7340211);  -- one matcher at a time
  delete from public.connect_match_queue where seen_at < now() - interval '30 seconds';
  select q.* into partner from public.connect_match_queue q
   where q.user_id <> uid and q.mode = p_mode
     and public.connect_ready(q.user_id)
     and not public.connect_blocked(q.user_id, uid)
     and public.connect_active_call(q.user_id) is null
     and not exists (select 1 from public.connect_calls c where c.created_at > now() - interval '24 hours'
                      and ((c.caller_id = uid and c.callee_id = q.user_id) or (c.caller_id = q.user_id and c.callee_id = uid)))
   order by q.joined_at limit 1;

  if partner.user_id is null then
    insert into public.connect_match_queue (user_id, mode, style) values (uid, p_mode, p_style)
    on conflict (user_id) do update set mode = excluded.mode, style = excluded.style, seen_at = now(),
      joined_at = case when public.connect_match_queue.mode = excluded.mode then public.connect_match_queue.joined_at else now() end;
    return jsonb_build_object('status', 'waiting');
  end if;

  delete from public.connect_match_queue where user_id in (uid, partner.user_id);
  if p_style = 'ai_topic' or partner.style = 'ai_topic' then
    select pr.id into v_prompt from public.connect_prompts pr
     left join public.member_profiles a on a.user_id = uid
     left join public.member_profiles b on b.user_id = partner.user_id
     where pr.active
     order by (cardinality(array(select unnest(pr.topics) intersect select unnest(coalesce(a.connect_topics, '{}') || coalesce(b.connect_topics, '{}')))) > 0) desc,
              random()
     limit 1;
  end if;
  insert into public.connect_calls (caller_id, callee_id, mode, style, prompt_id, expires_at)
  values (uid, partner.user_id, p_mode, case when v_prompt is not null then 'ai_topic' else 'free_talk' end, v_prompt, now() + interval '8 minutes')
  returning id into v_call;
  return jsonb_build_object('status', 'matched', 'call_id', v_call);
end $$;
revoke all on function public.quick_match_join(text, text) from public, anon;
grant execute on function public.quick_match_join(text, text) to authenticated;

create or replace function public.quick_match_leave() returns void
language sql security definer set search_path = '' as $$
  delete from public.connect_match_queue where user_id = (select auth.uid())
$$;
revoke all on function public.quick_match_leave() from public, anon;
grant execute on function public.quick_match_leave() to authenticated;

-- Participant view of a call. Raises call_not_found for anyone else.
create or replace function public.quick_match_call(p_call uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.connect_calls%rowtype; other uuid; is_caller boolean;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  perform public.connect_expire_calls(uid);
  select * into c from public.connect_calls where id = p_call and uid in (caller_id, callee_id);
  if not found then raise exception 'call_not_found' using errcode = '42501'; end if;
  is_caller := c.caller_id = uid;
  other := case when is_caller then c.callee_id else c.caller_id end;
  return jsonb_build_object('id', c.id, 'mode', c.mode, 'style', c.style, 'role', case when is_caller then 'caller' else 'callee' end,
    'prompt', (select body from public.connect_prompts where id = c.prompt_id),
    'other', jsonb_build_object('id', other, 'display_name', coalesce((select nullif(display_name, '') from public.member_profiles where user_id = other), 'IELS member'),
                                'avatar_url', (select avatar_url from public.member_profiles where user_id = other)),
    'created_at', c.created_at, 'expires_at', c.expires_at, 'server_now', now(),
    'ended', c.ended_at is not null, 'end_reason', c.end_reason, 'ended_by_me', c.ended_by = uid,
    'my_connect', case when is_caller then c.caller_connect else c.callee_connect end,
    'my_enjoyed', case when is_caller then c.caller_enjoyed else c.callee_enjoyed end,
    'connected', public.connect_connected(uid, other));
end $$;
revoke all on function public.quick_match_call(uuid) from public, anon;
grant execute on function public.quick_match_call(uuid) to authenticated;

-- Relay one WebRTC handshake message to the other participant while the call is live. 400 signals per call.
create or replace function public.quick_match_signal(p_call uuid, p_kind text, p_payload jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); v_id bigint;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  perform public.connect_expire_calls(uid);
  if not exists (select 1 from public.connect_calls where id = p_call and uid in (caller_id, callee_id) and ended_at is null) then
    raise exception 'call_not_active' using errcode = 'P0001';
  end if;
  if (select count(*) from public.connect_call_signals where call_id = p_call) >= 400 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.connect_call_signals (call_id, sender_id, kind, payload) values (p_call, uid, p_kind, p_payload) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.quick_match_signal(uuid, text, jsonb) from public, anon;
grant execute on function public.quick_match_signal(uuid, text, jsonb) to authenticated;

create or replace function public.quick_match_signals(p_call uuid, p_after bigint default 0)
returns table (id bigint, kind text, payload jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from public.connect_calls c where c.id = p_call and uid in (c.caller_id, c.callee_id)) then
    raise exception 'call_not_found' using errcode = '42501';
  end if;
  return query select s.id, s.kind, s.payload from public.connect_call_signals s
    where s.call_id = p_call and s.sender_id <> uid and s.id > coalesce(p_after, 0) order by s.id limit 200;
end $$;
revoke all on function public.quick_match_signals(uuid, bigint) from public, anon;
grant execute on function public.quick_match_signals(uuid, bigint) to authenticated;

create or replace function public.quick_match_end(p_call uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if p_reason not in ('left', 'skipped', 'failed', 'reported', 'blocked') then raise exception 'invalid_input' using errcode = '22023'; end if;
  update public.connect_calls set ended_at = least(now(), expires_at), end_reason = case when expires_at <= now() then 'timeout' else p_reason end, ended_by = uid
   where id = p_call and uid in (caller_id, callee_id) and ended_at is null;
end $$;
revoke all on function public.quick_match_end(uuid, text) from public, anon;
grant execute on function public.quick_match_end(uuid, text) to authenticated;

-- After the call: my answer. Returns 'connected' when both said yes, otherwise 'saved'.
create or replace function public.quick_match_feedback(p_call uuid, p_connect boolean, p_enjoyed boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); c public.connect_calls%rowtype;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  perform public.connect_expire_calls(uid);
  select * into c from public.connect_calls where id = p_call and uid in (caller_id, callee_id) for update;
  if not found then raise exception 'call_not_found' using errcode = '42501'; end if;
  if c.ended_at is null then raise exception 'call_not_ended' using errcode = 'P0001'; end if;
  if c.caller_id = uid then
    update public.connect_calls set caller_connect = p_connect, caller_enjoyed = p_enjoyed where id = p_call returning * into c;
  else
    update public.connect_calls set callee_connect = p_connect, callee_enjoyed = p_enjoyed where id = p_call returning * into c;
  end if;
  if c.caller_connect and c.callee_connect and not public.connect_blocked(c.caller_id, c.callee_id) then
    perform public.connect_link(c.caller_id, c.callee_id, 'quick_match');
    return 'connected';
  end if;
  return 'saved';
end $$;
revoke all on function public.quick_match_feedback(uuid, boolean, boolean) from public, anon;
grant execute on function public.quick_match_feedback(uuid, boolean, boolean) to authenticated;

-- Blocking also ends a live call between the two and takes the blocker out of the queue.
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
  update public.connect_calls set ended_at = least(now(), expires_at), end_reason = 'blocked', ended_by = uid
   where ended_at is null and ((caller_id = uid and callee_id = p_user) or (caller_id = p_user and callee_id = uid));
  delete from public.connect_match_queue where user_id = uid;
  return 'blocked';
end $$;
