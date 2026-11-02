// IELSco Stories (migration 20261102100000) on PGlite: same CMS table as Member Stories, section 'ielsco'.
// Not part of `npm test` (needs @electric-sql/pglite). Copy next to a PGlite install (e.g. workspace/local-stack/tests/)
// and run:  node --liftoff-only test-ielsco-stories.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", MEMBER = "22222222-2222-2222-2222-222222222222", UNCONF = "33333333-3333-3333-3333-333333333333";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create table public.users (id uuid primary key, full_name text, role text, email text);
  alter table public.users enable row level security;
  create policy users_own on public.users for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  create table public.member_profiles (user_id uuid primary key, avatar_url text);
  -- storage stub (the parts the policies use)
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name), '.', 1)) $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated; grant execute on all functions in schema storage to anon, authenticated;
  insert into auth.users (id, email, email_confirmed_at) values
    ('${ADMIN}', 'ArbadZarido03@gmail.com', now()), ('${MEMBER}', 'member@example.test', now()), ('${UNCONF}', 'x@example.test', null);
  insert into public.users (id, full_name, role, email) values ('${MEMBER}', 'Member', 'member', 'member@example.test');`);


const MIG = "20261102100000_ielsco_stories.sql";
const base = readdirSync(dir).filter((f) => f.endsWith(".sql") && f >= "20261018" && f < "20261020").sort();
for (const f of base) await db.exec(readFileSync(join(dir, f), "utf8"));
const snap = async () => (await db.query(`select md5(string_agg(t::text, ',' order by slug)) h, count(*)::int n from (select slug, title, category, status, sections, banner_image from public.member_stories) t`)).rows[0];
const before = await snap();
await db.exec(readFileSync(join(dir, MIG), "utf8"));
await db.exec(readFileSync(join(dir, MIG), "utf8"));
const after = await snap();
before.h === after.h && after.n === 24 ? ok("migration applies twice; the 24 existing rows are unchanged") : bad("idempotent / unchanged", JSON.stringify({ before, after }));

async function as(role, uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 70)})`) : bad(n, e.message); } };
const A = (sql, p) => as("authenticated", ADMIN, sql, p);

await t("existing rows are section 'member', lang 'en'", () => db.query(`select count(*)::int n from public.member_stories where section='member' and lang='en'`), (r) => r.rows[0].n === 24 ? null : r.rows[0].n);
await t("Member Stories view still shows the 9 published stories", () => as("anon", null, `select slug from public.published_member_stories`), (r) => r.rows.length === 9 ? null : r.rows.length);

const ins = (o) => A(`insert into public.member_stories (section, kind, status, slug, title, category, lang, translation_of, author_name, publication_authorized, published_at, banner_image, banner_alt, tags)
  values ('ielsco','story',$1,$2,$3,$4,$5,$6,'IELSco Editorial Team',$7,$8,$9,$10,$11) returning id`,
  [o.status ?? "draft", o.slug, o.title ?? o.slug, o.category ?? "achievements", o.lang ?? "en", o.translation_of ?? null, o.auth ?? true, o.published_at ?? null, o.banner ?? null, o.alt ?? null, o.tags ?? []]);

let en, id;
await t("admin creates an English IELSco draft", async () => { en = (await ins({ slug: "siw-silver", tags: ["award"] })).rows[0].id; });
await te("an IELSco story can't use a Member Stories category", () => ins({ slug: "bad-cat", category: "circle" }), /category_by_section/);
await te("a member story can't use an IELSco category", () => A(`insert into public.member_stories (slug, title, category) values ('bad-member', 'x', 'achievements')`), /category_by_section/);
await te("IELSco placeholders are not allowed", () => A(`insert into public.member_stories (section, kind, slug, title, category) values ('ielsco', 'placeholder', 'ph-x', 'x', 'events')`), /no_placeholders/);
await te("an English story can't be a translation", () => ins({ slug: "en-trans", translation_of: en }), /Indonesian IELSco story/);
await t("admin creates the Indonesian version linked to it", async () => { id = (await ins({ slug: "siw-perak", lang: "id", translation_of: en })).rows[0].id; });
await te("the section can't change", () => A(`update public.member_stories set section='member', category='circle' where id=$1`, [en]), /section/);
await te("publishing still needs the review box ticked", () => A(`update public.member_stories set status='published', publication_authorized=false where id=$1`, [en]), /authorization/);

await t("publish both; anon sees them with the translation slug", async () => {
  await A(`update public.member_stories set status='published' where id in ($1, $2)`, [en, id]);
  return as("anon", null, `select slug, lang, translation_slug from public.published_ielsco_stories where slug like 'siw-%' order by lang`);
}, (r) => JSON.stringify(r.rows) === JSON.stringify([{ slug: "siw-silver", lang: "en", translation_slug: "siw-perak" }, { slug: "siw-perak", lang: "id", translation_slug: "siw-silver" }]) ? null : JSON.stringify(r.rows));
await t("IELSco stories never appear in the Member Stories view", () => as("anon", null, `select count(*)::int n from public.published_member_stories where slug like 'siw-%'`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);
await t("a future publication date stays hidden (scheduled)", async () => {
  await ins({ slug: "future-news", status: "published", published_at: new Date(Date.now() + 86400000).toISOString() });
  return as("anon", null, `select count(*)::int n from public.published_ielsco_stories where slug='future-news'`);
}, (r) => r.rows[0].n === 0 ? null : "visible early");
await t("a past publication date is visible", async () => {
  await ins({ slug: "past-news", status: "published", published_at: "2026-04-27T03:00:00Z" });
  return as("anon", null, `select published_at from public.published_ielsco_stories where slug='past-news'`);
}, (r) => r.rows.length === 1 ? null : "hidden");
await t("unpublishing the Indonesian version clears the English page's translation link", async () => {
  await A(`update public.member_stories set status='draft' where id=$1`, [id]);
  return as("anon", null, `select translation_slug from public.published_ielsco_stories where slug='siw-silver'`);
}, (r) => r.rows[0].translation_slug === null ? null : JSON.stringify(r.rows));
await t("slug change redirects (IELSco view)", async () => {
  await A(`update public.member_stories set slug='ielsco-silver-award-siw-cambodia-2026' where id=$1`, [en]);
  return as("anon", null, `select slug, lang from public.published_ielsco_story_redirects where old_slug='siw-silver'`);
}, (r) => r.rows[0]?.slug === "ielsco-silver-award-siw-cambodia-2026" ? null : JSON.stringify(r.rows));
await te("anon cannot read the table directly", () => as("anon", null, `select * from public.member_stories`), /permission denied/);
await te("a member cannot create IELSco stories", () => as("authenticated", MEMBER, `insert into public.member_stories (section, slug, title, category) values ('ielsco', 'm-x', 'x', 'events')`), /row-level security/);
await t("view hides editor columns", () => db.query(`select column_name from information_schema.columns where table_name='published_ielsco_stories'`),
  (r) => r.rows.some((c) => ["editor_notes", "issues", "publication_authorized", "created_by", "translation_of"].includes(c.column_name)) ? "leaks" : null);
await t("deleting the English original keeps the Indonesian row (link cleared)", async () => {
  await A(`delete from public.member_stories where id=$1`, [en]);
  return db.query(`select translation_of from public.member_stories where id=$1`, [id]);
}, (r) => r.rows[0].translation_of === null ? null : JSON.stringify(r.rows));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
