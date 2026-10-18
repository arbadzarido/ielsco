-- Member Stories CMS (idempotent). Moves the static stories in src/data/member-stories.ts into the database and adds
-- the review pipeline: public submissions -> pending review -> editor -> explicit Publish.
--
-- Access model
--   * Admins are rows in public.staff_roles (keyed by auth.users.id). Nothing a member can edit (profile fields, user
--     metadata, email) is consulted. Rows are only written by migrations / the service role.
--   * The public reads published stories through the view public.published_member_stories (published, kind = story,
--     public columns only). anon and members have no access to the tables themselves.
--   * Members and visitors submit through public.submit_member_story(), which always stores status 'pending' and
--     creates a pending_review story row. Nothing can publish itself.
--   * Publishing requires kind = 'story', publication_authorized = true and no private (submission://) images left in
--     the record. Editorial placeholders can never be published.
--   * Media: bucket member-story-submissions is private (visitors upload, only admins read); bucket member-stories is
--     public and only admins write to it, so an image becomes public only when an admin approves (copies) it.

-- ── Staff roles ─────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now(),
  note text
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;
drop policy if exists staff_roles_select_own on public.staff_roles;
create policy staff_roles_select_own on public.staff_roles for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_story_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin')
$$;
revoke all on function public.is_story_admin() from public;
grant execute on function public.is_story_admin() to anon, authenticated, service_role;

-- Initial admin: the IELSco owner's account, resolved to its auth user id (verified email only). If the account does
-- not exist yet, nothing is granted; re-running the migration later is harmless.
insert into public.staff_roles (user_id, role, note)
select u.id, 'admin', 'initial Member Stories admin (20261019000000)'
from auth.users u
where lower(u.email) = 'arbadzarido03@gmail.com' and u.email_confirmed_at is not null
on conflict (user_id) do nothing;

-- ── Stories ─────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.member_stories (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  kind text not null default 'story' check (kind in ('story', 'placeholder')),
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'needs_info', 'published', 'rejected', 'archived')),
  -- Legacy slugs came from the old title slugifier (may contain "_" or a trailing "-"), so the format is permissive.
  slug text not null unique check (slug ~ '^[a-z0-9_-]+$' and length(slug) between 1 and 160 and slug not in ('submit', 'opengraph-image')),
  title text not null check (length(title) between 1 and 200),
  summary text,
  category text not null default 'circle' check (category in ('internals', 'circle', 'inspires')),
  legacy_subcategory text,
  story_type text not null default 'other' check (story_type in ('exchange', 'internship', 'study_abroad', 'competition',
    'international_program', 'entrepreneurship', 'career', 'community', 'volunteering', 'travel', 'other')),
  author_name text not null default '',
  author_country text check (author_country ~ '^[A-Z]{2}$'),
  author_location text,
  author_role text,
  author_bio text,
  author_avatar text,
  social jsonb not null default '{}'::jsonb check (jsonb_typeof(social) = 'object'),
  banner_image text,
  legacy_content text,
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  quotes jsonb not null default '[]'::jsonb check (jsonb_typeof(quotes) = 'array'),
  highlights jsonb not null default '[]'::jsonb check (jsonb_typeof(highlights) = 'array'),
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  credits jsonb not null default '{}'::jsonb check (jsonb_typeof(credits) = 'object'),
  seo jsonb not null default '{}'::jsonb check (jsonb_typeof(seo) = 'object'),
  story_date text,
  sort_date date,
  location text,
  publication_authorized boolean not null default false,
  submission_id uuid,
  target_country text check (target_country ~ '^[A-Z]{2}$'),
  editorial_brief jsonb not null default '{}'::jsonb check (jsonb_typeof(editorial_brief) = 'object'),
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  editor_notes text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid,
  constraint member_stories_placeholder_never_public check (kind = 'story' or status in ('draft', 'archived'))
);
create index if not exists member_stories_status_sort_idx on public.member_stories (status, sort_date desc);
create index if not exists member_stories_country_idx on public.member_stories (author_country);
create index if not exists member_stories_category_idx on public.member_stories (category);

create table if not exists public.member_story_redirects (
  old_slug text primary key check (old_slug ~ '^[a-z0-9_-]+$'),
  story_id uuid not null references public.member_stories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Submissions (original answers and AI draft kept separately from the story) ─────────────────────────────────
create table if not exists public.member_story_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'form' check (source in ('form', 'editorial_import')),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'needs_info', 'converted', 'rejected', 'archived', 'withdrawn')),
  name text not null check (length(name) between 1 and 120),
  email text check (email is null or (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  country text check (country ~ '^[A-Z]{2}$'),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  images jsonb not null default '[]'::jsonb check (jsonb_typeof(images) = 'array'),
  consent_review boolean not null default false,
  consent_identity boolean not null default false,
  consent_instagram boolean not null default false,
  consent_at timestamptz,
  ai_status text not null default 'none' check (ai_status in ('none', 'generating', 'ready', 'failed')),
  ai_draft jsonb,
  ai_model text,
  ai_error text,
  ai_generated_at timestamptz,
  story_id uuid references public.member_stories(id) on delete set null,
  editor_notes text,
  -- A form submission is only stored with the member's consent to review it.
  constraint member_story_submissions_form_consent check (source <> 'form' or consent_review)
);
create index if not exists member_story_submissions_status_idx on public.member_story_submissions (status, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'member_stories_submission_fk') then
    alter table public.member_stories add constraint member_stories_submission_fk
      foreign key (submission_id) references public.member_story_submissions(id) on delete set null;
  end if;
end $$;

-- ── Triggers ────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function public.member_stories_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and new.kind is distinct from old.kind then
    raise exception 'a story''s kind cannot be changed' using errcode = '22023';
  end if;
  if new.status = 'published' then
    if new.kind <> 'story' then
      raise exception 'editorial placeholders cannot be published' using errcode = '22023';
    end if;
    if not new.publication_authorized then
      raise exception 'confirm the member''s authorization for public use before publishing' using errcode = '22023';
    end if;
    if length(trim(new.author_name)) = 0 or length(trim(new.title)) = 0 then
      raise exception 'a published story needs a title and an author name' using errcode = '22023';
    end if;
    if concat_ws(' ', new.banner_image, new.author_avatar, new.sections::text, new.gallery::text) like '%submission://%' then
      raise exception 'approve the submitted images (make them public) before publishing' using errcode = '22023';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

drop trigger if exists member_stories_before_write on public.member_stories;
create trigger member_stories_before_write before insert or update on public.member_stories
  for each row execute function public.member_stories_before_write();

-- Old slugs keep working: a slug change records a redirect; a slug may not reuse another story's old slug.
create or replace function public.member_stories_slug_history() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.member_story_redirects r where r.old_slug = new.slug and r.story_id <> new.id) then
    raise exception 'slug "%" is still used as a redirect by another story', new.slug using errcode = '23505';
  end if;
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    delete from public.member_story_redirects where old_slug = new.slug;
    insert into public.member_story_redirects (old_slug, story_id) values (old.slug, new.id)
      on conflict (old_slug) do update set story_id = excluded.story_id;
  end if;
  return new;
end $$;

drop trigger if exists member_stories_slug_history on public.member_stories;
create trigger member_stories_slug_history after insert or update of slug on public.member_stories
  for each row execute function public.member_stories_slug_history();

create or replace function public.member_story_submissions_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists member_story_submissions_touch on public.member_story_submissions;
create trigger member_story_submissions_touch before update on public.member_story_submissions
  for each row execute function public.member_story_submissions_touch();

-- ── RLS: admins only on the tables ──────────────────────────────────────────────────────────────────────────────
alter table public.member_stories enable row level security;
alter table public.member_story_redirects enable row level security;
alter table public.member_story_submissions enable row level security;

revoke all on public.member_stories, public.member_story_redirects, public.member_story_submissions from anon;
revoke all on public.member_stories, public.member_story_redirects, public.member_story_submissions from authenticated;
grant select, insert, update, delete on public.member_stories, public.member_story_redirects, public.member_story_submissions
  to authenticated;

drop policy if exists member_stories_admin_all on public.member_stories;
create policy member_stories_admin_all on public.member_stories for all to authenticated
  using ((select public.is_story_admin())) with check ((select public.is_story_admin()));
drop policy if exists member_story_redirects_admin_all on public.member_story_redirects;
create policy member_story_redirects_admin_all on public.member_story_redirects for all to authenticated
  using ((select public.is_story_admin())) with check ((select public.is_story_admin()));
drop policy if exists member_story_submissions_admin_all on public.member_story_submissions;
create policy member_story_submissions_admin_all on public.member_story_submissions for all to authenticated
  using ((select public.is_story_admin())) with check ((select public.is_story_admin()));

-- ── Public read surface ─────────────────────────────────────────────────────────────────────────────────────────
-- Owned by the migration role, so it reads past RLS but only ever returns published stories and public columns.
create or replace view public.published_member_stories as
  select s.id, s.slug, s.title, s.summary, s.category, s.story_type, s.author_name, s.author_country, s.author_location,
         s.author_role, s.author_bio, s.author_avatar, s.social, s.banner_image, s.legacy_content, s.sections, s.quotes,
         s.highlights, s.gallery, s.credits, s.seo, s.story_date, s.sort_date, s.location, s.published_at, s.updated_at
  from public.member_stories s
  where s.status = 'published' and s.kind = 'story';

create or replace view public.published_member_story_redirects as
  select r.old_slug, s.slug
  from public.member_story_redirects r
  join public.member_stories s on s.id = r.story_id
  where s.status = 'published' and s.kind = 'story';

revoke all on public.published_member_stories, public.published_member_story_redirects from anon, authenticated;
grant select on public.published_member_stories, public.published_member_story_redirects to anon, authenticated, service_role;

-- ── Public submission ───────────────────────────────────────────────────────────────────────────────────────────
-- Called by the questionnaire (visitors and signed-in members). Always stores a pending submission plus a
-- pending_review story stub; returns only the id. Images must already be uploaded to
-- member-story-submissions/incoming/<p_id>/.
create or replace function public.submit_member_story(
  p_id uuid, p_name text, p_email text, p_country text, p_answers jsonb, p_images text[],
  p_consent_review boolean, p_consent_identity boolean, p_consent_instagram boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  img text;
  imgs jsonb := '[]'::jsonb;
  v_name text := trim(coalesce(p_name, ''));
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_country text := upper(nullif(trim(coalesce(p_country, '')), ''));
  v_story uuid := gen_random_uuid();
begin
  if p_id is null then raise exception 'missing submission id' using errcode = '22023'; end if;
  if not coalesce(p_consent_review, false) then
    raise exception 'consent to review your story is required' using errcode = '22023';
  end if;
  if length(v_name) not between 1 and 120 then raise exception 'please enter your name' using errcode = '22023'; end if;
  if v_email is null or length(v_email) > 254 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'please enter a valid email address' using errcode = '22023';
  end if;
  if v_country is null or v_country !~ '^[A-Z]{2}$' then raise exception 'please choose your country' using errcode = '22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or octet_length(p_answers::text) > 60000 then
    raise exception 'answers are missing or too long' using errcode = '22023';
  end if;
  if coalesce(array_length(p_images, 1), 0) > 6 then raise exception 'up to 6 images' using errcode = '22023'; end if;
  foreach img in array coalesce(p_images, '{}'::text[]) loop
    if img !~ ('^incoming/' || p_id::text || '/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$') then
      raise exception 'invalid image reference' using errcode = '22023';
    end if;
    imgs := imgs || jsonb_build_object('path', img, 'bucket', 'member-story-submissions');
  end loop;
  -- Light abuse limits: 3 per email per day, 60 overall per hour.
  if (select count(*) from public.member_story_submissions s where s.email = v_email and s.created_at > now() - interval '1 day') >= 3
     or (select count(*) from public.member_story_submissions s where s.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'too many submissions right now, please try again later' using errcode = '54000';
  end if;

  insert into public.member_story_submissions (id, user_id, source, status, name, email, country, answers, images,
    consent_review, consent_identity, consent_instagram, consent_at)
  values (p_id, auth.uid(), 'form', 'pending', v_name, v_email, v_country, p_answers, imgs,
    true, coalesce(p_consent_identity, false), coalesce(p_consent_instagram, false), now());

  insert into public.member_stories (id, kind, status, slug, title, author_name, author_country, author_location,
    author_role, submission_id, issues, created_by)
  values (v_story, 'story', 'pending_review', 'submission-' || replace(p_id::text, '-', ''),
    left('Story from ' || v_name, 200), v_name, v_country, nullif(left(trim(coalesce(p_answers ->> 'city', '')), 120), ''),
    nullif(left(trim(coalesce(p_answers ->> 'role', '')), 200), ''), p_id,
    case when coalesce(p_consent_identity, false) then '[]'::jsonb
         else '["Member did not consent to publishing their name, role, country and images"]'::jsonb end, auth.uid());
  update public.member_story_submissions set story_id = v_story where id = p_id;
  return p_id;
end $$;
revoke all on function public.submit_member_story(uuid, text, text, text, jsonb, text[], boolean, boolean, boolean) from public;
grant execute on function public.submit_member_story(uuid, text, text, text, jsonb, text[], boolean, boolean, boolean)
  to anon, authenticated;

-- Used by the upload policy: files can only be added for a submission id that has not been submitted yet.
create or replace function public.member_story_submission_exists(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.member_story_submissions s where s.id::text = p_id)
$$;
revoke all on function public.member_story_submission_exists(text) from public;
grant execute on function public.member_story_submission_exists(text) to anon, authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found; skipping member story buckets and policies';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('member-story-submissions', 'member-story-submissions', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
         ('member-stories', 'member-stories', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "member_story_submissions_upload" on storage.objects;
  drop policy if exists "member_story_submissions_admin" on storage.objects;
  drop policy if exists "member_stories_admin_write" on storage.objects;

  -- Visitors may add files to a not-yet-submitted submission folder only; they can never read, list or replace them.
  execute $p$create policy "member_story_submissions_upload" on storage.objects for insert to anon, authenticated with check (
    bucket_id = 'member-story-submissions'
    and name ~ '^incoming/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$'
    and not public.member_story_submission_exists((storage.foldername(name))[2]))$p$;
  execute $p$create policy "member_story_submissions_admin" on storage.objects for all to authenticated
    using (bucket_id = 'member-story-submissions' and (select public.is_story_admin()))
    with check (bucket_id = 'member-story-submissions' and (select public.is_story_admin()))$p$;
  -- Approved, public story media: anyone can view by URL (public bucket); only admins add, replace or remove.
  execute $p$create policy "member_stories_admin_write" on storage.objects for all to authenticated
    using (bucket_id = 'member-stories' and (select public.is_story_admin()))
    with check (bucket_id = 'member-stories' and (select public.is_story_admin()))$p$;
end $$;
