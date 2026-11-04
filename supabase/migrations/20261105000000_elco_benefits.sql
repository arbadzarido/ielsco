-- Elco membership benefits on IELSco (2026-11-05). Additive except one widened check (member_sessions.kind gets 'mentoring')
-- and two replaced functions (register_member_session, member_session_join_url) that keep every existing rule.
--
-- What Elco sells and IELSco honours (founder brief, 4 Nov 2026):
--   Elco Starter  -> 12 Daily Speaking Club sessions a month
--   Elco Pro      -> Daily Speaking Club (no monthly cap) + 4 mentoring sessions a month
--   (the Elco All Exams Bundle includes 1 month of Pro, sent as a Pro grant)
-- Mapping onto IELSco's existing model, not a new role: benefits open member_sessions of kind 'speaking_club' (and the new
-- kind 'mentoring') even when the session is members_only. They do NOT make anyone an IELS Member (membership_periods are
-- untouched), so community links, feedback reviews and buddy matching stay member-only.
--
-- Sync rules (Elco -> IELSco, server to server, HMAC-signed; route /api/integrations/elco/benefits):
--   * Idempotent: every event carries event_id (unique here); a replay returns 'duplicate' and changes nothing.
--   * Ordered: each grant carries a version; an older version never overwrites a newer one ('stale').
--   * Identity: the grant is attached to an IELSco account ONLY through an active elco_account_links row (the signed link
--     flow), never by email. Without a link the grant waits as pending_link and attaches when the member links; if the link
--     is revoked the grant detaches again.
--   * Every event is kept in elco_benefit_events (the audit log). No personal data: ids, dates, tiers and outcomes only.
-- Rollback: supabase/manual/ROLLBACK-20261105-elco-benefits.sql.

create table if not exists public.elco_benefit_grants (
  grant_id uuid primary key,                                   -- Elco subscriptions.id
  elco_user_id uuid not null,
  ielsco_user_id uuid references auth.users(id) on delete set null,
  tier text not null check (tier in ('starter', 'pro')),
  source text not null check (source in ('purchase', 'bundle', 'reward')),
  status text not null check (status in ('active', 'cancelled', 'refunded')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  speaking_club_per_month int check (speaking_club_per_month between 0 and 100),   -- null = no monthly cap
  mentoring_per_month int not null default 0 check (mentoring_per_month between 0 and 31),
  order_ref text check (char_length(order_ref) <= 80),
  version bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists elco_benefit_grants_user_idx on public.elco_benefit_grants (ielsco_user_id, ends_at desc);
create index if not exists elco_benefit_grants_elco_idx on public.elco_benefit_grants (elco_user_id);

create table if not exists public.elco_benefit_events (
  event_id uuid primary key,
  grant_id uuid not null,
  version bigint not null,
  status text not null,
  outcome text not null,
  received_at timestamptz not null default now()
);
create index if not exists elco_benefit_events_grant_idx on public.elco_benefit_events (grant_id, received_at desc);

alter table public.elco_benefit_grants enable row level security;
alter table public.elco_benefit_events enable row level security;
revoke all on public.elco_benefit_grants, public.elco_benefit_events from anon, authenticated;
-- Members read their own grants (without the Elco user id); admins read all. Writes: service role via the function only.
grant select (grant_id, ielsco_user_id, tier, source, status, starts_at, ends_at, speaking_club_per_month, mentoring_per_month, updated_at)
  on public.elco_benefit_grants to authenticated;
drop policy if exists elco_benefit_grants_own on public.elco_benefit_grants;
create policy elco_benefit_grants_own on public.elco_benefit_grants for select to authenticated
  using (ielsco_user_id = (select auth.uid()) or public.is_site_admin());
grant select on public.elco_benefit_events to authenticated;
drop policy if exists elco_benefit_events_admin on public.elco_benefit_events;
create policy elco_benefit_events_admin on public.elco_benefit_events for select to authenticated using (public.is_site_admin());

-- Mentoring sessions are member_sessions too (staff schedule them in Operations like every other session).
alter table public.member_sessions drop constraint if exists member_sessions_kind_check;
alter table public.member_sessions add constraint member_sessions_kind_check
  check (kind in ('application_clinic', 'workshop', 'speaking_club', 'qna', 'networking', 'mentoring'));

-- Applies one verified Elco event. Service role only. Returns: active | pending_link | revoked | stale | duplicate | invalid.
create or replace function public.apply_elco_benefit(
  p_event_id uuid, p_grant_id uuid, p_version bigint, p_elco_user_id uuid, p_link_id uuid, p_tier text, p_source text,
  p_status text, p_starts_at timestamptz, p_ends_at timestamptz, p_speaking_club int, p_mentoring int, p_order_ref text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  g public.elco_benefit_grants%rowtype;
  member uuid;
  v_outcome text;
begin
  if p_tier not in ('starter', 'pro') or p_status not in ('active', 'cancelled', 'refunded') or p_source not in ('purchase', 'bundle', 'reward')
     or p_ends_at <= p_starts_at or p_version is null then
    return 'invalid';
  end if;
  -- Idempotency: one row per event id.
  insert into public.elco_benefit_events (event_id, grant_id, version, status, outcome) values (p_event_id, p_grant_id, p_version, p_status, 'processing')
  on conflict (event_id) do nothing;
  if not found then return 'duplicate'; end if;

  -- Identity only through an active signed account link (and the link Elco named must be that link, when it named one).
  select l.ielsco_user_id into member from public.elco_account_links l
   where l.elco_user_id = p_elco_user_id and l.revoked_at is null and (p_link_id is null or l.id = p_link_id);

  select * into g from public.elco_benefit_grants where grant_id = p_grant_id for update;
  if found and g.elco_user_id <> p_elco_user_id then
    v_outcome := 'invalid';
  elsif found and g.version >= p_version then
    v_outcome := 'stale';
  else
    insert into public.elco_benefit_grants (grant_id, elco_user_id, ielsco_user_id, tier, source, status, starts_at, ends_at,
                                            speaking_club_per_month, mentoring_per_month, order_ref, version)
    values (p_grant_id, p_elco_user_id, member, p_tier, p_source, p_status, p_starts_at, p_ends_at, p_speaking_club, coalesce(p_mentoring, 0),
            left(p_order_ref, 80), p_version)
    on conflict (grant_id) do update set ielsco_user_id = excluded.ielsco_user_id, tier = excluded.tier, source = excluded.source,
      status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
      speaking_club_per_month = excluded.speaking_club_per_month, mentoring_per_month = excluded.mentoring_per_month,
      order_ref = excluded.order_ref, version = excluded.version, updated_at = now();
    v_outcome := case when p_status <> 'active' then 'revoked' when member is null then 'pending_link' else 'active' end;
  end if;
  update public.elco_benefit_events set outcome = v_outcome where event_id = p_event_id;
  return v_outcome;
end $$;
revoke all on function public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text) from public, anon, authenticated;
grant execute on function public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text) to service_role;

-- Linking attaches pending grants; revoking the link detaches them (benefits follow the verified link, nothing else).
create or replace function public.elco_benefits_follow_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.revoked_at is null then
    update public.elco_benefit_grants set ielsco_user_id = new.ielsco_user_id, updated_at = now()
     where elco_user_id = new.elco_user_id and (ielsco_user_id is distinct from new.ielsco_user_id);
  elsif tg_op = 'UPDATE' and old.revoked_at is null then
    update public.elco_benefit_grants set ielsco_user_id = null, updated_at = now()
     where elco_user_id = new.elco_user_id and ielsco_user_id = new.ielsco_user_id;
  end if;
  return new;
end $$;
drop trigger if exists elco_benefits_follow_link on public.elco_account_links;
create trigger elco_benefits_follow_link after insert or update of revoked_at on public.elco_account_links
  for each row execute function public.elco_benefits_follow_link();

-- The member's live Elco benefit (best active grant now) and this month's use, in Asia/Jakarta calendar months.
create or replace function public.elco_benefit_now(p_user uuid) returns table (tier text, speaking_club_per_month int, mentoring_per_month int, ends_at timestamptz, unlimited_speaking boolean)
language sql stable security definer set search_path = '' as $$
  select g.tier, g.speaking_club_per_month, g.mentoring_per_month, g.ends_at, g.speaking_club_per_month is null
    from public.elco_benefit_grants g
   where g.ielsco_user_id = p_user and g.status = 'active' and g.starts_at <= now() and g.ends_at > now()
   order by (g.tier = 'pro') desc, g.ends_at desc
   limit 1
$$;
revoke all on function public.elco_benefit_now(uuid) from public, anon, authenticated;

create or replace function public.elco_benefit_used(p_user uuid, p_kind text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.member_session_registrations r join public.member_sessions s on s.id = r.session_id
   where r.user_id = p_user and s.kind = p_kind
     and s.starts_at >= (date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')
     and s.starts_at < ((date_trunc('month', now() at time zone 'Asia/Jakarta') + interval '1 month') at time zone 'Asia/Jakarta')
$$;
revoke all on function public.elco_benefit_used(uuid, text) from public, anon, authenticated;

-- May this member use an Elco benefit for a session of this kind (quota left this month)?
create or replace function public.elco_benefit_allows(p_user uuid, p_kind text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare b record;
begin
  select * into b from public.elco_benefit_now(p_user);
  if not found then return false; end if;
  if p_kind = 'speaking_club' then
    return b.unlimited_speaking or public.elco_benefit_used(p_user, 'speaking_club') < b.speaking_club_per_month;
  elsif p_kind = 'mentoring' then
    return b.mentoring_per_month > 0 and public.elco_benefit_used(p_user, 'mentoring') < b.mentoring_per_month;
  end if;
  return false;
end $$;
revoke all on function public.elco_benefit_allows(uuid, text) from public, anon, authenticated;

-- For the member's dashboard: their Elco benefit and what's left this month.
create or replace function public.my_elco_benefits() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare b record; uid uuid := (select auth.uid()); pend boolean;
begin
  if uid is null then return null; end if;
  select * into b from public.elco_benefit_now(uid);
  if not found then
    return jsonb_build_object('active', false,
      'upcoming', (select min(starts_at) from public.elco_benefit_grants where ielsco_user_id = uid and status = 'active' and starts_at > now()));
  end if;
  return jsonb_build_object('active', true, 'tier', b.tier, 'ends_at', b.ends_at,
    'speaking_club_per_month', b.speaking_club_per_month, 'speaking_club_used', public.elco_benefit_used(uid, 'speaking_club'),
    'mentoring_per_month', b.mentoring_per_month, 'mentoring_used', public.elco_benefit_used(uid, 'mentoring'));
end $$;
revoke all on function public.my_elco_benefits() from public, anon;
grant execute on function public.my_elco_benefits() to authenticated;

-- Session registration: unchanged for everyone, plus Elco benefit holders may take members-only speaking club / mentoring
-- sessions within their monthly quota (checked here, server-side, under the session row lock).
create or replace function public.register_member_session(p_session uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.member_sessions%rowtype; taken int; uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into s from public.member_sessions where id = p_session and status = 'scheduled' for update;
  if not found or s.starts_at < now() then raise exception 'this session is not open for registration' using errcode = 'P0001'; end if;
  if exists (select 1 from public.member_session_registrations where session_id = p_session and user_id = uid) then
    return 'already_registered';
  end if;
  if s.members_only and not public.is_active_member() then
    if s.kind in ('speaking_club', 'mentoring') and exists (select 1 from public.elco_benefit_now(uid)) then
      if s.kind = 'mentoring' and coalesce((select b.mentoring_per_month from public.elco_benefit_now(uid) b), 0) = 0 then
        raise exception 'elco_not_included' using errcode = 'P0001';
      end if;
      if not public.elco_benefit_allows(uid, s.kind) then raise exception 'elco_quota_used' using errcode = 'P0001'; end if;
    else
      raise exception 'members_only' using errcode = '42501';
    end if;
  end if;
  select count(*) into taken from public.member_session_registrations where session_id = p_session;
  if s.capacity is not null and taken >= s.capacity then raise exception 'full' using errcode = 'P0001'; end if;
  insert into public.member_session_registrations (session_id, user_id) values (p_session, uid);
  return 'registered';
end $$;
revoke all on function public.register_member_session(uuid) from public, anon;
grant execute on function public.register_member_session(uuid) to authenticated;

create or replace function public.member_session_join_url(p_session uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.join_url from public.member_sessions s
   where s.id = p_session and s.status = 'scheduled'
     and exists (select 1 from public.member_session_registrations r where r.session_id = s.id and r.user_id = (select auth.uid()))
     and (not s.members_only or public.is_active_member()
          or (s.kind in ('speaking_club', 'mentoring') and exists (select 1 from public.elco_benefit_now((select auth.uid())))))
$$;
revoke all on function public.member_session_join_url(uuid) from public, anon;
grant execute on function public.member_session_join_url(uuid) to authenticated;
