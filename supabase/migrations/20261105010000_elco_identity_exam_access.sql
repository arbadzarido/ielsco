-- Elco link identity and exam access (2026-11-05). Additive; replaces apply_elco_benefit (new p_modes argument),
-- elco_benefit_now (Starter/Pro only) and my_elco_benefits (adds link + exam access).
--   * elco_account_links.elco_display_name: the Elco display name sent by Elco at exchange time, shown to the same member in
--     IELSco Settings ("Connected to Elco: <name>"). No email.
--   * Elco exam passes (TOEFL ITP / IELTS / TOEIC, or the All Exams Bundle) arrive as grants with tier 'exam' and their modes.
--     They give no IELSco session access (Speaking Club / mentoring quotas stay Starter/Pro only); IELSco shows them and links
--     to the learner's exam preparation in Elco.
-- Rollback: supabase/manual/ROLLBACK-20261105010000-elco-identity-exam-access.sql.

alter table public.elco_account_links add column if not exists elco_display_name text check (char_length(elco_display_name) <= 80);
grant select (elco_display_name) on public.elco_account_links to authenticated;

alter table public.elco_benefit_grants add column if not exists modes text[] not null default '{}';
alter table public.elco_benefit_grants drop constraint if exists elco_benefit_grants_tier_check;
alter table public.elco_benefit_grants add constraint elco_benefit_grants_tier_check check (tier in ('starter', 'pro', 'exam'));
alter table public.elco_benefit_grants drop constraint if exists elco_benefit_grants_modes_check;
alter table public.elco_benefit_grants add constraint elco_benefit_grants_modes_check
  check (modes <@ array['toefl', 'ielts', 'toeic']::text[] and ((tier = 'exam') = (cardinality(modes) > 0)));
grant select (modes) on public.elco_benefit_grants to authenticated;

drop function if exists public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text);
create or replace function public.apply_elco_benefit(
  p_event_id uuid, p_grant_id uuid, p_version bigint, p_elco_user_id uuid, p_link_id uuid, p_tier text, p_source text,
  p_status text, p_starts_at timestamptz, p_ends_at timestamptz, p_speaking_club int, p_mentoring int, p_order_ref text,
  p_modes text[] default '{}'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  g public.elco_benefit_grants%rowtype;
  member uuid;
  v_outcome text;
  v_modes text[] := coalesce(p_modes, '{}');
begin
  if p_tier not in ('starter', 'pro', 'exam') or p_status not in ('active', 'cancelled', 'refunded') or p_source not in ('purchase', 'bundle', 'reward')
     or p_ends_at <= p_starts_at or p_version is null
     or not (v_modes <@ array['toefl', 'ielts', 'toeic']::text[]) or ((p_tier = 'exam') <> (cardinality(v_modes) > 0)) then
    return 'invalid';
  end if;
  insert into public.elco_benefit_events (event_id, grant_id, version, status, outcome) values (p_event_id, p_grant_id, p_version, p_status, 'processing')
  on conflict (event_id) do nothing;
  if not found then return 'duplicate'; end if;

  select l.ielsco_user_id into member from public.elco_account_links l
   where l.elco_user_id = p_elco_user_id and l.revoked_at is null and (p_link_id is null or l.id = p_link_id);

  select * into g from public.elco_benefit_grants where grant_id = p_grant_id for update;
  if found and g.elco_user_id <> p_elco_user_id then
    v_outcome := 'invalid';
  elsif found and g.version >= p_version then
    v_outcome := 'stale';
  else
    insert into public.elco_benefit_grants (grant_id, elco_user_id, ielsco_user_id, tier, source, status, starts_at, ends_at,
                                            speaking_club_per_month, mentoring_per_month, order_ref, version, modes)
    values (p_grant_id, p_elco_user_id, member, p_tier, p_source, p_status, p_starts_at, p_ends_at,
            case when p_tier = 'exam' then null else p_speaking_club end, case when p_tier = 'exam' then 0 else coalesce(p_mentoring, 0) end,
            left(p_order_ref, 80), p_version, v_modes)
    on conflict (grant_id) do update set ielsco_user_id = excluded.ielsco_user_id, tier = excluded.tier, source = excluded.source,
      status = excluded.status, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
      speaking_club_per_month = excluded.speaking_club_per_month, mentoring_per_month = excluded.mentoring_per_month,
      order_ref = excluded.order_ref, version = excluded.version, modes = excluded.modes, updated_at = now();
    v_outcome := case when p_status <> 'active' then 'revoked' when member is null then 'pending_link' else 'active' end;
  end if;
  update public.elco_benefit_events set outcome = v_outcome where event_id = p_event_id;
  return v_outcome;
end $$;
revoke all on function public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text, text[]) from public, anon, authenticated;
grant execute on function public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text, text[]) to service_role;

-- Session quotas come from General English plans only (an exam pass never opens Speaking Club or mentoring).
create or replace function public.elco_benefit_now(p_user uuid) returns table (tier text, speaking_club_per_month int, mentoring_per_month int, ends_at timestamptz, unlimited_speaking boolean)
language sql stable security definer set search_path = '' as $$
  select g.tier, g.speaking_club_per_month, g.mentoring_per_month, g.ends_at, g.speaking_club_per_month is null
    from public.elco_benefit_grants g
   where g.ielsco_user_id = p_user and g.tier in ('starter', 'pro') and g.status = 'active' and g.starts_at <= now() and g.ends_at > now()
   order by (g.tier = 'pro') desc, g.ends_at desc
   limit 1
$$;
revoke all on function public.elco_benefit_now(uuid) from public, anon, authenticated;

create or replace function public.my_elco_benefits() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare b record; uid uuid := (select auth.uid()); base jsonb;
begin
  if uid is null then return null; end if;
  base := jsonb_build_object(
    'linked', exists (select 1 from public.elco_account_links l where l.ielsco_user_id = uid and l.revoked_at is null),
    'elco_display_name', (select l.elco_display_name from public.elco_account_links l where l.ielsco_user_id = uid and l.revoked_at is null limit 1),
    'exams', coalesce((select jsonb_agg(jsonb_build_object('modes', g.modes, 'ends_at', g.ends_at, 'source', g.source) order by g.ends_at)
                         from public.elco_benefit_grants g where g.ielsco_user_id = uid and g.tier = 'exam' and g.status = 'active'
                          and g.starts_at <= now() and g.ends_at > now()), '[]'::jsonb),
    'upcoming', (select min(starts_at) from public.elco_benefit_grants where ielsco_user_id = uid and tier in ('starter', 'pro') and status = 'active' and starts_at > now()));
  select * into b from public.elco_benefit_now(uid);
  if not found then return base || jsonb_build_object('active', false); end if;
  return base || jsonb_build_object('active', true, 'tier', b.tier, 'ends_at', b.ends_at,
    'speaking_club_per_month', b.speaking_club_per_month, 'speaking_club_used', public.elco_benefit_used(uid, 'speaking_club'),
    'mentoring_per_month', b.mentoring_per_month, 'mentoring_used', public.elco_benefit_used(uid, 'mentoring'));
end $$;
revoke all on function public.my_elco_benefits() from public, anon;
grant execute on function public.my_elco_benefits() to authenticated;
