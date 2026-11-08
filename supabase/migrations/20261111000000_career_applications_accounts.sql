-- Careers 2027: applications tied to an IELSco account (Elco-Pass), 1–2 role preferences, saved drafts, declarations
-- with timestamps and per-task Instagram campaign verification (idempotent, additive on top of 20261101000000).
--
-- Access model:
--   * Applicants sign in first (no anonymous applications any more). A signed-in applicant:
--       - keeps one draft row in public.career_application_drafts (own row only, RLS);
--       - uploads PDFs to the private bucket career-applications under applicants/<their user id>/ (own folder only,
--         while applications are open) and can read back only their own files;
--       - submits or updates through public.submit_my_career_application() (security definer: validates everything,
--         takes the email from the account, checks the files exist, one application per account per cohort; an
--         application can be changed while it is still 'submitted' and the window is open);
--       - reads their application and its status through public.my_career_application() (no admin notes). It also
--         attaches an application sent earlier without an account to the account with the same confirmed email.
--   * Staff (public.is_site_admin()) read and update rows (status, campaign verification per task, notes) in Dashboard →
--     Admin → Operations → Applications, as before. No service-role key anywhere.
--   * Instagram campaign tasks are checked by hand on Instagram; no screenshots, no automated checks.

-- ── Columns ────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.career_applications add column if not exists role_2_id text;
alter table public.career_applications add column if not exists batch_year smallint;
alter table public.career_applications add column if not exists campaign_tasks jsonb not null default '{}'::jsonb;
alter table public.career_applications add column if not exists tasks_confirmed_at timestamptz;
alter table public.career_applications add column if not exists privacy_accepted_at timestamptz;
alter table public.career_applications add column if not exists declaration_accepted_at timestamptz;
alter table public.career_applications add column if not exists submitted_at timestamptz;
update public.career_applications set submitted_at = created_at where submitted_at is null;
alter table public.career_applications alter column submitted_at set default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'career_applications_role_2') then
    alter table public.career_applications add constraint career_applications_role_2
      check (role_2_id is null or (role_2_id ~ '^[A-Z][0-9]$' and role_2_id is distinct from role_id));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'career_applications_batch_year') then
    alter table public.career_applications add constraint career_applications_batch_year
      check (batch_year is null or batch_year between 2015 and 2030);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'career_applications_campaign_tasks') then
    alter table public.career_applications add constraint career_applications_campaign_tasks
      check (jsonb_typeof(campaign_tasks) = 'object' and pg_column_size(campaign_tasks) < 4000);
  end if;
end $$;

-- One application per account per cohort (the email rule from 20261101000000 still applies too).
create unique index if not exists career_applications_cohort_user on public.career_applications (cohort, user_id) where user_id is not null;

-- Staff may also record the per-task verification.
grant update (campaign_tasks) on public.career_applications to authenticated;

-- ── Drafts (saved progress) ────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.career_application_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cohort text not null default '2027',
  step smallint not null default 0 check (step between 0 and 10),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 16000),
  updated_at timestamptz not null default now()
);
alter table public.career_application_drafts enable row level security;
revoke all on public.career_application_drafts from anon, authenticated;
grant select, insert, update, delete on public.career_application_drafts to authenticated;
drop policy if exists career_application_drafts_own on public.career_application_drafts;
create policy career_application_drafts_own on public.career_application_drafts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists career_application_drafts_touch on public.career_application_drafts;
create trigger career_application_drafts_touch before update on public.career_application_drafts
  for each row execute function public.career_applications_touch();

-- ── Roles (17) → division. Keep in step with src/data/careers/divisions.ts. ────────────────────────────────────
create or replace function public.career_role_division(p_role text) returns text
language sql immutable set search_path = '' as $$
  select case p_role
    when 'G1' then 'growth' when 'G2' then 'growth' when 'G3' then 'growth' when 'G4' then 'growth'
    when 'K1' then 'creative' when 'K2' then 'creative'
    when 'C1' then 'community' when 'C2' then 'community'
    when 'L1' then 'learning' when 'L2' then 'learning'
    when 'R1' then 'partnerships' when 'R2' then 'partnerships' when 'R3' then 'partnerships'
    when 'O1' then 'operations' when 'O2' then 'operations'
    when 'P1' then 'people' when 'P2' then 'people'
  end
$$;
revoke all on function public.career_role_division(text) from public, anon;
grant execute on function public.career_role_division(text) to authenticated;

-- ── The applicant's own application (safe fields only) ─────────────────────────────────────────────────────────
create or replace function public.my_career_application() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_row public.career_applications;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  -- An application sent before accounts were required: attach it to the account with the same confirmed email.
  if v_email is not null and not exists (select 1 from public.career_applications a where a.cohort = '2027' and a.user_id = v_uid) then
    update public.career_applications a set user_id = v_uid
      where a.cohort = '2027' and a.user_id is null and lower(a.email) = v_email;
  end if;
  select * into v_row from public.career_applications a where a.cohort = '2027' and a.user_id = v_uid;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_row.id, 'cohort', v_row.cohort, 'full_name', v_row.full_name, 'email', v_row.email, 'whatsapp', v_row.whatsapp,
    'university', v_row.university, 'academic_year', v_row.academic_year, 'batch_year', v_row.batch_year,
    'division', v_row.division, 'role_id', v_row.role_id, 'role_2_id', v_row.role_2_id,
    'instagram_url', v_row.instagram_url, 'linkedin_url', v_row.linkedin_url, 'cv_path', v_row.cv_path,
    'portfolio_path', v_row.portfolio_path, 'portfolio_url', v_row.portfolio_url, 'motivation', v_row.motivation,
    'status', v_row.status, 'campaign_verification', v_row.campaign_verification, 'campaign_tasks', v_row.campaign_tasks,
    'tasks_confirmed_at', v_row.tasks_confirmed_at, 'privacy_accepted_at', v_row.privacy_accepted_at,
    'declaration_accepted_at', v_row.declaration_accepted_at, 'submitted_at', v_row.submitted_at, 'updated_at', v_row.updated_at,
    'editable', v_row.status = 'submitted' and public.career_applications_open());
end $$;
revoke all on function public.my_career_application() from public, anon;
grant execute on function public.my_career_application() to authenticated;

-- ── Submit or update (signed-in applicants) ────────────────────────────────────────────────────────────────────
create or replace function public.submit_my_career_application(
  p_full_name text, p_whatsapp text, p_university text, p_academic_year int, p_batch_year int,
  p_role_id text, p_role_2_id text, p_instagram text, p_linkedin_url text, p_cv_path text, p_portfolio_path text,
  p_portfolio_url text, p_motivation text, p_tasks_confirmed boolean, p_privacy_accepted boolean, p_declaration_accepted boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_existing public.career_applications;
  v_id uuid;
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '[\s().-]', '', 'g');
  v_ig text := trim(coalesce(p_instagram, ''));
  v_handle text;
  v_li text := trim(coalesce(p_linkedin_url, ''));
  v_role text := nullif(trim(coalesce(p_role_id, '')), '');
  v_role2 text := nullif(trim(coalesce(p_role_2_id, '')), '');
  v_cv text := nullif(trim(coalesce(p_cv_path, '')), '');
  v_pf_path text := nullif(trim(coalesce(p_portfolio_path, '')), '');
  v_pf_url text := nullif(trim(coalesce(p_portfolio_url, '')), '');
  v_motivation text := trim(coalesce(p_motivation, ''));
  v_own text;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  if not public.career_applications_open() then raise exception 'applications_closed' using errcode = 'P0001'; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid: email' using errcode = '22023'; end if;
  v_own := '^applicants/' || v_uid::text || '/';
  select * into v_existing from public.career_applications a where a.cohort = '2027' and a.user_id = v_uid for update;
  if found and v_existing.status <> 'submitted' then raise exception 'locked' using errcode = 'P0001'; end if;

  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 120 then raise exception 'invalid: full_name' using errcode = '22023'; end if;
  if v_phone ~ '^0' then v_phone := '+62' || substr(v_phone, 2); end if;
  if v_phone !~ '^\+?[0-9]{8,16}$' then raise exception 'invalid: whatsapp' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_university, ''))) not between 2 and 200 then raise exception 'invalid: university' using errcode = '22023'; end if;
  if p_academic_year is null or p_academic_year not between 1 and 3 then raise exception 'invalid: academic_year' using errcode = '22023'; end if;
  if p_batch_year is not null and p_batch_year not between 2015 and 2030 then raise exception 'invalid: batch_year' using errcode = '22023'; end if;
  if v_role is null or public.career_role_division(v_role) is null then raise exception 'invalid: role' using errcode = '22023'; end if;
  if v_role2 is not null and (public.career_role_division(v_role2) is null or v_role2 = v_role) then raise exception 'invalid: role_2' using errcode = '22023'; end if;
  v_handle := substring(v_ig from '^(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9_.]{1,30})/?(?:\?.*)?$');
  if v_handle is null then v_handle := substring(v_ig from '^@?([A-Za-z0-9_.]{1,30})$'); end if;
  if v_handle is null or v_handle in ('p', 'reel', 'reels', 'stories', 'explore') then raise exception 'invalid: instagram' using errcode = '22023'; end if;
  v_li := substring(v_li from '^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/([^/?#\s]{2,100})/?(?:[?#].*)?$');
  if v_li is null then raise exception 'invalid: linkedin_url' using errcode = '22023'; end if;
  v_li := 'https://www.linkedin.com/in/' || v_li || '/';
  if char_length(v_motivation) not between 20 and 1000 then raise exception 'invalid: motivation' using errcode = '22023'; end if;
  -- Files: in the applicant's own folder, or the file already on their application (kept on an update).
  if v_cv is null or not (v_cv ~ (v_own || 'cv-[A-Za-z0-9]{8,64}\.pdf$') or coalesce(v_cv = v_existing.cv_path, false)) then
    raise exception 'invalid: cv' using errcode = '22023';
  end if;
  if v_pf_path is not null and not (v_pf_path ~ (v_own || 'portfolio-[A-Za-z0-9]{8,64}\.pdf$') or coalesce(v_pf_path = v_existing.portfolio_path, false)) then
    raise exception 'invalid: portfolio' using errcode = '22023';
  end if;
  if v_pf_url is not null and (v_pf_url !~* '^https://\S+\.\S+$' or char_length(v_pf_url) > 500) then raise exception 'invalid: portfolio_url' using errcode = '22023'; end if;
  if v_pf_path is null and v_pf_url is null then raise exception 'invalid: portfolio' using errcode = '22023'; end if;
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects o where o.bucket_id = 'career-applications' and o.name = v_cv) then
      raise exception 'invalid: cv_missing' using errcode = '22023';
    end if;
    if v_pf_path is not null and not exists (select 1 from storage.objects o where o.bucket_id = 'career-applications' and o.name = v_pf_path) then
      raise exception 'invalid: portfolio_missing' using errcode = '22023';
    end if;
  end if;
  if coalesce(p_tasks_confirmed, false) is not true then raise exception 'invalid: tasks' using errcode = '22023'; end if;
  if coalesce(p_privacy_accepted, false) is not true then raise exception 'invalid: privacy' using errcode = '22023'; end if;
  if coalesce(p_declaration_accepted, false) is not true then raise exception 'invalid: declaration' using errcode = '22023'; end if;

  if v_existing.id is not null then
    update public.career_applications a set
      full_name = trim(p_full_name), email = v_email, whatsapp = v_phone, university = trim(p_university),
      academic_year = p_academic_year, batch_year = p_batch_year, division = public.career_role_division(v_role),
      role_id = v_role, role_2_id = v_role2, instagram_url = 'https://www.instagram.com/' || v_handle || '/', linkedin_url = v_li,
      cv_path = v_cv, portfolio_path = v_pf_path, portfolio_url = v_pf_url, motivation = v_motivation,
      tasks_confirmed_at = now(), privacy_accepted_at = now(), declaration_accepted_at = now()
    where a.id = v_existing.id;
    v_id := v_existing.id;
  else
    if exists (select 1 from public.career_applications a where a.cohort = '2027' and lower(a.email) = v_email) then
      raise exception 'already_applied' using errcode = 'P0001';
    end if;
    if (select count(*) from public.career_applications a where a.created_at > now() - interval '1 hour') >= 300 then
      raise exception 'too_many' using errcode = '54000';
    end if;
    v_id := gen_random_uuid();
    insert into public.career_applications (id, cohort, full_name, email, whatsapp, university, academic_year, batch_year,
      division, role_id, role_2_id, instagram_url, linkedin_url, cv_path, portfolio_path, portfolio_url, motivation, user_id,
      status, campaign_verification, tasks_confirmed_at, privacy_accepted_at, declaration_accepted_at, submitted_at)
    values (v_id, '2027', trim(p_full_name), v_email, v_phone, trim(p_university), p_academic_year, p_batch_year,
      public.career_role_division(v_role), v_role, v_role2, 'https://www.instagram.com/' || v_handle || '/', v_li, v_cv, v_pf_path,
      v_pf_url, v_motivation, v_uid, 'submitted', 'pending', now(), now(), now(), now());
  end if;
  delete from public.career_application_drafts d where d.user_id = v_uid;
  return v_id;
exception when unique_violation then
  raise exception 'already_applied' using errcode = 'P0001';
end $$;
revoke all on function public.submit_my_career_application(text, text, text, int, int, text, text, text, text, text, text, text, text, boolean, boolean, boolean) from public, anon;
grant execute on function public.submit_my_career_application(text, text, text, int, int, text, text, text, text, text, text, text, text, boolean, boolean, boolean) to authenticated;

-- The anonymous form is retired: applications now need an account.
revoke execute on function public.submit_career_application(uuid, text, text, text, text, int, text, text, text, text, text, text, text, text) from anon, authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found; skipping the career-applications applicant policies';
    return;
  end if;

  drop policy if exists "career_applications_upload" on storage.objects;
  drop policy if exists "career_applications_applicant_upload" on storage.objects;
  drop policy if exists "career_applications_applicant_read" on storage.objects;

  -- Signed-in applicants add PDFs to their own folder while applications are open. Names are random; no replacing.
  execute $p$create policy "career_applications_applicant_upload" on storage.objects for insert to authenticated with check (
    bucket_id = 'career-applications'
    and name ~ '^applicants/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(cv|portfolio)-[A-Za-z0-9]{8,64}\.pdf$'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.career_applications_open())$p$;
  -- …and can open only their own files again (to check what they uploaded).
  execute $p$create policy "career_applications_applicant_read" on storage.objects for select to authenticated using (
    bucket_id = 'career-applications'
    and (storage.foldername(name))[1] = 'applicants'
    and (storage.foldername(name))[2] = (select auth.uid())::text)$p$;
end $$;
