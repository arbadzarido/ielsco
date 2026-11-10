// Company OS subdivisions and division metrics (20261117000000): subdivisions a division lead names, their members,
// the task tag, and who may add, assign and log a division metric. On PGlite over every earlier migration.
//   node company-os-subdivisions-metrics.pglite.mjs <repo>/supabase/migrations
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql", "20261115000000_company_os_finance_legal.sql", "20261116000000_company_os_division_foundation.sql", "20261117000000_company_os_subdivisions_metrics.sql"]) {
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

const F = U.founder, GM = U.manager, GR = U.growth, CR = U.creative, OPS = U.ops, GUEST = U.guest;
await db.exec(`insert into public.os_tasks (id, title, company_code, division_id, sensitivity) values
  ('TSK-9001', 'Open task', 'IEL', 'DIV-03', 'Internal'), ('TSK-9002', 'Private task', 'IEL', 'DIV-03', 'Confidential');`);
const OM = U.opsManager, CR2 = U.creative2, FIN = U.finance;
const count = (uid, q, p) => one(uid, `select count(*)::int from (${q}) x`, p);
const none = async (uid, q, p) => { const r = await user(uid, q, p); if (!r.rows.length) throw new Error("no rows changed"); };

// ── Subdivisions
let s1, s2, sOps;
await t("a division manager names a subdivision", async () => {
  s1 = await one(GM, `insert into public.os_subdivisions (division_id, name, lead_person_id) values ('DIV-03', '  Social media ', 'PPL-9015') returning id`);
  return user(F, `select name, created_by, division_id from public.os_subdivisions where id = $1`, [s1]).then((r) => r.rows[0]);
}, (r) => (r.name === "Social media" && r.created_by === "PPL-9002" && r.division_id === "DIV-03" ? null : JSON.stringify(r)));
await t("a workspace lead without the manager flag can too", async () => { s2 = await one(CR, `insert into public.os_subdivisions (division_id, name) values ('DIV-04', 'Design') returning id`); return typeof s2; }, is("number"));
await t("a founder can for any division", async () => { sOps = await one(F, `insert into public.os_subdivisions (division_id, name) values ('DIV-02', 'Events') returning id`); return typeof sOps; }, is("number"));
await te("a member can't create one", () => user(GR, `insert into public.os_subdivisions (division_id, name) values ('DIV-03', 'Mine')`), /row-level security/);
await te("a manager can't create one in another division", () => user(GM, `insert into public.os_subdivisions (division_id, name) values ('DIV-02', 'Not mine')`), /row-level security/);
await te("a guest can't create one", () => user(GUEST, `insert into public.os_subdivisions (division_id, name) values ('DIV-03', 'Guest')`), /row-level security/);
await te("the same name twice in one division is refused, whatever the case", () => user(GM, `insert into public.os_subdivisions (division_id, name) values ('DIV-03', 'SOCIAL MEDIA')`), /duplicate key/);
await t("the same name in another division is fine", async () => one(F, `insert into public.os_subdivisions (division_id, name) values ('DIV-02', 'Social media') returning id`), (id) => (id ? null : "no id"));
await te("the lead must be in the division", () => user(GM, `insert into public.os_subdivisions (division_id, name, lead_person_id) values ('DIV-03', 'Outside lead', 'PPL-9012')`), /already be in this division/);
await te("a guest can't lead", () => user(F, `insert into public.os_subdivisions (division_id, name, lead_person_id) values ('DIV-03', 'Guest lead', 'PPL-9005')`), /already be in this division/);
await te("created_by can't be set by hand", () => user(GM, `insert into public.os_subdivisions (division_id, name, created_by) values ('DIV-03', 'Forged', 'PPL-9001')`), /permission denied/);
await t("the division can't be changed afterwards", async () => {
  await db.exec(`update public.os_subdivisions set division_id = 'DIV-02' where id = ${s1}`);
  return one(F, `select division_id from public.os_subdivisions where id = $1`, [s1]);
}, is("DIV-03"));
await te("a member can't rename one", () => none(GR, `update public.os_subdivisions set name = 'Renamed' where id = $1 returning id`, [s1]), /no rows changed/);
await te("another division's manager can't rename one", () => none(OM, `update public.os_subdivisions set name = 'Renamed' where id = $1 returning id`, [s1]), /no rows changed/);
await te("nobody deletes a subdivision through the API", () => user(GM, `delete from public.os_subdivisions where id = $1`, [s1]), /permission denied/);
await t("everyone in the company sees an open division's subdivisions", async () => count(OPS, `select 1 from public.os_subdivisions where division_id = 'DIV-03'`), is(1));
await t("a guest sees none", async () => count(GUEST, `select 1 from public.os_subdivisions`), is(0));
await t("anonymous callers see none", async () => { try { await as("anon", null, `select 1 from public.os_subdivisions`); return "read"; } catch (e) { return /permission denied/.test(e.message) ? "denied" : e.message; } }, is("denied"));

// A restricted division: only people with a role there see its subdivisions.
let sFin;
await t("a founder names a Finance subdivision", async () => { sFin = await one(F, `insert into public.os_subdivisions (division_id, name) values ('DIV-08', 'Payables') returning id`); return typeof sFin; }, is("number"));
await t("a Finance officer sees it", async () => count(FIN, `select 1 from public.os_subdivisions where id = $1`, [sFin]), is(1));
await t("a manager of another division doesn't", async () => count(GM, `select 1 from public.os_subdivisions where id = $1`, [sFin]), is(0));
await te("a Finance officer who isn't the lead can't add one", () => user(FIN, `insert into public.os_subdivisions (division_id, name) values ('DIV-08', 'Mine')`), /row-level security/);

// ── Members
await t("the manager adds a division member", async () => {
  await user(GM, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9015')`, [s1]);
  return one(F, `select added_by from public.os_subdivision_members where subdivision_id = $1 and person_id = 'PPL-9015'`, [s1]);
}, is("PPL-9002"));
await te("someone from another division can't be added", () => user(GM, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9012')`, [s1]), /already in this division/);
await te("a guest can't be added", () => user(F, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9005')`, [s1]), /already in this division/);
await te("an offboarded person can't be added", () => user(F, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9006')`, [s2]), /already in this division/);
await t("someone with a workspace role there can be added", async () => { await user(F, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9014')`, [sFin]); return 1; }, is(1));
await te("a member can't add themselves", () => user(U.elco, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9004')`, [s1]), /row-level security/);
await te("another division's manager can't add anyone", () => user(OM, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9004')`, [s1]), /row-level security/);
await te("a member can't remove anyone", () => none(GR, `delete from public.os_subdivision_members where subdivision_id = $1 and person_id = 'PPL-9015' returning person_id`, [s1]), /no rows changed/);
await t("members of a restricted division's subdivision are hidden from outsiders", async () => count(GM, `select 1 from public.os_subdivision_members where subdivision_id = $1`, [sFin]), is(0));
await t("each change is in the audit log", async () => count(F, `select 1 from public.os_audit_log where target_type in ('os_subdivisions', 'os_subdivision_members')`), (n) => (n >= 6 ? null : `got ${n}`));

// ── Tasks
await t("a task in the division takes its subdivision", async () => {
  await user(GR, `update public.os_tasks set subdivision_id = $1 where id = 'TSK-9001'`, [s1]);
  return one(F, `select subdivision_id::int from public.os_tasks where id = 'TSK-9001'`);
}, (v) => (v === Number(s1) ? null : `got ${v}`));
await te("a task can't take another division's subdivision", () => user(GR, `update public.os_tasks set subdivision_id = $1 where id = 'TSK-9001'`, [sOps]), /another division/);
await te("a new task can't either", () => user(GR, `insert into public.os_tasks (title, company_code, division_id, subdivision_id) values ('Wrong tag', 'IEL', 'DIV-03', $1)`, [s2]), /another division/);
await t("moving the task to another division clears the tag", async () => {
  await user(F, `update public.os_tasks set division_id = 'DIV-02' where id = 'TSK-9001'`);
  return one(F, `select subdivision_id from public.os_tasks where id = 'TSK-9001'`);
}, is(null));
await t("archiving keeps existing tags and members", async () => {
  await user(F, `update public.os_tasks set division_id = 'DIV-03', subdivision_id = $1 where id = 'TSK-9001'`, [s1]);
  await user(GM, `update public.os_subdivisions set active = false where id = $1`, [s1]);
  await user(GR, `update public.os_tasks set title = 'Open task, renamed' where id = 'TSK-9001'`);
  return one(F, `select subdivision_id::int from public.os_tasks where id = 'TSK-9001'`);
}, (v) => (v === Number(s1) ? null : `got ${v}`));
await te("an archived subdivision takes no new tasks", () => user(GR, `update public.os_tasks set subdivision_id = $1 where id = 'TSK-9002'`, [s1]), /archived/);
await te("or new members", () => user(GM, `insert into public.os_subdivision_members (subdivision_id, person_id) values ($1, 'PPL-9004')`, [s1]), /archived/);

// ── Division metrics (existing KPI rules, exercised for a division)
let k1;
await t("no migrated KPI is assigned to a division", async () => count(F, `select 1 from public.os_kpis where division_id is not null`), is(0));
await t("a division manager adds a metric for their division, with no target", async () => {
  k1 = await one(GM, `insert into public.os_kpis (company_code, division_id, name, unit, reporting_period) values ('IEL', 'DIV-03', 'Posts published', 'count', 'Weekly') returning id`);
  return user(F, `select target_value, created_by from public.os_kpis where id = $1`, [k1]).then((r) => r.rows[0]);
}, (r) => (r.target_value === null && r.created_by === "PPL-9002" ? null : JSON.stringify(r)));
await te("a member can't add a metric", () => user(GR, `insert into public.os_kpis (company_code, division_id, name) values ('IEL', 'DIV-03', 'Mine')`), /row-level security/);
await te("a manager can't add one for another division", () => user(GM, `insert into public.os_kpis (company_code, division_id, name) values ('IEL', 'DIV-02', 'Not mine')`), /row-level security/);
await te("a manager can't add a company-wide one", () => user(GM, `insert into public.os_kpis (company_code, name) values ('IEL', 'Company-wide')`), /row-level security/);
await t("a founder assigns a migrated KPI to a division", async () => {
  await user(F, `update public.os_kpis set division_id = 'DIV-03' where id = 'KPI-0030'`);
  return one(F, `select division_id from public.os_kpis where id = 'KPI-0030'`);
}, is("DIV-03"));
await te("a manager can't take an unassigned KPI", () => none(GM, `update public.os_kpis set division_id = 'DIV-03' where id = 'KPI-0031' returning id`), /no rows changed/);
await te("a manager can't hand their metric to another division", () => user(GM, `update public.os_kpis set division_id = 'DIV-02' where id = $1`, [k1]), /row-level security/);
await t("a division member logs a value", async () => {
  await user(GR, `insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ($1, '2026-W45', '2026-11-08', 12)`, [k1]);
  return user(F, `select recorded_by, value::int v from public.os_kpi_values where kpi_id = $1`, [k1]).then((r) => r.rows[0]);
}, (r) => (r.recorded_by === "PPL-9015" && r.v === 12 ? null : JSON.stringify(r)));
await te("someone outside the division can't log a value", () => user(OPS, `insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ($1, '2026-W46', '2026-11-15', 3)`, [k1]), /row-level security/);
await te("a guest can't log a value", () => user(GUEST, `insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ($1, '2026-W46', '2026-11-15', 3)`, [k1]), /row-level security/);
await te("the same period twice is refused", () => user(GM, `insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ($1, '2026-W45', '2026-11-08', 14)`, [k1]), /duplicate key/);
await te("a restricted Finance KPI takes no values", async () => {
  const id = await one(F, `select id from public.os_kpis where values_restricted limit 1`);
  await user(F, `insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ($1, '2026-10', '2026-10-31', 1)`, [id]);
}, /Restricted Finance Control/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
