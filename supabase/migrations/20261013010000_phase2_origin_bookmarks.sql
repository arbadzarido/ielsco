-- IELS Dashboard Phase 2 (additive). Run AFTER 20261013000000_member_profiles.sql.
-- 1) member_profiles.origin_country  (country of origin; NOT residence, NOT destination)
-- 2) member_bookmarks                (saved resources/collections per account)
-- 3) list_member_directory v2        (origin/destination/interest filters + explainable match_score)
-- Existing rows: origin_country stays NULL (unknown). The dashboard prompts those members to add it.
-- public.users.domicile is NOT touched.

alter table public.member_profiles add column if not exists origin_country text;

-- ---------------------------------------------------------------------------
create table if not exists public.member_bookmarks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('resource', 'collection')),
  item_id text not null check (char_length(item_id) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

alter table public.member_bookmarks enable row level security;

drop policy if exists "member_bookmarks_select_own" on public.member_bookmarks;
create policy "member_bookmarks_select_own" on public.member_bookmarks
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "member_bookmarks_insert_own" on public.member_bookmarks;
create policy "member_bookmarks_insert_own" on public.member_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "member_bookmarks_delete_own" on public.member_bookmarks;
create policy "member_bookmarks_delete_own" on public.member_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.member_bookmarks to authenticated;
revoke all on public.member_bookmarks from anon;

-- ---------------------------------------------------------------------------
drop function if exists public.list_member_directory(text, text, int, int);
drop function if exists public.list_member_directory(text, text, text, text, text, int, int);

create function public.list_member_directory(
  p_direction text default null,
  p_search text default null,
  p_origin text default null,
  p_destination text default null,
  p_interest text default null,
  p_limit int default 12,
  p_offset int default 0
)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  origin_country text,
  country text,
  role_status text,
  bio text,
  destination_country text,
  direction text,
  interests text[],
  linkedin_url text,
  instagram_url text,
  portfolio_url text,
  match_score int
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select direction, destination_country, origin_country, interests
    from public.member_profiles where user_id = auth.uid()
  ),
  visible as (
    select
      mp.user_id,
      mp.display_name,
      mp.avatar_url,
      case when 'origin' = any(mp.public_fields) and mp.origin_country <> 'Prefer not to say' then mp.origin_country end as origin_country,
      case when 'country' = any(mp.public_fields) then mp.country end as country,
      case when 'role_status' = any(mp.public_fields) then mp.role_status end as role_status,
      case when 'bio' = any(mp.public_fields) then mp.bio end as bio,
      case when 'goals' = any(mp.public_fields) then mp.destination_country end as destination_country,
      case when 'goals' = any(mp.public_fields) then mp.direction end as direction,
      case when 'goals' = any(mp.public_fields) then mp.interests else '{}'::text[] end as interests,
      case when 'links' = any(mp.public_fields) then mp.linkedin_url end as linkedin_url,
      case when 'links' = any(mp.public_fields) then mp.instagram_url end as instagram_url,
      case when 'links' = any(mp.public_fields) then mp.portfolio_url end as portfolio_url,
      mp.updated_at
    from public.member_profiles mp
    where auth.uid() is not null and mp.is_public and mp.user_id <> auth.uid()
  )
  -- Filters and scoring use ONLY the privacy-masked columns above.
  select
    v.user_id, v.display_name, v.avatar_url, v.origin_country, v.country, v.role_status, v.bio,
    v.destination_country, v.direction, v.interests, v.linkedin_url, v.instagram_url, v.portfolio_url,
    (
      (case when v.direction is not null and v.direction = me.direction then 2 else 0 end)
      + (case when v.destination_country is not null and v.destination_country <> 'Not decided yet'
              and v.destination_country = me.destination_country then 2 else 0 end)
      + (case when v.origin_country is not null and v.origin_country = me.origin_country then 1 else 0 end)
      + coalesce((select count(*)::int from unnest(v.interests) i
                  where i <> 'Not sure yet' and i = any(coalesce(me.interests, '{}'))), 0)
    )::int as match_score
  from visible v
  left join me on true
  where (p_direction is null or v.direction = p_direction)
    and (p_origin is null or v.origin_country = p_origin)
    and (p_destination is null or v.destination_country = p_destination)
    and (p_interest is null or p_interest = any(v.interests))
    and (
      p_search is null
      or v.display_name ilike '%' || p_search || '%'
      or v.origin_country ilike '%' || p_search || '%'
      or v.country ilike '%' || p_search || '%'
      or v.destination_country ilike '%' || p_search || '%'
    )
  order by match_score desc, v.updated_at desc
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0);
$$;

revoke all on function public.list_member_directory(text, text, text, text, text, int, int) from public, anon;
grant execute on function public.list_member_directory(text, text, text, text, text, int, int) to authenticated;
