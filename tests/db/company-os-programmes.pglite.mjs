// Company OS programme workspaces (20261129000000) and the GIF Summer 2027 content (20261129010000), on PGlite over
// every earlier Company OS migration: who sees and edits what, the decision answer flow, change impact, revision
// tasks, task release, and that the seed is idempotent and leaves existing records alone.
//   node company-os-programmes.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  arba: "00000000-0000-0000-0000-0000000000f1", // founder, approver
  farrel: "00000000-0000-0000-0000-0000000000f2", // founder, approver
  renita: "00000000-0000-0000-0000-0000000000a7", // Operations manager (the project's division)
  shafira: "00000000-0000-0000-0000-0000000000a4", // Partnership manager (another division)
  mojo: "00000000-0000-0000-0000-0000000000a5", // Creative manager, project member
  member: "00000000-0000-0000-0000-0000000000b1", // IELSco member, no link to the project
  guest: "00000000-0000-0000-0000-0000000000b2",
  elco: "00000000-0000-0000-0000-0000000000b3", // Elco only
};
const FOUNDERS = new Set([U.arba, U.farrel]);
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null,
    identity_data jsonb not null, created_at timestamptz default now());
  create table auth.sessions (id uuid primary key, user_id uuid not null, created_at timestamptz default now(),
    updated_at timestamptz default now(), refreshed_at timestamp);
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  insert into auth.users (id, email) values ${Object.entries(U).map(([k, id]) => `('${id}', '${k}@example.test')`).join(", ")};
  insert into auth.identities (user_id, provider, identity_data) values ${Object.entries(U).map(([k, id]) => `('${id}', 'google', '{"email": "${k}@example.test", "email_verified": true}')`).join(", ")};`);
const SESS = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^00000000/, "5e55a000")]));
await db.exec(`insert into auth.sessions (id, user_id) values ${Object.values(U).map((id) => `('${SESS[id]}', '${id}')`).join(", ")}`);

const BASE = ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql",
  "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql",
  "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql",
  "20261115000000_company_os_finance_legal.sql", "20261116000000_company_os_division_foundation.sql",
  "20261117000000_company_os_subdivisions_metrics.sql", "20261118000000_company_os_document_templates.sql"];
const PROG = "20261129000000_company_os_programmes.sql", SEED = "20261129010000_company_os_gif_summer_2027.sql";
for (const f of BASE) { const sql = readFileSync(join(dir, f), "utf8"); await db.exec(sql); await db.exec(sql); }
// Before the GIF project exists the seed does nothing.
await db.exec(readFileSync(join(dir, PROG), "utf8"));
await db.exec(readFileSync(join(dir, SEED), "utf8"));
{
  const n = (await db.query(`select count(*)::int n from public.os_programmes`)).rows[0].n;
  n === 0 ? ok("seed skips when PRJ-0033 is missing") : bad("seed skips when PRJ-0033 is missing", n);
}

// Fixtures: the real people ids, the GIF project with four existing tasks, old timeline rows.
await db.exec(`
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-0001', '${U.arba}', 'Arba Test', 'founder', 'active', 'arba@example.test'),
    ('PPL-0002', '${U.farrel}', 'Farrel Test', 'founder', 'active', 'farrel@example.test'),
    ('PPL-0007', '${U.renita}', 'Renita Test', 'manager', 'active', 'renita@example.test'),
    ('PPL-0004', '${U.shafira}', 'Shafira Test', 'manager', 'active', 'shafira@example.test'),
    ('PPL-0005', '${U.mojo}', 'Mojo Test', 'manager', 'active', 'mojo@example.test'),
    ('PPL-9001', '${U.member}', 'Member Test', 'member', 'active', 'member@example.test'),
    ('PPL-9002', '${U.guest}', 'Guest Test', 'guest', 'active', 'guest@example.test'),
    ('PPL-9003', '${U.elco}', 'Elco Test', 'member', 'active', 'elco@example.test');
  insert into public.os_people (id, full_name, org_role, status) values
    ('PPL-0003', 'Didi Test', 'manager', 'onboarding'), ('PPL-0006', 'Yasmine Test', 'manager', 'onboarding'), ('PPL-0008', 'Acha Test', 'manager', 'onboarding');
  insert into public.os_person_companies values ('PPL-0001','IEL'),('PPL-0002','IEL'),('PPL-0007','IEL'),('PPL-0004','IEL'),('PPL-0005','IEL'),
    ('PPL-9001','IEL'),('PPL-9002','IEL'),('PPL-9003','ELC'),('PPL-0003','IEL'),('PPL-0006','IEL'),('PPL-0008','IEL');
  insert into public.os_person_divisions values ('PPL-0007','DIV-02',true),('PPL-0004','DIV-06',true),('PPL-0005','DIV-04',true),('PPL-9001','DIV-03',false);
  insert into public.os_projects (id, company_code, division_id, name, project_type, owner_person_id, status, sensitivity)
    values ('PRJ-0033', 'IEL', 'DIV-02', 'Global Impact Fellowship Summer 2027', 'Program', 'PPL-0001', 'Active', 'Internal'),
           ('PRJ-0034', 'IEL', 'DIV-02', 'GIF Winter 2026', 'Program', 'PPL-0001', 'Active', 'Internal');
  insert into public.os_project_members (project_id, person_id) values ('PRJ-0033', 'PPL-0005');
  insert into public.os_tasks (id, project_id, company_code, division_id, title, owner_person_id, status, due_date) values
    ('TSK-0106', 'PRJ-0033', 'IEL', 'DIV-02', 'Write concept note', 'PPL-0007', 'In Progress', '2026-12-11'),
    ('TSK-0107', 'PRJ-0033', 'IEL', 'DIV-02', 'Research NUS/UTM/Chula', 'PPL-0004', 'Ready', '2026-12-18'),
    ('TSK-0113', 'PRJ-0033', 'IEL', 'DIV-02', 'Secure USD 1,500 participant deposits', 'PPL-0001', 'Ready', '2026-11-13'),
    ('TSK-0114', 'PRJ-0033', 'IEL', 'DIV-02', 'Create master timeline', 'PPL-0001', 'Ready', '2026-11-13'),
    ('TSK-0115', 'PRJ-0033', 'IEL', 'DIV-02', 'Create master concept', 'PPL-0001', 'Ready', '2026-11-13');
  insert into public.os_id_counters (prefix, last) values ('TSK', 143) on conflict (prefix) do update set last = 143;`);
const before = (await db.query(`select (select count(*) from public.os_timeline_items)::int tl, (select count(*) from public.os_events)::int ev,
  (select md5(string_agg(to_jsonb(t)::text, '' order by id)) from public.os_tasks t) tasks,
  (select md5(string_agg(to_jsonb(t)::text, '' order by id)) from public.os_timeline_items t) tlhash`)).rows[0];

for (let i = 0; i < 2; i++) {
  await db.exec(readFileSync(join(dir, PROG), "utf8"));
  await db.exec(readFileSync(join(dir, SEED), "utf8"));
}
ok("programme migration and GIF seed apply twice");

const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid) => (uid ? { sub: uid, role: "authenticated", session_id: SESS[uid], aal: FOUNDERS.has(uid) ? "aal2" : "aal1",
  amr: [{ method: "oauth", timestamp: nowS() - 60 }] } : {});
async function as(role, uid, q, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsFor(uid))]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const user = (uid, q, p) => as("authenticated", uid, q, p);
const one = async (uid, q, p) => Object.values((await user(uid, q, p)).rows[0] ?? { x: undefined })[0];
const sys = async (q, p) => Object.values((await db.query(q, p)).rows[0] ?? { x: undefined })[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 70)})`) : bad(n, e.message); } };
const is = (want) => (got) => (JSON.stringify(got) === JSON.stringify(want) ? null : `got ${JSON.stringify(got)}`);
const atLeast = (n) => (got) => (got >= n ? null : `got ${got}`);
const count = (uid, q, p) => one(uid, `select count(*)::int from (${q}) x`, p);
const { arba: A, farrel: FA, renita: RE, shafira: SH, mojo: MO, member: ME, guest: GU, elco: EL } = U;

// ── The seed
await t("one programme, code GIF, approvers Arba and Farrel", () => sys(`select code || ':' || array_to_string(approver_person_ids, ',') from public.os_programmes`), is("GIF:PPL-0001,PPL-0002"));
await t("facts seeded once", () => sys(`select count(*)::int from public.os_programme_facts`), is(67));
await t("decisions seeded once (37 open, 9 on record)", () => sys(`select count(*) filter (where status <> 'Decided') || '/' || count(*) filter (where status = 'Decided') from public.os_programme_decisions`), is("37/9"));
await t("decisions on record are in the company decision log", () => sys(`select count(*)::int from public.os_decisions where project_id = 'PRJ-0033' and status = 'Approved'`), is(9));
await t("tasks seeded once, the four existing ones adopted", () => sys(`select count(*)::int from public.os_programme_task_meta`), is(115));
await t("adopted tasks are unchanged", () => sys(`select title || '|' || status from public.os_tasks where id = 'TSK-0106'`), is("Write concept note|In Progress"));
await t("TSK-0113 is not adopted (flagged as a finding)", () => sys(`select count(*)::int from public.os_programme_task_meta where task_id = 'TSK-0113'`), is(0));
await t("no existing task or timeline row changed; new ones only added", async () => {
  const r = (await db.query(`select (select md5(string_agg(to_jsonb(t)::text, '' order by id)) from public.os_tasks t where id <= 'TSK-0115') tasks,
    (select md5(string_agg(to_jsonb(t)::text, '' order by id)) from public.os_timeline_items t where coalesce(workstream_code, '') <> 'WS10') tl,
    (select count(*)::int from public.os_events) ev`)).rows[0];
  return r.tasks === before.tasks && r.tl === before.tlhash && r.ev === before.ev;
}, is(true));
await t("27 milestones on the Master Timeline as WS10", () => sys(`select count(*)::int from public.os_timeline_items where workstream_code = 'WS10' and project_id = 'PRJ-0033'`), is(27));
await t("milestone ids keep the TL-NNN format", () => sys(`select bool_and(id ~ '^TL-[0-9]{3,}$') from public.os_timeline_items where workstream_code = 'WS10'`), is(true));
await t("every new task has one accountable owner", () => sys(`select count(*)::int from public.os_programme_tasks where owner_person_id is null`), is(0));
await t("owners missing from the directory resolve to null, never to a made-up id", () => sys(`select count(*)::int from public.os_programme_decisions where owner_person_id is not null and owner_person_id not in (select id from public.os_people)`), is(0));
await t("no cost line has an invented amount", () => sys(`select count(*)::int from public.os_programme_budget_lines where section = 'Cost' and basis not in ('Not estimated', 'Formula')`), is(0));
await t("local partners start as To research or Identified", () => sys(`select count(*)::int from public.os_programme_partner_meta where status not in ('To research', 'Identified')`), is(0));
await t("partners are in os_partnerships, linked to the project", () => sys(`select count(*)::int from public.os_partnerships where related_project_id = 'PRJ-0033'`), is(16));
await t("country plans: 3 countries × 10 sections", () => sys(`select count(*)::int from public.os_programme_country_plans`), is(30));
await t("new codes continue after the seed", () => sys(`select last from public.os_programme_counters where prefix = 'GIF-DEC'`), is(49));

// ── Who sees what
await t("an IELSco member sees the decision queue (Internal)", () => count(ME, `select 1 from public.os_programme_decisions`), is(46));
await t("an IELSco member does not see the budget (Confidential)", () => count(ME, `select 1 from public.os_programme_budget_lines`), is(0));
await t("the project's division manager sees the budget", () => count(RE, `select 1 from public.os_programme_budget_lines`), is(30));
await t("a staff project member sees the budget", () => count(MO, `select 1 from public.os_programme_budget_lines`), is(30));
await t("founders see the budget", () => count(A, `select 1 from public.os_programme_budget_lines`), is(30));
await t("a guest sees nothing", () => count(GU, `select 1 from public.os_programme_decisions`), is(0));
await t("an Elco-only person sees nothing", () => count(EL, `select 1 from public.os_programme_facts`), is(0));
await t("task view through RLS shows programme statuses", () => one(RE, `select count(*)::int from public.os_programme_tasks where programme_status = 'Waiting for Decision'`), atLeast(10));

// ── Who edits what
await t("the project's division manager edits a research item", () => one(RE, `update public.os_programme_research set status = 'In progress' where code = 'GIF-RES-005' returning status`), is("In progress"));
await t("a staff project member edits a risk", () => one(MO, `update public.os_programme_risks set likelihood = 4 where code = 'GIF-RSK-012' returning rating`), is(8));
await t("a member outside the project can't edit", () => user(ME, `update public.os_programme_research set status = 'Verified' where code = 'GIF-RES-005' returning 1`).then((r) => r.rows.length), is(0));
await t("another division's manager can't edit", () => user(SH, `update public.os_programme_research set status = 'Verified' where code = 'GIF-RES-005' returning 1`).then((r) => r.rows.length), is(0));
await te("an editor can't mark a decision Decided directly", () => user(RE, `update public.os_programme_decisions set status = 'Decided' where code = 'GIF-DEC-005'`), /permission denied|os_programme_decide/);
await te("an editor can't answer a decision", () => user(RE, `select public.os_programme_decide('GIF-DEC-005', 'approve_recommendation')`), /decision approvers/);
await te("an editor can't approve the team allocation", () => user(RE, `update public.os_programme_team set status = 'Approved' where person_id = 'PPL-0007'`), /row-level security/);
await t("an editor can comment on a decision", () => user(RE, `select public.os_programme_decide('GIF-DEC-005', 'comment', null, 'Coach quotes come first')`).then((r) => r.rows[0].os_programme_decide.status), is("Pending Decision"));
await te("an editor can't mark a fact Decided", () => user(RE, `select public.os_programme_set_fact('PRJ-0033', 'capacity.total', '80', 'Decided', 'Trying it')`), /approver/);
await te("a fact change needs a reason", () => user(RE, `select public.os_programme_set_fact('PRJ-0033', 'capacity.total', '80', 'Proposed', '')`), /reason/);

// ── Fact change → change record, outputs flagged, revision tasks
let factChange;
await t("an editor proposes a fact change with a reason", async () => {
  const r = (await user(RE, `select public.os_programme_set_fact('PRJ-0033', 'capacity.total', '80', 'Proposed', 'Two coaches instead of three') j`)).rows[0].j;
  factChange = r.change; return r.version;
}, is(2));
await t("the change lists the outputs and budget lines that use the fact", () => sys(`select string_agg(kind || ':' || ref, ',' order by kind, ref) from public.os_programme_change_items where change_code = $1`, [factChange]), is("output:GIF-OUT-005,output:GIF-OUT-015,output:GIF-OUT-023"));
await t("each affected output gets one revision task for its owner, not published", () => sys(`select count(*)::int from public.os_programme_change_items i join public.os_tasks t on t.id = i.revision_task_id
  where i.change_code = $1 and t.owner_person_id is not null and t.description like '%Do not publish%'`, [factChange]), is(3));
await t("affected outputs are flagged Needs revision", () => sys(`select string_agg(approval_status, ',' order by code) from public.os_programme_outputs where code in ('GIF-OUT-005', 'GIF-OUT-015')`), is("Needs revision,Needs revision"));
await t("revision tasks carry programme metadata", () => sys(`select count(*)::int from public.os_programme_task_meta m join public.os_programme_change_items i on i.revision_task_id = m.task_id where i.change_code = $1 and m.code like 'GIF-T-%'`, [factChange]), is(3));
await t("the fact keeps its history", () => sys(`select string_agg(version || '=' || value, ',' order by version) from public.os_programme_fact_versions where key = 'capacity.total'`), is("1=100,2=80"));

// ── Decision answers
let res;
await t("Arba approves the recommendation on the deposit", async () => { res = (await user(A, `select public.os_programme_decide('GIF-DEC-001', 'approve_recommendation') j`)).rows[0].j; return res.status; }, is("Decided"));
await t("the decision is recorded with who and why", () => sys(`select decided_by || '|' || final_option || '|' || (decision_reason is not null) from public.os_programme_decisions where code = 'GIF-DEC-001'`), is("PPL-0001|A|true"));
await t("it is written to the company decision log", () => sys(`select status || '|' || decided_by from public.os_decisions where id = $1`, [res.os_decision]), is("Approved|PPL-0001"));
await t("the option's fact update is applied as Decided", () => sys(`select status || '|' || source_decision || '|' || version from public.os_programme_facts where key = 'prices.deposit'`), is("Decided|GIF-DEC-001|2"));
await t("fact and decision impact land in one change record", () => sys(`select count(distinct change_code)::int from public.os_programme_fact_versions where key = 'prices.deposit' and version = 2 and change_code = $1`, [res.change]), is(1));
await t("dependent outputs are flagged and get revision tasks", () => sys(`select count(*)::int from public.os_programme_change_items where change_code = $1 and kind = 'output' and revision_task_id is not null`, [res.change]), atLeast(5));
await t("the task waiting for it is released", () => sys(`select coalesce(waiting_on, 'none') from public.os_programme_task_meta where code = 'GIF-T-012'`), is("none"));
await t("the answer is in the decision log", () => sys(`select action || '|' || status_before || '>' || status_after from public.os_programme_decision_log where decision_code = 'GIF-DEC-001'`), is("approve_recommendation|Pending Decision>Decided"));
await te("a decided item can't be answered again", () => user(FA, `select public.os_programme_decide('GIF-DEC-001', 'select_option', 'B', null, 'Changed mind')`), /Reopen/);
await t("a task with two open decisions stays waiting after one is decided", async () => {
  await user(FA, `select public.os_programme_decide('GIF-DEC-024', 'approve_recommendation')`);
  return sys(`select waiting_on from public.os_programme_task_meta where code = 'GIF-T-030'`);
}, is("decision"));
await t("…and is released when the second is decided", async () => {
  await user(A, `select public.os_programme_decide('GIF-DEC-025', 'select_option', 'B', null, 'Live-risk documents first')`);
  return sys(`select coalesce(waiting_on, 'none') from public.os_programme_task_meta where code = 'GIF-T-030'`);
}, is("none"));

await t("Farrel rejects an option", async () => { await user(FA, `select public.os_programme_decide('GIF-DEC-002', 'reject_option', 'B', null, 'Website already names UM')`); return sys(`select o ->> 'rejected' from public.os_programme_decisions, jsonb_array_elements(options) o where code = 'GIF-DEC-002' and o ->> 'key' = 'B'`); }, is("true"));
await te("a rejected option can't be chosen", () => user(A, `select public.os_programme_decide('GIF-DEC-002', 'select_option', 'B', null, 'x y z')`), /rejected/);
await t("requesting research changes the status", () => user(A, `select public.os_programme_decide('GIF-DEC-004', 'request_research', null, null, 'Need hotel prices') j`).then((r) => r.rows[0].j.status), is("Needs Research"));
await t("deferring sets Revisit Later", () => user(FA, `select public.os_programme_decide('GIF-DEC-034', 'defer', null, null, 'After launch')`).then((r) => r.rows[0].os_programme_decide.status), is("Revisit Later"));
await te("a custom answer needs a reason", () => user(A, `select public.os_programme_decide('GIF-DEC-029', 'custom', null, 'No waitlist this year', '')`), /reason/);
await t("a custom answer is recorded", () => user(A, `select public.os_programme_decide('GIF-DEC-029', 'custom', null, 'No waitlist this year', 'Small cohort') j`).then((r) => r.rows[0].j.status), is("Decided"));
await t("reopening supersedes the company log entry", async () => {
  await user(A, `select public.os_programme_decide('GIF-DEC-001', 'reopen', null, null, 'Vendor deposits are larger')`);
  return sys(`select d.status || '|' || o.status from public.os_programme_decisions d, public.os_decisions o where d.code = 'GIF-DEC-001' and o.id = $1`, [res.os_decision]);
}, is("Pending Decision|Superseded"));
await te("a member who can read a decision can't answer it", () => user(ME, `select public.os_programme_decide('GIF-DEC-005', 'approve_recommendation')`), /decision approvers/);

// ── Impact preview, live numbers, counters
await t("impact preview from the programme dates reaches outputs and milestones", () => one(RE, `select count(distinct kind)::int from public.os_programme_preview_impact('PRJ-0033', 'fact', 'dates.programme') where kind in ('output', 'milestone')`), is(2));
await t("live recruitment numbers report unavailable without the GIF engine", () => one(RE, `select public.os_programme_live_stats('PRJ-0033') ->> 'available'`), is("false"));
await t("live numbers are hidden from people who can't see the project", () => one(GU, `select public.os_programme_live_stats('PRJ-0033')`), is(null));
await t("an editor adds a decision; it gets the next code", () => one(RE, `insert into public.os_programme_decisions (project_id, title, question, priority) values ('PRJ-0033', 'Choose kit supplier', 'Which supplier?', 'Low') returning code`), is("GIF-DEC-050"));
await te("an editor can't insert an already-decided decision", () => user(RE, `insert into public.os_programme_decisions (project_id, title, question, priority, status) values ('PRJ-0033', 'x', 'y', 'Low', 'Decided')`), /row-level security|os_programme_decide|permission denied/);
await te("internal change recorder is not callable", () => user(A, `select public.os_programme_record_change('PRJ-0033', 'fact', 'capacity.total', 'x', null, null, null)`), /permission denied/);
await t("approvers close a change", () => one(A, `update public.os_programme_changes set status = 'Closed', closed_at = now() where code = $1 returning status`, [factChange]), is("Closed"));
await te("editors can't close a change", () => user(RE, `update public.os_programme_changes set status = 'Closed' where code = $1`, [res.change]), /row-level security/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
