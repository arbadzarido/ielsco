-- =====================================================================================================================
-- GIF Summer 2027 Fully Funded Eligibility Tracker (extends 20261122000000_gif_assessment_portal; additive only)
-- ---------------------------------------------------------------------------------------------------------------------
-- * gif_assignments gets a `track`: 'programme' (Day 1–4, unchanged) or 'eligibility' (Reels 1–4, Story activation,
--   Fellowship feedback, Letters to the Future). Eligibility tasks reuse submissions, files, assessments and the 7-day
--   Story-proof retention unchanged.
-- * gif_eligibility_categories / gif_eligibility_requirements: weighted, admin-configurable scoring.
-- * gif_eligibility_reviews: append-only admin verification for requirements that are not submissions
--   (anonymous messages, Elco AI activation, Elco-Pass, public profile). gif_verification_requests: delegate asks for
--   (re)verification, optionally with a URL. A URL alone never verifies anything.
-- * gif_messages ("Words We Leave Behind"): anonymous to recipients. The table is not readable through the API at all;
--   every read/write goes through SECURITY DEFINER functions that never return the sender to anyone but admins.
-- * Verification signals come from existing data: elco_account_links (signed IELSco<->Elco link, never matched by
--   email), elco_learning_summaries, member_profiles (Elco-Pass fields, is_public).
-- Rollback: supabase/manual/ROLLBACK-20261124-gif-fully-funded-eligibility.sql
-- =====================================================================================================================

-- ---------------------------------------------------------------------------------------------------------------------
-- 1. Assignment tracks
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.gif_assignments add column if not exists track text not null default 'programme';
alter table public.gif_assignments add column if not exists window_label text;
alter table public.gif_assignments alter column day_number drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'gif_assignments_track_check') then
    alter table public.gif_assignments add constraint gif_assignments_track_check
      check (track in ('programme', 'eligibility') and (track = 'eligibility' or day_number is not null));
  end if;
end $$;
create index if not exists gif_assignments_track_idx on public.gif_assignments(edition, track, sort_order);

-- Human label for notifications: "Day 2 submission" or "GIF Summer 2027 task"
create or replace function public.gif_assignment_label(p_assignment uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select case when a.day_number is null then format('GIF Summer 2027 task "%s"', a.title) else format('Day %s "%s"', a.day_number, a.title) end
    from public.gif_assignments a where a.id = p_assignment
$$;

create or replace function public.gif_submission_after() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  missing text[];
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted' or old.responses is distinct from new.responses)
     and (select auth.uid()) is not null and current_setting('gif.assessing', true) is distinct from 'on' then
    missing := public.gif_submission_missing(new.id);
    if array_length(missing, 1) > 0 then
      raise exception 'Please complete the required fields before submitting: %', array_to_string(missing, ', ') using errcode = '23514';
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    insert into public.gif_notifications (delegate_id, submission_id, kind, message)
    select r.delegate_id, new.id, 'received', format('Your %s submission has been received.', public.gif_assignment_label(new.assignment_id))
      from (select new.delegate_id as delegate_id where new.delegate_id is not null
            union select m.delegate_id from public.gif_team_members m where m.team_id = new.team_id) r;
  end if;
  return null;
end $$;

create or replace function public.gif_assessment_after() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare s record; msg text; lbl text;
begin
  select sub.* into s from public.gif_submissions sub where sub.id = new.submission_id;
  lbl := public.gif_assignment_label(s.assignment_id);
  perform set_config('gif.assessing', 'on', true);
  update public.gif_submissions set status = new.status, updated_at = now() where id = new.submission_id;
  perform set_config('gif.assessing', 'off', true);
  msg := case new.status
    when 'under_review' then format('Your %s submission is currently under review.', lbl)
    when 'approved' then format('Your %s has been approved.', lbl)
    else format('Your %s submission requires revision. Please check Arba''s feedback.', lbl) end;
  insert into public.gif_notifications (delegate_id, submission_id, kind, message)
  select r.delegate_id, new.submission_id, new.status, msg
    from (select s.delegate_id as delegate_id where s.delegate_id is not null
          union select m.delegate_id from public.gif_team_members m where m.team_id = s.team_id) r;
  return null;
end $$;

-- Rating fields ("type":"rating") are stored as numbers 1–5; gif_submission_missing already treats them as text-like
-- (->> returns the number as text). Validate the range on write.
create or replace function public.gif_submission_ratings_ok() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare f jsonb; v text;
begin
  for f in select * from jsonb_array_elements((select a.fields from public.gif_assignments a where a.id = new.assignment_id)) loop
    if f ->> 'type' = 'rating' then
      v := new.responses ->> (f ->> 'key');
      if v is not null and (v !~ '^[1-5]$') then raise exception 'Ratings must be 1 to 5.' using errcode = '23514'; end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists gif_submission_ratings_trg on public.gif_submissions;
create trigger gif_submission_ratings_trg before insert or update of responses on public.gif_submissions
  for each row execute function public.gif_submission_ratings_ok();

-- ---------------------------------------------------------------------------------------------------------------------
-- 2. Categories, requirements, reviews, verification requests
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.gif_eligibility_categories (
  edition     text not null default 'GIF 2026',
  key         text not null check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  title       text not null,
  description text,
  weight      numeric(7,3) not null check (weight >= 0 and weight <= 100),
  sort_order  smallint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (edition, key)
);

create table if not exists public.gif_eligibility_requirements (
  id            uuid primary key default gen_random_uuid(),
  edition       text not null default 'GIF 2026',
  category_key  text not null,
  key           text not null check (key ~ '^[a-z][a-z0-9_]{1,40}$'),
  title         text not null,
  description   text,
  source        text not null check (source in ('assignment', 'messages', 'elco_ai', 'elco_pass', 'public_profile')),
  assignment_id uuid references public.gif_assignments(id) on delete restrict,
  share         numeric(7,3) not null default 1 check (share > 0 and share <= 100),
  window_label  text,
  sort_order    smallint not null default 0,
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now(),
  unique (edition, key),
  foreign key (edition, category_key) references public.gif_eligibility_categories(edition, key) on delete restrict,
  check ((source = 'assignment') = (assignment_id is not null))
);
create index if not exists gif_eligibility_requirements_cat_idx on public.gif_eligibility_requirements(edition, category_key, sort_order);

create table if not exists public.gif_eligibility_reviews (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.gif_eligibility_requirements(id) on delete restrict,
  delegate_id    uuid not null references public.gif_delegates(id) on delete restrict,
  assessor_id    uuid not null references auth.users(id) on delete restrict,
  status         text not null check (status in ('under_review', 'approved', 'revision_required')),
  feedback       text check (feedback is null or length(feedback) <= 3000),
  created_at     timestamptz not null default now(),
  check (status <> 'revision_required' or coalesce(btrim(feedback), '') <> '')
);
create index if not exists gif_eligibility_reviews_idx on public.gif_eligibility_reviews(delegate_id, requirement_id, created_at desc);

create table if not exists public.gif_verification_requests (
  id             uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.gif_eligibility_requirements(id) on delete restrict,
  delegate_id    uuid not null references public.gif_delegates(id) on delete restrict,
  url            text check (url is null or (url ~ '^https?://' and length(url) <= 500)),
  note           text check (note is null or length(note) <= 1000),
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists gif_verification_requests_idx on public.gif_verification_requests(delegate_id, requirement_id, created_at desc);

create or replace function public.gif_eligibility_review_guard() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  if (select auth.uid()) is not null and not public.gif_is_admin() then
    raise exception 'Only GIF admins can verify requirements.' using errcode = '42501';
  end if;
  select * into r from public.gif_eligibility_requirements where id = new.requirement_id;
  if r.source = 'assignment' then
    raise exception 'Assess submissions in the assessment inbox, not here.' using errcode = '23514';
  end if;
  new.assessor_id := coalesce((select auth.uid()), new.assessor_id);
  new.created_at := now();
  return new;
end $$;
drop trigger if exists gif_eligibility_review_guard_trg on public.gif_eligibility_reviews;
create trigger gif_eligibility_review_guard_trg before insert on public.gif_eligibility_reviews
  for each row execute function public.gif_eligibility_review_guard();

create or replace function public.gif_eligibility_review_notify() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare t text;
begin
  select title into t from public.gif_eligibility_requirements where id = new.requirement_id;
  insert into public.gif_notifications (delegate_id, kind, message)
  values (new.delegate_id, new.status, case new.status
    when 'approved' then format('GIF Summer 2027: "%s" has been verified.', t)
    when 'under_review' then format('GIF Summer 2027: "%s" is being verified.', t)
    else format('GIF Summer 2027: "%s" needs another look. Please check Arba''s note.', t) end);
  return null;
end $$;
drop trigger if exists gif_eligibility_review_notify_trg on public.gif_eligibility_reviews;
create trigger gif_eligibility_review_notify_trg after insert on public.gif_eligibility_reviews
  for each row execute function public.gif_eligibility_review_notify();

create or replace function public.gif_verification_request_guard() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  select * into r from public.gif_eligibility_requirements where id = new.requirement_id;
  if r.source = 'assignment' or not r.is_active then
    raise exception 'This requirement is verified through its submission.' using errcode = '23514';
  end if;
  if (select auth.uid()) is not null then
    if new.delegate_id is distinct from public.gif_my_delegate_id() then
      raise exception 'You can only ask for verification of your own requirements.' using errcode = '42501';
    end if;
    if exists (select 1 from public.gif_verification_requests q where q.delegate_id = new.delegate_id and q.requirement_id = new.requirement_id
               and q.created_at > now() - interval '1 minute') then
      raise exception 'Please wait a moment before asking again.' using errcode = '23514';
    end if;
  end if;
  new.created_by := (select auth.uid());
  new.created_at := now();
  return new;
end $$;
drop trigger if exists gif_verification_request_guard_trg on public.gif_verification_requests;
create trigger gif_verification_request_guard_trg before insert on public.gif_verification_requests
  for each row execute function public.gif_verification_request_guard();

create or replace function public.gif_eligibility_touch() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists gif_eligibility_categories_touch on public.gif_eligibility_categories;
create trigger gif_eligibility_categories_touch before update on public.gif_eligibility_categories for each row execute function public.gif_eligibility_touch();
drop trigger if exists gif_eligibility_requirements_touch on public.gif_eligibility_requirements;
create trigger gif_eligibility_requirements_touch before update on public.gif_eligibility_requirements for each row execute function public.gif_eligibility_touch();

-- ---------------------------------------------------------------------------------------------------------------------
-- 3. Words We Leave Behind (anonymous messages)
-- ---------------------------------------------------------------------------------------------------------------------
create table if not exists public.gif_messages (
  id                    uuid primary key default gen_random_uuid(),
  sender_delegate_id    uuid not null references public.gif_delegates(id) on delete restrict,
  recipient_delegate_id uuid references public.gif_delegates(id) on delete restrict,
  recipient_staff       text check (recipient_staff in ('arba', 'farrel')),
  body                  text not null check (length(btrim(body)) between 10 and 1500),
  sender_allows_wall    boolean not null default false,
  wall_status           text not null default 'none' check (wall_status in ('none', 'requested', 'approved', 'declined')),
  read_at               timestamptz,
  favourite             boolean not null default false,
  hidden_at             timestamptz,
  hidden_reason         text,
  created_at            timestamptz not null default now(),
  check ((recipient_delegate_id is null) <> (recipient_staff is null)),
  check (recipient_delegate_id is null or recipient_delegate_id <> sender_delegate_id)
);
-- one message per sender per recipient: duplicates can never inflate the requirement
create unique index if not exists gif_messages_one_per_delegate on public.gif_messages(sender_delegate_id, recipient_delegate_id) where recipient_delegate_id is not null;
create unique index if not exists gif_messages_one_per_staff on public.gif_messages(sender_delegate_id, recipient_staff) where recipient_staff is not null;
create index if not exists gif_messages_recipient_idx on public.gif_messages(recipient_delegate_id, created_at desc);

-- People you can write to: the 12 team delegates (names only), minus yourself.
create or replace function public.gif_message_recipients() returns table (delegate_id uuid, full_name text, team_name text)
language sql stable security definer set search_path = ''
as $$
  select d.id, coalesce(nullif(d.preferred_name, ''), d.full_name), t.name
    from public.gif_delegates d
    join public.gif_team_members m on m.delegate_id = d.id
    join public.gif_teams t on t.id = m.team_id
   where public.gif_my_delegate_id() is not null and d.access_granted and d.id <> public.gif_my_delegate_id()
   order by t.team_number, d.full_name
$$;

create or replace function public.gif_send_message(p_recipient_delegate uuid, p_recipient_staff text, p_body text, p_allow_wall boolean)
returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := public.gif_my_delegate_id(); new_id uuid;
begin
  if me is null then raise exception 'Only GIF delegates can leave messages.' using errcode = '42501'; end if;
  if (p_recipient_delegate is null) = (p_recipient_staff is null) then raise exception 'Choose one recipient.' using errcode = '22023'; end if;
  if p_recipient_delegate = me then raise exception 'You can''t send a message to yourself.' using errcode = '22023'; end if;
  if p_recipient_delegate is not null and not exists (
       select 1 from public.gif_team_members m join public.gif_delegates d on d.id = m.delegate_id where m.delegate_id = p_recipient_delegate and d.access_granted) then
    raise exception 'That person is not on the GIF 2026 delegate list.' using errcode = '22023';
  end if;
  if p_recipient_staff is not null and p_recipient_staff not in ('arba', 'farrel') then raise exception 'Unknown recipient.' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_body, ''))) < 10 then raise exception 'Please write at least a sentence (10 characters).' using errcode = '22023'; end if;
  if length(btrim(p_body)) > 1500 then raise exception 'Messages can be up to 1,500 characters.' using errcode = '22023'; end if;
  begin
    insert into public.gif_messages (sender_delegate_id, recipient_delegate_id, recipient_staff, body, sender_allows_wall)
    values (me, p_recipient_delegate, p_recipient_staff, btrim(p_body), coalesce(p_allow_wall, false))
    returning id into new_id;
  exception when unique_violation then
    raise exception 'You have already left a message for this person.' using errcode = '23505';
  end;
  return new_id;
end $$;

-- Messages I received. Never returns the sender.
create or replace function public.gif_my_received_messages()
returns table (id uuid, body text, created_at timestamptz, read_at timestamptz, favourite boolean, wall_status text, sender_allows_wall boolean)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.body, m.created_at, m.read_at, m.favourite, m.wall_status, m.sender_allows_wall
    from public.gif_messages m
   where m.recipient_delegate_id = public.gif_my_delegate_id() and m.hidden_at is null
   order by m.created_at desc
$$;

-- Messages I sent (my own words, with the recipient's name).
create or replace function public.gif_my_sent_messages()
returns table (id uuid, recipient_name text, recipient_staff text, body text, created_at timestamptz, hidden boolean)
language sql stable security definer set search_path = ''
as $$
  select m.id, coalesce(nullif(d.preferred_name, ''), d.full_name), m.recipient_staff, m.body, m.created_at, m.hidden_at is not null
    from public.gif_messages m left join public.gif_delegates d on d.id = m.recipient_delegate_id
   where m.sender_delegate_id = public.gif_my_delegate_id()
   order by m.created_at
$$;

-- Recipient actions: read / unread, favourite, ask for the community wall (needs the sender's consent + admin approval).
create or replace function public.gif_update_received_message(p_id uuid, p_read boolean, p_favourite boolean, p_request_wall boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := public.gif_my_delegate_id(); m record;
begin
  select * into m from public.gif_messages where id = p_id and recipient_delegate_id = me and hidden_at is null;
  if not found then raise exception 'Message not found.' using errcode = '42501'; end if;
  update public.gif_messages set
    read_at = case when p_read is null then read_at when p_read then coalesce(read_at, now()) else null end,
    favourite = coalesce(p_favourite, favourite),
    wall_status = case
      when p_request_wall is true and m.sender_allows_wall and m.wall_status in ('none', 'declined') then 'requested'
      when p_request_wall is false and m.wall_status in ('requested', 'approved') then 'none'
      else wall_status end
   where id = p_id;
end $$;

-- Community wall: messages approved for display (sender allowed it, recipient asked, admin approved). No sender.
create or replace function public.gif_wall_messages()
returns table (id uuid, body text, recipient_first_name text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.body, split_part(coalesce(nullif(d.preferred_name, ''), d.full_name), ' ', 1), m.created_at
    from public.gif_messages m join public.gif_delegates d on d.id = m.recipient_delegate_id
   where (public.gif_my_delegate_id() is not null or public.gif_is_admin())
     and m.wall_status = 'approved' and m.sender_allows_wall and m.hidden_at is null
   order by m.created_at desc
$$;

-- Admin moderation: everything, including the sender (only here).
create or replace function public.gif_admin_messages()
returns table (id uuid, sender_delegate_id uuid, sender_name text, recipient_delegate_id uuid, recipient_name text, recipient_staff text, body text,
               sender_allows_wall boolean, wall_status text, read_at timestamptz, hidden_at timestamptz, hidden_reason text, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.gif_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select m.id, m.sender_delegate_id, s.full_name, m.recipient_delegate_id, r.full_name, m.recipient_staff, m.body,
           m.sender_allows_wall, m.wall_status, m.read_at, m.hidden_at, m.hidden_reason, m.created_at
      from public.gif_messages m join public.gif_delegates s on s.id = m.sender_delegate_id
      left join public.gif_delegates r on r.id = m.recipient_delegate_id
     order by m.created_at desc;
end $$;

create or replace function public.gif_admin_moderate_message(p_id uuid, p_hidden boolean, p_reason text, p_wall_status text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.gif_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_wall_status is not null and p_wall_status not in ('none', 'requested', 'approved', 'declined') then raise exception 'bad wall status'; end if;
  update public.gif_messages set
    hidden_at = case when p_hidden is null then hidden_at when p_hidden then coalesce(hidden_at, now()) else null end,
    hidden_reason = case when p_hidden is true then left(p_reason, 300) when p_hidden is false then null else hidden_reason end,
    wall_status = case when p_wall_status = 'approved' and not sender_allows_wall then wall_status else coalesce(p_wall_status, wall_status) end
   where id = p_id;
  if not found then raise exception 'Message not found.'; end if;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 4. Verification signals (computed from existing records; delegates see their own, admins see all)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.gif_signals_for(p_delegates uuid[])
returns table (delegate_id uuid, user_linked boolean, elco_linked boolean, elco_linked_at timestamptz, elco_practice_30d int, elco_last_active timestamptz,
               pass_exists boolean, pass_onboarded boolean, pass_name boolean, pass_country boolean, pass_role boolean, pass_bio boolean, pass_avatar boolean,
               profile_public boolean, profile_url text, story_by_day jsonb, msg_delegates int, msg_arba int, msg_farrel int)
language sql stable security definer set search_path = ''
as $$
  select d.id, d.user_id is not null,
         l.id is not null, l.created_at, coalesce(s.practice_count_30d, 0), s.last_active_at,
         p.user_id is not null, p.onboarding_completed_at is not null,
         coalesce(btrim(p.display_name), '') <> '', coalesce(btrim(p.country), '') <> '', coalesce(btrim(p.role_status), '') <> '',
         coalesce(btrim(p.bio), '') <> '', coalesce(btrim(p.avatar_url), '') <> '',
         coalesce(p.is_public, false),
         case when d.user_id is not null then 'https://ielsco.com/dashboard/connect/people/' || d.user_id end,
         coalesce((select jsonb_object_agg(x.day, x.n) from (
            select coalesce(f.story_day, 0)::text as day, count(*) as n
              from public.gif_submission_files f join public.gif_submissions sb on sb.id = f.submission_id
             where f.kind = 'story_proof' and sb.delegate_id = d.id group by 1) x), '{}'::jsonb),
         (select count(distinct m.recipient_delegate_id)::int from public.gif_messages m where m.sender_delegate_id = d.id and m.recipient_delegate_id is not null and m.hidden_at is null),
         (select count(*)::int from public.gif_messages m where m.sender_delegate_id = d.id and m.recipient_staff = 'arba' and m.hidden_at is null),
         (select count(*)::int from public.gif_messages m where m.sender_delegate_id = d.id and m.recipient_staff = 'farrel' and m.hidden_at is null)
    from public.gif_delegates d
    left join public.elco_account_links l on l.ielsco_user_id = d.user_id and l.revoked_at is null
    left join public.elco_learning_summaries s on s.ielsco_user_id = d.user_id
    left join public.member_profiles p on p.user_id = d.user_id
   where d.id = any(p_delegates)
$$;
revoke all on function public.gif_signals_for(uuid[]) from public, anon, authenticated;

create or replace function public.gif_my_eligibility_signals()
returns table (delegate_id uuid, user_linked boolean, elco_linked boolean, elco_linked_at timestamptz, elco_practice_30d int, elco_last_active timestamptz,
               pass_exists boolean, pass_onboarded boolean, pass_name boolean, pass_country boolean, pass_role boolean, pass_bio boolean, pass_avatar boolean,
               profile_public boolean, profile_url text, story_by_day jsonb, msg_delegates int, msg_arba int, msg_farrel int)
language sql stable security definer set search_path = ''
as $$ select * from public.gif_signals_for(array[public.gif_my_delegate_id()]) where public.gif_my_delegate_id() is not null $$;

create or replace function public.gif_admin_eligibility_signals()
returns table (delegate_id uuid, user_linked boolean, elco_linked boolean, elco_linked_at timestamptz, elco_practice_30d int, elco_last_active timestamptz,
               pass_exists boolean, pass_onboarded boolean, pass_name boolean, pass_country boolean, pass_role boolean, pass_bio boolean, pass_avatar boolean,
               profile_public boolean, profile_url text, story_by_day jsonb, msg_delegates int, msg_arba int, msg_farrel int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.gif_is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query select * from public.gif_signals_for(array(select d.id from public.gif_delegates d where d.access_granted));
end $$;

-- ---------------------------------------------------------------------------------------------------------------------
-- 5. RLS + privileges
-- ---------------------------------------------------------------------------------------------------------------------
alter table public.gif_eligibility_categories enable row level security;
alter table public.gif_eligibility_requirements enable row level security;
alter table public.gif_eligibility_reviews enable row level security;
alter table public.gif_verification_requests enable row level security;
alter table public.gif_messages enable row level security;
revoke all on public.gif_eligibility_categories, public.gif_eligibility_requirements, public.gif_eligibility_reviews,
  public.gif_verification_requests, public.gif_messages from anon, authenticated;

drop policy if exists "gif elig categories: read" on public.gif_eligibility_categories;
create policy "gif elig categories: read" on public.gif_eligibility_categories for select to authenticated
  using (public.gif_is_admin() or public.gif_my_delegate_id() is not null);
drop policy if exists "gif elig categories: admin update" on public.gif_eligibility_categories;
create policy "gif elig categories: admin update" on public.gif_eligibility_categories for update to authenticated
  using (public.gif_is_admin()) with check (public.gif_is_admin());

drop policy if exists "gif elig requirements: read" on public.gif_eligibility_requirements;
create policy "gif elig requirements: read" on public.gif_eligibility_requirements for select to authenticated
  using (public.gif_is_admin() or (is_active and public.gif_my_delegate_id() is not null));
drop policy if exists "gif elig requirements: admin update" on public.gif_eligibility_requirements;
create policy "gif elig requirements: admin update" on public.gif_eligibility_requirements for update to authenticated
  using (public.gif_is_admin()) with check (public.gif_is_admin());

drop policy if exists "gif elig reviews: own or admin" on public.gif_eligibility_reviews;
create policy "gif elig reviews: own or admin" on public.gif_eligibility_reviews for select to authenticated
  using (public.gif_is_admin() or delegate_id = public.gif_my_delegate_id());
drop policy if exists "gif elig reviews: admin insert" on public.gif_eligibility_reviews;
create policy "gif elig reviews: admin insert" on public.gif_eligibility_reviews for insert to authenticated
  with check (public.gif_is_admin() and assessor_id = (select auth.uid()));

drop policy if exists "gif verification requests: own or admin" on public.gif_verification_requests;
create policy "gif verification requests: own or admin" on public.gif_verification_requests for select to authenticated
  using (public.gif_is_admin() or delegate_id = public.gif_my_delegate_id());
drop policy if exists "gif verification requests: own insert" on public.gif_verification_requests;
create policy "gif verification requests: own insert" on public.gif_verification_requests for insert to authenticated
  with check (delegate_id = public.gif_my_delegate_id());

-- gif_messages: no policies and no privileges for API roles. Access only via the functions above.

grant select on public.gif_eligibility_categories, public.gif_eligibility_requirements, public.gif_eligibility_reviews, public.gif_verification_requests to authenticated;
grant update (title, description, weight, sort_order) on public.gif_eligibility_categories to authenticated;
grant update (title, description, share, window_label, sort_order, is_active) on public.gif_eligibility_requirements to authenticated;
grant insert on public.gif_eligibility_reviews, public.gif_verification_requests to authenticated;

revoke all on function public.gif_message_recipients(), public.gif_send_message(uuid, text, text, boolean), public.gif_my_received_messages(),
  public.gif_my_sent_messages(), public.gif_update_received_message(uuid, boolean, boolean, boolean), public.gif_wall_messages(),
  public.gif_admin_messages(), public.gif_admin_moderate_message(uuid, boolean, text, text), public.gif_my_eligibility_signals(),
  public.gif_admin_eligibility_signals(), public.gif_assignment_label(uuid) from public, anon;
grant execute on function public.gif_message_recipients(), public.gif_send_message(uuid, text, text, boolean), public.gif_my_received_messages(),
  public.gif_my_sent_messages(), public.gif_update_received_message(uuid, boolean, boolean, boolean), public.gif_wall_messages(),
  public.gif_admin_messages(), public.gif_admin_moderate_message(uuid, boolean, text, text), public.gif_my_eligibility_signals(),
  public.gif_admin_eligibility_signals() to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- 6. Seed (idempotent): eligibility tasks (created INACTIVE; 20261124000100 activates them once the new UI is deployed,
--    so the previous UI never counts them as Day 1–4 work), categories, requirements
-- ---------------------------------------------------------------------------------------------------------------------
insert into public.gif_assignments (edition, track, day_number, slug, sort_order, submission_type, title, window_label, purpose, instructions, deliverables, submission_format, fields, rubric, is_active)
select 'GIF 2026', 'eligibility', null, v.slug, v.ord, 'individual', v.title, v.win,
  'Share the GIF story publicly and help the next cohort find GIF Summer 2027.',
  'Create and publish one Instagram Reels for this week of the GIF 2026 / GIF Summer 2027 campaign, following the brief Arba shares for the week. '
  || 'Keep it public, tag @iels.co and @elco.ai, and paste the link below. A Reels counts towards your eligibility once Arba approves it.',
  array['One published Instagram Reels', 'Tag @iels.co and @elco.ai', 'Short caption / description'],
  'Instagram Reels link (public). Optional: upload the video file (MP4/MOV, max 50 MB).',
  $j$[
   {"key":"reels_url","label":"Instagram Reels link","type":"url","required":true,"placeholder":"https://www.instagram.com/reel/…"},
   {"key":"reels_file","label":"Optional: upload the video","type":"files","accept":"video/mp4,video/quicktime","max_files":1},
   {"key":"caption","label":"Caption or short description","type":"textarea","required":true,"max":1000},
   {"key":"brief_confirmed","label":"This Reels is public and tags @iels.co and @elco.ai.","type":"checkbox","required":true}
  ]$j$::jsonb,
  $j$[{"key":"quality","label":"Content quality"},{"key":"creativity","label":"Creativity"},{"key":"relevance","label":"Relevance to GIF / IELSco / Elco AI"},{"key":"storytelling","label":"Storytelling"},{"key":"authenticity","label":"Authenticity"},{"key":"brief","label":"Compliance with the campaign brief"}]$j$::jsonb,
  false
from (values ('reels-1', 1, 'Reels 1', 'Week 2 · December 2026'), ('reels-2', 2, 'Reels 2', 'Week 3 · December 2026'),
             ('reels-3', 3, 'Reels 3', 'Week 4 · December 2026'), ('reels-4', 4, 'Reels 4', 'Week 1 · January 2027')) v(slug, ord, title, win)
on conflict (edition, slug) do nothing;

insert into public.gif_assignments (edition, track, day_number, slug, sort_order, submission_type, title, window_label, purpose, instructions, deliverables, submission_format, fields, rubric, is_active) values
('GIF 2026', 'eligibility', null, 'story-activation', 5, 'individual', 'Instagram Story Activation', 'During the programme · 17–20 November 2026',
 'Show your GIF journey day by day.',
 'Post at least 2 Instagram Stories per day during the programme, mentioning @iels.co and @elco.ai. Upload a screenshot of each Story and pick the day it was posted. Screenshots you already uploaded in Day 1 and Day 4 count too. Stories are tracked separately and never replace the four Reels.',
 array['At least 2 Stories per programme day', 'Mention @iels.co and @elco.ai', 'Screenshot proof of each Story'],
 'Story screenshots (JPG, PNG or WEBP, max 10 MB each). Screenshots are deleted 7 days after upload; your submission stays recorded.',
 $j$[
  {"key":"story_proof","label":"Story screenshots","type":"story_proof","required":true,"min_files":1,"max_files":30,"day_options":[1,2,3,4],"help":"Pick the programme day, then add that day's screenshots."},
  {"key":"mentions_confirmed","label":"My Stories mention @iels.co and @elco.ai.","type":"checkbox","required":true},
  {"key":"note","label":"Anything Arba should know? (optional)","type":"textarea","max":500}
 ]$j$::jsonb,
 $j$[{"key":"consistency","label":"Consistency (2+ per day)"},{"key":"mentions","label":"Mentions @iels.co & @elco.ai"},{"key":"quality","label":"Story quality"}]$j$::jsonb, false),
('GIF 2026', 'eligibility', null, 'fellowship-feedback', 6, 'individual', 'GIF Fellowship Feedback', 'After the programme',
 'Help IELSco make future GIF editions better.',
 'Answer honestly. You can save a draft and come back before you submit.',
 array['Fellowship feedback form'],
 'Ratings, choices and short answers.',
 $j$[
  {"key":"overall_rating","label":"How would you rate your overall GIF experience?","type":"rating","required":true},
  {"key":"memorable_moment","label":"What was your most memorable moment during the programme?","type":"textarea","required":true,"max":1500},
  {"key":"impact_session","label":"Which session or activity had the greatest impact on you?","type":"select","required":true,"options":["Day 1 — One City, Many Stories (Singapore Story Hunt)","Day 2 — From Regional Challenges to Winning Teams","Day 3 — From Evidence to Impact","Day 4 — Our Final Chapter","Mentoring with the NUS Thought Partners","Something else (tell us below)"]},
  {"key":"impact_why","label":"Why did it have that impact?","type":"textarea","required":true,"max":1000},
  {"key":"new_perspectives","label":"What new perspectives or skills did you gain?","type":"textarea","required":true,"max":1500},
  {"key":"cross_country","label":"How did interacting with delegates from other countries influence your thinking?","type":"textarea","required":true,"max":1500},
  {"key":"improvements","label":"What could IELSco improve for future GIF editions?","type":"textarea","required":true,"max":1500},
  {"key":"recommend","label":"Would you recommend GIF to other young people?","type":"select","required":true,"options":["Yes, definitely","Probably","Not sure","Probably not"]},
  {"key":"recommend_why","label":"Why?","type":"textarea","required":true,"max":1000},
  {"key":"future_activities","label":"Would you be interested in joining future IELSco activities?","type":"select","required":true,"options":["Yes — count me in","Maybe, depending on the activity","Not right now"]}
 ]$j$::jsonb,
 $j$[{"key":"completion","label":"Completion"},{"key":"thoughtfulness","label":"Thoughtfulness"}]$j$::jsonb, false),
('GIF 2026', 'eligibility', null, 'letters-to-the-future', 7, 'individual', 'Letters to the Future', 'After the programme',
 'Capture what GIF meant to you, in your own words.',
 'Write from the heart. Save drafts as often as you like. Choose whether your letters stay private (only IELSco administrators can read them) or may be considered for publication; nothing is ever published without separate editorial approval.',
 array['Five short reflections', 'Visibility choice'],
 'Five written answers and a visibility choice.',
 $j$[
  {"key":"experience","label":"My GIF Experience — What is one thing about GIF that you will always remember?","type":"textarea","required":true,"max":1500},
  {"key":"takeaway","label":"My Biggest Takeaway — What is something you learned that you want to carry into your everyday life?","type":"textarea","required":true,"max":1500},
  {"key":"wish_ielsco","label":"My Wish for IELSco — What do you hope IELSco will become in the next few years?","type":"textarea","required":true,"max":1500},
  {"key":"hope_community","label":"My Hope for the Community — What kind of community do you hope we build together?","type":"textarea","required":true,"max":1500},
  {"key":"commitment","label":"My Personal Commitment — How do you want to contribute to positive change after returning home?","type":"textarea","required":true,"max":1500},
  {"key":"visibility","label":"Who can see these letters?","type":"select","required":true,"options":["Private — only IELSco administrators","Public — may be considered for publication (separate editorial approval)"]}
 ]$j$::jsonb,
 $j$[{"key":"reflection","label":"Reflection quality"},{"key":"completion","label":"Completion"}]$j$::jsonb, false)
on conflict (edition, slug) do nothing;

insert into public.gif_eligibility_categories (edition, key, title, description, weight, sort_order) values
  ('GIF 2026', 'content', 'Content Creation & Social Media Campaign', 'Four campaign Reels and your Instagram Story activation.', 30, 1),
  ('GIF 2026', 'assignments', 'Group Assignments & Individual Reflections', 'Your team''s Day 2 and Day 3 projects and your own two reflections.', 25, 2),
  ('GIF 2026', 'community', 'Fellowship Feedback & Community Contributions', 'Feedback, Letters to the Future and Words We Leave Behind.', 20, 3),
  ('GIF 2026', 'elco_ai', 'Elco AI Participation', 'Create, link and start using your Elco AI account.', 10, 4),
  ('GIF 2026', 'elco_pass', 'Elco-Pass & Public Profile Activation', 'Activate your Elco-Pass and make your profile public.', 15, 5)
on conflict (edition, key) do nothing;

insert into public.gif_eligibility_requirements (edition, category_key, key, title, description, source, assignment_id, share, window_label, sort_order)
select 'GIF 2026', v.cat, v.key, v.title, v.descr, 'assignment', a.id, 1, a.window_label, v.ord
  from (values
    ('content', 'reels_1', 'Reels 1', 'Campaign Reels for week 2 of December 2026.', 'reels-1', 1),
    ('content', 'reels_2', 'Reels 2', 'Campaign Reels for week 3 of December 2026.', 'reels-2', 2),
    ('content', 'reels_3', 'Reels 3', 'Campaign Reels for week 4 of December 2026.', 'reels-3', 3),
    ('content', 'reels_4', 'Reels 4', 'Campaign Reels for week 1 of January 2027.', 'reels-4', 4),
    ('content', 'stories', 'Instagram Story Activation', 'At least 2 Stories a day during the programme, mentioning @iels.co and @elco.ai.', 'story-activation', 5),
    ('assignments', 'day2_group', 'Day 2 group project', 'Team identity, SDG 4 challenge, problem, root cause, evidence and solution direction.', 'day2-group-project', 1),
    ('assignments', 'day3_group', 'Day 3 group project', 'Validated problem, solution, prototype, impact and final pitch.', 'day3-group-project', 2),
    ('assignments', 'day2_reflection', 'Day 2 individual reflection', 'Your most important insight from Day 2.', 'day2-individual-reflection', 3),
    ('assignments', 'day3_reflection', 'Day 3 individual reflection', 'Your contribution and what you learned on Day 3.', 'day3-individual-reflection', 4),
    ('community', 'feedback', 'GIF Fellowship Feedback', 'The built-in feedback form.', 'fellowship-feedback', 1),
    ('community', 'letters', 'Letters to the Future', 'Five reflections on your GIF journey.', 'letters-to-the-future', 2)
  ) v(cat, key, title, descr, slug, ord)
  join public.gif_assignments a on a.edition = 'GIF 2026' and a.slug = v.slug
on conflict (edition, key) do nothing;

insert into public.gif_eligibility_requirements (edition, category_key, key, title, description, source, share, sort_order) values
  ('GIF 2026', 'community', 'messages', 'Words We Leave Behind', 'At least 5 anonymous messages: 3 fellow delegates, Arba and Farrel.', 'messages', 1, 3),
  ('GIF 2026', 'elco_ai', 'elco_ai', 'Elco AI activation', 'Create your Elco AI account, link it to IELSco, complete onboarding and explore.', 'elco_ai', 1, 1),
  ('GIF 2026', 'elco_pass', 'elco_pass', 'Elco-Pass activation', 'Create your Elco-Pass and complete the required profile information.', 'elco_pass', 1, 1),
  ('GIF 2026', 'elco_pass', 'public_profile', 'Public profile', 'Set your profile to Public so the GIF community can find you.', 'public_profile', 1, 2)
on conflict (edition, key) do nothing;
