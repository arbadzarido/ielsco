-- GIF Summer 2027: international payments (founder decision 21 Nov 2026).
-- Additive only: new nullable columns on gif.payments and a new table. No existing row changes.
--
-- 1. Card payments for USD obligations go through Midtrans in IDR (USD amount × fixed rate, computed on the server).
--    Each such attempt records the original USD amount, the rate used and where it came from, for audit and receipts.
-- 2. Invoice requests are recorded (one open request per obligation) so Finance can follow up from Admin → Payments.
--
-- Rollback (only while no invoice request or converted payment matters):
--   drop table gif.invoice_requests;
--   alter table gif.payments drop column original_amount, drop column original_currency, drop column fx_rate, drop column fx_source;

alter table gif.payments add column if not exists original_amount numeric(14, 2);
alter table gif.payments add column if not exists original_currency text;
alter table gif.payments add column if not exists fx_rate numeric(12, 4);
alter table gif.payments add column if not exists fx_source text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'payments_original_currency_check') then
    alter table gif.payments add constraint payments_original_currency_check check (original_currency is null or original_currency in ('IDR', 'USD'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_fx_complete_check') then
    -- A conversion is recorded completely or not at all.
    alter table gif.payments add constraint payments_fx_complete_check check (
      (original_amount is null and original_currency is null and fx_rate is null)
      or (original_amount > 0 and original_currency is not null and fx_rate > 0));
  end if;
end $$;

create table if not exists gif.invoice_requests (
  id             uuid primary key default gen_random_uuid(),
  obligation_id  uuid not null references gif.obligations(id) on delete cascade,
  application_id uuid not null references gif.applications(id) on delete cascade,
  participant_id uuid not null references gif.participants(id) on delete cascade,
  requested_by   uuid references gif.accounts(id),
  amount         numeric(14, 2) not null check (amount > 0),
  currency       text not null check (currency in ('IDR', 'USD')),
  status         text not null default 'invoice_requested' check (status in ('invoice_requested', 'invoice_sent', 'paid', 'cancelled')),
  invoice_no     text,
  notes          text,
  handled_by     text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- At most one open request per obligation: asking again returns the existing one instead of a duplicate.
create unique index if not exists invoice_requests_one_open on gif.invoice_requests (obligation_id) where status in ('invoice_requested', 'invoice_sent');
create index if not exists invoice_requests_status on gif.invoice_requests (status, created_at desc);
alter table gif.invoice_requests enable row level security;
