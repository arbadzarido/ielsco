-- Rollback for 20261105010000_elco_identity_exam_access.sql (run manually; then delete its row from
-- supabase_migrations.schema_migrations). Restores the 20261105000000 versions of the three functions.
begin;
delete from public.elco_benefit_grants where tier = 'exam';
drop function if exists public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text, text[]);
alter table public.elco_benefit_grants drop constraint if exists elco_benefit_grants_modes_check;
alter table public.elco_benefit_grants drop constraint if exists elco_benefit_grants_tier_check;
alter table public.elco_benefit_grants add constraint elco_benefit_grants_tier_check check (tier in ('starter', 'pro'));
alter table public.elco_benefit_grants drop column if exists modes;
alter table public.elco_account_links drop column if exists elco_display_name;
commit;
-- Then re-run these three function definitions from supabase/migrations/20261105000000_elco_benefits.sql (unchanged there):
--   public.apply_elco_benefit(... 13 arguments), public.elco_benefit_now(uuid), public.my_elco_benefits().
