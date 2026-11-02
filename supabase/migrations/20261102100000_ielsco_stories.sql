-- IELSco Stories: official IELSco editorial articles (achievements, events, partnerships, community, press, insights),
-- managed in the SAME CMS as Member Stories. They are rows of public.member_stories with section = 'ielsco', so they
-- reuse the editor, the admin-only RLS, the publish guard, slug redirects, the public `member-stories` image bucket and
-- cache revalidation. Additive and re-runnable; existing Member Stories keep section = 'member' and are unchanged.
--
--   * section            'member' (circle.ielsco.com/stories) or 'ielsco' (www.ielsco.com/stories); fixed after creation.
--   * lang               'en' or 'id'. An Indonesian article points at its English original with translation_of.
--   * tags, banner_alt, banner_caption   editorial fields (featured image alt text and caption).
--   * Scheduling: an IELSco story published with a future published_at stays hidden until that time
--     (public.published_ielsco_stories filters published_at <= now(); pages refresh at least every 5 minutes).

alter table public.member_stories add column if not exists section text not null default 'member';
alter table public.member_stories add column if not exists lang text not null default 'en';
alter table public.member_stories add column if not exists translation_of uuid references public.member_stories(id) on delete set null;
alter table public.member_stories add column if not exists tags text[] not null default '{}';
alter table public.member_stories add column if not exists banner_alt text;
alter table public.member_stories add column if not exists banner_caption text;

do $$ begin
  alter table public.member_stories add constraint member_stories_section_check check (section in ('member', 'ielsco'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.member_stories add constraint member_stories_lang_check check (lang in ('en', 'id'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.member_stories add constraint member_stories_ielsco_no_placeholders check (section = 'member' or kind = 'story');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.member_stories add constraint member_stories_tags_limit check (cardinality(tags) <= 12);
exception when duplicate_object then null; end $$;

-- Categories depend on the section.
alter table public.member_stories drop constraint if exists member_stories_category_check;
do $$ begin
  alter table public.member_stories add constraint member_stories_category_by_section check (
    (section = 'member' and category in ('internals', 'circle', 'inspires'))
    or (section = 'ielsco' and category in ('achievements', 'events', 'partnerships', 'community', 'press', 'insights')));
exception when duplicate_object then null; end $$;

create index if not exists member_stories_section_idx on public.member_stories (section, status, published_at desc);
create index if not exists member_stories_translation_idx on public.member_stories (translation_of);

-- Same guard as before, plus: the section can't change, and a translation must link an Indonesian IELSco story to
-- an English IELSco story.
create or replace function public.member_stories_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' and new.kind is distinct from old.kind then
    raise exception 'a story''s kind cannot be changed' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.section is distinct from old.section then
    raise exception 'a story''s section (Member Stories / IELSco Stories) cannot be changed' using errcode = '22023';
  end if;
  if new.translation_of is not null then
    if new.translation_of = new.id then
      raise exception 'a story cannot be its own translation' using errcode = '22023';
    end if;
    if new.section <> 'ielsco' or new.lang <> 'id' or not exists (
      select 1 from public.member_stories t where t.id = new.translation_of and t.section = 'ielsco' and t.lang = 'en') then
      raise exception 'only an Indonesian IELSco story can link to an English IELSco story as its translation' using errcode = '22023';
    end if;
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

-- Member Stories' public views now show only the member section (unchanged otherwise).
create or replace view public.published_member_stories as
  select s.id, s.slug, s.title, s.summary, s.category, s.story_type, s.author_name, s.author_country, s.author_location,
         s.author_role, s.author_bio, s.author_avatar, s.social, s.banner_image, s.legacy_content, s.sections, s.quotes,
         s.highlights, s.gallery, s.credits, s.seo, s.story_date, s.sort_date, s.location, s.published_at, s.updated_at
  from public.member_stories s
  where s.status = 'published' and s.kind = 'story' and s.section = 'member';

create or replace view public.published_member_story_redirects as
  select r.old_slug, s.slug
  from public.member_story_redirects r
  join public.member_stories s on s.id = r.story_id
  where s.status = 'published' and s.kind = 'story' and s.section = 'member';

-- IELSco Stories: published and due. translation_slug is the published other-language version, if any.
create or replace view public.published_ielsco_stories as
  select s.id, s.slug, s.title, s.summary, s.category, s.tags, s.lang, s.author_name, s.author_role, s.banner_image,
         s.banner_alt, s.banner_caption, s.sections, s.quotes, s.highlights, s.gallery, s.credits, s.seo, s.story_date,
         s.location, s.published_at, s.updated_at,
         coalesce(
           (select t.slug from public.member_stories t where t.id = s.translation_of
              and t.status = 'published' and t.section = 'ielsco' and t.published_at <= now()),
           (select t.slug from public.member_stories t where t.translation_of = s.id
              and t.status = 'published' and t.section = 'ielsco' and t.published_at <= now() order by t.published_at limit 1)
         ) as translation_slug
  from public.member_stories s
  where s.status = 'published' and s.kind = 'story' and s.section = 'ielsco' and s.published_at <= now();

create or replace view public.published_ielsco_story_redirects as
  select r.old_slug, s.slug, s.lang
  from public.member_story_redirects r
  join public.member_stories s on s.id = r.story_id
  where s.status = 'published' and s.kind = 'story' and s.section = 'ielsco' and s.published_at <= now();

revoke all on public.published_ielsco_stories, public.published_ielsco_story_redirects from anon, authenticated;
grant select on public.published_ielsco_stories, public.published_ielsco_story_redirects to anon, authenticated, service_role;
