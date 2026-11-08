// Company OS → Recruitment (20261112010000) with the careers migrations, on PGlite with the OS test fixtures.
// Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install and run:
//   node os-recruitment.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  applicant: "00000000-0000-0000-0000-0000000000b1", // public applicant (no OS record)
  applicant2: "00000000-0000-0000-0000-0000000000b2",
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
  create table public.staff_roles (user_id uuid primary key, role text);
  create function public.is_site_admin() returns boolean language sql stable security definer set search_path = '' as $$
    select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin') $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated; grant execute on all functions in schema storage to anon, authenticated;
  insert into auth.identities (user_id, provider, identity_data) values ${Object.entries(U).map(([k, id]) => `('${id}', 'google', '{"email": "${k}@example.test", "email_verified": true}')`).join(", ")};`);
// Every user starts with one live Google session.
const SESS = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^00000000/, "5e55a000")]));
await db.exec(`insert into auth.sessions (id, user_id) values ${Object.values(U).map((id) => `('${SESS[id]}', '${id}')`).join(", ")}`);

await db.exec(`update auth.users set email_confirmed_at = now()`);
for (const f of ["20261101000000_career_applications.sql", "20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql",
  "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261111000000_career_applications_accounts.sql", "20261112000000_career_applications_domicile.sql", "20261112010000_os_recruitment.sql"]) {
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

// ── Applications from the public side (the applicant's own session), window forced open ──
await db.exec(`create or replace function public.career_applications_open() returns boolean language sql stable set search_path = '' as $$ select true $$`);
async function asApplicant(uid, q, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: "authenticated" })]);
    await db.exec("set local role authenticated");
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const upload = async (uid, kind) => {
  const name = `applicants/${uid}/${kind}-${Math.random().toString(36).slice(2, 12)}abc.pdf`;
  await asApplicant(uid, `insert into storage.objects (bucket_id, name) values ('career-applications', $1)`, [name]);
  return name;
};
const SUBMIT = `select public.submit_my_career_application($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) id`;
const args = (cv, o = {}) => {
  const v = { name: "Alya Putri", wa: "081234567890", uni: "Universitas Brawijaya", year: 2, batch: 2024, r1: "G4", r2: null, ig: "@alya.putri", li: "linkedin.com/in/alya-putri",
    cv, pfPath: null, pfUrl: null, motivation: "I want to help students across Southeast Asia reach global opportunities.", tasks: true, privacy: true, decl: true, country: "ID", city: "Malang", ...o };
  return [v.name, v.wa, v.uni, v.year, v.batch, v.r1, v.r2, v.ig, v.li, v.cv, v.pfPath, v.pfUrl, v.motivation, v.tasks, v.privacy, v.decl, v.country, v.city];
};

// Domicile and the Creative-only portfolio rule
const cvA = await upload(U.applicant, "cv");
await te("domicile country required", () => asApplicant(U.applicant, SUBMIT, args(cvA, { country: "" })), /invalid: domicile_country/);
await te("domicile city required", () => asApplicant(U.applicant, SUBMIT, args(cvA, { city: " " })), /invalid: domicile_city/);
await te("portfolio required when a Creative role is the 2nd choice", () => asApplicant(U.applicant, SUBMIT, args(cvA, { r2: "K1" })), /invalid: portfolio/);
await te("portfolio required for a Creative 1st choice", () => asApplicant(U.applicant, SUBMIT, args(cvA, { r1: "K2" })), /invalid: portfolio/);
await te("CV still required for everyone", () => asApplicant(U.applicant, SUBMIT, args(null)), /invalid: cv/);
let appA;
await t("non-Creative roles: no portfolio needed", () => asApplicant(U.applicant, SUBMIT, args(cvA)), (r) => { appA = r.rows[0].id; return appA ? null : "no id"; });
await t("domicile stored", () => db.query("select domicile_country, domicile_city, portfolio_url from public.career_applications where id = $1", [appA]), (r) => (r.rows[0].domicile_country === "ID" && r.rows[0].domicile_city === "Malang" && !r.rows[0].portfolio_url ? null : JSON.stringify(r.rows[0])));
const cvB = await upload(U.applicant2, "cv"), pfB = await upload(U.applicant2, "portfolio");
let appB;
await t("Creative + other role with a portfolio PDF", () => asApplicant(U.applicant2, SUBMIT, args(cvB, { name: "Budi Santoso", r1: "O1", r2: "K1", pfPath: pfB, country: "MY", city: "Kuala Lumpur" })), (r) => { appB = r.rows[0].id; return appB ? null : "no id"; });
await t("exactly one submit function (the 16-argument version is dropped)", async () => {
  const fn = await db.query(`select count(*)::int n from pg_proc where proname = 'submit_my_career_application'`); return fn.rows[0].n === 1 ? null : `overloads ${fn.rows[0].n}`;
});

// ── Pipeline rows and notifications ──
await t("every application gets a pipeline row at stage 'new'", () => db.query("select stage from public.os_recruitment_candidates where application_id in ($1, $2)", [appA, appB]), (r) => (r.rows.length === 2 && r.rows.every((x) => x.stage === "new") ? null : JSON.stringify(r.rows)));
await t("founders are notified of new applications", () => db.query("select count(*)::int n from public.os_notifications where person_id = 'PPL-9001' and kind = 'candidate_new'"), (r) => (r.rows[0].n === 2 ? null : `n=${r.rows[0].n}`));
await t("applicant view has no OS data", () => asApplicant(U.applicant, "select public.my_career_application() a"), (r) => { const a = r.rows[0].a; return !("stage" in a) && !("admin_notes" in a) && a.domicile_city === "Malang" ? null : JSON.stringify(Object.keys(a)); });

// ── Access ──
await t("founder (MFA) reads candidates and applications", () => user(U.founder, "select a.full_name from public.career_applications a join public.os_recruitment_candidates c on c.application_id = a.id"), (r) => (r.rows.length === 2 ? null : `rows ${r.rows.length}`));
for (const k of ["manager", "creative", "elco", "guest"]) {
  await t(`${k} without a recruitment grant sees no candidates`, () => user(U[k], "select count(*)::int n from public.os_recruitment_candidates"), (r) => (r.rows[0].n === 0 ? null : `n=${r.rows[0].n}`));
  await t(`${k} without a recruitment grant sees no applications`, () => user(U[k], "select count(*)::int n from public.career_applications"), (r) => (r.rows[0].n === 0 ? null : `n=${r.rows[0].n}`));
}
await t("applicant sees no pipeline rows", () => asApplicant(U.applicant, "select count(*)::int n from public.os_recruitment_candidates"), (r) => (r.rows[0].n === 0 ? null : "leak"));
await te("a manager cannot grant themselves recruitment access", () => user(U.manager, `insert into public.os_grants (person_id, resource_type, resource_id, level, reason, expires_at) values ('PPL-9002', 'recruitment', '2027', 'edit', 'self', now() + interval '10 days')`), /row-level security/);
await t("founder grants recruitment view to the manager and edit to the creative member", () => user(U.founder, `insert into public.os_grants (person_id, resource_type, resource_id, level, reason) values ('PPL-9002', 'recruitment', '2027', 'view', 'Recruitment team'), ('PPL-9003', 'recruitment', '2027', 'edit', 'Recruitment lead') returning id`), (r) => (r.rows.length === 2 ? null : "not granted"));
await t("view grant reads candidates", () => user(U.manager, "select count(*)::int n from public.career_applications"), (r) => (r.rows[0].n === 2 ? null : `n=${r.rows[0].n}`));
await t("view grant cannot move stages", () => user(U.manager, `update public.os_recruitment_candidates set stage = 'cv_screening' where application_id = $1 returning 1`, [appA]).catch(() => ({ rows: [] })), (r) => (r.rows.length === 0 ? null : "moved"));

// ── Stages, history, applicant status ──
await t("editor moves a candidate to CV screening and assigns a reviewer", () => user(U.creative, `update public.os_recruitment_candidates set stage = 'cv_screening', reviewer_person_id = 'PPL-9002' where application_id = $1 returning stage`, [appA]), (r) => (r.rows[0]?.stage === "cv_screening" ? null : "not moved"));
await t("stage history and audit log written", async () => {
  const h = await db.query("select from_stage, to_stage, actor_person_id from public.os_recruitment_stage_history where application_id = $1", [appA]);
  const a = await db.query("select count(*)::int n from public.os_audit_log where action like 'recruitment.%' and target_id = $1", [appA]);
  return h.rows.length === 1 && h.rows[0].actor_person_id === "PPL-9003" && a.rows[0].n >= 2 ? null : JSON.stringify({ h: h.rows, a: a.rows });
});
await t("applicant-facing status follows the stage", () => asApplicant(U.applicant, "select public.my_career_application() ->> 'status' s"), (r) => (r.rows[0].s === "under_review" ? null : r.rows[0].s));
await t("reviewer notified", () => db.query("select count(*)::int n from public.os_notifications where person_id = 'PPL-9002' and kind = 'candidate_assigned'"), (r) => (r.rows[0].n === 1 ? null : `n=${r.rows[0].n}`));
await te("reviewer must be active staff", () => user(U.creative, `update public.os_recruitment_candidates set reviewer_person_id = 'PPL-9006' where application_id = $1`, [appA]), /active Company OS staff/);
await te("guests can't be assigned", () => user(U.creative, `insert into public.os_recruitment_assignments (application_id, person_id, role) values ($1, 'PPL-9005', 'interviewer')`, [appA]), /active Company OS staff/);

// ── Interviewer: only the assigned candidate, only what's needed ──
await t("editor assigns the Elco member as interviewer", () => user(U.creative, `insert into public.os_recruitment_assignments (application_id, person_id, role) values ($1, 'PPL-9004', 'interviewer') returning id`, [appA]), (r) => (r.rows.length ? null : "no"));
await t("interviewer still can't read application rows", () => user(U.elco, "select count(*)::int n from public.career_applications"), (r) => (r.rows[0].n === 0 ? null : "leak"));
await t("interviewer gets the brief without email, WhatsApp or admin notes", () => one(U.elco, "select public.os_recruitment_candidate_brief($1)", [appA]), (b) => (b && b.full_name === "Alya Putri" && !("email" in b) && !("whatsapp" in b) && !("admin_notes" in b) ? null : JSON.stringify(b)));
await t("interviewer gets nothing for an unassigned candidate", () => one(U.elco, "select public.os_recruitment_candidate_brief($1)", [appB]), is(null));
await t("interviewer sees their assignment", () => user(U.elco, "select * from public.os_recruitment_my_assignments()"), (r) => (r.rows.length === 1 && r.rows[0].application_id === appA ? null : JSON.stringify(r.rows)));
await t("interviewer can open the assigned candidate's CV", () => user(U.elco, "select count(*)::int n from storage.objects where name = $1", [cvA]), (r) => (r.rows[0].n === 1 ? null : "no file"));
await t("but not other candidates' files", () => user(U.elco, "select count(*)::int n from storage.objects where name in ($1, $2)", [cvB, pfB]), (r) => (r.rows[0].n === 0 ? null : "leak"));
await t("staff without access can't open any file", () => user(U.guest, "select count(*)::int n from storage.objects"), (r) => (r.rows[0].n === 0 ? null : "leak"));

// ── Evaluations and notes ──
await t("interviewer records an interview evaluation", () => user(U.elco, `insert into public.os_recruitment_evaluations (application_id, kind, ratings, recommendation, interview_feedback) values ($1, 'interview', '{"communication":"strong","motivation":"adequate","role_fit":"strong"}', 'advance', 'Clear and thoughtful.') returning author_person_id`, [appA]), (r) => (r.rows[0].author_person_id === "PPL-9004" ? null : "author"));
await te("unknown criteria are refused", () => user(U.creative, `insert into public.os_recruitment_evaluations (application_id, kind, ratings) values ($1, 'screening', '{"iq":"strong"}')`, [appA]), /Unknown evaluation criterion/);
await te("ratings are words, not scores", () => user(U.creative, `insert into public.os_recruitment_evaluations (application_id, kind, ratings) values ($1, 'screening', '{"cv_quality":"9"}')`, [appA]), /strong, adequate, weak/);
await t("editor records a screening evaluation", () => user(U.creative, `insert into public.os_recruitment_evaluations (application_id, kind, ratings, summary) values ($1, 'screening', '{"cv_quality":"strong","campaign_compliance":"adequate"}', 'Good CV.') returning id`, [appA]), (r) => (r.rows.length ? null : "no"));
await t("an interviewer sees only their own evaluations", () => user(U.elco, "select kind from public.os_recruitment_evaluations"), (r) => (r.rows.length === 1 && r.rows[0].kind === "interview" ? null : JSON.stringify(r.rows)));
await t("the recruitment team sees all evaluations", () => user(U.manager, "select count(*)::int n from public.os_recruitment_evaluations"), (r) => (r.rows[0].n === 2 ? null : `n=${r.rows[0].n}`));
await t("nobody edits someone else's evaluation", () => user(U.creative, `update public.os_recruitment_evaluations set summary = 'x' where kind = 'interview' returning 1`), (r) => (r.rows.length === 0 ? null : "edited"));
await t("private and team notes", async () => {
  await user(U.creative, `insert into public.os_recruitment_notes (application_id, visibility, body) values ($1, 'private', 'My own thought'), ($1, 'team', 'Shared note')`, [appA]);
  const mgr = await user(U.manager, "select body from public.os_recruitment_notes");
  const own = await user(U.creative, "select body from public.os_recruitment_notes");
  const intv = await user(U.elco, "select body from public.os_recruitment_notes");
  return mgr.rows.length === 1 && mgr.rows[0].body === "Shared note" && own.rows.length === 2 && intv.rows.length === 0 ? null : JSON.stringify({ mgr: mgr.rows, own: own.rows, intv: intv.rows });
});
await te("notes can't be written for a candidate you can't see", () => user(U.guest, `insert into public.os_recruitment_notes (application_id, body) values ($1, 'x')`, [appA]), /row-level security/);

// ── Calendar and tasks linked to a candidate ──
await te("staff without access can't link an event to a candidate", () => user(U.guest, `insert into public.os_events (company_code, title, starts_at, ends_at, candidate_id) values ('IEL', 'x', now(), now() + interval '1 hour', $1)`, [appA]), /recruitment access|row-level|permission|create/i);
await t("recruiter schedules an interview: forced Restricted", () => user(U.founder, `insert into public.os_events (company_code, title, starts_at, ends_at, candidate_id, sensitivity) values ('HQ', 'Interview: Alya Putri', now() + interval '1 day', now() + interval '1 day 30 minutes', $1, 'Internal') returning sensitivity`, [appA]), (r) => (r.rows[0]?.sensitivity === "Restricted" ? null : JSON.stringify(r.rows)));
await t("a candidate-linked event is invisible to unrelated staff", () => user(U.guest, "select count(*)::int n from public.os_events where candidate_id is not null"), (r) => (r.rows[0].n === 0 ? null : "leak"));
await t("recruiter creates a screening task linked to the candidate (Restricted)", () => user(U.founder, `insert into public.os_tasks (company_code, title, owner_person_id, candidate_id) values ('HQ', 'Screen CV: Alya Putri', 'PPL-9003', $1) returning sensitivity`, [appA]), (r) => (r.rows[0]?.sensitivity === "Restricted" ? null : JSON.stringify(r.rows)));
await t("the task owner sees it, others don't", async () => {
  const own = await user(U.creative, "select count(*)::int n from public.os_tasks where candidate_id is not null");
  const other = await user(U.guest, "select count(*)::int n from public.os_tasks where candidate_id is not null");
  return own.rows[0].n === 1 && other.rows[0].n === 0 ? null : JSON.stringify([own.rows, other.rows]);
});

await t("a non-founder recruiter creates a linked task (reviewer = themselves) and still sees it", async () => {
  const r = await user(U.creative, `insert into public.os_tasks (company_code, title, owner_person_id, reviewer_person_id, candidate_id) values ('HQ', 'Interview prep: Alya Putri', 'PPL-9004', 'PPL-9003', $1) returning id, sensitivity`, [appA]);
  const seen = await user(U.creative, "select count(*)::int n from public.os_tasks where id = $1", [r.rows[0].id]);
  return r.rows[0].sensitivity === "Restricted" && seen.rows[0].n === 1 ? null : JSON.stringify([r.rows, seen.rows]);
});
await t("a non-founder recruiter schedules an interview and invites the interviewer", async () => {
  const r = await user(U.creative, `insert into public.os_events (company_code, title, starts_at, ends_at, candidate_id) values ('HQ', 'Interview: Alya Putri', now() + interval '2 days', now() + interval '2 days 30 minutes', $1) returning id, sensitivity`, [appA]);
  await user(U.creative, `insert into public.os_event_attendees (event_id, person_id) values ($1, 'PPL-9004')`, [r.rows[0].id]);
  const seen = await user(U.elco, "select count(*)::int n from public.os_events where id = $1", [r.rows[0].id]);
  const note = await db.query("select count(*)::int n from public.os_notifications where person_id = 'PPL-9004' and kind = 'event_invited'");
  return r.rows[0].sensitivity === "Restricted" && seen.rows[0].n === 1 && note.rows[0].n >= 1 ? null : JSON.stringify([r.rows, seen.rows, note.rows]);
});

// ── Decision and conversion ──
await te("only founders convert", () => user(U.creative, `select public.os_recruitment_convert($1, 'alya.work@example.test', array['IEL'], 'DIV-03')`, [appA]), /Only founders/);
await te("only accepted candidates convert", () => user(U.founder, `select public.os_recruitment_convert($1, 'alya.work@example.test', array['IEL'], 'DIV-03')`, [appA]), /Only accepted/);
await t("editor accepts the candidate with a note", () => user(U.creative, `update public.os_recruitment_candidates set stage = 'accepted', decision_note = 'Strong fit for Growth' where application_id = $1 returning decided_by`, [appA]), (r) => (r.rows[0]?.decided_by === "PPL-9003" ? null : JSON.stringify(r.rows)));
await t("applicant sees Accepted", () => asApplicant(U.applicant, "select public.my_career_application() ->> 'status' s"), (r) => (r.rows[0].s === "accepted" ? null : r.rows[0].s));
await te("a duplicate Google account is refused", () => user(U.founder, `select public.os_recruitment_convert($1, 'manager@example.test', array['IEL'], null)`, [appA]), /person_exists/);
let newPerson;
await t("founder converts: an invited person record, linked to the application", () => one(U.founder, `select public.os_recruitment_convert($1, 'alya.work@example.test', array['IEL'], 'DIV-03')`, [appA]), (id) => { newPerson = id; return /^PPL-\d{4}$/.test(id) ? null : String(id); });
await t("person is invited (no access until the normal approval)", () => db.query("select p.status, c.employee_person_id from public.os_people p join public.os_recruitment_candidates c on c.employee_person_id = p.id where p.id = $1", [newPerson]), (r) => (r.rows[0]?.status === "invited" && r.rows[0]?.employee_person_id === newPerson ? null : JSON.stringify(r.rows)));
await te("converting twice is refused", () => user(U.founder, `select public.os_recruitment_convert($1, 'alya.other@example.test', array['IEL'], null)`, [appA]), /already_converted/);
await t("editors can't overwrite the conversion link", () => user(U.creative, `update public.os_recruitment_candidates set decision_note = 'x' where application_id = $1 returning employee_person_id`, [appA]), (r) => (r.rows[0]?.employee_person_id === newPerson ? null : "changed"));
await te("a converted candidate can't leave Accepted", () => user(U.creative, `update public.os_recruitment_candidates set stage = 'rejected' where application_id = $1`, [appA]), /already been converted/);
await t("application id and history preserved", () => db.query("select count(*)::int n from public.os_recruitment_stage_history where application_id = $1", [appA]), (r) => (r.rows[0].n >= 3 ? null : `n=${r.rows[0].n}`));

// ── Revoking access ──
await t("founder revokes the manager's grant", () => user(U.founder, `update public.os_grants set revoked_at = now() where person_id = 'PPL-9002' and resource_type = 'recruitment' returning id`), (r) => (r.rows.length ? null : "no"));
await t("…and the manager sees nothing again", () => user(U.manager, "select count(*)::int n from public.career_applications"), (r) => (r.rows[0].n === 0 ? null : `n=${r.rows[0].n}`));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
