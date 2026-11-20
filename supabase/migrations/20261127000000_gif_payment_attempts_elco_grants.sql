-- GIF Summer 2027: payment attempt recovery (continue / cancel & change method) and the Elco Pro grant audit trail.
-- Additive and backward-compatible: existing payments keep their status; new columns are nullable or defaulted.
--
-- Payment attempts: one gif.obligations row (what is owed) has many gif.payments rows (attempts, one Midtrans order_id each).
-- 'cancelling' marks an attempt whose cancellation the payer requested and the server is confirming with Midtrans; it never
-- counts as unpaid and a verified payment always wins over it. replaced_by links a cancelled attempt to the one that replaced it.
--
-- Rollback (only if no attempt uses the new status):
--   update gif.payments set status = 'pending' where status = 'cancelling';
--   alter table gif.payments drop constraint payments_status_check;
--   alter table gif.payments add constraint payments_status_check check (status in ('created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded'));
--   alter table gif.payments drop column snap_token, drop column cancel_requested_at, drop column cancel_prev_status, drop column cancel_result, drop column replaced_by;
--   drop table gif.elco_grant_attempts;
--   alter table gif.elco_fulfilments drop column grant_attempts, drop column next_attempt_at;

alter table gif.payments drop constraint if exists payments_status_check;
alter table gif.payments add constraint payments_status_check
  check (status in ('created', 'pending', 'cancelling', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded'));

alter table gif.payments add column if not exists snap_token text;                 -- reopens the same Snap page (Continue payment)
alter table gif.payments add column if not exists cancel_requested_at timestamptz;  -- payer asked to cancel this attempt
alter table gif.payments add column if not exists cancel_prev_status text;          -- status to return to if Midtrans refuses
alter table gif.payments add column if not exists cancel_result text;               -- cancelled | no_transaction | not_cancellable | gateway_error | paid
alter table gif.payments add column if not exists replaced_by uuid references gif.payments(id);

-- At most one attempt per obligation may be open at Midtrans at a time unless the payer explicitly chose to start a new one
-- after a cancellation was refused (that case is tracked by cancel_result = 'not_cancellable').
create index if not exists payments_open_attempts on gif.payments (obligation_id) where status in ('created', 'pending', 'cancelling');

-- Elco Pro automatic grants: every call to Elco is recorded (request reference, HTTP status, outcome), never the secret.
alter table gif.elco_fulfilments add column if not exists grant_attempts int not null default 0;
alter table gif.elco_fulfilments add column if not exists next_attempt_at timestamptz;

create table if not exists gif.elco_grant_attempts (
  id             bigint generated always as identity primary key,
  fulfilment_id  uuid not null references gif.elco_fulfilments(id) on delete cascade,
  reference      text not null,
  http_status    int,
  outcome        text not null check (outcome in ('granted', 'pending_signup', 'refused', 'error', 'unreachable')),
  grant_id       text,
  detail         text,
  at             timestamptz not null default now()
);
create index if not exists elco_grant_attempts_fulfilment on gif.elco_grant_attempts (fulfilment_id, at desc);
alter table gif.elco_grant_attempts enable row level security;
