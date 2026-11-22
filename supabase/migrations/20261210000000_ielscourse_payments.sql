-- IELScourse payments (Collective, Studio, One) on Midtrans, production only. docs/IELSCOURSE-PAYMENTS.md.
-- Additive: new tables and functions; tutoring_verify_payment / tutoring_create_enrolment keep their behaviour and now share
-- an internal core with the online path. No existing row is changed. Rollback: supabase/manual/ROLLBACK-20261210-ielscourse-payments.sql.
--
-- Rules (same as Elco AI's backend/payments.py, the reviewed reference):
--  * The server decides product, amount and order id (course_create_order). The browser never sends a price.
--  * An order becomes paid ONLY through course_apply_payment(), called by the server after a signed Midtrans notification
--    (or a return/reconcile re-check) whose status was re-read from Midtrans's status API. It locks the order row, checks
--    amount and currency, and fulfils exactly once (unique order_id on memberships, one payment per instalment).
--  * Studio/Collective seats: a seat hold is taken in the same transaction as the order under a cohort row lock, so the last
--    seat can be sold only once. A payment that arrives after its hold expired on a full cohort is honoured and flagged.
--  * Refund/cancel after payment ends the membership period and flags the order for review; One packages are flagged
--    (sessions already delivered need a human decision), never silently revoked.
--  * Order ids start with IELS-C- (Elco uses ELCO-, membership IELS-M-, GIF its own), so a transaction can never activate
--    another product.

-- ── Plans and cohorts ──────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.course_plans (
  code text primary key check (code in ('collective_monthly', 'studio_monthly')),
  product text not null unique check (product in ('collective', 'studio')),
  name text not null,
  price_idr bigint not null check (price_idr > 0),
  period_months int not null default 1 check (period_months between 1 and 12),
  capacity_max int not null check (capacity_max between 1 and 50),
  billing_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
-- Approved prices (founder, 22 Nov 2026).
insert into public.course_plans (code, product, name, price_idr, period_months, capacity_max) values
  ('collective_monthly', 'collective', 'IELScourse Collective - 1 month', 199000, 1, 20),
  ('studio_monthly', 'studio', 'IELScourse Studio - 1 month', 399000, 1, 5)
on conflict (code) do nothing;

create table if not exists public.course_cohorts (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('collective', 'studio')),
  name text not null check (length(trim(name)) between 2 and 80),
  capacity int not null check (capacity between 1 and 20),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  schedule_text text,           -- e.g. "Wednesday and Saturday, 19:30-21:00 WIB"
  starts_on date,
  meeting_url text,
  tutor_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nobody can buy a seat in a cohort without a confirmed schedule.
  constraint course_cohort_open_needs_schedule check (status <> 'open' or (schedule_text is not null and length(trim(schedule_text)) > 3)),
  constraint course_cohort_capacity check ((product = 'studio' and capacity <= 5) or (product = 'collective' and capacity <= 20))
);

create table if not exists public.course_memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete restrict,
  product text not null check (product in ('collective', 'studio')),
  plan_code text not null references public.course_plans(code),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  order_id text not null unique,                       -- the paying order: one period per order (idempotency)
  period_start timestamptz not null,
  period_end timestamptz not null check (period_end > period_start),
  status text not null default 'active' check (status in ('active', 'cancelled', 'refunded')),
  renewal_of uuid references public.course_memberships(id),
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists course_memberships_student on public.course_memberships (student_id, product, period_end desc);
create index if not exists course_memberships_cohort on public.course_memberships (cohort_id, period_end);

-- Included access per membership period: IELS Circle (active at once) and Elco AI (pending until really granted in Elco).
create table if not exists public.course_entitlements (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.course_memberships(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('circle', 'elco_ai')),
  status text not null check (status in ('active', 'pending_activation', 'granted', 'ended')),
  ends_at timestamptz not null,
  reference text,
  updated_at timestamptz not null default now(),
  unique (membership_id, kind)
);

create table if not exists public.course_waitlist (
  id uuid primary key default gen_random_uuid(),
  product text not null check (product in ('collective', 'studio')),
  student_id uuid not null references auth.users(id) on delete cascade,
  preferred_times text check (length(preferred_times) <= 300),
  status text not null default 'waiting' check (status in ('waiting', 'offered', 'joined', 'removed')),
  created_at timestamptz not null default now()
);
create unique index if not exists course_waitlist_one_waiting on public.course_waitlist (product, student_id) where status = 'waiting';

-- ── Orders, seat holds, webhook log, audit ─────────────────────────────────────────────────────────────────────────
create sequence if not exists public.course_invoice_seq;
create sequence if not exists public.course_receipt_seq;

create table if not exists public.course_payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique check (order_id ~ '^IELS-C-[0-9]{6}-[0-9A-F]{10}$'),
  product text not null check (product in ('collective', 'studio', 'one')),
  student_id uuid not null references auth.users(id) on delete restrict,
  plan_code text references public.course_plans(code),
  cohort_id uuid references public.course_cohorts(id),
  renewal_of uuid references public.course_memberships(id),
  tutoring_enrolment_id uuid references public.tutoring_enrolments(id),
  tutoring_instalment_id uuid references public.tutoring_instalments(id),
  item_name text not null,
  amount_idr bigint not null check (amount_idr > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  -- 'production' = real Midtrans. 'local_test' exists only so automated tests can run against a local fake gateway; the app
  -- refuses it on Vercel. There is no Sandbox environment for IELScourse.
  environment text not null check (environment in ('production', 'local_test')),
  status text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded')),
  invoice_no text not null unique,
  receipt_no text unique,
  snap_token text,
  snap_redirect_url text,
  expires_at timestamptz,
  midtrans_transaction_id text,
  payment_type text,
  last_transaction_status text,
  fraud_status text,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  fulfilment text,
  needs_review boolean not null default false,
  review_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_order_shape check (
    (product = 'one' and tutoring_instalment_id is not null and tutoring_enrolment_id is not null and plan_code is null and cohort_id is null)
    or (product in ('collective', 'studio') and plan_code is not null and cohort_id is not null and tutoring_instalment_id is null))
);
create index if not exists course_orders_student on public.course_payment_orders (student_id, created_at desc);
create index if not exists course_orders_open on public.course_payment_orders (status, updated_at) where status in ('created', 'pending');
-- An instalment is paid by at most one order.
create unique index if not exists course_orders_one_paid_per_instalment on public.course_payment_orders (tutoring_instalment_id)
  where status in ('paid', 'partially_refunded') and tutoring_instalment_id is not null;

create table if not exists public.course_seat_holds (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.course_cohorts(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  order_id text not null unique references public.course_payment_orders(order_id),
  expires_at timestamptz not null,
  released_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists course_seat_holds_live on public.course_seat_holds (cohort_id) where released_at is null and converted_at is null;

-- Every notification / re-check, kept as the payment audit trail (no card data, no customer details).
create table if not exists public.course_payment_events (
  id bigint generated always as identity primary key,
  order_id text not null,
  source text not null check (source in ('notification', 'return', 'reconcile', 'admin')),
  transaction_status text,
  fraud_status text,
  status_code text,
  midtrans_transaction_id text,
  signature_valid boolean,
  outcome text not null,
  dedupe_key text unique,          -- identical repeated notifications are recorded once
  created_at timestamptz not null default now()
);
create index if not exists course_payment_events_order on public.course_payment_events (order_id, created_at);

create table if not exists public.course_audit (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, entity text not null, entity_ref text, detail jsonb not null default '{}', at timestamptz not null default now()
);

-- Online payments have no human verifier: allow a null verified_by for method 'midtrans' rows only.
alter table public.tutoring_payments alter column verified_by drop not null;
do $$ begin
  alter table public.tutoring_payments add constraint tutoring_payments_verifier check (verified_by is not null or method like 'midtrans%');
exception when duplicate_object then null; end $$;
alter table public.tutoring_payments add column if not exists order_id text unique;

-- ── RLS: students read their own rows, admins read everything, nobody writes directly ──────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['course_plans','course_cohorts','course_memberships','course_entitlements','course_waitlist','course_payment_orders',
    'course_seat_holds','course_payment_events','course_audit'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
grant select on public.course_plans to anon, authenticated;
grant select on public.course_cohorts, public.course_memberships, public.course_entitlements, public.course_waitlist, public.course_payment_orders,
  public.course_seat_holds, public.course_payment_events, public.course_audit to authenticated;
revoke usage, select on sequence public.course_invoice_seq, public.course_receipt_seq from anon, authenticated;

create policy course_plans_read on public.course_plans for select to anon, authenticated using (true);
-- Members and admins only (the meeting link is members-only); the public list of open groups comes from the server.
create policy course_cohorts_read on public.course_cohorts for select to authenticated using (
  public.tutoring_is_admin()
  or exists (select 1 from public.course_memberships m where m.cohort_id = course_cohorts.id and m.student_id = (select auth.uid())));
create policy course_memberships_read on public.course_memberships for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_admin());
create policy course_entitlements_read on public.course_entitlements for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_admin());
create policy course_waitlist_read on public.course_waitlist for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_admin());
create policy course_orders_read on public.course_payment_orders for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_admin());
create policy course_holds_read on public.course_seat_holds for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_admin());
create policy course_events_read on public.course_payment_events for select to authenticated using (public.tutoring_is_admin());
create policy course_audit_read on public.course_audit for select to authenticated using (public.tutoring_is_admin());
-- The secret-ish payment token is not needed by the browser after checkout; students may still read their own row (RLS).

-- ── Helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.course_audit_log(p_actor uuid, p_action text, p_entity text, p_ref text, p_detail jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.course_audit (actor, action, entity, entity_ref, detail) values (p_actor, p_action, p_entity, p_ref, coalesce(p_detail, '{}'))
$$;

-- Seats taken in a cohort right now: members whose paid period has not ended (plus a 3-day renewal grace) and live holds.
create or replace function public.course_seats_taken(p_cohort uuid, p_except_student uuid default null) returns int
language sql stable security definer set search_path = '' as $$
  select (select count(distinct m.student_id) from public.course_memberships m
           where m.cohort_id = p_cohort and m.status = 'active' and m.period_end > now() - interval '3 days'
             and m.student_id is distinct from p_except_student)
       + (select count(*) from public.course_seat_holds h
           where h.cohort_id = p_cohort and h.released_at is null and h.converted_at is null and h.expires_at > now()
             and h.student_id is distinct from p_except_student
             and not exists (select 1 from public.course_memberships m where m.cohort_id = p_cohort and m.student_id = h.student_id
                             and m.status = 'active' and m.period_end > now() - interval '3 days'))::int
$$;
grant execute on function public.course_seats_taken(uuid, uuid) to authenticated;

-- ── Tutoring: one core shared by the admin (bank transfer) path and the online (Midtrans) path ────────────────────
create or replace function public.tutoring_create_enrolment_core(
  p_student uuid, p_mentor uuid, p_package text, p_option text, p_exam_deadline date, p_final_two_start date, p_actor uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sessions int; v_price bigint; v_e uuid; v_dep bigint; v_i1 bigint; v_i2 bigint;
begin
  select s, p into v_sessions, v_price from (values ('starter', 2, 179000), ('growth', 4, 329000), ('intensive', 8, 599000)) as t(c, s, p) where c = p_package;
  if v_sessions is null then raise exception 'unknown_package'; end if;
  if p_option not in ('full', 'deposit') then raise exception 'bad_option'; end if;
  if p_option = 'deposit' and v_sessions <= 4 then raise exception 'deposit_not_available'; end if;
  insert into public.tutoring_enrolments (student_id, mentor_id, package_code, sessions_total, total_price_idr, payment_option, exam_deadline, created_by)
    values (p_student, p_mentor, p_package, v_sessions, v_price, p_option, p_exam_deadline, p_actor) returning id into v_e;
  insert into public.tutoring_invoices (enrolment_id, invoice_no, total_idr)
    values (v_e, 'TUT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.tutoring_invoice_seq')::text, 4, '0'), v_price);
  if p_option = 'full' then
    insert into public.tutoring_instalments (enrolment_id, seq, kind, pct, amount_idr, trigger_text) values (v_e, 1, 'full', 100, v_price, 'Before your first session is scheduled');
  else
    v_dep := round(v_price * 0.5); v_i1 := round(v_price * 0.25); v_i2 := v_price - v_dep - v_i1;
    insert into public.tutoring_instalments (enrolment_id, seq, kind, pct, amount_idr, trigger_text, due_date) values
      (v_e, 1, 'deposit', 50, v_dep, 'Before your first session is scheduled', null),
      (v_e, 2, 'instalment_1', 25, v_i1, 'After your 2nd completed session, before the 3rd', null),
      (v_e, 3, 'instalment_2', 25, v_i2, case when p_exam_deadline is null then 'Before your final two sessions' else 'Before your final two sessions, or before your exam/application deadline, whichever comes first' end,
        least(p_final_two_start, p_exam_deadline));
  end if;
  insert into public.tutoring_audit (actor, action, entity, entity_id, detail) values (p_actor, 'enrolment_created', 'enrolment', v_e, jsonb_build_object('package', p_package, 'option', p_option));
  return v_e;
end $$;
revoke all on function public.tutoring_create_enrolment_core(uuid, uuid, text, text, date, date, uuid) from public, anon, authenticated;

-- Same signature and behaviour as before (admin only), now through the core.
create or replace function public.tutoring_create_enrolment(
  p_student uuid, p_mentor uuid, p_package text, p_option text, p_exam_deadline date default null, p_final_two_start date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return public.tutoring_create_enrolment_core(p_student, p_mentor, p_package, p_option, p_exam_deadline, p_final_two_start, (select auth.uid()));
end $$;

-- Records one verified instalment payment, issues the receipt and activates on the first. Returns the payment id.
create or replace function public.tutoring_record_payment_core(p_instalment uuid, p_reference text, p_method text, p_actor uuid, p_order_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare i public.tutoring_instalments; e public.tutoring_enrolments; v_pay uuid; v_inv uuid; v_remaining bigint;
begin
  select * into i from public.tutoring_instalments where id = p_instalment for update;
  if i.id is null then raise exception 'not_found'; end if;
  if i.status = 'verified' then raise exception 'already_verified'; end if;
  select * into e from public.tutoring_enrolments where id = i.enrolment_id for update;
  update public.tutoring_instalments set status = 'verified', verified_at = now(), verified_by = p_actor where id = i.id;
  insert into public.tutoring_payments (enrolment_id, instalment_id, amount_idr, method, reference, verified_by, order_id)
    values (e.id, i.id, i.amount_idr, p_method, p_reference, p_actor, p_order_id) returning id into v_pay;
  select id into v_inv from public.tutoring_invoices where enrolment_id = e.id;
  insert into public.tutoring_receipts (payment_id, invoice_id, receipt_no) values (v_pay, v_inv, 'RCP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.tutoring_receipt_seq')::text, 4, '0'));
  select e.total_price_idr - coalesce(sum(amount_idr), 0) into v_remaining from public.tutoring_payments where enrolment_id = e.id;
  if i.seq = 1 then
    update public.tutoring_enrolments set status = 'active', activated_at = now(), circle_access = true where id = e.id and status = 'pending_payment';
  end if;
  if e.status = 'payment_review' then update public.tutoring_enrolments set status = 'active' where id = e.id; end if;
  insert into public.tutoring_audit (actor, action, entity, entity_id, detail) values (p_actor, 'payment_verified', 'payment', v_pay,
    jsonb_build_object('enrolment', e.id, 'seq', i.seq, 'amount', i.amount_idr, 'remaining', v_remaining, 'method', p_method, 'order_id', p_order_id));
  insert into public.tutoring_notifications (user_id, kind, body) values (e.student_id, 'payment_verified', 'Your payment was verified and your receipt is ready.');
  return v_pay;
end $$;
revoke all on function public.tutoring_record_payment_core(uuid, text, text, uuid, text) from public, anon, authenticated;

-- Admin manual verification (now an exception path; online payments are the standard): unchanged checks, shared core.
create or replace function public.tutoring_verify_payment(p_instalment uuid, p_reference text default null, p_method text default 'bank_transfer') returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.tutoring_instalments; e public.tutoring_enrolments;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_method like 'midtrans%' then raise exception 'reserved_method'; end if;
  select * into i from public.tutoring_instalments where id = p_instalment;
  if i.id is null then raise exception 'not_found'; end if;
  if i.status = 'verified' then raise exception 'already_verified'; end if;
  select * into e from public.tutoring_enrolments where id = i.enrolment_id;
  if e.status = 'cancelled' then raise exception 'enrolment_cancelled'; end if;
  if e.agreement_confirmed_at is null then raise exception 'agreement_required'; end if;
  if exists (select 1 from public.tutoring_instalments x where x.enrolment_id = e.id and x.seq < i.seq and x.status <> 'verified') then raise exception 'earlier_instalment_outstanding'; end if;
  -- An instalment with an open online payment must not also be verified by hand (it could be paid twice).
  if exists (select 1 from public.course_payment_orders o where o.tutoring_instalment_id = i.id and o.status = 'pending' and o.expires_at > now()) then raise exception 'online_payment_open'; end if;
  return public.tutoring_record_payment_core(p_instalment, p_reference, p_method, (select auth.uid()), null);
end $$;

-- ── Order creation (server only, service role) ─────────────────────────────────────────────────────────────────────
-- p_product collective|studio: p_cohort required. p_product one: p_instalment required (the student's own due instalment).
-- Returns the order row; when an unexpired order for the same purchase exists it is returned instead (Continue payment).
create or replace function public.course_create_order(
  p_student uuid, p_product text, p_cohort uuid, p_instalment uuid, p_order_id text, p_environment text, p_ttl_min int, p_agreed boolean default false
) returns public.course_payment_orders language plpgsql security definer set search_path = '' as $$
declare c public.course_cohorts; pl public.course_plans; cur public.course_memberships; i public.tutoring_instalments; e public.tutoring_enrolments;
  o public.course_payment_orders; v_amount bigint; v_item text; v_inv text; v_pkg text;
begin
  if p_environment not in ('production', 'local_test') then raise exception 'bad_environment'; end if;
  if p_ttl_min not between 15 and 1440 then raise exception 'bad_ttl'; end if;
  perform pg_advisory_xact_lock(hashtext('ielscourse-order:' || p_student::text));

  if p_product in ('collective', 'studio') then
    select * into pl from public.course_plans where product = p_product;
    if pl.code is null or not pl.billing_enabled then raise exception 'plan_unavailable'; end if;
    select * into c from public.course_cohorts where id = p_cohort for update;
    if c.id is null or c.product <> p_product then raise exception 'unknown_cohort'; end if;
    -- The student's current (or just-ended, within grace) membership of this product.
    select * into cur from public.course_memberships m where m.student_id = p_student and m.product = p_product and m.status = 'active'
      and m.period_end > now() - interval '3 days' order by m.period_end desc limit 1;
    if cur.id is not null and cur.cohort_id <> p_cohort then raise exception 'member_of_other_cohort'; end if;
    if cur.id is null then
      if c.status <> 'open' then raise exception 'cohort_not_open'; end if;
    elsif c.status = 'closed' then raise exception 'cohort_closed';
    end if;
    v_amount := pl.price_idr;
    v_item := pl.name;
    select * into o from public.course_payment_orders x where x.student_id = p_student and x.cohort_id = p_cohort and x.environment = p_environment
      and x.status in ('created', 'pending') order by x.created_at desc limit 1;
  elsif p_product = 'one' then
    select * into i from public.tutoring_instalments where id = p_instalment for update;
    if i.id is null then raise exception 'unknown_instalment'; end if;
    select * into e from public.tutoring_enrolments where id = i.enrolment_id;
    if e.student_id <> p_student then raise exception 'forbidden' using errcode = '42501'; end if;
    if e.status in ('cancelled', 'completed') then raise exception 'enrolment_closed'; end if;
    if i.status = 'verified' then raise exception 'already_paid'; end if;
    if exists (select 1 from public.tutoring_instalments x where x.enrolment_id = e.id and x.seq < i.seq and x.status <> 'verified') then raise exception 'earlier_instalment_outstanding'; end if;
    if e.agreement_confirmed_at is null then
      if not p_agreed then raise exception 'agreement_required'; end if;
      update public.tutoring_enrolments set agreement_confirmed_at = now() where id = e.id;
      insert into public.tutoring_audit (actor, action, entity, entity_id, detail) values (p_student, 'agreement_recorded', 'enrolment', e.id, '{"via":"online_checkout"}');
    end if;
    v_amount := i.amount_idr;
    v_pkg := initcap(e.package_code);
    v_item := 'IELScourse One ' || v_pkg || ' - ' || case i.kind when 'full' then 'full payment' when 'deposit' then 'deposit' when 'instalment_1' then 'instalment 1' else 'instalment 2' end;
    select * into o from public.course_payment_orders x where x.tutoring_instalment_id = p_instalment and x.environment = p_environment
      and x.status in ('created', 'pending') order by x.created_at desc limit 1;
  else
    raise exception 'unknown_product';
  end if;

  -- Continue payment: reuse an unexpired open order for the same purchase and amount instead of creating a duplicate.
  if o.id is not null then
    if o.snap_token is null and o.status = 'created' and o.created_at > now() - interval '1 minute' then raise exception 'in_progress'; end if;
    if o.snap_token is not null and o.expires_at > now() + interval '1 minute' and o.amount_idr = v_amount then return o; end if;
  end if;

  -- Seat: only for a new member (a renewing member keeps their seat).
  if p_product in ('collective', 'studio') and cur.id is null then
    if public.course_seats_taken(p_cohort, p_student) >= c.capacity then raise exception 'cohort_full'; end if;
  end if;

  if p_product = 'one' then
    select invoice_no || '-' || i.seq into v_inv from public.tutoring_invoices where enrolment_id = e.id;
    -- An earlier failed/expired attempt for the same instalment already used that number: add the attempt count.
    if exists (select 1 from public.course_payment_orders where invoice_no = v_inv) then
      v_inv := v_inv || '-' || (select count(*) + 1 from public.course_payment_orders where tutoring_instalment_id = p_instalment);
    end if;
  else
    v_inv := 'ICS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.course_invoice_seq')::text, 5, '0');
  end if;

  insert into public.course_payment_orders (order_id, product, student_id, plan_code, cohort_id, renewal_of, tutoring_enrolment_id, tutoring_instalment_id,
    item_name, amount_idr, environment, invoice_no, expires_at)
  values (p_order_id, p_product, p_student, pl.code, case when p_product = 'one' then null else p_cohort end, cur.id, e.id, i.id,
    v_item, v_amount, p_environment, v_inv, now() + make_interval(mins => p_ttl_min))
  returning * into o;
  if p_product in ('collective', 'studio') and cur.id is null then
    -- Release this student's older live holds on the cohort (one hold per student), then hold the seat for this order.
    update public.course_seat_holds set released_at = now() where student_id = p_student and cohort_id = p_cohort and released_at is null and converted_at is null;
    insert into public.course_seat_holds (cohort_id, student_id, order_id, expires_at) values (p_cohort, p_student, p_order_id, now() + make_interval(mins => p_ttl_min + 5));
  end if;
  perform public.course_audit_log(p_student, 'order_created', 'order', p_order_id, jsonb_build_object('product', p_product, 'amount', v_amount, 'renewal', cur.id is not null));
  return o;
end $$;
revoke all on function public.course_create_order(uuid, text, uuid, uuid, text, text, int, boolean) from public, anon, authenticated;

-- Snap token attached (server), or Snap creation failed (releases the hold).
create or replace function public.course_order_snap(p_order_id text, p_token text, p_redirect text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null then
    update public.course_payment_orders set status = 'failed', updated_at = now() where order_id = p_order_id and status = 'created';
    update public.course_seat_holds set released_at = now() where order_id = p_order_id and released_at is null and converted_at is null;
  else
    update public.course_payment_orders set snap_token = p_token, snap_redirect_url = p_redirect, status = 'pending', updated_at = now()
      where order_id = p_order_id and status = 'created';
  end if;
end $$;
revoke all on function public.course_order_snap(text, text, text) from public, anon, authenticated;

-- One package bought online by the student: creates the enrolment + invoice + schedule (nothing active until paid).
-- Reuses the student's unpaid enrolment of the same package and option instead of creating a second one.
create or replace function public.course_self_enrol_one(p_student uuid, p_package text, p_option text, p_exam_deadline date default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_e uuid; v_mentor uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ielscourse-order:' || p_student::text));
  select id into v_e from public.tutoring_enrolments e where e.student_id = p_student and e.package_code = p_package and e.payment_option = p_option
    and e.status = 'pending_payment' and not exists (select 1 from public.tutoring_instalments i where i.enrolment_id = e.id and i.status = 'verified')
    order by created_at desc limit 1;
  if v_e is not null then return v_e; end if;
  if (select count(*) from public.tutoring_enrolments e where e.student_id = p_student and e.status = 'pending_payment') >= 2 then raise exception 'too_many_unpaid'; end if;
  select user_id into v_mentor from public.tutoring_mentors where is_active order by created_at limit 1;
  if v_mentor is null then raise exception 'no_mentor'; end if;
  return public.tutoring_create_enrolment_core(p_student, v_mentor, p_package, p_option, p_exam_deadline, null, p_student);
end $$;
revoke all on function public.course_self_enrol_one(uuid, text, text, date) from public, anon, authenticated;

-- ── Payment state machine + fulfilment (server only; called after Midtrans's status was re-read) ───────────────────
create or replace function public.course_apply_payment(
  p_order_id text, p_result text, p_gross_amount numeric, p_currency text,
  p_transaction_id text, p_payment_type text, p_transaction_status text, p_fraud_status text
) returns text language plpgsql security definer set search_path = '' as $$
declare o public.course_payment_orders; pl public.course_plans; v_start timestamptz; v_end timestamptz; v_m uuid; v_hold public.course_seat_holds;
  v_over boolean := false; v_pay uuid; v_rcp text; c public.course_cohorts;
begin
  select * into o from public.course_payment_orders where order_id = p_order_id for update;
  if o.id is null then return 'unknown_order'; end if;
  if p_gross_amount is null or round(p_gross_amount) <> o.amount_idr or coalesce(p_currency, 'IDR') <> 'IDR' then
    update public.course_payment_orders set needs_review = true, review_reason = 'amount_mismatch', updated_at = now() where id = o.id;
    perform public.course_audit_log(null, 'amount_mismatch', 'order', p_order_id, jsonb_build_object('gross', p_gross_amount, 'currency', p_currency));
    return 'amount_mismatch';
  end if;
  update public.course_payment_orders set midtrans_transaction_id = coalesce(p_transaction_id, midtrans_transaction_id), payment_type = coalesce(p_payment_type, payment_type),
    last_transaction_status = p_transaction_status, fraud_status = p_fraud_status, updated_at = now() where id = o.id;

  if p_result = 'paid' then
    if o.status in ('paid', 'partially_refunded') then return 'already_paid'; end if;
    if o.status = 'refunded' or (o.status = 'cancelled' and o.paid_at is not null) then return 'ignored_after_' || o.status; end if;
    -- A verified payment always wins, even over an expired/cancelled local state: the money is never lost.
    v_rcp := 'ICR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.course_receipt_seq')::text, 5, '0');
    if o.product in ('collective', 'studio') then
      select * into pl from public.course_plans where code = o.plan_code;
      select * into c from public.course_cohorts where id = o.cohort_id for update;
      select * into v_hold from public.course_seat_holds where order_id = o.order_id;
      -- No valid hold and not a renewal: the seat may have gone. Honour the payment, flag it for the team.
      if o.renewal_of is null and (v_hold.id is null or v_hold.released_at is not null or v_hold.expires_at < now()) then
        v_over := public.course_seats_taken(o.cohort_id, o.student_id) >= c.capacity;
      end if;
      select greatest(now(), coalesce(max(m.period_end), now())) into v_start from public.course_memberships m
        where m.student_id = o.student_id and m.product = o.product and m.status = 'active' and m.period_end > now();
      v_end := v_start + make_interval(months => pl.period_months);
      insert into public.course_memberships (student_id, product, plan_code, cohort_id, order_id, period_start, period_end, renewal_of)
        values (o.student_id, o.product, o.plan_code, o.cohort_id, o.order_id, v_start, v_end, o.renewal_of)
        on conflict (order_id) do nothing returning id into v_m;
      if v_m is not null then
        insert into public.course_entitlements (membership_id, student_id, kind, status, ends_at) values
          (v_m, o.student_id, 'circle', 'active', v_end), (v_m, o.student_id, 'elco_ai', 'pending_activation', v_end)
          on conflict (membership_id, kind) do nothing;
      end if;
      update public.course_seat_holds set converted_at = now() where order_id = o.order_id and converted_at is null;
      update public.course_waitlist set status = 'joined' where student_id = o.student_id and product = o.product and status in ('waiting', 'offered');
      update public.course_payment_orders set status = 'paid', paid_at = now(), receipt_no = v_rcp, fulfilled_at = now(),
        fulfilment = 'membership:' || coalesce(v_m::text, 'existing'), needs_review = needs_review or v_over,
        review_reason = case when v_over then 'paid_over_capacity' else review_reason end, updated_at = now() where id = o.id;
      insert into public.tutoring_notifications (user_id, kind, body) values (o.student_id, 'payment_verified',
        'Your IELScourse ' || initcap(o.product) || ' payment is confirmed. Receipt ' || v_rcp || '. Your class details are in My Courses.');
    else
      -- One: the instalment becomes verified through the same core as a manual verification.
      begin
        v_pay := public.tutoring_record_payment_core(o.tutoring_instalment_id, coalesce(p_transaction_id, o.order_id), 'midtrans:' || coalesce(p_payment_type, 'unknown'), null, o.order_id);
        select receipt_no into v_rcp from public.tutoring_receipts where payment_id = v_pay;
        update public.course_payment_orders set status = 'paid', paid_at = now(), receipt_no = v_rcp, fulfilled_at = now(), fulfilment = 'tutoring_payment:' || v_pay, updated_at = now() where id = o.id;
      exception when others then
        if sqlerrm <> 'already_verified' then raise; end if;
        -- Already paid another way (e.g. a second attempt or a manual verification): keep the money on record, refund needed.
        update public.course_payment_orders set status = 'paid', paid_at = now(), receipt_no = v_rcp, needs_review = true, review_reason = 'duplicate_payment_refund_needed', updated_at = now() where id = o.id;
        perform public.course_audit_log(null, 'duplicate_payment', 'order', o.order_id, '{}');
        return 'duplicate';
      end;
    end if;
    perform public.course_audit_log(null, 'payment_paid', 'order', o.order_id, jsonb_build_object('amount', o.amount_idr, 'type', p_payment_type, 'over_capacity', v_over));
    return case when v_over then 'activated_over_capacity' else 'activated' end;
  end if;

  if p_result in ('refunded', 'cancelled') and o.status in ('paid', 'partially_refunded') then
    update public.course_payment_orders set status = p_result, needs_review = true, review_reason = 'payment_' || p_result || '_after_paid', updated_at = now() where id = o.id;
    if o.product in ('collective', 'studio') then
      update public.course_memberships set status = case when p_result = 'refunded' then 'refunded' else 'cancelled' end,
        period_end = greatest(period_start + interval '1 second', least(period_end, now())) where order_id = o.order_id;
      update public.course_entitlements set status = 'ended', ends_at = least(ends_at, now()), updated_at = now()
        where membership_id = (select id from public.course_memberships where order_id = o.order_id);
    else
      update public.tutoring_enrolments set status = 'payment_review' where id = o.tutoring_enrolment_id and status = 'active';
    end if;
    perform public.course_audit_log(null, 'payment_' || p_result, 'order', o.order_id, '{}');
    return 'revoked';
  end if;
  if p_result = 'partially_refunded' and o.status = 'paid' then
    update public.course_payment_orders set status = 'partially_refunded', needs_review = true, review_reason = 'partial_refund', updated_at = now() where id = o.id;
    return 'partial_refund_recorded';
  end if;
  if o.status in ('paid', 'partially_refunded', 'refunded') then return 'ignored_stale'; end if;
  if p_result in ('pending', 'failed', 'expired', 'cancelled') then
    update public.course_payment_orders set status = p_result, updated_at = now() where id = o.id;
    if p_result <> 'pending' then
      update public.course_seat_holds set released_at = now() where order_id = o.order_id and released_at is null and converted_at is null;
    end if;
    return p_result;
  end if;
  return 'unknown_status';
end $$;
revoke all on function public.course_apply_payment(text, text, numeric, text, text, text, text, text) from public, anon, authenticated;

-- Orders whose Snap window ended without a transaction: expired locally (seat released). Midtrans is still re-checked by
-- the reconcile job before this runs, so a late payment is never missed (a paid status always wins later anyway).
create or replace function public.course_expire_stale() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with x as (update public.course_payment_orders set status = 'expired', updated_at = now()
    where status in ('created', 'pending') and expires_at < now() - interval '30 minutes' and midtrans_transaction_id is null returning order_id)
  select count(*) into n from x;
  update public.course_seat_holds h set released_at = now() where released_at is null and converted_at is null and expires_at < now();
  return n;
end $$;
revoke all on function public.course_expire_stale() from public, anon, authenticated;

-- Renewal reminders: memberships ending within 7 days with no later paid period get one in-dashboard notice.
create or replace function public.course_send_renewal_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with due as (
    update public.course_memberships m set reminded_at = now()
    where m.status = 'active' and m.reminded_at is null and m.period_end between now() and now() + interval '7 days'
      and not exists (select 1 from public.course_memberships n2 where n2.student_id = m.student_id and n2.product = m.product and n2.status = 'active' and n2.period_end > m.period_end)
    returning m.student_id, m.product, m.period_end)
  , ins as (insert into public.tutoring_notifications (user_id, kind, body)
    select student_id, 'renewal_due', 'Your IELScourse ' || initcap(product) || ' month ends on ' || to_char(period_end at time zone 'Asia/Jakarta', 'DD Mon YYYY') ||
      '. Renew in My Courses to keep your seat.' from due returning 1)
  select count(*) into n from ins;
  return n;
end $$;
revoke all on function public.course_send_renewal_reminders() from public, anon, authenticated;

-- ── Student: waitlist (no open cohort, or full) ────────────────────────────────────────────────────────────────────
create or replace function public.course_join_waitlist(p_product text, p_preferred text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if (select auth.uid()) is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_product not in ('collective', 'studio') then raise exception 'unknown_product'; end if;
  select id into v from public.course_waitlist where product = p_product and student_id = (select auth.uid()) and status = 'waiting';
  if v is not null then
    update public.course_waitlist set preferred_times = left(p_preferred, 300) where id = v;
    return v;
  end if;
  insert into public.course_waitlist (product, student_id, preferred_times) values (p_product, (select auth.uid()), left(p_preferred, 300)) returning id into v;
  return v;
end $$;

-- ── Admin: cohorts, review, Elco grant record ──────────────────────────────────────────────────────────────────────
create or replace function public.course_admin_save_cohort(p_id uuid, p_product text, p_name text, p_capacity int, p_status text,
  p_schedule text, p_starts_on date, p_meeting_url text, p_tutor_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v uuid := p_id;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v is null then
    insert into public.course_cohorts (product, name, capacity, status, schedule_text, starts_on, meeting_url, tutor_name, created_by)
      values (p_product, p_name, p_capacity, p_status, nullif(trim(p_schedule), ''), p_starts_on, nullif(trim(p_meeting_url), ''), nullif(trim(p_tutor_name), ''), (select auth.uid()))
      returning id into v;
  else
    if p_capacity < (select count(distinct student_id) from public.course_memberships where cohort_id = v and status = 'active' and period_end > now()) then
      raise exception 'capacity_below_members';
    end if;
    update public.course_cohorts set name = p_name, capacity = p_capacity, status = p_status, schedule_text = nullif(trim(p_schedule), ''),
      starts_on = p_starts_on, meeting_url = nullif(trim(p_meeting_url), ''), tutor_name = nullif(trim(p_tutor_name), ''), updated_at = now()
      where id = v and product = p_product;
    if not found then raise exception 'not_found'; end if;
  end if;
  perform public.course_audit_log((select auth.uid()), 'cohort_saved', 'cohort', v::text, jsonb_build_object('status', p_status, 'capacity', p_capacity));
  return v;
end $$;

create or replace function public.course_admin_resolve_review(p_order_id text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.course_payment_orders set needs_review = false, reviewed_at = now(), reviewed_by = (select auth.uid()), updated_at = now()
    where order_id = p_order_id and needs_review;
  if not found then raise exception 'not_found'; end if;
  perform public.course_audit_log((select auth.uid()), 'review_resolved', 'order', p_order_id, jsonb_build_object('note', left(p_note, 500)));
end $$;

create or replace function public.course_admin_set_elco(p_entitlement uuid, p_status text, p_reference text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('pending_activation', 'granted', 'ended') then raise exception 'bad_status'; end if;
  update public.course_entitlements set status = p_status, reference = left(p_reference, 120), updated_at = now() where id = p_entitlement and kind = 'elco_ai';
  if not found then raise exception 'not_found'; end if;
  perform public.course_audit_log((select auth.uid()), 'elco_entitlement_set', 'entitlement', p_entitlement::text, jsonb_build_object('status', p_status));
end $$;

do $$
declare f text;
begin
  foreach f in array array['course_join_waitlist(text,text)', 'course_admin_save_cohort(uuid,text,text,int,text,text,date,text,text)',
    'course_admin_resolve_review(text,text)', 'course_admin_set_elco(uuid,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['course_create_order(uuid,text,uuid,uuid,text,text,int,boolean)', 'course_order_snap(text,text,text)',
    'course_self_enrol_one(uuid,text,text,date)', 'course_apply_payment(text,text,numeric,text,text,text,text,text)', 'course_expire_stale()',
    'course_send_renewal_reminders()', 'tutoring_record_payment_core(uuid,text,text,uuid,text)', 'tutoring_create_enrolment_core(uuid,uuid,text,text,date,date,uuid)',
    'course_audit_log(uuid,text,text,text,jsonb)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
