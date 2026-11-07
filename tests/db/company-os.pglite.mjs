// Company OS foundation migration (20261107000000) on PGlite with Supabase-like roles and default grants.
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql"]) {
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
  insert into public.os_person_companies values
    ('PPL-9001','IEL'),('PPL-9001','ELC'),('PPL-9002','IEL'),('PPL-9002','ELC'),('PPL-9003','IEL'),('PPL-9004','ELC'),('PPL-9005','IEL'),('PPL-9006','IEL');
  insert into public.os_person_divisions values
    ('PPL-9002','DIV-03',true),('PPL-9003','DIV-04',false),('PPL-9004','DIV-03',false),('PPL-9006','DIV-04',false);`);

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

// Seeds
await t("three companies", () => db.query("select count(*)::int c from public.os_companies"), (r) => is(3)(r.rows[0].c));
await t("seven divisions", () => db.query("select count(*)::int c from public.os_divisions"), (r) => is(7)(r.rows[0].c));
await t("27 folder routes, all proposed", () => db.query("select count(*) filter (where status = 'proposed')::int p, count(*)::int a from public.os_folder_routes"), (r) => (r.rows[0].p === 27 && r.rows[0].a === 27 ? null : JSON.stringify(r.rows[0])));

// Anonymous visitors
await te("anon cannot read people", () => as("anon", null, "select * from public.os_people"), /permission denied/);
await te("anon cannot call os_can_view", () => as("anon", null, "select public.os_can_view('IEL', null, 'Internal', 'document', 'x')"), /permission denied/);

// Signed in, but not in the OS
await t("outsider sees no people", () => count(U.outsider, "os_people"), is(0));
await t("outsider sees no divisions", () => count(U.outsider, "os_divisions"), is(0));
await t("outsider cannot view Internal", () => canView(U.outsider, "IEL", null, "Internal"), is(false));

// Sensitivity rules for a member (Creative, IELSco)
await t("member sees IELSco Internal of another division", () => canView(U.creative, "IEL", "DIV-03", "Internal"), is(true));
await t("IELSco-only member does not see Elco Internal", () => canView(U.creative, "ELC", "DIV-04", "Internal"), is(false));
await t("member sees HQ Internal", () => canView(U.creative, "HQ", null, "Internal"), is(true));
await t("member does not see another division's Confidential", () => canView(U.creative, "IEL", "DIV-03", "Confidential"), is(false));
await t("member sees own division's Confidential", () => canView(U.creative, "IEL", "DIV-04", "Confidential"), is(true));
await t("member does not see Restricted in own division", () => canView(U.creative, "IEL", "DIV-04", "Restricted"), is(false));
await t("member edits own division Internal", () => canEdit(U.creative, "IEL", "DIV-04", "Internal"), is(true));
await t("member cannot edit another division", () => canEdit(U.creative, "IEL", "DIV-03", "Internal"), is(false));
await t("member cannot read the audit log", () => count(U.creative, "os_audit_log"), is(0));
await t("founder sees Restricted", () => canView(U.founder, "ELC", "DIV-05", "Restricted"), is(true));
await t("founder edits Restricted", () => canEdit(U.founder, "IEL", null, "Restricted"), is(true));
await t("offboarded person sees nothing", () => canView(U.offboarded, "IEL", "DIV-04", "Internal"), is(false));

// Guests: explicit grants only
await t("guest does not see HQ Internal", () => canView(U.guest, "HQ", null, "Internal", "DOC-G"), is(false));
await t("guest sees only their own person row", () => count(U.guest, "os_people"), is(1));
await t("founder grants a guest one document", () => user(U.founder,
  `insert into public.os_grants (person_id, resource_type, resource_id, level, reason, granted_by) values ('PPL-9005', 'document', 'DOC-G', 'view', 'External reviewer', 'PPL-9001')`));
await t("guest sees the granted document", () => canView(U.guest, "HQ", null, "Internal", "DOC-G"), is(true));
await t("view grant does not allow edit", () => canEdit(U.guest, "HQ", null, "Internal", "DOC-G"), is(false));

// Manager grants
const GRANT = `insert into public.os_grants (person_id, resource_type, resource_id, level, reason, granted_by, expires_at) values ($1, 'division', $2, $3, 'Campaign support', 'PPL-9001', $4)`;
await te("manager grant without end date is refused", () => user(U.manager, GRANT, ["PPL-9003", "DIV-03", "view", null]), /need an end date/);
await t("manager grants their division with an end date", () => user(U.manager, GRANT, ["PPL-9003", "DIV-03", "view", new Date(Date.now() + 30 * 864e5).toISOString()]));
await t("granted_by is the caller, not the value sent", () => db.query("select granted_by from public.os_grants where person_id = 'PPL-9003'"), (r) => is("PPL-9002")(r.rows[0].granted_by));
await te("manager cannot grant on another division", () => user(U.manager, GRANT, ["PPL-9003", "DIV-05", "view", new Date(Date.now() + 864e5).toISOString()]), /row-level security/);
await te("member cannot grant access", () => user(U.creative, GRANT, ["PPL-9003", "DIV-03", "edit", new Date(Date.now() + 864e5).toISOString()]), /row-level security/);
await t("division grant opens that division's Confidential", () => canView(U.creative, "IEL", "DIV-03", "Confidential", "D10"), is(true));
await t("division grant never opens Restricted", () => canView(U.creative, "IEL", "DIV-03", "Restricted", "D11"), is(false));
await t("manager sees grants on their division", () => count(U.manager, "os_grants"), is(1));
await t("member sees only grants to them", () => count(U.elco, "os_grants"), is(0));

// Expiry and revocation
// An already-expired grant can't be made through the API (creation time is always now), so the fixture is written as
// the owner with the trigger paused.
await t("fixture: an already-expired grant", () => db.exec(`alter table public.os_grants disable trigger os_grants_before_write;
  insert into public.os_grants (person_id, resource_type, resource_id, level, reason, granted_by, created_at, expires_at) values ('PPL-9004', 'document', 'DOC-OLD', 'view', 'Old', 'PPL-9001', now() - interval '10 days', now() - interval '1 day');
  alter table public.os_grants enable trigger os_grants_before_write;`));
await t("expired grant gives no access", () => canView(U.elco, "IEL", "DIV-05", "Internal", "DOC-OLD"), is(false));
await te("a grant cannot be widened", () => user(U.manager, `update public.os_grants set level = 'edit' where person_id = 'PPL-9003'`), /cannot be changed/);
await t("grantor revokes", () => user(U.manager, `update public.os_grants set revoked_at = now() where person_id = 'PPL-9003'`));
await t("revoke records who revoked", () => db.query("select revoked_by from public.os_grants where person_id = 'PPL-9003'"), (r) => is("PPL-9002")(r.rows[0].revoked_by));
await te("a revoked grant cannot be revoked again", () => user(U.manager, `update public.os_grants set revoked_at = now() where person_id = 'PPL-9003'`), /already revoked/);
await te("grants cannot be deleted", () => user(U.founder, `delete from public.os_grants`), /permission denied/);
await t("revoked grant gives no access", () => canView(U.creative, "IEL", "DIV-03", "Confidential", "D10"), is(false));

// Founder-only management
await t("manager cannot promote themselves", async () => {
  await user(U.manager, `update public.os_people set org_role = 'founder' where id = 'PPL-9002'`);
  return db.query("select org_role from public.os_people where id = 'PPL-9002'");
}, (r) => is("manager")(r.rows[0].org_role));
await t("manager cannot approve folder routes", async () => {
  await user(U.manager, `update public.os_folder_routes set status = 'approved'`);
  return db.query("select count(*)::int c from public.os_folder_routes where status = 'approved'");
}, (r) => is(0)(r.rows[0].c));
await t("founder adds a person", () => user(U.founder, `insert into public.os_people (id, full_name) values ('PPL-9010', 'New Volunteer')`));
await t("new people start as onboarding members", () => db.query("select org_role, status from public.os_people where id = 'PPL-9010'"), (r) => (r.rows[0].org_role === "member" && r.rows[0].status === "onboarding" ? null : JSON.stringify(r.rows[0])));

// Linking a login
await db.exec(`update auth.users set email_confirmed_at = now() where id = '${U.outsider}'`);
const LINK = "select public.os_link_account('PPL-9010', $1)";
await te("manager cannot link accounts", () => user(U.manager, LINK, ["outsider@example.test"]), /Only founders/);
await te("unconfirmed email cannot be linked", () => user(U.founder, LINK, ["guest@example.test"]), /No confirmed/);
await t("founder links a confirmed account (case-insensitive)", () => one(U.founder, LINK, ["  Outsider@Example.test "]), is(U.outsider));
await t("a linked login alone gives no access (no approved Google email, no company)", () => one(U.outsider, "select public.os_current_person()"), is(null));
await t("a new member with no company sees no IELSco Internal", () => canView(U.outsider, "IEL", null, "Internal"), is(false));

// Audit trail
await t("grant inserts are audited", () => count(U.founder, "os_audit_log where action = 'os_grants.insert'"), (n) => (n >= 3 ? null : `got ${n}`));
await t("revoke is audited with the actor", () => count(U.founder, "os_audit_log where action = 'os_grants.update' and actor_person_id = 'PPL-9002'"), is(1));
await t("person insert is audited", () => count(U.founder, "os_audit_log where action = 'os_people.insert' and target_id = 'PPL-9010'"), is(1));
await te("audit log cannot be deleted, even by a founder", () => user(U.founder, "delete from public.os_audit_log"), /permission denied/);
await te("audit log cannot be written directly", () => user(U.founder, "insert into public.os_audit_log (action, target_type) values ('fake', 'x')"), /permission denied/);

// Document numbers
const num = (uid, c, ty, y) => one(uid, "select public.os_next_doc_number($1, $2, $3)", [c, ty, y]);
await t("first IEL LET 2026 is 1", () => num(U.creative, "IEL", "LET", 2026), is(1));
await t("second is 2", () => num(U.creative, "IEL", "LET", 2026), is(2));
await t("Elco has its own sequence", () => num(U.manager, "ELC", "LET", 2026), is(1));
await t("sequence restarts each year", () => num(U.creative, "IEL", "LET", 2027), is(1));
await te("guests cannot reserve numbers", () => num(U.guest, "IEL", "LET", 2026), /Only staff/);
await te("counters are not readable directly", () => count(U.creative, "os_doc_counters"), /permission denied/);

// Security review fixes (6 Nov)
const SOON = new Date(Date.now() + 30 * 864e5).toISOString();
await t("grant creation time is the server's, not the request's", async () => {
  await user(U.manager, `insert into public.os_grants (person_id, resource_type, resource_id, level, reason, created_at, expires_at) values ('PPL-9004', 'division', 'DIV-03', 'view', 'Backdate probe', '2020-01-01', $1)`, [SOON]);
  return db.query("select created_at > now() - interval '1 minute' as fresh from public.os_grants where reason = 'Backdate probe'");
}, (r) => is(true)(r.rows[0].fresh));
await te("manager grant longer than 90 days is refused", () => user(U.manager, GRANT, ["PPL-9004", "DIV-03", "view", new Date(Date.now() + 91 * 864e5).toISOString()]), /at most 90 days/);
await t("founder grant may run longer than 90 days", () => user(U.founder, GRANT, ["PPL-9004", "DIV-04", "view", new Date(Date.now() + 365 * 864e5).toISOString()]));
await t("route approver is the caller, not the value sent", async () => {
  await user(U.founder, `update public.os_folder_routes set status = 'approved', approved_by = 'PPL-9002', approved_at = '2020-01-01' where folder_name = 'DIV-03 Growth'`);
  return db.query("select approved_by, approved_at > now() - interval '1 minute' as fresh from public.os_folder_routes where folder_name = 'DIV-03 Growth'");
}, (r) => (r.rows[0].approved_by === "PPL-9001" && r.rows[0].fresh ? null : JSON.stringify(r.rows[0])));
await t("editing an approved route's note keeps the approval", async () => {
  await user(U.founder, `update public.os_folder_routes set note = 'checked' where folder_name = 'DIV-03 Growth'`);
  return db.query("select approved_by from public.os_folder_routes where folder_name = 'DIV-03 Growth'");
}, (r) => is("PPL-9001")(r.rows[0].approved_by));
await te("member cannot reserve numbers for a company they are not in", () => num(U.creative, "ELC", "FIN", 2026), /company you work in/);
await t("founder reserves numbers for any company", () => num(U.founder, "ELC", "FIN", 2026), is(1));
await t("staff can reserve HQ numbers", () => num(U.creative, "HQ", "MOM", 2026), is(1));
await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000000b1', 'fresh@example.test', null);
  insert into public.os_people (id, user_id, full_name, status) values ('PPL-9011', '00000000-0000-0000-0000-0000000000b1', 'Fresh Volunteer', 'onboarding');`);
const FRESH = "00000000-0000-0000-0000-0000000000b1";
await t("person with no company sees nothing, not even their own row", () => count(FRESH, "os_people"), is(0));
await t("person with no company sees no folder routes", () => count(FRESH, "os_folder_routes"), is(0));
await t("person with no company sees no divisions", () => count(FRESH, "os_divisions"), is(0));
await te("founder cannot set a login directly", () => user(U.founder, `update public.os_people set user_id = '${FRESH}' where id = 'PPL-9010'`), /permission denied/);
await te("founder cannot add a person with a login attached", () => user(U.founder, `insert into public.os_people (id, full_name, user_id) values ('PPL-9012', 'X', '${FRESH}')`), /permission denied/);
await t("founder still edits role and status", () => user(U.founder, `update public.os_people set status = 'active' where id = 'PPL-9011'`));

// ── Sign-in and access (20261107010000_company_os_access.sql) ───────────────────────────────────────────────────────
// Helpers to create a login with a Google identity and a live session.
let n = 0;
async function login(email, { verified = true, provider = "google" } = {}) {
  const id = `00000000-0000-0000-0000-${String(0xc00 + ++n).padStart(12, "0")}`;
  SESS[id] = id.replace(/^00000000/, "5e55a000");
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())`, [id, email]);
  await db.query(`insert into auth.identities (user_id, provider, identity_data) values ($1, $2, $3)`,
    [id, provider, JSON.stringify({ email, email_verified: verified })]);
  await db.query(`insert into auth.sessions (id, user_id) values ($1, $2)`, [SESS[id], id]);
  return id;
}
const access = (uid, extra) => one(uid, "select public.os_access_status()", [], extra);
const claim = (uid) => user(uid, "select public.os_claim_account()");
const reason = async (uid) => (await db.query("select public.os_access_reason($1) r", [uid])).rows[0].r;
const svc = (q, params) => as("service_role", null, q, params);
const statusOf = async (id) => (await db.query("select status, user_id, sessions_revoked_at from public.os_people where id = $1", [id])).rows[0];

await t("approved, linked, active staff have access", () => access(U.creative), is(true));
await t("founder with MFA has founder powers", () => one(U.founder, "select public.os_is_founder()"), is(true));

// Random Google account
const RANDOM = await login("stranger@gmail.com");
await t("random Gmail: claim links nothing", async () => { await claim(RANDOM); return db.query("select count(*)::int c from public.os_people where user_id = $1", [RANDOM]); }, (r) => is(0)(r.rows[0].c));
await t("random Gmail: no access", () => access(RANDOM), is(false));
await t("random Gmail: sees no people", () => count(RANDOM, "os_people"), is(0));
await t("random Gmail: sees no divisions or routes", async () => (await count(RANDOM, "os_divisions")) + (await count(RANDOM, "os_folder_routes")), is(0));
await t("random Gmail: reason is not_allowlisted", () => reason(RANDOM), is("not_allowlisted"));

// Unverified Google email
await db.exec(`insert into public.os_people (id, full_name, status, google_account) values ('PPL-9020', 'Unverified Person', 'active', 'unverified@example.test');
  insert into public.os_person_companies values ('PPL-9020', 'IEL');`);
const UNVER = await login("unverified@example.test", { verified: false });
await t("unverified email: claim does not link", async () => { await claim(UNVER); return statusOf("PPL-9020"); }, (r) => is(null)(r.user_id));
await t("unverified email: no access", () => access(UNVER), is(false));
await t("unverified email: reason", () => reason(UNVER), is("email_unverified"));

// Non-Google login with an approved email (e.g. email + password on the public site)
await db.exec(`insert into public.os_people (id, full_name, status, google_account) values ('PPL-9021', 'Password Person', 'active', 'pw@example.test');
  insert into public.os_person_companies values ('PPL-9021', 'IEL');`);
const PW = await login("pw@example.test", { provider: "email" });
await t("non-Google account: claim does not link", async () => { await claim(PW); return statusOf("PPL-9021"); }, (r) => is(null)(r.user_id));
await t("non-Google account: no access", () => access(PW, { amr: [{ method: "password", timestamp: nowS() - 60 }] }), is(false));
await t("non-Google account: reason", () => reason(PW), is("not_google"));

// Invited (verified but not yet approved), then approved, suspended, reactivated
await t("founder invites by email (stored lower-case)", () => user(U.founder, `insert into public.os_people (id, full_name, status, google_account) values ('PPL-9022', 'Invited Person', 'invited', ' New.Hire@Example.test ')`));
await t("invite records who invited", () => statusOf("PPL-9022").then(() => db.query("select invited_by, google_account from public.os_people where id = 'PPL-9022'")), (r) => (r.rows[0].invited_by === "PPL-9001" && r.rows[0].google_account === "new.hire@example.test" ? null : JSON.stringify(r.rows[0])));
await t("founder adds the company", () => user(U.founder, `insert into public.os_person_companies values ('PPL-9022', 'ELC')`));
const HIRE = await login("new.hire@example.test");
await t("invited: first sign-in links the login", async () => { await claim(HIRE); return statusOf("PPL-9022"); }, (r) => is(HIRE)(r.user_id));
await t("invited but not approved: no access", () => access(HIRE), is(false));
await t("invited but not approved: sees nothing", () => count(HIRE, "os_people"), is(0));
await t("invited: reason", () => reason(HIRE), is("awaiting_approval"));
await t("invited person cannot approve themselves", async () => { await user(HIRE, `update public.os_people set status = 'active' where id = 'PPL-9022'`); return statusOf("PPL-9022"); }, (r) => is("invited")(r.status));
await t("founder approves", () => user(U.founder, `update public.os_people set status = 'active', status_reason = 'Started 7 Nov' where id = 'PPL-9022'`));
await t("approved: access", () => access(HIRE), is(true));
await t("approved Elco member cannot see IELSco Internal", () => canView(HIRE, "IEL", null, "Internal"), is(false));
await t("approved Elco member sees Elco Internal", () => canView(HIRE, "ELC", null, "Internal"), is(true));
await t("founder adds the Elco member to Growth", () => user(U.founder, `insert into public.os_person_divisions values ('PPL-9022', 'DIV-03', false)`));
await t("Elco Growth member cannot see IELSco Growth Confidential", () => canView(HIRE, "IEL", "DIV-03", "Confidential"), is(false));
await t("Elco Growth member sees Elco Growth Confidential", () => canView(HIRE, "ELC", "DIV-03", "Confidential"), is(true));
await t("Elco Growth member cannot edit IELSco Growth records", () => canEdit(HIRE, "IEL", "DIV-03", "Internal"), is(false));
await t("IELSco member cannot see Elco Restricted", () => canView(U.creative, "ELC", "DIV-04", "Restricted"), is(false));
await t("member cannot change their own role", async () => { await user(HIRE, `update public.os_people set org_role = 'founder' where id = 'PPL-9022'`); return db.query("select org_role from public.os_people where id = 'PPL-9022'"); }, (r) => is("member")(r.rows[0].org_role));
await t("member cannot add themselves to a company", async () => { try { await user(HIRE, `insert into public.os_person_companies values ('PPL-9022', 'IEL')`); } catch { /* refused */ } return db.query("select count(*)::int c from public.os_person_companies where person_id = 'PPL-9022'"); }, (r) => is(1)(r.rows[0].c));
await te("member cannot set their own sessions_revoked_at", () => user(HIRE, `update public.os_people set sessions_revoked_at = null where id = 'PPL-9022'`), /permission denied/);
await t("founder suspends", () => user(U.founder, `update public.os_people set status = 'suspended', status_reason = 'Probe' where id = 'PPL-9022'`));
await t("suspension ends sessions at once", () => statusOf("PPL-9022"), (r) => (r.status === "suspended" && r.sessions_revoked_at ? null : JSON.stringify(r)));
await t("suspended: no access", () => access(HIRE), is(false));
await t("suspended: reason", () => reason(HIRE), is("suspended"));
await t("suspension is audited with the actor", () => db.query("select count(*)::int c from public.os_audit_log where action = 'os_people.update' and target_id = 'PPL-9022' and actor_person_id = 'PPL-9001' and detail -> 'new' ->> 'status' = 'suspended'"), (r) => is(1)(r.rows[0].c));
await t("founder reactivates", () => user(U.founder, `update public.os_people set status = 'active' where id = 'PPL-9022'`));
await t("reactivated: the session from before the suspension still fails", () => access(HIRE), is(false));
await t("reactivated: a new sign-in works", () => access(HIRE, { amr: [{ method: "oauth", timestamp: nowS() + 2 }] }), is(true));
await t("founder revokes access", () => user(U.founder, `update public.os_people set status = 'revoked' where id = 'PPL-9022'`));
await t("revoked: even a new sign-in fails", () => access(HIRE, { amr: [{ method: "oauth", timestamp: nowS() + 5 }] }), is(false));

// Sessions
const fresh = { amr: [{ method: "oauth", timestamp: nowS() - 30 }] };
await t("password session of an approved Google user fails", () => access(U.creative, { amr: [{ method: "password", timestamp: nowS() - 60 }] }), is(false));
await t("session older than 12 hours fails", () => access(U.creative, { amr: [{ method: "oauth", timestamp: nowS() - 13 * 3600 }] }), is(false));
await t("token without a session id fails", () => access(U.creative, { session_id: null }), is(false));
await t("token for a session that no longer exists (signed out) fails", () => access(U.creative, { session_id: "5e55a000-0000-0000-0000-00000000dead" }), is(false));
const OTHER_SESS = "5e55a000-0000-0000-0000-0000000a2222";
await db.query("insert into auth.sessions (id, user_id) values ($1, $2)", [OTHER_SESS, U.creative]);
await t("server records a login (service role)", () => svc(`select public.os_record_login($1, $2, true, 'ok', 'google', '203.0.113.9', 'Mozilla/5.0', 'Chrome', '130', 'Windows', 'desktop', 'p1', 'ID', 'JK', 'Jakarta')`, [U.creative, SESS[U.creative]]), (r) => is(true)(r.rows[0].os_record_login));
await t("second login on the same device profile is not new", () => svc(`select public.os_record_login($1, $2, true, 'ok', 'google', '203.0.113.9', 'Mozilla/5.0', 'Chrome', '130', 'Windows', 'desktop', 'p1', 'ID', 'JK', 'Jakarta')`, [U.creative, OTHER_SESS]), (r) => is(false)(r.rows[0].os_record_login));
await t("server records a refused login", () => svc(`select public.os_record_login($1, null, false, 'not_allowlisted', 'google', '198.51.100.7', 'curl', null, null, null, 'unknown', null, null, null, null)`, [RANDOM]));
await te("browser cannot write login history", () => user(U.creative, `select public.os_record_login($1, $2, true, 'ok', 'google', '1.1.1.1', 'x', 'x', 'x', 'x', 'desktop', 'p9', null, null, null)`, [U.creative, SESS[U.creative]]), /permission denied/);
await te("browser cannot ask why a login was refused", () => user(U.creative, "select public.os_access_reason($1)", [RANDOM]), /permission denied/);
await te("login history table is not readable directly", () => count(U.founder, "os_login_events"), /permission denied/);
await te("anon cannot read login history", () => as("anon", null, "select * from public.os_login_history(10)"), /permission denied/);
await t("member sees only their own login history", () => user(U.creative, "select distinct user_id from public.os_login_history(100)"), (r) => (r.rows.length === 1 && r.rows[0].user_id === U.creative ? null : JSON.stringify(r.rows)));
await t("another member sees none of it", () => user(U.elco, "select count(*)::int c from public.os_login_history(100)"), (r) => is(0)(r.rows[0].c));
await t("founder sees every login, including refused ones", () => user(U.founder, "select count(*)::int c, count(*) filter (where not success)::int f from public.os_login_history(100)"), (r) => (r.rows[0].c === 3 && r.rows[0].f === 1 ? null : JSON.stringify(r.rows[0])));
await t("refused or unknown accounts see no history", () => user(RANDOM, "select count(*)::int c from public.os_login_history(100)"), (r) => is(0)(r.rows[0].c));
await te("member cannot revoke someone else's session", () => user(U.elco, "select public.os_revoke_session($1, 'probe')", [OTHER_SESS]), /Not allowed/);
await t("member revokes their own other session", () => user(U.creative, "select public.os_revoke_session($1, 'Left laptop signed in')", [OTHER_SESS]));
await t("revoked session: denied", () => access(U.creative, { session_id: OTHER_SESS }), is(false));
await t("current session unaffected", () => access(U.creative), is(true));
await t("history shows the revoked session as inactive with its reason", () => user(U.founder, "select active, revoked_reason from public.os_login_history(100) where session_id = $1", [OTHER_SESS]), (r) => (r.rows[0].active === false && r.rows[0].revoked_reason === "Left laptop signed in" ? null : JSON.stringify(r.rows[0])));
await te("member cannot end another person's sessions", () => user(U.elco, "select public.os_revoke_all_sessions('PPL-9003', 'probe')"), /Not allowed/);
await t("founder ends all of a person's sessions", () => user(U.founder, "select public.os_revoke_all_sessions('PPL-9004', 'Lost phone')"));
await t("ended sessions: denied", () => access(U.elco), is(false));
await t("signing in again works", () => access(U.elco, { amr: [{ method: "oauth", timestamp: nowS() + 2 }] }), is(true));
await t("ending sessions is audited", () => db.query("select count(*)::int c from public.os_audit_log where action in ('session.revoke', 'session.revoke_all')"), (r) => is(2)(r.rows[0].c));

// MFA
await t("founder without MFA in this session has no founder powers", () => one(U.founder, "select public.os_is_founder()", [], { aal: "aal1" }), is(false));
await t("…and is told to set up two-step verification", () => one(U.founder, "select public.os_is_founder_needing_mfa()", [], { aal: "aal1" }), is(true));
await t("…cannot change people", async () => { await user(U.founder, `update public.os_people set short_name = 'x' where id = 'PPL-9003'`, [], { aal: "aal1" }); return db.query("select short_name from public.os_people where id = 'PPL-9003'"); }, (r) => is(null)(r.rows[0].short_name));
await t("…cannot see other people's login history", () => user(U.founder, "select count(*)::int c from public.os_login_history(100) where user_id <> $1", [U.founder], { aal: "aal1" }), (r) => is(0)(r.rows[0].c));
await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [U.manager]);
await t("member with a verified factor: aal1 session denied", () => access(U.manager), is(false));
await t("member with a verified factor: aal2 session allowed", () => access(U.manager, { aal: "aal2" }), is(true));

// Registry changes
await t("changing someone's Google account drops their login link", async () => { await user(U.founder, `update public.os_people set google_account = 'other@example.test' where id = 'PPL-9003'`); return statusOf("PPL-9003"); }, (r) => is(null)(r.user_id));
await t("…and their access", () => access(U.creative), is(false));
await te("the last active founder cannot be suspended", () => user(U.founder, `update public.os_people set status = 'suspended' where id = 'PPL-9001'`), /at least one active founder/);
await te("the last active founder cannot be demoted", () => user(U.founder, `update public.os_people set org_role = 'member' where id = 'PPL-9001'`), /at least one active founder/);
await t("a claim never steals an entry linked to another login", async () => {
  const twin = await login("manager@example.test");
  await claim(twin);
  return db.query("select user_id from public.os_people where id = 'PPL-9002'");
}, (r) => is(U.manager)(r.rows[0].user_id));
await te("anon cannot claim", () => as("anon", null, "select public.os_claim_account()"), /permission denied/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
