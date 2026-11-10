// Company OS division workspaces, phase 2 (20261114000000): cross-division requests. Routes, approval by the requesting
// division's lead, triage by the receiving workspace, linked tasks, delivery, send-back and acceptance, history, and who
// can read a request, on PGlite over every earlier migration. Not part of `npm test` (needs @electric-sql/pglite).
// Copy it next to a PGlite install and run:
//   node company-os-requests.pglite.mjs <repo>/supabase/migrations
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
  creative2: "00000000-0000-0000-0000-0000000000b1", // Creative member, IELSco
  ops: "00000000-0000-0000-0000-0000000000b2", // Operations member, IELSco
  opsManager: "00000000-0000-0000-0000-0000000000b3", // Operations manager, IELSco
  finance: "00000000-0000-0000-0000-0000000000b4", // Finance officer (workspace role), IELSco
  growth: "00000000-0000-0000-0000-0000000000b5", // Growth member, IELSco
  ops2: "00000000-0000-0000-0000-0000000000b6", // another Operations member, IELSco
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql"]) {
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
    ('PPL-9002','DIV-03',true),('PPL-9003','DIV-04',false),('PPL-9004','DIV-03',false),('PPL-9006','DIV-04',false),('PPL-9007','DIV-03',false);
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-9011', '${U.creative2}', 'Test Creative Two', 'member', 'active', 'creative2@example.test'),
    ('PPL-9012', '${U.ops}', 'Test Ops Member', 'member', 'active', 'ops@example.test'),
    ('PPL-9013', '${U.opsManager}', 'Test Ops Manager', 'manager', 'active', 'opsmanager@example.test'),
    ('PPL-9014', '${U.finance}', 'Test Finance Officer', 'member', 'active', 'finance@example.test'),
    ('PPL-9015', '${U.growth}', 'Test Growth Member', 'member', 'active', 'growth@example.test'),
    ('PPL-9016', '${U.ops2}', 'Test Ops Two', 'member', 'active', 'ops2@example.test');
  insert into public.os_person_companies values ('PPL-9011','IEL'),('PPL-9012','IEL'),('PPL-9013','IEL'),('PPL-9014','IEL'),('PPL-9015','IEL'),('PPL-9016','IEL');
  insert into public.os_person_divisions values ('PPL-9011','DIV-04',false),('PPL-9012','DIV-02',false),('PPL-9013','DIV-02',true),('PPL-9015','DIV-03',false),('PPL-9016','DIV-02',false);
  insert into public.os_workspace_roles (person_id, division_id, role, reason) values
    ('PPL-9003','DIV-04','lead','Runs Creative intake'), ('PPL-9014','DIV-08','officer','Finance officer');`);

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
const falsy = (v) => (v === false ? null : `got ${JSON.stringify(v)}`);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plus = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ws = async (uid) => Object.fromEntries((await user(uid, "select division_id, access, is_lead from public.os_my_workspaces()")).rows.map((r) => [r.division_id, `${r.access}${r.is_lead ? "+lead" : ""}`]));

const CR = U.creative2, OP = U.ops, OM = U.opsManager, FO = U.finance, GR = U.growth, OP2 = U.ops2;
const submit = (uid, type, company = "IEL", title = "Poster for the open day", brief = "Two sizes, brand colours, by Friday please.", due = plus(7)) =>
  one(uid, "select public.os_request_submit($1, $2, $3, $4, 'P2 High', $5)", [type, company, title, brief, due]);
const act = (uid, id, action, note = null, owner = null) => one(uid, "select public.os_request_act($1, $2, $3, $4)", [id, action, note, owner]);
const sees = (uid, id) => one(uid, "select count(*)::int from public.os_requests where id = $1", [id]);
const status = (id) => svc("select status || '|' || approval_status || '|' || revision_rounds as s from public.os_requests where id = $1", [id]).then((r) => r.rows[0].s);
const notes = (person, kind, id) => svc("select count(*)::int c from public.os_notifications where person_id = $1 and kind = $2 and entity_id = $3", [person, kind, id]).then((r) => r.rows[0].c);

// ── Routes ───────────────────────────────────────────────────────────────────────────────────────────────────────
await t("six routes from the brief", () => one(GR, "select string_agg(code || ':' || from_division_id || '>' || to_division_id || ':' || needs_approval, ',' order by sort_order) from public.os_request_types"),
  is("design:DIV-03>DIV-04:false,recruitment_campaign:DIV-05>DIV-04:false,contract_review:DIV-06>DIV-09:false,budget:DIV-02>DIV-08:true,marketing_collaboration:DIV-01>DIV-03:false,student_engagement:DIV-07>DIV-01:false"));
await te("anonymous visitors can't read routes", () => as("anon", null, "select count(*)::int c from public.os_request_types"), /permission denied/);
await t("guests see no routes", () => count(G, "os_request_types"), is(0));

// ── Growth → Creative, end to end ────────────────────────────────────────────────────────────────────────────────
let req;
await t("a Growth member sends a design request", async () => { req = await submit(GR, "design"); return req; }, (v) => (/^REQ-\d{4,}$/.test(v) ? null : `got ${v}`));
await t("…submitted, no approval needed", () => status(req), is("submitted|not_needed|0"));
await t("…the Creative lead is told", () => notes("PPL-9003", "request_new", req), is(1));
await t("…and the history starts", () => one(GR, "select string_agg(action, ',') from public.os_request_events where request_id = $1", [req]), is("submitted"));
for (const [n, uid, want] of [["requester", GR, 1], ["Growth lead", M, 1], ["Creative lead", C, 1], ["Creative member", CR, 1], ["founder", F, 1],
  ["Operations member", OP, 0], ["Elco Growth member (other company)", E, 0], ["Finance officer", FO, 0], ["guest", G, 0], ["signed-in outsider", O, 0]]) {
  await t(`${n} ${want ? "can" : "cannot"} read it`, () => sees(uid, req), is(want));
}
await t("its history is hidden from people who can't read it", () => one(OP, "select count(*)::int from public.os_request_events where request_id = $1", [req]), is(0));
await te("Operations can't send a design request", () => submit(OP, "design"), /requesting division/);
await te("an Elco Growth member can't send it for IELSco", () => submit(E, "design"), /requesting division/);
await te("guests can't send requests", () => submit(G, "design"), /staff/);
await te("deadline in the past refused", () => submit(GR, "design", "IEL", "Old poster", "A brief long enough to pass.", plus(-1)), /deadline/);
await te("unknown route refused", () => submit(GR, "teleport"), /Unknown request type/);
await te("no direct inserts", () => user(GR, "insert into public.os_requests (id, type_code, company_code, from_division_id, to_division_id, requester_person_id, title, brief, due_date, approval_status) values ('REQ-9999','design','IEL','DIV-03','DIV-04','PPL-9015','x x x','long enough brief', now()::date, 'approved')"), /permission denied/);
await te("no direct status changes", () => user(C, "update public.os_requests set status = 'closed' where id = $1", [req]), /permission denied/);
await te("no direct history", () => user(GR, "insert into public.os_request_events (request_id, action) values ($1, 'closed')", [req]), /permission denied/);

// Triage
await te("the requester can't triage", () => one(GR, "select public.os_request_triage($1, 'accept', 'PPL-9011')", [req]), /Not allowed/);
await te("a Creative member who isn't lead can't triage", () => one(CR, "select public.os_request_triage($1, 'accept', 'PPL-9011')", [req]), /Not allowed/);
await te("the owner must work in Creative", () => one(C, "select public.os_request_triage($1, 'accept', 'PPL-9012')", [req]), /owner who works/);
await t("the Creative lead accepts and assigns", () => one(C, "select public.os_request_triage($1, 'accept', 'PPL-9011', 'On it')", [req]), is("accepted"));
await t("…the requester and the owner are told", async () => `${await notes("PPL-9015", "request_update", req)}/${await notes("PPL-9011", "request_update", req)}`, is("1/1"));
await te("accepting twice refused", () => one(C, "select public.os_request_triage($1, 'accept', 'PPL-9011')", [req]), /not waiting for triage/);

// Linked task
let tsk;
await te("the requester can't add tasks to Creative", () => one(GR, "select public.os_request_create_task($1, 'Design it')", [req]), /Not allowed/);
await t("the owner creates a linked task", async () => { tsk = await one(CR, "select public.os_request_create_task($1, 'Design the poster')", [req]); return tsk; }, (v) => (/^TSK-/.test(v) ? null : `got ${v}`));
await t("…in Creative, IELSco, pointing to the request", () => svc("select division_id || '|' || company_code || '|' || request_id || '|' || owner_person_id as s from public.os_tasks where id = $1", [tsk]).then((r) => r.rows[0].s), (v) => (v === `DIV-04|IEL|${req}|PPL-9011` ? null : v));
await t("…and the request is in progress", () => status(req), is("in_progress|not_needed|0"));
await te("a task can't be pointed at a request by hand", () => user(CR, "insert into public.os_tasks (company_code, division_id, title, request_id) values ('IEL','DIV-04','Sneaky',$1)", [req]), /permission denied/);
await te("…nor moved out of the receiving division", () => user(F, "update public.os_tasks set division_id = 'DIV-02' where id = $1", [tsk]), /receiving division/);

// Deliver, send back once, deliver, accept
await te("the requester can't deliver", () => act(GR, req, "deliver"), /Not allowed/);
await t("the owner delivers", () => act(CR, req, "deliver", "Draft v1 in Drive"), is("delivered"));
await t("…the requester is told", () => notes("PPL-9015", "request_update", req), is(2));
await te("sending back needs a note", () => act(GR, req, "send_back"), /needs to change/);
await te("the owner can't accept their own delivery", () => act(CR, req, "accept"), /Not allowed/);
await t("the requester sends it back once", () => act(GR, req, "send_back", "Logo too small"), is("in_progress"));
await t("…the round is counted", () => status(req), is("in_progress|not_needed|1"));
await t("the owner delivers again", () => act(CR, req, "deliver", "v2"), is("delivered"));
await t("the requester accepts", () => act(GR, req, "accept", "Perfect"), is("closed"));
await t("full history recorded", () => one(F, "select string_agg(action, ',' order by id) from public.os_request_events where request_id = $1", [req]),
  is("submitted,accepted,task_created,delivered,sent_back,delivered,closed"));
await te("a closed request can't be cancelled", () => act(GR, req, "cancel"), /can't be cancelled/);
await t("still invisible outside the two divisions", async () => `${await sees(OP, req)}${await sees(E, req)}${await sees(FO, req)}`, is("000"));
await t("changes are audited", () => svc("select count(*)::int c from public.os_audit_log where target_type = 'os_requests' and target_id = $1", [req]).then((r) => r.rows[0].c), (c) => (c >= 7 ? null : `got ${c}`));

// Comments and documents ride on the existing tables
await t("the requester comments", () => user(GR, "insert into public.os_comments (entity_type, entity_id, body) values ('request', $1, 'Thanks!')", [req]).then(() => "ok"), is("ok"));
await te("an Operations member can't comment", () => user(OP, "insert into public.os_comments (entity_type, entity_id, body) values ('request', $1, 'Hi')", [req]), /row-level security/);
await t("…and can't read the comments", () => one(OP, "select count(*)::int from public.os_comments where entity_type = 'request' and entity_id = $1", [req]), is(0));

// ── More information, then cancel ────────────────────────────────────────────────────────────────────────────────
const req2 = await submit(GR, "design", "IEL", "Banner for webinar", "One web banner for the webinar page.");
await te("asking for more information needs a note", () => one(C, "select public.os_request_triage($1, 'info')", [req2]), /what is missing/);
await t("Creative asks for more information", () => one(C, "select public.os_request_triage($1, 'info', null, 'Which webinar?')", [req2]), is("info_needed"));
await te("only the requester edits it", () => one(M, "select public.os_request_update($1, 'Banner', 'Long enough brief text', 'P3 Normal', $2)", [req2, plus(5)]), /Not allowed/);
await t("the requester answers, and it goes back to triage", () => one(GR, "select public.os_request_update($1, 'Banner for the IELTS webinar', 'One web banner for the IELTS webinar page.', 'P3 Normal', $2, 'The IELTS one')", [req2, plus(5)]), is("submitted"));
await t("…Creative is told", () => notes("PPL-9003", "request_update", req2), is(1));
await te("someone else can't cancel it", () => act(M, req2, "cancel"), /Not allowed/);
await t("the requester cancels", () => act(GR, req2, "cancel", "No longer needed"), is("cancelled"));
const req3 = await submit(GR, "design", "IEL", "Flyer", "A flyer that we may not need after all.");
await t("Creative can decline with a reason", () => one(C, "select public.os_request_triage($1, 'decline', null, 'Out of scope')", [req3]), is("declined"));

// ── Operations → Finance: approval first, restricted receiver ─────────────────────────────────────────────────────
const bud = await submit(OP, "budget", "IEL", "Venue deposit", "Deposit for the open day venue, IDR 2,000,000.");
await t("a budget request waits for approval", () => status(bud), is("submitted|pending|0"));
await t("…the Operations manager is asked to approve", () => notes("PPL-9013", "request_approval", bud), is(1));
await t("…Finance isn't told until it's approved", () => notes("PPL-9001", "request_new", bud), is(0));
for (const [n, uid, want] of [["requester", OP, 1], ["Operations manager", OM, 1], ["Finance officer", FO, 1], ["founder", F, 1],
  ["another Operations member", OP2, 0], ["Growth manager", M, 0], ["Creative lead", C, 0]]) {
  await t(`budget request: ${n} ${want ? "can" : "cannot"} read it`, () => sees(uid, bud), is(want));
}
await te("Finance can't triage before approval", () => one(F, "select public.os_request_triage($1, 'accept', 'PPL-9014')", [bud]), /not waiting for triage/);
await te("the requester can't approve their own request", () => one(OP, "select public.os_request_approve($1, true)", [bud]), /own request/);
await te("a manager of another division can't approve", () => one(M, "select public.os_request_approve($1, true)", [bud]), /Not allowed/);
await te("a Finance officer can't approve the requesting side", () => one(FO, "select public.os_request_approve($1, true)", [bud]), /Not allowed/);
await t("the Operations manager approves", () => one(OM, "select public.os_request_approve($1, true, 'Within budget')", [bud]), is("approved"));
await t("…recorded as an approval", () => one(F, "select approver_person_id || '|' || decision from public.os_approvals where entity_id = $1", [bud]), is("PPL-9013|approved"));
await t("…and Finance (founders, as nobody leads it yet) is told", () => notes("PPL-9001", "request_new", bud), is(1));
await te("approving twice refused", () => one(OM, "select public.os_request_approve($1, true)", [bud]), /not waiting for approval/);
await te("a Finance officer isn't a lead, so can't triage", () => one(FO, "select public.os_request_triage($1, 'accept', 'PPL-9014')", [bud]), /Not allowed/);
await te("a Growth member can't own Finance work", () => one(F, "select public.os_request_triage($1, 'accept', 'PPL-9015')", [bud]), /owner who works/);
await t("a founder accepts it for the Finance officer", () => one(F, "select public.os_request_triage($1, 'accept', 'PPL-9014')", [bud]), is("accepted"));
let ftask;
await t("the Finance officer adds a task", async () => { ftask = await one(FO, "select public.os_request_create_task($1, 'Pay the venue deposit')", [bud]); return ftask; }, (v) => (/^TSK-/.test(v) ? null : v));
await t("…the Finance task is invisible to the requester's division", async () => `${await one(OP, "select count(*)::int from public.os_tasks where id = $1", [ftask])}${await one(OM, "select count(*)::int from public.os_tasks where id = $1", [ftask])}`, is("00"));
await t("…but the requester still follows the request", () => sees(OP, bud), is(1));

const bud2 = await submit(OP, "budget", "IEL", "Extra chairs", "Rent 50 extra chairs for the open day.");
await te("declining an approval needs a reason", () => one(OM, "select public.os_request_approve($1, false)", [bud2]), /reason/);
await t("the Operations manager declines with a reason", () => one(OM, "select public.os_request_approve($1, false, 'Use our own chairs')", [bud2]), is("declined"));
await t("…the request ends there", () => status(bud2), is("declined|declined|0"));

// ── Privileges ───────────────────────────────────────────────────────────────────────────────────────────────────
for (const f of ["os_request_submit(text, text, text, text, text, date)", "os_request_act(text, text, text, text)", "os_request_triage(text, text, text, text)", "os_request_approve(text, boolean, text)", "os_request_create_task(text, text, text, date)", "os_can_view_request(text)"]) {
  await t(`anon can't run ${f.split("(")[0]}`, () => svc(`select has_function_privilege('anon', 'public.${f}', 'execute') as v`).then((r) => r.rows[0].v), falsy);
}
for (const f of ["os_request_log(public.os_requests, text, text, text)", "os_request_tell(public.os_requests, text, text, text, text)"]) {
  await t(`authenticated can't run ${f.split("(")[0]}`, () => svc(`select has_function_privilege('authenticated', 'public.${f}', 'execute') as v`).then((r) => r.rows[0].v), falsy);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
