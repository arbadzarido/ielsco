-- ROLLBACK for 20261029000000_circles.sql. Emergency only: deletes the themed Circles, their members and all posts.
-- Restores the report-context list Connect shipped with. Run before ROLLBACK-20261028-connect.sql if both are needed.
begin;
drop function if exists public.remove_circle_post(uuid);
drop function if exists public.post_circle(text, text, uuid, boolean);
drop function if exists public.list_circle_posts(text, timestamptz, int);
drop function if exists public.leave_circle(text);
drop function if exists public.join_circle(text);
drop function if exists public.list_circles();
drop function if exists public.circle_member(text, uuid);
drop table if exists public.circle_posts cascade;
drop table if exists public.circle_members cascade;
drop table if exists public.circles cascade;
update public.connect_reports set context = 'profile' where context = 'circle';
alter table public.connect_reports drop constraint if exists connect_reports_context_check;
alter table public.connect_reports add constraint connect_reports_context_check
  check (context in ('profile', 'request', 'message', 'call', 'room'));
delete from supabase_migrations.schema_migrations where version = '20261029000000';
commit;
