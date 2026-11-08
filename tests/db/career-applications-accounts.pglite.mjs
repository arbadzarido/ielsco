// Careers 2027 with accounts (20261111000000, on top of 20261101000000) on PGlite with Supabase-like roles and a storage
// stub. Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install (e.g.
// workspace/local-stack/tests/) and run:  node career-applications-accounts.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const [dir] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", A = "22222222-2222-2222-2222-222222222222",
  B = "33333333-3333-3333-3333-333333333333", OLD = "44444444-4444-4444-4444-444444444444", UNCONF = "55555555-5555-5555-5555-555555555555";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create table public.staff_roles (user_id uuid primary key, role text);
  create function public.is_site_admin() returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin') $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated; grant execute on all functions in schema storage to anon, authenticated;
  insert into auth.users values ('${ADMIN}', 'admin@example.test', now()), ('${A}', 'Alya@Example.test', now()), ('${B}', 'budi@example.test', now()),
    ('${OLD}', 'old@example.test', now()), ('${UNCONF}', 'old2@example.test', null);
  insert into public.staff_roles values ('${ADMIN}', 'admin');`);

const base = readFileSync(join(dir, "20261101000000_career_applications.sql"), "utf8");
const mig = readFileSync(join(dir, "20261111000000_career_applications_accounts.sql"), "utf8");
await db.exec(base);
// Open the window for the suite (the real one is 9–29 Nov 2026 WIB).
await db.exec(`create or replace function public.career_applications_open() returns boolean language sql stable set search_path = '' as $$ select true $$`);

// An application sent anonymously before this migration (old form), for OLD's email and for the unconfirmed account.
const oldId = crypto.randomUUID(), old2Id = crypto.randomUUID();
for (const [id, email] of [[oldId, "old@example.test"], [old2Id, "old2@example.test"]]) {
  const cv = `incoming/${id}/cv-abcdef1234.pdf`;
  await db.query(`insert into storage.objects (bucket_id, name) values ('career-applications', $1)`, [cv]);
  await db.exec("begin"); await db.exec("set local role anon");
  await db.query(`select public.submit_career_application($1,'Old Applicant',$2,'08123456789','Universitas Airlangga',2,'growth','G1','@old.app','linkedin.com/in/old-app',$3,null,'https://example.org/pf','x')`, [id, email, cv]);
  await db.exec("commit");
}

await db.exec(mig);
await db.exec(mig);
ok("migration applies twice on top of 20261101000000");
await db.exec(`create or replace function public.career_applications_open() returns boolean language sql stable set search_path = '' as $$ select true $$`);

async function as(role, uid, q, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 60)})`) : bad(n, e.message); } };
const upload = async (uid, kind, owner = uid) => {
  const name = `applicants/${owner}/${kind}-${crypto.randomBytes(8).toString("hex")}.pdf`;
  await as("authenticated", uid, `insert into storage.objects (bucket_id, name) values ('career-applications', $1)`, [name]);
  return name;
};
const SUBMIT = `select public.submit_my_career_application($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) id`;
const args = (cv, o = {}) => {
  const v = { name: "Alya Putri", wa: "0812 3456 7890", uni: "Universitas Brawijaya", year: 2, batch: 2024, r1: "G4", r2: null, ig: "https://www.instagram.com/alya.putri/?hl=en",
    li: "https://id.linkedin.com/in/alya-putri", cv, pfPath: null, pfUrl: "https://behance.net/alya", motivation: "I want to build campaigns that help students go abroad.",
    tasks: true, privacy: true, decl: true, ...o };
  return [v.name, v.wa, v.uni, v.year, v.batch, v.r1, v.r2, v.ig, v.li, v.cv, v.pfPath, v.pfUrl, v.motivation, v.tasks, v.privacy, v.decl];
};

// ── Anonymous access is gone ──
await te("anon cannot call the old anonymous submit", () => as("anon", null, `select public.submit_career_application(gen_random_uuid(),'x','x@example.test','0812345678','Uni',1,'growth','G1','@x','linkedin.com/in/xx','incoming/x/cv-abcdefgh.pdf',null,'https://x.org/p','')`), /permission denied/);
await te("anon cannot upload to the old incoming folder", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('career-applications', 'incoming/${crypto.randomUUID()}/cv-abcdef1234.pdf')`), /row-level security/);
await te("anon cannot submit with the new function", () => as("anon", null, SUBMIT, args("applicants/x/cv-abcdefgh.pdf")), /permission denied/);
await te("anon cannot read drafts", () => as("anon", null, "select * from public.career_application_drafts"), /permission denied/);

// ── Storage: own folder only ──
const cvA = await upload(A, "cv");
ok("applicant uploads a CV to their own folder");
await te("applicant cannot upload into someone else's folder", () => upload(A, "cv", B), /row-level security/);
await te("only cv-/portfolio- PDFs", () => as("authenticated", A, `insert into storage.objects (bucket_id, name) values ('career-applications', 'applicants/${A}/photo-abcdef1234.jpg')`), /row-level security/);
await t("applicant reads back only their own files", () => as("authenticated", A, "select name from storage.objects"), (r) => r.rows.every((x) => x.name.startsWith(`applicants/${A}/`)) && r.rows.length === 1 ? null : JSON.stringify(r.rows));

// ── Drafts ──
await t("applicant saves a draft", () => as("authenticated", A, `insert into public.career_application_drafts (user_id, step, data) values ($1, 2, '{"full_name":"Alya"}')`, [A]));
await t("applicant updates the draft", () => as("authenticated", A, `update public.career_application_drafts set step = 3, data = '{"full_name":"Alya P"}' where user_id = $1`, [A]));
await te("cannot write a draft for someone else", () => as("authenticated", A, `insert into public.career_application_drafts (user_id, data) values ($1, '{}')`, [B]), /row-level security/);
await t("cannot see someone else's draft", () => as("authenticated", B, "select * from public.career_application_drafts"), (r) => (r.rows.length === 0 ? null : "leak"));

// ── Validation ──
const v = async (n, o, re) => te(n, () => as("authenticated", A, SUBMIT, args(cvA, o)), re);
await v("role required", { r1: null }, /invalid: role/);
await v("unknown role", { r1: "Z9" }, /invalid: role/);
await v("second role cannot duplicate the first", { r2: "G4" }, /invalid: role_2/);
await v("academic year 1–3", { year: 4 }, /invalid: academic_year/);
await v("batch year range", { batch: 1999 }, /invalid: batch_year/);
await v("instagram post links refused", { ig: "https://www.instagram.com/p/abc" }, /invalid: instagram/);
await v("linkedin profile only", { li: "https://linkedin.com/company/x" }, /invalid: linkedin_url/);
await v("motivation required", { motivation: "short" }, /invalid: motivation/);
await v("portfolio file or link", { pfUrl: null }, /invalid: portfolio/);
await v("campaign tasks confirmation", { tasks: false }, /invalid: tasks/);
await v("privacy notice", { privacy: false }, /invalid: privacy/);
await v("declaration", { decl: false }, /invalid: declaration/);
await te("CV must be in the applicant's own folder", () => as("authenticated", B, SUBMIT, args(cvA)), /invalid: cv/);
await v("CV must exist", { cv: `applicants/${A}/cv-doesnotexist1.pdf` }, /cv_missing/);
await te("cannot point at an old anonymous file", () => as("authenticated", A, SUBMIT, args(`incoming/${oldId}/cv-abcdef1234.pdf`)), /invalid: cv/);

// ── One role ──
let idA;
await t("signed-in applicant submits with one role", () => as("authenticated", A, SUBMIT, args(cvA)), (r) => { idA = r.rows[0].id; return idA ? null : "no id"; });
await t("stored with account email, division, timestamps and statuses", () => db.query("select * from public.career_applications where id = $1", [idA]), (r) => {
  const a = r.rows[0];
  if (!a) return "missing";
  if (a.user_id !== A || a.email !== "alya@example.test") return `owner/email ${a.user_id} ${a.email}`;
  if (a.division !== "growth" || a.role_id !== "G4" || a.role_2_id !== null) return "roles";
  if (a.whatsapp !== "+6281234567890" || a.instagram_url !== "https://www.instagram.com/alya.putri/" || a.linkedin_url !== "https://www.linkedin.com/in/alya-putri/") return "normalisation";
  if (a.status !== "submitted" || a.campaign_verification !== "pending") return "statuses";
  if (!a.tasks_confirmed_at || !a.privacy_accepted_at || !a.declaration_accepted_at || !a.submitted_at) return "timestamps";
  if (a.batch_year !== 2024) return "batch";
  return null;
});
await t("draft is cleared on submit", () => db.query("select * from public.career_application_drafts where user_id = $1", [A]), (r) => (r.rows.length ? "draft left" : null));
await t("applicant sees their application without admin notes", () => as("authenticated", A, "select public.my_career_application() a"), (r) => {
  const a = r.rows[0].a; return a?.id === idA && a.editable === true && !("admin_notes" in a) ? null : JSON.stringify(a);
});
await t("applicant cannot read the table directly", () => as("authenticated", A, "select * from public.career_applications"), (r) => (r.rows.length === 0 ? null : "rows visible"));

// ── Update (continuation) instead of a duplicate; switch to two roles ──
await t("submitting again updates the same application with two roles", () => as("authenticated", A, SUBMIT, args(cvA, { r1: "K1", r2: "G4" })), (r) => (r.rows[0].id === idA ? null : "new id"));
await t("still one row; first role sets the division", () => db.query("select count(*)::int n, max(division) d, max(role_2_id) r2 from public.career_applications where user_id = $1", [A]), (r) => (r.rows[0].n === 1 && r.rows[0].d === "creative" && r.rows[0].r2 === "G4" ? null : JSON.stringify(r.rows[0])));

// ── Admin ──
await t("admin records per-task verification and status", () => as("authenticated", ADMIN, `update public.career_applications set campaign_tasks = '{"follow_ielsco":"verified","repost":"not_found"}', campaign_verification = 'incomplete', status = 'under_review', admin_notes = 'n' where id = $1 returning id`, [idA]), (r) => (r.rows.length === 1 ? null : "not updated"));
await t("applicant cannot change their status", () => as("authenticated", A, `update public.career_applications set status = 'accepted' where id = $1 returning id`, [idA]).catch(() => ({ rows: [] })), (r) => (r.rows.length === 0 ? null : "updated"));
await t("applicant sees per-task verification, not notes", () => as("authenticated", A, "select public.my_career_application() a"), (r) => {
  const a = r.rows[0].a; return a.campaign_tasks.follow_ielsco === "verified" && a.status === "under_review" && a.editable === false && !a.admin_notes ? null : JSON.stringify(a);
});
await te("once under review the application is locked", () => as("authenticated", A, SUBMIT, args(cvA)), /locked/);
await t("admin can open the applicant's file", () => as("authenticated", ADMIN, "select name from storage.objects where name = $1", [cvA]), (r) => (r.rows.length === 1 ? null : "not visible"));

// ── Second account: two roles from the start, duplicate checks ──
const cvB = await upload(B, "cv"), pfB = await upload(B, "portfolio");
let idB;
await t("second applicant submits two roles with a portfolio PDF", () => as("authenticated", B, SUBMIT, args(cvB, { name: "Budi Santoso", r1: "O1", r2: "R3", pfPath: pfB, pfUrl: null })), (r) => { idB = r.rows[0].id; return idB && idB !== idA ? null : "id"; });

// ── Claiming an anonymous application with the same confirmed email ──
await t("old anonymous application is attached to the confirmed account", () => as("authenticated", OLD, "select public.my_career_application() a"), (r) => (r.rows[0].a?.id === oldId ? null : JSON.stringify(r.rows[0].a)));
const cvOld = await upload(OLD, "cv");
await t("…and can be updated (no duplicate), keeping or replacing the CV", () => as("authenticated", OLD, SUBMIT, args(`incoming/${oldId}/cv-abcdef1234.pdf`, { name: "Old Applicant", r1: "G1" })), (r) => (r.rows[0].id === oldId ? null : "new row"));
await t("…replacing the CV with a new upload", () => as("authenticated", OLD, SUBMIT, args(cvOld, { name: "Old Applicant", r1: "G1" })), (r) => (r.rows[0].id === oldId ? null : "new row"));
await t("unconfirmed email does not claim", () => as("authenticated", UNCONF, "select public.my_career_application() a"), (r) => (r.rows[0].a === null ? null : "claimed"));
const cvU = await upload(UNCONF, "cv");
await te("unconfirmed account with an existing application email gets already_applied", () => as("authenticated", UNCONF, SUBMIT, args(cvU)), /already_applied/);

// ── Window ──
await db.exec(`create or replace function public.career_applications_open() returns boolean language sql stable set search_path = '' as $$ select false $$`);
await te("upload refused when closed", () => upload(B, "cv"), /row-level security/);
await te("submit refused when closed", () => as("authenticated", B, SUBMIT, args(cvB, { pfPath: pfB, pfUrl: null })), /applications_closed/);
await t("closed: not editable", () => as("authenticated", B, "select public.my_career_application() a"), (r) => (r.rows[0].a.editable === false ? null : "editable"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
