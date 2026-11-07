// Company OS unified planning (20261110000000): recurrence and exceptions, event-task links, dependencies, campaigns
// and content, invitation groups, free/busy, notifications and series splits, on PGlite over every earlier migration.
// Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install and run:
//   node company-os.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  founder: "00000000-0000-0000-0000-00000000000f",
  manager: "00000000-0000-0000-0000-0000000000a1", // Growth manager, IELSco + Elco
  creative: "00000000-0000-0000-0000-0000000000a2", // Creative member, IELSco
  elco: "00000000-0000-0000-0000-0000000000a3", // Growth member, Elco
  guest: "00000000-0000-0000-0000-0000000000a4",
  outsider: "00000000-0000-0000-0000-0000000000a5", // signed in, no OS record
  offboarded: "00000000-0000-0000-0000-0000000000a6",
};
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
// A minimal Supabase auth schema: users, Google identities, sessions and MFA factors, plus auth.uid() / auth.jwt()
// reading request.jwt.claims the way PostgREST sets it.
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
// Every user starts with one live Google session.
const SESS = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^00000000/, "5e55a000")]));
await db.exec(`insert into auth.sessions (id, user_id) values ${Object.values(U).map((id) => `('${SESS[id]}', '${id}')`).join(", ")}`);

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql"]) {
  const sql = readFileSync(join(dir, f), "utf8");
  await db.exec(sql);
  await db.exec(sql);
}
ok("migrations apply twice");

// Fixtures, as the migration owner. Everyone is on the registry with their Google email; the guest belongs to IELSco
// (a company is required for any access).
await db.exec(`
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-9001', '${U.founder}', 'Test Founder', 'founder', 'active', 'founder@example.test'),
    ('PPL-9002', '${U.manager}', 'Test Growth Manager', 'manager', 'active', 'manager@example.test'),
    ('PPL-9003', '${U.creative}', 'Test Creative Member', 'member', 'active', 'Creative@Example.test'),
    ('PPL-9004', '${U.elco}', 'Test Elco Growth Member', 'member', 'active', 'elco@example.test'),
    ('PPL-9005', '${U.guest}', 'Test Guest', 'guest', 'active', 'guest@example.test'),
    ('PPL-9006', '${U.offboarded}', 'Test Offboarded', 'member', 'offboarded', 'offboarded@example.test');
  insert into public.os_people (id, full_name, org_role, status) values ('PPL-9007', 'No Account Yet', 'member', 'onboarding');
  insert into public.os_person_companies values
    ('PPL-9001','IEL'),('PPL-9001','ELC'),('PPL-9002','IEL'),('PPL-9002','ELC'),('PPL-9003','IEL'),('PPL-9004','ELC'),('PPL-9005','IEL'),('PPL-9006','IEL'),('PPL-9007','IEL');
  insert into public.os_person_divisions values
    ('PPL-9002','DIV-03',true),('PPL-9003','DIV-04',false),('PPL-9004','DIV-03',false),('PPL-9006','DIV-04',false),('PPL-9007','DIV-03',false);`);

// JWT claims for a user: a Google (oauth) sign-in a minute ago, in their own session. Founders have passed MFA.
const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid, extra = {}) => (uid ? {
  sub: uid, role: "authenticated", session_id: SESS[uid], aal: uid === U.founder ? "aal2" : "aal1",
  amr: [{ method: "oauth", timestamp: nowS() - 60 }], ...extra,
} : {});
async function as(role, uid, q, params = [], extra = {}) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsFor(uid, extra))]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const user = (uid, q, params, extra) => as("authenticated", uid, q, params, extra);
const one = async (uid, q, params, extra) => Object.values((await user(uid, q, params, extra)).rows[0])[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 60)})`) : bad(n, e.message); } };
const is = (want) => (got) => (got === want ? null : `got ${JSON.stringify(got)}`);
const canView = (uid, company, division, sens, id = "D1") =>
  one(uid, `select public.os_can_view($1, $2, $3, 'document', $4)`, [company, division, sens, id]);
const canEdit = (uid, company, division, sens, id = "D1") =>
  one(uid, `select public.os_can_edit($1, $2, $3, 'document', $4)`, [company, division, sens, id]);
const count = (uid, table) => one(uid, `select count(*)::int from public.${table}`);


const F = U.founder, M = U.manager, C = U.creative, E = U.elco, G = U.guest, O = U.outsider;
const id1 = async (uid, q, p) => (await user(uid, q, p)).rows[0]?.id;
const svc = (q, p) => as("service_role", null, q, p);
const truthy = (v) => (v === true ? null : `got ${JSON.stringify(v)}`);
// Monday 16 November 2026, 10:00-11:00 in Jakarta.
const T = "2026-11-16T03:00:00Z", T2 = "2026-11-16T04:00:00Z";
const ev = (uid, extra, cols = "", vals = "") => id1(uid, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at${cols}) values ${extra}${vals}) returning id`);

const pCre = await id1(F, "insert into public.os_projects (company_code, division_id, name) values ('IEL', 'DIV-04', 'Creative launch') returning id");
const tCre = await id1(F, "insert into public.os_tasks (project_id, title, due_date) values ($1, 'Poster', '2026-11-20') returning id", [pCre]);
const pElc = await id1(F, "insert into public.os_projects (company_code, division_id, name) values ('ELC', 'DIV-03', 'Elco launch') returning id");
const tElc = await id1(F, "insert into public.os_tasks (company_code, division_id, title) values ('ELC', 'DIV-03', 'Elco task') returning id");

// ── Recurrence rules
const badRule = (n, rule) => te(n, () => user(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, recurrence) values ('IEL', 'DIV-04', 'x', '${T}', '${T2}', $1)`, [rule]), /check/);
await badRule("an unknown frequency is refused", '{"freq": "hourly"}');
await badRule("until and count together are refused", '{"freq": "weekly", "until": "2026-12-31", "count": 3}');
await badRule("weekdays only go with a weekly rule", '{"freq": "daily", "byweekday": ["MO"]}');
await badRule("unknown rule keys are refused", '{"freq": "weekly", "foo": 1}');
await badRule("an interval of 0 is refused", '{"freq": "weekly", "interval": 0}');
await badRule("a malformed end date is refused", '{"freq": "weekly", "until": "31/12/2026"}');
let ser;
await t("a member creates a weekly Monday series as ONE row", async () => {
  ser = await id1(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, recurrence) values ('IEL', 'DIV-04', 'Creative weekly', '${T}', '${T2}', '{"freq": "weekly", "byweekday": ["MO"], "until": "2026-12-28"}') returning id`);
  return one(C, "select count(*)::int from public.os_events where title = 'Creative weekly'");
}, is(1));
await t("…its window ends after the last occurrence (28 Dec 11:00 Jakarta)", () => one(C, "select series_ends_at = '2026-12-28T18:00:00Z'::timestamptz from public.os_events where id = $1", [ser]), truthy);
await t("a count rule gets an upper bound too", async () => {
  const id = await id1(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, recurrence) values ('IEL', 'DIV-04', 'Four times', '${T}', '${T2}', '{"freq": "weekly", "interval": 2, "count": 4}') returning id`);
  return one(C, "select series_ends_at = ('${T2}'::timestamptz + interval '56 days') from public.os_events where id = $1".replace("${T2}", T2), [id]);
}, truthy);
await t("an open-ended series has no end", async () => {
  const id = await id1(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, recurrence) values ('IEL', 'DIV-04', 'Forever', '${T}', '${T2}', '{"freq": "daily"}') returning id`);
  return one(C, "select series_ends_at is null from public.os_events where id = $1", [id]);
}, truthy);

// ── Occurrence exceptions
const occ2 = "2026-11-23T03:00:00Z", occ3 = "2026-11-30T03:00:00Z";
await t("the organiser moves one occurrence (an exception row, the series is untouched)", async () => {
  await user(C, "insert into public.os_event_exceptions (event_id, occurrence_start, starts_at, ends_at) values ($1, $2, '2026-11-24T03:00:00Z', '2026-11-24T04:00:00Z')", [ser, occ2]);
  return one(C, "select (select count(*) from public.os_event_exceptions where event_id = $1)::text || '|' || (select starts_at = $2::timestamptz from public.os_events where id = $1)::text", [ser, T]);
}, is("1|true"));
await t("…and the change is in the event's history", () => one(C, "select count(*)::int from public.os_activity where entity_type = 'event' and entity_id = $1 and action = 'occurrence_insert'", [ser]), is(1));
await te("an Elco member can't add exceptions to an IELSco series", () => user(E, "insert into public.os_event_exceptions (event_id, occurrence_start, cancelled) values ($1, $2, true)", [ser, occ3]), /row-level/);
await te("a one-off event has no occurrences to change", async () => { const one_ = await ev(C, "('IEL', 'DIV-04', 'One-off', '" + T + "', '" + T2 + "'"); return user(C, "insert into public.os_event_exceptions (event_id, occurrence_start, cancelled) values ($1, $2, true)", [one_, T]); }, /Only a recurring event/);
await te("an exception can't end before it starts", () => user(C, "insert into public.os_event_exceptions (event_id, occurrence_start, starts_at, ends_at) values ($1, $2, '2026-11-30T05:00:00Z', '2026-11-30T04:00:00Z')", [ser, occ3]), /check/);
await te("exceptions take only https meeting links", () => user(C, "insert into public.os_event_exceptions (event_id, occurrence_start, meeting_url) values ($1, $2, 'http://x')", [ser, occ3]), /check/);

// ── Notifications
let mtg;
await t("the manager schedules a Growth meeting and invites the creative member", async () => {
  mtg = await ev(M, "('IEL', 'DIV-03', 'Growth weekly', '" + T + "', '" + T2 + "'");
  await user(M, "insert into public.os_event_attendees (event_id, person_id, via_group) values ($1, 'PPL-9003', 'Managers + Creative'), ($1, 'PPL-9002', null)", [mtg]);
  return one(C, "select string_agg(kind || ':' || entity_id, ',') from public.os_notifications");
}, (v) => (v === `event_invited:${mtg}` ? null : `got ${v}`));
await t("…the organiser isn't notified about their own change", () => one(M, "select count(*)::int from public.os_notifications"), is(0));
await t("…the invitation snapshot keeps the group and who added them", () => one(M, "select via_group || '|' || added_by from public.os_event_attendees where event_id = $1 and person_id = 'PPL-9003'", [mtg]), is("Managers + Creative|PPL-9002"));
await te("nobody can claim someone else added an attendee", () => user(M, "insert into public.os_event_attendees (event_id, person_id, added_by) values ($1, 'PPL-9001', 'PPL-9001')", [mtg]), /permission denied/);
await t("moving the meeting notifies the attendees once", async () => {
  await user(M, "update public.os_events set starts_at = '2026-11-17T03:00:00Z', ends_at = '2026-11-17T04:00:00Z' where id = $1", [mtg]);
  await user(M, "update public.os_events set title = 'Growth weekly sync' where id = $1", [mtg]);
  return one(C, "select count(*)::int from public.os_notifications where kind = 'event_rescheduled'");
}, is(1));
await t("cancelling one occurrence of a series notifies its attendees", async () => {
  await user(C, "insert into public.os_event_attendees (event_id, person_id) values ($1, 'PPL-9002')", [ser]);
  await user(C, "insert into public.os_event_exceptions (event_id, occurrence_start, cancelled) values ($1, $2, true)", [ser, occ3]);
  return one(M, "select count(*)::int from public.os_notifications where kind = 'event_cancelled' and entity_id = $1", [ser]);
}, is(1));
await t("people read only their own notifications", () => one(E, "select count(*)::int from public.os_notifications"), is(0));
await t("a person marks a notification read", () => user(C, "update public.os_notifications set read_at = now() returning id"), (r) => (r.rows.length >= 1 ? null : "nothing updated"));
await te("…but can't change what it says", () => user(C, "update public.os_notifications set title = 'x'"), /permission denied/);
await te("nobody writes notifications through the API", () => user(F, "insert into public.os_notifications (person_id, kind, entity_type, entity_id, title, dedupe_key) values ('PPL-9003', 'task_assigned', 'task', 'x', 'x', 'x')"), /permission denied/);
await t("assigning a task notifies the assignee; moving its deadline notifies again", async () => {
  await user(F, "insert into public.os_task_assignees (task_id, person_id) values ($1, 'PPL-9003')", [tCre]);
  await user(F, "update public.os_tasks set due_date = '2026-11-25' where id = $1", [tCre]);
  return one(C, "select string_agg(kind, ',' order by id) from public.os_notifications where entity_id = $1", [tCre]);
}, is("task_assigned,task_due_changed"));
await t("…and the assignment records who assigned", () => one(F, "select added_by from public.os_task_assignees where task_id = $1 and person_id = 'PPL-9003'", [tCre]), is("PPL-9001"));

// ── Event ↔ task links
await t("the organiser links a task to their series", () => user(C, "insert into public.os_event_tasks (event_id, task_id) values ($1, $2) returning event_id", [ser, tCre]), (r) => (r.rows.length === 1 ? null : "not linked"));
await te("a task from another company can't be linked", () => user(F, "insert into public.os_event_tasks (event_id, task_id) values ($1, $2)", [ser, tElc]), /row-level/);
await t("the Elco member sees no IELSco links", () => one(E, "select count(*)::int from public.os_event_tasks"), is(0));
await t("an event made with one linked task gets the link row; the old column is back-filled on re-apply", async () => {
  const id = await ev(F, "('IEL', 'DIV-04', 'Poster review', '" + T + "', '" + T2 + "'", ", task_id", `, '${tCre}'`);
  const before = await one(F, "select count(*)::int from public.os_event_tasks where event_id = $1", [id]);
  await svc("delete from public.os_event_tasks where event_id = $1", [id]);
  await db.exec(readFileSync(join(dir, "20261110000000_company_os_planning.sql"), "utf8"));
  const after = await one(F, "select count(*)::int from public.os_event_tasks where event_id = $1", [id]);
  return `${before}|${after}`;
}, is("1|1"));
await t("os_create_event writes attendees with their group and task links in one go", async () => {
  const r = await user(C, "select public.os_create_event($1::jsonb) id", [JSON.stringify({ title: "Shoot", company_code: "IEL", division_id: "DIV-04", starts_at: T, ends_at: T2,
    attendees: [{ person_id: "PPL-9001", via_group: "C-Level" }, "PPL-9002"], task_ids: [tCre], recurrence: { freq: "weekly", count: 3 } })]);
  const id = r.rows[0].id;
  return one(C, "select (select string_agg(person_id || ':' || coalesce(via_group, '-'), ',' order by person_id) from public.os_event_attendees where event_id = $1) || '|' || (select count(*) from public.os_event_tasks where event_id = $1) || '|' || (select recurrence->>'count' from public.os_events where id = $1)", [id]);
}, is("PPL-9001:C-Level,PPL-9002:-|1|3"));

// ── Dependencies
let tA, tB;
await t("tasks can depend on each other", async () => {
  tA = await id1(F, "insert into public.os_tasks (company_code, division_id, title) values ('IEL', 'DIV-04', 'Shoot') returning id");
  tB = await id1(F, "insert into public.os_tasks (company_code, division_id, title) values ('IEL', 'DIV-04', 'Edit') returning id");
  return (await user(F, "insert into public.os_task_dependencies (task_id, depends_on_task_id) values ($1, $2) returning task_id", [tB, tA])).rows.length;
}, is(1));
await te("…but not in a loop", () => user(F, "insert into public.os_task_dependencies (task_id, depends_on_task_id) values ($1, $2)", [tA, tB]), /loop/);
await te("…nor across companies", () => user(F, "insert into public.os_task_dependencies (task_id, depends_on_task_id) values ($1, $2)", [tA, tElc]), /same company/);
await te("the Elco member can't add dependencies to IELSco tasks", () => user(E, "insert into public.os_task_dependencies (task_id, depends_on_task_id) values ($1, $2)", [tA, tCre]), /row-level/);
await t("founders link milestones to each other", () => user(F, "insert into public.os_timeline_dependencies (item_id, depends_on_id) values ('TL-002', 'TL-001') returning item_id"), (r) => (r.rows.length === 1 ? null : "no"));
await te("…without loops", () => user(F, "insert into public.os_timeline_dependencies (item_id, depends_on_id) values ('TL-001', 'TL-002')"), /loop/);
await te("members can't change milestone dependencies", () => user(C, "insert into public.os_timeline_dependencies (item_id, depends_on_id) values ('TL-003', 'TL-001')"), /row-level/);
await t("a founder links a milestone to a project and sets its priority", () => user(F, "update public.os_timeline_items set project_id = $1, priority = 'P1 Critical' where id = 'TL-001' returning id", [pCre]), (r) => (r.rows.length === 1 ? null : "no"));

// ── Task scheduling (explicit, never from the deadline)
await t("a scheduled block is separate from the deadline", async () => {
  await user(F, "update public.os_tasks set scheduled_start = '2026-11-18T02:00:00Z', scheduled_end = '2026-11-18T04:00:00Z', start_date = '2026-11-17' where id = $1", [tA]);
  return one(F, "select (due_date is null)::text || '|' || (scheduled_start is not null)::text || '|' || on_calendar::text from public.os_tasks where id = $1", [tA]);
}, is("true|true|false"));
await te("a block can't end before it starts", () => user(F, "update public.os_tasks set scheduled_start = '2026-11-18T05:00:00Z', scheduled_end = '2026-11-18T04:00:00Z' where id = $1", [tA]), /check/);
await te("a start without an end is refused", () => user(F, "update public.os_tasks set scheduled_start = '2026-11-18T05:00:00Z', scheduled_end = null where id = $1", [tA]), /check/);

// ── Campaigns and content
let cmp;
await t("the Growth manager creates a campaign: CMP-0001", async () => { cmp = await id1(M, "insert into public.os_campaigns (company_code, division_id, name, objective, start_date, end_date) values ('IEL', 'DIV-03', 'January launch', 'Sign-ups', '2027-01-04', '2027-01-31') returning id"); return cmp; }, is("CMP-0001"));
await t("the Elco member can't see it", () => one(E, "select count(*)::int from public.os_campaigns"), is(0));
await te("the Elco member can't create an IELSco campaign", () => user(E, "insert into public.os_campaigns (company_code, division_id, name) values ('IEL', 'DIV-03', 'x')"), /row-level/);
await t("content in a campaign takes the campaign's company and name", async () => {
  const id = await id1(M, "insert into public.os_campaign_items (company_code, division_id, campaign_id, title, status, publish_at) values ('ELC', 'DIV-03', $1, 'Teaser', 'In review', '2027-01-04T05:00:00Z') returning id", [cmp]);
  return one(M, "select company_code || '|' || campaign || '|' || status from public.os_campaign_items where id = $1", [id]);
}, is("IEL|January launch|In review"));
await t("a creator sees a Confidential piece they make", async () => {
  await user(M, "insert into public.os_campaign_items (company_code, division_id, title, sensitivity, creator_person_id) values ('IEL', 'DIV-03', 'Pricing reel', 'Confidential', 'PPL-9003')");
  return one(C, "select count(*)::int from public.os_campaign_items where title = 'Pricing reel'");
}, is(1));
await t("content slots are created in one batch", () => one(M, "select jsonb_array_length(public.os_create_content_items($1::jsonb))", [JSON.stringify(["Mon", "Tue", "Wed"].map((d, i) => ({ company_code: "IEL", campaign_id: cmp, title: `${d} post`, channel: "Instagram", publish_at: `2027-01-0${4 + i}T05:00:00Z` })))]), is(3));
await te("…of at most 31", () => user(M, "select public.os_create_content_items($1::jsonb)", [JSON.stringify(Array.from({ length: 32 }, (_, i) => ({ company_code: "IEL", title: `p${i}` })))]), /Between 1 and 31/);
await t("a campaign activity is an event linked to the campaign", () => ev(M, "('IEL', 'DIV-03', 'Launch day', '2027-01-10T02:00:00Z', '2027-01-10T10:00:00Z'", ", campaign_id, category", `, '${cmp}', 'Campaign'`), (v) => (v ? null : "no id"));
await t("…and takes the campaign's company", async () => { const id = await ev(F, "('ELC', 'DIV-03', 'Launch prep', '" + T + "', '" + T2 + "'", ", campaign_id", `, '${cmp}'`); return one(F, "select company_code from public.os_events where id = $1", [id]); }, is("IEL"));
await te("…and a campaign can't be mixed with another company's project", () => ev(F, "('ELC', 'DIV-03', 'x', '" + T + "', '" + T2 + "'", ", project_id, campaign_id", `, '${pElc}', '${cmp}'`), /same company/);
await t("documents and comments attach to campaigns and events", async () => {
  await user(M, "insert into public.os_comments (entity_type, entity_id, body) values ('campaign_plan', $1, 'Brief agreed'), ('event', $2, 'Agenda posted')", [cmp, mtg]);
  return one(M, "select count(*)::int from public.os_comments where entity_type in ('campaign_plan', 'event')");
}, is(2));

// ── Invitation candidates (groups are built from these)
const cand = async (uid, co) => (await user(uid, "select person_id from public.os_invite_candidates($1) order by 1", [co])).rows.map((r) => r.person_id).join(",");
await t("IELSco candidates: active staff only (no guest, offboarded or onboarding person, no Elco-only member)", () => cand(M, "IEL"), is("PPL-9001,PPL-9002,PPL-9003"));
await t("…with the divisions they manage", () => one(M, "select managed_divisions::text from public.os_invite_candidates('IEL') where person_id = 'PPL-9002'"), is("{DIV-03}"));
await t("the Elco member gets no IELSco candidates", () => cand(E, "IEL"), is(""));
await t("a guest gets no candidates", () => cand(G, "IEL"), is(""));
await t("signed-out callers get nothing", () => cand(O, "IEL"), is(""));

// ── Free/busy for conflict warnings
await t("busy times: a colleague's event the caller can't see is just 'Busy'", async () => {
  const conf = await ev(M, "('IEL', 'DIV-03', 'Salary talk', '2026-11-18T03:00:00Z', '2026-11-18T04:00:00Z'", ", sensitivity", ", 'Confidential'");
  const r = await user(C, "select title, ref_id from public.os_busy(array['PPL-9002'], '2026-11-18T00:00:00Z', '2026-11-19T00:00:00Z') where starts_at = '2026-11-18T03:00:00Z'");
  return r.rows.map((x) => `${x.title}|${x.ref_id}`).join(",") + (conf ? "" : "!");
}, is("Busy|null"));
await t("…people the caller shares no company with are left out", () => one(C, "select count(*)::int from public.os_busy(array['PPL-9004'], '2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z')"), is(0));
await t("…a recurring series comes back once with its exceptions", () => one(C, "select jsonb_array_length(exceptions) from public.os_busy(array['PPL-9003'], '2026-11-20T00:00:00Z', '2026-12-10T00:00:00Z') where ref_id = $1", [ser]), is(2));
await t("…scheduled task blocks count as busy", async () => { await user(F, "update public.os_tasks set owner_person_id = 'PPL-9001' where id = $1", [tA]); return one(F, "select count(*)::int from public.os_busy(array['PPL-9001'], '2026-11-18T00:00:00Z', '2026-11-19T00:00:00Z') where source = 'task'"); }, is(1));
await te("…and the window is capped", () => user(C, "select * from public.os_busy(array['PPL-9002'], '2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z')"), /62 days/);

// ── "This and following": split a series
let split;
await t("splitting a series ends the original and starts a linked new master", async () => {
  split = (await user(C, "select public.os_split_series($1, '2026-12-07T03:00:00Z', '2026-12-06', $2::jsonb, false) id", [ser, JSON.stringify({ starts_at: "2026-12-07T04:00:00Z", ends_at: "2026-12-07T05:00:00Z", title: "Creative weekly (11:00)" })])).rows[0].id;
  return one(C, "select (select recurrence->>'until' from public.os_events where id = $1) || '|' || (select series_id || '|' || title from public.os_events where id = $2) || '|' || (select count(*) from public.os_event_attendees where event_id = $2) || '|' || (select count(*) from public.os_event_tasks where event_id = $2)", [ser, split]);
}, (v) => (v === `2026-12-06|${ser}|Creative weekly (11:00)|1|1` ? null : `got ${v}`));
await t("…copying attendees is not a new invitation", () => one(M, "select count(*)::int from public.os_notifications where kind = 'event_invited' and entity_id = $1", [split]), is(0));
await t("…but the shortened series is a change the attendees hear about", () => one(M, "select count(*)::int from public.os_notifications where kind = 'event_rescheduled' and entity_id = $1", [ser]), is(1));
await te("…only an editor can split", () => user(M, "select public.os_split_series($1, '2026-12-14T04:00:00Z', '2026-12-13', '{\"starts_at\": \"2026-12-14T04:00:00Z\", \"ends_at\": \"2026-12-14T05:00:00Z\"}'::jsonb)", [split]), /can't change|row-level/);
await te("…and not at the first occurrence", () => user(C, "select public.os_split_series($1, $2, '2026-12-06', '{\"starts_at\": \"2026-12-07T04:00:00Z\", \"ends_at\": \"2026-12-07T05:00:00Z\"}'::jsonb)", [split, "2026-12-07T04:00:00Z"]), /first occurrence/);

// ── Google invitations and attendee answers are server-written
await te("a member can't write Google's RSVP answer", () => user(M, "update public.os_event_attendees set response_status = 'accepted' where event_id = $1", [mtg]), /permission denied/);
await t("the server records it", () => svc("update public.os_event_attendees set response_status = 'accepted' where event_id = $1 and person_id = 'PPL-9003' returning person_id", [mtg]), (r) => (r.rows.length === 1 ? null : "no"));
await t("editing a synced event's invitations or rule marks it to be pushed, never silently", async () => {
  await svc("update public.os_events set google_synced_by = 'PPL-9003', google_event_id = 'g1', sync_state = 'synced' where id = $1", [split]);
  await user(C, "update public.os_events set recurrence = '{\"freq\": \"weekly\", \"count\": 2}' where id = $1", [split]);
  return one(C, "select sync_state from public.os_events where id = $1", [split]);
}, is("pending"));

// ── AI action kinds
await t("the new AI action kinds are accepted", async () => {
  await svc("insert into public.os_ai_actions (person_id, agent, action_type, payload, preview) select 'PPL-9003', 'assistant', k, '{}', 'x' from unnest(array['create_campaign', 'move_event', 'invite_to_event', 'create_content_items']) k");
  return one(C, "select count(*)::int from public.os_ai_actions where action_type in ('create_campaign', 'move_event', 'invite_to_event', 'create_content_items')");
}, is(4));

// ── Grants hygiene
await t("anon has no privileges on any os_ table", () => db.query("select count(*)::int c from information_schema.role_table_grants where grantee = 'anon' and table_name like 'os\\_%'"), (r) => is(0)(r.rows[0].c));
await t("every os_ table has RLS on", () => db.query("select string_agg(c.relname, ',') bad from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'os\\_%' and not c.relrowsecurity"), (r) => (r.rows[0].bad === null ? null : r.rows[0].bad));
await t("anon can execute none of the new functions", () => db.query("select string_agg(p.proname, ',') bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('os_busy', 'os_invite_candidates', 'os_split_series', 'os_create_content_items', 'os_notify', 'os_can_view_campaign') and has_function_privilege('anon', p.oid, 'execute')"), (r) => (r.rows[0].bad === null ? null : r.rows[0].bad));
await t("authenticated can't call the notification writer", () => db.query("select has_function_privilege('authenticated', 'public.os_notify(text, text, text, text, text, text, text)', 'execute') x"), (r) => is(false)(r.rows[0].x));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
