-- Professional (international employment) opportunities, their recruitment partners, and expressions of interest
-- (idempotent).
--
-- Positioning: IELSco publishes information about overseas jobs and passes on expressions of interest. It does not
-- recruit, employ, place workers or issue permits; each listing names the authorised recruitment partner that does.
--
-- Access model (same pattern as career_applications):
--   * public.recruitment_partners and public.professional_opportunities: anyone reads active partners and published
--     listings; staff (public.is_site_admin()) manage everything.
--   * public.opportunity_interests: visitors never touch the table. An optional CV PDF goes to the private bucket
--     opportunity-interest-cvs under incoming/<interest id>/; public.submit_opportunity_interest() validates the form,
--     checks the listing is published and not closed, refuses a second submission per email per listing and stores the
--     row. Staff read and update rows (and read the CVs) in Dashboard → Admin → Operations → Work abroad.
--   * No passport, ID or other identity documents are collected at this stage.

-- ── Recruitment partners ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.recruitment_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 160),
  short_name text check (char_length(short_name) <= 40),
  website_url text check (website_url ~* '^https://\S+$' and char_length(website_url) <= 300),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp ~ '^\+[0-9]{8,16}$'),
  phone text check (char_length(phone) <= 80),
  about text check (char_length(about) <= 1500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.recruitment_partners enable row level security;
revoke all on public.recruitment_partners from anon, authenticated;
grant select on public.recruitment_partners to anon;
grant select, insert, update, delete on public.recruitment_partners to authenticated;
drop policy if exists recruitment_partners_public on public.recruitment_partners;
create policy recruitment_partners_public on public.recruitment_partners for select to anon, authenticated
  using (active or (select public.is_site_admin()));
drop policy if exists recruitment_partners_admin on public.recruitment_partners;
create policy recruitment_partners_admin on public.recruitment_partners for all to authenticated
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

-- ── Listings ────────────────────────────────────────────────────────────────────────────────────────────────────
-- Country, industry and partner are plain data: a new country or industry needs a row, not a code change.
-- salary_status: 'stated' = the partner's material gives one figure; 'to_confirm' = sources disagree or the figure
-- needs the partner's confirmation (explained in salary_note); 'not_stated' = no figure published.
create table if not exists public.professional_opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(title) between 3 and 120),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 80),
  industry text not null check (char_length(industry) between 2 and 60),
  positions text[] not null default '{}',
  employment_type text not null default 'contract'
    check (employment_type in ('full_time', 'contract', 'part_time', 'seasonal', 'internship', 'other')),
  summary text not null check (char_length(summary) between 10 and 400),
  description text check (char_length(description) <= 4000),
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  gender text not null default 'any' check (gender in ('any', 'female', 'male')),
  age_min smallint check (age_min between 15 and 80),
  age_max smallint check (age_max between 15 and 80),
  experience text check (char_length(experience) <= 400),
  salary_min numeric(12, 2) check (salary_min >= 0),
  salary_max numeric(12, 2) check (salary_max >= 0),
  salary_currency text check (salary_currency ~ '^[A-Z]{3}$'),
  salary_period text not null default 'month' check (salary_period in ('hour', 'day', 'week', 'month', 'year')),
  salary_status text not null default 'stated' check (salary_status in ('stated', 'to_confirm', 'not_stated')),
  salary_note text check (char_length(salary_note) <= 600),
  benefits text[] not null default '{}',
  working_hours text check (char_length(working_hours) <= 160),
  contract_duration text check (char_length(contract_duration) <= 160),
  openings integer check (openings > 0),
  location_note text check (char_length(location_note) <= 1000),
  documents text[] not null default '{}',
  confirm_notes text[] not null default '{}',
  partner_id uuid not null references public.recruitment_partners(id),
  application_url text check (application_url ~* '^https://\S+$' and char_length(application_url) <= 300),
  application_instructions text check (char_length(application_instructions) <= 800),
  status text not null default 'open' check (status in ('open', 'closed', 'coming_soon')),
  publication text not null default 'draft' check (publication in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  source_note text check (char_length(source_note) <= 600),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_opportunities_age check (age_min is null or age_max is null or age_min <= age_max),
  constraint professional_opportunities_salary check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint professional_opportunities_currency check ((salary_min is null and salary_max is null) or salary_currency is not null)
);
create index if not exists professional_opportunities_published_idx on public.professional_opportunities (publication, country_code, industry);
alter table public.professional_opportunities enable row level security;
revoke all on public.professional_opportunities from anon, authenticated;
grant select on public.professional_opportunities to anon;
grant select, insert, update, delete on public.professional_opportunities to authenticated;
drop policy if exists professional_opportunities_public on public.professional_opportunities;
create policy professional_opportunities_public on public.professional_opportunities for select to anon, authenticated
  using (publication = 'published' or (select public.is_site_admin()));
drop policy if exists professional_opportunities_admin on public.professional_opportunities;
create policy professional_opportunities_admin on public.professional_opportunities for all to authenticated
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));

create or replace function public.professional_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  -- Nested: plpgsql doesn't short-circuit `and`, and the other tables have no publication column.
  if tg_table_name = 'professional_opportunities' then
    if new.publication = 'published' and new.published_at is null then new.published_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists recruitment_partners_touch on public.recruitment_partners;
create trigger recruitment_partners_touch before update on public.recruitment_partners for each row execute function public.professional_touch();
drop trigger if exists professional_opportunities_touch on public.professional_opportunities;
create trigger professional_opportunities_touch before insert or update on public.professional_opportunities for each row execute function public.professional_touch();

-- ── Expressions of interest ─────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.opportunity_interests (
  id uuid primary key,
  opportunity_id uuid not null references public.professional_opportunities(id) on delete cascade,
  partner_id uuid references public.recruitment_partners(id) on delete set null,
  opportunity_title text not null,
  country_code text not null,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  whatsapp text not null check (whatsapp ~ '^\+?[0-9]{8,16}$'),
  country_of_interest text not null check (char_length(country_of_interest) between 2 and 80),
  position text not null check (char_length(position) between 2 and 120),
  statement text not null check (char_length(statement) between 20 and 1500),
  occupation text check (char_length(occupation) <= 160),
  experience text check (char_length(experience) <= 1500),
  linkedin_url text check (linkedin_url ~* '^https://\S+$' and char_length(linkedin_url) <= 300),
  cv_path text,
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp', 'email')),
  consent_version text not null,
  consent_at timestamptz not null default now(),
  source text not null default 'public' check (source in ('public', 'dashboard')),
  status text not null default 'new' check (status in ('new', 'forwarded', 'contacted', 'closed')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists opportunity_interests_once on public.opportunity_interests (opportunity_id, lower(email));
create index if not exists opportunity_interests_created_idx on public.opportunity_interests (created_at desc);
alter table public.opportunity_interests enable row level security;
revoke all on public.opportunity_interests from anon, authenticated;
grant select, update (status, admin_notes, updated_at) on public.opportunity_interests to authenticated;
drop policy if exists opportunity_interests_admin_select on public.opportunity_interests;
create policy opportunity_interests_admin_select on public.opportunity_interests for select to authenticated using ((select public.is_site_admin()));
drop policy if exists opportunity_interests_admin_update on public.opportunity_interests;
create policy opportunity_interests_admin_update on public.opportunity_interests for update to authenticated
  using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
drop trigger if exists opportunity_interests_touch on public.opportunity_interests;
create trigger opportunity_interests_touch before update on public.opportunity_interests for each row execute function public.professional_touch();

-- Used by the upload policy: a CV can only be added for an interest id that has not been submitted yet.
create or replace function public.opportunity_interest_exists(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.opportunity_interests i where i.id::text = p_id)
$$;
revoke all on function public.opportunity_interest_exists(text) from public;
grant execute on function public.opportunity_interest_exists(text) to anon, authenticated;

-- Returns what the notification email needs (listing title, country, partner) so the API never reads the table.
create or replace function public.submit_opportunity_interest(
  p_id uuid, p_opportunity_id uuid, p_full_name text, p_email text, p_whatsapp text, p_country_of_interest text,
  p_position text, p_statement text, p_occupation text, p_experience text, p_linkedin_url text, p_cv_path text,
  p_preferred_contact text, p_consent boolean, p_consent_version text, p_source text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '[\s().-]', '', 'g');
  v_li text := nullif(trim(coalesce(p_linkedin_url, '')), '');
  v_cv text := nullif(trim(coalesce(p_cv_path, '')), '');
  v_opp record;
begin
  if p_id is null then raise exception 'invalid: id' using errcode = '22023'; end if;
  select o.id, o.title, o.country_code, o.status, o.partner_id, p.name as partner_name
    into v_opp
    from public.professional_opportunities o left join public.recruitment_partners p on p.id = o.partner_id
   where o.id = p_opportunity_id and o.publication = 'published';
  if not found then raise exception 'invalid: opportunity' using errcode = '22023'; end if;
  if v_opp.status = 'closed' then raise exception 'opportunity_closed' using errcode = 'P0001'; end if;
  if p_consent is not true or char_length(coalesce(p_consent_version, '')) not between 4 and 40 then
    raise exception 'invalid: consent' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) not between 2 and 120 then raise exception 'invalid: full_name' using errcode = '22023'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then raise exception 'invalid: email' using errcode = '22023'; end if;
  if v_phone ~ '^0' then v_phone := '+62' || substr(v_phone, 2); end if;  -- local Indonesian numbers
  if v_phone !~ '^\+?[0-9]{8,16}$' then raise exception 'invalid: whatsapp' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_country_of_interest, ''))) not between 2 and 80 then raise exception 'invalid: country' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_position, ''))) not between 2 and 120 then raise exception 'invalid: position' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_statement, ''))) not between 20 and 1500 then raise exception 'invalid: statement' using errcode = '22023'; end if;
  if char_length(coalesce(p_occupation, '')) > 160 then raise exception 'invalid: occupation' using errcode = '22023'; end if;
  if char_length(coalesce(p_experience, '')) > 1500 then raise exception 'invalid: experience' using errcode = '22023'; end if;
  if v_li is not null then
    if v_li !~* '^https?://' then v_li := 'https://' || v_li; end if;
    v_li := regexp_replace(v_li, '^http://', 'https://', 'i');
    if v_li !~* '^https://([a-z]{2,3}\.)?linkedin\.com/\S+$' or char_length(v_li) > 300 then raise exception 'invalid: linkedin_url' using errcode = '22023'; end if;
  end if;
  if coalesce(p_preferred_contact, '') not in ('whatsapp', 'email') then raise exception 'invalid: preferred_contact' using errcode = '22023'; end if;
  if coalesce(p_source, '') not in ('public', 'dashboard') then raise exception 'invalid: source' using errcode = '22023'; end if;
  if v_cv is not null then
    if v_cv !~ ('^incoming/' || p_id::text || '/cv-[A-Za-z0-9]{8,64}\.pdf$') then raise exception 'invalid: cv' using errcode = '22023'; end if;
    if to_regclass('storage.objects') is not null
       and not exists (select 1 from storage.objects o where o.bucket_id = 'opportunity-interest-cvs' and o.name = v_cv) then
      raise exception 'invalid: cv_missing' using errcode = '22023';
    end if;
  end if;
  if exists (select 1 from public.opportunity_interests i where i.opportunity_id = v_opp.id and lower(i.email) = v_email) then
    raise exception 'already_submitted' using errcode = 'P0001';
  end if;
  if (select count(*) from public.opportunity_interests i where lower(i.email) = v_email and i.created_at > now() - interval '1 day') >= 5
     or (select count(*) from public.opportunity_interests i where i.created_at > now() - interval '1 hour') >= 300 then
    raise exception 'too_many' using errcode = '54000';
  end if;

  insert into public.opportunity_interests (id, opportunity_id, partner_id, opportunity_title, country_code, full_name, email,
    whatsapp, country_of_interest, position, statement, occupation, experience, linkedin_url, cv_path, preferred_contact,
    consent_version, source, user_id)
  values (p_id, v_opp.id, v_opp.partner_id, v_opp.title, v_opp.country_code, trim(p_full_name), v_email, v_phone,
    trim(p_country_of_interest), trim(p_position), trim(p_statement), nullif(trim(coalesce(p_occupation, '')), ''),
    nullif(trim(coalesce(p_experience, '')), ''), v_li, v_cv, p_preferred_contact, p_consent_version, p_source, (select auth.uid()));
  return jsonb_build_object('id', p_id, 'title', v_opp.title, 'country_code', v_opp.country_code, 'partner', v_opp.partner_name);
exception when unique_violation then
  raise exception 'already_submitted' using errcode = 'P0001';
end $$;
revoke all on function public.submit_opportunity_interest(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.submit_opportunity_interest(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text)
  to anon, authenticated;

-- ── Storage: optional CV ────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found; skipping the opportunity-interest-cvs bucket and policies';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('opportunity-interest-cvs', 'opportunity-interest-cvs', false, 5242880, array['application/pdf'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "opportunity_interest_cv_upload" on storage.objects;
  drop policy if exists "opportunity_interest_cv_admin_read" on storage.objects;

  -- Visitors may add one PDF to a not-yet-submitted interest folder; they can never read, list or replace it.
  execute $p$create policy "opportunity_interest_cv_upload" on storage.objects for insert to anon, authenticated with check (
    bucket_id = 'opportunity-interest-cvs'
    and name ~ '^incoming/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cv-[A-Za-z0-9]{8,64}\.pdf$'
    and not public.opportunity_interest_exists((storage.foldername(name))[2]))$p$;
  execute $p$create policy "opportunity_interest_cv_admin_read" on storage.objects for select to authenticated
    using (bucket_id = 'opportunity-interest-cvs' and (select public.is_site_admin()))$p$;
end $$;
