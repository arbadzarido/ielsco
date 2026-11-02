// Professional opportunities migrations (20261102000000 + seed 20261102010000) on PGlite with Supabase-like roles and a
// storage stub. Not part of `npm test` (needs @electric-sql/pglite). Copy it next to a PGlite install (e.g.
// workspace/local-stack/tests/) and run:  node --liftoff-only professional-opportunities.pglite.mjs <repo>/supabase/migrations
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

const schema = readFileSync(join(dir, "20261102000000_professional_opportunities.sql"), "utf8");
const seed = readFileSync(join(dir, "20261102010000_professional_opportunities_seed.sql"), "utf8");
await db.exec(schema); await db.exec(seed);
await db.exec(schema); await db.exec(seed);
ok("migrations apply twice");

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

await t("seed: 8 published Albania listings, 1 partner", () => as("anon", null, "select slug, country_code, salary_status from public.professional_opportunities"),
  (r) => r.rows.length !== 8 ? `got ${r.rows.length}` : r.rows.some((x) => x.country_code !== "AL") && "non-AL row");
await t("seed: construction and poultry salaries flagged to_confirm", () => as("anon", null, "select slug from public.professional_opportunities where salary_status = 'to_confirm' order by slug"),
  (r) => !["albania-construction-worker", "albania-poultry-worker"].every((s) => r.rows.some((x) => x.slug === s)) && JSON.stringify(r.rows));
await t("anon reads the active partner", () => as("anon", null, "select name, website_url from public.recruitment_partners"), (r) => r.rows[0]?.name !== "PT Ficotama Bina Trampil" && JSON.stringify(r.rows));

const opp = (await db.query("select id from public.professional_opportunities where slug = 'albania-hotel-cleaner'")).rows[0].id;
const cookId = (await db.query("select id from public.professional_opportunities where slug = 'albania-cook'")).rows[0].id;

await te("anon cannot insert listings", () => as("anon", null, `insert into public.professional_opportunities (slug, title, country_code, industry, summary, partner_id) select 'x-y-z', 'Xyz', 'DE', 'Ind', 'A summary here', id from public.recruitment_partners`), /permission|row-level/);
await t("member insert is blocked by RLS", async () => {
  try { await as("authenticated", MEMBER, `insert into public.professional_opportunities (slug, title, country_code, industry, summary, partner_id) select 'x-y-z', 'Xyz', 'DE', 'Ind', 'A summary here', id from public.recruitment_partners`); return "inserted"; }
  catch (e) { return /row-level/.test(e.message) ? null : e.message; }
}, (r) => r);
await t("admin adds a draft listing in a new country (hidden from anon)", async () => {
  await as("authenticated", ADMIN, `insert into public.professional_opportunities (slug, title, country_code, industry, summary, partner_id) select 'germany-nurse', 'Nurse', 'DE', 'Healthcare', 'A summary here', id from public.recruitment_partners`);
  const r = await as("anon", null, "select 1 from public.professional_opportunities where slug = 'germany-nurse'");
  return r.rows.length ? "draft visible" : null;
}, (r) => r);
await t("publishing sets published_at and makes it public", async () => {
  await as("authenticated", ADMIN, "update public.professional_opportunities set publication = 'published' where slug = 'germany-nurse'");
  const r = await as("anon", null, "select published_at from public.professional_opportunities where slug = 'germany-nurse'");
  return r.rows[0]?.published_at ? null : "no published_at";
}, (r) => r);

const SUBMIT = "select public.submit_opportunity_interest($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) r";
const args = (id, o = {}) => {
  const v = { opp, name: "Dewi Lestari", email: `dewi.${id.slice(0, 6)}@example.test`, wa: "0812-3456-7890", country: "Albania", position: "Hotel cleaner",
    statement: "I have three years of hotel housekeeping experience.", occ: "", exp: "", li: "", cv: "", contact: "whatsapp", consent: true, ver: "2026-11-02", src: "public", ...o };
  return [id, v.opp, v.name, v.email, v.wa, v.country, v.position, v.statement, v.occ, v.exp, v.li, v.cv, v.contact, v.consent, v.ver, v.src];
};

const id1 = crypto.randomUUID();
await t("anon submits an interest; returns title/country/partner for the email", () => as("anon", null, SUBMIT, args(id1)),
  (r) => (r.rows[0].r.title !== "Hotel Cleaner" || r.rows[0].r.country_code !== "AL" || r.rows[0].r.partner !== "PT Ficotama Bina Trampil") && JSON.stringify(r.rows[0].r));
await t("phone normalised to +62, snapshot stored", () => db.query("select whatsapp, opportunity_title, consent_version from public.opportunity_interests where id = $1", [id1]),
  (r) => (r.rows[0].whatsapp !== "+6281234567890" || r.rows[0].opportunity_title !== "Hotel Cleaner") && JSON.stringify(r.rows[0]));
await te("same email + listing twice is refused", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { email: `DEWI.${id1.slice(0, 6)}@example.test` })), /already_submitted/);
await t("same email may express interest in another listing", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { opp: cookId, email: `dewi.${id1.slice(0, 6)}@example.test`, position: "Cook" })));
await te("consent is required", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { consent: false })), /invalid: consent/);
await te("statement too short", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { statement: "hi" })), /invalid: statement/);
await te("bad WhatsApp", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { wa: "12" })), /invalid: whatsapp/);
await te("bad email", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { email: "nope" })), /invalid: email/);
await te("LinkedIn must be linkedin.com", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { li: "https://evil.example/in/x" })), /invalid: linkedin_url/);
await t("LinkedIn without scheme is accepted and stored as https", async () => {
  const id = crypto.randomUUID();
  await as("anon", null, SUBMIT, args(id, { li: "www.linkedin.com/in/dewi" }));
  return (await db.query("select linkedin_url from public.opportunity_interests where id = $1", [id])).rows[0].linkedin_url;
}, (r) => r !== "https://www.linkedin.com/in/dewi" && r);
await te("unpublished listing refused", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { opp: crypto.randomUUID() })), /invalid: opportunity/);

await t("admin closes the hotel listing", () => as("authenticated", ADMIN, "update public.professional_opportunities set status = 'closed' where id = $1", [opp]));
await te("closed listing refuses new interest", () => as("anon", null, SUBMIT, args(crypto.randomUUID())), /opportunity_closed/);
await as("authenticated", ADMIN, "update public.professional_opportunities set status = 'open' where id = $1", [opp]);

// CV upload: only into a not-yet-submitted interest folder, only as cv-*.pdf; the RPC checks the file exists.
const id2 = crypto.randomUUID();
const cv = `incoming/${id2}/cv-${crypto.randomBytes(8).toString("hex")}.pdf`;
await t("anon uploads a CV for a new interest", () => as("anon", null, "insert into storage.objects (bucket_id, name) values ('opportunity-interest-cvs', $1)", [cv]));
await te("upload with a bad name refused", () => as("anon", null, "insert into storage.objects (bucket_id, name) values ('opportunity-interest-cvs', $1)", [`incoming/${id2}/passport.pdf`]), /row-level/);
await te("CV path for another interest refused", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { cv })), /invalid: cv/);
await te("missing CV file refused", () => as("anon", null, SUBMIT, args(crypto.randomUUID(), { cv: `incoming/${crypto.randomUUID()}/cv-abcdefgh12.pdf` })), /invalid: cv/);
await t("interest with its CV accepted", () => as("anon", null, SUBMIT, args(id2, { cv })));
await te("no more uploads once submitted", () => as("anon", null, "insert into storage.objects (bucket_id, name) values ('opportunity-interest-cvs', $1)", [`incoming/${id2}/cv-${crypto.randomBytes(8).toString("hex")}.pdf`]), /row-level/);
await t("anon cannot read CVs", () => as("anon", null, "select name from storage.objects where bucket_id = 'opportunity-interest-cvs'"), (r) => r.rows.length && "visible");
await t("admin can read CVs", () => as("authenticated", ADMIN, "select name from storage.objects where bucket_id = 'opportunity-interest-cvs'"), (r) => !r.rows.length && "not visible");

await te("anon cannot read interests", () => as("anon", null, "select * from public.opportunity_interests"), /permission/);
await t("member sees no interests", () => as("authenticated", MEMBER, "select * from public.opportunity_interests"), (r) => r.rows.length && `saw ${r.rows.length}`);
await te("anon cannot insert interests directly", () => as("anon", null, `insert into public.opportunity_interests (id, opportunity_id, opportunity_title, country_code, full_name, email, whatsapp, country_of_interest, position, statement, consent_version) values (gen_random_uuid(), '${opp}', 'x', 'AL', 'Ab', 'a@b.co', '+62812345678', 'Albania', 'Cook', 'twenty characters long text', 'v')`), /permission/);
await t("admin reads interests and updates status", async () => {
  const r = await as("authenticated", ADMIN, "select id from public.opportunity_interests");
  await as("authenticated", ADMIN, "update public.opportunity_interests set status = 'forwarded', admin_notes = 'sent' where id = $1", [id1]);
  return r.rows.length >= 4 ? null : `saw ${r.rows.length}`;
}, (r) => r);
await te("admin cannot rewrite what the person submitted", () => as("authenticated", ADMIN, "update public.opportunity_interests set email = 'x@y.co' where id = $1", [id1]), /permission/);

await te("rate limit: 6th submission from one email in a day", async () => {
  const email = "busy@example.test";
  const ids = (await db.query("select id from public.professional_opportunities where publication = 'published' and status <> 'closed' limit 6")).rows.map((x) => x.id);
  for (const o of ids) await as("anon", null, SUBMIT, args(crypto.randomUUID(), { opp: o, email }));
}, /too_many/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
