-- GIF Summer 2027: Self-Funded campaign prices and allocations (founder decision 24 Nov 2026).
--   Super Early Bird: 20 places, USD 799 / IDR 13,000,000 (the first 20 Self-Funded delegates whose first payment is verified)
--   Regular Self-Funded: 50 places, USD 999 / IDR 17,000,000
-- The current cohort's saved settings override the code defaults (lib/settings.ts deep-merges them), so the new values are
-- written into gif.cohorts.settings as well. Only these four keys change; every other saved setting is kept.
-- Fees already recorded on registrations (gif.obligations) are NOT changed: a delegate keeps the amount shown when they
-- registered, and a Super Early Bird place reduces it to the Super Early Bird price (lib/payments/service.ts).
-- Idempotent (writes fixed values). Rollback: write the previous values back the same way
--   (prices.self_funded_total {IDR 14999000, USD 899}, prices.self_funded_early_total {IDR 13999000, USD 799},
--    slots.self_funded_early 10, and remove slots.self_funded_regular).

update gif.cohorts c
set settings = jsonb_set(jsonb_set(jsonb_set(jsonb_set(x.base,
      '{prices,self_funded_total}', '{"IDR": 17000000, "USD": 999}'::jsonb, true),
      '{prices,self_funded_early_total}', '{"IDR": 13000000, "USD": 799}'::jsonb, true),
      '{slots,self_funded_early}', '20'::jsonb, true),
      '{slots,self_funded_regular}', '50'::jsonb, true),
    updated_at = now()
from (
  select id, coalesce(settings, '{}'::jsonb)
    || jsonb_build_object('prices', coalesce(settings -> 'prices', '{}'::jsonb), 'slots', coalesce(settings -> 'slots', '{}'::jsonb)) as base
  from gif.cohorts where is_current
) x
where c.id = x.id;

insert into gif.audit_log (actor, action, entity, entity_id, data)
select 'migration:20261213100000', 'settings_saved', 'cohort', id::text,
  jsonb_build_object('reason', 'Self-Funded campaign prices and allocations (24 Nov 2026)',
    'self_funded_total', settings #> '{prices,self_funded_total}', 'self_funded_early_total', settings #> '{prices,self_funded_early_total}',
    'self_funded_early', settings #> '{slots,self_funded_early}', 'self_funded_regular', settings #> '{slots,self_funded_regular}')
from gif.cohorts where is_current;
