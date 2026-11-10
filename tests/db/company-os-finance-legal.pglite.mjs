// Company OS division workspaces, phase 3 (20261115000000): Finance and Legal. Expense, reimbursement and income
// workflows, self-approval blocks, budget and cash-flow arithmetic, who can read what (requesters, division leads,
// Finance, Legal), hidden payment details, numbering rules and the number register (separate sequences, void without
// reuse), letters, agreements, compliance reminders, receipts, and the request links, on PGlite over every earlier
// migration. Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install and run:
//   node company-os-finance-legal.pglite.mjs <repo>/supabase/migrations
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
  founder2: "00000000-0000-0000-0000-0000000000c1", // second founder
  legal: "00000000-0000-0000-0000-0000000000c2", // Legal member (workspace role), IELSco + Elco
  people: "00000000-0000-0000-0000-0000000000c3", // People member, IELSco
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql", "20261115000000_company_os_finance_legal.sql"]) {
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
    ('PPL-9003','DIV-04','lead','Runs Creative intake'), ('PPL-9014','DIV-08','officer','Finance officer');
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-9021', '${U.founder2}', 'Test Founder Two', 'founder', 'active', 'founder2@example.test'),
    ('PPL-9022', '${U.legal}', 'Test Legal Member', 'member', 'active', 'legal@example.test'),
    ('PPL-9023', '${U.people}', 'Test People Member', 'member', 'active', 'people@example.test');
  insert into public.os_person_companies values ('PPL-9021','IEL'),('PPL-9021','ELC'),('PPL-9022','IEL'),('PPL-9022','ELC'),('PPL-9023','IEL');
  insert into public.os_person_divisions values ('PPL-9023','DIV-05',false);
  insert into public.os_workspace_roles (person_id, division_id, role, reason) values ('PPL-9022','DIV-09','member','Legal admin');
  insert into public.os_projects (id, company_code, division_id, name, sensitivity) values ('PRJ-9001','IEL','DIV-02','Open day','Internal'), ('PRJ-9002','IEL','DIV-02','Venue negotiation','Confidential');`);

// JWT claims for a user: a Google (oauth) sign-in a minute ago, in their own session. Founders have passed MFA.
const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid, extra = {}) => (uid ? {
  sub: uid, role: "authenticated", session_id: SESS[uid], aal: [U.founder, U.founder2].includes(uid) ? "aal2" : "aal1",
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


const F = U.founder, F2 = U.founder2, M = U.manager, C = U.creative, E = U.elco, G = U.guest, O = U.outsider;
const CR = U.creative2, OP = U.ops, OM = U.opsManager, FO = U.finance, GR = U.growth, OP2 = U.ops2, LG = U.legal, PE = U.people;
const svc = (q, p) => as("service_role", null, q, p);
const falsy = (v) => (v === false ? null : `got ${JSON.stringify(v)}`);
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plus = (n) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][Number(today.slice(5, 7)) - 1];
const YEAR = today.slice(0, 4);
const isId = (p) => (v) => (new RegExp(`^${p}-\\d{4,}$`).test(v) ? null : `got ${v}`);

const expense = (uid, amount, opts = {}) => one(uid, `select public.os_fin_submit($1, $2, $3, $4::bigint, $5::date, $6, p_project => $7, p_payee => $8, p_request => $9)`,
  [opts.kind ?? "expense", opts.company ?? "IEL", opts.division ?? "DIV-02", amount, opts.date ?? today, opts.desc ?? "Chairs for the open day", opts.project ?? null, opts.payee ?? null, opts.request ?? null]);
const fin = (uid, id, action, o = {}) => one(uid, "select public.os_fin_act($1, $2, $3, $4::date, $5, $6, $7)", [id, action, o.note ?? null, o.on ?? null, o.method ?? null, o.account ?? null, o.ref ?? null]);
const trxStatus = (id) => svc("select status from public.os_fin_transactions where id = $1", [id]).then((r) => r.rows[0].status);
const seesTrx = (uid, id) => one(uid, "select count(*)::int from public.os_fin_transactions where id = $1", [id]);
const settle = async (id, how = "pay") => { await fin(F, id, "approve").catch(() => null); await fin(FO, id, "verify"); return fin(FO, id, how, { on: today, method: "transfer", ref: "BCA-123" }); };

// ── Who runs Finance and Legal ────────────────────────────────────────────────────────────────────────────────────
await t("founders approve Finance; a Finance officer operates but doesn't approve", async () =>
  [await one(F, "select public.os_fin_approver()"), await one(FO, "select public.os_fin_operate()"), await one(FO, "select public.os_fin_approver()"), await one(OM, "select public.os_fin_view()")].join(","), is("true,true,false,false"));
await t("a Legal member operates Legal but doesn't sign; founders sign", async () =>
  [await one(LG, "select public.os_leg_operate()"), await one(LG, "select public.os_leg_signer()"), await one(F, "select public.os_leg_signer()"), await one(OM, "select public.os_leg_view()")].join(","), is("true,false,true,false"));
await t("other division managers get nothing in Finance or Legal by default", async () =>
  [await one(M, "select public.os_fin_view()"), await one(M, "select public.os_leg_view()"), await one(OM, "select public.os_workspace_access('DIV-08', 'view')")].join(","), is("false,false,false"));

// ── Expense: requested -> approved -> verified -> paid -> reconciled ──────────────────────────────────────────────
let e1;
await t("an Operations member asks for an expense", async () => { e1 = await expense(OP, 500000, { project: "PRJ-9001" }); return e1; }, isId("TRX"));
await t("…it starts as requested", () => trxStatus(e1), is("requested"));
await t("…founders are told there's one to approve", async () => (await svc("select count(*)::int c from public.os_notifications where kind = 'finance_update' and entity_id = $1", [e1])).rows[0].c, is(2));
await te("Growth can't ask on Operations' behalf", () => expense(GR, 1000), /division you work in/);
await te("Elco staff can't ask for IELSco", () => expense(E, 1000, { division: "DIV-03" }), /company you work in/);
await te("guests can't ask", () => expense(G, 1000), /staff/);
await te("zero amounts refused", () => expense(OP, 0), /more than zero/);
await te("no direct inserts", () => user(OP, "insert into public.os_fin_transactions (id, kind, company_code, description, amount, txn_date, requested_by) values ('TRX-9999','expense','IEL','sneaky one',1,now()::date,'PPL-9012')"), /permission denied/);
await te("no direct status changes", () => user(F, "update public.os_fin_transactions set status = 'paid' where id = $1", [e1]), /permission denied/);
for (const [n, uid, want] of [["requester", OP, 1], ["Operations lead", OM, 1], ["Finance officer", FO, 1], ["founder", F, 1],
  ["Operations teammate", OP2, 0], ["Growth manager", M, 0], ["Creative lead", C, 0], ["Legal member", LG, 0], ["guest", G, 0], ["outsider", O, 0]]) {
  await t(`${n} ${want ? "can" : "cannot"} read the expense`, () => seesTrx(uid, e1), is(want));
}
await t("the requester edits it before anyone acts", () => one(OP, "select public.os_fin_update($1, 450000, $2::date, 'Chairs and tables')", [e1, today]), is("requested"));
await te("someone else can't edit it", () => one(OP2, "select public.os_fin_update($1, 1, $2::date, 'Mine now')", [e1, today]), /Not allowed/);
await te("the requester can't approve", () => fin(OP, e1, "approve"), /Not allowed/);
await te("the Operations lead can't approve a Finance expense", () => fin(OM, e1, "approve"), /Not allowed/);
await te("a Finance officer can't approve", () => fin(FO, e1, "approve"), /Not allowed/);
await te("it can't be verified before approval", () => fin(FO, e1, "verify"), /can't be verified now/);
await te("…nor paid", () => fin(FO, e1, "pay", { on: today, method: "transfer" }), /can't be settled now/);
await t("a founder approves", () => fin(F, e1, "approve"), is("approved"));
await t("…and the decision is on record", () => one(OP, "select string_agg(decision || ':' || approver_person_id, ',') from public.os_approvals where entity_type = 'transaction' and entity_id = $1", [e1]), is("approved:PPL-9001"));
await te("approved isn't paid: settling before verification refused", () => fin(FO, e1, "pay", { on: today, method: "transfer" }), /can't be settled now/);
await te("the requester can't verify", () => fin(OP, e1, "verify"), /Not allowed/);
await t("Finance verifies", () => fin(FO, e1, "verify"), is("verified"));
await te("the requester can't cancel after verification", () => fin(OP, e1, "cancel", { note: "Changed my mind" }), /can't be cancelled now/);
await te("paying needs the date and method", () => fin(FO, e1, "pay"), /date it was paid/);
await te("a future payment date refused", () => fin(FO, e1, "pay", { on: plus(3), method: "transfer" }), /date it was paid/);
await t("Finance pays it", () => fin(FO, e1, "pay", { on: today, method: "transfer", ref: "BCA-998877" }), is("paid"));
await te("reconciling needs a statement reference", () => fin(FO, e1, "reconcile"), /statement reference/);
await t("Finance reconciles it", () => fin(FO, e1, "reconcile", { ref: "STMT-2026-11" }), is("reconciled"));
await t("the history has every step", () => one(OP, "select string_agg(action, ',' order by id) from public.os_record_events where entity_type = 'transaction' and entity_id = $1", [e1]),
  is("submitted,updated,approve,verify,pay,reconcile"));
await t("bank and statement references stay out of the history the requester reads", () => one(OP, "select count(*)::int from public.os_record_events where entity_id = $1 and (note like '%BCA%' or note like '%STMT%')", [e1]), is(0));
await t("the requester was told at each step", async () => (await svc("select count(*)::int c from public.os_notifications where person_id = 'PPL-9012' and entity_id = $1", [e1])).rows[0].c, is(4));

// Payment details
await te("the requester can't read bank references", () => user(OP, "select payment_reference from public.os_fin_transactions where id = $1", [e1]), /permission denied/);
await te("…nor the paying account", () => user(OM, "select account_id from public.os_fin_transactions where id = $1", [e1]), /permission denied/);
await t("…the payment details function returns nothing to them", () => one(OP, "select count(*)::int from public.os_fin_payment_details(array[$1])", [e1]), is(0));
await t("Finance reads them", () => one(FO, "select payment_reference || '|' || statement_reference from public.os_fin_payment_details(array[$1])", [e1]), is("BCA-998877|STMT-2026-11"));

// Founder's own expense: another founder approves
let e2;
await t("a founder asks for an expense", async () => { e2 = await expense(F, 200000, { division: "DIV-02" }); return e2; }, isId("TRX"));
await te("…and can't approve their own", () => fin(F, e2, "approve"), /your own expense/);
await t("…the other founder approves it", () => fin(F2, e2, "approve"), is("approved"));

// Reimbursement
let r1;
await t("an Operations member asks to be paid back", async () => { r1 = await expense(OP2, 75000, { kind: "reimbursement", desc: "Taxi to the venue" }); return r1; }, isId("TRX"));
await t("…the payee is themselves", () => svc("select payee_person_id from public.os_fin_transactions where id = $1", [r1]).then((r) => r.rows[0].payee_person_id), is("PPL-9016"));
await t("…and they can read it", () => seesTrx(OP2, r1), is(1));

// Rejections and cancellations
let e3, e4, e5;
e3 = await expense(OP, 50000, { desc: "Fancy pens" });
await te("rejecting needs a reason", () => fin(F, e3, "reject"), /reason/);
await t("a founder rejects with a reason", () => fin(F, e3, "reject", { note: "Use the office stock" }), is("rejected"));
await te("a rejected expense can't be approved later", () => fin(F, e3, "approve"), /waiting for approval/);
e4 = await expense(OP, 30000, { desc: "Snacks" });
await te("cancelling needs a reason", () => fin(OP, e4, "cancel"), /reason/);
await t("the requester cancels before anyone acts", () => fin(OP, e4, "cancel", { note: "Bought by the venue" }), is("cancelled"));
e5 = await expense(OP, 100000, { desc: "Printing" });

// ── Budgets ───────────────────────────────────────────────────────────────────────────────────────────────────────
let b1;
const monthStart = `${today.slice(0, 7)}-01`;
const monthEnd = (() => { const d = new Date(`${monthStart}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.toISOString().slice(0, 10); })();
await te("an Operations lead can't set budgets", () => one(OM, "select public.os_fin_budget_save(null, 'IEL', 'DIV-02', null, null, 'Ops this month', $1::date, $2::date, 1000000)", [monthStart, monthEnd]), /Not allowed/);
await t("Finance proposes an Operations budget", async () => { b1 = await one(FO, "select public.os_fin_budget_save(null, 'IEL', 'DIV-02', null, null, 'Ops this month', $1::date, $2::date, 1000000)", [monthStart, monthEnd]); return b1; }, isId("BUD"));
await t("…the Operations lead can't see it while it's only proposed", () => one(OM, "select count(*)::int from public.os_fin_budgets where id = $1", [b1]), is(0));
await te("…a Finance officer can't approve it", () => one(FO, "select public.os_fin_budget_act($1, 'approve')", [b1]), /Not allowed/);
await t("…a founder approves it", () => one(F, "select public.os_fin_budget_act($1, 'approve')", [b1]), is("approved"));
await t("…now the Operations lead sees it", () => one(OM, "select count(*)::int from public.os_fin_budgets where id = $1", [b1]), is(1));
await t("…but not an Operations member or Growth", async () => `${await one(OP, "select count(*)::int from public.os_fin_budgets")}/${await one(M, "select count(*)::int from public.os_fin_budgets")}`, is("0/0"));
// In the budget: e1 450k reconciled, e2 200k approved, e5 100k requested, e3 rejected, e4 cancelled, r1 75k requested.
await t("budget arithmetic: requested, committed, actual, remaining", () => user(OM, "select budget, requested, committed, actual, remaining from public.os_fin_budget_summary('IEL', 'DIV-02')").then((r) => JSON.stringify(r.rows[0])),
  is(JSON.stringify({ budget: 1000000, requested: 175000, committed: 200000, actual: 450000, remaining: 350000 })));
await t("Growth's manager sees no budget lines", () => one(M, "select count(*)::int from public.os_fin_budget_summary()"), is(0));
let b2;
await t("a budget can be proposed for a project and from a request", async () => {
  const req = await one(OP, "select public.os_request_submit('budget', 'IEL', 'Open day budget', 'Chairs, tables and printing for the open day.', 'P2 High', $1::date, 'project', 'PRJ-9001')", [plus(10)]);
  b2 = await one(FO, "select public.os_fin_budget_save(null, 'IEL', 'DIV-02', 'PRJ-9001', null, 'Open day', $1::date, $2::date, 600000, null, $3)", [monthStart, monthEnd, req]);
  return svc("select request_id = $2 as v from public.os_fin_budgets where id = $1", [b2, req]).then((r) => String(r.rows[0].v));
}, is("true"));
const b3 = await one(F, "select public.os_fin_budget_save(null, 'IEL', null, null, null, 'Company reserve', $1::date, $2::date, 5000000)", [monthStart, monthEnd]);
await te("…the person who proposed a budget can't approve it", () => one(F, "select public.os_fin_budget_act($1, 'approve')", [b3]), /Someone else approves/);

// ── Income: verified before it counts ─────────────────────────────────────────────────────────────────────────────
let i1;
await t("a Growth member reports income", async () => { i1 = await expense(GR, 300000, { kind: "income", division: "DIV-03", desc: "Workshop tickets" }); return i1; }, isId("TRX"));
await te("income isn't approved, it's verified", () => fin(F, i1, "approve"), /waiting for approval/);
await te("unverified income can't be received", () => fin(FO, i1, "receive", { on: today, method: "transfer" }), /can't be settled now/);
await t("Finance verifies the income", () => fin(FO, i1, "verify"), is("verified"));
await te("income is received, not paid", () => fin(FO, i1, "pay", { on: today, method: "transfer" }), /can't be settled now/);
await t("cash flow before receipt: expected, not cash", () => user(FO, "select cash_in, expected_in from public.os_fin_cashflow('IEL', $1::date, $1::date)", [today]).then((r) => `${r.rows[0].cash_in}/${r.rows[0].expected_in}`), is("0/300000"));
await t("Finance records it received", () => fin(FO, i1, "receive", { on: today, method: "transfer", ref: "TRF-1" }), is("received"));
await t("company cash flow: only settled lines are cash", () => user(F, "select cash_in, cash_out, net, committed_out, requested_out from public.os_fin_cashflow('IEL', $1::date, $1::date)", [today]).then((r) => JSON.stringify(r.rows[0])),
  is(JSON.stringify({ cash_in: 300000, cash_out: 450000, net: -150000, committed_out: 200000, requested_out: 175000 })));
await t("the Operations lead sees their own division's cash flow", () => user(OM, "select cash_out from public.os_fin_cashflow('IEL', $1::date, $1::date, 'DIV-02')", [today]).then((r) => r.rows[0].cash_out), is(450000));
await te("…but not the company's", () => user(OM, "select * from public.os_fin_cashflow('IEL', $1::date, $1::date)", [today]), /Not allowed/);
await te("…nor another division's", () => user(OM, "select * from public.os_fin_cashflow('IEL', $1::date, $1::date, 'DIV-03')", [today]), /Not allowed/);
await te("an Operations member can't read cash flow", () => user(OP, "select * from public.os_fin_cashflow('IEL', $1::date, $1::date, 'DIV-02')", [today]), /Not allowed/);
await t("the Operations lead's ledger is their division only", () => one(OM, "select string_agg(distinct division_id, ',') from public.os_fin_transactions"), is("DIV-02"));
const i2 = await expense(FO, 1000, { kind: "income", division: "DIV-08", desc: "Interest" });
await te("Finance staff can't verify income they reported themselves", () => fin(FO, i2, "verify"), /Someone else verifies/);

// ── Accounts and categories ───────────────────────────────────────────────────────────────────────────────────────
await te("a Finance officer can't add accounts", () => one(FO, "select public.os_fin_account_save(null, 'IEL', 'Main', 'bank', 'BCA', '1234')"), /Not allowed/);
let acc;
await t("a founder adds a bank account (last four digits only)", async () => { acc = await one(F, "select public.os_fin_account_save(null, 'IEL', 'Main', 'bank', 'BCA', '1234')"); return acc; }, isId("FAC"));
await te("…a full account number refused", () => one(F, "select public.os_fin_account_save(null, 'IEL', 'Other', 'bank', 'BCA', '1234567890')"), /check constraint/);
await t("…Finance reads accounts; division leads don't", async () => `${await one(FO, "select count(*)::int from public.os_fin_accounts")}/${await one(OM, "select count(*)::int from public.os_fin_accounts")}`, is("1/0"));
await t("Finance adds a category", () => user(FO, "insert into public.os_fin_categories (code, name, direction) values ('events', 'Events', 'expense')").then(() => "ok"), is("ok"));
await te("…others can't", () => user(OM, "insert into public.os_fin_categories (code, name, direction) values ('perks', 'Perks', 'expense')"), /row-level security/);
await t("…staff read categories to pick one", () => one(OP, "select count(*)::int from public.os_fin_categories"), is(1));
await te("an income category can't be used for an expense", () => one(OP, "select public.os_fin_submit('expense', 'IEL', 'DIV-02', 1000, $1::date, 'Wrong category', 'events_in')", [today]), /category/);

// ── Receipts stay in Drive, linked as documents ───────────────────────────────────────────────────────────────────
let doc;
await t("the requester registers a receipt in the Finance workspace", async () => { doc = (await user(OP, "insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, drive_url) values ('Receipt chairs', 'IEL', 'DIV-08', 'FIN', 'Confidential', 'PPL-9012', 'Draft', 'https://drive.google.com/file/d/abc123456789012345678/view') returning id")).rows[0].id; return doc; }, isId("DOC"));
await t("…and links it to their expense", () => user(OP, "insert into public.os_document_links (document_id, entity_type, entity_id) values ($1, 'transaction', $2)", [doc, e5]).then(() => "ok"), is("ok"));
await t("…Finance sees it; a teammate doesn't", async () => `${await one(F, "select count(*)::int from public.os_documents where id = $1", [doc])}/${await one(OP2, "select count(*)::int from public.os_documents where id = $1", [doc])}`, is("1/0"));
await te("an Internal Finance document isn't a receipt", () => user(OP, "insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status) values ('Ledger', 'IEL', 'DIV-08', 'FIN', 'Internal', 'PPL-9012', 'Draft')"), /row-level security/);
await te("a document can't be linked to someone else's expense", () => user(OP2, "insert into public.os_document_links (document_id, entity_type, entity_id) values ($1, 'transaction', $2)", [doc, e5]), /row-level security/);
await t("the requester comments on their expense", () => user(OP, "insert into public.os_comments (entity_type, entity_id, body) values ('transaction', $1, 'Receipt attached') returning id", [e5]).then((r) => (r.rows[0].id ? "ok" : "no")), is("ok"));
await t("every change is in the audit log", () => svc("select count(*)::int c from public.os_audit_log where target_type = 'os_fin_transactions' and target_id = $1", [e1]).then((r) => r.rows[0].c), (v) => (v >= 6 ? null : `got ${v}`));

// ── Numbering rules ───────────────────────────────────────────────────────────────────────────────────────────────
await t("the chosen outgoing-letter rule exists for IELSco and Elco", () => one(F, "select string_agg(company_code || ':' || format, ',' order by company_code) from public.os_number_rules where kind = 'outgoing_letter'"),
  is("ELC:{company}/{type}/{division}/{month_roman}/{year}/{seq:3},IEL:{company}/{type}/{division}/{month_roman}/{year}/{seq:3}"));
await t("the format gives IEL/SK/LEG/XI/2026/007", () => one(F, "select public.os_format_number('{company}/{type}/{division}/{month_roman}/{year}/{seq:3}', 'IEL', 'SK', 'LEG', '2026-11-10', 7)"), is("IEL/SK/LEG/XI/2026/007"));
await t("…and other tokens", () => one(F, "select public.os_format_number('{type}-{yy}{month}-{seq:4} {seq}', 'IEL', 'PKS', null, '2026-03-05', 12345)"), is("PKS-2603-12345 12345"));
await te("only founders configure rules", () => one(LG, "select public.os_number_rule_save(null, 'IEL', 'incoming_letter', 'SM', 'Incoming', '{company}/{type}/{year}/{seq:3}', 'yearly')"), /Only founders/);
await te("a rule needs a sequence", () => one(F, "select public.os_number_rule_save(null, 'IEL', 'incoming_letter', 'SM', 'Incoming', '{company}/{type}/{year}', 'yearly')"), /needs \{seq\}/);
await te("unknown tokens refused", () => one(F, "select public.os_number_rule_save(null, 'IEL', 'incoming_letter', 'SM', 'Incoming', '{company}/{nope}/{year}/{seq}', 'yearly')"), /Unknown token/);
await te("a yearly sequence needs the year in the number", () => one(F, "select public.os_number_rule_save(null, 'IEL', 'incoming_letter', 'SM', 'Incoming', '{company}/{type}/{seq:3}', 'yearly')"), /yearly sequence/);
let smRule, agRule, skIEL, skELC;
await t("a founder adds an incoming-letter rule", async () => { smRule = await one(F, "select public.os_number_rule_save(null, 'IEL', 'incoming_letter', 'SM', 'Incoming letter', '{company}/{type}/{month_roman}/{year}/{seq:3}', 'yearly')"); return smRule; }, (v) => (v ? null : "no id"));
await t("…and an agreement rule that never restarts", async () => { agRule = await one(F, "select public.os_number_rule_save(null, 'IEL', 'agreement', 'PKS', 'Agreement', '{company}/{type}/{seq:4}', 'never')"); return agRule; }, (v) => (v ? null : "no id"));
skIEL = await one(F, "select id from public.os_number_rules where company_code = 'IEL' and kind = 'outgoing_letter'");
skELC = await one(F, "select id from public.os_number_rules where company_code = 'ELC' and kind = 'outgoing_letter'");
await t("rule changes are on record", () => one(F, "select count(*)::int from public.os_record_events where entity_type = 'number_rule'"), is(2));
await t("Operations can't read rules or the register", async () => `${await count(OM, "os_number_rules")}/${await count(OM, "os_number_register")}`, is("0/0"));
await te("nobody can issue a number directly", () => one(F, "select public.os_issue_number($1, 'DIV-09', 'letter', 'LTR-0001', now()::date)", [skIEL]), /permission denied/);

// ── Outgoing letters ──────────────────────────────────────────────────────────────────────────────────────────────
const letter = (uid, rule, company = "IEL", subject = "Invitation to the open day") =>
  one(uid, "select public.os_letter_save(null, 'outgoing', $1, 'DIV-09', $2::uuid, $3, 'SMA Negeri 1', $4::date)", [company, rule, subject, today]);
const lact = (uid, id, action, note = null) => one(uid, "select public.os_letter_act($1, $2, $3)", [id, action, note]);
const lnum = (id) => svc("select coalesce(number, '-') || '|' || status as s from public.os_letters where id = $1", [id]).then((r) => r.rows[0].s);
let l1, l2, l3, l4;
await te("Operations can't draft letters", () => letter(OM, skIEL), /Not allowed/);
await te("a letter rule must match the company", () => letter(LG, skELC, "IEL"), /active numbering rule of this company/);
await t("a Legal member drafts a letter: no number yet", async () => { l1 = await letter(LG, skIEL); return lnum(l1); }, is("-|draft"));
await t("…sends it for approval", () => lact(LG, l1, "submit"), is("in_review"));
await te("…a Legal member can't approve it", () => lact(LG, l1, "approve"), /Not allowed|Someone else/);
await te("…returning needs a reason", () => lact(F, l1, "return"), /needs to change/);
await t("…a founder approves and the number is generated", async () => { await lact(F, l1, "approve"); return lnum(l1); }, is(`IEL/SK/LEG/${ROMAN}/${YEAR}/001|issued`));
l2 = await letter(LG, skIEL, "IEL", "Second letter"); await lact(LG, l2, "submit");
await t("the next letter gets 002", async () => { await lact(F2, l2, "approve"); return lnum(l2); }, is(`IEL/SK/LEG/${ROMAN}/${YEAR}/002|issued`));
await t("Elco keeps its own sequence", async () => { const x = await letter(LG, skELC, "ELC", "Elco letter"); await lact(LG, x, "submit"); await lact(F, x, "approve"); return lnum(x); }, is(`ELC/SK/LEG/${ROMAN}/${YEAR}/001|issued`));
await t("a returned letter goes back to draft without a number", async () => { l3 = await letter(LG, skIEL, "IEL", "Needs work"); await lact(LG, l3, "submit"); await lact(F, l3, "return", "Fix the date"); return lnum(l3); }, is("-|draft"));
await t("a founder drafts a letter", async () => { l4 = await letter(F, skIEL, "IEL", "Founder letter"); return lact(F, l4, "submit"); }, is("in_review"));
await te("…and can't approve their own", () => lact(F, l4, "approve"), /Someone else/);
await te("voiding needs a reason", () => lact(F, l2, "void"), /reason/);
await te("a Legal member can't void", () => lact(LG, l2, "void", "Typo"), /Not allowed/);
await t("a founder voids letter 002", () => lact(F, l2, "void", "Wrong recipient"), is("void"));
await t("…002 stays in the register, marked void", () => one(F, "select status || '|' || void_reason from public.os_number_register where number = $1", [`IEL/SK/LEG/${ROMAN}/${YEAR}/002`]), is("void|Wrong recipient"));
await t("…and is never reused: the next letter gets 003", async () => { await lact(F2, l4, "approve"); return lnum(l4); }, is(`IEL/SK/LEG/${ROMAN}/${YEAR}/003|issued`));
await te("an issued letter can't be edited", () => one(LG, "select public.os_letter_save($1, 'outgoing', 'IEL', 'DIV-09', $2::uuid, 'Changed', 'Someone', $3::date)", [l1, skIEL, today]), /Only a draft/);
await te("the register can't be edited directly", () => user(F, "update public.os_number_register set status = 'issued' where number = $1", [`IEL/SK/LEG/${ROMAN}/${YEAR}/002`]), /permission denied/);
await te("…or deleted", () => user(F, "delete from public.os_number_register"), /permission denied/);
await t("the register lists every number with its status", () => one(LG, "select string_agg(split_part(number, '/', 6) || ':' || status, ',' order by number) from public.os_number_register where company_code = 'IEL' and kind = 'outgoing_letter'"), is("001:issued,002:void,003:issued"));
await t("Operations can't read letters", () => count(OM, "os_letters"), is(0));

// Incoming
let in1;
await t("a Legal member registers an incoming letter and it's numbered at once", async () => { in1 = await one(LG, "select public.os_letter_save(null, 'incoming', 'IEL', 'DIV-09', $1::uuid, 'Partnership offer', 'Universitas X', $2::date)", [smRule, today]); return lnum(in1); },
  is(`IEL/SM/${ROMAN}/${YEAR}/001|registered`));
await te("an incoming letter needs an incoming rule", () => one(LG, "select public.os_letter_save(null, 'incoming', 'IEL', 'DIV-09', $1::uuid, 'Offer', 'X', $2::date)", [skIEL, today]), /numbering rule/);
await t("…and is archived", () => lact(LG, in1, "archive"), is("archived"));

// ── Agreements ────────────────────────────────────────────────────────────────────────────────────────────────────
let a1;
const agr = (uid, extra = {}) => one(uid, "select public.os_agreement_save(null, 'mou', 'IEL', 'DIV-06', 'MoU with Universitas X', 'Universitas X', $1::date, $2::date, p_rule => $3::uuid, p_owner => $4, p_related_type => $5, p_related_id => $6)",
  [today, extra.end ?? plus(20), extra.rule ?? agRule, extra.owner ?? "PPL-9022", extra.rt ?? null, extra.rid ?? null]);
await te("Partnerships can't draft agreements directly", () => agr(M), /Not allowed/);
await te("an agreement can't link to a project the drafter can't see", () => agr(LG, { rt: "project", rid: "PRJ-9002" }), /linked record/);
await t("a Legal member drafts a MoU", async () => { a1 = await agr(LG); return a1; }, isId("AGR"));
await t("…submits it", () => one(LG, "select public.os_agreement_act($1, 'submit')", [a1]), is("under_review"));
await t("…a founder approves: active and numbered", async () => { await one(F, "select public.os_agreement_act($1, 'approve')", [a1]); return svc("select status || '|' || number as s from public.os_agreements where id = $1", [a1]).then((r) => r.rows[0].s); }, is("active|IEL/PKS/0001"));
await te("an active agreement keeps its party", () => one(LG, "select public.os_agreement_save($1, 'mou', 'IEL', 'DIV-06', 'MoU', 'Someone else')", [a1]), /keeps its type/);
await t("Operations can't read agreements", () => count(OM, "os_agreements"), is(0));

// ── Compliance and reminders ──────────────────────────────────────────────────────────────────────────────────────
let c1;
await t("a Legal member adds a yearly deadline", async () => { c1 = await one(LG, "select public.os_compliance_save(null, 'IEL', 'Annual tax report', $1::date, 'yearly', 'PPL-9022')", [plus(5)]); return c1; }, isId("CPL"));
await t("reminders are written for the deadline and the MoU ending", () => one(LG, "select public.os_legal_reminders()"), is(2));
await t("…once only", () => one(LG, "select public.os_legal_reminders()"), is(0));
await t("…and only for people who can see them", () => one(OM, "select public.os_legal_reminders()"), is(0));
await t("marking a yearly item done moves it to next year", async () => { await one(LG, "select public.os_compliance_act($1, 'done')", [c1]); return svc("select status || '|' || due_date::text as s from public.os_compliance_items where id = $1", [c1]).then((r) => r.rows[0].s); },
  is(`open|${String(Number(plus(5).slice(0, 4)) + 1)}${plus(5).slice(4)}`));
await te("waiving needs a reason", () => one(LG, "select public.os_compliance_act($1, 'waive')", [c1]), /reason/);
await te("terminating needs a reason", () => one(LG, "select public.os_agreement_act($1, 'terminate')", [a1]), /reason/);
await t("terminating an agreement keeps its number", async () => { await one(LG, "select public.os_agreement_act($1, 'terminate', 'Programme ended')", [a1]); return svc("select status || '|' || number as s from public.os_agreements where id = $1", [a1]).then((r) => r.rows[0].s); }, is("terminated|IEL/PKS/0001"));

// ── Cross-division requests ──────────────────────────────────────────────────────────────────────────────────────
await t("new routes: Growth campaign expense to Finance, People document to Legal", () => one(GR, "select string_agg(code || ':' || from_division_id || '>' || to_division_id || ':' || needs_approval, ',' order by sort_order) from public.os_request_types where sort_order > 6"),
  is("campaign_expense:DIV-03>DIV-08:true,employment_document:DIV-05>DIV-09:false"));
let pr;
await t("People asks Legal for an employment document", async () => { pr = await one(PE, "select public.os_request_submit('employment_document', 'IEL', 'Offer letter for new hire', 'Offer letter for the new Creative designer starting next month.', 'P2 High', $1::date)", [plus(7)]); return pr; }, isId("REQ"));
await t("…Legal can read it; Operations can't", async () => `${await one(LG, "select count(*)::int from public.os_requests where id = $1", [pr])}/${await one(OM, "select count(*)::int from public.os_requests where id = $1", [pr])}`, is("1/0"));
await te("a request can't link to a project the sender can't see", () => one(GR, "select public.os_request_submit('campaign_expense', 'IEL', 'Ads', 'Ads budget for the open day campaign.', 'P2 High', $1::date, 'project', 'PRJ-9002')", [plus(7)]), /linked record/);
await t("an expense links to the request it came from", async () => {
  const rq = await one(GR, "select public.os_request_submit('campaign_expense', 'IEL', 'Ads', 'Ads budget for the open day campaign.', 'P2 High', $1::date)", [plus(7)]);
  const x = await expense(GR, 250000, { division: "DIV-03", request: rq, desc: "Instagram ads" });
  return svc("select request_id = $2 as v from public.os_fin_transactions where id = $1", [x, rq]).then((r) => String(r.rows[0].v));
}, is("true"));

// ── Privileges ───────────────────────────────────────────────────────────────────────────────────────────────────
for (const f of ["os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)", "os_fin_act(text, text, text, date, text, text, text)", "os_letter_act(text, text, text)", "os_number_rule_save(uuid, text, text, text, text, text, text, boolean)", "os_fin_cashflow(text, date, date, text)", "os_legal_reminders()"]) {
  await t(`anon can't run ${f.split("(")[0]}`, () => svc(`select has_function_privilege('anon', 'public.${f}', 'execute') as v`).then((r) => r.rows[0].v), falsy);
}
for (const f of ["os_issue_number(uuid, text, text, text, date)", "os_fl_log(text, text, text, text, text, text)", "os_fl_tell(text, text, text, text, text, text, text)"]) {
  await t(`authenticated can't run ${f.split("(")[0]}`, () => svc(`select has_function_privilege('authenticated', 'public.${f}', 'execute') as v`).then((r) => r.rows[0].v), falsy);
}
await te("anonymous visitors can't read the ledger", () => as("anon", null, "select count(*) from public.os_fin_transactions"), /permission denied/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
