// Member Stories CMS migrations + RLS on PGlite (real Postgres in WASM) with Supabase-like roles and a storage stub.
// Not part of `npm test` (needs @electric-sql/pglite, which the repo does not install). Copy it next to a PGlite install
// (e.g. workspace/local-stack/tests/) and run:  node --liftoff-only test-member-stories.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

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

const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const storyFiles = files.filter((f) => f >= "20261019");
for (const f of files.filter((f) => f >= "20261018")) await db.exec(readFileSync(join(dir, f), "utf8")); // avatar migration needs member_profiles only
const snap = async () => (await db.query(`select md5(string_agg(t::text, ',' order by slug)) h, count(*)::int n from public.member_stories t`)).rows[0];
const first = await snap();
for (const f of storyFiles) await db.exec(readFileSync(join(dir, f), "utf8"));
const second = await snap();
first.h === second.h && first.n === 24 ? ok(`migrations apply twice, unchanged (${second.n} rows: 9 stories + 15 placeholders)`) : bad("idempotent", JSON.stringify({ first, second }));

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

// --- data -------------------------------------------------------------------------------------------------------
await t("9 published stories, all legacy slugs kept", () => db.query(`select slug from public.member_stories where status='published' order by legacy_id::int`),
  (r) => r.rows.length === 9 && r.rows[0].slug === "jos-week-long-adventure-at-isufst-philipines-" && r.rows[8].slug === "exchange-to-japan-with-english-dzakwaans-journey-at-tohoku-university" ? null : JSON.stringify(r.rows));
await t("18 image references kept (9 banners + 9 avatars)", () => db.query(`select count(banner_image)::int + count(author_avatar)::int n from public.member_stories where legacy_id is not null`), (r) => r.rows[0].n === 18 ? null : r.rows[0].n);
await t("Lounge + Speakers merged into 'circle' (5 stories), legacy value kept", () => db.query(`select category, count(*)::int n, string_agg(distinct legacy_subcategory, ',' order by legacy_subcategory) l from public.member_stories where legacy_id is not null group by 1 order by 1`),
  (r) => JSON.stringify(r.rows) === JSON.stringify([{ category: "circle", n: 5, l: "Lounge,Speakers" }, { category: "internals", n: 4, l: "Internals" }]) ? null : JSON.stringify(r.rows));
await t("15 placeholders across MY TH KH VN PH MM LA, no names", () => db.query(`select count(*)::int n, count(distinct target_country)::int c, max(length(author_name))::int l from public.member_stories where kind='placeholder'`),
  (r) => r.rows[0].n === 15 && r.rows[0].c === 7 && r.rows[0].l === 0 ? null : JSON.stringify(r.rows));
await t("initial admin granted by verified auth email (case-insensitive)", () => db.query(`select user_id from public.staff_roles`), (r) => r.rows.length === 1 && r.rows[0].user_id === ADMIN ? null : JSON.stringify(r.rows));

// --- anon -------------------------------------------------------------------------------------------------------
await t("anon reads 9 published stories from the view", () => as("anon", null, `select slug from public.published_member_stories`), (r) => r.rows.length === 9 ? null : r.rows.length);
await te("anon cannot read the stories table", () => as("anon", null, `select * from public.member_stories`), /permission denied/);
await te("anon cannot read submissions", () => as("anon", null, `select * from public.member_story_submissions`), /permission denied/);
await t("view hides editor columns", () => db.query(`select column_name from information_schema.columns where table_name='published_member_stories'`),
  (r) => r.rows.some((c) => ["editor_notes", "issues", "submission_id", "publication_authorized", "created_by"].includes(c.column_name)) ? "leaks" : null);
await t("anon is not admin", () => as("anon", null, `select public.is_story_admin() a`), (r) => r.rows[0].a === false ? null : "admin!");

// --- submission -------------------------------------------------------------------------------------------------
const sub = crypto.randomUUID();
const submit = (role, uid, id, extra = {}) => as(role, uid, `select public.submit_member_story($1, $2, $3, $4, $5::jsonb, $6::text[], $7, $8, $9) id`,
  [id, extra.name ?? "Test Person", extra.email ?? "t@example.test", "PH", JSON.stringify({ before: "x", city: "Cebu", role: "Student" }), extra.images ?? `{incoming/${id}/abcdefgh12.jpg}`, extra.review ?? true, false, true]);
await t("storage: anon uploads into a new submission folder", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('member-story-submissions', $1)`, [`incoming/${sub}/abcdefgh12.jpg`]));
await te("storage: anon cannot upload outside incoming/<uuid>/", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('member-story-submissions', 'x/evil.jpg')`), /row-level security/);
await te("storage: anon cannot upload .svg", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('member-story-submissions', $1)`, [`incoming/${sub}/abcdefgh12.svg`]), /row-level security/);
await te("storage: anon cannot write the public bucket", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('member-stories', 'stories/x.jpg')`), /row-level security/);
await t("storage: anon cannot read submitted images", () => as("anon", null, `select * from storage.objects where bucket_id='member-story-submissions'`), (r) => r.rows.length === 0 ? null : "visible");
await te("submission without review consent is refused", () => submit("anon", null, crypto.randomUUID(), { review: false }), /consent/);
await te("submission with a foreign image path is refused", () => submit("anon", null, crypto.randomUUID(), { images: `{incoming/${sub}/abcdefgh12.jpg}` }), /invalid image/);
await t("anon submits; stored pending with a pending_review story", () => submit("anon", null, sub), (r) => r.rows[0].id === sub ? null : JSON.stringify(r.rows));
await t("submission row is pending and story is pending_review", () => db.query(`select s.status, st.status st, st.issues from public.member_story_submissions s join public.member_stories st on st.id = s.story_id where s.id = $1`, [sub]),
  (r) => r.rows[0]?.status === "pending" && r.rows[0].st === "pending_review" && r.rows[0].issues.length === 1 ? null : JSON.stringify(r.rows));
await te("storage: no more files once submitted", () => as("anon", null, `insert into storage.objects (bucket_id, name) values ('member-story-submissions', $1)`, [`incoming/${sub}/zzzzzzzz12.jpg`]), /row-level security/);
const msub = crypto.randomUUID();
await t("member submits (user_id recorded)", () => submit("authenticated", MEMBER, msub, { images: "{}", email: "member@example.test" }));
await t("submission user_id = member", () => db.query(`select user_id from public.member_story_submissions where id = $1`, [msub]), (r) => r.rows[0].user_id === MEMBER ? null : JSON.stringify(r.rows));

// --- member -----------------------------------------------------------------------------------------------------
await t("member sees nothing in the stories table", () => as("authenticated", MEMBER, `select * from public.member_stories`), (r) => r.rows.length === 0 ? null : r.rows.length);
await t("member sees no submissions, not even their own", () => as("authenticated", MEMBER, `select * from public.member_story_submissions`), (r) => r.rows.length === 0 ? null : r.rows.length);
await t("member cannot publish their own submission (0 rows updated)", () => as("authenticated", MEMBER, `update public.member_stories set status='published', publication_authorized=true where submission_id = $1`, [msub]), (r) => r.affectedRows === 0 ? null : "updated");
await te("member cannot insert a published story", () => as("authenticated", MEMBER, `insert into public.member_stories (slug, title, author_name, status, publication_authorized) values ('x', 'x', 'x', 'published', true)`), /row-level security/);
await te("member cannot grant themselves admin", () => as("authenticated", MEMBER, `insert into public.staff_roles (user_id, role) values ($1, 'admin')`, [MEMBER]), /permission denied/);
await t("member edits their profile role/email and metadata: still not admin", async () => {
  await as("authenticated", MEMBER, `update public.users set role = 'admin', email = 'arbadzarido03@gmail.com' where id = $1`, [MEMBER]);
  await db.query(`update auth.users set raw_user_meta_data = '{"role":"admin","is_admin":true}' where id = $1`, [MEMBER]);
  return as("authenticated", MEMBER, `select public.is_story_admin() a`);
}, (r) => r.rows[0].a === false ? null : "became admin");
await t("re-running the migration with the member's changed email grants nothing new", async () => {
  for (const f of storyFiles) await db.exec(readFileSync(join(dir, f), "utf8"));
  return db.query(`select user_id from public.staff_roles`);
}, (r) => r.rows.length === 1 ? null : JSON.stringify(r.rows));
await t("unverified account with the admin email is not granted", async () => {
  await db.query(`update auth.users set email = 'arbadzarido03@gmail.com' where id = $1`, [UNCONF]);
  for (const f of storyFiles) await db.exec(readFileSync(join(dir, f), "utf8"));
  return db.query(`select count(*)::int n from public.staff_roles where user_id = $1`, [UNCONF]);
}, (r) => r.rows[0].n === 0 ? null : "granted");

// --- admin ------------------------------------------------------------------------------------------------------
await t("admin is admin", () => as("authenticated", ADMIN, `select public.is_story_admin() a`), (r) => r.rows[0].a === true ? null : "no");
await t("admin sees all 26 stories and 2 submissions", () => as("authenticated", ADMIN, `select (select count(*)::int from public.member_stories) s, (select count(*)::int from public.member_story_submissions) m`),
  (r) => r.rows[0].s === 26 && r.rows[0].m === 2 ? null : JSON.stringify(r.rows));
await t("storage: admin reads submitted images", () => as("authenticated", ADMIN, `select name from storage.objects where bucket_id='member-story-submissions'`), (r) => r.rows.length === 1 ? null : r.rows.length);
await t("storage: admin writes the public bucket", () => as("authenticated", ADMIN, `insert into storage.objects (bucket_id, name) values ('member-stories', 'stories/a/1.jpg')`));
await te("admin cannot publish without authorization", () => as("authenticated", ADMIN, `update public.member_stories set status='published' where submission_id = $1`, [sub]), /authorization/);
await te("admin cannot publish with private submission images", () => as("authenticated", ADMIN, `update public.member_stories set status='published', publication_authorized=true, banner_image='submission://incoming/x/y.jpg' where submission_id = $1`, [sub]), /approve the submitted images/);
await te("placeholders can never be published", () => as("authenticated", ADMIN, `update public.member_stories set status='published', publication_authorized=true where slug='placeholder-vn-1'`), /placeholder/);
await te("placeholder kind cannot be flipped to story", () => as("authenticated", ADMIN, `update public.member_stories set kind='story' where slug='placeholder-vn-1'`), /kind cannot be changed/);
await te("placeholder cannot go to pending_review either", () => as("authenticated", ADMIN, `update public.member_stories set status='pending_review' where slug='placeholder-vn-1'`), /placeholder_never_public/);
await t("admin publishes an authorized submission story", () => as("authenticated", ADMIN, `update public.member_stories set status='published', publication_authorized=true, slug='test-story' where submission_id = $1 returning published_at`, [sub]), (r) => r.rows[0]?.published_at ? null : "no published_at");
await t("anon now sees 10 published stories", () => as("anon", null, `select count(*)::int n from public.published_member_stories`), (r) => r.rows[0].n === 10 ? null : r.rows[0].n);

// --- slugs & redirects ------------------------------------------------------------------------------------------
const OLD = "jos-week-long-adventure-at-isufst-philipines-";
await t("slug change records a redirect", async () => {
  await as("authenticated", ADMIN, `update public.member_stories set slug = 'jos-week-in-iloilo' where slug = $1`, [OLD]);
  return as("anon", null, `select slug from public.published_member_story_redirects where old_slug = $1`, [OLD]);
}, (r) => r.rows[0]?.slug === "jos-week-in-iloilo" ? null : JSON.stringify(r.rows));
await te("another story cannot take a slug held as a redirect", () => as("authenticated", ADMIN, `update public.member_stories set slug = $1 where slug = 'test-story'`, [OLD]), /redirect/);
await te("duplicate live slug is refused", () => as("authenticated", ADMIN, `update public.member_stories set slug = 'jos-week-in-iloilo' where slug = 'test-story'`), /duplicate key|unique/);
await t("renaming back restores the original slug and keeps the other as redirect", async () => {
  await as("authenticated", ADMIN, `update public.member_stories set slug = $1 where slug = 'jos-week-in-iloilo'`, [OLD]);
  return db.query(`select old_slug from public.member_story_redirects r join public.member_stories s on s.id = r.story_id where s.slug = $1`, [OLD]);
}, (r) => r.rows.length === 1 && r.rows[0].old_slug === "jos-week-in-iloilo" ? null : JSON.stringify(r.rows));
await t("unpublished story disappears from the public view and its redirects", async () => {
  await as("authenticated", ADMIN, `update public.member_stories set status = 'archived' where slug = $1`, [OLD]);
  return as("anon", null, `select (select count(*)::int from public.published_member_stories where slug = $1) a, (select count(*)::int from public.published_member_story_redirects where slug = $1) b`, [OLD]);
}, (r) => r.rows[0].a === 0 && r.rows[0].b === 0 ? null : JSON.stringify(r.rows));
await t("re-running seed does not resurrect an archived story or overwrite edits", async () => {
  for (const f of storyFiles) await db.exec(readFileSync(join(dir, f), "utf8"));
  return db.query(`select status from public.member_stories where legacy_id = '1'`);
}, (r) => r.rows[0].status === "archived" ? null : r.rows[0].status);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
