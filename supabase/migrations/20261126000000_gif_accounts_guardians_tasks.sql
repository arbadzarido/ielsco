-- GIF Summer 2027: founder decisions of 20 Nov 2026. Additive only: new nullable columns, one relaxed constraint and one
-- widened check. No existing row is changed or deleted. Rollback: supabase/manual/ROLLBACK-20261126-gif-accounts-guardians.sql
--
-- 1. Combined accounts: a GIF account can be linked to an IELSco (Supabase Auth) user. Applicants may sign in with their
--    IELSco email and password; existing GIF accounts (email-code sign-in) keep working unchanged.
-- 2. Applicants under 18: parent / legal guardian details and a recorded guardian consent (typed name, time, IP),
--    collected through a single-use emailed link (only its SHA-256 is stored) or recorded by staff from a signed form.
-- 3. Phase 1 social media tasks: participants.instagram / social_tasks may already exist (added to 20261123000000 after
--    it was first written); create them here if they don't.

alter table gif.accounts add column if not exists ielsco_user_id uuid;
alter table gif.accounts add column if not exists ielsco_linked_at timestamptz;
create unique index if not exists accounts_ielsco_user on gif.accounts (ielsco_user_id) where ielsco_user_id is not null;

alter table gif.participants add column if not exists instagram text;
alter table gif.participants add column if not exists social_tasks jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'gif.participants'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%social_tasks%') then
    alter table gif.participants add constraint participants_social_tasks_shape
      check (jsonb_typeof(social_tasks) = 'object' and pg_column_size(social_tasks) < 8000) not valid;
  end if;
end $$;

alter table gif.participants add column if not exists guardian_name text;
alter table gif.participants add column if not exists guardian_relation text;
alter table gif.participants add column if not exists guardian_email text;
alter table gif.participants add column if not exists guardian_phone text;
alter table gif.participants add column if not exists guardian_token_hash text;
alter table gif.participants add column if not exists guardian_token_expires_at timestamptz;
alter table gif.participants add column if not exists guardian_consent_at timestamptz;
alter table gif.participants add column if not exists guardian_consent_name text;
alter table gif.participants add column if not exists guardian_consent_method text;
alter table gif.participants add column if not exists guardian_consent_ip text;
create unique index if not exists participants_guardian_token on gif.participants (guardian_token_hash) where guardian_token_hash is not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'participants_guardian_method') then
    alter table gif.participants add constraint participants_guardian_method
      check (guardian_consent_method is null or guardian_consent_method in ('online', 'signed_form'));
  end if;
end $$;

-- Guardians consent without a GIF account: allow consents with no account, recorded with the guardian's email.
alter table gif.consents alter column account_id drop not null;
alter table gif.consents add column if not exists actor_email text;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'consents_category_check' and conrelid = 'gif.consents'::regclass) then
    alter table gif.consents drop constraint consents_category_check;
  end if;
  alter table gif.consents add constraint consents_category_check check (category in (
    'terms', 'privacy', 'payment', 'refund', 'selection', 'mentoring', 'conduct', 'travel', 'media', 'analytics', 'guardian', 'guardian_media'));
  if not exists (select 1 from pg_constraint where conname = 'consents_actor_present') then
    alter table gif.consents add constraint consents_actor_present check (account_id is not null or actor_email is not null);
  end if;
end $$;

-- RLS stays on for the new columns (same tables); no new grants.
