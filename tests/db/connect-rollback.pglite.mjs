// Not part of `npm test` (needs @electric-sql/pglite): copy next to a PGlite install and run with the repo path.
// Applies every migration before Connect on PGlite, snapshots the catalog (incl. member_profiles columns), applies the three
// Connect migrations, runs supabase/manual/ROLLBACK-20261028-connect.sql, and checks the catalog is back to the snapshot.
// Usage: node --liftoff-only connect-rollback.pglite.mjs <repo>
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const repo = process.argv[2];
const dir = join(repo, "supabase", "migrations");
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  create table public.users (id uuid primary key, full_name text, avatar_url text, domicile text, occupation text, linkedin text, instagram text, english_level text, phone text, institution_name text, institution_role text, role text, email text);
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.extension(name text) returns text language sql immutable as $$ select reverse(split_part(reverse(name), '.', 1)) $$;
  alter table storage.objects enable row level security; grant usage on schema storage to anon, authenticated;
  create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const release = files.filter((f) => f >= "20261028000000" && f < "20261028030000");
for (const f of files.filter((f) => f < "20261028")) await db.exec(readFileSync(join(dir, f), "utf8"));
const snap = async () => (await db.query(`select string_agg(x, ',' order by x) s from (
  select 'rel:' || c.relname x from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
  union all select 'col:' || table_name || '.' || column_name || ':' || data_type from information_schema.columns where table_schema = 'public'
  union all select 'con:' || conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public'
  union all select 'fn:' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all select 'pol:' || tablename || '.' || policyname from pg_policies where schemaname = 'public'
  union all select 'trg:' || tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not tgisinternal) q`)).rows[0].s;
const before = await snap();
for (const f of release) {
  await db.exec(readFileSync(join(dir, f), "utf8"));
  await db.query("insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)", [f.slice(0, 14), f.slice(15, -4)]);
}
const during = await snap();
// Circles on top of Connect: its own rollback must bring back exactly the Connect catalog.
for (const f of files.filter((f) => f >= "20261029000000" && f < "20261030")) {
  await db.exec(readFileSync(join(dir, f), "utf8"));
  await db.query("insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)", [f.slice(0, 14), f.slice(15, -4)]);
}
const withCircles = await snap();
await db.exec(readFileSync(join(repo, "supabase", "manual", "ROLLBACK-20261029-circles.sql"), "utf8"));
const circlesOk = withCircles !== during && (await snap()) === during;
console.log(circlesOk ? "PASS Circles rollback restores the Connect catalog exactly" : "FAIL Circles rollback");
if (!circlesOk) process.exitCode = 1;

await db.exec(readFileSync(join(repo, "supabase", "manual", "ROLLBACK-20261028-connect.sql"), "utf8"));
const after = await snap();
const hist = (await db.query("select count(*)::int n from supabase_migrations.schema_migrations where version >= '20261028'")).rows[0].n;
const ok = release.length === 3 && before === after && during !== before && hist === 0;
if (!ok && before !== after) {
  const a = new Set(before.split(",")), b = new Set(after.split(","));
  console.log("left over:", [...b].filter((x) => !a.has(x)), "missing:", [...a].filter((x) => !b.has(x)));
}
console.log(ok ? "PASS Connect rollback restores the pre-Connect catalog exactly (and removes the history rows)" : "FAIL", { files: release.length, changed: during !== before, restored: before === after, hist });
process.exit(ok && !process.exitCode ? 0 : 1);
