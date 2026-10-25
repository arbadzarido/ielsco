-- IELSco membership platform (2026-10-26). Additive only: no existing table is changed or dropped.
-- docs/MEMBERSHIP-PLATFORM.md explains the product; this file is the source of truth for access rules.
--
-- Rules:
--   * Membership is a set of paid (or staff-granted) periods in public.membership_periods. A member is "active" when a
--     period with status 'active' covers now(). Nothing a member can write decides that.
--   * Orders and periods are written only by the server (service role) after a payment is verified with Midtrans, through
--     public.apply_membership_payment(), which locks the order row, so duplicate or out-of-order notifications can't
--     grant twice or roll a paid order back. Prices come from public.membership_plans, never from the browser.
--   * Plans ship with billing_enabled = false. Turning checkout on is an operator decision (prices are proposals until
--     approved), and the app also requires MEMBERSHIP_CHECKOUT_ENABLED=true.
--   * Member-only features (community links, member sessions, feedback reviews, buddy matching, unlimited opportunity
--     tracking) are enforced here, in RLS and security-definer functions, not in the UI.
--   * The legacy Mayar tables (public.memberships, public.transactions) are not read or written.
--   * Staff = public.staff_roles (role 'admin'), the same table Member Stories uses.

-- ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.is_site_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated, service_role;

-- ── Plans (catalog) ───────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.membership_plans (
  code text primary key check (code ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  months int not null check (months between 1 and 24),
  price_idr int not null check (price_idr between 1000 and 10000000),
  billing_enabled boolean not null default false,
  is_public boolean not null default true,
  sort int not null default 0,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.membership_plans enable row level security;
revoke all on public.membership_plans from anon, authenticated;
grant select on public.membership_plans to anon, authenticated;
drop policy if exists membership_plans_read on public.membership_plans;
create policy membership_plans_read on public.membership_plans for select to anon, authenticated using (is_public);

-- Proposed launch prices (docs/MEMBERSHIP-PLATFORM.md §4). NOT approved: billing stays off until the owner approves.
insert into public.membership_plans (code, name, months, price_idr, billing_enabled, sort, note) values
  ('member-3m', 'IELS Member · 3 months', 3, 129000, false, 1, 'Proposed price, pending approval'),
  ('member-12m', 'IELS Member · 12 months', 12, 399000, false, 2, 'Proposed price, pending approval')
on conflict (code) do nothing;

-- ── Orders (one Midtrans transaction each) ────────────────────────────────────────────────────────────────────────
create table if not exists public.membership_orders (
  order_id text primary key check (order_id ~ '^IELS-M-[0-9]{6}-[0-9A-F]{10}$'),
  user_id uuid not null references auth.users(id) on delete restrict,
  plan_code text not null references public.membership_plans(code),
  months int not null check (months between 1 and 24),
  amount_idr int not null check (amount_idr > 0),
  environment text not null check (environment in ('sandbox', 'production')),
  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded')),
  snap_token text,
  snap_redirect_url text,
  midtrans_transaction_id text,
  payment_type text,
  last_transaction_status text,
  fraud_status text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists membership_orders_user_idx on public.membership_orders (user_id, created_at desc);
alter table public.membership_orders enable row level security;
revoke all on public.membership_orders from anon, authenticated;
grant select on public.membership_orders to authenticated;
drop policy if exists membership_orders_own on public.membership_orders;
create policy membership_orders_own on public.membership_orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_site_admin());

-- ── Periods (the entitlement) ─────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.membership_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text references public.membership_plans(code),
  source text not null check (source in ('purchase', 'staff_grant')),
  order_id text unique references public.membership_orders(order_id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'refunded')),
  note text,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((source = 'purchase') = (order_id is not null))
);
create index if not exists membership_periods_user_idx on public.membership_periods (user_id, ends_at desc);
alter table public.membership_periods enable row level security;
revoke all on public.membership_periods from anon, authenticated;
grant select on public.membership_periods to authenticated;
drop policy if exists membership_periods_own on public.membership_periods;
create policy membership_periods_own on public.membership_periods for select to authenticated
  using (user_id = (select auth.uid()) or public.is_site_admin());

-- Midtrans notification log (no personal data: ids and statuses only).
create table if not exists public.membership_payment_notifications (
  id bigint generated always as identity primary key,
  order_id text,
  transaction_status text,
  fraud_status text,
  status_code text,
  signature_valid boolean not null,
  outcome text not null,
  created_at timestamptz not null default now()
);
alter table public.membership_payment_notifications enable row level security;
revoke all on public.membership_payment_notifications from anon, authenticated;
grant select on public.membership_payment_notifications to authenticated;
drop policy if exists membership_notifications_admin on public.membership_payment_notifications;
create policy membership_notifications_admin on public.membership_payment_notifications for select to authenticated
  using (public.is_site_admin());

-- Is the caller an active member right now? Used by RLS and the member-only functions below.
create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membership_periods p
                 where p.user_id = (select auth.uid()) and p.status = 'active' and p.starts_at <= now() and p.ends_at > now())
$$;
revoke all on function public.is_active_member() from public;
grant execute on function public.is_active_member() to anon, authenticated, service_role;

-- The caller's membership summary (null fields when they have never been a member).
create or replace function public.my_membership() returns jsonb
language sql stable security definer set search_path = '' as $$
  with mine as (select * from public.membership_periods where user_id = (select auth.uid()) and status = 'active'),
       cur as (select * from mine where starts_at <= now() and ends_at > now() order by ends_at desc limit 1)
  select jsonb_build_object(
    'active', exists (select 1 from cur),
    'plan_code', (select plan_code from cur),
    'current_ends_at', (select ends_at from cur),
    -- paid-ahead periods (an early renewal) extend access: the latest end of any active period that hasn't ended
    'access_until', (select max(ends_at) from mine where ends_at > now()),
    'member_since', (select min(starts_at) from mine),
    'last_ended_at', (select max(ends_at) from mine where ends_at <= now())
  )
$$;
revoke all on function public.my_membership() from public;
grant execute on function public.my_membership() to authenticated;

-- Applies a Midtrans status the server has already verified (signature checked AND status re-read from Midtrans).
-- p_result is the classified outcome: paid | pending | failed | expired | cancelled | refunded | partially_refunded.
-- Returns what happened. Service role only.
create or replace function public.apply_membership_payment(
  p_order_id text, p_result text, p_gross_amount numeric, p_currency text,
  p_transaction_id text, p_payment_type text, p_transaction_status text, p_fraud_status text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  o public.membership_orders%rowtype;
  last_end timestamptz;
  start_at timestamptz;
begin
  select * into o from public.membership_orders where order_id = p_order_id for update;
  if not found then return 'unknown_order'; end if;
  if p_gross_amount is null or round(p_gross_amount) <> o.amount_idr or coalesce(p_currency, 'IDR') <> 'IDR' then
    return 'amount_mismatch';
  end if;
  update public.membership_orders
     set midtrans_transaction_id = coalesce(p_transaction_id, midtrans_transaction_id),
         payment_type = coalesce(p_payment_type, payment_type),
         last_transaction_status = p_transaction_status, fraud_status = p_fraud_status, updated_at = now()
   where order_id = p_order_id;

  if p_result = 'paid' then
    if o.status = 'paid' then return 'already_paid'; end if;
    if o.status in ('refunded', 'cancelled', 'partially_refunded') and o.paid_at is not null then return 'ignored_after_' || o.status; end if;
    update public.membership_orders set status = 'paid', paid_at = now(), updated_at = now() where order_id = p_order_id;
    -- A renewal bought before the current period ends starts when it ends, so no paid day is lost.
    select max(ends_at) into last_end from public.membership_periods
     where user_id = o.user_id and status = 'active' and ends_at > now();
    start_at := greatest(now(), coalesce(last_end, now()));
    insert into public.membership_periods (user_id, plan_code, source, order_id, starts_at, ends_at)
    values (o.user_id, o.plan_code, 'purchase', o.order_id, start_at, start_at + make_interval(months => o.months))
    on conflict (order_id) do nothing;
    return 'activated';
  end if;

  if p_result in ('refunded', 'cancelled') and o.status = 'paid' then
    update public.membership_orders set status = p_result, updated_at = now() where order_id = p_order_id;
    -- Access from this order ends now (or never starts, if it was a paid-ahead renewal).
    update public.membership_periods
       set status = case when p_result = 'refunded' then 'refunded' else 'cancelled' end,
           ends_at = least(ends_at, greatest(starts_at + interval '1 second', now())), updated_at = now()
     where order_id = p_order_id;
    return 'revoked';
  end if;
  if p_result = 'partially_refunded' and o.status = 'paid' then
    update public.membership_orders set status = 'partially_refunded', updated_at = now() where order_id = p_order_id;
    return 'partial_refund_recorded';
  end if;
  if o.status in ('paid', 'refunded', 'partially_refunded') then return 'ignored_stale'; end if;
  if p_result in ('pending', 'failed', 'expired', 'cancelled') then
    update public.membership_orders set status = p_result, updated_at = now() where order_id = p_order_id;
    return p_result;
  end if;
  return 'unknown_status';
end $$;
revoke all on function public.apply_membership_payment(text, text, numeric, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_membership_payment(text, text, numeric, text, text, text, text, text) to service_role;

-- Staff: grant a membership without payment (partners, scholarships, founding members, support fixes). Logged with
-- who granted it. Starts after any period the member already has.
create or replace function public.grant_staff_membership(p_email text, p_months int, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid; last_end timestamptz; start_at timestamptz; new_id uuid;
begin
  if not public.is_site_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_months is null or p_months not between 1 and 24 then raise exception 'months must be 1-24' using errcode = 'P0001'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'a note (reason) is required' using errcode = 'P0001'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'no account with that email' using errcode = 'P0001'; end if;
  select max(ends_at) into last_end from public.membership_periods where user_id = uid and status = 'active' and ends_at > now();
  start_at := greatest(now(), coalesce(last_end, now()));
  insert into public.membership_periods (user_id, source, starts_at, ends_at, note, granted_by)
  values (uid, 'staff_grant', start_at, start_at + make_interval(months => p_months), left(p_note, 300), (select auth.uid()))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.grant_staff_membership(text, int, text) from public, anon;
grant execute on function public.grant_staff_membership(text, int, text) to authenticated;

-- Staff: member list with contact details and status (for community access management). Admins only.
create or replace function public.admin_membership_roster() returns table (
  user_id uuid, email text, full_name text, status text, access_until timestamptz, member_since timestamptz, periods int
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_site_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select p.user_id, a.email::text, u.full_name::text,
         case when bool_or(p.status = 'active' and p.starts_at <= now() and p.ends_at > now()) then 'active' else 'expired' end,
         max(p.ends_at) filter (where p.status = 'active'), min(p.starts_at), count(*)::int
    from public.membership_periods p
    join auth.users a on a.id = p.user_id
    left join public.users u on u.id = p.user_id
   group by p.user_id, a.email, u.full_name
   order by 4, 5 desc nulls last;
end $$;
revoke all on function public.admin_membership_roster() from public, anon;
grant execute on function public.admin_membership_roster() to authenticated;

-- ── Member links (private community group, member calendar...) ──────────────────────────────────────────────────
-- URLs are entered by staff. Readable only by active members and staff, so invite links never reach the page source
-- of a non-member. Removing someone from the external group when they lapse is a manual step (roster above).
create table if not exists public.member_links (
  key text primary key check (key ~ '^[a-z0-9-]{2,40}$'),
  label text not null,
  description text,
  url text not null check (url ~ '^https://'),
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.member_links enable row level security;
revoke all on public.member_links from anon, authenticated;
grant select, insert, update, delete on public.member_links to authenticated;
drop policy if exists member_links_read on public.member_links;
create policy member_links_read on public.member_links for select to authenticated using (public.is_active_member() or public.is_site_admin());
drop policy if exists member_links_admin on public.member_links;
create policy member_links_admin on public.member_links for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- ── Member sessions (clinics, workshops) ─────────────────────────────────────────────────────────────────────────
create table if not exists public.member_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text check (char_length(description) <= 1200),
  kind text not null check (kind in ('application_clinic', 'workshop', 'speaking_club', 'qna', 'networking')),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 15 and 480),
  capacity int check (capacity between 1 and 1000),
  host_name text check (char_length(host_name) <= 120),
  members_only boolean not null default true,
  join_url text check (join_url ~ '^https://'),
  status text not null default 'scheduled' check (status in ('draft', 'scheduled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_sessions enable row level security;
revoke all on public.member_sessions from anon, authenticated;
grant select, insert, update, delete on public.member_sessions to authenticated;
drop policy if exists member_sessions_admin on public.member_sessions;
create policy member_sessions_admin on public.member_sessions for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

create table if not exists public.member_session_registrations (
  session_id uuid not null references public.member_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
alter table public.member_session_registrations enable row level security;
revoke all on public.member_session_registrations from anon, authenticated;
grant select, delete on public.member_session_registrations to authenticated;
drop policy if exists member_session_reg_own on public.member_session_registrations;
create policy member_session_reg_own on public.member_session_registrations for select to authenticated
  using (user_id = (select auth.uid()) or public.is_site_admin());
drop policy if exists member_session_reg_cancel on public.member_session_registrations;
create policy member_session_reg_cancel on public.member_session_registrations for delete to authenticated
  using (user_id = (select auth.uid()));

-- Public schedule (no join links): anyone can see that sessions exist; that is part of the membership's proof.
create or replace function public.list_member_sessions(p_limit int default 20) returns table (
  id uuid, title text, description text, kind text, starts_at timestamptz, duration_min int, host_name text,
  members_only boolean, capacity int, seats_left int, registered boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.title, s.description, s.kind, s.starts_at, s.duration_min, s.host_name, s.members_only, s.capacity,
         case when s.capacity is null then null
              else greatest(0, s.capacity - (select count(*) from public.member_session_registrations r where r.session_id = s.id))::int end,
         exists (select 1 from public.member_session_registrations r where r.session_id = s.id and r.user_id = (select auth.uid()))
    from public.member_sessions s
   where s.status = 'scheduled' and s.starts_at + make_interval(mins => s.duration_min) > now()
   order by s.starts_at
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
revoke all on function public.list_member_sessions(int) from public;
grant execute on function public.list_member_sessions(int) to anon, authenticated;

create or replace function public.register_member_session(p_session uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.member_sessions%rowtype; taken int;
begin
  if (select auth.uid()) is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into s from public.member_sessions where id = p_session and status = 'scheduled' for update;
  if not found or s.starts_at < now() then raise exception 'this session is not open for registration' using errcode = 'P0001'; end if;
  if s.members_only and not public.is_active_member() then raise exception 'members_only' using errcode = '42501'; end if;
  if exists (select 1 from public.member_session_registrations where session_id = p_session and user_id = (select auth.uid())) then
    return 'already_registered';
  end if;
  select count(*) into taken from public.member_session_registrations where session_id = p_session;
  if s.capacity is not null and taken >= s.capacity then raise exception 'full' using errcode = 'P0001'; end if;
  insert into public.member_session_registrations (session_id, user_id) values (p_session, (select auth.uid()));
  return 'registered';
end $$;
revoke all on function public.register_member_session(uuid) from public, anon;
grant execute on function public.register_member_session(uuid) to authenticated;

-- The join link, only for a registered member (and only while they are still a member, for members-only sessions).
create or replace function public.member_session_join_url(p_session uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.join_url from public.member_sessions s
   where s.id = p_session and s.status = 'scheduled'
     and exists (select 1 from public.member_session_registrations r where r.session_id = s.id and r.user_id = (select auth.uid()))
     and (not s.members_only or public.is_active_member())
$$;
revoke all on function public.member_session_join_url(uuid) from public, anon;
grant execute on function public.member_session_join_url(uuid) to authenticated;

-- ── Application feedback (capped written review) ─────────────────────────────────────────────────────────────────
create table if not exists public.feedback_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('cv', 'motivation_letter', 'essay', 'interview_answers')),
  doc_url text not null check (doc_url ~ '^https://' and char_length(doc_url) <= 500),
  target text check (char_length(target) <= 200),
  notes text check (char_length(notes) <= 1500),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'returned', 'cancelled')),
  reviewer_note text check (char_length(reviewer_note) <= 4000),
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_requests_user_idx on public.feedback_requests (user_id, created_at desc);
alter table public.feedback_requests enable row level security;
revoke all on public.feedback_requests from anon, authenticated;
grant select, update on public.feedback_requests to authenticated;
drop policy if exists feedback_select on public.feedback_requests;
create policy feedback_select on public.feedback_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_site_admin());
drop policy if exists feedback_admin_update on public.feedback_requests;
create policy feedback_admin_update on public.feedback_requests for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- Cap: one review per rolling 90 days while a member (cancelled requests don't count).
create or replace function public.request_feedback(p_doc_type text, p_doc_url text, p_target text, p_notes text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'members_only' using errcode = '42501'; end if;
  if exists (select 1 from public.feedback_requests where user_id = (select auth.uid()) and status <> 'cancelled'
             and created_at > now() - interval '90 days') then
    raise exception 'limit_reached' using errcode = 'P0001';
  end if;
  insert into public.feedback_requests (user_id, doc_type, doc_url, target, notes)
  values ((select auth.uid()), p_doc_type, trim(p_doc_url), nullif(trim(p_target), ''), nullif(trim(p_notes), ''))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.request_feedback(text, text, text, text) from public, anon;
grant execute on function public.request_feedback(text, text, text, text) to authenticated;

-- ── Buddy matching (peer, not mentorship) ────────────────────────────────────────────────────────────────────────
create table if not exists public.buddy_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'paused')),
  preferences text check (char_length(preferences) <= 600),
  match_note text check (char_length(match_note) <= 1000),
  matched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.buddy_requests enable row level security;
revoke all on public.buddy_requests from anon, authenticated;
grant select, update on public.buddy_requests to authenticated;
drop policy if exists buddy_select on public.buddy_requests;
create policy buddy_select on public.buddy_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_site_admin());
drop policy if exists buddy_admin_update on public.buddy_requests;
create policy buddy_admin_update on public.buddy_requests for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

create or replace function public.request_buddy(p_preferences text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.is_active_member() then raise exception 'members_only' using errcode = '42501'; end if;
  insert into public.buddy_requests (user_id, preferences) values ((select auth.uid()), left(nullif(trim(p_preferences), ''), 600))
  on conflict (user_id) do update set preferences = excluded.preferences,
    status = case when public.buddy_requests.status = 'paused' then 'waiting' else public.buddy_requests.status end, updated_at = now();
  return (select status from public.buddy_requests where user_id = (select auth.uid()));
end $$;
revoke all on function public.request_buddy(text) from public, anon;
grant execute on function public.request_buddy(text) to authenticated;

create or replace function public.pause_buddy() returns void
language sql security definer set search_path = '' as $$
  update public.buddy_requests set status = 'paused', updated_at = now() where user_id = (select auth.uid())
$$;
revoke all on function public.pause_buddy() from public, anon;
grant execute on function public.pause_buddy() to authenticated;

-- ── Opportunities ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 3 and 160),
  organizer text not null check (char_length(organizer) between 2 and 160),
  category text not null check (category in ('scholarship', 'fellowship', 'exchange', 'competition', 'conference', 'internship', 'volunteering', 'program')),
  summary text not null check (char_length(summary) between 10 and 600),
  eligibility text check (char_length(eligibility) <= 1200),
  regions text[] not null default '{}',          -- where it takes place: ISO country codes, or 'online' / 'multiple'
  open_to text check (char_length(open_to) <= 200), -- who can apply, in words ("Indonesian citizens", "ASEAN youth 18-35")
  study_level text check (study_level in ('undergraduate', 'masters', 'doctoral', 'any', 'non_degree')),
  funding text not null default 'unknown' check (funding in ('fully_funded', 'partially_funded', 'self_funded', 'free', 'unknown')),
  deadline date,                                  -- only when confirmed on the official page
  deadline_note text check (char_length(deadline_note) <= 200),
  official_url text not null check (official_url ~ '^https://'),
  documents text[] not null default '{}',
  verification text not null default 'unverified' check (verification in ('verified', 'link_checked', 'unverified')),
  checked_on date,                                -- when the official page was last checked
  is_iels_program boolean not null default false,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists opportunities_published_idx on public.opportunities (status, deadline);
alter table public.opportunities enable row level security;
revoke all on public.opportunities from anon, authenticated;
grant select on public.opportunities to anon;
grant select, insert, update, delete on public.opportunities to authenticated;
drop policy if exists opportunities_public on public.opportunities;
create policy opportunities_public on public.opportunities for select to anon, authenticated using (status = 'published' or public.is_site_admin());
drop policy if exists opportunities_admin on public.opportunities;
create policy opportunities_admin on public.opportunities for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- Personal tracker: save → preparing → applied → result. Free accounts track up to 10; members unlimited.
create table if not exists public.opportunity_tracker (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status text not null default 'saved' check (status in ('saved', 'preparing', 'applied', 'accepted', 'not_selected', 'withdrawn')),
  personal_deadline date,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
alter table public.opportunity_tracker enable row level security;
revoke all on public.opportunity_tracker from anon, authenticated;
grant select, insert, update, delete on public.opportunity_tracker to authenticated;
drop policy if exists tracker_own on public.opportunity_tracker;
create policy tracker_own on public.opportunity_tracker for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.tracker_free_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_active_member()
     and (select count(*) from public.opportunity_tracker where user_id = new.user_id) >= 10 then
    raise exception 'tracker_limit' using errcode = 'P0001', hint = 'Free accounts can track 10 opportunities. Remove one, or become a member.';
  end if;
  return new;
end $$;
drop trigger if exists opportunity_tracker_limit on public.opportunity_tracker;
create trigger opportunity_tracker_limit before insert on public.opportunity_tracker for each row execute function public.tracker_free_limit();

-- ── Inquiries (partners, schools, careers interest, membership waitlist) ─────────────────────────────────────────
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('partner', 'school', 'careers', 'membership_waitlist')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  organization text check (char_length(organization) <= 200),
  role text check (char_length(role) <= 120),
  phone text check (char_length(phone) <= 40),
  topic text check (char_length(topic) <= 80),
  message text check (char_length(message) <= 3000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_kind_idx on public.inquiries (kind, created_at desc);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
grant select, update on public.inquiries to authenticated;
drop policy if exists inquiries_admin on public.inquiries;
create policy inquiries_admin on public.inquiries for select to authenticated using (public.is_site_admin());
drop policy if exists inquiries_admin_update on public.inquiries;
create policy inquiries_admin_update on public.inquiries for update to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

-- Visitors submit through this function only (validated, length-capped, at most 5 per email per day).
create or replace function public.submit_inquiry(
  p_kind text, p_name text, p_email text, p_organization text, p_role text, p_phone text, p_topic text, p_message text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if (select count(*) from public.inquiries where lower(email) = lower(trim(p_email)) and created_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many' using errcode = 'P0001';
  end if;
  insert into public.inquiries (kind, name, email, organization, role, phone, topic, message, user_id)
  values (p_kind, trim(p_name), lower(trim(p_email)), nullif(trim(p_organization), ''), nullif(trim(p_role), ''),
          nullif(trim(p_phone), ''), nullif(trim(p_topic), ''), nullif(trim(p_message), ''), (select auth.uid()))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.submit_inquiry(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text, text, text, text, text) to anon, authenticated;
