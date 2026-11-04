-- Rollback for 20261105000000_elco_benefits.sql (run manually, then delete the migration's row from
-- supabase_migrations.schema_migrations). Restores the 20261026 session functions verbatim.
drop trigger if exists elco_benefits_follow_link on public.elco_account_links;
drop function if exists public.elco_benefits_follow_link();
drop function if exists public.my_elco_benefits();
drop function if exists public.elco_benefit_allows(uuid, text);
drop function if exists public.elco_benefit_used(uuid, text);
drop function if exists public.elco_benefit_now(uuid);
drop function if exists public.apply_elco_benefit(uuid, uuid, bigint, uuid, uuid, text, text, text, timestamptz, timestamptz, int, int, text);
drop table if exists public.elco_benefit_events, public.elco_benefit_grants;
delete from public.member_sessions where kind = 'mentoring';
alter table public.member_sessions drop constraint if exists member_sessions_kind_check;
alter table public.member_sessions add constraint member_sessions_kind_check
  check (kind in ('application_clinic', 'workshop', 'speaking_club', 'qna', 'networking'));

create or replace function public.register_member_session(p_session uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare s public.member_sessions%rowtype; taken int;
begin
  if (select auth.uid()) is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into s from public.member_sessions where id = p_session and status = 'scheduled' for update;
  if not found or s.starts_at < now() then raise exception 'this session is not open for registration' using errcode = 'P0001'; end if;
  if s.members_only and not public.is_active_member() then raise exception 'members_only' using errcode = '42501'; end if;
  if exists (select 1 from public.member_session_registrations where session_id = p_session and user_id = (select auth.uid())) then
    return 'already_registered';
  end if;
  select count(*) into taken from public.member_session_registrations where session_id = p_session;
  if s.capacity is not null and taken >= s.capacity then raise exception 'full' using errcode = 'P0001'; end if;
  insert into public.member_session_registrations (session_id, user_id) values (p_session, (select auth.uid()));
  return 'registered';
end $$;
revoke all on function public.register_member_session(uuid) from public, anon;
grant execute on function public.register_member_session(uuid) to authenticated;

create or replace function public.member_session_join_url(p_session uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.join_url from public.member_sessions s
   where s.id = p_session and s.status = 'scheduled'
     and exists (select 1 from public.member_session_registrations r where r.session_id = s.id and r.user_id = (select auth.uid()))
     and (not s.members_only or public.is_active_member())
$$;
revoke all on function public.member_session_join_url(uuid) from public, anon;
grant execute on function public.member_session_join_url(uuid) to authenticated;
