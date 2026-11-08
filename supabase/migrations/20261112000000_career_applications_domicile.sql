-- Careers 2027: applicant domicile (country + city, required on new submissions) and a portfolio that is required only
-- when one of the chosen roles is in the Creative division (K1 Graphic Designer, K2 Video Designer). Idempotent.
-- No full address is ever collected.

alter table public.career_applications add column if not exists domicile_country text;
alter table public.career_applications add column if not exists domicile_city text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'career_applications_domicile') then
    alter table public.career_applications add constraint career_applications_domicile check (
      (domicile_country is null or domicile_country ~ '^[A-Z]{2}$')
      and (domicile_city is null or char_length(domicile_city) between 2 and 100));
  end if;
  -- The portfolio used to be required for everyone; now only for Creative roles.
  if exists (select 1 from pg_constraint where conname = 'career_applications_portfolio') then
    alter table public.career_applications drop constraint career_applications_portfolio;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'career_applications_portfolio_creative') then
    alter table public.career_applications add constraint career_applications_portfolio_creative check (
      portfolio_path is not null or portfolio_url is not null
      or not (coalesce(role_id, '') in ('K1', 'K2') or coalesce(role_2_id, '') in ('K1', 'K2')));
  end if;
end $$;

-- Does this pair of roles need a portfolio? (Shared by the submit function; the form applies the same rule.)
create or replace function public.career_roles_need_portfolio(p_role text, p_role_2 text) returns boolean
language sql immutable set search_path = '' as $$
  select public.career_role_division(p_role) = 'creative' or coalesce(public.career_role_division(p_role_2), '') = 'creative'
$$;
revoke all on function public.career_roles_need_portfolio(text, text) from public, anon;
grant execute on function public.career_roles_need_portfolio(text, text) to authenticated;

-- Submit or update, now with domicile. The 16-argument version from 20261111000000 is dropped so there is exactly one
-- function to call (a page loaded before this release shows "please try again" once and works after a reload).
drop function if exists public.submit_my_career_application(text, text, text, int, int, text, text, text, text, text, text, text, text, boolean, boolean, boolean);
create or replace function public.submit_my_career_application(
  p_full_name text, p_whatsapp text, p_university text, p_academic_year int, p_batch_year int,
  p_role_id text, p_role_2_id text, p_instagram text, p_linkedin_url text, p_cv_path text, p_portfolio_path text,
  p_portfolio_url text, p_motivation text, p_tasks_confirmed boolean, p_privacy_accepted boolean, p_declaration_accepted boolean,
  p_domicile_country text, p_domicile_city text
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
  v_country text := upper(trim(coalesce(p_domicile_country, '')));
  v_city text := regexp_replace(trim(coalesce(p_domicile_city, '')), '\s+', ' ', 'g');
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
  if v_country !~ '^[A-Z]{2}$' then raise exception 'invalid: domicile_country' using errcode = '22023'; end if;
  if char_length(v_city) not between 2 and 100 then raise exception 'invalid: domicile_city' using errcode = '22023'; end if;
  if v_role is null or public.career_role_division(v_role) is null then raise exception 'invalid: role' using errcode = '22023'; end if;
  if v_role2 is not null and (public.career_role_division(v_role2) is null or v_role2 = v_role) then raise exception 'invalid: role_2' using errcode = '22023'; end if;
  v_handle := substring(v_ig from '^(?:https?://)?(?:www\.)?instagram\.com/([A-Za-z0-9_.]{1,30})/?(?:\?.*)?$');
  if v_handle is null then v_handle := substring(v_ig from '^@?([A-Za-z0-9_.]{1,30})$'); end if;
  if v_handle is null or v_handle in ('p', 'reel', 'reels', 'stories', 'explore') then raise exception 'invalid: instagram' using errcode = '22023'; end if;
  v_li := substring(v_li from '^(?:https?://)?(?:[a-z]{2,3}\.)?linkedin\.com/in/([^/?#\s]{2,100})/?(?:[?#].*)?$');
  if v_li is null then raise exception 'invalid: linkedin_url' using errcode = '22023'; end if;
  v_li := 'https://www.linkedin.com/in/' || v_li || '/';
  if char_length(v_motivation) not between 20 and 1000 then raise exception 'invalid: motivation' using errcode = '22023'; end if;
  if v_cv is null or not (v_cv ~ (v_own || 'cv-[A-Za-z0-9]{8,64}\.pdf$') or coalesce(v_cv = v_existing.cv_path, false)) then
    raise exception 'invalid: cv' using errcode = '22023';
  end if;
  if v_pf_path is not null and not (v_pf_path ~ (v_own || 'portfolio-[A-Za-z0-9]{8,64}\.pdf$') or coalesce(v_pf_path = v_existing.portfolio_path, false)) then
    raise exception 'invalid: portfolio' using errcode = '22023';
  end if;
  if v_pf_url is not null and (v_pf_url !~* '^https://\S+\.\S+$' or char_length(v_pf_url) > 500) then raise exception 'invalid: portfolio_url' using errcode = '22023'; end if;
  -- Portfolio: required when a chosen role is in Creative, optional otherwise.
  if v_pf_path is null and v_pf_url is null and public.career_roles_need_portfolio(v_role, v_role2) then
    raise exception 'invalid: portfolio' using errcode = '22023';
  end if;
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
      domicile_country = v_country, domicile_city = v_city,
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
      domicile_country, domicile_city, status, campaign_verification, tasks_confirmed_at, privacy_accepted_at,
      declaration_accepted_at, submitted_at)
    values (v_id, '2027', trim(p_full_name), v_email, v_phone, trim(p_university), p_academic_year, p_batch_year,
      public.career_role_division(v_role), v_role, v_role2, 'https://www.instagram.com/' || v_handle || '/', v_li, v_cv, v_pf_path,
      v_pf_url, v_motivation, v_uid, v_country, v_city, 'submitted', 'pending', now(), now(), now(), now());
  end if;
  delete from public.career_application_drafts d where d.user_id = v_uid;
  return v_id;
exception when unique_violation then
  raise exception 'already_applied' using errcode = 'P0001';
end $$;
revoke all on function public.submit_my_career_application(text, text, text, int, int, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text) from public, anon;
grant execute on function public.submit_my_career_application(text, text, text, int, int, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text, text) to authenticated;

-- The applicant's own application, now with domicile (still no admin notes or evaluations).
create or replace function public.my_career_application() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_row public.career_applications;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '42501'; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is not null and not exists (select 1 from public.career_applications a where a.cohort = '2027' and a.user_id = v_uid) then
    update public.career_applications a set user_id = v_uid
      where a.cohort = '2027' and a.user_id is null and lower(a.email) = v_email;
  end if;
  select * into v_row from public.career_applications a where a.cohort = '2027' and a.user_id = v_uid;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_row.id, 'cohort', v_row.cohort, 'full_name', v_row.full_name, 'email', v_row.email, 'whatsapp', v_row.whatsapp,
    'university', v_row.university, 'academic_year', v_row.academic_year, 'batch_year', v_row.batch_year,
    'domicile_country', v_row.domicile_country, 'domicile_city', v_row.domicile_city,
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
