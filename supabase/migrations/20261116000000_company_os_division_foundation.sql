-- Company OS division foundation (additive; can be re-run).
--   1. Comments: replies and @mentions. A mention tells the person there is a comment and where; it never carries the
--      record's title or the comment text, so someone without access learns nothing (the link is still decided by RLS).
--   2. Meetings: agenda, objectives, decisions, a minutes workflow (Scheduled → Held → Minutes draft → In review →
--      Approved), a link to the calendar event and project, and action items that become tasks exactly once.
-- No existing row is changed: new columns are nullable or defaulted, and existing meetings stay "Held".

-- ── 1. Comments: replies and mentions ────────────────────────────────────────────────────────────────────
alter table public.os_comments add column if not exists parent_id bigint references public.os_comments (id) on delete set null;
alter table public.os_comments add column if not exists mentions text[] not null default '{}';
create index if not exists os_comments_parent_idx on public.os_comments (parent_id) where parent_id is not null;
grant insert (parent_id, mentions) on public.os_comments to authenticated;

-- Replies stay on the same record, one level deep; mentions keep only real, active staff, at most 20.
create or replace function public.os_comments_shape() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  if new.parent_id is not null then
    select entity_type, entity_id, parent_id into p from public.os_comments where id = new.parent_id;
    if p is null or p.entity_type <> new.entity_type or p.entity_id <> new.entity_id then
      raise exception 'A reply stays on the same record' using errcode = '23514';
    end if;
    if p.parent_id is not null then new.parent_id := p.parent_id; end if;
  end if;
  new.mentions := coalesce((select array_agg(distinct m) from (
    select m from unnest(coalesce(new.mentions, '{}')) m
    join public.os_people x on x.id = m and x.status in ('active', 'onboarding') and x.org_role <> 'guest' limit 20) s), '{}');
  return new;
end $$;
revoke all on function public.os_comments_shape() from public, anon, authenticated;
drop trigger if exists os_comments_c_shape on public.os_comments;
create trigger os_comments_c_shape before insert on public.os_comments for each row execute function public.os_comments_shape();

do $$ begin
  alter table public.os_notifications drop constraint if exists os_notifications_kind_check;
  alter table public.os_notifications add constraint os_notifications_kind_check check (kind in
    ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed', 'candidate_new', 'candidate_assigned',
     'access_requested', 'access_decided', 'request_new', 'request_approval', 'request_update', 'finance_update', 'legal_update', 'legal_reminder',
     'mention', 'comment_reply', 'meeting_update'));
  alter table public.os_notifications drop constraint if exists os_notifications_entity_type_check;
  alter table public.os_notifications add constraint os_notifications_entity_type_check check (entity_type in
    ('event', 'task', 'candidate', 'access_request', 'request', 'transaction', 'budget', 'letter', 'agreement', 'compliance',
     'project', 'document', 'partnership', 'decision', 'meeting', 'campaign', 'objective', 'kpi', 'product', 'timeline', 'campaign_plan'));
end $$;

create or replace function public.os_comments_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare who text; author text := public.os_current_person(); parent_author text;
  name text := coalesce((select coalesce(short_name, full_name) from public.os_people where id = author), 'Someone');
begin
  foreach who in array new.mentions loop
    perform public.os_notify(who, 'mention', new.entity_type, new.entity_id, name || ' mentioned you in a comment', null, 'mention:' || new.id || ':' || who);
  end loop;
  if new.parent_id is not null then
    select author_person_id into parent_author from public.os_comments where id = new.parent_id;
    if parent_author is not null and not (parent_author = any (new.mentions)) then
      perform public.os_notify(parent_author, 'comment_reply', new.entity_type, new.entity_id, name || ' replied to your comment', null, 'reply:' || new.id || ':' || parent_author);
    end if;
  end if;
  return null;
end $$;
revoke all on function public.os_comments_notify() from public, anon, authenticated;
drop trigger if exists os_comments_notify on public.os_comments;
create trigger os_comments_notify after insert on public.os_comments for each row execute function public.os_comments_notify();

-- ── 2. Meetings and minutes ──────────────────────────────────────────────────────────────────────────────
alter table public.os_meetings add column if not exists status text not null default 'Held';
alter table public.os_meetings add column if not exists agenda text;
alter table public.os_meetings add column if not exists objectives text;
alter table public.os_meetings add column if not exists decisions text;
alter table public.os_meetings add column if not exists event_id text references public.os_events (id) on delete set null;
alter table public.os_meetings add column if not exists project_id text references public.os_projects (id) on delete set null;
alter table public.os_meetings add column if not exists reviewer_person_id text references public.os_people (id) on delete set null;
alter table public.os_meetings add column if not exists minutes_approved_by text references public.os_people (id) on delete set null;
alter table public.os_meetings add column if not exists minutes_approved_at timestamptz;
do $$ begin
  alter table public.os_meetings drop constraint if exists os_meetings_status_check;
  alter table public.os_meetings add constraint os_meetings_status_check check (status in ('Scheduled', 'Held', 'Minutes draft', 'In review', 'Approved'));
end $$;
-- Status and approval move only through os_meeting_act; everything else is ordinary editing.
grant insert (agenda, objectives, decisions, event_id, project_id, reviewer_person_id),
      update (agenda, objectives, decisions, event_id, project_id, reviewer_person_id)
  on public.os_meetings to authenticated;

create or replace function public.os_meetings_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.os_caller_is_privileged() or coalesce(current_setting('os.meeting_act', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'Scheduled'; new.minutes_approved_by := null; new.minutes_approved_at := null;
    if new.held_on <= (now() at time zone 'Asia/Jakarta')::date then new.status := 'Held'; end if;
  else
    new.status := old.status; new.minutes_approved_by := old.minutes_approved_by; new.minutes_approved_at := old.minutes_approved_at;
    if old.status = 'Approved' and (new.notes, new.decisions, new.agenda, new.objectives, new.title, new.held_on)
       is distinct from (old.notes, old.decisions, old.agenda, old.objectives, old.title, old.held_on) then
      raise exception 'Approved minutes can''t be changed. Reopen them first.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.os_meetings_guard() from public, anon, authenticated;
drop trigger if exists os_meetings_c_guard on public.os_meetings;
create trigger os_meetings_c_guard before insert or update on public.os_meetings for each row execute function public.os_meetings_guard();

-- Who may approve minutes: the named reviewer, else the division's lead (founders always), never the person who wrote them
-- unless they are a founder approving a founders' meeting with no one else to ask.
create or replace function public.os_meeting_act(p_id text, p_action text) returns text
language plpgsql security definer set search_path = '' as $$
declare m public.os_meetings; me text := public.os_current_person(); nxt text; can_edit boolean; can_approve boolean;
begin
  select * into m from public.os_meetings where id = p_id for update;
  if m.id is null or me is null or not public.os_can_view(m.company_code, m.division_id, m.sensitivity, 'project', '') then
    raise exception 'Meeting not found' using errcode = '42501';
  end if;
  can_edit := m.created_by = me or m.facilitator_person_id = me or public.os_can_edit(m.company_code, m.division_id, m.sensitivity, 'project', '');
  can_approve := (m.reviewer_person_id = me or (m.reviewer_person_id is null and (public.os_is_founder()
    or (m.division_id is not null and public.os_workspace_lead(m.division_id))))) and (m.created_by is distinct from me or public.os_is_founder());
  if p_action = 'hold' and m.status = 'Scheduled' and can_edit then nxt := 'Held';
  elsif p_action = 'draft' and m.status in ('Scheduled', 'Held') and can_edit then nxt := 'Minutes draft';
  elsif p_action = 'submit' and m.status in ('Held', 'Minutes draft') and can_edit then
    if length(trim(coalesce(m.notes, ''))) < 10 then raise exception 'Write the minutes before sending them for review' using errcode = '23514'; end if;
    nxt := 'In review';
  elsif p_action = 'approve' and m.status = 'In review' and can_approve then nxt := 'Approved';
  elsif p_action = 'return' and m.status = 'In review' and (can_approve or m.reviewer_person_id = me) then nxt := 'Minutes draft';
  elsif p_action = 'reopen' and m.status = 'Approved' and can_approve then nxt := 'Minutes draft';
  else raise exception 'That step isn''t available for this meeting' using errcode = '42501';
  end if;
  perform set_config('os.meeting_act', '1', true);
  update public.os_meetings set status = nxt,
    minutes_approved_by = case when nxt = 'Approved' then me else null end,
    minutes_approved_at = case when nxt = 'Approved' then now() else null end where id = p_id;
  perform set_config('os.meeting_act', '', true);
  if nxt = 'In review' then
    perform public.os_notify(m.reviewer_person_id, 'meeting_update', 'meeting', m.id, 'Minutes waiting for your review', null, 'mtg:' || m.id || ':review:' || now()::date);
  elsif nxt in ('Approved', 'Minutes draft') and p_action in ('approve', 'return') then
    perform public.os_notify(m.created_by, 'meeting_update', 'meeting', m.id, case when nxt = 'Approved' then 'Minutes approved' else 'Minutes returned for changes' end, null, 'mtg:' || m.id || ':' || p_action || ':' || now()::date);
  end if;
  return nxt;
end $$;
revoke all on function public.os_meeting_act(text, text) from public, anon;
grant execute on function public.os_meeting_act(text, text) to authenticated;

-- Action items: what was agreed, who owns it, when. One becomes one task; the link is kept so it can't be made twice.
create table if not exists public.os_meeting_actions (
  id              bigint generated always as identity primary key,
  meeting_id      text not null references public.os_meetings (id) on delete cascade,
  body            text not null check (length(trim(body)) between 3 and 500),
  owner_person_id text references public.os_people (id) on delete set null,
  due_date        date,
  task_id         text unique references public.os_tasks (id) on delete set null,
  created_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists os_meeting_actions_meeting_idx on public.os_meeting_actions (meeting_id);
alter table public.os_meeting_actions enable row level security;
revoke all on public.os_meeting_actions from anon, authenticated;
grant select, delete on public.os_meeting_actions to authenticated;
grant insert (meeting_id, body, owner_person_id, due_date), update (body, owner_person_id, due_date) on public.os_meeting_actions to authenticated;

create or replace function public.os_meeting_can_edit(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_meetings m where m.id = p_id and (m.created_by = public.os_current_person()
    or m.facilitator_person_id = public.os_current_person() or public.os_can_edit(m.company_code, m.division_id, m.sensitivity, 'project', '')))
$$;
revoke all on function public.os_meeting_can_edit(text) from public, anon;
grant execute on function public.os_meeting_can_edit(text) to authenticated;

create or replace function public.os_meeting_actions_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.created_by := public.os_current_person(); new.created_at := now(); new.task_id := null; end if;
  return new;
end $$;
revoke all on function public.os_meeting_actions_stamp() from public, anon, authenticated;
drop trigger if exists os_meeting_actions_stamp on public.os_meeting_actions;
create trigger os_meeting_actions_stamp before insert on public.os_meeting_actions for each row execute function public.os_meeting_actions_stamp();

drop policy if exists os_meeting_actions_read on public.os_meeting_actions;
create policy os_meeting_actions_read on public.os_meeting_actions for select to authenticated using (public.os_can_view_entity('meeting', meeting_id));
drop policy if exists os_meeting_actions_insert on public.os_meeting_actions;
create policy os_meeting_actions_insert on public.os_meeting_actions for insert to authenticated with check (public.os_meeting_can_edit(meeting_id));
drop policy if exists os_meeting_actions_update on public.os_meeting_actions;
create policy os_meeting_actions_update on public.os_meeting_actions for update to authenticated
  using (public.os_meeting_can_edit(meeting_id)) with check (public.os_meeting_can_edit(meeting_id));
drop policy if exists os_meeting_actions_delete on public.os_meeting_actions;
create policy os_meeting_actions_delete on public.os_meeting_actions for delete to authenticated using (task_id is null and public.os_meeting_can_edit(meeting_id));

-- Turns an action item into a task in the meeting's company, division and project, owned by the action's owner.
-- Returns the existing task if it was already made.
create or replace function public.os_meeting_action_to_task(p_action bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare a public.os_meeting_actions; m public.os_meetings; tid text;
begin
  select * into a from public.os_meeting_actions where id = p_action for update;
  if a.id is null or not public.os_meeting_can_edit(a.meeting_id) then raise exception 'Action item not found' using errcode = '42501'; end if;
  if a.task_id is not null then return a.task_id; end if;
  select * into m from public.os_meetings where id = a.meeting_id;
  insert into public.os_tasks (title, description, status, priority, owner_person_id, company_code, division_id, project_id, due_date, sensitivity,
    no_deadline_reason)
  values (left(a.body, 200), 'From meeting ' || m.id || ': ' || m.title, 'Ready', 'P3 Normal', coalesce(a.owner_person_id, public.os_current_person()),
    m.company_code, m.division_id, m.project_id, a.due_date, m.sensitivity, case when a.due_date is null then 'Set in the meeting without a date' end)
  returning id into tid;
  if a.owner_person_id is not null then insert into public.os_task_assignees (task_id, person_id) values (tid, a.owner_person_id) on conflict do nothing; end if;
  update public.os_meeting_actions set task_id = tid where id = a.id;
  return tid;
end $$;
revoke all on function public.os_meeting_action_to_task(bigint) from public, anon;
grant execute on function public.os_meeting_action_to_task(bigint) to authenticated;

do $$ begin
  if to_regprocedure('public.os_audit_row()') is not null then
    drop trigger if exists os_meeting_actions_audit on public.os_meeting_actions;
    create trigger os_meeting_actions_audit after insert or update or delete on public.os_meeting_actions for each row execute function public.os_audit_row();
  end if;
end $$;
