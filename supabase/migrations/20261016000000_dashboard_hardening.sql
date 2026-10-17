-- IELS Dashboard: hardening for member_profiles / member_bookmarks (additive, idempotent).
-- Run AFTER 20261013000000_member_profiles.sql and 20261013010000_phase2_origin_bookmarks.sql.
--
-- Touches ONLY the two dashboard tables created by those migrations. No existing IELSco table
-- (users, user_profiles, memberships, gif_*, goals, ...) is read, altered or dropped here.
-- Safe to re-run: every constraint/index/trigger is created only if it does not exist yet.
--
-- What it adds:
--   1. Value checks so data written directly through the API (bypassing the UI) stays sane:
--      links must be http(s) URLs (they are rendered as <a href> in the member directory),
--      public_fields only allows known field names, bounded text/array sizes.
--   2. updated_at maintained by the database instead of trusting the client clock.
--   3. An index matching the bookmark list query (user_id, created_at desc).

-- 1. Constraints ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'member_profiles_links_http'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_links_http check (
      (linkedin_url  is null or linkedin_url  ~* '^https?://.+') and
      (instagram_url is null or instagram_url ~* '^https?://.+') and
      (portfolio_url is null or portfolio_url ~* '^https?://.+')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'member_profiles_public_fields_known'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_public_fields_known check (
      public_fields <@ array['origin', 'country', 'role_status', 'bio', 'goals', 'links']::text[]
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'member_profiles_sizes'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_sizes check (
      cardinality(interests) <= 20 and
      char_length(array_to_string(interests, '')) <= 1000 and
      (avatar_url          is null or char_length(avatar_url)          <= 1000) and
      (origin_country      is null or char_length(origin_country)      <= 100) and
      (country             is null or char_length(country)             <= 100) and
      (destination_country is null or char_length(destination_country) <= 100) and
      (role_status         is null or char_length(role_status)         <= 100) and
      (english_level       is null or char_length(english_level)       <= 50) and
      (linkedin_url        is null or char_length(linkedin_url)        <= 500) and
      (instagram_url       is null or char_length(instagram_url)       <= 500) and
      (portfolio_url       is null or char_length(portfolio_url)       <= 500)
    );
  end if;
end $$;

-- 2. updated_at maintained server-side ----------------------------------------------------
create or replace function public.member_profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists member_profiles_touch_updated_at on public.member_profiles;
create trigger member_profiles_touch_updated_at
  before insert or update on public.member_profiles
  for each row execute function public.member_profiles_touch_updated_at();

-- The trigger function is only meant to run as a trigger.
revoke all on function public.member_profiles_touch_updated_at() from public, anon, authenticated;

-- 3. Index for "my saved items, newest first" ---------------------------------------------
create index if not exists member_bookmarks_user_created_idx
  on public.member_bookmarks (user_id, created_at desc);
