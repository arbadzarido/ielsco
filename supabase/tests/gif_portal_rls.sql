-- GIF assessment portal: RLS / workflow tests.
-- Run INSIDE a transaction that is rolled back (scripts/gif-portal-rls-test.cjs wraps it in BEGIN … ROLLBACK).
-- Impersonates the real delegate identities through request.jwt.claims; nothing it creates survives.
create temp table t_ctx (k text primary key, v text) on commit drop;
grant all on t_ctx to authenticated, anon;
create or replace function pg_temp.claims(p_name text) returns text language sql as $$
  select json_build_object('sub', coalesce(d.user_id, gen_random_uuid()), 'email', d.email, 'role', 'authenticated')::text
    from public.gif_delegates d where d.full_name = p_name $$;
insert into t_ctx values
  ('t1', pg_temp.claims('Philip Immanuel')), ('t1b', pg_temp.claims('Osmar Zaidan')), ('t2', pg_temp.claims('Denver Wijaya')),
  ('t3', pg_temp.claims('Agha Mahya Dayuga')), ('t4', pg_temp.claims('Deana Adelia Chelsea')),
  ('admin', (select json_build_object('sub', u.id, 'email', u.email, 'role', 'authenticated')::text from auth.users u where u.email = 'arbadzarido03@gmail.com')),
  ('stranger', json_build_object('sub', gen_random_uuid(), 'email', 'not-a-delegate@example.com', 'role', 'authenticated')::text),
  ('a_d2_ind', (select id::text from public.gif_assignments where slug = 'day2-individual-reflection')),
  ('a_d2_grp', (select id::text from public.gif_assignments where slug = 'day2-group-project')),
  ('a_d1_ind', (select id::text from public.gif_assignments where slug = 'day1-individual-content')),
  ('philip', (select id::text from public.gif_delegates where full_name = 'Philip Immanuel')),
  ('denver', (select id::text from public.gif_delegates where full_name = 'Denver Wijaya')),
  ('team1', (select id::text from public.gif_teams where team_number = 1)),
  ('team2', (select id::text from public.gif_teams where team_number = 2));

create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin execute p_sql; exception when others then raise notice 'PASS  % (denied: %)', p_label, left(sqlerrm, 90); return; end;
  raise exception 'FAIL  % — statement was allowed', p_label;
end $$;
create or replace function pg_temp.ok(p_cond boolean, p_label text) returns void language plpgsql as $$
begin if coalesce(p_cond, false) then raise notice 'PASS  %', p_label; else raise exception 'FAIL  %', p_label; end if; end $$;
grant execute on function pg_temp.expect_error(text, text), pg_temp.ok(boolean, text) to authenticated, anon;

-- ===== Delegate, Team 1 (Philip) =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 't1'), true);
set local role authenticated;
select pg_temp.ok((select count(*) from public.gif_my_team()) = 3 and (select bool_and(team_number = 1) from public.gif_my_team()), 'T1 delegate sees own team of 3');
select pg_temp.ok((select count(*) from public.gif_assignments) = 8, 'T1 delegate sees 8 active assignments');
select pg_temp.ok((select count(*) from public.gif_delegates) = 1, 'T1 delegate reads only own biodata row');
select pg_temp.ok((select count(*) from public.gif_teams) = 1, 'T1 delegate sees only own team');
select pg_temp.ok(public.gif_is_admin() = false, 'T1 delegate is not admin');
insert into public.gif_submissions (assignment_id, delegate_id, responses) values ((select v::uuid from t_ctx where k='a_d2_ind'), (select v::uuid from t_ctx where k='philip'), '{}');
select pg_temp.expect_error($q$update public.gif_submissions set status = 'submitted' where assignment_id = (select v::uuid from t_ctx where k='a_d2_ind')$q$, 'Submit blocked while required fields are empty');
update public.gif_submissions set responses = '{"reflection":"Insight","participation_confirmed":true}', status = 'submitted' where assignment_id = (select v::uuid from t_ctx where k='a_d2_ind');
select pg_temp.ok((select status = 'submitted' and submitted_at is not null and version = 1 from public.gif_submissions where assignment_id = (select v::uuid from t_ctx where k='a_d2_ind')), 'Individual reflection submitted');
select pg_temp.ok((select count(*) from public.gif_notifications where kind = 'received') = 1, 'Received notification for submitter');
insert into public.gif_submissions (assignment_id, team_id, responses) values ((select v::uuid from t_ctx where k='a_d2_grp'), (select v::uuid from t_ctx where k='team1'), '{"team_name":"Team One"}');
update public.gif_submissions set status = 'submitted', responses = '{"team_name":"Team One","team_vision":"v","sdg4_category":"Teacher Support and Capacity","target_beneficiary":"b","problem_statement":"p","root_cause":"r","evidence":"e","solution_direction":"s","discussion_summary":"d"}' where team_id = (select v::uuid from t_ctx where k='team1');
select pg_temp.ok((select status from public.gif_submissions where team_id = (select v::uuid from t_ctx where k='team1')) = 'submitted', 'Group project submitted by one member');
select pg_temp.expect_error($q$insert into public.gif_submissions (assignment_id, team_id) values ((select v::uuid from t_ctx where k='a_d2_grp'), (select v::uuid from t_ctx where k='team2'))$q$, 'Cannot create a group submission for another team');
select pg_temp.expect_error($q$insert into public.gif_submissions (assignment_id, delegate_id) values ((select v::uuid from t_ctx where k='a_d1_ind'), (select v::uuid from t_ctx where k='denver'))$q$, 'Cannot create an individual submission for another delegate');
select pg_temp.expect_error($q$insert into public.gif_submissions (assignment_id, team_id) values ((select v::uuid from t_ctx where k='a_d2_grp'), (select v::uuid from t_ctx where k='team1'))$q$, 'Duplicate group submission prevented');
select pg_temp.expect_error($q$update public.gif_submissions set status = 'approved' where team_id = (select v::uuid from t_ctx where k='team1')$q$, 'Delegate cannot approve own submission');
select pg_temp.expect_error($q$insert into public.gif_assessments (submission_id, assessor_id, status, submission_version) select id, auth.uid(), 'approved', 1 from public.gif_submissions limit 1$q$, 'Delegate cannot create assessments');
select pg_temp.expect_error($q$select * from public.gif_admin_roster()$q$, 'Delegate cannot read admin roster');
select pg_temp.expect_error($q$insert into public.gif_admins (user_id) values (auth.uid())$q$, 'Delegate cannot grant self admin');
select pg_temp.expect_error($q$insert into public.gif_submission_files (submission_id, field_key, kind, bucket, storage_path, mime_type, size_bytes) select id, 'story_proof', 'story_proof', 'gif-story-proofs', 'x/y/z.png', 'image/png', 10 from public.gif_submissions limit 1$q$, 'Delegate cannot register files directly (server route only)');
update public.gif_assignments set title = 'hacked';
select pg_temp.ok((select count(*) from public.gif_retention_runs) = 0 and (select count(*) from public.gif_admins) = 0, 'Delegate reads no retention log and no admin list');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name, owner) values ('gif-story-proofs', (select v from t_ctx where k='denver') || '/' || gen_random_uuid() || '/x.png', auth.uid())$q$, 'Cannot upload into another delegate''s story folder');
select pg_temp.expect_error($q$insert into storage.objects (bucket_id, name, owner) values ('gif-story-proofs', (select v from t_ctx where k='philip') || '/' || gen_random_uuid() || '/x.png', auth.uid())$q$, 'Cannot upload story proof for a submission that is not mine');
insert into storage.objects (bucket_id, name, owner) select 'gif-story-proofs', (select v from t_ctx where k='philip') || '/' || s.id || '/test.png', auth.uid() from public.gif_submissions s where s.assignment_id = (select v::uuid from t_ctx where k='a_d2_ind');
select pg_temp.ok(true, 'Own story folder upload allowed by storage policy');
reset role;
select pg_temp.ok((select count(*) from public.gif_assignments where title = 'hacked') = 0, 'Delegate cannot edit assignments');

-- ===== Teammate (Osmar, Team 1) sees the group submission =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 't1b'), true);
set local role authenticated;
select pg_temp.ok((select count(*) from public.gif_submissions where team_id = (select v::uuid from t_ctx where k='team1')) = 1, 'Teammate sees team group submission');
select pg_temp.ok((select count(*) from public.gif_submissions where delegate_id is not null) = 0, 'Teammate cannot see Philip''s individual reflection');
select pg_temp.ok((select count(*) from public.gif_notifications) = 1, 'Teammate got the group "received" notification');
reset role;

-- ===== Delegate, Team 2 (Denver): isolation =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 't2'), true);
set local role authenticated;
select pg_temp.ok((select count(*) from public.gif_submissions) = 0, 'Team 2 cannot see Team 1 submissions');
update public.gif_submissions set responses = '{"team_name":"hijack"}' where team_id = (select v::uuid from t_ctx where k='team1');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'gif-story-proofs' and name like (select v from t_ctx where k='philip') || '/%') = 0, 'Team 2 cannot read Philip''s story screenshots');
select pg_temp.ok((select count(*) from public.gif_notifications) = 0, 'Team 2 cannot read Team 1 notifications');
select pg_temp.ok((select count(*) from public.gif_delegates) = 1, 'Team 2 delegate reads only own biodata row');
reset role;
select pg_temp.ok((select responses->>'team_name' from public.gif_submissions where team_id = (select v::uuid from t_ctx where k='team1')) = 'Team One', 'Team 2 update of Team 1 submission had no effect');

-- ===== Teams 3 and 4 see their own team only =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 't3'), true);
set local role authenticated;
select pg_temp.ok((select bool_and(team_number = 3) and count(*) = 3 from public.gif_my_team()), 'T3 delegate sees team 3');
reset role;
select set_config('request.jwt.claims', (select v from t_ctx where k = 't4'), true);
set local role authenticated;
select pg_temp.ok((select bool_and(team_number = 4) and count(*) = 3 from public.gif_my_team()), 'T4 delegate sees team 4');
reset role;

-- ===== Not a delegate / anonymous =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 'stranger'), true);
set local role authenticated;
select pg_temp.ok((select count(*) from public.gif_assignments) = 0, 'Non-delegate sees no assignments');
select pg_temp.ok((select count(*) from public.gif_submissions) = 0, 'Non-delegate sees no submissions');
select pg_temp.ok(public.gif_is_admin() = false, 'Non-delegate is not admin');
reset role;
set local role anon;
select pg_temp.expect_error($q$select count(*) from public.gif_submissions$q$, 'Anonymous cannot read submissions');
reset role;

-- ===== Admin (Arba) =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 'admin'), true);
set local role authenticated;
select pg_temp.ok(public.gif_is_admin(), 'Admin recognised server-side');
select pg_temp.ok((select count(*) filter (where team_id is not null) from public.gif_admin_roster()) = 12, 'Admin roster: 12 team delegates');
select pg_temp.ok((select count(distinct team_id) from public.gif_admin_roster() where team_id is not null) = 4, 'Admin roster: 4 teams');
select pg_temp.ok((select count(*) from public.gif_submissions) >= 2, 'Admin sees all submissions');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'gif-story-proofs') >= 1, 'Admin can see private story screenshots');
insert into public.gif_assessments (submission_id, assessor_id, status) select id, auth.uid(), 'under_review' from public.gif_submissions where team_id is not null;
select pg_temp.ok((select status from public.gif_submissions where team_id is not null) = 'under_review', 'Start review sets Under Review');
select pg_temp.expect_error($q$insert into public.gif_assessments (submission_id, assessor_id, status) select id, auth.uid(), 'revision_required' from public.gif_submissions where team_id is not null$q$, 'Revision Required needs feedback');
select pg_temp.expect_error($q$insert into public.gif_assessments (submission_id, assessor_id, status, rubric_scores) select id, auth.uid(), 'approved', '{"problem_clarity":7}' from public.gif_submissions where team_id is not null$q$, 'Rubric score outside 1-5 rejected');
insert into public.gif_assessments (submission_id, assessor_id, status, rubric_scores, feedback, revision_instructions)
  select id, auth.uid(), 'revision_required', '{"problem_clarity":4,"beneficiary":3,"evidence":2,"sdg4":5,"participation":4}', 'Good start', 'Add two sources' from public.gif_submissions where team_id is not null;
select pg_temp.ok((select score = 18 and max_score = 25 from public.gif_assessments where status = 'revision_required'), 'Rubric total computed (18/25)');
select pg_temp.expect_error($q$update public.gif_assessments set feedback = 'edited'$q$, 'Assessments are append-only');
update public.gif_submissions set status = 'approved' where delegate_id is not null and delegate_id <> public.gif_my_delegate_id();
reset role;
select pg_temp.ok((select status from public.gif_submissions where delegate_id is not null) = 'submitted', 'Admin cannot bypass assessments to change status directly');

-- ===== Delegate sees feedback and resubmits =====
select set_config('request.jwt.claims', (select v from t_ctx where k = 't1'), true);
set local role authenticated;
select pg_temp.ok((select count(*) from public.gif_assessments) = 2, 'Delegate sees assessment history incl. feedback');
select pg_temp.ok((select count(*) from public.gif_notifications where kind = 'revision_required') = 1, 'Revision notification delivered');
update public.gif_submissions set responses = responses || '{"evidence":"e + 2 sources"}', status = 'submitted' where team_id is not null;
select pg_temp.ok((select status = 'submitted' and version = 2 from public.gif_submissions where team_id is not null), 'Resubmission after revision bumps version');
reset role;
select set_config('request.jwt.claims', (select v from t_ctx where k = 'admin'), true);
set local role authenticated;
insert into public.gif_assessments (submission_id, assessor_id, status, rubric_scores, feedback) select id, auth.uid(), 'approved', '{"problem_clarity":5}', 'Great' from public.gif_submissions where team_id is not null;
reset role;
select set_config('request.jwt.claims', (select v from t_ctx where k = 't1'), true);
set local role authenticated;
update public.gif_submissions set responses = '{}' where team_id is not null;
select pg_temp.ok((select count(*) from public.gif_notifications where kind = 'approved') = 1, 'Approved notification delivered');
reset role;
select pg_temp.ok((select status = 'approved' and responses <> '{}'::jsonb from public.gif_submissions where team_id is not null), 'Approved submission is locked for delegates');

-- ===== Retention metadata =====
insert into public.gif_submission_files (submission_id, field_key, kind, bucket, storage_path, mime_type, size_bytes, uploaded_at, expires_at)
select id, 'story_proof', 'story_proof', 'gif-story-proofs', 'test/' || id || '/a.png', 'image/png', 100, now() - interval '30 days', now() + interval '99 days'
  from public.gif_submissions where delegate_id is not null;
select pg_temp.ok((select expires_at = uploaded_at + interval '7 days' and uploaded_at > now() - interval '1 minute' and retention_status = 'active' from public.gif_submission_files), 'expires_at = upload + 7 days (server-set, client value ignored)');
select 'ALL TESTS PASSED' as result;
