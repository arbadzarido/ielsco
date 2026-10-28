-- Circles (2026-10-29): small, staff-managed interest groups with membership and a members-only discussion.
-- Additive; safe to re-run. Needs 20261028000000_connect_core.sql (connect_ready, connect_blocked, connect_reports).
-- The existing "IELS Circle" pages (sessions, check-ins: public.circle_session_checkins) are untouched; these themed
-- Circles sit next to them in Discover → Circles.
--
-- Rules:
--   * Circles are created and edited by staff (public.is_site_admin()) only. Three starting themes are inserted once
--     (on conflict do nothing: re-running never overwrites staff edits).
--   * Any signed-in member can see the list. Joining, reading and posting need connect_ready() (display name, Connect
--     guidelines, 18+), the same rule as the rest of Connect, because members talk with people they don't know.
--   * Posts are visible to the Circle's members and staff only; posts by someone either side has blocked are hidden.
--     Authors (and staff) can remove a post; staff posts can be marked as the Circle's discussion prompt.
--   * 10 posts per hour per member. Replies are one level deep.

create table if not exists public.circles (
  id text primary key check (id ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 3 and 60),
  tagline text check (char_length(tagline) <= 140),
  description text check (char_length(description) <= 1200),
  color text not null default 'teal' check (color in ('teal', 'coral', 'violet', 'amber', 'navy', 'green')),
  room_categories text[] not null default '{}',
  sort int not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.circles enable row level security;
revoke all on public.circles from anon, authenticated;
grant select, insert, update, delete on public.circles to authenticated;
drop policy if exists circles_admin on public.circles;
create policy circles_admin on public.circles for all to authenticated using (public.is_site_admin()) with check (public.is_site_admin());

insert into public.circles (id, name, tagline, description, color, room_categories, sort) values
  ('global-growth', 'Global Growth Circle', 'Personal development, confidence, leadership and international skills.',
   'For members building confidence and skills for study and work abroad: speaking up, leading projects, learning in public and keeping each other accountable.',
   'teal', '{english_practice,career_networking,study_together}', 1),
  ('opportunities', 'Opportunities & Global Programs', 'Scholarships, exchanges, fellowships, internships and volunteering.',
   'Share programs you are applying to, swap application tips and keep each other on track with deadlines. Always link the official source.',
   'amber', '{scholarship_prep,entrepreneurship}', 2),
  ('cross-cultural', 'Cross-Cultural Connections', 'International friendships, cultural exchange and regional perspectives.',
   'Talk about everyday life, traditions, food, languages and hobbies across Southeast Asia and beyond. Home of the SEA Cultural Exchange prompts.',
   'coral', '{culture_exchange,language_exchange,hangout}', 3)
on conflict (id) do nothing;

create table if not exists public.circle_members (
  circle_id text not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index if not exists circle_members_user_idx on public.circle_members (user_id);
alter table public.circle_members enable row level security;
revoke all on public.circle_members from anon, authenticated;

create table if not exists public.circle_posts (
  id uuid primary key default gen_random_uuid(),
  circle_id text not null references public.circles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.circle_posts(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_prompt boolean not null default false,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid
);
create index if not exists circle_posts_circle_idx on public.circle_posts (circle_id, created_at desc) where removed_at is null and parent_id is null;
create index if not exists circle_posts_parent_idx on public.circle_posts (parent_id, created_at) where removed_at is null;
create index if not exists circle_posts_author_idx on public.circle_posts (author_id, created_at desc);
alter table public.circle_posts enable row level security;
revoke all on public.circle_posts from anon, authenticated;

-- Reports can now point at a Circle post.
alter table public.connect_reports drop constraint if exists connect_reports_context_check;
alter table public.connect_reports add constraint connect_reports_context_check
  check (context in ('profile', 'request', 'message', 'call', 'room', 'circle'));

create or replace function public.circle_member(p_circle text, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.circle_members where circle_id = p_circle and user_id = p_user)
$$;
revoke all on function public.circle_member(text, uuid) from public, anon, authenticated;

create or replace function public.list_circles() returns table (
  id text, name text, tagline text, description text, color text, room_categories text[], members int, posts_7d int,
  last_post_at timestamptz, is_member boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, c.tagline, c.description, c.color, c.room_categories,
         (select count(*)::int from public.circle_members m where m.circle_id = c.id),
         (select count(*)::int from public.circle_posts p where p.circle_id = c.id and p.removed_at is null and p.created_at > now() - interval '7 days'),
         (select max(p.created_at) from public.circle_posts p where p.circle_id = c.id and p.removed_at is null),
         public.circle_member(c.id, (select auth.uid()))
    from public.circles c
   where (select auth.uid()) is not null and c.status = 'active'
   order by c.sort, c.name
$$;
revoke all on function public.list_circles() from public, anon;
grant execute on function public.list_circles() to authenticated;

create or replace function public.join_circle(p_circle text) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.circles where id = p_circle and status = 'active') then raise exception 'circle_not_found' using errcode = 'P0001'; end if;
  insert into public.circle_members (circle_id, user_id) values (p_circle, uid) on conflict do nothing;
  return 'joined';
end $$;
revoke all on function public.join_circle(text) from public, anon;
grant execute on function public.join_circle(text) to authenticated;

create or replace function public.leave_circle(p_circle text) returns text
language sql security definer set search_path = '' as $$
  delete from public.circle_members where circle_id = p_circle and user_id = (select auth.uid());
  select 'left'
$$;
revoke all on function public.leave_circle(text) from public, anon;
grant execute on function public.leave_circle(text) to authenticated;

-- Top-level posts, newest first (prompts first), with their replies (oldest first) as JSON. Members and staff only.
create or replace function public.list_circle_posts(p_circle text, p_before timestamptz default null, p_limit int default 20)
returns table (id uuid, author jsonb, body text, is_prompt boolean, created_at timestamptz, mine boolean, replies jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null or not (public.circle_member(p_circle, uid) or public.is_site_admin()) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return query
  select p.id,
         jsonb_build_object('id', p.author_id, 'display_name', coalesce(nullif(mp.display_name, ''), 'IELS member'), 'avatar_url', mp.avatar_url),
         p.body, p.is_prompt, p.created_at, p.author_id = uid,
         coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'body', r.body, 'created_at', r.created_at, 'mine', r.author_id = uid,
                     'author', jsonb_build_object('id', r.author_id, 'display_name', coalesce(nullif(rp.display_name, ''), 'IELS member'), 'avatar_url', rp.avatar_url))
                     order by r.created_at)
                     from public.circle_posts r left join public.member_profiles rp on rp.user_id = r.author_id
                    where r.parent_id = p.id and r.removed_at is null and not public.connect_blocked(r.author_id, uid)), '[]'::jsonb)
    from public.circle_posts p
    left join public.member_profiles mp on mp.user_id = p.author_id
   where p.circle_id = p_circle and p.parent_id is null and p.removed_at is null
     and not public.connect_blocked(p.author_id, uid)
     and (p_before is null or p.created_at < p_before)
   order by p.is_prompt desc, p.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;
revoke all on function public.list_circle_posts(text, timestamptz, int) from public, anon;
grant execute on function public.list_circle_posts(text, timestamptz, int) to authenticated;

-- Returns the new post id. p_prompt is honoured for staff only.
create or replace function public.post_circle(p_circle text, p_body text, p_parent uuid default null, p_prompt boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); b text := public.connect_clean(p_body, 2000); v_id uuid; parent public.circle_posts%rowtype;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not public.connect_ready(uid) then raise exception 'passport_required' using errcode = 'P0001'; end if;
  if not (public.circle_member(p_circle, uid) or public.is_site_admin()) then raise exception 'not_a_member' using errcode = '42501'; end if;
  if b is null then raise exception 'empty_message' using errcode = '22023'; end if;
  if p_parent is not null then
    select * into parent from public.circle_posts where id = p_parent;
    if not found or parent.circle_id <> p_circle or parent.parent_id is not null or parent.removed_at is not null then
      raise exception 'post_not_found' using errcode = 'P0001';
    end if;
    if public.connect_blocked(parent.author_id, uid) then raise exception 'not_available' using errcode = 'P0001'; end if;
  end if;
  if (select count(*) from public.circle_posts where author_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.circle_posts (circle_id, author_id, parent_id, body, is_prompt)
  values (p_circle, uid, p_parent, b, coalesce(p_prompt, false) and p_parent is null and public.is_site_admin())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.post_circle(text, text, uuid, boolean) from public, anon;
grant execute on function public.post_circle(text, text, uuid, boolean) to authenticated;

create or replace function public.remove_circle_post(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
begin
  update public.circle_posts set removed_at = now(), removed_by = (select auth.uid())
   where id = p_id and removed_at is null and (author_id = (select auth.uid()) or public.is_site_admin());
  if not found then raise exception 'post_not_found' using errcode = 'P0001'; end if;
  return 'removed';
end $$;
revoke all on function public.remove_circle_post(uuid) from public, anon;
grant execute on function public.remove_circle_post(uuid) to authenticated;
