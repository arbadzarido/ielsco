-- ROLLBACK for 20261026000000_membership_platform.sql and 20261026010000_opportunities_seed.sql.
-- Only for an emergency: it deletes everything those two migrations created, including any orders, payments,
-- memberships, inquiries and tracker rows written since. Those migrations changed no existing object, so nothing else
-- needs restoring. Run in Supabase → SQL Editor on PRODUCTION, then redeploy a commit that doesn't use these tables.
begin;
drop table if exists public.opportunity_tracker cascade;
drop table if exists public.opportunities cascade;
drop table if exists public.inquiries cascade;
drop table if exists public.buddy_requests cascade;
drop table if exists public.feedback_requests cascade;
drop table if exists public.member_session_registrations cascade;
drop table if exists public.member_sessions cascade;
drop table if exists public.member_links cascade;
drop table if exists public.membership_payment_notifications cascade;
drop table if exists public.membership_periods cascade;
drop table if exists public.membership_orders cascade;
drop table if exists public.membership_plans cascade;
drop function if exists public.tracker_free_limit();
drop function if exists public.submit_inquiry(text, text, text, text, text, text, text, text);
drop function if exists public.pause_buddy();
drop function if exists public.request_buddy(text);
drop function if exists public.request_feedback(text, text, text, text);
drop function if exists public.member_session_join_url(uuid);
drop function if exists public.register_member_session(uuid);
drop function if exists public.list_member_sessions(int);
drop function if exists public.admin_membership_roster();
drop function if exists public.grant_staff_membership(text, int, text);
drop function if exists public.apply_membership_payment(text, text, numeric, text, text, text, text, text);
drop function if exists public.my_membership();
drop function if exists public.is_active_member();
drop function if exists public.is_site_admin();
delete from supabase_migrations.schema_migrations where version in ('20261026000000', '20261026010000');
commit;
