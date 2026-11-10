// Company OS template-first documents (20261118000000): the template registry, who may generate from a template, named-readers
// documents, the draft guard and template version history. On PGlite over every earlier migration.
//   node company-os-document-templates.pglite.mjs <repo>/supabase/migrations
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

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql", "20261115000000_company_os_finance_legal.sql", "20261116000000_company_os_division_foundation.sql", "20261117000000_company_os_subdivisions_metrics.sql", "20261118000000_company_os_document_templates.sql"]) {
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


const F = U.founder, GM = U.manager, GR = U.growth, CR = U.creative, ELCM = U.elco, GUEST = U.guest, OPS = U.ops;
const count = (uid, q, p) => one(uid, `select count(*)::int from (${q}) x`, p);
const none = async (uid, q, p) => { const r = await user(uid, q, p); if (!r.rows.length) throw new Error("no rows changed"); };
const T = "manager-offering-letter";
const docBase = (extra = "") => `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, template_id${extra ? ", " + extra.split("|")[0] : ""})`;
const mkDoc = (uid, owner, subject, { company = "IEL", division = "DIV-05", type = "CTR", sens = "Confidential", status = "Draft" } = {}) =>
  one(uid, `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, template_id, subject_person_id)
            values ('Sample agreement', $1, $2, $3, $4, $5, $6, '${T}', $7) returning id`, [company, division, type, sens, owner, status, subject]);

// ── The registry and its seed
await t("the manager letter is registered as a draft pending legal review", async () => (await user(F, `select legal_status, eligibility, access_mode, sensitivity, storage_division_id, kind, active, company_codes::text cc from public.os_doc_templates where id = '${T}'`)).rows[0],
  (r) => (r.legal_status === "draft_pending_legal" && r.eligibility === "authorized" && r.access_mode === "named" && r.sensitivity === "Confidential" && r.storage_division_id === "DIV-05" && r.kind === "builtin" && r.active && r.cc === "{IEL,ELC}" ? null : JSON.stringify(r)));
await t("its version history starts at 1", async () => count(F, `select 1 from public.os_doc_template_versions where template_id = '${T}' and version = 1`), is(1));
await t("two People routes are proposed, none approved", async () => (await user(F, `select count(*) filter (where status = 'proposed')::int p, count(*) filter (where status = 'approved')::int a from public.os_folder_routes where division_id = 'DIV-05' and sensitivity = 'Confidential'`)).rows[0],
  (r) => (r.p === 2 && r.a === 0 ? null : JSON.stringify(r)));
await t("the proposed routes reuse the existing Personnel Records folders", async () => (await user(F, `select string_agg(folder_name, '|' order by company_code) n from public.os_folder_routes where division_id = 'DIV-05' and sensitivity = 'Confidential'`)).rows[0].n,
  (n) => (/^26 Elco — Personnel Records \(Restricted\)\|16 IELSco — Personnel Records \(Restricted\)$/.test(n) ? null : n));

// ── Who sees and changes templates
await t("a founder reads the template", async () => count(F, `select 1 from public.os_doc_templates`), is(1));
await t("an ordinary member doesn't see a template they aren't authorised for", async () => count(GR, `select 1 from public.os_doc_templates`), is(0));
await t("…and can't generate from it", async () => one(GR, `select public.os_template_can_generate('${T}')`), is(false));
await te("a manager can't edit a template", () => none(GM, `update public.os_doc_templates set active = false where id = '${T}' returning id`), /no rows changed|permission/);
await te("a member can't register a template", () => user(GR, `insert into public.os_doc_templates (id, name, category, doc_type, company_codes, kind, builtin_key) values ('x-test-tpl', 'X', 'People', 'CTR', array['IEL'], 'builtin', 'manager_agreement')`), /row-level security|permission denied/);
await te("a member can't authorise themselves", () => user(GR, `insert into public.os_doc_template_authorized (template_id, person_id) values ('${T}', 'PPL-9015')`), /row-level security/);
await te("a guest can't be authorised", () => user(F, `insert into public.os_doc_template_authorized (template_id, person_id) values ('${T}', 'PPL-9005')`), /Only active staff/);
await t("a founder authorises a People person", async () => { await user(F, `insert into public.os_doc_template_authorized (template_id, person_id) values ('${T}', 'PPL-9003')`); return one(CR, `select public.os_template_can_generate('${T}')`); }, is(true));
await t("an authorised person sees the template and only their own authorisation", async () => [await count(CR, `select 1 from public.os_doc_templates`), await count(CR, `select 1 from public.os_doc_template_authorized`)].join(","), is("1,1"));
await t("…but not its version history", async () => count(CR, `select 1 from public.os_doc_template_versions`), is(0));
await te("named readers can't be combined with 'any staff'", () => user(F, `update public.os_doc_templates set eligibility = 'staff' where id = '${T}'`), /violates check constraint/);
await te("a Restricted template can't be open to any staff", () => user(F, `insert into public.os_doc_templates (id, name, category, doc_type, sensitivity, company_codes, kind, builtin_key, eligibility) values ('restricted-any', 'R', 'People', 'CTR', 'Restricted', array['IEL'], 'builtin', 'manager_agreement', 'staff')`), /violates check constraint/);
await te("a Drive-copy template needs a Drive file", () => user(F, `insert into public.os_doc_templates (id, name, category, doc_type, company_codes, kind) values ('no-file', 'N', 'Ops', 'SOP', array['IEL'], 'drive_copy')`), /violates check constraint/);
await t("a founder registers an ordinary Drive-copy template open to staff", async () => one(F, `insert into public.os_doc_templates (id, name, category, doc_type, company_codes, kind, drive_template_file_id) values ('meeting-minutes', 'Meeting minutes', 'Operations', 'MOM', array['IEL','ELC'], 'drive_copy', '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789') returning id`), is("meeting-minutes"));
await t("any staff member sees and may generate it", async () => [await one(GR, `select public.os_template_can_generate('meeting-minutes')`), await one(GUEST, `select public.os_template_can_generate('meeting-minutes')`)].join(","), is("true,false"));
await t("an inactive template is hidden from staff and can't be generated", async () => {
  await user(F, `update public.os_doc_templates set active = false where id = 'meeting-minutes'`);
  const r = [await count(GR, `select 1 from public.os_doc_templates where id = 'meeting-minutes'`), await one(GR, `select public.os_template_can_generate('meeting-minutes')`), await count(F, `select 1 from public.os_doc_templates where id = 'meeting-minutes'`)].join(",");
  await user(F, `update public.os_doc_templates set active = true where id = 'meeting-minutes'`);
  return r;
}, is("0,false,1"));
await t("each change adds a version and keeps the old snapshot", async () => (await user(F, `select (select version from public.os_doc_templates where id = 'meeting-minutes')::int v, (select count(*) from public.os_doc_template_versions where template_id = 'meeting-minutes')::int n, (select (snapshot->>'active')::boolean from public.os_doc_template_versions where template_id = 'meeting-minutes' and version = 2) a2`)).rows[0],
  (r) => (r.v === 3 && r.n === 3 && r.a2 === false ? null : JSON.stringify(r)));

// ── Making a document from a template
await t("an authorised person generates a draft; the template decides readers and draft status", async () => (await user(CR, `select 1`)) && one(CR, `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, template_id, subject_person_id)
  values ('Sample agreement', 'IEL', 'DIV-05', 'CTR', 'Confidential', 'PPL-9003', 'Draft', '${T}', 'PPL-9002') returning id`), (id) => (/^DOC-/.test(id) ? null : String(id)));
const d1 = await one(F, `select id from public.os_documents where template_id = '${T}' order by created_at desc limit 1`);
await t("…stamped named, version 1, internal draft", async () => (await user(F, `select access_mode, template_version, generation_status from public.os_documents where id = $1`, [d1])).rows[0],
  (r) => (r.access_mode === "named" && r.template_version === 1 && r.generation_status === "internal_draft" ? null : JSON.stringify(r)));
await te("a member who isn't authorised can't generate one", () => mkDoc(GR, "PPL-9015", null), /can't generate|row-level security/);
await te("a manager in another division can't either", () => mkDoc(GM, "PPL-9002", null), /can't generate|row-level security/);
await te("someone can't generate on another person's behalf", () => mkDoc(CR, "PPL-9002", null), /row-level security/);
await te("the type can't differ from the template's", () => mkDoc(CR, "PPL-9003", null, { type: "SOP" }), /decides the document type/);
await te("the sensitivity can't differ from the template's", () => mkDoc(CR, "PPL-9003", null, { sens: "Internal" }), /decides the document type/);
await te("the company must be one the template supports", () => mkDoc(CR, "PPL-9003", null, { company: "HQ" }), /isn't available for that company|row-level security/);
await te("the division is fixed by the template", () => mkDoc(CR, "PPL-9003", null, { division: "DIV-03" }), /one division/);
await te("a template document can't be inserted already approved", () => mkDoc(CR, "PPL-9003", null, { status: "Approved" }), /row-level security|Only a founder or the division manager/);
await te("a template document can't skip the registry", () => user(CR, `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, template_id) values ('Fake', 'IEL', 'DIV-05', 'CTR', 'Confidential', 'PPL-9003', 'Draft', 'no-such-template')`), /Unknown template|foreign key|row-level security/);
await te("access_mode can't be set by hand", () => user(CR, `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status, access_mode) values ('Forged', 'IEL', 'DIV-05', 'CTR', 'Confidential', 'PPL-9003', 'Draft', 'standard')`), /permission denied/);

// ── Reading a named document
await db.exec(`insert into public.os_person_divisions values ('PPL-9015','DIV-05',false)`);   // a People-division member who is NOT authorised
await t("a founder reads it", async () => count(F, `select 1 from public.os_documents where id = $1`, [d1]), is(1));
await t("the authorised person who made it reads it", async () => count(CR, `select 1 from public.os_documents where id = $1`, [d1]), is(1));
await t("a People-division member who isn't authorised can't", async () => count(GR, `select 1 from public.os_documents where id = $1`, [d1]), is(0));
await t("…and can't read it by id, search, or guess", async () => count(GR, `select 1 from public.os_documents where title ilike '%agreement%'`), is(0));
await t("another manager can't read it", async () => count(GM, `select 1 from public.os_documents where id = $1 and false or id = $1`, [d1]), is(0));
await t("an Elco member can't read it", async () => count(ELCM, `select 1 from public.os_documents where id = $1`, [d1]), is(0));
await t("the manager it is about can't read a draft", async () => count(GM, `select 1 from public.os_documents where id = $1`, [d1]), is(0));
await te("a non-reader can't change it", () => none(GR, `update public.os_documents set title = 'Hijacked' where id = $1 returning id`, [d1]), /no rows changed/);
await te("a draft pending legal review can't be approved", () => user(F, `update public.os_documents set status = 'Approved' where id = $1`, [d1]), /pending legal review/);
await t("an explicit grant lets a named person read it", async () => {
  await user(F, `insert into public.os_grants (person_id, resource_type, resource_id, level, reason, expires_at) values ('PPL-9004', 'document', $1, 'view', 'Reviewing the draft', now() + interval '7 days')`, [d1]);
  return count(ELCM, `select 1 from public.os_documents where id = $1`, [d1]);
}, is(1));
await t("revoking the authorisation removes the creator's access", async () => {
  await user(F, `delete from public.os_doc_template_authorized where template_id = '${T}' and person_id = 'PPL-9003'`);
  const r = await count(CR, `select 1 from public.os_documents where id = $1`, [d1]);
  await user(F, `insert into public.os_doc_template_authorized (template_id, person_id) values ('${T}', 'PPL-9003')`);
  return r;
}, is(0));

// ── Legal approval
await t("legal approval is stamped with the founder and the revision", async () => {
  await user(F, `update public.os_doc_templates set legal_status = 'legally_approved' where id = '${T}'`);
  return (await user(F, `select legal_approved_by, legal_approved_revision, content_revision, version from public.os_doc_templates where id = '${T}'`)).rows[0];
}, (r) => (r.legal_approved_by === "PPL-9001" && r.legal_approved_revision === 1 && r.content_revision === 1 && r.version > 1 ? null : JSON.stringify(r)));
const d2 = await mkDoc(CR, "PPL-9003", "PPL-9002");
await t("a document made after approval is execution-ready", async () => one(F, `select generation_status from public.os_documents where id = $1`, [d2]), is("execution_ready"));
await t("the earlier draft stays a draft", async () => one(F, `select generation_status from public.os_documents where id = $1`, [d1]), is("internal_draft"));
await t("the manager it is about can't read it until a founder approves it", async () => count(GM, `select 1 from public.os_documents where id = $1`, [d2]), is(0));
await t("a founder approves an execution-ready document", async () => { await user(F, `update public.os_documents set status = 'Approved' where id = $1`, [d2]); return one(F, `select status from public.os_documents where id = $1`, [d2]); }, is("Approved"));
await t("then the manager it is about reads their own agreement", async () => count(GM, `select 1 from public.os_documents where id = $1`, [d2]), is(1));
await t("…and still no other manager does", async () => [await count(OPS, `select 1 from public.os_documents where id = $1`, [d2]), await count(GR, `select 1 from public.os_documents where id = $1`, [d2]), await count(ELCM, `select 1 from public.os_documents where id = $1`, [d2])].join(","), is("0,0,0"));
await t("withdrawing legal approval goes back to draft", async () => { await user(F, `update public.os_doc_templates set legal_status = 'draft_pending_legal' where id = '${T}'`); return (await user(F, `select legal_status, legal_approved_by, legal_approved_revision from public.os_doc_templates where id = '${T}'`)).rows[0]; },
  (r) => (r.legal_status === "draft_pending_legal" && r.legal_approved_by === null && r.legal_approved_revision === null ? null : JSON.stringify(r)));

// ── Ordinary documents are unchanged
await t("a staff member still registers an ordinary document and reads it", async () => {
  const id = await one(GM, `insert into public.os_documents (title, company_code, division_id, doc_type, sensitivity, owner_person_id, status) values ('Plain SOP', 'IEL', 'DIV-03', 'SOP', 'Internal', 'PPL-9002', 'Draft') returning id`);
  return (await user(GM, `select access_mode, template_id, generation_status from public.os_documents where id = $1`, [id])).rows[0];
}, (r) => (r.access_mode === "standard" && r.template_id === null && r.generation_status === null ? null : JSON.stringify(r)));
await t("a division member still sees ordinary Internal documents", async () => count(GR, `select 1 from public.os_documents where title = 'Plain SOP'`), is(1));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
