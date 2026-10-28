-- IELSco Connect, part 2 (2026-10-28): community Rooms (member-hosted, scheduled activities with registration).
-- Additive only; safe to re-run. Needs 20261028000000_connect_core.sql.
--
-- Rules:
--   * Rooms are separate from official IELS events (src/data/events.ts + public.event_registrations) and from staff-run
--     member sessions (public.member_sessions). Nothing here reads or writes those.
--   * Any Connect-ready member (connect_ready()) can host; at most 5 new rooms per 24 h and 10 upcoming rooms at once.
--   * The meeting link and instructions are returned only to the host and registered members (room_meeting_details()),
--     never in listings. IELSco does not host the meeting: delivery is an external link (Discord or another https link).
--     'ielsco_hosted' is reserved for future in-platform rooms and is refused for now.
--   * Registration locks the room row (for update), so concurrent registrations cannot exceed capacity.
--   * States: draft (unpublished), published, cancelled (final). "completed" and "live" are derived from the time.

create table if not exists public.connect_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (char_length(description) <= 2000),
  topic text check (char_length(topic) <= 120),
  category text not null check (category in ('english_practice', 'culture_exchange', 'study_together', 'scholarship_prep',
    'career_networking', 'entrepreneurship', 'language_exchange', 'hangout', 'other')),
  starts_at timestamptz not null,
  timezone text not null check (char_length(timezone) <= 64),
  duration_min int not null check (duration_min between 15 and 240),
  capacity int not null check (capacity between 2 and 500),
  language text not null default 'en' check (char_length(language) <= 5),
  registration_deadline timestamptz,
  visibility text not null default 'members' check (visibility in ('members', 'unlisted')),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  delivery text not null default 'discord' check (delivery in ('discord', 'external_link', 'ielsco_hosted')),
  meeting_url text check (meeting_url ~ '^https://' and char_length(meeting_url) <= 500),
  meeting_notes text check (char_length(meeting_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (registration_deadline is null or registration_deadline <= starts_at)
);
create index if not exists connect_rooms_discover_idx on public.connect_rooms (starts_at) where status = 'published';
create index if not exists connect_rooms_host_idx on public.connect_rooms (host_id, starts_at desc);
alter table public.connect_rooms enable row level security;
revoke all on public.connect_rooms from anon, authenticated;

create table if not exists public.connect_room_registrations (
  room_id uuid not null references public.connect_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists connect_room_regs_user_idx on public.connect_room_registrations (user_id);
alter table public.connect_room_registrations enable row level security;
revoke all on public.connect_room_registrations from anon, authenticated;

-- One room as the viewer sees it (no meeting link). Null when the viewer may not see it.
create or replace function public.connect_room_row(p_room public.connect_rooms, p_viewer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with c as (select count(*)::int n from public.connect_room_registrations r where r.room_id = p_room.id),
       me as (select exists (select 1 from public.connect_room_registrations r where r.room_id = p_room.id and r.user_id = p_viewer) reg)
  select jsonb_build_object(
    'id', p_room.id, 'title', p_room.title, 'description', p_room.description, 'topic', p_room.topic, 'category', p_room.category,
    'starts_at', p_room.starts_at, 'ends_at', p_room.starts_at + make_interval(mins => p_room.duration_min), 'timezone', p_room.timezone,
    'duration_min', p_room.duration_min, 'capacity', p_room.capacity, 'registered_count', c.n, 'language', p_room.language,
    'registration_deadline', p_room.registration_deadline, 'visibility', p_room.visibility, 'status', p_room.status,
    'delivery', p_room.delivery, 'host', jsonb_build_object('id', p_room.host_id,
      'display_name', coalesce((select nullif(mp.display_name, '') from public.member_profiles mp where mp.user_id = p_room.host_id), 'IELS member'),
      'avatar_url', (select mp.avatar_url from public.member_profiles mp where mp.user_id = p_room.host_id)),
    'is_host', p_room.host_id = p_viewer, 'is_registered', me.reg,
    'state', case
      when p_room.status = 'cancelled' then 'cancelled'
      when p_room.status = 'draft' then 'draft'
      when p_room.starts_at + make_interval(mins => p_room.duration_min) <= now() then 'completed'
      when p_room.starts_at <= now() then 'live'
      when c.n >= p_room.capacity then 'full'
      when p_room.registration_deadline is not null and p_room.registration_deadline < now() then 'closed'
      else 'open' end)
  from c, me
  where p_room.host_id = p_viewer or me.reg
     or (p_room.status <> 'draft' and not public.connect_blocked(p_room.host_id, p_viewer))
$$;
revoke all on function public.connect_room_row(public.connect_rooms, uuid) from public, anon, authenticated;

-- p_scope: 'discover' (published, members-visible, not ended) | 'joined' (my registrations) | 'hosting' (rooms I host).
create or replace function public.list_connect_rooms(p_scope text default 'discover', p_category text default null,
  p_language text default null, p_include_past boolean default false, p_limit int default 20, p_offset int default 0)
returns setof jsonb language sql stable security definer set search_path = '' as $$
  select public.connect_room_row(r, (select auth.uid()))
    from public.connect_rooms r
   where (select auth.uid()) is not null
     and case p_scope
       when 'discover' then r.status = 'published' and r.visibility = 'members'
                            and not public.connect_blocked(r.host_id, (select auth.uid()))
       when 'joined' then exists (select 1 from public.connect_room_registrations g where g.room_id = r.id and g.user_id = (select auth.uid()))
       when 'hosting' then r.host_id = (select auth.uid())
       else false end
     and (coalesce(p_include_past, false) or r.starts_at + make_interval(mins => r.duration_min) > now())
     and (p_category is null or r.category = p_category)
     and (p_language is null or r.language = p_language)
   order by case when coalesce(p_include_past, false) then -extract(epoch from r.starts_at) else extract(epoch from r.starts_at) end, r.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset least(greatest(coalesce(p_offset, 0), 0), 1000)
$$;
revoke all on function public.list_connect_rooms(text, text, text, boolean, int, int) from public, anon;
grant execute on function public.list_connect_rooms(text, text, text, boolean, int, int) to authenticated;

-- A single room by id (unlisted rooms are reachable by their link). Raises room_not_found.
create or replace function public.get_connect_room(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r public.connect_rooms%rowtype; j jsonb;
begin
  select * into r from public.connect_rooms where id = p_id;
  if found then j := public.connect_room_row(r, (select auth.uid())); end if;
  if (select auth.uid()) is null or j is null then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  return j;
end $$;
revoke all on function public.get_connect_room(uuid) from public, anon;
grant execute on function public.get_connect_room(uuid) to authenticated;

-- Create (p_id null) or edit a room I host. p: { title, description, topic, category, starts_at, timezone, duration_min,
-- capacity, language, registration_deadline, visibility, delivery, meeting_url, meeting_notes, publish }.
create or replace function public.save_connect_room(p_id uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); cur public.connect_rooms%rowtype; v_id uuid;
  v_start timestamptz; v_deadline timestamptz; v_tz text; v_cap int; v_dur int; v_url text; v_delivery text; taken int;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_input' using errcode = '22023'; end if;
  if p_id is not null then
    select * into cur from public.connect_rooms where id = p_id and host_id = uid for update;
    if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
    if cur.status = 'cancelled' then raise exception 'room_cancelled' using errcode = 'P0001'; end if;
    if cur.starts_at + make_interval(mins => cur.duration_min) <= now() then raise exception 'room_completed' using errcode = 'P0001'; end if;
  else
    if (select count(*) from public.connect_rooms where host_id = uid and created_at > now() - interval '24 hours') >= 5
       or (select count(*) from public.connect_rooms where host_id = uid and status <> 'cancelled'
            and starts_at + make_interval(mins => duration_min) > now()) >= 10 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  begin
    v_start := (p->>'starts_at')::timestamptz;
    v_deadline := nullif(p->>'registration_deadline', '')::timestamptz;
    v_cap := (p->>'capacity')::int;
    v_dur := (p->>'duration_min')::int;
  exception when others then raise exception 'invalid_input' using errcode = '22023';
  end;
  v_tz := public.connect_clean(p->>'timezone', 64);
  if v_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  if v_start is null or (v_start <= now() + interval '15 minutes' and (p_id is null or v_start <> cur.starts_at)) then
    raise exception 'start_in_past' using errcode = '22023';
  end if;
  if v_start > now() + interval '180 days' then raise exception 'start_too_far' using errcode = '22023'; end if;
  if v_deadline is not null and v_deadline > v_start then raise exception 'deadline_after_start' using errcode = '22023'; end if;
  if v_dur is null or v_dur not between 15 and 240 then raise exception 'invalid_duration' using errcode = '22023'; end if;
  if v_cap is null or v_cap not between 2 and 500 then raise exception 'invalid_capacity' using errcode = '22023'; end if;
  if p_id is not null then
    select count(*) into taken from public.connect_room_registrations where room_id = p_id;
    if v_cap < taken then raise exception 'capacity_below_registrations' using errcode = '22023'; end if;
  end if;
  v_delivery := coalesce(p->>'delivery', 'discord');
  if v_delivery not in ('discord', 'external_link') then raise exception 'invalid_delivery' using errcode = '22023'; end if;
  v_url := public.connect_clean(p->>'meeting_url', 500);
  if v_url is not null and v_url !~ '^https://[^\s/$.?#][^\s]*$' then raise exception 'invalid_meeting_url' using errcode = '22023'; end if;
  if v_url is not null and v_delivery = 'discord' and v_url !~* '^https://(www\.)?(discord\.gg|discord\.com)/' then
    raise exception 'invalid_discord_url' using errcode = '22023';
  end if;
  if coalesce(p->>'language', 'en') <> all(public.connect_allowed('language')) then raise exception 'invalid_language' using errcode = '22023'; end if;
  if coalesce(p->>'visibility', 'members') not in ('members', 'unlisted') then raise exception 'invalid_visibility' using errcode = '22023'; end if;
  if public.connect_clean(p->>'title', 120) is null or char_length(public.connect_clean(p->>'title', 120)) < 3 then
    raise exception 'title_required' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.connect_rooms (host_id, title, description, topic, category, starts_at, timezone, duration_min, capacity,
      language, registration_deadline, visibility, status, delivery, meeting_url, meeting_notes)
    values (uid, public.connect_clean(p->>'title', 120), public.connect_clean(p->>'description', 2000), public.connect_clean(p->>'topic', 120),
      p->>'category', v_start, v_tz, v_dur, v_cap, coalesce(p->>'language', 'en'), v_deadline, coalesce(p->>'visibility', 'members'),
      case when coalesce((p->>'publish')::boolean, false) then 'published' else 'draft' end, v_delivery, v_url,
      public.connect_clean(p->>'meeting_notes', 1000))
    returning id into v_id;
  else
    update public.connect_rooms set title = public.connect_clean(p->>'title', 120), description = public.connect_clean(p->>'description', 2000),
      topic = public.connect_clean(p->>'topic', 120), category = p->>'category', starts_at = v_start, timezone = v_tz,
      duration_min = v_dur, capacity = v_cap, language = coalesce(p->>'language', 'en'), registration_deadline = v_deadline,
      visibility = coalesce(p->>'visibility', 'members'), delivery = v_delivery, meeting_url = v_url,
      meeting_notes = public.connect_clean(p->>'meeting_notes', 1000), updated_at = now()
    where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.save_connect_room(uuid, jsonb) from public, anon;
grant execute on function public.save_connect_room(uuid, jsonb) to authenticated;

-- Host: publish, unpublish (back to draft; registrations are kept) or cancel (final).
create or replace function public.set_connect_room_status(p_id uuid, p_status text) returns text
language plpgsql security definer set search_path = '' as $$
declare r public.connect_rooms%rowtype;
begin
  select * into r from public.connect_rooms where id = p_id and host_id = (select auth.uid()) for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if p_status not in ('published', 'draft', 'cancelled') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if r.status = 'cancelled' then raise exception 'room_cancelled' using errcode = 'P0001'; end if;
  if r.starts_at + make_interval(mins => r.duration_min) <= now() then raise exception 'room_completed' using errcode = 'P0001'; end if;
  if p_status = 'published' and r.starts_at <= now() then raise exception 'start_in_past' using errcode = '22023'; end if;
  update public.connect_rooms set status = p_status, updated_at = now() where id = p_id;
  return p_status;
end $$;
revoke all on function public.set_connect_room_status(uuid, text) from public, anon;
grant execute on function public.set_connect_room_status(uuid, text) to authenticated;

-- Returns 'registered' | 'already_registered'. Raises room_not_open, registration_closed, full, host_cannot_register,
-- passport_required.
create or replace function public.register_connect_room(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); r public.connect_rooms%rowtype; taken int;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  select * into r from public.connect_rooms where id = p_id for update;
  if not found or r.status <> 'published' or public.connect_blocked(r.host_id, uid) then
    raise exception 'room_not_open' using errcode = 'P0001';
  end if;
  if r.host_id = uid then raise exception 'host_cannot_register' using errcode = 'P0001'; end if;
  if exists (select 1 from public.connect_room_registrations where room_id = p_id and user_id = uid) then return 'already_registered'; end if;
  if r.starts_at <= now() or (r.registration_deadline is not null and r.registration_deadline < now()) then
    raise exception 'registration_closed' using errcode = 'P0001';
  end if;
  select count(*) into taken from public.connect_room_registrations where room_id = p_id;
  if taken >= r.capacity then raise exception 'full' using errcode = 'P0001'; end if;
  insert into public.connect_room_registrations (room_id, user_id) values (p_id, uid);
  return 'registered';
end $$;
revoke all on function public.register_connect_room(uuid) from public, anon;
grant execute on function public.register_connect_room(uuid) to authenticated;

create or replace function public.cancel_connect_room_registration(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.connect_room_registrations g using public.connect_rooms r
   where g.room_id = p_id and g.user_id = (select auth.uid()) and r.id = g.room_id
     and r.starts_at + make_interval(mins => r.duration_min) > now();
  if not found then raise exception 'not_registered' using errcode = 'P0001'; end if;
  return 'cancelled';
end $$;
revoke all on function public.cancel_connect_room_registration(uuid) from public, anon;
grant execute on function public.cancel_connect_room_registration(uuid) to authenticated;

-- Meeting link + instructions: host always; registered members while the room is published (not cancelled/unpublished).
create or replace function public.connect_room_meeting(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('delivery', r.delivery, 'meeting_url', r.meeting_url, 'meeting_notes', r.meeting_notes)
    from public.connect_rooms r
   where r.id = p_id and (select auth.uid()) is not null
     and (r.host_id = (select auth.uid())
          or (r.status = 'published' and not public.connect_blocked(r.host_id, (select auth.uid()))
              and exists (select 1 from public.connect_room_registrations g where g.room_id = r.id and g.user_id = (select auth.uid()))))
$$;
revoke all on function public.connect_room_meeting(uuid) from public, anon;
grant execute on function public.connect_room_meeting(uuid) to authenticated;

-- Host only: who registered (display name + avatar; never email or contact details).
create or replace function public.connect_room_participants(p_id uuid)
returns table (id uuid, display_name text, avatar_url text, registered_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select g.user_id, coalesce(nullif(mp.display_name, ''), 'IELS member'), mp.avatar_url, g.created_at
    from public.connect_room_registrations g
    join public.connect_rooms r on r.id = g.room_id and r.host_id = (select auth.uid())
    left join public.member_profiles mp on mp.user_id = g.user_id
   where g.room_id = p_id order by g.created_at
$$;
revoke all on function public.connect_room_participants(uuid) from public, anon;
grant execute on function public.connect_room_participants(uuid) to authenticated;

-- Summary now also counts rooms.
create or replace function public.connect_summary() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ready', public.connect_ready(me.uid),
    'discoverable', coalesce((select connect_discoverable from public.member_profiles where user_id = me.uid), false),
    'incoming', (select count(*) from public.connect_requests r where r.recipient_id = me.uid and r.status = 'pending'
                  and not public.connect_blocked(r.sender_id, me.uid)),
    'outgoing', (select count(*) from public.connect_requests r where r.sender_id = me.uid and r.status = 'pending'),
    'connections', (select count(*) from public.connect_connections c where me.uid in (c.user_a, c.user_b)),
    'unread', (select coalesce(sum(u.unread), 0) from public.list_connect_connections() u where not u.blocked),
    'rooms_joined', (select count(*) from public.connect_room_registrations g join public.connect_rooms r on r.id = g.room_id
                      where g.user_id = me.uid and r.status = 'published' and r.starts_at + make_interval(mins => r.duration_min) > now()),
    'rooms_hosting', (select count(*) from public.connect_rooms r where r.host_id = me.uid and r.status <> 'cancelled'
                      and r.starts_at + make_interval(mins => r.duration_min) > now()))
  from (select (select auth.uid()) as uid) me where me.uid is not null
$$;
