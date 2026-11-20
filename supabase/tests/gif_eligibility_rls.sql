-- GIF Summer 2027 eligibility + Words We Leave Behind: RLS / privacy tests. Run inside a rolled-back transaction
-- (scripts/gif/rls-test.cjs). Impersonates real delegate identities through request.jwt.claims.
create temp table e_ctx (k text primary key, v text) on commit drop;
grant all on e_ctx to authenticated, anon;
create or replace function pg_temp.eclaims(p_name text) returns text language sql as $$
  select json_build_object('sub', coalesce(d.user_id, gen_random_uuid()), 'email', d.email, 'role', 'authenticated')::text
    from public.gif_delegates d where d.full_name = p_name $$;
insert into e_ctx values
  ('philip', pg_temp.eclaims('Philip Immanuel')), ('denver', pg_temp.eclaims('Denver Wijaya')), ('agha', pg_temp.eclaims('Agha Mahya Dayuga')),
  ('admin', (select json_build_object('sub', u.id, 'email', u.email, 'role', 'authenticated')::text from auth.users u where u.email = 'arbadzarido03@gmail.com')),
  ('id_philip', (select id::text from public.gif_delegates where full_name = 'Philip Immanuel')),
  ('id_denver', (select id::text from public.gif_delegates where full_name = 'Denver Wijaya')),
  ('id_agha', (select id::text from public.gif_delegates where full_name = 'Agha Mahya Dayuga')),
  ('id_deana', (select id::text from public.gif_delegates where full_name = 'Deana Adelia Chelsea')),
  ('id_test', (select id::text from public.gif_delegates where participant_id = 'GIF26-TEST-001')),
  ('req_msgs', (select id::text from public.gif_eligibility_requirements where key = 'messages')),
  ('req_elco', (select id::text from public.gif_eligibility_requirements where key = 'elco_ai')),
  ('req_reels1', (select id::text from public.gif_eligibility_requirements where key = 'reels_1')),
  ('a_reels1', (select id::text from public.gif_assignments where slug = 'reels-1')),
  ('a_feedback', (select id::text from public.gif_assignments where slug = 'fellowship-feedback'));

create or replace function pg_temp.eexpect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'PASS  % (denied: %)', p_label, left(sqlerrm, 90); return; end;
  raise exception 'FAIL  % — statement was allowed', p_label;
end $$;
create or replace function pg_temp.eok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin if coalesce(p_cond, false) then raise notice 'PASS  %', p_label; else raise exception 'FAIL  %', p_label; end if; end $$;
grant execute on function pg_temp.eexpect_error(text, text), pg_temp.eok(boolean, text) to authenticated, anon;

-- structure
select pg_temp.eok((select count(*) from public.gif_assignments where track = 'programme') = 8, 'Programme Day 1–4 tasks unchanged (8)');
select pg_temp.eok((select sum(weight) from public.gif_eligibility_categories) = 100, 'Category weights sum to 100');
select pg_temp.eok(position('sender_delegate' in pg_get_function_result('public.gif_my_received_messages()'::regprocedure)) = 0 and position('sender_name' in pg_get_function_result('public.gif_my_received_messages()'::regprocedure)) = 0, 'Received-messages function never returns a sender column');
select pg_temp.eok(position('sender_delegate' in pg_get_function_result('public.gif_wall_messages()'::regprocedure)) = 0, 'Wall function never returns the sender');

-- ===== Philip (Team 1) =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'philip'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_eligibility_categories) = 5 and (select count(*) from public.gif_eligibility_requirements) = 15, 'Delegate sees 5 categories and 15 requirements');
select pg_temp.eok((select count(*) from public.gif_my_eligibility_signals()) = 1 and (select delegate_id::text from public.gif_my_eligibility_signals()) = (select v from e_ctx where k = 'id_philip'), 'Signals return only my own row');
select pg_temp.eexpect_error($q$select * from public.gif_admin_eligibility_signals()$q$, 'Delegate cannot read all delegates'' signals');
select pg_temp.eexpect_error($q$select * from public.gif_messages$q$, 'Message table is not readable through the API');
select pg_temp.eexpect_error($q$insert into public.gif_messages (sender_delegate_id, recipient_staff, body) values ((select v::uuid from e_ctx where k='id_denver'), 'arba', 'forged sender message')$q$, 'Cannot insert messages directly (forging a sender)');
select pg_temp.eok((select count(*) from public.gif_message_recipients()) = 11 and not exists (select 1 from public.gif_message_recipients() where delegate_id::text = (select v from e_ctx where k = 'id_philip')), 'Recipient list = the 11 other delegates');
select pg_temp.eok(not exists (select 1 from public.gif_message_recipients() where delegate_id::text = (select v from e_ctx where k = 'id_test')), 'Test record is not a recipient');
select pg_temp.eexpect_error($q$select public.gif_send_message((select v::uuid from e_ctx where k='id_philip'), null, 'A message to myself, which is not allowed', false)$q$, 'Cannot message yourself');
select pg_temp.eexpect_error($q$select public.gif_send_message((select v::uuid from e_ctx where k='id_test'), null, 'Not on the delegate list at all', false)$q$, 'Recipient must be on the delegate list');
select pg_temp.eexpect_error($q$select public.gif_send_message(null, 'someone', 'Unknown staff member recipient', false)$q$, 'Only Arba / Farrel as staff recipients');
select pg_temp.eexpect_error($q$select public.gif_send_message((select v::uuid from e_ctx where k='id_denver'), null, 'short', false)$q$, 'Too-short message rejected');
select public.gif_send_message((select v::uuid from e_ctx where k='id_denver'), null, 'Denver, your questions on Day 3 changed our pitch.', true);
select pg_temp.eexpect_error($q$select public.gif_send_message((select v::uuid from e_ctx where k='id_denver'), null, 'A second message to Denver to inflate', false)$q$, 'Duplicate recipient blocked');
select public.gif_send_message((select v::uuid from e_ctx where k='id_agha'), null, 'Agha, thank you for the late-night slides.', false);
select pg_temp.eok((select msg_delegates = 2 and msg_arba = 0 from public.gif_my_eligibility_signals()), 'Progress counts distinct recipients (2/3)');
select public.gif_send_message((select v::uuid from e_ctx where k='id_deana'), null, 'Deana, your energy carried the Story Hunt.', false);
select public.gif_send_message(null, 'arba', 'Arba, thank you for believing in us.', false);
select public.gif_send_message(null, 'farrel', 'Farrel, the Elco demo was inspiring.', false);
select pg_temp.eok((select msg_delegates = 3 and msg_arba = 1 and msg_farrel = 1 from public.gif_my_eligibility_signals()), 'Five-message requirement met (3/1/1)');
select pg_temp.eok((select count(*) from public.gif_my_sent_messages()) = 5, 'Sender sees own sent messages');
-- verification requests
insert into public.gif_verification_requests (requirement_id, delegate_id, note) values ((select v::uuid from e_ctx where k='req_elco'), (select v::uuid from e_ctx where k='id_philip'), 'linked');
select pg_temp.eok(true, 'Delegate can ask for verification of own requirement');
select pg_temp.eexpect_error($q$insert into public.gif_verification_requests (requirement_id, delegate_id) values ((select v::uuid from e_ctx where k='req_elco'), (select v::uuid from e_ctx where k='id_denver'))$q$, 'Cannot ask on behalf of another delegate');
select pg_temp.eexpect_error($q$insert into public.gif_verification_requests (requirement_id, delegate_id) values ((select v::uuid from e_ctx where k='req_reels1'), (select v::uuid from e_ctx where k='id_philip'))$q$, 'Submission-based requirements are not self-verified');
select pg_temp.eexpect_error($q$insert into public.gif_verification_requests (requirement_id, delegate_id, url) values ((select v::uuid from e_ctx where k='req_msgs'), (select v::uuid from e_ctx where k='id_philip'), 'javascript:alert(1)')$q$, 'Only http(s) URLs accepted');
select pg_temp.eexpect_error($q$insert into public.gif_eligibility_reviews (requirement_id, delegate_id, assessor_id, status) values ((select v::uuid from e_ctx where k='req_msgs'), (select v::uuid from e_ctx where k='id_philip'), auth.uid(), 'approved')$q$, 'Delegate cannot approve own requirement');
update public.gif_eligibility_categories set weight = 90 where key = 'content';
update public.gif_eligibility_requirements set share = 50 where key = 'reels_1';
-- eligibility task submissions + ratings
insert into public.gif_submissions (assignment_id, delegate_id, responses) values ((select v::uuid from e_ctx where k='a_feedback'), (select v::uuid from e_ctx where k='id_philip'), '{}');
select pg_temp.eexpect_error($q$update public.gif_submissions set responses = '{"overall_rating":7}' where assignment_id = (select v::uuid from e_ctx where k='a_feedback')$q$, 'Rating outside 1–5 rejected');
insert into public.gif_submissions (assignment_id, delegate_id, responses, status) values ((select v::uuid from e_ctx where k='a_reels1'), (select v::uuid from e_ctx where k='id_philip'),
  '{"reels_url":"https://www.instagram.com/reel/x/","caption":"Our week in Singapore","brief_confirmed":true}', 'submitted');
select pg_temp.eok((select count(*) from public.gif_notifications where message like '%GIF Summer 2027 task "Reels 1"%') = 1, 'Reels 1 submitted with a Summer 2027 notification');
reset role;
select pg_temp.eok((select weight from public.gif_eligibility_categories where key = 'content') = 30 and (select share from public.gif_eligibility_requirements where key = 'reels_1') = 1, 'Delegate cannot change weights or shares');

-- ===== Denver (recipient, Team 2) =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'denver'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_my_received_messages() where body like 'Denver, your questions%') = 1, 'Recipient reads the message left for them');
select pg_temp.eok((select count(*) from public.gif_my_sent_messages() where body like 'Denver, your questions%') = 0, 'Recipient does not see who sent it (no sent rows)');
select public.gif_update_received_message((select id from public.gif_my_received_messages() where body like 'Denver, your questions%'), true, true, true);
select pg_temp.eok((select read_at is not null and favourite and wall_status = 'requested' from public.gif_my_received_messages() where body like 'Denver, your questions%'), 'Recipient marks read, favourite and asks for the wall');
select pg_temp.eok((select count(*) from public.gif_wall_messages() where body like 'Denver, your questions%') = 0, 'Wall stays empty until Arba approves');
select pg_temp.eexpect_error($q$select public.gif_admin_moderate_message((select id from public.gif_my_received_messages() where body like 'Denver, your questions%'), null, null, 'approved')$q$, 'Delegate cannot moderate');
select pg_temp.eexpect_error($q$select * from public.gif_admin_messages()$q$, 'Delegate cannot see message senders');
reset role;

-- ===== Agha: cannot touch Denver's message =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'agha'), true);
set local role authenticated;
select pg_temp.eexpect_error($q$select public.gif_update_received_message((select id from public.gif_messages where body like 'Denver, your questions%'), true, true, null)$q$, 'Cannot act on someone else''s message');
select pg_temp.eok((select count(*) from public.gif_my_received_messages() where body like 'Agha, thank you%') = 1 and (select favourite = false and wall_status = 'none' from public.gif_my_received_messages() where body like 'Agha, thank you%'), 'Agha sees own message; sender did not allow the wall');
select public.gif_update_received_message((select id from public.gif_my_received_messages() where body like 'Agha, thank you%'), null, null, true);
select pg_temp.eok((select wall_status = 'none' from public.gif_my_received_messages() where body like 'Agha, thank you%'), 'Wall request ignored when the sender did not allow it');
reset role;

-- ===== Admin =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'admin'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_admin_messages() where body in ('Denver, your questions on Day 3 changed our pitch.','Agha, thank you for the late-night slides.','Deana, your energy carried the Story Hunt.','Arba, thank you for believing in us.','Farrel, the Elco demo was inspiring.')) = 5 and (select count(distinct sender_name) from public.gif_admin_messages() where body in ('Denver, your questions on Day 3 changed our pitch.','Agha, thank you for the late-night slides.','Deana, your energy carried the Story Hunt.','Arba, thank you for believing in us.','Farrel, the Elco demo was inspiring.')) = 1, 'Admin sees all messages with sender for moderation');
select public.gif_admin_moderate_message((select id from public.gif_admin_messages() where body like 'Denver, your questions%'), null, null, 'approved');
select pg_temp.eok((select count(*) from public.gif_wall_messages() where body like 'Denver, your questions%') = 1, 'Approved message appears on the wall');
select pg_temp.eok((select count(*) from public.gif_admin_eligibility_signals() s join public.gif_team_members m on m.delegate_id = s.delegate_id) = 12, 'Admin sees signals for all 12 delegates');
select pg_temp.eexpect_error($q$insert into public.gif_eligibility_reviews (requirement_id, delegate_id, assessor_id, status) values ((select v::uuid from e_ctx where k='req_msgs'), (select v::uuid from e_ctx where k='id_philip'), auth.uid(), 'revision_required')$q$, 'Revision needs a note');
select pg_temp.eexpect_error($q$insert into public.gif_eligibility_reviews (requirement_id, delegate_id, assessor_id, status) values ((select v::uuid from e_ctx where k='req_reels1'), (select v::uuid from e_ctx where k='id_philip'), auth.uid(), 'approved')$q$, 'Submission requirements are assessed in the inbox, not here');
insert into public.gif_eligibility_reviews (requirement_id, delegate_id, assessor_id, status) values ((select v::uuid from e_ctx where k='req_msgs'), (select v::uuid from e_ctx where k='id_philip'), auth.uid(), 'approved');
update public.gif_eligibility_categories set weight = 30 where key = 'content';
select pg_temp.eok(true, 'Admin can verify a requirement and edit weights');
select public.gif_admin_moderate_message((select id from public.gif_admin_messages() where body like 'Farrel, the Elco demo%'), true, 'test hide', null);
reset role;

-- ===== Philip sees the verification; hidden messages stop counting =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'philip'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_eligibility_reviews where status = 'approved') = 1, 'Delegate sees Arba''s verification');
select pg_temp.eok((select count(*) from public.gif_notifications where message like 'GIF Summer 2027: "Words We Leave Behind" has been verified.') = 1, 'Verification notification delivered');
select pg_temp.eok((select msg_farrel = 0 from public.gif_my_eligibility_signals()), 'A hidden message no longer counts');
reset role;
set local role anon;
select pg_temp.eexpect_error($q$select * from public.gif_wall_messages()$q$, 'Anonymous visitors cannot read the wall');
reset role;
select 'ALL ELIGIBILITY TESTS PASSED' as result;

-- ===== Arba's own inbox (20261125000000) =====
select set_config('request.jwt.claims', (select v from e_ctx where k = 'admin'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_my_received_messages() where body like 'Arba, thank you for believing in us.%') = 1, 'Messages to Arba appear in Arba''s inbox');
select pg_temp.eok((select count(*) from public.gif_my_received_messages() where body like 'Farrel,%') = 0, 'Messages to Farrel do not');
select public.gif_update_received_message((select id from public.gif_my_received_messages() where body like 'Arba, thank you%'), true, true, true);
select pg_temp.eok((select read_at is not null and favourite and wall_status = 'none' from public.gif_my_received_messages() where body like 'Arba, thank you%'), 'Arba can mark read/favourite; staff messages never go to the wall');
reset role;
select set_config('request.jwt.claims', (select v from e_ctx where k = 'denver'), true);
set local role authenticated;
select pg_temp.eok((select count(*) from public.gif_my_received_messages() where body like 'Arba,%') = 0, 'Delegates never see messages to Arba');
reset role;
select 'ARBA INBOX TESTS PASSED' as result;
