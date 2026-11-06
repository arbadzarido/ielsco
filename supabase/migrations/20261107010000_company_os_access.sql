-- Company OS, access hardening: approved-account allowlist, Google-only sign-in, session revocation, login history and
-- MFA for founders. Applies on top of 20261107000000_company_os_foundation.sql.
--
-- Docs: docs/COMPANY-OS.md ("Sign-in and access"). Tests: tests/db/company-os.pglite.mjs.
-- Additive: changes only os_* objects. No existing IELSco table, policy, auth setting or row is touched.
-- Re-runnable: "if not exists" / "create or replace" / "drop ... if exists" throughout.
--
-- Someone gets Company OS access only when ALL of these hold, checked by os_current_person() on every query:
--   1. they signed in with Google in this session (JWT amr contains "oauth"), and the Google identity's email is verified;
--   2. that email is on the approved registry: an os_people row a founder created, with google_account = that email;
--   3. the row is linked to this login and its status is onboarding or active (not invited, suspended or revoked);
--   4. the person belongs to at least one company;
--   5. this session is alive: the auth session still exists, it is not revoked, it started after the person's last
--      "revoke all sessions", and it is at most 12 hours old;
--   6. if the account has a verified MFA factor, the session passed MFA (aal2).
-- Founder powers additionally need aal2 (two-step verification), so a stolen Google session alone cannot run Admin.

-- ── People: account status and allowlist email ─────────────────────────────────────────────────────────────────────

alter table public.os_people drop constraint if exists os_people_status_check;
alter table public.os_people add constraint os_people_status_check
  check (status in ('invited', 'onboarding', 'active', 'suspended', 'revoked', 'inactive', 'offboarded'));

alter table public.os_people add column if not exists status_reason       text;
alter table public.os_people add column if not exists status_changed_at   timestamptz;
alter table public.os_people add column if not exists status_changed_by   text;
alter table public.os_people add column if not exists invited_by          text;
alter table public.os_people add column if not exists sessions_revoked_at timestamptz;

-- One person per Google account. Stored lower-case by the trigger below.
create unique index if not exists os_people_google_account_key on public.os_people (google_account) where google_account is not null;

-- ── Login history and revoked sessions ─────────────────────────────────────────────────────────────────────────────

-- One row per Company OS sign-in attempt that reached the callback. Written only by os_record_login() (server, service
-- role). No passwords, OAuth tokens or refresh tokens are stored: session_id is Supabase's session UUID, not a secret.
-- Kept 180 days (purged by os_record_login).
create table if not exists public.os_login_events (
  id              bigint generated always as identity primary key,
  at              timestamptz not null default now(),
  user_id         uuid,
  person_id       text references public.os_people (id) on delete set null,
  email           text,
  success         boolean not null,
  reason          text not null,
  provider        text,
  session_id      uuid,
  ip              text,
  user_agent      text,
  browser         text,
  browser_version text,
  os              text,
  device_type     text check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  device_profile  text,   -- hash of browser family + OS + device type: an approximate profile, not a hardware ID
  country         text,
  region          text,
  city            text,
  new_device      boolean not null default false
);
create index if not exists os_login_events_at_idx on public.os_login_events (at desc);
create index if not exists os_login_events_user_idx on public.os_login_events (user_id, at desc);
create unique index if not exists os_login_events_session_key on public.os_login_events (session_id) where session_id is not null and success;

create table if not exists public.os_revoked_sessions (
  session_id  uuid primary key,
  user_id     uuid not null,
  revoked_at  timestamptz not null default now(),
  revoked_by  text,
  reason      text not null check (length(trim(reason)) > 0)
);

-- ── Session helpers ────────────────────────────────────────────────────────────────────────────────────────────────

create or replace function public.os_session_id() returns uuid
language sql stable set search_path = '' as $$
  select case when (auth.jwt() ->> 'session_id') ~ '^[0-9a-fA-F-]{36}$' then (auth.jwt() ->> 'session_id')::uuid end
$$;

-- When this session signed in with Google (the "oauth" entry of the JWT amr claim). Null for password, magic link or
-- any other method, which makes the session invalid for the OS.
create or replace function public.os_signed_in_at() returns timestamptz
language sql stable set search_path = '' as $$
  select to_timestamp(max((a ->> 'timestamp')::bigint))
  from jsonb_array_elements(case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end) a
  where a ->> 'method' = 'oauth' and (a ->> 'timestamp') ~ '^[0-9]+$'
$$;

create or replace function public.os_session_ok(p_revoked_after timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.os_session_id() is not null
    and public.os_signed_in_at() is not null
    and public.os_signed_in_at() > now() - interval '12 hours'
    and (p_revoked_after is null or public.os_signed_in_at() > p_revoked_after)
    and not exists (select 1 from public.os_revoked_sessions r where r.session_id = public.os_session_id())
    -- Signing out deletes the auth session; an access token copied before that stops working here at once.
    and exists (select 1 from auth.sessions s where s.id = public.os_session_id() and s.user_id = (select auth.uid()))
    -- Once someone enrols a second factor, every OS session must have passed it.
    and ((auth.jwt() ->> 'aal') = 'aal2'
         or not exists (select 1 from auth.mfa_factors f where f.user_id = (select auth.uid()) and f.status = 'verified')),
    false)
$$;

-- The verified Google email of a login, or null.
create or replace function public.os_google_email(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select lower(trim(i.identity_data ->> 'email'))
  from auth.identities i
  where i.user_id = p_user and i.provider = 'google'
    and coalesce((i.identity_data ->> 'email_verified')::boolean, false)
    and nullif(trim(i.identity_data ->> 'email'), '') is not null
  order by i.created_at
  limit 1
$$;

-- ── Core helpers, replaced with the stricter rules ─────────────────────────────────────────────────────────────────

create or replace function public.os_current_person() returns text
language sql stable security definer set search_path = '' as $$
  select p.id from public.os_people p
  where p.user_id = (select auth.uid())
    and p.status in ('onboarding', 'active')
    and p.google_account is not null
    and p.google_account = public.os_google_email(p.user_id)
    and exists (select 1 from public.os_person_companies c where c.person_id = p.id)
    and public.os_session_ok(p.sessions_revoked_at)
$$;

create or replace function public.os_is_founder() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (select 1 from public.os_people p
                 where p.id = public.os_current_person() and p.status = 'active' and p.org_role = 'founder')
$$;

-- A founder whose session has not passed two-step verification yet. Used only to explain the Admin screen.
create or replace function public.os_is_founder_needing_mfa() returns boolean
language sql stable security definer set search_path = '' as $$
  select not public.os_is_founder()
     and exists (select 1 from public.os_people p
                 where p.id = public.os_current_person() and p.status = 'active' and p.org_role = 'founder')
$$;

create or replace function public.os_is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_people p where p.id = public.os_current_person() and p.org_role <> 'guest')
$$;

-- What the app asks before rendering anything: may this session use the Company OS at all?
create or replace function public.os_access_status() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_current_person() is not null
$$;

-- Why a login was refused, for the login history only. Server (service role) only, so nobody can probe the registry
-- from the browser. Session checks are not part of it: they are evaluated on each request.
create or replace function public.os_access_reason(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  with g as (select public.os_google_email(p_user) as email),
       p as (select p.* from public.os_people p, g where p.google_account = g.email)
  select case
    when not exists (select 1 from auth.identities i where i.user_id = p_user and i.provider = 'google') then 'not_google'
    when (select email from g) is null then 'email_unverified'
    when not exists (select 1 from p) then 'not_allowlisted'
    when (select status from p) in ('suspended', 'revoked', 'inactive', 'offboarded') then (select status from p)
    when (select user_id from p) is distinct from p_user then 'linked_to_other_account'
    when (select status from p) = 'invited' then 'awaiting_approval'
    when not exists (select 1 from public.os_person_companies c where c.person_id = (select id from p)) then 'no_company'
    else 'ok'
  end
$$;

-- Links the caller's login to the approved registry entry for their verified Google email. Does nothing (and says
-- nothing) when there is no such entry, so the result cannot be used to test whether an email is registered.
-- An entry already linked to another login is left alone; a founder has to clear it.
create or replace function public.os_claim_account() returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_email text := public.os_google_email((select auth.uid()));
begin
  if (select auth.uid()) is null or v_email is null or public.os_signed_in_at() is null then
    return;
  end if;
  update public.os_people p set user_id = (select auth.uid())
  where p.google_account = v_email and p.user_id is null and p.status in ('invited', 'onboarding', 'active')
    and not exists (select 1 from public.os_people q where q.user_id = (select auth.uid()));
end $$;

-- ── Login recording (server only) ──────────────────────────────────────────────────────────────────────────────────

create or replace function public.os_record_login(
  p_user uuid, p_session uuid, p_success boolean, p_reason text, p_provider text, p_ip text, p_user_agent text,
  p_browser text, p_browser_version text, p_os text, p_device_type text, p_device_profile text,
  p_country text, p_region text, p_city text
) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_person text;
  v_email text;
  v_new boolean := false;
begin
  select u.email into v_email from auth.users u where u.id = p_user;
  select p.id into v_person from public.os_people p where p.user_id = p_user;
  if p_success and p_device_profile is not null then
    v_new := not exists (select 1 from public.os_login_events e
                         where e.user_id = p_user and e.success and e.device_profile = p_device_profile);
  end if;
  insert into public.os_login_events (user_id, person_id, email, success, reason, provider, session_id, ip, user_agent,
                                      browser, browser_version, os, device_type, device_profile, country, region, city, new_device)
  values (p_user, v_person, lower(v_email), p_success, coalesce(p_reason, 'unknown'), p_provider, p_session,
          left(p_ip, 64), left(p_user_agent, 512), left(p_browser, 64), left(p_browser_version, 32), left(p_os, 64),
          case when p_device_type in ('desktop', 'mobile', 'tablet') then p_device_type else 'unknown' end,
          left(p_device_profile, 128), left(p_country, 8), left(p_region, 64), left(p_city, 96), v_new);
  -- Retention: 180 days of login history; revocation records are useless after the 12-hour session limit, keep 30 days.
  delete from public.os_login_events where at < now() - interval '180 days';
  delete from public.os_revoked_sessions where revoked_at < now() - interval '30 days';
  return v_new;
end $$;

-- ── Session revocation ─────────────────────────────────────────────────────────────────────────────────────────────

-- Founders can revoke any OS session; anyone can revoke their own (for example a laptop they left signed in).
create or replace function public.os_revoke_session(p_session uuid, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare v_user uuid;
begin
  if public.os_current_person() is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select e.user_id into v_user from public.os_login_events e where e.session_id = p_session and e.success limit 1;
  if v_user is null then
    raise exception 'Unknown session' using errcode = 'P0002';
  end if;
  if not (public.os_is_founder() or v_user = (select auth.uid())) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.os_revoked_sessions (session_id, user_id, revoked_by, reason)
  values (p_session, v_user, public.os_current_person(), coalesce(nullif(trim(p_reason), ''), 'Signed out from Company OS'))
  on conflict (session_id) do nothing;
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), 'session.revoke', 'session', p_session::text,
          jsonb_build_object('user_id', v_user, 'reason', p_reason));
end $$;

-- Ends every OS session of a person that started before now. Founders for anyone; a person for themselves.
create or replace function public.os_revoke_all_sessions(p_person text, p_reason text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if public.os_current_person() is null or not (public.os_is_founder() or p_person = public.os_current_person()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Give a reason' using errcode = '23514';
  end if;
  update public.os_people set sessions_revoked_at = now() where id = p_person;
  if not found then
    raise exception 'Unknown person %', p_person using errcode = 'P0002';
  end if;
  insert into public.os_audit_log (actor_person_id, action, target_type, target_id, detail)
  values (public.os_current_person(), 'session.revoke_all', 'os_people', p_person, jsonb_build_object('reason', p_reason));
end $$;

-- Login history with "is this session still usable" worked out on the server. Founders see everyone's OS logins;
-- everyone else sees only their own. IPs and session IDs never reach anyone else.
create or replace function public.os_login_history(p_limit int default 500)
returns table (
  id bigint, at timestamptz, user_id uuid, person_id text, email text, success boolean, reason text, provider text,
  session_id uuid, ip text, browser text, browser_version text, os text, device_type text, country text, region text,
  city text, new_device boolean, active boolean, revoked_at timestamptz, revoked_reason text, last_seen_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select e.id, e.at, e.user_id, e.person_id, e.email, e.success, e.reason, e.provider, e.session_id, e.ip, e.browser,
         e.browser_version, e.os, e.device_type, e.country, e.region, e.city, e.new_device,
         e.success and r.session_id is null and s.id is not null and e.at > now() - interval '12 hours'
           and (p.sessions_revoked_at is null or e.at > p.sessions_revoked_at)
           and p.status in ('onboarding', 'active') as active,
         coalesce(r.revoked_at, case when p.sessions_revoked_at > e.at then p.sessions_revoked_at end) as revoked_at,
         coalesce(r.reason, case when p.sessions_revoked_at > e.at then 'All sessions ended' end) as revoked_reason,
         coalesce(s.refreshed_at, s.updated_at, s.created_at) as last_seen_at
  from public.os_login_events e
  left join public.os_people p on p.id = e.person_id
  left join public.os_revoked_sessions r on r.session_id = e.session_id
  left join auth.sessions s on s.id = e.session_id
  where public.os_current_person() is not null
    and (public.os_is_founder() or e.user_id = (select auth.uid()))
  order by e.at desc
  limit least(greatest(coalesce(p_limit, 500), 1), 2000)
$$;

do $$
declare f text;
begin
  -- Callable by signed-in users (each checks the caller itself).
  foreach f in array array[
    'os_current_person()', 'os_is_founder()', 'os_is_founder_needing_mfa()', 'os_is_staff()', 'os_access_status()',
    'os_claim_account()', 'os_revoke_session(uuid, text)', 'os_revoke_all_sessions(text, text)', 'os_login_history(int)',
    'os_session_id()', 'os_signed_in_at()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
  -- Server only.
  foreach f in array array[
    'os_access_reason(uuid)',
    'os_record_login(uuid, uuid, boolean, text, text, text, text, text, text, text, text, text, text, text, text)',
    'os_session_ok(timestamptz)', 'os_google_email(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
-- os_session_ok and os_google_email are called from inside the security-definer helpers above, which run as their
-- owner, so authenticated does not need to execute them directly.

-- ── People trigger: who changed what, and ending sessions on suspension ────────────────────────────────────────────

create or replace function public.os_people_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.google_account := nullif(lower(trim(new.google_account)), '');
  if tg_op = 'INSERT' then
    new.invited_by := public.os_current_person();
    new.status_changed_at := now();
    new.status_changed_by := public.os_current_person();
    new.sessions_revoked_at := null;
    return new;
  end if;
  -- A different Google account is a different person: drop the old login link.
  if new.google_account is distinct from old.google_account then
    new.user_id := null;
  end if;
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    new.status_changed_by := public.os_current_person();
    if new.status not in ('onboarding', 'active') then
      new.sessions_revoked_at := now();   -- suspended, revoked, inactive or offboarded: every session ends now
    end if;
  else
    new.status_changed_at := old.status_changed_at;
    new.status_changed_by := old.status_changed_by;
  end if;
  new.invited_by := old.invited_by;
  -- sessions_revoked_at is not writable through the API (no column grant); it changes only here and in
  -- os_revoke_all_sessions(), and never moves backwards.
  if old.sessions_revoked_at is not null and (new.sessions_revoked_at is null or new.sessions_revoked_at < old.sessions_revoked_at) then
    new.sessions_revoked_at := old.sessions_revoked_at;
  end if;
  -- Keep at least one active founder, so the OS cannot be locked out from the app.
  if old.org_role = 'founder' and old.status = 'active'
     and (new.org_role <> 'founder' or new.status <> 'active')
     and not exists (select 1 from public.os_people p
                     where p.id <> old.id and p.org_role = 'founder' and p.status = 'active') then
    raise exception 'There must be at least one active founder' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.os_people_before_write() from public, anon, authenticated;
drop trigger if exists os_people_before_write on public.os_people;
create trigger os_people_before_write before insert or update on public.os_people
  for each row execute function public.os_people_before_write();

create or replace function public.os_people_before_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.org_role = 'founder' and old.status = 'active'
     and not exists (select 1 from public.os_people p where p.id <> old.id and p.org_role = 'founder' and p.status = 'active') then
    raise exception 'There must be at least one active founder' using errcode = '23514';
  end if;
  return old;
end $$;
revoke all on function public.os_people_before_delete() from public, anon, authenticated;
drop trigger if exists os_people_before_delete on public.os_people;
create trigger os_people_before_delete before delete on public.os_people
  for each row execute function public.os_people_before_delete();

-- Founders may now also record why a status changed.
grant update (status_reason) on public.os_people to authenticated;

-- ── Row level security ─────────────────────────────────────────────────────────────────────────────────────────────

alter table public.os_login_events     enable row level security;
alter table public.os_revoked_sessions enable row level security;
revoke all on public.os_login_events, public.os_revoked_sessions from anon, authenticated;
-- Read through os_login_history() only. No direct grants: rows are written by the security-definer functions.

-- People: staff see the directory; anyone else with OS access (guests) sees only their own row. Someone without OS
-- access (not approved, suspended, revoked session, ...) sees nothing, not even their own row.
drop policy if exists os_people_read on public.os_people;
create policy os_people_read on public.os_people for select to authenticated
  using ((select public.os_is_staff()) or id = (select public.os_current_person()));

-- ── Company boundary for Confidential and edits ────────────────────────────────────────────────────────────────────
-- Divisions are shared by IELSco and Elco, so division membership alone would let an Elco Growth member open IELSco
-- Growth Confidential records. Confidential reads and all edits now also need membership of the record's company
-- (HQ counts for every staff member, as before).
create or replace function public.os_can_view(p_company text, p_division text, p_sensitivity text,
                                              p_resource_type text, p_resource_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when public.os_has_grant(p_resource_type, p_resource_id, 'view') then true
    when p_division is not null and public.os_has_grant('division', p_division, 'view')
         and p_sensitivity <> 'Restricted' then true
    when not public.os_is_staff() then false                       -- guests: explicit grants only
    when p_sensitivity = 'Restricted' then false
    when p_sensitivity = 'Confidential' then p_division is not null and public.os_in_division(p_division)
                                             and public.os_in_company(p_company)
    else public.os_in_company(p_company)                           -- Internal
  end
$$;

create or replace function public.os_can_edit(p_company text, p_division text, p_sensitivity text,
                                              p_resource_type text, p_resource_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when public.os_current_person() is null then false
    when public.os_is_founder() then true
    when public.os_has_grant(p_resource_type, p_resource_id, 'edit') then true
    when p_division is not null and public.os_has_grant('division', p_division, 'edit')
         and p_sensitivity <> 'Restricted' then true
    when not public.os_is_staff() then false
    when p_sensitivity = 'Restricted' then false
    else p_division is not null and public.os_in_division(p_division) and public.os_in_company(p_company)
  end
$$;
