// Company OS work modules (20261108000000 + 20261108010000 data) on PGlite, on top of the foundation and access migrations.
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql"]) {
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

// ── Data migration
await t("68 KPIs loaded", () => db.query("select count(*)::int c from public.os_kpis"), (r) => is(68)(r.rows[0].c));
await t("104 timeline items loaded", () => db.query("select count(*)::int c from public.os_timeline_items"), (r) => is(104)(r.rows[0].c));
await t("no KPI values invented (KPI_Log was empty)", () => db.query("select count(*)::int c from public.os_kpi_values"), (r) => is(0)(r.rows[0].c));
await t("KPI IDs preserved", () => db.query("select min(id) a, max(id) b from public.os_kpis"), (r) => (r.rows[0].a === "KPI-0001" && r.rows[0].b === "KPI-0068" ? null : JSON.stringify(r.rows[0])));
await t("targets only where the sheet has one", () => db.query("select count(*)::int c from public.os_kpis where target_value is not null"), (r) => is(6)(r.rows[0].c));
await t("finance KPI values are restricted", () => db.query("select count(*)::int c from public.os_kpis where values_restricted"), (r) => is(16)(r.rows[0].c));
await t("KPI-0012 keeps the old target only as reference", () => db.query("select target_value, target_status, reference_target from public.os_kpis where id = 'KPI-0012'"), (r) => (r.rows[0].target_value === null && /requires validation/.test(r.rows[0].target_status) && /20,000,000/.test(r.rows[0].reference_target) ? null : JSON.stringify(r.rows[0])));
await t("timeline lead divisions mapped by name", () => db.query("select lead_division_id from public.os_timeline_items where id in ('TL-001','TL-002','TL-020')  order by id"), (r) => (r.rows.map((x) => x.lead_division_id).join() === "DIV-05,DIV-04,DIV-06" ? null : JSON.stringify(r.rows)));
await t("timeline workstreams WS0..WS9", () => db.query("select count(distinct workstream_code)::int c from public.os_timeline_items"), (r) => is(10)(r.rows[0].c));
await t("re-running the data migration adds nothing", async () => { await db.exec(readFileSync(join(dir, "20261108010000_company_os_kpi_timeline_data.sql"), "utf8")); return db.query("select (select count(*) from public.os_kpis)::int k, (select count(*) from public.os_timeline_items)::int t"); }, (r) => (r.rows[0].k === 68 && r.rows[0].t === 104 ? null : JSON.stringify(r.rows[0])));
await t("member reads KPIs (company and own scope)", () => one(C, "select count(*)::int from public.os_kpis"), (n) => (n > 0 && n < 68 ? null : `got ${n}`));
await t("IELSco member sees no Elco KPI", () => one(C, "select count(*)::int from public.os_kpis where company_code = 'ELC'"), is(0));
await t("Elco member sees Elco KPIs", () => one(E, "select count(*)::int from public.os_kpis where company_code = 'ELC'"), (n) => (n > 0 ? null : "none"));
await t("outsider reads no KPIs", () => count(O, "os_kpis"), is(0));
await t("outsider reads no timeline", () => count(O, "os_timeline_items"), is(0));
await t("member reads the whole timeline", () => count(C, "os_timeline_items"), is(104));
await te("member cannot change a timeline item", async () => { const r = await user(C, "update public.os_timeline_items set status = 'Done' where id = 'TL-001' returning id"); if (!r.rows.length) throw new Error("no rows (blocked by RLS)"); }, /no rows|permission/);
await te("member cannot log a finance KPI value", () => user(M, "insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ('KPI-0012', '2026-11', '2026-11-30', 1)"), /Restricted|row-level/);
await te("member cannot log a value for a KPI they don't own", () => user(C, "insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ('KPI-0037', '2026-11', '2026-11-30', 100)"), /row-level/);
await t("founder logs a KPI value, recorder stamped", async () => { await user(F, "insert into public.os_kpi_values (kpi_id, period_label, period_end, value, value_basis) values ('KPI-0037', '2026-10', '2026-10-31', 1200, 'test')"); return one(F, "select recorded_by from public.os_kpi_values where kpi_id = 'KPI-0037'"); }, is("PPL-9001"));
await te("a value can't be logged twice for a period", () => user(F, "insert into public.os_kpi_values (kpi_id, period_label, period_end, value) values ('KPI-0037', '2026-10', '2026-10-31', 1)"), /duplicate|unique/);
await te("anon cannot read KPI values", () => as("anon", null, "select * from public.os_kpi_values"), /permission denied/);

// ── Projects and tasks
let pIel, pGro, pElc;
await t("founder creates a project; ID continues after the sheet's PRJ-0027", async () => { pIel = await id1(F, "insert into public.os_projects (company_code, division_id, name, status) values ('IEL', 'DIV-04', 'Creative project', 'Active') returning id"); return pIel; }, is("PRJ-0028"));
await t("manager creates a Growth project", async () => { pGro = await id1(M, "insert into public.os_projects (company_code, division_id, name, sensitivity) values ('IEL', 'DIV-03', 'Growth confidential', 'Confidential') returning id"); return pGro ? null : "no id"; }, (w) => w);
await t("Elco member creates an Elco project", async () => { pElc = await id1(E, "insert into public.os_projects (company_code, division_id, name) values ('ELC', 'DIV-03', 'Elco launch') returning id"); return pElc ? null : "no id"; }, (w) => w);
await te("member cannot create in another division", () => user(C, "insert into public.os_projects (company_code, division_id, name) values ('IEL', 'DIV-03', 'x')"), /row-level/);
await te("member cannot create a Restricted project", () => user(C, "insert into public.os_projects (company_code, division_id, name, sensitivity) values ('IEL', 'DIV-04', 'x', 'Restricted')"), /row-level/);
await te("IELSco member cannot create an Elco project", () => user(C, "insert into public.os_projects (company_code, name) values ('ELC', 'x')"), /row-level/);
await te("guest cannot create a project", () => user(G, "insert into public.os_projects (company_code, name) values ('IEL', 'x')"), /row-level/);
await te("nobody picks their own project ID", () => user(F, "insert into public.os_projects (id, company_code, name) values ('PRJ-0001', 'IEL', 'x')"), /permission denied/);
await t("creative member does not see the Growth Confidential project", () => one(C, "select count(*)::int from public.os_projects where id = $1", [pGro]), is(0));
await t("IELSco member does not see the Elco project", () => one(C, "select count(*)::int from public.os_projects where id = $1", [pElc]), is(0));
await t("outsider sees no projects", () => count(O, "os_projects"), is(0));

let tGro, tMine, sub;
await t("manager adds a task to the Confidential project; it inherits company, division and sensitivity", async () => { tGro = await id1(M, "insert into public.os_tasks (project_id, title, owner_person_id, due_date) values ($1, 'Plan', 'PPL-9002', current_date - 1) returning id", [pGro]); return one(M, "select company_code || '/' || division_id || '/' || sensitivity from public.os_tasks where id = $1", [tGro]); }, is("IEL/DIV-03/Confidential"));
await t("task ID continues after TSK-0080", () => Promise.resolve(tGro), (v) => (v === "TSK-0081" ? null : `got ${v}`));
await t("creative member does not see the Growth Confidential task", () => one(C, "select count(*)::int from public.os_tasks where id = $1", [tGro]), is(0));
await t("assigning the creative member makes the task visible to them", async () => { await user(M, "insert into public.os_task_assignees values ($1, 'PPL-9003')", [tGro]); return one(C, "select count(*)::int from public.os_tasks where id = $1", [tGro]); }, is(1));
await t("assignee can move the task", async () => { await user(C, "update public.os_tasks set status = 'In Progress' where id = $1", [tGro]); return one(M, "select status from public.os_tasks where id = $1", [tGro]); }, is("In Progress"));
await te("assignee cannot make the task Restricted", async () => { const r = await user(C, "update public.os_tasks set sensitivity = 'Restricted' where id = $1 returning id", [tGro]); if (!r.rows.length) throw new Error("no rows"); }, /row-level|no rows/);
await te("guest cannot be assigned", () => user(M, "insert into public.os_task_assignees values ($1, 'PPL-9005')", [tGro]), /row-level/);
await t("subtask inherits the parent", async () => { sub = await id1(M, "insert into public.os_tasks (parent_task_id, company_code, title) values ($1, 'HQ', 'Sub') returning id", [tGro]); return one(M, "select project_id || '/' || company_code || '/' || sensitivity from public.os_tasks where id = $1", [sub]); }, is(`${pGro}/IEL/Confidential`));
await te("subtasks go one level deep", () => user(M, "insert into public.os_tasks (parent_task_id, company_code, title) values ($1, 'IEL', 'subsub')", [sub]), /one level/);
await t("Done stamps completed_at", async () => { await user(M, "update public.os_tasks set status = 'Done' where id = $1", [sub]); return one(M, "select completed_at is not null from public.os_tasks where id = $1", [sub]); }, is(true));
await t("member creates a personal task in their company", async () => { tMine = await id1(C, "insert into public.os_tasks (company_code, title, owner_person_id) values ('IEL', 'My task', 'PPL-9003') returning id"); return tMine ? null : "no id"; }, (w) => w);
await t("my work summary counts open and overdue", () => rows(M, "select * from public.os_my_work_summary()"), (r) => (r[0].open_tasks === 1 && r[0].overdue_tasks === 1 ? null : JSON.stringify(r[0])));
await te("member cannot delete someone else's task", async () => { const r = await user(C, "delete from public.os_tasks where id = $1 returning id", [tGro]); if (!r.rows.length) throw new Error("no rows"); }, /no rows/);

// Comments and activity
await t("assignee comments on the task", async () => { await user(C, "insert into public.os_comments (entity_type, entity_id, body) values ('task', $1, 'On it')", [tGro]); return one(M, "select author_person_id from public.os_comments where entity_id = $1", [tGro]); }, is("PPL-9003"));
await te("non-viewer cannot comment", () => user(E, "insert into public.os_comments (entity_type, entity_id, body) values ('task', $1, 'x')", [tGro]), /row-level/);
await t("non-viewer cannot read the comments", () => one(E, "select count(*)::int from public.os_comments where entity_id = $1", [tGro]), is(0));
await te("comment author can't be forged", async () => { await user(C, "update public.os_comments set author_person_id = 'PPL-9001' where entity_id = $1", [tGro]); }, /permission denied/);
await t("activity records the status change with who did it", () => rows(M, "select actor_person_id, changes from public.os_activity where entity_type = 'task' and entity_id = $1 and action = 'update' order by id limit 1", [tGro]), (r) => (r[0]?.actor_person_id === "PPL-9003" && r[0].changes.status?.to === "In Progress" ? null : JSON.stringify(r)));
await t("non-viewer sees none of that activity", () => one(E, "select count(*)::int from public.os_activity where entity_id = $1", [tGro]), is(0));
await te("nobody writes activity directly", () => user(F, "insert into public.os_activity (entity_type, entity_id, action) values ('task', 'x', 'fake')"), /permission denied/);

// ── Documents
let dCre, dRes;
await t("member registers a document in their division; ID after DOC-0094", async () => { dCre = await id1(C, "insert into public.os_documents (title, company_code, division_id, doc_type) values ('Brand guide', 'IEL', 'DIV-04', 'SOP') returning id"); return dCre; }, is("DOC-0095"));
await te("member cannot approve their own document", () => user(C, "update public.os_documents set status = 'Approved' where id = $1", [dCre]), /founder or the division manager/);
await te("member cannot write Drive sync columns", () => user(C, "update public.os_documents set drift_findings = '[]' where id = $1", [dCre]), /permission denied/);
await te("drive_url must be a Google URL", () => user(C, "update public.os_documents set drive_url = 'https://evil.example/x' where id = $1", [dCre]), /check constraint/);
await t("founder creates a Restricted document", async () => { dRes = await id1(F, "insert into public.os_documents (title, company_code, doc_type, sensitivity) values ('Payroll', 'IEL', 'FIN', 'Restricted') returning id"); return dRes ? null : "none"; }, (w) => w);
await t("manager does not see the Restricted document", () => one(M, "select count(*)::int from public.os_documents where id = $1", [dRes]), is(0));
await t("founder approves; approver stamped", async () => { await user(F, "update public.os_documents set status = 'Approved' where id = $1", [dCre]); return one(F, "select approver_person_id from public.os_documents where id = $1", [dCre]); }, is("PPL-9001"));
await t("link a document to a project", async () => { await user(C, "insert into public.os_document_links (document_id, entity_type, entity_id) values ($1, 'project', $2)", [dCre, pIel]); return one(C, "select count(*)::int from public.os_document_links where document_id = $1", [dCre]); }, is(1));
await te("cannot link to a project you can't see", () => user(C, "insert into public.os_document_links (document_id, entity_type, entity_id) values ($1, 'project', $2)", [dCre, pGro]), /row-level/);

// ── Announcements, decisions
await te("member cannot publish an announcement", () => user(C, "insert into public.os_announcements (company_code, title, body) values ('IEL', 'x', 'y')"), /row-level/);
await te("manager cannot publish company-wide", () => user(M, "insert into public.os_announcements (company_code, title, body) values ('IEL', 'x', 'y')"), /row-level/);
await t("manager publishes to their division", () => id1(M, "insert into public.os_announcements (company_code, division_id, title, body) values ('IEL', 'DIV-03', 'Growth sync', 'Thursday') returning id"), is("ANN-0001"));
await t("founder publishes HQ-wide; everyone in the OS reads it", async () => { await user(F, "insert into public.os_announcements (company_code, title, body) values ('HQ', 'Welcome', 'Hello')"); return one(E, "select count(*)::int from public.os_announcements where company_code = 'HQ'"); }, is(1));
await t("decision ID continues after OD-0008", () => id1(F, "insert into public.os_decisions (company_code, decision, status) values ('HQ', 'Use Company OS', 'Approved') returning id"), is("OD-0009"));
await te("member cannot record a decision", () => user(C, "insert into public.os_decisions (company_code, division_id, decision) values ('IEL', 'DIV-04', 'x')"), /row-level/);

// ── Partnerships
let opp;
await t("partnerships default to Partnerships division, Confidential; ID after OPP-0003", async () => { opp = await id1(F, "insert into public.os_partnerships (company_code, organisation) values ('IEL', 'Uni X') returning id"); return one(F, "select id || '/' || division_id || '/' || sensitivity from public.os_partnerships where id = $1", [opp]); }, is("OPP-0004/DIV-06/Confidential"));
await t("a Growth manager does not see Partnerships Confidential", () => one(M, "select count(*)::int from public.os_partnerships where id = $1", [opp]), is(0));
await te("estimated value cannot be negative", () => user(F, "update public.os_partnerships set estimated_value = -1 where id = $1", [opp]), /check/);

// ── OKRs
let obj;
await t("founder creates a company objective", async () => { obj = await id1(F, "insert into public.os_objectives (company_code, title, period) values ('IEL', 'Grow community', '2027-H1') returning id"); return obj; }, is("OBJ-0001"));
await t("key result has no target until one is set", async () => { await user(F, "insert into public.os_key_results (objective_id, title, kpi_id) values ($1, 'Discord members', 'KPI-0041')", [obj]); return rows(F, "select target_value, target_status from public.os_key_results where objective_id = $1", [obj]); }, (r) => (r[0].target_value === null && r[0].target_status === "No approved target" ? null : JSON.stringify(r[0])));
await te("manager cannot create a company-level objective", () => user(M, "insert into public.os_objectives (company_code, title, period) values ('IEL', 'x', '2027')"), /row-level/);
await t("manager creates a division objective", () => id1(M, "insert into public.os_objectives (company_code, division_id, title, period, parent_objective_id) values ('IEL', 'DIV-03', 'Growth OKR', '2027-Q1', $1) returning id", [obj]), is("OBJ-0002"));
await te("period must be a year, quarter or half", () => user(F, "insert into public.os_objectives (company_code, title, period) values ('IEL', 'x', 'soon')"), /check/);

// ── People and reviews
await t("staff read profiles", async () => { await user(F, "insert into public.os_person_profiles (person_id, title, manager_person_id) values ('PPL-9003', 'Designer', 'PPL-9002'), ('PPL-9004', 'Marketer', 'PPL-9002')"); return one(C, "select count(*)::int from public.os_person_profiles"); }, is(2));
await te("person cannot change who they report to", () => user(C, "update public.os_person_profiles set manager_person_id = 'PPL-9004' where person_id = 'PPL-9003'"), /Only a founder/);
await te("division manager cannot re-point a reporting line", () => user(M, "insert into public.os_person_profiles (person_id, manager_person_id) values ('PPL-9007', 'PPL-9002')"), /Only a founder/);
await t("person edits their own title", async () => { await user(C, "update public.os_person_profiles set title = 'Senior Designer' where person_id = 'PPL-9003'"); return one(C, "select title from public.os_person_profiles where person_id = 'PPL-9003'"); }, is("Senior Designer"));
await t("founder records employment", async () => { await user(F, "insert into public.os_person_employment (person_id, membership_type, employing_company, start_date) values ('PPL-9003', 'Volunteer', 'IEL', '2026-12-14'), ('PPL-9004', 'Volunteer', 'ELC', '2026-12-14')"); return one(F, "select count(*)::int from public.os_person_employment"); }, is(2));
await t("person sees own employment only", () => rows(C, "select person_id from public.os_person_employment"), (r) => (r.length === 1 && r[0].person_id === "PPL-9003" ? null : JSON.stringify(r)));
await t("Elco member cannot see another person's employment", () => one(E, "select count(*)::int from public.os_person_employment where person_id = 'PPL-9003'"), is(0));
await t("manager (via reporting line) sees their report's employment", () => one(M, "select count(*)::int from public.os_person_employment where person_id = 'PPL-9003'"), is(1));
await te("member cannot edit their own employment record", async () => { const r = await user(C, "update public.os_person_employment set membership_type = 'Employee' where person_id = 'PPL-9003' returning person_id"); if (!r.rows.length) throw new Error("no rows"); }, /no rows/);

let rc, rev;
await t("founder opens a review cycle", async () => { rc = await id1(F, "insert into public.os_review_cycles (name, company_code, period_start, period_end, status) values ('H1 2027', 'IEL', '2027-01-01', '2027-06-30', 'Open') returning id"); return rc; }, is("RC-0001"));
await te("member cannot open a review cycle", () => user(C, "insert into public.os_review_cycles (name, company_code, period_start, period_end) values ('x', 'IEL', '2027-01-01', '2027-06-30')"), /row-level/);
await t("manager opens a review for their report", async () => { rev = await id1(M, "insert into public.os_reviews (cycle_id, person_id, reviewer_person_id) values ($1, 'PPL-9003', 'PPL-9002') returning id", [rc]); return rev; }, is("REV-0001"));
await te("manager cannot open a review for someone outside their divisions", () => user(M, "insert into public.os_reviews (cycle_id, person_id) values ($1, 'PPL-9001')", [rc]), /row-level/);
await t("person reads own review", () => one(C, "select count(*)::int from public.os_reviews"), is(1));
await t("colleague cannot read it", () => one(E, "select count(*)::int from public.os_reviews"), is(0));
await t("outsider cannot read it", () => count(O, "os_reviews"), is(0));
await te("person cannot write the manager assessment", () => user(C, "update public.os_reviews set manager_assessment = 'great' where id = $1", [rev]), /reviewer writes/);
await t("person writes and submits the self-assessment", async () => { await user(C, "update public.os_reviews set self_assessment = 'I did X', status = 'Manager review' where id = $1", [rev]); return one(C, "select self_submitted_at is not null from public.os_reviews where id = $1", [rev]); }, is(true));
await te("manager cannot edit the self-assessment", () => user(M, "update public.os_reviews set self_assessment = 'changed' where id = $1", [rev]), /self-assessment/);
await te("person cannot complete their own review", () => user(C, "update public.os_reviews set status = 'Completed' where id = $1", [rev]), /reviewer completes/);
await t("manager completes it", async () => { await user(M, "update public.os_reviews set manager_assessment = 'Good work', strengths = 'Design', development_plan = 'Lead a campaign', status = 'Completed' where id = $1", [rev]); return one(M, "select status from public.os_reviews where id = $1", [rev]); }, is("Completed"));
await te("completed review is read-only", () => user(M, "update public.os_reviews set manager_assessment = 'edit' where id = $1", [rev]), /read-only/);
await t("person acknowledges", async () => { await user(C, "update public.os_reviews set status = 'Acknowledged' where id = $1", [rev]); return one(C, "select acknowledged_at is not null from public.os_reviews where id = $1", [rev]); }, is(true));
await t("reviews have no score or rank columns", () => db.query("select count(*)::int c from information_schema.columns where table_name = 'os_reviews' and column_name ~ '(score|rank|rating)'"), (r) => is(0)(r.rows[0].c));

// People Lead grant
await t("Elco member without a grant sees no reviews", () => count(E, "os_reviews"), is(0));
await te("manager cannot give a People Lead grant", () => user(M, "insert into public.os_grants (person_id, resource_type, resource_id, level, reason, expires_at) values ('PPL-9004', 'people', 'IEL', 'view', 'x', now() + interval '10 days')"), /row-level/);
await t("founder grants People Lead (IELSco) to the Elco member", async () => { await user(F, "insert into public.os_grants (person_id, resource_type, resource_id, level, reason) values ('PPL-9004', 'people', 'IEL', 'view', 'People Lead for IELSco')"); return count(E, "os_reviews"); }, is(1));
await t("People Lead (view) sees IELSco employment records", () => one(E, "select count(*)::int from public.os_person_employment where person_id = 'PPL-9003'"), is(1));
await te("People Lead with view cannot edit employment", async () => { const r = await user(E, "update public.os_person_employment set notes = 'x' where person_id = 'PPL-9003' returning person_id"); if (!r.rows.length) throw new Error("no rows"); }, /no rows/);
await t("revoking the grant removes access", async () => { await user(F, "update public.os_grants set revoked_at = now() where resource_type = 'people'"); return count(E, "os_reviews"); }, is(0));

// ── AI
await t("budget defaults to USD 25", () => rows(C, "select * from public.os_ai_budget()"), (r) => (Number(r[0].budget_usd) === 25 && Number(r[0].spent_usd) === 0 ? null : JSON.stringify(r[0])));
await te("budget cannot be raised above USD 25", () => user(F, "update public.os_ai_settings set monthly_budget_usd = 30"), /check/);
await te("member cannot change AI settings", async () => { const r = await user(C, "update public.os_ai_settings set enabled = false returning id"); if (!r.rows.length) throw new Error("no rows"); }, /no rows/);
await te("users cannot reserve budget directly", () => user(F, "select public.os_ai_reserve('PPL-9001', 'assistant', 'm', 0.01)"), /permission denied/);
await te("users cannot write usage rows", () => user(F, "insert into public.os_ai_usage (agent, model, cost_usd) values ('assistant', 'm', 0)"), /permission denied/);
const svc = (q, p) => as("service_role", null, q, p);
await t("service reserves within the cap", () => svc("select public.os_ai_reserve('PPL-9003', 'assistant', 'm', 1.5) id"), (r) => (r.rows[0].id ? null : "null"));
await t("per-person daily limit refuses the next big call", () => svc("select public.os_ai_reserve('PPL-9003', 'assistant', 'm', 1.0) id"), (r) => (r.rows[0].id === null ? null : "reserved"));
await t("monthly hard cap refuses a call that would pass USD 25", async () => { await db.exec("update public.os_ai_settings set per_person_daily_usd = 100"); return svc("select public.os_ai_reserve('PPL-9002', 'assistant', 'm', 24) id"); }, (r) => (r.rows[0].id === null ? null : "reserved past the cap"));
await t("settling never charges more than reserved", async () => { const r = await svc("select public.os_ai_reserve('PPL-9002', 'assistant', 'm', 0.5) id"); await svc("select public.os_ai_settle($1, 100, 100, 9.0)", [r.rows[0].id]); return svc("select cost_usd from public.os_ai_usage where id = $1", [r.rows[0].id]); }, (r) => (Number(r.rows[0].cost_usd) === 0.5 ? null : `got ${r.rows[0].cost_usd}`));
await t("member sees only their own usage", () => rows(C, "select distinct person_id from public.os_ai_usage"), (r) => (r.length === 1 && r[0].person_id === "PPL-9003" ? null : JSON.stringify(r)));
let conv;
await t("conversation owner is the caller", async () => { conv = await id1(C, "insert into public.os_ai_conversations (agent, title) values ('assistant', 'Hi') returning id"); return one(C, "select person_id from public.os_ai_conversations where id = $1", [conv]); }, is("PPL-9003"));
await t("others can't read the conversation", () => one(M, "select count(*)::int from public.os_ai_conversations where id = $1", [conv]), is(0));
await t("founders can't read others' conversations either", () => one(F, "select count(*)::int from public.os_ai_conversations where id = $1", [conv]), is(0));
await te("users cannot write assistant messages", () => user(C, "insert into public.os_ai_messages (conversation_id, role, content) values ($1, 'assistant', 'fake')", [conv]), /permission denied/);
await t("person can reject a proposed action but not confirm it themselves", async () => {
  await svc("insert into public.os_ai_actions (person_id, agent, action_type, payload, preview) values ('PPL-9003', 'assistant', 'create_task', '{}', 'Create task')");
  let confirmBlocked = false;
  try { const r = await user(C, "update public.os_ai_actions set status = 'executed' returning id"); confirmBlocked = r.rows.length === 0; } catch { confirmBlocked = true; }
  await user(C, "update public.os_ai_actions set status = 'rejected'");
  const s = await one(C, "select status from public.os_ai_actions");
  return confirmBlocked && s === "rejected" ? null : `blocked=${confirmBlocked} status=${s}`;
}, (w) => w);

// ── Drive connection (sealed refresh token): service role only
await svc("insert into public.os_drive_connection (google_email, token_sealed, scopes, connected_by) values ('founder@example.com', 'v1.x.y.z', 'drive', 'PPL-9001')");
await te("a founder cannot read the Drive token through the API", () => user(F, "select token_sealed from public.os_drive_connection"), /permission denied/);
await te("a member cannot replace the Drive connection", () => user(C, "update public.os_drive_connection set google_email = 'attacker@example.com'"), /permission denied/);
await te("anon cannot read the Drive connection", () => as("anon", null, "select * from public.os_drive_connection"), /permission denied/);
await te("only one Drive connection can exist", () => svc("insert into public.os_drive_connection (id, google_email, token_sealed, scopes, connected_by) values (false, 'x@example.com', 'v1', 'drive', 'PPL-9001')"), /check/);

// ── Grants hygiene
await t("anon has no privileges on any os_ table", () => db.query("select count(*)::int c from information_schema.role_table_grants where grantee = 'anon' and table_name like 'os\\_%'"), (r) => is(0)(r.rows[0].c));
await t("every os_ table has RLS on", () => db.query("select string_agg(c.relname, ',') bad from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'os\\_%' and not c.relrowsecurity"), (r) => (r.rows[0].bad === null ? null : r.rows[0].bad));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
