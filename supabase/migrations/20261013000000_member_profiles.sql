-- IELS Dashboard Reset: additive migration (no existing tables are changed).
-- Creates public.member_profiles for onboarding goals + simple member profile,
-- and a privacy-safe RPC for the People directory.
-- Apply: Supabase Dashboard > SQL Editor > paste & run, or `supabase db push`.

create table if not exists public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_url text,
  country text,
  role_status text,
  bio text check (bio is null or char_length(bio) <= 300),
  destination_country text,
  direction text check (direction is null or direction in ('study', 'work', 'explore')),
  interests text[] not null default '{}',
  english_level text,
  linkedin_url text,
  instagram_url text,
  portfolio_url text,
  is_public boolean not null default false,
  public_fields text[] not null default '{country,role_status,goals}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_profiles enable row level security;

-- Owners can read and write only their own row. Nobody else can select the table directly.
drop policy if exists "member_profiles_select_own" on public.member_profiles;
create policy "member_profiles_select_own" on public.member_profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "member_profiles_insert_own" on public.member_profiles;
create policy "member_profiles_insert_own" on public.member_profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "member_profiles_update_own" on public.member_profiles;
create policy "member_profiles_update_own" on public.member_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.member_profiles to authenticated;
revoke all on public.member_profiles from anon;

create index if not exists member_profiles_public_idx
  on public.member_profiles (direction, updated_at desc) where is_public;
create index if not exists member_profiles_interests_idx
  on public.member_profiles using gin (interests) where is_public;

-- Directory: only opted-in members, only the fields each member chose to share, paginated.
-- Never returns email, phone or other account data.
create or replace function public.list_member_directory(
  p_direction text default null,
  p_search text default null,
  p_limit int default 12,
  p_offset int default 0
)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  country text,
  role_status text,
  bio text,
  destination_country text,
  direction text,
  interests text[],
  linkedin_url text,
  instagram_url text,
  portfolio_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mp.user_id,
    mp.display_name,
    mp.avatar_url,
    case when 'country' = any(mp.public_fields) then mp.country end,
    case when 'role_status' = any(mp.public_fields) then mp.role_status end,
    case when 'bio' = any(mp.public_fields) then mp.bio end,
    case when 'goals' = any(mp.public_fields) then mp.destination_country end,
    case when 'goals' = any(mp.public_fields) then mp.direction end,
    case when 'goals' = any(mp.public_fields) then mp.interests else '{}'::text[] end,
    case when 'links' = any(mp.public_fields) then mp.linkedin_url end,
    case when 'links' = any(mp.public_fields) then mp.instagram_url end,
    case when 'links' = any(mp.public_fields) then mp.portfolio_url end
  from public.member_profiles mp
  where auth.uid() is not null
    and mp.is_public
    and mp.user_id <> auth.uid()
    and (p_direction is null or ('goals' = any(mp.public_fields) and mp.direction = p_direction))
    and (
      p_search is null
      or mp.display_name ilike '%' || p_search || '%'
      or ('country' = any(mp.public_fields) and mp.country ilike '%' || p_search || '%')
      or ('goals' = any(mp.public_fields) and mp.destination_country ilike '%' || p_search || '%')
    )
  order by mp.updated_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.list_member_directory(text, text, int, int) from public, anon;
grant execute on function public.list_member_directory(text, text, int, int) to authenticated;
