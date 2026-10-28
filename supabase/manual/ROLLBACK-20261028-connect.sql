-- ROLLBACK for 20261028000000_connect_core.sql, 20261028010000_connect_rooms.sql and 20261028020000_connect_quick_match.sql.
-- Only for an emergency: it deletes everything IELSco Connect created, including Passport answers (the added
-- member_profiles columns), intros, connections, messages, blocks, reports, rooms, registrations and call records.
-- The rest of member_profiles (and every other existing table) is left as it was. Run in Supabase → SQL Editor, then
-- redeploy a commit that doesn't use Connect. Run THIS before ROLLBACK-20261026-membership-platform.sql if both are
-- ever needed: Connect's staff policies use public.is_site_admin(), which that script drops.
begin;
alter table public.member_profiles drop constraint if exists member_profiles_passport_values;
drop table if exists public.connect_call_signals cascade;
drop table if exists public.connect_calls cascade;
drop table if exists public.connect_match_queue cascade;
drop table if exists public.connect_prompts cascade;
drop table if exists public.connect_settings cascade;
drop table if exists public.connect_room_registrations cascade;
drop table if exists public.connect_rooms cascade;
drop table if exists public.connect_reports cascade;
drop table if exists public.connect_message_reads cascade;
drop table if exists public.connect_messages cascade;
drop table if exists public.connect_requests cascade;
drop table if exists public.connect_connections cascade;
drop table if exists public.connect_blocks cascade;

drop function if exists public.quick_match_feedback(uuid, boolean, boolean);
drop function if exists public.quick_match_end(uuid, text);
drop function if exists public.quick_match_signals(uuid, bigint);
drop function if exists public.quick_match_signal(uuid, text, jsonb);
drop function if exists public.quick_match_call(uuid);
drop function if exists public.quick_match_leave();
drop function if exists public.quick_match_join(text, text);
drop function if exists public.quick_match_poll();
drop function if exists public.connect_active_call(uuid);
drop function if exists public.connect_expire_calls(uuid);
drop function if exists public.quick_match_enabled();
drop function if exists public.connect_room_participants(uuid);
drop function if exists public.connect_room_meeting(uuid);
drop function if exists public.cancel_connect_room_registration(uuid);
drop function if exists public.register_connect_room(uuid);
drop function if exists public.set_connect_room_status(uuid, text);
drop function if exists public.save_connect_room(uuid, jsonb);
drop function if exists public.get_connect_room(uuid);
drop function if exists public.list_connect_rooms(text, text, text, boolean, int, int);
drop function if exists public.connect_summary();
drop function if exists public.report_member(uuid, text, text, text, text, boolean);
drop function if exists public.list_my_blocks();
drop function if exists public.unblock_member(uuid);
drop function if exists public.block_member(uuid);
drop function if exists public.list_connect_connections();
drop function if exists public.mark_connect_read(uuid);
drop function if exists public.list_connect_messages(uuid, bigint, int);
drop function if exists public.send_connect_message(uuid, text);
drop function if exists public.connect_person(uuid);
drop function if exists public.list_connect_people(text, text, text, text, text, text, text, text, text, int, int);
drop function if exists public.list_connect_requests(text);
drop function if exists public.cancel_connect_request(uuid);
drop function if exists public.respond_connect_request(uuid, boolean);
drop function if exists public.send_connect_request(uuid, text, text, text, text);
drop function if exists public.save_passport(jsonb);
drop function if exists public.my_passport();
drop function if exists public.connect_card(uuid, uuid);
drop function if exists public.connect_link(uuid, uuid, text);
drop function if exists public.connect_connected(uuid, uuid);
drop function if exists public.connect_blocked(uuid, uuid);
drop function if exists public.connect_ready(uuid);
drop function if exists public.connect_pick(jsonb, text, int);
drop function if exists public.connect_clean(text, int);
drop function if exists public.connect_allowed(text);

drop index if exists public.member_profiles_connect_idx;
drop index if exists public.member_profiles_connect_langs_idx;
drop index if exists public.member_profiles_connect_topics_idx;
alter table public.member_profiles drop constraint if exists member_profiles_passport_sizes;
alter table public.member_profiles
  drop column if exists city, drop column if exists timezone, drop column if exists languages_spoken,
  drop column if exists languages_learning, drop column if exists learning_goal, drop column if exists connect_topics,
  drop column if exists activities, drop column if exists connect_goals, drop column if exists availability_days,
  drop column if exists availability_times, drop column if exists connect_status, drop column if exists connect_discoverable,
  drop column if exists connect_guidelines_at, drop column if exists adult_confirmed_at;

delete from supabase_migrations.schema_migrations where version in ('20261028000000', '20261028010000', '20261028020000');
commit;
