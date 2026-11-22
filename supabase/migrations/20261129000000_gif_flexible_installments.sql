-- GIF Summer 2027: flexible deposit and installments (founder decision 22 Nov 2026).
-- Additive only: new nullable/defaulted columns. No row is deleted.
--
-- - A delegate's Self-Funded fee (or Partial Funded contribution) is one obligation (kind 'full') paid in installments:
--   each payment at least IDR 2,500,000 (USD equivalent at the card rate) and at most the outstanding amount, except a
--   final payment that clears a smaller remainder. obligations.paid_amount is the verified total in the obligation's
--   currency; payments.applied_amount is what each payment counts for, in that currency.
-- - Older deposit + balance pairs with no payment are combined into one 'full' obligation by the application (the
--   originals are kept as 'cancelled'); a paid deposit keeps its balance, which is then paid in installments.
-- - Early bird (first 10 Self-Funded seats confirmed): participants.early_bird_at and the discount applied.
--
-- Rollback (only while no installment has been recorded):
--   alter table gif.obligations drop column paid_amount, drop column first_due_at;
--   alter table gif.payments drop column applied_amount;
--   alter table gif.participants drop column early_bird_at, drop column fee_discount, drop column fee_discount_currency;
--   (and restore the index: drop index gif.payments_one_settled; create unique index payments_one_settled on gif.payments (obligation_id) where status = 'paid' and not is_duplicate;)

alter table gif.obligations add column if not exists paid_amount numeric(14, 2) not null default 0;
alter table gif.obligations add column if not exists first_due_at timestamptz; -- first installment (the deposit) due by
alter table gif.payments add column if not exists applied_amount numeric(14, 2); -- counts towards the obligation (its currency)
alter table gif.participants add column if not exists early_bird_at timestamptz;
alter table gif.participants add column if not exists fee_discount numeric(14, 2);
alter table gif.participants add column if not exists fee_discount_currency text;

-- Existing settled obligations: fully paid.
update gif.obligations set paid_amount = amount where status in ('paid', 'waived') and paid_amount = 0;
-- Existing settled payments counted for their whole obligation (USD card payments: the USD amount).
update gif.payments p set applied_amount = coalesce(p.original_amount, o.amount)
  from gif.obligations o where o.id = p.obligation_id and p.applied_amount is null and p.status in ('paid', 'refunded', 'partially_refunded') and not p.is_duplicate;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'obligations_paid_amount_check') then
    alter table gif.obligations add constraint obligations_paid_amount_check check (paid_amount >= 0);
  end if;
end $$;
create index if not exists participants_early_bird on gif.participants (cohort_id) where early_bird_at is not null;

-- An installment obligation takes several verified payments, so "one settled payment per obligation" now applies only to
-- the other kinds (Elco Pro, mentoring, ...). Over-payment is still caught by the application: anything above the
-- outstanding amount is credited only up to it and the excess is queued for refund. Rebuilt in place (index only, no data).
drop index if exists gif.payments_one_settled;
create unique index if not exists payments_one_settled on gif.payments (obligation_id)
  where status = 'paid' and not is_duplicate and kind not in ('full', 'deposit', 'balance');
