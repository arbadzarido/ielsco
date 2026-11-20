-- Rollback for 20261126000000_gif_accounts_guardians_tasks.sql. Removes guardian consent records and IELSco links:
-- export them first if any applicant relied on them. Does not touch social_tasks (also defined in 20261123000000).
begin;
delete from gif.consents where category in ('guardian', 'guardian_media');
alter table gif.consents drop constraint if exists consents_actor_present;
alter table gif.consents drop constraint if exists consents_category_check;
alter table gif.consents add constraint consents_category_check check (category in (
  'terms', 'privacy', 'payment', 'refund', 'selection', 'mentoring', 'conduct', 'travel', 'media', 'analytics'));
delete from gif.consents where account_id is null;
alter table gif.consents alter column account_id set not null;
alter table gif.consents drop column if exists actor_email;
alter table gif.participants drop constraint if exists participants_guardian_method;
drop index if exists gif.participants_guardian_token;
alter table gif.participants drop column if exists guardian_name, drop column if exists guardian_relation, drop column if exists guardian_email,
  drop column if exists guardian_phone, drop column if exists guardian_token_hash, drop column if exists guardian_token_expires_at,
  drop column if exists guardian_consent_at, drop column if exists guardian_consent_name, drop column if exists guardian_consent_method,
  drop column if exists guardian_consent_ip;
drop index if exists gif.accounts_ielsco_user;
alter table gif.accounts drop column if exists ielsco_user_id, drop column if exists ielsco_linked_at;
delete from supabase_migrations.schema_migrations where version = '20261126000000';
commit;
