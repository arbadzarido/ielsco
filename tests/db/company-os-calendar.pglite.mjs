// Company OS calendar, Google Calendar connections, AI action types, folder-route statuses and timeline inserts
// (20261109000000) on PGlite, on top of every earlier Company OS migration.
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql"]) {
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
const rows = async (uid, q, p) => (await user(uid, q, p)).rows;
const id1 = async (uid, q, p) => (await user(uid, q, p)).rows[0]?.id;

const svc = (q, p) => as("service_role", null, q, p);
const T = "2026-11-10T07:00:00Z", T2 = "2026-11-10T08:00:00Z";

// ── Projects and tasks to link to
const pCre = await id1(F, "insert into public.os_projects (company_code, division_id, name) values ('IEL', 'DIV-04', 'Creative launch') returning id");
const pGroConf = await id1(M, "insert into public.os_projects (company_code, division_id, name, sensitivity) values ('IEL', 'DIV-03', 'Growth confidential', 'Confidential') returning id");
const pElc = await id1(F, "insert into public.os_projects (company_code, division_id, name) values ('ELC', 'DIV-03', 'Elco launch') returning id");
const tCre = await id1(F, "insert into public.os_tasks (project_id, title, due_date) values ($1, 'Poster', '2026-11-12') returning id", [pCre]);

// ── Events
let ev1, ev2, evConf;
await t("a member creates a division event; ID starts at EV-0001", async () => { ev1 = await id1(C, `insert into public.os_events (company_code, division_id, title, category, starts_at, ends_at) values ('IEL', 'DIV-04', 'Creative stand-up', 'Meeting', '${T}', '${T2}') returning id`); return ev1; }, is("EV-0001"));
await t("creator is stamped from the session", () => one(C, "select created_by from public.os_events where id = $1", [ev1]), is("PPL-9003"));
await t("an event on a project takes the project's company and division", async () => { ev2 = await id1(C, `insert into public.os_events (company_code, project_id, title, starts_at, ends_at) values ('ELC', $1, 'Launch review', '${T}', '${T2}') returning id`, [pCre]); return one(C, "select company_code || '/' || division_id from public.os_events where id = $1", [ev2]); }, is("IEL/DIV-04"));
await t("the manager creates a Confidential Growth event", async () => { evConf = await id1(M, `insert into public.os_events (company_code, division_id, title, sensitivity, starts_at, ends_at) values ('IEL', 'DIV-03', 'Pricing talk', 'Confidential', '${T}', '${T2}') returning id`); return evConf ? null : "no id"; }, (w) => w);
await te("a member cannot create an event in another division", () => user(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at) values ('IEL', 'DIV-03', 'x', '${T}', '${T2}')`), /row-level/);
await te("an IELSco member cannot create an Elco event", () => user(C, `insert into public.os_events (company_code, title, starts_at, ends_at) values ('ELC', 'x', '${T}', '${T2}')`), /row-level/);
await te("a member cannot create a Restricted event", () => user(C, `insert into public.os_events (company_code, division_id, title, sensitivity, starts_at, ends_at) values ('IEL', 'DIV-04', 'x', 'Restricted', '${T}', '${T2}')`), /row-level/);
await te("an event cannot end before it starts", () => user(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at) values ('IEL', 'DIV-04', 'x', '${T2}', '${T}')`), /check/);
await te("a meeting link must be https", () => user(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, meeting_url) values ('IEL', 'DIV-04', 'x', '${T}', '${T2}', 'javascript:alert(1)')`), /check/);
await te("unknown categories are refused", () => user(C, `insert into public.os_events (company_code, division_id, title, category, starts_at, ends_at) values ('IEL', 'DIV-04', 'x', 'Party', '${T}', '${T2}')`), /check/);
await te("nobody picks their own event ID", () => user(F, `insert into public.os_events (id, company_code, title, starts_at, ends_at) values ('EV-0100', 'IEL', 'x', '${T}', '${T2}')`), /permission denied/);
await te("Google link fields can't be written through the API", () => user(C, `insert into public.os_events (company_code, division_id, title, starts_at, ends_at, google_event_id) values ('IEL', 'DIV-04', 'x', '${T}', '${T2}', 'g1')`), /permission denied/);
await te("a member cannot link a project they can't see", () => user(C, `insert into public.os_events (company_code, project_id, title, starts_at, ends_at) values ('IEL', $1, 'x', '${T}', '${T2}')`, [pGroConf]), /linked project|row-level/);
await te("a task in another company can't be linked", () => user(F, `insert into public.os_events (company_code, task_id, title, starts_at, ends_at) values ('ELC', $1, 'x', '${T}', '${T2}')`, [tCre]), /same company/);
await t("a task in the same company links", () => id1(F, `insert into public.os_events (company_code, task_id, title, category, starts_at, ends_at) values ('IEL', $1, 'Poster review', 'Deadline', '${T}', '${T2}') returning id`, [tCre]), (v) => (v ? null : "no id"));
await t("a milestone links", () => id1(F, `insert into public.os_events (company_code, timeline_item_id, title, starts_at, ends_at) values ('HQ', 'TL-001', 'Milestone check', '${T}', '${T2}') returning id`), (v) => (v ? null : "no id"));

// Visibility
await t("the creative member doesn't see the Confidential Growth event", () => one(C, "select count(*)::int from public.os_events where id = $1", [evConf]), is(0));
await t("the Elco member doesn't see IELSco events", () => one(E, "select count(*)::int from public.os_events where company_code = 'IEL'"), is(0));
await t("outsiders see no events", () => count(O, "os_events"), is(0));
await t("the guest sees no events", () => count(G, "os_events"), is(0));
await te("anon cannot read events", () => as("anon", null, "select * from public.os_events"), /permission denied/);

// Attendees
await te("only staff of the event's company can be invited (Elco member to an IELSco event)", () => user(M, "insert into public.os_event_attendees values ($1, 'PPL-9004')", [evConf]), /row-level/);
await te("guests can't be invited", () => user(M, "insert into public.os_event_attendees values ($1, 'PPL-9005')", [evConf]), /row-level/);
await t("the manager invites the creative member to the Confidential event", () => user(M, "insert into public.os_event_attendees values ($1, 'PPL-9003') returning event_id", [evConf]), (r) => (r.rows.length === 1 ? null : "not inserted"));
await t("…who now sees it", () => one(C, "select count(*)::int from public.os_events where id = $1", [evConf]), is(1));
await t("…but still can't edit it", () => user(C, "update public.os_events set title = 'hacked' where id = $1 returning id", [evConf]), (r) => (r.rows.length === 0 ? null : "updated"));
await te("a member can't invite people to an event they can't edit", () => user(C, "insert into public.os_event_attendees values ($1, 'PPL-9007')", [evConf]), /row-level/);

// Edits and deletes
await t("the creator edits their event", () => user(C, "update public.os_events set title = 'Creative stand-up (moved)' where id = $1 returning id", [ev1]), (r) => (r.rows.length === 1 ? null : "not updated"));
await t("the company can't be changed by an edit", async () => { await user(F, "update public.os_events set company_code = 'ELC' where id = $1", [ev1]).catch(() => {}); return one(F, "select company_code from public.os_events where id = $1", [ev1]); }, is("IEL"));
await t("a member can't delete someone else's event", () => user(C, "delete from public.os_events where id = $1 returning id", [evConf]), (r) => (r.rows.length === 0 ? null : "deleted"));

// Sync state: the server links an event to Google; a later edit in the OS marks it pending, never silently re-synced
await svc(`update public.os_events set google_synced_by = 'PPL-9003', google_calendar_id = 'primary', google_event_id = 'gev1', google_etag = '"1"', sync_state = 'synced' where id = '${ev1}'`);
await t("a member's edit can't touch the Google link", async () => { await user(C, "update public.os_events set google_event_id = 'other' where id = $1", [ev1]).catch(() => {}); return one(C, "select google_event_id from public.os_events where id = $1", [ev1]); }, is("gev1"));
await t("editing a synced event in the OS marks it pending", async () => { await user(C, "update public.os_events set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' where id = $1", [ev1]); return one(C, "select sync_state from public.os_events where id = $1", [ev1]); }, is("pending"));
await te("one Google event can link to only one OS event per calendar", () => svc(`update public.os_events set google_synced_by = 'PPL-9003', google_event_id = 'gev1' where id = '${ev2}'`), /duplicate|unique/);
await t("the creator deletes their own event", () => user(C, "delete from public.os_events where id = $1 returning id", [ev1]), (r) => (r.rows.length === 1 ? null : "not deleted"));
await t("event activity is recorded and readable by who can see the event", () => one(M, "select count(*)::int from public.os_activity where entity_type = 'event' and entity_id = $1", [evConf]), (n) => (n >= 1 ? null : `got ${n}`));
await t("…and not by who can't", () => one(E, "select count(*)::int from public.os_activity where entity_type = 'event' and entity_id = $1", [evConf]), is(0));

// ── Calendar connections: server only
await svc("insert into public.os_calendar_connections (person_id, google_email, token_sealed, scopes) values ('PPL-9003', 'creative@example.test', 'v1.a.b.c', 'calendar.events')");
await te("a person can't read even their own calendar token through the API", () => user(C, "select token_sealed from public.os_calendar_connections"), /permission denied/);
await te("founders can't read calendar tokens through the API", () => user(F, "select * from public.os_calendar_connections"), /permission denied/);
await te("anon can't read calendar connections", () => as("anon", null, "select * from public.os_calendar_connections"), /permission denied/);

// ── Timeline milestones
await t("a founder adds a milestone; ID continues after TL-104", () => id1(F, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, due_date) values ('IEL', 'WS1', 'Workstream', 'New milestone', '2026-12-01') returning id"), is("TL-105"));
await t("the Growth manager adds a Growth-led milestone", () => id1(M, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, lead_division_id, due_date) values ('IEL', 'WS1', 'Workstream', 'Growth milestone', 'DIV-03', '2026-12-01') returning id"), (v) => (v ? null : "no id"));
await te("a manager can't add a milestone led by another division", () => user(M, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, lead_division_id) values ('IEL', 'WS1', 'W', 'x', 'DIV-04')"), /row-level/);
await te("a member can't add milestones", () => user(C, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, lead_division_id) values ('IEL', 'WS1', 'W', 'x', 'DIV-04')"), /row-level/);
await t("a task can point at its milestone", () => user(F, "update public.os_tasks set timeline_item_id = 'TL-001' where id = $1 returning timeline_item_id", [tCre]), (r) => (r.rows[0]?.timeline_item_id === "TL-001" ? null : JSON.stringify(r.rows)));

// ── AI actions accept the new types
await t("create_event, create_tasks and create_timeline_item are valid action types", () => svc(`insert into public.os_ai_actions (person_id, agent, action_type, payload, preview) values ('PPL-9003', 'assistant', 'create_event', '{}', 'x'), ('PPL-9003', 'assistant', 'create_tasks', '{}', 'x'), ('PPL-9003', 'assistant', 'create_timeline_item', '{}', 'x') returning id`), (r) => (r.rows.length === 3 ? null : "not inserted"));
await te("unknown action types are still refused", () => svc("insert into public.os_ai_actions (person_id, agent, action_type, payload, preview) values ('PPL-9003', 'assistant', 'run_sql', '{}', 'x')"), /check/);
await te("a member still can't confirm an action through the API", async () => { const r = await user(C, "update public.os_ai_actions set status = 'confirmed' where action_type = 'create_event' returning id"); if (!r.rows.length) throw new Error("no rows (blocked)"); }, /no rows|row-level/);

// ── Folder routes
const route = (await svc("select id from public.os_folder_routes where status = 'proposed' order by folder_name limit 1")).rows[0].id;
await te("members can't approve routes", async () => { const r = await user(M, "update public.os_folder_routes set status = 'approved' where id = $1 returning id", [route]); if (!r.rows.length) throw new Error("no rows (blocked)"); }, /no rows|row-level/);
await t("a founder rejects a route; no approver is recorded", async () => { await user(F, "update public.os_folder_routes set status = 'rejected' where id = $1", [route]); return one(F, "select status || ':' || coalesce(approved_by, '-') from public.os_folder_routes where id = $1", [route]); }, is("rejected:-"));
await t("a founder approves it after all; approver from the session", async () => { await user(F, "update public.os_folder_routes set status = 'approved' where id = $1", [route]); return one(F, "select status || ':' || approved_by from public.os_folder_routes where id = $1", [route]); }, is("approved:PPL-9001"));
await t("changing the folder clears the last access check", async () => { await svc(`update public.os_folder_routes set access_ok = true, access_checked_at = now() where id = '${route}'`); await user(F, "update public.os_folder_routes set drive_folder_id = 'NEWFOLDERID000000000000' where id = $1", [route]); return one(F, "select coalesce(access_ok::text, 'unchecked') from public.os_folder_routes where id = $1", [route]); }, is("unchecked"));
await t("a founder adds a new proposed route", () => user(F, "insert into public.os_folder_routes (company_code, sensitivity, drive_folder_id, folder_name) values ('IEL', 'Confidential', 'FOLDERID00000000000000000', 'IEL confidential') returning status"), (r) => (r.rows[0]?.status === "proposed" ? null : JSON.stringify(r.rows)));
await te("two approved routes can't cover the same combination", async () => { await user(F, "insert into public.os_folder_routes (company_code, sensitivity, drive_folder_id, folder_name, status) values ('IEL', 'Confidential', 'FOLDERID00000000000000001', 'a', 'approved')"); await user(F, "insert into public.os_folder_routes (company_code, sensitivity, drive_folder_id, folder_name, status) values ('IEL', 'Confidential', 'FOLDERID00000000000000002', 'b', 'approved')"); }, /duplicate|unique/);

// ── Creating records from confirmed AI actions (security invoker: the caller's own RLS)
const created = async (uid, tasks) => (await user(uid, "select public.os_create_tasks($1::jsonb) r", [JSON.stringify(tasks)])).rows[0].r;
await t("a member creates two Creative tasks in one call, with an assignee", async () => {
  const r = await created(C, [{ title: "Reel cut", company_code: "IEL", division_id: "DIV-04", owner_person_id: "PPL-9003", assignees: ["PPL-9003"], due_date: "2026-11-13" }, { title: "Reel caption", company_code: "IEL", division_id: "DIV-04" }]);
  const ids = r.map((x) => x.id);
  const a = await one(C, "select count(*)::int from public.os_task_assignees where task_id = $1 and person_id = 'PPL-9003'", [ids[0]]);
  return ids.length === 2 && ids.every((x) => /^TSK-\d{4}$/.test(x)) && a === 1 ? null : JSON.stringify({ r, a });
});
await t("a batch is all or nothing: one bad task creates none", async () => {
  const before = await one(F, "select count(*)::int from public.os_tasks");
  await created(C, [{ title: "Fine", company_code: "IEL", division_id: "DIV-04" }, { title: "Not allowed", company_code: "IEL", division_id: "DIV-03" }]).catch(() => {});
  return is(before)(await one(F, "select count(*)::int from public.os_tasks"));
});
await te("the batch runs as the caller: no Elco tasks for an IELSco member", () => created(C, [{ title: "x", company_code: "ELC" }]), /row-level/);
await te("more than ten tasks are refused", () => created(F, Array.from({ length: 11 }, (_, i) => ({ title: `T${i}`, company_code: "IEL" }))), /Between 1 and 10/);
await te("anon can't call it", () => as("anon", null, "select public.os_create_tasks('[]'::jsonb)"), /permission denied/);
await t("the manager creates a Growth event with attendees in one call", async () => {
  const id = await one(M, "select public.os_create_event($1::jsonb)", [JSON.stringify({ title: "Growth weekly", company_code: "IEL", division_id: "DIV-03", starts_at: T, ends_at: T2, attendees: ["PPL-9002", "PPL-9003"] })]);
  const n = await one(M, "select count(*)::int from public.os_event_attendees where event_id = $1", [id]);
  return /^EV-\d{4}$/.test(id) && n === 2 ? null : `${id} ${n}`;
});
await te("an event with an attendee from another company is refused as a whole", () => one(M, "select public.os_create_event($1::jsonb)", [JSON.stringify({ title: "x", company_code: "IEL", division_id: "DIV-03", starts_at: T, ends_at: T2, attendees: ["PPL-9004"] })]), /row-level/);
await t("assigning adds people and sets a missing owner", async () => {
  const tid = (await created(F, [{ title: "Unowned", company_code: "IEL", division_id: "DIV-04" }]))[0].id;
  await user(F, "select public.os_assign_task($1, array['PPL-9003'], false)", [tid]);
  return is("PPL-9003:1")(await one(F, "select owner_person_id || ':' || (select count(*) from public.os_task_assignees where task_id = $1) from public.os_tasks where id = $1", [tid]));
});
await te("a member can't assign people on a task they can't edit", () => user(E, "select public.os_assign_task($1, array['PPL-9004'], false)", [tCre]), /row-level|Unknown task/);
await te("guests can't be assigned", () => user(F, "select public.os_assign_task($1, array['PPL-9005'], false)", [tCre]), /row-level/);
await t("a founder adds a milestone; it gets the next three-digit TL ID", () => id1(F, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, due_date) values ('HQ', 'WS1', 'Test', 'Mojo launch', '2026-11-12') returning id"), (v) => (/^TL-\d{3}$/.test(v ?? "") ? null : `got ${v}`));
await te("a member can't add a milestone", () => user(C, "insert into public.os_timeline_items (company_code, workstream_code, workstream_name, title, due_date, lead_division_id) values ('IEL', 'WS1', 'Test', 'x', '2026-11-12', 'DIV-04')"), /row-level/);
await t("a member reads the details of their own AI action", async () => { await svc("update public.os_ai_actions set details = '{\"items\": []}' where person_id = 'PPL-9003'"); return one(C, "select count(*)::int from public.os_ai_actions where details is not null"); }, (n) => (n >= 1 ? null : `got ${n}`));

// ── Grants hygiene
await t("anon has no privileges on any os_ table", () => db.query("select count(*)::int c from information_schema.role_table_grants where grantee = 'anon' and table_name like 'os\\_%'"), (r) => is(0)(r.rows[0].c));
await t("every os_ table has RLS on", () => db.query("select string_agg(c.relname, ',') bad from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'os\\_%' and not c.relrowsecurity"), (r) => (r.rows[0].bad === null ? null : r.rows[0].bad));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
