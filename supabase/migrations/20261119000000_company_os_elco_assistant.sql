-- Company OS: Elco Assistant (the Company OS AI assistant; not the Elco AI company).
--
-- Additive and idempotent:
--   * os_ai_actions.action_type accepts the kinds the assistant already proposes but the database refused to store
--     (assign_task, create_recruitment_task, schedule_interview: their proposals were silently dropped), plus the new
--     update_tasks. create_project stays.
--   * os_create_tasks takes up to 30 tasks in one all-or-nothing batch (was 10, which split long work lists).
--   * an index for reading a conversation's actions in order (the assistant's memory of "those" and "continue").
-- No data is changed and no permission is widened: every function still runs as the signed-in person (SECURITY
-- INVOKER), so RLS, column grants and triggers decide exactly as before.

do $$ begin
  alter table public.os_ai_actions drop constraint if exists os_ai_actions_action_type_check;
  alter table public.os_ai_actions add constraint os_ai_actions_action_type_check check (action_type in (
    'create_task', 'create_tasks', 'update_task_status', 'create_project', 'add_comment', 'log_kpi_value', 'create_partnership',
    'create_event', 'create_timeline_item', 'draft_document', 'create_campaign', 'create_content_items', 'move_event', 'invite_to_event',
    'assign_task', 'update_tasks', 'create_recruitment_task', 'schedule_interview'));
end $$;

create index if not exists os_ai_actions_conversation_idx on public.os_ai_actions (conversation_id, created_at);

create or replace function public.os_create_tasks(p_tasks jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare t jsonb; a text; new_id text; out jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_tasks) is distinct from 'array' or jsonb_array_length(p_tasks) not between 1 and 30 then
    raise exception 'Between 1 and 30 tasks' using errcode = '22023';
  end if;
  for t in select value from jsonb_array_elements(p_tasks) loop
    insert into public.os_tasks (title, company_code, division_id, project_id, timeline_item_id, owner_person_id, due_date, priority, description)
    values (t->>'title', t->>'company_code', nullif(t->>'division_id', ''), nullif(t->>'project_id', ''), nullif(t->>'timeline_item_id', ''),
            nullif(t->>'owner_person_id', ''), nullif(t->>'due_date', '')::date, coalesce(nullif(t->>'priority', ''), 'P3 Normal'), nullif(t->>'description', ''))
    returning id into new_id;
    for a in select jsonb_array_elements_text(coalesce(t->'assignees', '[]'::jsonb)) loop
      insert into public.os_task_assignees (task_id, person_id) values (new_id, a) on conflict do nothing;
    end loop;
    out := out || jsonb_build_array(jsonb_build_object('id', new_id, 'title', t->>'title'));
  end loop;
  return out;
end $$;
revoke all on function public.os_create_tasks(jsonb) from public, anon;
grant execute on function public.os_create_tasks(jsonb) to authenticated;
