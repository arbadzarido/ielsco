-- Platform restructure (docs/IELSCO-PRODUCT-ARCHITECTURE.md): two small, additive changes. Idempotent, safe to re-run.
-- Rollback: supabase/manual/ROLLBACK-20261104-platform.sql.
--
-- 1. Unified Saved: member_bookmarks may also hold stories (IELSco Stories / Member Stories) and official events.
--    The original column check allowed only 'resource' and 'collection'. Existing rows are untouched.
-- 2. Members may cancel their own registration for an official event (event_registrations had no delete policy), but
--    never one already marked attended, so attendance history can't be erased this way. Event dates live in
--    src/data/events.ts, not in the database, so "only before the event" is enforced by the app.

do $$
declare c record;
begin
  -- Drop whichever check constraint currently limits item_type (its generated name may differ per database).
  for c in
    select con.conname from pg_constraint con
     where con.conrelid = 'public.member_bookmarks'::regclass and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%item_type%'
       and con.conname <> 'member_bookmarks_item_type_allowed'
  loop
    execute format('alter table public.member_bookmarks drop constraint %I', c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.member_bookmarks'::regclass and conname = 'member_bookmarks_item_type_allowed') then
    alter table public.member_bookmarks add constraint member_bookmarks_item_type_allowed
      check (item_type in ('resource', 'collection', 'story', 'event'));
  end if;
end $$;

drop policy if exists "event_registrations_delete_own" on public.event_registrations;
create policy "event_registrations_delete_own" on public.event_registrations
  for delete to authenticated using (auth.uid() = user_id and attended = false);
grant delete on public.event_registrations to authenticated;
