-- Rollback for 20261104000000_platform_saved_and_cancel.sql. Run manually (SQL editor), only if needed.
-- Story/event bookmarks are deleted first, because the original constraint does not allow them.
begin;
delete from public.member_bookmarks where item_type not in ('resource', 'collection');
alter table public.member_bookmarks drop constraint if exists member_bookmarks_item_type_allowed;
alter table public.member_bookmarks add constraint member_bookmarks_item_type_check check (item_type in ('resource', 'collection'));
drop policy if exists "event_registrations_delete_own" on public.event_registrations;
revoke delete on public.event_registrations from authenticated;
commit;
