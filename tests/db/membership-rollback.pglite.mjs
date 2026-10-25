// Not part of `npm test` (needs @electric-sql/pglite): copy next to a PGlite install and run with the repo path.
// Applies every IELSco migration on PGlite (with storage + supabase_migrations stubs), snapshots the catalog, applies the
// two membership migrations, runs the rollback script, and checks the catalog is back to the snapshot.
// Usage: node --liftoff-only test-membership-rollback.mjs <repo>
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
const release = files.filter((f) => f >= "20261026");
for (const f of files.filter((f) => f < "20261026")) await db.exec(readFileSync(join(dir, f), "utf8"));
const snap = async () => (await db.query(`select string_agg(x, ',' order by x) s from (
  select 'rel:' || c.relname x from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
  union all select 'fn:' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
  union all select 'pol:' || tablename || '.' || policyname from pg_policies where schemaname = 'public'
  union all select 'trg:' || tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not tgisinternal) q`)).rows[0].s;
const before = await snap();
for (const f of release) {
  await db.exec(readFileSync(join(dir, f), "utf8"));
  await db.query("insert into supabase_migrations.schema_migrations (version, name) values ($1, $2)", [f.slice(0, 14), f.slice(15, -4)]);
}
const during = await snap();
await db.exec(readFileSync(join(repo, "supabase", "manual", "ROLLBACK-20261026-membership-platform.sql"), "utf8"));
const after = await snap();
const hist = (await db.query("select count(*)::int n from supabase_migrations.schema_migrations where version >= '20261026'")).rows[0].n;
const ok = before === after && during !== before && hist === 0;
console.log(ok ? "PASS rollback restores the pre-release catalog exactly (and removes the history rows)" : "FAIL", { changed: during !== before, restored: before === after, hist });
process.exit(ok ? 0 : 1);
