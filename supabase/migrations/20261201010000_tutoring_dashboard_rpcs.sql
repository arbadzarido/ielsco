-- Read helpers for the Private Tutoring dashboards (additive, after 20261201000000_tutoring_platform.sql).
--   tutoring_find_student(email)   admin only: resolve a verified account by email when creating an enrolment.
--   tutoring_roster()              staff only: every enrolment with student name/email, money paid and next payment.
--   tutoring_open_slots(from, to)  signed in: free 60-minute starts inside the mentor's availability, minus confirmed/completed
--                                  sessions and blocked time, at least 12 hours ahead. Students only PROPOSE from these; the mentor confirms.
-- Rollback: drop function public.tutoring_mark_notifications_read(), public.tutoring_find_student(text), public.tutoring_roster(), public.tutoring_open_slots(uuid, date, date);

create or replace function public.tutoring_find_student(p_email text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.tutoring_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into v from auth.users where lower(email) = lower(btrim(p_email)) and email_confirmed_at is not null;
  return v;
end $$;

create or replace function public.tutoring_roster() returns table (
  enrolment_id uuid, student_id uuid, student_name text, student_email text, package_code text, status text, sessions_total int, sessions_completed int,
  total_price_idr bigint, paid_idr bigint, next_label text, next_amount_idr bigint, next_due date, activated_at timestamptz, created_at timestamptz,
  open_requests int, last_session timestamptz, elco_access_status text, elco_access_expires_at timestamptz, invoice_no text, payment_option text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.tutoring_is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select e.id, e.student_id, coalesce(nullif(u.full_name, ''), split_part(au.email, '@', 1)), au.email::text, e.package_code, e.status, e.sessions_total, e.sessions_completed,
    e.total_price_idr, coalesce((select sum(p.amount_idr) from public.tutoring_payments p where p.enrolment_id = e.id), 0)::bigint,
    (select i.kind from public.tutoring_instalments i where i.enrolment_id = e.id and i.status = 'due' order by i.seq limit 1),
    (select i.amount_idr from public.tutoring_instalments i where i.enrolment_id = e.id and i.status = 'due' order by i.seq limit 1),
    (select i.due_date from public.tutoring_instalments i where i.enrolment_id = e.id and i.status = 'due' order by i.seq limit 1),
    e.activated_at, e.created_at,
    (select count(*)::int from public.tutoring_bookings b where b.enrolment_id = e.id and b.status in ('pending_review')),
    (select max(b.starts_at) from public.tutoring_bookings b where b.enrolment_id = e.id and b.status = 'completed'),
    e.elco_access_status, e.elco_access_expires_at,
    (select v.invoice_no from public.tutoring_invoices v where v.enrolment_id = e.id), e.payment_option
  from public.tutoring_enrolments e
  join auth.users au on au.id = e.student_id
  left join public.users u on u.id = e.student_id
  order by e.created_at desc;
end $$;

create or replace function public.tutoring_open_slots(p_mentor uuid, p_from date, p_to date) returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with m as (select timezone from public.tutoring_mentors where user_id = p_mentor and is_active),
  days as (select d::date as day from generate_series(p_from, least(p_to, p_from + 31), interval '1 day') d),
  cand as (
    select (g at time zone m.timezone) as s
    from days d cross join m
    join public.tutoring_availability a on a.mentor_id = p_mentor and a.weekday = extract(dow from d.day)::int
    cross join lateral generate_series(d.day + a.start_time, d.day + a.end_time - interval '60 minutes', interval '60 minutes') g
  )
  select c.s, c.s + interval '60 minutes'
  from cand c
  where c.s >= now() + interval '12 hours'
    and not exists (select 1 from public.tutoring_bookings b where b.mentor_id = p_mentor and b.status in ('confirmed', 'completed') and tstzrange(b.starts_at, b.ends_at) && tstzrange(c.s, c.s + interval '60 minutes'))
    and not exists (select 1 from public.tutoring_blocks k where k.mentor_id = p_mentor and k.during && tstzrange(c.s, c.s + interval '60 minutes'))
  order by c.s
$$;

revoke all on function public.tutoring_find_student(text), public.tutoring_roster(), public.tutoring_open_slots(uuid, date, date) from public, anon;
grant execute on function public.tutoring_find_student(text), public.tutoring_roster(), public.tutoring_open_slots(uuid, date, date) to authenticated;

-- A user marks only their own notifications as read (no direct write grants on the table).
create or replace function public.tutoring_mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.tutoring_notifications set read_at = now() where user_id = (select auth.uid()) and read_at is null
$$;
revoke all on function public.tutoring_mark_notifications_read() from public, anon;
grant execute on function public.tutoring_mark_notifications_read() to authenticated;
