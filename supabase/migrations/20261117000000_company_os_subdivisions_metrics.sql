-- Company OS: subdivisions inside a division, and division metrics.
--
-- Additive only. No subdivision is created here: a division's lead (or a founder) names them in the workspace, so the
-- structure is whatever the organisation actually has. Existing KPIs are not assigned to divisions here either; a
-- founder assigns each one from the workspace.
--
--   os_subdivisions          a named group inside one division, with an optional lead
--   os_subdivision_members   who is in it (only people who already belong to the division's workspace)
--   os_tasks.subdivision_id  an optional tag; always a subdivision of the task's own division
--
-- Safe to run more than once.

-- ── Tables ─────────────────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.os_subdivisions (
  id              bigint generated always as identity primary key,
  division_id     text not null references public.os_divisions (id),
  name            text not null check (length(trim(name)) between 1 and 80),
  description     text check (description is null or length(description) <= 500),
  lead_person_id  text references public.os_people (id) on delete set null,
  active          boolean not null default true,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists os_subdivisions_name_idx on public.os_subdivisions (division_id, lower(trim(name)));

create table if not exists public.os_subdivision_members (
  subdivision_id  bigint not null references public.os_subdivisions (id) on delete cascade,
  person_id       text not null references public.os_people (id) on delete cascade,
  added_by        text,
  added_at        timestamptz not null default now(),
  primary key (subdivision_id, person_id)
);
create index if not exists os_subdivision_members_person_idx on public.os_subdivision_members (person_id);

alter table public.os_tasks add column if not exists subdivision_id bigint references public.os_subdivisions (id) on delete set null;
create index if not exists os_tasks_subdivision_idx on public.os_tasks (subdivision_id) where subdivision_id is not null;

-- ── Rules ──────────────────────────────────────────────────────────────────────────────────────────────────────────

-- Someone belongs to a division's workspace when they are an active staff member of the division or hold a live
-- workspace role there. Used to check who can be put in a subdivision; it says nothing about the caller.
create or replace function public.os_person_in_workspace(p_person text, p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_people p where p.id = p_person and p.org_role <> 'guest' and p.status in ('active', 'onboarding'))
     and (exists (select 1 from public.os_person_divisions d where d.person_id = p_person and d.division_id = p_division)
          or exists (select 1 from public.os_workspace_roles r where r.person_id = p_person and r.division_id = p_division
                     and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())))
$$;
revoke all on function public.os_person_in_workspace(text, text) from public, anon, authenticated;

create or replace function public.os_subdivisions_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := public.os_current_person();
    new.created_at := now();
  else
    new.division_id := old.division_id; new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  new.name := trim(new.name);
  new.updated_at := now();
  if new.lead_person_id is not null and (tg_op = 'INSERT' or new.lead_person_id is distinct from old.lead_person_id)
     and not public.os_person_in_workspace(new.lead_person_id, new.division_id) then
    raise exception 'The lead must already be in this division' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.os_subdivisions_before_write() from public, anon, authenticated;
drop trigger if exists os_subdivisions_a_rules on public.os_subdivisions;
create trigger os_subdivisions_a_rules before insert or update on public.os_subdivisions for each row execute function public.os_subdivisions_before_write();

create or replace function public.os_subdivision_members_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  select division_id, active into s from public.os_subdivisions where id = new.subdivision_id;
  if s is null then raise exception 'Unknown subdivision' using errcode = '23503'; end if;
  if not s.active then raise exception 'This subdivision is archived' using errcode = '23514'; end if;
  if not public.os_person_in_workspace(new.person_id, s.division_id) then
    raise exception 'Only people already in this division can join its subdivisions' using errcode = '23514';
  end if;
  new.added_by := public.os_current_person();
  new.added_at := now();
  return new;
end $$;
revoke all on function public.os_subdivision_members_before_write() from public, anon, authenticated;
drop trigger if exists os_subdivision_members_a_rules on public.os_subdivision_members;
create trigger os_subdivision_members_a_rules before insert on public.os_subdivision_members for each row execute function public.os_subdivision_members_before_write();

-- A task's subdivision is always one of its own division's. Runs after os_tasks_a_rules, which settles the division.
-- Moving a task to another division clears a subdivision that no longer fits.
create or replace function public.os_tasks_subdivision_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if new.subdivision_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.subdivision_id is not distinct from old.subdivision_id then
    if new.division_id is distinct from old.division_id then new.subdivision_id := null; end if;
    return new;
  end if;
  select division_id, active into s from public.os_subdivisions where id = new.subdivision_id;
  if s is null or s.division_id is distinct from new.division_id then
    raise exception 'That subdivision belongs to another division' using errcode = '23514';
  end if;
  if not s.active then raise exception 'This subdivision is archived' using errcode = '23514'; end if;
  return new;
end $$;
revoke all on function public.os_tasks_subdivision_rule() from public, anon, authenticated;
drop trigger if exists os_tasks_b_subdivision on public.os_tasks;
create trigger os_tasks_b_subdivision before insert or update on public.os_tasks for each row execute function public.os_tasks_subdivision_rule();

-- ── Audit ──────────────────────────────────────────────────────────────────────────────────────────────────────────

drop trigger if exists os_subdivisions_audit on public.os_subdivisions;
create trigger os_subdivisions_audit after insert or update or delete on public.os_subdivisions for each row execute function public.os_audit_row();
drop trigger if exists os_subdivision_members_audit on public.os_subdivision_members;
create trigger os_subdivision_members_audit after insert or update or delete on public.os_subdivision_members for each row execute function public.os_audit_row();

-- ── Row level security ─────────────────────────────────────────────────────────────────────────────────────────────

alter table public.os_subdivisions enable row level security;
alter table public.os_subdivision_members enable row level security;
revoke all on public.os_subdivisions, public.os_subdivision_members from anon, authenticated;
grant select on public.os_subdivisions, public.os_subdivision_members to authenticated;
grant insert (division_id, name, description, lead_person_id), update (name, description, lead_person_id, active) on public.os_subdivisions to authenticated;
grant insert (subdivision_id, person_id), delete on public.os_subdivision_members to authenticated;
grant insert (subdivision_id), update (subdivision_id) on public.os_tasks to authenticated;

-- An open division's subdivisions are visible to all staff, like its projects and tasks, so a task can be tagged by
-- whoever may edit it. A restricted division's are visible only to people who can open that workspace. The division's
-- lead (or a founder) manages them.
create or replace function public.os_subdivision_visible(p_division text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_workspace_access(p_division, 'view')
      or (public.os_current_person() is not null and public.os_is_staff() and not public.os_division_restricted(p_division))
$$;
revoke all on function public.os_subdivision_visible(text) from public, anon;
grant execute on function public.os_subdivision_visible(text) to authenticated;
drop policy if exists os_subdivisions_read on public.os_subdivisions;
create policy os_subdivisions_read on public.os_subdivisions for select to authenticated using (public.os_subdivision_visible(division_id));
drop policy if exists os_subdivisions_insert on public.os_subdivisions;
create policy os_subdivisions_insert on public.os_subdivisions for insert to authenticated with check (public.os_workspace_lead(division_id));
drop policy if exists os_subdivisions_update on public.os_subdivisions;
create policy os_subdivisions_update on public.os_subdivisions for update to authenticated
  using (public.os_workspace_lead(division_id)) with check (public.os_workspace_lead(division_id));

drop policy if exists os_subdivision_members_read on public.os_subdivision_members;
create policy os_subdivision_members_read on public.os_subdivision_members for select to authenticated
  using (exists (select 1 from public.os_subdivisions s where s.id = subdivision_id and public.os_subdivision_visible(s.division_id)));
drop policy if exists os_subdivision_members_insert on public.os_subdivision_members;
create policy os_subdivision_members_insert on public.os_subdivision_members for insert to authenticated
  with check (exists (select 1 from public.os_subdivisions s where s.id = subdivision_id and public.os_workspace_lead(s.division_id)));
drop policy if exists os_subdivision_members_delete on public.os_subdivision_members;
create policy os_subdivision_members_delete on public.os_subdivision_members for delete to authenticated
  using (exists (select 1 from public.os_subdivisions s where s.id = subdivision_id and public.os_workspace_lead(s.division_id)));
