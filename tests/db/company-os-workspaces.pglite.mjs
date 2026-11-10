// Company OS division workspaces, phase 1 (20261113000000): Finance and Legal as restricted divisions, workspace roles,
// access requests that become expiring grants, and the access rules for restricted divisions, on PGlite over every
// earlier migration. Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install and run:
//   node company-os-workspaces.pglite.mjs <repo>/supabase/migrations
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql"]) {
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
const falsy = (v) => (v === false ? null : `got ${JSON.stringify(v)}`);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plus = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ws = async (uid) => Object.fromEntries((await user(uid, "select division_id, access, is_lead from public.os_my_workspaces()")).rows.map((r) => [r.division_id, `${r.access}${r.is_lead ? "+lead" : ""}`]));

// ── Finance and Legal exist, restricted, empty ────────────────────────────────────────────────────────────────────
await t("Finance (DIV-08 FIN) and Legal (DIV-09 LEG) are restricted divisions", () => one(F, "select string_agg(id || ' ' || code || ' ' || privacy, ',' order by id) from public.os_divisions where id in ('DIV-08', 'DIV-09')"), is("DIV-08 FIN restricted,DIV-09 LEG restricted"));
await t("…with nobody in them", () => one(F, "select count(*)::int from public.os_person_divisions where division_id in ('DIV-08', 'DIV-09')"), is(0));
await t("every earlier division stays open", () => one(F, "select count(*)::int from public.os_divisions where privacy = 'open'"), is(7));

// ── Restricted records need the workspace, whatever their sensitivity ─────────────────────────────────────────────
const fin = await id1(F, "insert into public.os_tasks (company_code, division_id, title, sensitivity) values ('IEL', 'DIV-08', 'Pay the venue invoice', 'Internal') returning id");
await t("an Internal Finance task is invisible to a Growth manager", () => one(M, "select count(*)::int from public.os_tasks where id = $1", [fin]), is(0));
await t("…and to an IELSco member", () => one(C, "select count(*)::int from public.os_tasks where id = $1", [fin]), is(0));
await t("…while an Internal Growth task is still visible company-wide (unchanged)", async () => {
  const g = await id1(F, "insert into public.os_tasks (company_code, division_id, title) values ('IEL', 'DIV-03', 'Growth weekly') returning id");
  return one(C, "select count(*)::int from public.os_tasks where id = $1", [g]);
}, is(1));
await t("a Creative member can still edit Creative Internal records (unchanged)", () => canEdit(C, "IEL", "DIV-04", "Internal"), truthy);
await t("a Growth manager can't create in Finance", () => one(M, "select public.os_can_create('IEL', 'DIV-08', 'Internal')"), falsy);
await t("founders see Finance", () => one(F, "select count(*)::int from public.os_tasks where id = $1", [fin]), is(1));
await t("the Growth manager's workspaces: Growth (edit, lead); Finance none", () => ws(M), (w) => (w["DIV-03"] === "edit+lead" && w["DIV-08"] === "none" && w["DIV-09"] === "none" && w["DIV-04"] === "none" ? null : JSON.stringify(w)));

// ── Workspace roles ───────────────────────────────────────────────────────────────────────────────────────────────
await te("a manager can't give himself a Finance role", () => user(M, "insert into public.os_workspace_roles (person_id, division_id, role, reason, expires_at) values ('PPL-9002', 'DIV-08', 'member', 'want in', now() + interval '10 days')"), /row-level/);
await te("Approver is a Finance-only role", () => user(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9003', 'DIV-03', 'approver', 'x')"), /Finance role/);
await te("roles go to active people only", () => user(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9006', 'DIV-08', 'viewer', 'x')"), /active people/);
let viewerRole;
await t("a founder makes the Creative member a Finance viewer", async () => {
  viewerRole = await id1(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9003', 'DIV-08', 'viewer', 'Budget reporting') returning id");
  return one(C, "select count(*)::int from public.os_tasks where id = $1", [fin]);
}, is(1));
await t("…a viewer reads but can't edit", () => user(C, "update public.os_tasks set title = 'changed' where id = $1 returning id", [fin]), (r) => (r.rows.length === 0 ? null : "updated"));
await t("…and the grantor is recorded from the session, not the request", () => one(F, "select granted_by from public.os_workspace_roles where id = $1", [viewerRole]), is("PPL-9001"));
await t("…and the role is in the audit log", () => one(F, "select count(*)::int from public.os_audit_log where target_id = $1 and action = 'os_workspace_roles.insert'", [viewerRole]), is(1));
await te("a role can't be changed into another", () => user(F, "update public.os_workspace_roles set role = 'officer' where id = $1", [viewerRole]), /cannot be changed/);
await t("revoking the role removes the access at once", async () => {
  await user(F, "update public.os_workspace_roles set revoked_at = now() where id = $1", [viewerRole]);
  return one(C, "select count(*)::int from public.os_tasks where id = $1", [fin]);
}, is(0));
await te("roles are never deleted", async () => { const r = await user(F, "delete from public.os_workspace_roles where id = $1 returning id", [viewerRole]); if (!r.rows.length) throw new Error("nothing deleted (no delete right)"); }, /nothing deleted|permission/);
await t("an officer reads and edits Finance", async () => {
  await user(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9003', 'DIV-08', 'officer', 'Finance officer')");
  return (await user(C, "update public.os_tasks set title = 'Pay the venue invoice (checked)' where id = $1 returning id", [fin])).rows.length;
}, is(1));
await t("an expired role gives nothing", async () => {
  await user(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason, expires_at) values ('PPL-9004', 'DIV-08', 'viewer', 'one second', clock_timestamp() + interval '1 second')");
  await db.query("select pg_sleep(1.3)");
  return one(E, "select public.os_workspace_access('DIV-08', 'view')");
}, falsy);

// A founder-appointed Legal lead (the Elco member) runs Legal: gives limited roles, with an end date, never Lead.
await user(F, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9004', 'DIV-09', 'lead', 'Legal lead')");
await t("the Legal lead sees Legal as a lead", () => ws(E), (w) => (w["DIV-09"] === "edit+lead" ? null : JSON.stringify(w)));
await te("…but can't give a role without an end date", () => user(E, "insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9003', 'DIV-09', 'viewer', 'review')"), /end date/);
await te("…or make someone else a Lead", () => user(E, "insert into public.os_workspace_roles (person_id, division_id, role, reason, expires_at) values ('PPL-9003', 'DIV-09', 'lead', 'x', now() + interval '30 days')"), /Only founders/);
await t("…and gives a 30-day viewer role", () => user(E, "insert into public.os_workspace_roles (person_id, division_id, role, reason, expires_at) values ('PPL-9003', 'DIV-09', 'viewer', 'MoU review', now() + interval '30 days') returning id"), (r) => (r.rows.length === 1 ? null : "no row"));
await te("a Legal lead can't hand out Finance roles", () => user(E, "insert into public.os_workspace_roles (person_id, division_id, role, reason, expires_at) values ('PPL-9003', 'DIV-08', 'viewer', 'x', now() + interval '30 days')"), /row-level/);

// ── Access requests ───────────────────────────────────────────────────────────────────────────────────────────────
let acr;
await t("a Creative member asks to view Growth for 30 days", async () => { acr = await one(C, "select public.os_request_access('division', 'DIV-03', 'view', 'Need the campaign briefs', $1)", [plus(30)]); return /^ACR-\d{4}$/.test(acr); }, truthy);
await t("…the Growth manager is told", () => one(M, "select count(*)::int from public.os_notifications where kind = 'access_requested' and entity_id = $1", [acr]), is(1));
await t("…founders aren't (someone else can decide)", () => one(F, "select count(*)::int from public.os_notifications where entity_id = $1", [acr]), is(0));
await te("asking twice for the same thing is refused", () => one(C, "select public.os_request_access('division', 'DIV-03', 'edit', 'again', $1)", [plus(10)]), /duplicate|unique/);
await te("access longer than 90 days is refused", () => one(C, "select public.os_request_access('division', 'DIV-05', 'view', 'long one', $1)", [plus(120)]), /90 days/);
await te("asking for access you already have is refused", () => one(M, "select public.os_request_access('division', 'DIV-03', 'view', 'mine', $1)", [plus(5)]), /already have/);
await te("a guest can't ask", () => one(G, "select public.os_request_access('division', 'DIV-03', 'view', 'please', $1)", [plus(5)]), /Only Company OS staff/);
await te("a Growth member who isn't a manager can't decide", () => one(E, "select public.os_decide_access_request($1, true, null)", [acr]), /Not allowed/);
await t("an unrelated member can't even see the request", () => one(E, "select count(*)::int from public.os_access_requests where id = $1", [acr]), is(0));
await t("the manager approves: an expiring grant is written by the manager", async () => {
  await one(M, "select public.os_decide_access_request($1, true, 'OK for the campaign')", [acr]);
  return one(F, "select r.status || '|' || g.granted_by || '|' || (g.expires_at is not null)::text || '|' || (g.expires_at <= now() + interval '90 days')::text from public.os_access_requests r join public.os_grants g on g.id = r.grant_id where r.id = $1", [acr]);
}, is("approved|PPL-9002|true|true"));
await t("…the requester now sees Growth's Confidential records", () => canView(C, "IEL", "DIV-03", "Confidential", "X9"), truthy);
await t("…but can't edit them (view only)", () => canEdit(C, "IEL", "DIV-03", "Confidential", "X9"), falsy);
await t("…and is told it was approved", () => one(C, "select count(*)::int from public.os_notifications where kind = 'access_decided' and entity_id = $1", [acr]), is(1));
await te("a decided request can't be decided again", () => one(M, "select public.os_decide_access_request($1, false, null)", [acr]), /not open/);

let acrFin;
await t("asking for Finance notifies the founders only (no Finance lead yet)", async () => {
  acrFin = await one(M, "select public.os_request_access('division', 'DIV-08', 'view', 'Check the Growth budget', $1)", [plus(14)]);
  return one(F, "select count(*)::int from public.os_notifications where entity_id = $1", [acrFin]);
}, is(1));
await te("a requester can't approve their own request", () => one(M, "select public.os_decide_access_request($1, true, null)", [acrFin]), /own request/);
await te("a Finance officer who isn't a lead can't decide Finance access", () => one(C, "select public.os_decide_access_request($1, true, null)", [acrFin]), /Not allowed/);
await t("a founder declines with a reason; no grant is written", async () => {
  await one(F, "select public.os_decide_access_request($1, false, 'Ask Finance for the report instead')", [acrFin]);
  return one(F, "select status || '|' || (grant_id is null)::text || '|' || decision_note from public.os_access_requests where id = $1", [acrFin]);
}, is("declined|true|Ask Finance for the report instead"));
await t("…the manager still has no Finance access", () => one(M, "select public.os_workspace_access('DIV-08', 'view')"), falsy);

await t("a pending request can be withdrawn by its requester", async () => {
  const id = await one(C, "select public.os_request_access('division', 'DIV-05', 'view', 'People handbook', $1)", [plus(7)]);
  await user(C, "select public.os_withdraw_access_request($1)", [id]);
  return one(C, "select status from public.os_access_requests where id = $1", [id]);
}, is("withdrawn"));
await t("a project owner decides access to their project", async () => {
  const p = await id1(F, "insert into public.os_projects (company_code, division_id, name, owner_person_id, sensitivity) values ('ELC', 'DIV-02', 'Elco pilot', 'PPL-9004', 'Confidential') returning id");
  const id = await one(C, "select public.os_request_access('project', $1, 'view', 'Design input', $2)", [p, plus(20)]);
  await one(E, "select public.os_decide_access_request($1, true, null)", [id]);
  return one(C, "select count(*)::int from public.os_projects where id = $1", [p]);
}, is(1));
await t("nobody can write access requests directly", () => user(C, "insert into public.os_access_requests (id, requester_person_id, resource_type, resource_id, level, reason, until) values ('ACR-9999', 'PPL-9003', 'division', 'DIV-08', 'edit', 'sneaky', $1) returning id", [plus(5)]).then(() => "inserted", (e) => (/permission/.test(e.message) ? null : e.message)), (v) => v);
await t("guests get no workspace list", () => one(G, "select count(*)::int from public.os_my_workspaces()"), is(0));
await t("anon can execute none of the new functions", () => db.query("select string_agg(p.proname, ',') bad from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('os_my_workspaces', 'os_request_access', 'os_decide_access_request', 'os_withdraw_access_request', 'os_workspace_access', 'os_access_deciders') and has_function_privilege('anon', p.oid, 'execute')"), (r) => (r.rows[0].bad === null ? null : r.rows[0].bad));
await t("authenticated can't list deciders directly", () => db.query("select has_function_privilege('authenticated', 'public.os_access_deciders(text, text)', 'execute') x"), (r) => is(false)(r.rows[0].x));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
