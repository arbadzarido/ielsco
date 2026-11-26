// Company OS operating system (20261214000000) on PGlite over every earlier Company OS migration: the HQ structure,
// task departments, partnership categories, Growth registers, request routes, portfolio projects and live stats.
// Checks that nothing existing is deleted or changed beyond the documented columns, and that it applies twice.
//   node company-os-operating-system.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  arba: "00000000-0000-0000-0000-0000000000f1",
  renita: "00000000-0000-0000-0000-0000000000a7", // Operations manager
  didi: "00000000-0000-0000-0000-0000000000a3", // Growth manager
  acha: "00000000-0000-0000-0000-0000000000a8", // Marketing manager (in Growth before this migration)
  mojo: "00000000-0000-0000-0000-0000000000a5", // Creative manager
  shafira: "00000000-0000-0000-0000-0000000000a4", // Business manager
  elco: "00000000-0000-0000-0000-0000000000b3", // Elco-only member
};
const FOUNDERS = new Set([U.arba]);
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
  "20261117000000_company_os_subdivisions_metrics.sql", "20261118000000_company_os_document_templates.sql",
  "20261129000000_company_os_programmes.sql"];
const MIG = "20261214000000_company_os_operating_system.sql";
for (const f of BASE) await db.exec(readFileSync(join(dir, f), "utf8"));

await db.exec(`
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-0001', '${U.arba}', 'Arba Test', 'founder', 'active', 'arba@example.test'),
    ('PPL-0007', '${U.renita}', 'Renita Test', 'manager', 'active', 'renita@example.test'),
    ('PPL-0003', '${U.didi}', 'Didi Test', 'manager', 'active', 'didi@example.test'),
    ('PPL-0008', '${U.acha}', 'Acha Test', 'manager', 'active', 'acha@example.test'),
    ('PPL-0005', '${U.mojo}', 'Mojo Test', 'manager', 'active', 'mojo@example.test'),
    ('PPL-0004', '${U.shafira}', 'Shafira Test', 'manager', 'active', 'shafira@example.test'),
    ('PPL-9003', '${U.elco}', 'Elco Test', 'member', 'active', 'elco@example.test');
  insert into public.os_person_companies values ('PPL-0001','HQ'),('PPL-0001','IEL'),('PPL-0001','ELC'),('PPL-0007','IEL'),('PPL-0003','IEL'),('PPL-0003','ELC'),
    ('PPL-0008','IEL'),('PPL-0005','IEL'),('PPL-0004','IEL'),('PPL-9003','ELC');
  insert into public.os_person_divisions values ('PPL-0007','DIV-02',true),('PPL-0003','DIV-03',true),('PPL-0008','DIV-03',false),('PPL-0005','DIV-04',true),('PPL-0004','DIV-06',true);
  insert into public.os_projects (id, company_code, division_id, name, project_type, owner_person_id, status, sensitivity) values
    ('PRJ-0032', 'IEL', null, 'IELS Circle', 'Program', 'PPL-0001', 'Active', 'Internal'),
    ('PRJ-0033', 'IEL', 'DIV-02', 'Global Impact Fellowship Summer 2027', 'Program', 'PPL-0001', 'Active', 'Internal');
  insert into public.os_id_counters (prefix, last) values ('PRJ', 36) on conflict (prefix) do update set last = 36;
  insert into public.os_tasks (id, project_id, company_code, division_id, title, owner_person_id, status, due_date) values
    ('TSK-0001', 'PRJ-0033', 'IEL', 'DIV-02', 'Concept note', 'PPL-0007', 'In Progress', '2026-12-11'),
    ('TSK-0002', null, 'IEL', 'DIV-03', 'Growth plan', 'PPL-0003', 'Backlog', '2026-12-01'),
    ('TSK-0003', null, 'IEL', null, 'No division', 'PPL-0001', 'Ready', null);
  insert into public.os_id_counters (prefix, last) values ('TSK', 3) on conflict (prefix) do update set last = 3;
  insert into public.os_partnerships (id, company_code, division_id, opportunity_type, organisation, related_project_id) values
    ('OPP-0004', 'IEL', 'DIV-06', 'GIF 2027: University', 'NUS', 'PRJ-0033'),
    ('OPP-0008', 'IEL', 'DIV-06', 'GIF 2027: Student organisation', 'PPI', 'PRJ-0033'),
    ('OPP-0010', 'IEL', 'DIV-06', 'GIF 2027: Vendor', 'Bus company', 'PRJ-0033');`);

const snap = async () => (await db.query(`select
  (select md5(string_agg((to_jsonb(t) - 'department')::text, '' order by id)) from public.os_tasks t) tasks,
  (select md5(string_agg((to_jsonb(p) - 'partner_category')::text, '' order by id)) from public.os_partnerships p) opps,
  (select count(*)::int from public.os_divisions) divs, (select count(*)::int from public.os_person_divisions) pd`)).rows[0];
const before = await snap();
await db.exec(readFileSync(join(dir, MIG), "utf8"));
await db.exec(readFileSync(join(dir, MIG), "utf8"));
ok("migration applies twice");

const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid) => ({ sub: uid, role: "authenticated", session_id: SESS[uid], aal: FOUNDERS.has(uid) ? "aal2" : "aal1", amr: [{ method: "oauth", timestamp: nowS() - 60 }] });
async function user(uid, q, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsFor(uid))]);
    await db.exec("set local role authenticated");
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const one = async (uid, q, p) => Object.values((await user(uid, q, p)).rows[0] ?? { x: undefined })[0];
const sys = async (q, p) => Object.values((await db.query(q, p)).rows[0] ?? { x: undefined })[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 70)})`) : bad(n, e.message); } };
const is = (want) => (got) => (JSON.stringify(got) === JSON.stringify(want) ? null : `got ${JSON.stringify(got)}`);
const { arba: A, renita: RE, didi: DI, acha: AC, mojo: MO, shafira: SH, elco: EL } = U;

// ── Structure
await t("Partnerships is renamed Business, same id and code", () => sys(`select code || ':' || name from public.os_divisions where id = 'DIV-06'`), is("PAR:Business"));
await t("Marketing exists as DIV-10 MKT in the Growth department", () => sys(`select code || ':' || department from public.os_divisions where id = 'DIV-10'`), is("MKT:growth"));
await t("departments: Operations = OPS, PPL, PAR; Growth = GRO, CRE, MKT", () => sys(`select string_agg(department || '/' || code, ',' order by department, code) from public.os_divisions where department is not null`),
  is("growth/CRE,growth/GRO,growth/MKT,operations/OPS,operations/PAR,operations/PPL"));
await t("Community and Courses & Learning are inactive, not deleted", () => sys(`select string_agg(id || ':' || active, ',' order by id) from public.os_divisions where id in ('DIV-01','DIV-07')`), is("DIV-01:false,DIV-07:false"));
await t("only one division was added and no membership removed", async () => { const a = await snap(); return [a.divs - before.divs, a.pd - before.pd]; }, is([1, 1]));
await t("the Marketing manager leads Marketing", () => sys(`select is_manager from public.os_person_divisions where person_id = 'PPL-0008' and division_id = 'DIV-10'`), is(true));
await t("workspaces list hides inactive divisions", () => one(A, `select string_agg(code, ',' order by division_id) from public.os_my_workspaces()`), is("OPS,GRO,CRE,PPL,PAR,FIN,LEG,MKT"));
await t("Acha now has edit access to the Marketing workspace", () => one(AC, `select access from public.os_my_workspaces() where code = 'MKT'`), is("edit"));

// ── Tasks
await t("no task changed except department", async () => (await snap()).tasks === before.tasks, is(true));
await t("existing tasks got the department of their division", () => sys(`select string_agg(id || ':' || coalesce(department, '-'), ',' order by id) from public.os_tasks`), is("TSK-0001:operations,TSK-0002:growth,TSK-0003:-"));
await t("a manager sets a department on a task without division", () => one(A, `update public.os_tasks set department = 'growth' where id = 'TSK-0003' returning department`), is("growth"));
await t("choosing a division sets its department", () => one(DI, `update public.os_tasks set division_id = 'DIV-10' where id = 'TSK-0002' returning department || ':' || division_id`), is("growth:DIV-10"));
await t("changing the department clears a division that no longer fits", () => one(A, `update public.os_tasks set department = 'operations' where id = 'TSK-0002' returning department || ':' || coalesce(division_id, '-')`), is("operations:-"));
await te("department must be one of the two", () => user(A, `update public.os_tasks set department = 'community' where id = 'TSK-0003'`), /check constraint|violates/);
await t("an Elco-only member sees no IELSco task", () => one(EL, `select count(*)::int from public.os_tasks`), is(0));

// ── Partnerships
await t("unambiguous partner types are categorised, vendors left for Business", () => sys(`select string_agg(id || ':' || coalesce(partner_category, '-'), ',' order by id) from public.os_partnerships`), is("OPP-0004:academic,OPP-0008:community,OPP-0010:-"));
await t("no other partnership column changed", async () => (await snap()).opps === before.opps, is(true));
await t("the Business manager can set a category", () => one(SH, `update public.os_partnerships set partner_category = 'corporate' where id = 'OPP-0010' returning partner_category`), is("corporate"));
await te("categories are limited to five", () => user(SH, `update public.os_partnerships set partner_category = 'vendor' where id = 'OPP-0010'`), /check constraint|violates/);

// ── Growth registers
await t("Growth adds a KOL", () => one(DI, `insert into public.os_growth_creators (company_code, name, platform, creator_type, status, owner_person_id) values ('IEL', 'Creator A', 'TikTok', 'KOL', 'Shortlisted', 'PPL-0003') returning created_by`), is("PPL-0003"));
await t("Creative can read Internal creator rows of its company", () => one(MO, `select count(*)::int from public.os_growth_creators`), is(1));
await te("Creative cannot add to the Growth register", () => user(MO, `insert into public.os_growth_creators (company_code, name) values ('IEL', 'X')`), /row-level security/);
await t("Growth logs an experiment", () => one(DI, `insert into public.os_growth_experiments (company_code, title, status, owner_person_id) values ('IEL', 'Reels at 19:00 vs 12:00', 'Planned', 'PPL-0003') returning status`), is("Planned"));
await t("an Elco-only member sees no IELSco creator", () => one(EL, `select count(*)::int from public.os_growth_creators`), is(0));

// ── Requests
await t("Marketing → Creative content brief route exists", () => sys(`select from_division_id || '>' || to_division_id from public.os_request_types where code = 'content_brief'`), is("DIV-10>DIV-04"));
await t("routes from retired divisions are off", () => sys(`select string_agg(code, ',' order by code) from public.os_request_types where not active`), is("marketing_collaboration,student_engagement"));
let req;
await t("Acha sends a content brief to Creative", async () => { req = await one(AC, `select public.os_request_submit('content_brief', 'IEL', 'GIF carousel', 'Objective: recruit delegates. Audience: students.', 'P2 High', current_date + 7, 'project', 'PRJ-0033')`); return req; }, (r) => (/^REQ-/.test(r) ? null : r));
await t("Creative sees the brief", () => one(MO, `select count(*)::int from public.os_requests where type_code = 'content_brief'`), is(1));
await t("the brief names its project", () => sys(`select related_type || ':' || related_id from public.os_requests where id = $1`, [req]), is("project:PRJ-0033"));
await te("Growth cannot send a Marketing brief", () => user(DI, `select public.os_request_submit('content_brief', 'IEL', 'Brief', 'Something long enough.', 'P3 Normal', current_date + 3)`), /requesting division/);

// ── Portfolio
await t("four portfolio projects, Elco under Elco AI", () => sys(`select string_agg(portfolio_key || ':' || company_code || ':' || portfolio_rank, ',' order by portfolio_rank) from public.os_projects where portfolio_key is not null`), is("circle:IEL:1,gif:IEL:2,elco:ELC:3,course:IEL:4"));
await t("new projects use the next PRJ ids", () => sys(`select string_agg(id, ',' order by id) from public.os_projects where portfolio_key in ('elco','course')`), is("PRJ-0037,PRJ-0038"));
await t("staff read live stats for the course (counts only)", () => one(RE, `select (public.os_portfolio_live_stats('course') ->> 'available')`), is("true"));
await t("GIF live stats go through the programme rules", () => one(RE, `select public.os_portfolio_live_stats('gif') is not null`), is(true));
await t("an unknown key returns nothing", () => one(RE, `select public.os_portfolio_live_stats('nope') is null`), is(true));
await te("anon cannot call live stats", async () => { await db.exec("begin"); try { await db.exec("set local role anon"); await db.query(`select public.os_portfolio_live_stats('course')`); await db.exec("commit"); } catch (e) { await db.exec("rollback"); throw e; } }, /permission denied/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
