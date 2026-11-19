-- Global Impact Fellowship programme platform (gif.ielsco.com), cohort-agnostic: Summer 2027 is the first cohort row;
-- later batches (e.g. Winter 2027) are new rows in gif.cohorts with their own settings.
--
-- Everything lives in its own schema `gif`, which PostgREST does not expose (only `public` is in the API). The GIF app
-- (apps/gif) connects server-side with a database connection string; browsers never query these tables. RLS is enabled
-- on every table with no policies, and anon/authenticated have no grants, so even a misconfigured API exposure returns
-- nothing. Rollback: supabase/manual/ROLLBACK-20261123-gif-programme-platform.sql.

create schema if not exists gif;
revoke all on schema gif from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema gif from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema gif from authenticated'; end if;
end $$;

create extension if not exists pgcrypto;

-- ── Cohorts and settings ─────────────────────────────────────────────────────────────────────────────────────────────
create table gif.cohorts (
  id          text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  name        text not null,
  code_prefix text not null check (code_prefix ~ '^[A-Z0-9]{2,8}$'),
  starts_on   date not null,
  ends_on     date not null,
  route       text not null,
  capacity    int  not null default 100 check (capacity > 0),
  is_current  boolean not null default false,
  settings    jsonb not null default '{}'::jsonb,   -- deadlines, prices, slots, flags (defaults in apps/gif/src/lib/settings.ts)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index cohorts_one_current on gif.cohorts (is_current) where is_current;

insert into gif.cohorts (id, name, code_prefix, starts_on, ends_on, route, capacity, is_current)
values ('summer-2027', 'GIF Summer 2027', 'GIF27', '2027-07-27', '2027-08-03', 'Singapore → Malaysia → Thailand', 100, true)
on conflict (id) do nothing;

-- ── Accounts, sign-in codes, sessions, staff ─────────────────────────────────────────────────────────────────────────
create table gif.accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index accounts_email on gif.accounts (email);

create table gif.login_codes (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  ip          text,
  created_at  timestamptz not null default now()
);
create index login_codes_email on gif.login_codes (email, created_at desc);

create table gif.sessions (
  token_hash  text primary key,
  account_id  uuid not null references gif.accounts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  ip          text,
  user_agent  text
);
create index sessions_account on gif.sessions (account_id);

create table gif.staff (
  email      text primary key check (email = lower(email)),
  role       text not null check (role in ('owner', 'admin', 'finance', 'evaluator', 'viewer')),
  name       text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  created_by text
);

-- Generic fixed-window counters for rate limits that must hold across serverless instances (sign-in codes, forms).
create table gif.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (key, window_start)
);

-- ── Applications and participants ────────────────────────────────────────────────────────────────────────────────────
create table gif.applications (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  cohort_id          text not null references gif.cohorts(id),
  owner_account_id   uuid not null references gif.accounts(id),
  pathway            text not null check (pathway in ('fully_funded', 'mentoring', 'self_funded')),
  mode               text not null default 'individual' check (mode in ('individual', 'team')),
  team_name          text,
  status             text not null default 'draft' check (status in (
                       'draft', 'submitted', 'awaiting_payment', 'payment_verification', 'phase_1_completed',
                       'phase_2_in_progress', 'phase_2_submitted', 'phase_3_in_progress', 'phase_3_submitted',
                       'under_evaluation', 'selected_fully_funded', 'selected_partial_funded', 'not_selected',
                       'confirmed_participant', 'withdrawn')),
  payment_status     text not null default 'none' check (payment_status in ('none', 'due', 'pending', 'partially_paid', 'paid', 'refunded')),
  document_status    text not null default 'not_required' check (document_status in ('not_required', 'pending', 'verified', 'needs_attention')),
  outcome            text check (outcome in ('fully_funded', 'partial_funded', 'not_selected')),
  outcome_published_at timestamptz,
  offer_accepted_at  timestamptz,
  project_title      text,
  project_idea       text,
  experience         text,
  motivation         text,
  discovery_source   text,
  draft              jsonb not null default '{}'::jsonb,  -- unsaved wizard state while status = 'draft'
  submitted_at       timestamptz,
  withdrawn_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (mode = 'individual' or (team_name is not null and length(trim(team_name)) > 0) or status = 'draft')
);
-- One application per account per cohort (as leader); withdrawn ones don't block a fresh start.
create unique index applications_one_per_owner on gif.applications (cohort_id, owner_account_id) where status <> 'withdrawn';
create index applications_status on gif.applications (cohort_id, status);
create index applications_pathway on gif.applications (cohort_id, pathway);

create table gif.participants (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references gif.applications(id) on delete cascade,
  cohort_id          text not null references gif.cohorts(id),
  account_id         uuid references gif.accounts(id),
  role               text not null check (role in ('leader', 'member')),
  email              text not null check (email = lower(email)),
  legal_name         text not null,
  whatsapp           text not null,
  nationality        text not null check (nationality ~ '^[A-Z]{2}$'),
  residence_country  text not null check (residence_country ~ '^[A-Z]{2}$'),
  date_of_birth      date not null,
  institution        text not null,
  education_level    text not null check (education_level in ('high_school', 'undergraduate', 'college')),
  academic_background text not null,
  country_of_study   text not null check (country_of_study ~ '^[A-Z]{2}$'),
  emergency_name     text not null,
  emergency_relation text not null,
  emergency_phone    text not null,
  currency           text not null check (currency in ('IDR', 'USD')),
  seat_status        text not null default 'none' check (seat_status in ('none', 'confirmed', 'withdrawn')),
  seat_confirmed_at  timestamptz,
  withdrawn_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- A person (by email) can be in only one active application per cohort: no duplicate applications across teams.
create unique index participants_one_per_email on gif.participants (cohort_id, email) where withdrawn_at is null;
create unique index participants_one_leader on gif.participants (application_id) where role = 'leader';
create index participants_account on gif.participants (account_id);

-- ── Payments ─────────────────────────────────────────────────────────────────────────────────────────────────────────
create table gif.obligations (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references gif.applications(id) on delete cascade,
  participant_id uuid not null references gif.participants(id) on delete cascade,
  kind           text not null check (kind in ('elco_pro', 'mentoring', 'deposit', 'balance', 'full', 'other')),
  label          text not null,
  currency       text not null check (currency in ('IDR', 'USD')),
  amount         numeric(14, 2) not null check (amount > 0),
  due_at         timestamptz,
  status         text not null default 'open' check (status in ('open', 'paid', 'waived', 'cancelled', 'refunded', 'partially_refunded')),
  paid_at        timestamptz,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
-- No duplicate payment obligations: one live obligation of each kind per participant ('other' is free-form, admin only).
create unique index obligations_one_per_kind on gif.obligations (participant_id, kind) where status <> 'cancelled' and kind <> 'other';
create index obligations_application on gif.obligations (application_id);

create table gif.payments (
  id              uuid primary key default gen_random_uuid(),
  obligation_id   uuid not null references gif.obligations(id),
  application_id  uuid not null references gif.applications(id),
  participant_id  uuid not null references gif.participants(id),
  kind            text not null,
  gateway         text not null check (gateway in ('midtrans', 'manual')),
  order_id        text not null unique,
  gateway_txn_id  text,
  amount          numeric(14, 2) not null check (amount > 0),
  currency        text not null check (currency in ('IDR', 'USD')),
  status          text not null default 'created' check (status in ('created', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refunded', 'partially_refunded')),
  payment_type    text,
  checkout_url    text,
  checkout_expires_at timestamptz,
  is_duplicate    boolean not null default false,  -- paid after the obligation was already settled: needs a refund
  receipt_no      text unique,
  manual_reference text,
  paid_at         timestamptz,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- At most one non-duplicate settled payment per obligation.
create unique index payments_one_settled on gif.payments (obligation_id) where status = 'paid' and not is_duplicate;
create index payments_status on gif.payments (status, created_at desc);
create index payments_application on gif.payments (application_id);

create table gif.payment_events (
  id                 bigint generated always as identity primary key,
  payment_id         uuid references gif.payments(id),
  order_id           text not null,
  source             text not null check (source in ('webhook', 'status_check', 'admin')),
  transaction_status text,
  fraud_status       text,
  status_code        text,
  gross_amount       text,
  signature_ok       boolean,
  dedupe_key         text not null unique,
  payload            jsonb not null default '{}'::jsonb,
  received_at        timestamptz not null default now()
);
create index payment_events_order on gif.payment_events (order_id);

create table gif.refunds (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references gif.payments(id),
  amount       numeric(14, 2) not null check (amount > 0),
  currency     text not null,
  reason       text not null,
  method       text not null check (method in ('gateway', 'manual')),
  status       text not null default 'requested' check (status in ('requested', 'processing', 'succeeded', 'failed')),
  refund_key   text not null unique,
  gateway_response jsonb,
  requested_by text not null,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

create table gif.elco_fulfilments (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references gif.participants(id) on delete cascade,
  obligation_id  uuid not null unique references gif.obligations(id) on delete cascade,
  elco_email     text not null,
  status         text not null default 'awaiting_payment' check (status in ('awaiting_payment', 'pending_activation', 'activated', 'failed', 'revoked')),
  months         int not null default 3,
  elco_reference text,
  activated_by   text,
  activated_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table gif.cashbacks (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references gif.participants(id) on delete cascade,
  outcome        text not null check (outcome in ('fully_funded', 'partial_funded')),
  currency       text not null,
  amount         numeric(14, 2) not null,
  status         text not null default 'pending_verification' check (status in ('pending_verification', 'approved', 'paid', 'rejected')),
  reference      text,
  updated_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Documents, submissions, evaluation ───────────────────────────────────────────────────────────────────────────────
create table gif.documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references gif.applications(id) on delete cascade,
  participant_id uuid references gif.participants(id) on delete set null,
  kind           text not null check (kind in ('passport', 'student_id', 'phase2_essay', 'phase2_deck', 'phase3_video', 'payment_proof', 'onboarding', 'other')),
  storage_key    text not null unique,
  filename       text not null,
  mime           text not null,
  size_bytes     bigint not null check (size_bytes > 0),
  status         text not null default 'pending_upload' check (status in ('pending_upload', 'uploaded', 'verified', 'rejected', 'deleted')),
  review_note    text,
  uploaded_by    uuid references gif.accounts(id),
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index documents_application on gif.documents (application_id);

create table gif.submissions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references gif.applications(id) on delete cascade,
  phase          int not null check (phase in (2, 3)),
  essay_text     text,
  essay_doc_id   uuid references gif.documents(id),
  deck_doc_id    uuid references gif.documents(id),
  video_url      text,
  video_doc_id   uuid references gif.documents(id),
  notes          text,
  submitted_at   timestamptz,
  updated_at     timestamptz not null default now(),
  unique (application_id, phase)
);

create table gif.evaluator_assignments (
  application_id   uuid not null references gif.applications(id) on delete cascade,
  evaluator_email  text not null references gif.staff(email),
  assigned_by      text,
  assigned_at      timestamptz not null default now(),
  primary key (application_id, evaluator_email)
);

create table gif.evaluations (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references gif.applications(id) on delete cascade,
  evaluator_email text not null,
  scores          jsonb not null,           -- the seven criteria, 1–10 each
  total           numeric(6, 2) not null,
  feedback        text,
  submitted_at    timestamptz not null default now(),
  unique (application_id, evaluator_email)
);

create table gif.status_history (
  id             bigint generated always as identity primary key,
  application_id uuid not null references gif.applications(id) on delete cascade,
  from_status    text,
  to_status      text not null,
  actor          text not null,
  note           text,
  at             timestamptz not null default now()
);
create index status_history_app on gif.status_history (application_id, at);

create table gif.notes (
  id             bigint generated always as identity primary key,
  application_id uuid not null references gif.applications(id) on delete cascade,
  author         text not null,
  body           text not null,
  at             timestamptz not null default now()
);

-- ── Content, announcements, consent, audit, email, sponsorship, analytics ────────────────────────────────────────────
create table gif.content (
  cohort_id  text not null references gif.cohorts(id),
  key        text not null check (key in ('faq', 'mentors', 'testimonials', 'photos', 'programme')),
  value      jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (cohort_id, key)
);

create table gif.announcements (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    text not null references gif.cohorts(id),
  title        text not null,
  body         text not null,
  audience     text not null default 'all' check (audience in ('all', 'fully_funded', 'mentoring', 'self_funded', 'selected', 'confirmed')),
  published_at timestamptz,
  created_by   text not null,
  created_at   timestamptz not null default now()
);

create table gif.consents (
  id              bigint generated always as identity primary key,
  account_id      uuid not null references gif.accounts(id),
  participant_id  uuid references gif.participants(id) on delete set null,
  application_id  uuid references gif.applications(id) on delete set null,
  category        text not null check (category in ('terms', 'privacy', 'payment', 'refund', 'selection', 'mentoring', 'conduct', 'travel', 'media', 'analytics')),
  document_version text not null,
  accepted        boolean not null,
  ip              text,
  user_agent      text,
  at              timestamptz not null default now()
);
create index consents_account on gif.consents (account_id, category, at desc);

create table gif.audit_log (
  id          bigint generated always as identity primary key,
  actor       text not null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  data        jsonb not null default '{}'::jsonb,
  ip          text,
  at          timestamptz not null default now()
);
create index audit_entity on gif.audit_log (entity, entity_id);
create index audit_at on gif.audit_log (at desc);

create table gif.email_outbox (
  id             uuid primary key default gen_random_uuid(),
  dedupe_key     text unique,
  to_email       text not null,
  template       text not null,
  subject        text not null,
  html           text not null,
  text_body      text not null,
  status         text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'logged')),
  provider_id    text,
  error          text,
  attempts       int not null default 0,
  application_id uuid references gif.applications(id) on delete set null,
  created_at     timestamptz not null default now(),
  sent_at        timestamptz
);
create index email_outbox_status on gif.email_outbox (status, created_at);

create table gif.sponsorship_requests (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       text not null references gif.cohorts(id),
  name            text not null,
  email           text not null,
  whatsapp        text not null,
  institution     text not null,
  country         text not null,
  applicant_type  text not null check (applicant_type in ('individual', 'team')),
  amount          numeric(14, 2),
  currency        text check (currency in ('IDR', 'USD')),
  sponsorship_type text not null,
  notes           text,
  status          text not null default 'new' check (status in ('new', 'in_progress', 'documents_sent', 'closed')),
  created_at      timestamptz not null default now()
);

-- Privacy-conscious analytics: no IP, no account or email. Browser events only after analytics consent and keyed by a
-- random per-browser id; server-side funnel events carry no identifier at all.
create table gif.analytics_events (
  id         bigint generated always as identity primary key,
  cohort_id  text not null,
  event      text not null check (event ~ '^[a-z_]{2,40}$'),
  session_id text,
  path       text,
  pathway    text,
  country    text,
  props      jsonb not null default '{}'::jsonb,
  at         timestamptz not null default now()
);
create index analytics_event_at on gif.analytics_events (cohort_id, event, at);

-- ── Lock it down ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'gif' loop
    execute format('alter table gif.%I enable row level security', t.tablename);
    execute format('revoke all on gif.%I from public', t.tablename);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on gif.%I from anon', t.tablename); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on gif.%I from authenticated', t.tablename); end if;
  end loop;
end $$;

-- Private Storage bucket for application documents (no public URLs; the app issues short-lived signed URLs).
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('gif-applications', 'gif-applications', false, 104857600,
            array['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
    on conflict (id) do nothing;
  end if;
end $$;

-- Seed the founder as owner (the address on the IELSco Supabase admin account; change in Admin → Staff).
insert into gif.staff (email, role, name, created_by) values ('arbadzarido03@gmail.com', 'owner', 'Arbadza Rido Adzariyat', 'migration')
on conflict (email) do nothing;
