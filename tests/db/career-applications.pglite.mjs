// Careers applications migration (20261101000000) on PGlite with Supabase-like roles and a storage stub.
// Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install (e.g. workspace/local-stack/tests/)
// and run:  node --liftoff-only career-applications.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const [dir] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", MEMBER = "22222222-2222-2222-2222-222222222222";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text);
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
  insert into auth.users values ('${ADMIN}', 'admin@example.test'), ('${MEMBER}', 'member@example.test');
  insert into public.staff_roles values ('${ADMIN}', 'admin');`);

const sql = readFileSync(join(dir, "20261101000000_career_applications.sql"), "utf8");
await db.exec(sql);
await db.exec(sql);
ok("migration applies twice");

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
// Like the Storage API: a plain insert (visitors have no SELECT policy, so no RETURNING).
const upload = async (id, kind, role = "anon") => {
  const name = `incoming/${id}/${kind}-${crypto.randomBytes(8).toString("hex")}.pdf`;
  await as(role, null, `insert into storage.objects (bucket_id, name) values ('career-applications', $1)`, [name]);
  return name;
};
const SUBMIT = `select public.submit_career_application($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) id`;
const args = (id, cv, o = {}) => {
  const v = { name: "Siti Rahma", email: `siti.${id.slice(0, 6)}@example.test`, wa: "0812-3456-7890", uni: "Universitas Indonesia", year: 2, division: "creative", role: "K1", ig: "@siti.rahma", li: "id.linkedin.com/in/siti-rahma?trk=x", cv, pfPath: null, pfUrl: "https://behance.net/siti", motivation: "I want to grow.", ...o };
  return [id, v.name, v.email, v.wa, v.uni, v.year, v.division, v.role, v.ig, v.li, v.cv, v.pfPath, v.pfUrl, v.motivation];
};

// Window: the real dates (9–29 Nov 2026). Before they start, nothing goes in.
const closedNow = (await db.query("select public.career_applications_open() o")).rows[0].o === false;
if (closedNow) {
  const id = crypto.randomUUID();
  await te("upload refused while applications are closed", () => upload(id, "cv"), /row-level security/);
  await te("submit refused while applications are closed", () => as("anon", null, SUBMIT, args(id, `incoming/${id}/cv-abcdef12.pdf`)), /applications_closed/);
} else console.log("SKIP closed-window checks (window currently open)");

// Open the window for the rest of the suite.
await db.exec(`create or replace function public.career_applications_open() returns boolean language sql stable set search_path = '' as $$ select true $$`);

const id1 = crypto.randomUUID();
const cv1 = await upload(id1, "cv");
const pf1 = await upload(id1, "portfolio");
await t("anon submits a full application", () => as("anon", null, SUBMIT, args(id1, cv1, { pfPath: pf1, pfUrl: "" })));
await t("stored normalised with default statuses", () => db.query("select * from public.career_applications where id = $1", [id1]), (r) => {
  const a = r.rows[0];
  if (!a) return "missing";
  const want = { whatsapp: "+6281234567890", instagram_url: "https://www.instagram.com/siti.rahma/", linkedin_url: "https://www.linkedin.com/in/siti-rahma/", status: "submitted", campaign_verification: "pending", portfolio_url: null, cohort: "2027" };
  for (const [k, v] of Object.entries(want)) if (a[k] !== v) return `${k}=${a[k]}`;
});
await te("duplicate email for the cohort is refused", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), cv1, { email: `SITI.${id1.slice(0, 6)}@example.test` })), /already_applied|invalid: cv/);
const id2 = crypto.randomUUID(); const cv2 = await upload(id2, "cv");
await te("duplicate email (case-insensitive, valid files)", () => as("anon", null, SUBMIT, args(id2, cv2, { email: `SITI.${id1.slice(0, 6)}@EXAMPLE.test` })), /already_applied/);
await te("upload into an already-submitted folder is refused", () => upload(id1, "cv"), /row-level security/);
await te("non-PDF upload path is refused", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('career-applications', $1)`, [`incoming/${crypto.randomUUID()}/cv-abcdef1234.docx`]), /row-level security/);

const id3 = crypto.randomUUID(); const cv3 = await upload(id3, "cv");
await te("CV that was never uploaded", () => as("anon", null, SUBMIT, args(id3, `incoming/${id3}/cv-neveruploaded1.pdf`)), /invalid: cv_missing/);
await te("CV from another application's folder", () => as("anon", null, SUBMIT, args(id3, cv1)), /invalid: cv/);
await te("no portfolio file or link", () => as("anon", null, SUBMIT, args(id3, cv3, { pfUrl: "" })), /invalid: portfolio/);
await te("4th-year student", () => as("anon", null, SUBMIT, args(id3, cv3, { year: 4 })), /invalid: academic_year/);
await te("unknown division", () => as("anon", null, SUBMIT, args(id3, cv3, { division: "finance" })), /invalid: division/);
await te("Instagram post link instead of profile", () => as("anon", null, SUBMIT, args(id3, cv3, { ig: "https://www.instagram.com/p/DPOLpNwkUAR/" })), /invalid: instagram/);
await te("LinkedIn company page", () => as("anon", null, SUBMIT, args(id3, cv3, { li: "https://www.linkedin.com/company/ielsco" })), /invalid: linkedin_url/);
await te("bad WhatsApp number", () => as("anon", null, SUBMIT, args(id3, cv3, { wa: "12ab" })), /invalid: whatsapp/);
await te("http portfolio link", () => as("anon", null, SUBMIT, args(id3, cv3, { pfUrl: "http://example.test" })), /invalid: portfolio_url/);
await te("motivation over 1000 chars", () => as("anon", null, SUBMIT, args(id3, cv3, { motivation: "x".repeat(1001) })), /invalid: motivation/);
await t("signed-in member can apply with a link portfolio (user_id kept)", () => as("authenticated", MEMBER, SUBMIT, args(id3, cv3, { ig: "https://instagram.com/member_one?igsh=abc", role: "" })));
await t("member's row has user_id and no role", () => db.query("select user_id, role_id, instagram_url from public.career_applications where id = $1", [id3]), (r) => (r.rows[0]?.user_id === MEMBER && r.rows[0].role_id === null && r.rows[0].instagram_url === "https://www.instagram.com/member_one/" ? null : JSON.stringify(r.rows[0] ?? "missing")));

await te("anon cannot read applications", () => as("anon", null, "select * from public.career_applications"), /permission denied/);
await t("member reads no applications (RLS)", () => as("authenticated", MEMBER, "select * from public.career_applications"), (r) => (r.rows.length ? `saw ${r.rows.length}` : null));
await t("member's update touches nothing", () => as("authenticated", MEMBER, "update public.career_applications set status = 'accepted' returning id"), (r) => (r.rows.length ? "updated" : null));
await te("anon cannot insert directly", () => as("anon", null, "insert into public.career_applications (id, full_name) values (gen_random_uuid(), 'x')"), /permission denied/);
await t("admin reads all applications", () => as("authenticated", ADMIN, "select id from public.career_applications"), (r) => (r.rows.length === 2 ? null : `saw ${r.rows.length}`));
await t("admin updates status, verification and notes", () => as("authenticated", ADMIN, "update public.career_applications set status = 'invited', campaign_verification = 'verified', admin_notes = 'IG ok' where id = $1 returning updated_at > created_at as touched", [id1]), (r) => (r.rows[0] ? null : "no row"));
await te("admin cannot rewrite applicant data", () => as("authenticated", ADMIN, "update public.career_applications set email = 'x@y.z' where id = $1", [id1]), /permission denied/);
await t("admin can read uploaded files; member and anon cannot", async () => {
  const a = await as("authenticated", ADMIN, "select count(*)::int n from storage.objects where bucket_id = 'career-applications'");
  const m = await as("authenticated", MEMBER, "select count(*)::int n from storage.objects where bucket_id = 'career-applications'");
  const n = await as("anon", null, "select count(*)::int n from storage.objects where bucket_id = 'career-applications'");
  return [a.rows[0].n, m.rows[0].n, n.rows[0].n];
}, ([a, m, n]) => (a >= 4 && m === 0 && n === 0 ? null : `admin ${a}, member ${m}, anon ${n}`));
await t("bucket is private, PDF only, 10 MB", () => db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'career-applications'"), (r) => {
  const b = r.rows[0]; return b && b.public === false && Number(b.file_size_limit) === 10485760 && b.allowed_mime_types.join() === "application/pdf" ? null : JSON.stringify(b);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
