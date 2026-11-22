-- IELSco Private Tutoring platform: enrolments, invoices/instalments/payments/receipts, availability, bookings,
-- session records, learning goals/roadmap, notifications and an audit trail.
--
-- ADDITIVE ONLY. Nothing existing is altered or dropped (the old tutoring flow had no tables: it was static data plus
-- WhatsApp). Rollback: supabase/manual/ROLLBACK-20261201-tutoring.sql.
-- Security model: every table has RLS and NO direct write grants. All writes go through SECURITY DEFINER functions that
-- check the caller. Students read only their own rows. Mentors (tutoring_mentors) read all tutoring rows. Only a staff
-- admin (existing public.staff_roles, role 'admin') can verify payments or create enrolments.
-- Package rules (founder, 22 Nov 2026): deposit only above 4 sessions; 50/25/25; sessions unlock per verified milestone.

create extension if not exists btree_gist;

-- ── Mentors ────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tutoring_mentors (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null,
  timezone text not null default 'Asia/Jakarta',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.tutoring_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
$$;
create or replace function public.tutoring_is_mentor() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tutoring_mentors m where m.user_id = (select auth.uid()) and m.is_active)
$$;
-- Mentors and admins see all tutoring records.
create or replace function public.tutoring_is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select public.tutoring_is_admin() or public.tutoring_is_mentor()
$$;

-- ── Enrolments ─────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tutoring_enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete restrict,
  mentor_id uuid not null references public.tutoring_mentors(user_id),
  package_code text not null check (package_code in ('starter', 'growth', 'intensive')),
  sessions_total int not null check (sessions_total > 0),
  sessions_completed int not null default 0 check (sessions_completed >= 0 and sessions_completed <= sessions_total),
  total_price_idr bigint not null check (total_price_idr > 0),
  payment_option text not null check (payment_option in ('full', 'deposit')),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'active', 'payment_review', 'completed', 'cancelled')),
  activated_at timestamptz,
  elco_access_status text not null default 'not_granted' check (elco_access_status in ('not_granted', 'granted', 'expired')),
  elco_access_expires_at timestamptz,
  circle_access boolean not null default false,
  agreement_confirmed_at timestamptz,
  exam_deadline date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  -- Deposit arrangements exist only for packages of MORE than 4 sessions.
  constraint tutoring_deposit_only_above_4 check (payment_option = 'full' or sessions_total > 4)
);
create index if not exists tutoring_enrolments_student on public.tutoring_enrolments (student_id);
create index if not exists tutoring_enrolments_mentor_status on public.tutoring_enrolments (mentor_id, status);

-- ── Invoices, instalments, payments, receipts ──────────────────────────────────────────────────────────────────────
create sequence if not exists public.tutoring_invoice_seq;
create sequence if not exists public.tutoring_receipt_seq;

create table if not exists public.tutoring_invoices (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null unique references public.tutoring_enrolments(id) on delete restrict,
  invoice_no text not null unique,
  total_idr bigint not null,
  issued_at timestamptz not null default now()
);

create table if not exists public.tutoring_instalments (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.tutoring_enrolments(id) on delete restrict,
  seq int not null check (seq between 1 and 3),
  kind text not null check (kind in ('full', 'deposit', 'instalment_1', 'instalment_2')),
  pct int not null check (pct between 1 and 100),
  amount_idr bigint not null check (amount_idr > 0),
  trigger_text text not null,
  due_date date,
  status text not null default 'due' check (status in ('due', 'verified')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  unique (enrolment_id, seq),
  check ((status = 'verified') = (verified_at is not null))
);

create table if not exists public.tutoring_payments (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.tutoring_enrolments(id) on delete restrict,
  instalment_id uuid not null unique references public.tutoring_instalments(id) on delete restrict, -- one payment per instalment
  amount_idr bigint not null check (amount_idr > 0),
  method text not null default 'bank_transfer',
  reference text,
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now()
);

create table if not exists public.tutoring_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.tutoring_payments(id) on delete restrict,
  invoice_id uuid not null references public.tutoring_invoices(id) on delete restrict,
  receipt_no text not null unique,
  issued_at timestamptz not null default now()
);

-- ── Learning record ────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tutoring_goals (
  enrolment_id uuid primary key references public.tutoring_enrolments(id) on delete cascade,
  current_level text, objective text, target text, difficulties text, target_date date, preferred_focus text, context text,
  submitted_at timestamptz not null default now()
);
create table if not exists public.tutoring_roadmap_stages (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.tutoring_enrolments(id) on delete cascade,
  position int not null,
  title text not null,
  note text,
  status text not null default 'upcoming' check (status in ('upcoming', 'current', 'done')),
  unique (enrolment_id, position)
);
create table if not exists public.tutoring_mentor_notes (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.tutoring_enrolments(id) on delete cascade,
  author uuid not null references auth.users(id),
  body text not null, created_at timestamptz not null default now()
);

-- ── Availability and bookings ──────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.tutoring_availability (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.tutoring_mentors(user_id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday, in the mentor's timezone
  start_time time not null, end_time time not null check (end_time > start_time)
);
create table if not exists public.tutoring_blocks (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.tutoring_mentors(user_id) on delete cascade,
  during tstzrange not null, reason text
);

create table if not exists public.tutoring_bookings (
  id uuid primary key default gen_random_uuid(),
  enrolment_id uuid not null references public.tutoring_enrolments(id) on delete restrict,
  student_id uuid not null references auth.users(id),
  mentor_id uuid not null references public.tutoring_mentors(user_id),
  status text not null default 'pending_review' check (status in ('pending_review', 'alternative_proposed', 'confirmed', 'completed', 'cancelled', 'no_show')),
  requested_slots jsonb not null default '[]',      -- [{start, end}] UTC ISO, proposed by the student
  alternative_slots jsonb not null default '[]',    -- proposed by the mentor
  student_timezone text not null default 'Asia/Jakarta',
  focus text,
  starts_at timestamptz, ends_at timestamptz,
  decision_note text, cancel_reason text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status not in ('confirmed', 'completed') or (starts_at is not null and ends_at is not null and ends_at > starts_at)),
  -- A mentor can never hold two confirmed/completed sessions that overlap: enforced by the database, not the UI.
  constraint tutoring_no_double_booking exclude using gist (mentor_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('confirmed', 'completed'))
);
create index if not exists tutoring_bookings_enrolment on public.tutoring_bookings (enrolment_id);
create index if not exists tutoring_bookings_mentor_status on public.tutoring_bookings (mentor_id, status);

create table if not exists public.tutoring_session_records (
  booking_id uuid primary key references public.tutoring_bookings(id) on delete restrict,
  duration_min int not null check (duration_min between 10 and 240),
  topic text not null, skills text[] not null default '{}', strengths text, improvements text,
  feedback text, homework text, next_focus text,
  recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now()
);

create table if not exists public.tutoring_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, body text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.tutoring_audit (
  id bigint generated always as identity primary key,
  actor uuid, action text not null, entity text not null, entity_id uuid, detail jsonb not null default '{}', at timestamptz not null default now()
);

-- ── RLS: read-only for students (own rows) and staff (all); writes only through the functions below ─────────────────
do $$
declare t text;
begin
  foreach t in array array['tutoring_mentors','tutoring_enrolments','tutoring_invoices','tutoring_instalments','tutoring_payments','tutoring_receipts',
    'tutoring_goals','tutoring_roadmap_stages','tutoring_mentor_notes','tutoring_availability','tutoring_blocks','tutoring_bookings',
    'tutoring_session_records','tutoring_notifications','tutoring_audit'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create policy tutoring_mentors_read on public.tutoring_mentors for select to authenticated using (true);
create policy tutoring_enrolments_read on public.tutoring_enrolments for select to authenticated using (student_id = (select auth.uid()) or public.tutoring_is_staff());
-- Child tables: visible when the parent enrolment is visible to the caller.
do $$
declare t text;
begin
  foreach t in array array['tutoring_invoices','tutoring_instalments','tutoring_payments','tutoring_goals','tutoring_roadmap_stages','tutoring_bookings'] loop
    execute format($f$create policy %I on public.%I for select to authenticated using (
      public.tutoring_is_staff() or exists (select 1 from public.tutoring_enrolments e where e.id = enrolment_id and e.student_id = (select auth.uid())))$f$, t || '_read', t);
  end loop;
end $$;
create policy tutoring_receipts_read on public.tutoring_receipts for select to authenticated using (
  public.tutoring_is_staff() or exists (select 1 from public.tutoring_invoices i join public.tutoring_enrolments e on e.id = i.enrolment_id where i.id = invoice_id and e.student_id = (select auth.uid())));
create policy tutoring_session_records_read on public.tutoring_session_records for select to authenticated using (
  public.tutoring_is_staff() or exists (select 1 from public.tutoring_bookings b where b.id = booking_id and b.student_id = (select auth.uid())));
-- Mentor notes are internal: staff only.
create policy tutoring_mentor_notes_read on public.tutoring_mentor_notes for select to authenticated using (public.tutoring_is_staff());
create policy tutoring_availability_read on public.tutoring_availability for select to authenticated using (true);
create policy tutoring_blocks_read on public.tutoring_blocks for select to authenticated using (public.tutoring_is_staff());
create policy tutoring_notifications_read on public.tutoring_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy tutoring_audit_read on public.tutoring_audit for select to authenticated using (public.tutoring_is_admin());

-- ── Helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.tutoring_audit_log(p_action text, p_entity text, p_id uuid, p_detail jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.tutoring_audit (actor, action, entity, entity_id, detail) values ((select auth.uid()), p_action, p_entity, p_id, p_detail)
$$;
revoke all on function public.tutoring_audit_log(text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.tutoring_notify(p_user uuid, p_kind text, p_body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.tutoring_notifications (user_id, kind, body) values (p_user, p_kind, p_body)
$$;
revoke all on function public.tutoring_notify(uuid, text, text) from public, anon, authenticated;

-- Sessions that may be scheduled given VERIFIED instalments: full -> all; deposit -> 2, then total-2, then total.
create or replace function public.tutoring_sessions_unlocked(p_enrolment uuid) returns int
language sql stable security definer set search_path = '' as $$
  select case when e.payment_option = 'full' then (case when bool_or(i.status = 'verified') then e.sessions_total else 0 end)
    else coalesce(max(case when i.status = 'verified' then case i.seq when 1 then 2 when 2 then e.sessions_total - 2 else e.sessions_total end end), 0) end
  from public.tutoring_enrolments e left join public.tutoring_instalments i on i.enrolment_id = e.id
  where e.id = p_enrolment group by e.id, e.payment_option, e.sessions_total
$$;
revoke all on function public.tutoring_sessions_unlocked(uuid) from public, anon;
grant execute on function public.tutoring_sessions_unlocked(uuid) to authenticated;

-- ── Admin: create enrolment + invoice + schedule (nothing is active until the first payment is verified) ───────────
create or replace function public.tutoring_create_enrolment(
  p_student uuid, p_mentor uuid, p_package text, p_option text, p_exam_deadline date default null, p_final_two_start date default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_sessions int; v_price bigint; v_e uuid; v_inv uuid; v_dep bigint; v_i1 bigint; v_i2 bigint;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select s, p into v_sessions, v_price from (values ('starter', 2, 179000), ('growth', 4, 329000), ('intensive', 8, 599000)) as t(c, s, p) where c = p_package;
  if v_sessions is null then raise exception 'unknown_package'; end if;
  if p_option = 'deposit' and v_sessions <= 4 then raise exception 'deposit_not_available'; end if;
  insert into public.tutoring_enrolments (student_id, mentor_id, package_code, sessions_total, total_price_idr, payment_option, exam_deadline, created_by)
    values (p_student, p_mentor, p_package, v_sessions, v_price, p_option, p_exam_deadline, (select auth.uid())) returning id into v_e;
  insert into public.tutoring_invoices (enrolment_id, invoice_no, total_idr)
    values (v_e, 'TUT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.tutoring_invoice_seq')::text, 4, '0'), v_price) returning id into v_inv;
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
  perform public.tutoring_audit_log('enrolment_created', 'enrolment', v_e, jsonb_build_object('package', p_package, 'option', p_option));
  return v_e;
end $$;

-- Student records that they agreed to the payment schedule (the team obtains this before confirming the booking).
create or replace function public.tutoring_record_agreement(p_enrolment uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.tutoring_enrolments set agreement_confirmed_at = now() where id = p_enrolment;
  perform public.tutoring_audit_log('agreement_recorded', 'enrolment', p_enrolment);
end $$;

-- ── Admin: verify a payment. The ONLY way an instalment becomes paid. Issues the receipt, then activates on the first. ─
create or replace function public.tutoring_verify_payment(p_instalment uuid, p_reference text default null, p_method text default 'bank_transfer') returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.tutoring_instalments; e public.tutoring_enrolments; v_pay uuid; v_inv uuid; v_remaining bigint;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into i from public.tutoring_instalments where id = p_instalment for update;
  if i.id is null then raise exception 'not_found'; end if;
  if i.status = 'verified' then raise exception 'already_verified'; end if;
  select * into e from public.tutoring_enrolments where id = i.enrolment_id for update;
  if e.status = 'cancelled' then raise exception 'enrolment_cancelled'; end if;
  if e.agreement_confirmed_at is null then raise exception 'agreement_required'; end if;
  if exists (select 1 from public.tutoring_instalments x where x.enrolment_id = e.id and x.seq < i.seq and x.status <> 'verified') then raise exception 'earlier_instalment_outstanding'; end if;
  update public.tutoring_instalments set status = 'verified', verified_at = now(), verified_by = (select auth.uid()) where id = i.id;
  insert into public.tutoring_payments (enrolment_id, instalment_id, amount_idr, method, reference, verified_by) values (e.id, i.id, i.amount_idr, p_method, p_reference, (select auth.uid())) returning id into v_pay;
  select id into v_inv from public.tutoring_invoices where enrolment_id = e.id;
  insert into public.tutoring_receipts (payment_id, invoice_id, receipt_no) values (v_pay, v_inv, 'RCP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.tutoring_receipt_seq')::text, 4, '0'));
  select e.total_price_idr - coalesce(sum(amount_idr), 0) into v_remaining from public.tutoring_payments where enrolment_id = e.id;
  -- Package activation follows the FIRST verified payment (full payment or deposit). Elco AI and Circle are set by the admin
  -- (tutoring_set_elco_access) once actually granted: this function never claims an Elco grant it did not make.
  if i.seq = 1 then
    update public.tutoring_enrolments set status = 'active', activated_at = now(), circle_access = true where id = e.id and status = 'pending_payment';
  end if;
  if e.status = 'payment_review' then update public.tutoring_enrolments set status = 'active' where id = e.id; end if;
  perform public.tutoring_audit_log('payment_verified', 'payment', v_pay, jsonb_build_object('enrolment', e.id, 'seq', i.seq, 'amount', i.amount_idr, 'remaining', v_remaining));
  perform public.tutoring_notify(e.student_id, 'payment_verified', 'Your payment was verified and your receipt is ready.');
  return v_pay;
end $$;

-- Overdue instalments are FLAGGED for admin review; access and records are never removed automatically.
create or replace function public.tutoring_flag_overdue() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  with f as (update public.tutoring_enrolments e set status = 'payment_review'
    where e.status = 'active' and exists (select 1 from public.tutoring_instalments i where i.enrolment_id = e.id and i.status = 'due' and i.seq > 1 and i.due_date < current_date) returning id)
  select count(*) into n from f;
  return n;
end $$;

create or replace function public.tutoring_set_elco_access(p_enrolment uuid, p_status text, p_expires timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('not_granted', 'granted', 'expired') then raise exception 'bad_status'; end if;
  if p_status = 'granted' and not exists (select 1 from public.tutoring_enrolments where id = p_enrolment and activated_at is not null) then raise exception 'not_activated'; end if;
  update public.tutoring_enrolments set elco_access_status = p_status, elco_access_expires_at = p_expires where id = p_enrolment;
  perform public.tutoring_audit_log('elco_access_set', 'enrolment', p_enrolment, jsonb_build_object('status', p_status, 'expires', p_expires));
end $$;

-- ── Student: onboarding form, booking request, accept alternative, cancel ──────────────────────────────────────────
create or replace function public.tutoring_submit_goals(p_enrolment uuid, p_level text, p_objective text, p_target text, p_difficulties text, p_target_date date, p_focus text, p_context text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.tutoring_enrolments where id = p_enrolment and student_id = (select auth.uid()) and status in ('active', 'payment_review')) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.tutoring_goals (enrolment_id, current_level, objective, target, difficulties, target_date, preferred_focus, context)
    values (p_enrolment, p_level, p_objective, p_target, p_difficulties, p_target_date, p_focus, p_context)
    on conflict (enrolment_id) do update set current_level = excluded.current_level, objective = excluded.objective, target = excluded.target, difficulties = excluded.difficulties,
      target_date = excluded.target_date, preferred_focus = excluded.preferred_focus, context = excluded.context, submitted_at = now();
end $$;

create or replace function public.tutoring_request_booking(p_enrolment uuid, p_slots jsonb, p_timezone text, p_focus text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare e public.tutoring_enrolments; v_open int; v_id uuid;
begin
  select * into e from public.tutoring_enrolments where id = p_enrolment and student_id = (select auth.uid());
  if e.id is null or e.status <> 'active' then raise exception 'not_active'; end if;           -- unpaid or under payment review: no new sessions
  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) not between 1 and 5 then raise exception 'slots_required'; end if;
  select count(*) into v_open from public.tutoring_bookings where enrolment_id = e.id and status in ('pending_review', 'alternative_proposed', 'confirmed');
  if e.sessions_completed + v_open >= public.tutoring_sessions_unlocked(e.id) then raise exception 'no_sessions_available'; end if;
  insert into public.tutoring_bookings (enrolment_id, student_id, mentor_id, requested_slots, student_timezone, focus)
    values (e.id, e.student_id, e.mentor_id, p_slots, coalesce(p_timezone, 'Asia/Jakarta'), p_focus) returning id into v_id;
  perform public.tutoring_audit_log('booking_requested', 'booking', v_id);
  perform public.tutoring_notify(e.mentor_id, 'booking_requested', 'A student requested a session.');
  return v_id;
end $$;

-- ── Mentor: decide a request. A requested time is NOT a booking; only confirm makes it one (and the DB blocks overlaps). ─
create or replace function public.tutoring_decide_booking(p_booking uuid, p_action text, p_start timestamptz default null, p_end timestamptz default null, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.tutoring_bookings;
begin
  if not public.tutoring_is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from public.tutoring_bookings where id = p_booking for update;
  if b.id is null then raise exception 'not_found'; end if;
  if b.status not in ('pending_review', 'alternative_proposed') then raise exception 'not_open'; end if;
  if p_action = 'confirm' then
    if p_start is null or p_end is null then raise exception 'time_required'; end if;
    if exists (select 1 from public.tutoring_blocks k where k.mentor_id = b.mentor_id and k.during && tstzrange(p_start, p_end)) then raise exception 'blocked_time'; end if;
    update public.tutoring_bookings set status = 'confirmed', starts_at = p_start, ends_at = p_end, decision_note = p_note, updated_at = now() where id = b.id; -- exclusion constraint rejects double-booking
  elsif p_action = 'propose' then
    if p_start is null or p_end is null then raise exception 'time_required'; end if;
    update public.tutoring_bookings set status = 'alternative_proposed', alternative_slots = jsonb_build_array(jsonb_build_object('start', p_start, 'end', p_end)), decision_note = p_note, updated_at = now() where id = b.id;
  elsif p_action = 'reject' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'reason_required'; end if;
    update public.tutoring_bookings set status = 'cancelled', cancel_reason = p_note, decision_note = p_note, updated_at = now() where id = b.id;
  else raise exception 'bad_action'; end if;
  perform public.tutoring_audit_log('booking_' || p_action, 'booking', b.id, jsonb_build_object('note', p_note));
  perform public.tutoring_notify(b.student_id, 'booking_' || p_action, 'Your booking request was updated.');
end $$;

create or replace function public.tutoring_accept_alternative(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.tutoring_bookings; s timestamptz; en timestamptz;
begin
  select * into b from public.tutoring_bookings where id = p_booking and student_id = (select auth.uid()) for update;
  if b.id is null or b.status <> 'alternative_proposed' then raise exception 'not_open'; end if;
  s := (b.alternative_slots -> 0 ->> 'start')::timestamptz; en := (b.alternative_slots -> 0 ->> 'end')::timestamptz;
  if exists (select 1 from public.tutoring_blocks k where k.mentor_id = b.mentor_id and k.during && tstzrange(s, en)) then raise exception 'blocked_time'; end if;
  update public.tutoring_bookings set status = 'confirmed', starts_at = s, ends_at = en, updated_at = now() where id = b.id;
  perform public.tutoring_audit_log('alternative_accepted', 'booking', b.id);
  perform public.tutoring_notify(b.mentor_id, 'alternative_accepted', 'A student accepted your proposed time.');
end $$;

-- A student may cancel/reschedule a pending or confirmed session; staff may cancel with a reason. Policy: at least 24h notice
-- for a confirmed session, otherwise the session is kept and counts against the package (enforced by staff decision).
create or replace function public.tutoring_cancel_booking(p_booking uuid, p_reason text, p_no_show boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.tutoring_bookings; v_staff boolean := public.tutoring_is_staff();
begin
  select * into b from public.tutoring_bookings where id = p_booking for update;
  if b.id is null or (b.student_id <> (select auth.uid()) and not v_staff) then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  if b.status not in ('pending_review', 'alternative_proposed', 'confirmed') then raise exception 'not_open'; end if;
  if p_no_show and not v_staff then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.tutoring_bookings set status = case when p_no_show then 'no_show' else 'cancelled' end, cancel_reason = p_reason, updated_at = now() where id = b.id;
  perform public.tutoring_audit_log(case when p_no_show then 'booking_no_show' else 'booking_cancelled' end, 'booking', b.id, jsonb_build_object('reason', p_reason, 'by_staff', v_staff));
  perform public.tutoring_notify(case when v_staff then b.student_id else b.mentor_id end, 'booking_cancelled', 'A booking was cancelled.');
end $$;

-- ── Mentor: complete a session. The ONLY place a session is deducted. ──────────────────────────────────────────────
create or replace function public.tutoring_complete_session(
  p_booking uuid, p_duration int, p_topic text, p_skills text[], p_strengths text, p_improvements text, p_feedback text, p_homework text, p_next_focus text
) returns void language plpgsql security definer set search_path = '' as $$
declare b public.tutoring_bookings; e public.tutoring_enrolments;
begin
  if not public.tutoring_is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into b from public.tutoring_bookings where id = p_booking for update;
  if b.id is null or b.status <> 'confirmed' then raise exception 'not_confirmed'; end if;
  select * into e from public.tutoring_enrolments where id = b.enrolment_id for update;
  if e.sessions_completed >= e.sessions_total then raise exception 'package_exhausted'; end if;
  update public.tutoring_bookings set status = 'completed', updated_at = now() where id = b.id;
  insert into public.tutoring_session_records (booking_id, duration_min, topic, skills, strengths, improvements, feedback, homework, next_focus, recorded_by)
    values (b.id, p_duration, p_topic, coalesce(p_skills, '{}'), p_strengths, p_improvements, p_feedback, p_homework, p_next_focus, (select auth.uid()));
  update public.tutoring_enrolments set sessions_completed = sessions_completed + 1,
    status = case when sessions_completed + 1 >= sessions_total and not exists (select 1 from public.tutoring_instalments i where i.enrolment_id = b.enrolment_id and i.status = 'due') then 'completed' else status end
    where id = b.enrolment_id;
  perform public.tutoring_audit_log('session_completed', 'booking', b.id, jsonb_build_object('enrolment', e.id, 'completed_after', e.sessions_completed + 1));
  perform public.tutoring_notify(b.student_id, 'session_completed', 'Your session feedback is ready.');
end $$;

-- Staff: roadmap, notes, availability and blocks.
create or replace function public.tutoring_set_roadmap(p_enrolment uuid, p_stages jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.tutoring_roadmap_stages where enrolment_id = p_enrolment;
  insert into public.tutoring_roadmap_stages (enrolment_id, position, title, note, status)
    select p_enrolment, (o - 1)::int, s ->> 'title', s ->> 'note', coalesce(s ->> 'status', 'upcoming') from jsonb_array_elements(p_stages) with ordinality as t(s, o);
  perform public.tutoring_audit_log('roadmap_set', 'enrolment', p_enrolment);
end $$;
create or replace function public.tutoring_add_note(p_enrolment uuid, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.tutoring_mentor_notes (enrolment_id, author, body) values (p_enrolment, (select auth.uid()), p_body);
end $$;
create or replace function public.tutoring_set_availability(p_windows jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_mentor() then raise exception 'forbidden' using errcode = '42501'; end if;
  delete from public.tutoring_availability where mentor_id = (select auth.uid());
  insert into public.tutoring_availability (mentor_id, weekday, start_time, end_time)
    select (select auth.uid()), (w ->> 'weekday')::int, (w ->> 'start')::time, (w ->> 'end')::time from jsonb_array_elements(p_windows) w;
end $$;
create or replace function public.tutoring_add_block(p_start timestamptz, p_end timestamptz, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.tutoring_is_mentor() then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.tutoring_blocks (mentor_id, during, reason) values ((select auth.uid()), tstzrange(p_start, p_end), p_reason);
end $$;

-- Function privileges: callable by signed-in users; each function checks the caller itself.
do $$
declare f text;
begin
  foreach f in array array[
    'tutoring_create_enrolment(uuid,uuid,text,text,date,date)','tutoring_record_agreement(uuid)','tutoring_verify_payment(uuid,text,text)','tutoring_flag_overdue()',
    'tutoring_set_elco_access(uuid,text,timestamptz)','tutoring_submit_goals(uuid,text,text,text,text,date,text,text)','tutoring_request_booking(uuid,jsonb,text,text)',
    'tutoring_decide_booking(uuid,text,timestamptz,timestamptz,text)','tutoring_accept_alternative(uuid)','tutoring_cancel_booking(uuid,text,boolean)',
    'tutoring_complete_session(uuid,int,text,text[],text,text,text,text,text)','tutoring_set_roadmap(uuid,jsonb)','tutoring_add_note(uuid,text)',
    'tutoring_set_availability(jsonb)','tutoring_add_block(timestamptz,timestamptz,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Mentor account: arbadzarido03@gmail.com becomes the primary mentor ONLY if that verified account already exists; the
-- admin payment powers come from the existing public.staff_roles row (seeded by 20261019000000). Safe to re-run.
insert into public.tutoring_mentors (user_id, display_name)
select u.id, 'Arbadza Rido' from auth.users u where lower(u.email) = 'arbadzarido03@gmail.com' and u.email_confirmed_at is not null
on conflict (user_id) do nothing;
