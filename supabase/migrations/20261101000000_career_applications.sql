-- Careers applications for the IELSco & Elco AI Open Recruitment 2027 (idempotent).
--
-- Access model (same pattern as Member Stories):
--   * Visitors never touch the table. They upload their CV (and optionally a portfolio PDF) to the private bucket
--     career-applications under incoming/<application id>/, then call public.submit_career_application(), which
--     validates everything, checks the files exist, enforces the application window and one application per email per
--     cohort, and stores the row with status 'submitted' and campaign_verification 'pending'.
--   * Staff (public.is_site_admin(), i.e. public.staff_roles admins) read and update rows and read the files in
--     Dashboard → Admin → Operations → Applications. No service-role key is used anywhere.
--   * Instagram campaign tasks are verified by hand on Instagram; no screenshots are collected.

create table if not exists public.career_applications (
  id uuid primary key,
  cohort text not null default '2027',
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  whatsapp text not null check (whatsapp ~ '^\+?[0-9]{8,16}$'),
  university text not null check (char_length(university) between 2 and 200),
  academic_year smallint not null check (academic_year between 1 and 3),
  division text not null check (division in ('community', 'operations', 'growth', 'creative', 'people', 'partnerships', 'learning')),
  role_id text check (role_id ~ '^[A-Z][0-9]$'),
  instagram_url text not null check (instagram_url ~ '^https://www\.instagram\.com/[A-Za-z0-9_.]{1,30}/$'),
  linkedin_url text not null check (linkedin_url ~* '^https://([a-z]{2,3}\.)?linkedin\.com/in/[^/?#\s]{2,100}/?$'),
  cv_path text not null,
  portfolio_path text,
  portfolio_url text check (portfolio_url ~* '^https://\S+$' and char_length(portfolio_url) <= 500),
  motivation text check (char_length(motivation) <= 1000),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'invited', 'shortlisted', 'accepted', 'reserve', 'rejected', 'withdrawn')),
  campaign_verification text not null default 'pending' check (campaign_verification in ('pending', 'verified', 'incomplete')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_applications_portfolio check (portfolio_path is not null or portfolio_url is not null)
);
create unique index if not exists career_applications_cohort_email on public.career_applications (cohort, lower(email));
create index if not exists career_applications_created_idx on public.career_applications (cohort, created_at desc);

alter table public.career_applications enable row level security;
revoke all on public.career_applications from anon, authenticated;
grant select, update (status, campaign_verification, admin_notes, updated_at) on public.career_applications to authenticated;
drop policy if exists career_applications_admin_select on public.career_applications;
create policy career_applications_admin_select on public.career_applications for select to authenticated using ((select public.is_site_admin()));
drop policy if exists career_applications_admin_update on public.career_applications;
create policy career_applications_admin_update on public.career_applications for update to authenticated
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

create or replace function public.career_applications_touch() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists career_applications_touch on public.career_applications;
create trigger career_applications_touch before update on public.career_applications for each row execute function public.career_applications_touch();

-- Application window for the 2027 cohort (WIB). Keep in step with RECRUITMENT in src/data/careers/recruitment.ts.
create or replace function public.career_applications_open() returns boolean
language sql stable set search_path = '' as $$
  select now() between timestamptz '2026-11-09 00:00:00+07' and timestamptz '2026-11-29 23:59:59+07'
$$;
revoke all on function public.career_applications_open() from public;
grant execute on function public.career_applications_open() to anon, authenticated;

-- Used by the upload policy: files can only be added for an application id that has not been submitted yet.
create or replace function public.career_application_exists(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.career_applications a where a.id::text = p_id)
$$;
revoke all on function public.career_application_exists(text) from public;
grant execute on function public.career_application_exists(text) to anon, authenticated;

create or replace function public.submit_career_application(
  p_id uuid, p_full_name text, p_email text, p_whatsapp text, p_university text, p_academic_year int,
  p_division text, p_role_id text, p_instagram text, p_linkedin_url text, p_cv_path text, p_portfolio_path text,
  p_portfolio_url text, p_motivation text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '[\s().-]', '', 'g');
  v_ig text := trim(coalesce(p_instagram, ''));
  v_handle text;
  v_li text := trim(coalesce(p_linkedin_url, ''));
  v_pf_path text := nullif(trim(coalesce(p_portfolio_path, '')), '');
  v_pf_url text := nullif(trim(coalesce(p_portfolio_url, '')), '');
  v_prefix text := 'incoming/' || p_id::text || '/';
begin
  if not public.career_applications_open() then raise exception 'applications_closed' using errcode = 'P0001'; end if;
  if p_id is null then raise exception 'invalid: id' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 120 then raise exception 'invalid: full_name' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'invalid: email' using errcode = '22023'; end if;
  if v_phone ~ '^0' then v_phone := '+62' || substr(v_phone, 2); end if;  -- local Indonesian numbers
  if v_phone !~ '^\+?[0-9]{8,16}$' then raise exception 'invalid: whatsapp' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_university, ''))) not between 2 and 200 then raise exception 'invalid: university' using errcode = '22023'; end if;
  if p_academic_year is null or p_academic_year not between 1 and 3 then raise exception 'invalid: academic_year' using errcode = '22023'; end if;
  -- Instagram: a profile URL or a bare @handle, stored as the canonical profile URL.
  v_handle := substring(v_ig from '^(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9_.]{1,30})/?(?:\?.*)?$');
  if v_handle is null then v_handle := substring(v_ig from '^@?([A-Za-z0-9_.]{1,30})$'); end if;
  if v_handle is null or v_handle in ('p', 'reel', 'reels', 'stories', 'explore') then raise exception 'invalid: instagram' using errcode = '22023'; end if;
  -- LinkedIn: any linkedin.com/in/<profile> URL (www, country subdomain, query string), stored canonically.
  v_li := substring(v_li from '^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/([^/?#\s]{2,100})/?(?:[?#].*)?$');
  if v_li is null then raise exception 'invalid: linkedin_url' using errcode = '22023'; end if;
  v_li := 'https://www.linkedin.com/in/' || v_li || '/';
  if p_cv_path is null or p_cv_path !~ ('^' || v_prefix || 'cv-[A-Za-z0-9]{8,64}\.pdf$') then raise exception 'invalid: cv' using errcode = '22023'; end if;
  if v_pf_path is not null and v_pf_path !~ ('^' || v_prefix || 'portfolio-[A-Za-z0-9]{8,64}\.pdf$') then raise exception 'invalid: portfolio' using errcode = '22023'; end if;
  if v_pf_url is not null and (v_pf_url !~* '^https://\S+\.\S+$' or char_length(v_pf_url) > 500) then raise exception 'invalid: portfolio_url' using errcode = '22023'; end if;
  if v_pf_path is null and v_pf_url is null then raise exception 'invalid: portfolio' using errcode = '22023'; end if;
  if p_division is null or p_division not in ('community', 'operations', 'growth', 'creative', 'people', 'partnerships', 'learning') then
    raise exception 'invalid: division' using errcode = '22023';
  end if;
  if nullif(p_role_id, '') is not null and p_role_id !~ '^[A-Z][0-9]$' then raise exception 'invalid: role' using errcode = '22023'; end if;
  if char_length(coalesce(p_motivation, '')) > 1000 then raise exception 'invalid: motivation' using errcode = '22023'; end if;
  -- The files must really be there (uploaded under this application's folder).
  if to_regclass('storage.objects') is not null then
    if not exists (select 1 from storage.objects o where o.bucket_id = 'career-applications' and o.name = p_cv_path) then
      raise exception 'invalid: cv_missing' using errcode = '22023';
    end if;
    if v_pf_path is not null and not exists (select 1 from storage.objects o where o.bucket_id = 'career-applications' and o.name = v_pf_path) then
      raise exception 'invalid: portfolio_missing' using errcode = '22023';
    end if;
  end if;
  if exists (select 1 from public.career_applications a where a.cohort = '2027' and lower(a.email) = v_email) then
    raise exception 'already_applied' using errcode = 'P0001';
  end if;
  if (select count(*) from public.career_applications a where a.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too_many' using errcode = '54000';
  end if;

  insert into public.career_applications (id, cohort, full_name, email, whatsapp, university, academic_year, division, role_id,
    instagram_url, linkedin_url, cv_path, portfolio_path, portfolio_url, motivation, user_id)
  values (p_id, '2027', trim(p_full_name), v_email, v_phone, trim(p_university), p_academic_year, p_division, nullif(p_role_id, ''),
    'https://www.instagram.com/' || v_handle || '/', v_li, p_cv_path, v_pf_path, v_pf_url, nullif(trim(coalesce(p_motivation, '')), ''),
    (select auth.uid()));
  return p_id;
exception when unique_violation then
  raise exception 'already_applied' using errcode = 'P0001';
end $$;
revoke all on function public.submit_career_application(uuid, text, text, text, text, int, text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_career_application(uuid, text, text, text, text, int, text, text, text, text, text, text, text, text)
  to anon, authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found; skipping the career-applications bucket and policies';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('career-applications', 'career-applications', false, 10485760, array['application/pdf'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "career_applications_upload" on storage.objects;
  drop policy if exists "career_applications_admin_read" on storage.objects;

  -- Visitors may add PDFs to a not-yet-submitted application folder while applications are open; they can never read,
  -- list or replace them.
  execute $p$create policy "career_applications_upload" on storage.objects for insert to anon, authenticated with check (
    bucket_id = 'career-applications'
    and name ~ '^incoming/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(cv|portfolio)-[A-Za-z0-9]{8,64}\.pdf$'
    and public.career_applications_open()
    and not public.career_application_exists((storage.foldername(name))[2]))$p$;
  execute $p$create policy "career_applications_admin_read" on storage.objects for select to authenticated
    using (bucket_id = 'career-applications' and (select public.is_site_admin()))$p$;
end $$;
