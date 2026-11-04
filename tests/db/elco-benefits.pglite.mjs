// Elco benefits migration (20261105000000) on PGlite with Supabase-like roles: idempotent events, newest version wins,
// identity only through the account link (pending_link -> attach on link -> detach on revoke), Speaking Club / mentoring
// quotas in register_member_session, members-only rules unchanged for everyone else, rollback.
// Not part of `npm test`. Copy next to a PGlite install (workspace/local-stack/tests/) and run:
//   node elco-benefits.pglite.mjs <repo>/supabase/migrations <repo>/supabase/manual/ROLLBACK-20261105-elco-benefits.sql
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const [dir, rollback] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", MEMBER = "22222222-2222-2222-2222-222222222222", STARTER = "33333333-3333-3333-3333-333333333333",
  PRO = "44444444-4444-4444-4444-444444444444", NOBODY = "55555555-5555-5555-5555-555555555555";
const E_STARTER = "aaaaaaaa-0000-4000-8000-000000000003", E_PRO = "aaaaaaaa-0000-4000-8000-000000000004", E_UNLINKED = "aaaaaaaa-0000-4000-8000-000000000009";
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
  create table public.users (id uuid primary key, full_name text);
  create table public.staff_roles (user_id uuid primary key references auth.users(id) on delete cascade, role text not null check (role in ('admin')), granted_at timestamptz not null default now(), note text);
  insert into auth.users (id, email, email_confirmed_at) values ('${ADMIN}','a@x.test',now()), ('${MEMBER}','m@x.test',now()), ('${STARTER}','s@x.test',now()), ('${PRO}','p@x.test',now()), ('${NOBODY}','n@x.test',now());
  insert into public.staff_roles (user_id, role) values ('${ADMIN}', 'admin');`);
// The tables this migration builds on: Elco links (20261017010000) and the membership platform (20261026000000).
const base = readdirSync(dir).filter((f) => f.endsWith(".sql") && f.startsWith("20261026000000")).sort();
for (const f of base) await db.exec(readFileSync(join(dir, f), "utf8"));
// elco_account_links exactly as 20261017010000 creates it (that file's functions need tables outside this test).
await db.exec(`create table if not exists public.elco_account_links (id uuid primary key default gen_random_uuid(),
  ielsco_user_id uuid not null references auth.users(id) on delete cascade, elco_user_id uuid not null,
  scopes text[] not null check (cardinality(scopes) between 1 and 2 and scopes <@ array['goals:read', 'summary:write']::text[]),
  created_at timestamptz not null default now(), revoked_at timestamptz);
  create unique index if not exists elco_account_links_one_active_ielsco on public.elco_account_links (ielsco_user_id) where revoked_at is null;
  create unique index if not exists elco_account_links_one_active_elco on public.elco_account_links (elco_user_id) where revoked_at is null;`);
const mig = [readFileSync(join(dir, "20261105000000_elco_benefits.sql"), "utf8"), readFileSync(join(dir, "20261105010000_elco_identity_exam_access.sql"), "utf8")].join(";\n");
await db.exec(mig);
await db.exec(mig);  // re-runnable (both migrations, in order)
ok("migration applies and re-runs cleanly");
await db.exec(`grant all on all tables in schema public to service_role;`);

async function as(role, uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const svc = (sql, p) => as("service_role", "", sql, p);
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 50)})`) : bad(n, e.message); } };
let ver = 1_000_000;
const ev = (o) => ({ event_id: randomUUID(), version: ++ver, link_id: null, source: "purchase", status: "active", order_ref: "ELCO-TEST",
  starts_at: new Date(Date.now() - 3600e3).toISOString(), ends_at: new Date(Date.now() + 30 * 86400e3).toISOString(), sc: null, mt: 0, ...o });
const apply = (e) => svc(`select public.apply_elco_benefit($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) r`,
  [e.event_id, e.grant_id, e.version, e.elco_user_id, e.link_id, e.tier, e.source, e.status, e.starts_at, e.ends_at, e.sc, e.mt, e.order_ref]).then((r) => r.rows[0].r);

// links: STARTER and PRO are linked; E_UNLINKED is not linked yet
const L_S = randomUUID(), L_P = randomUUID();
await svc(`insert into public.elco_account_links (id, ielsco_user_id, elco_user_id, scopes) values ($1,$2,$3,'{goals:read}'), ($4,$5,$6,'{goals:read}')`, [L_S, STARTER, E_STARTER, L_P, PRO, E_PRO]);

const G_S = randomUUID(), G_P = randomUUID(), G_U = randomUUID();
const s1 = ev({ grant_id: G_S, elco_user_id: E_STARTER, link_id: L_S, tier: "starter", sc: 12 });
await t("starter grant for a linked member -> active", () => apply(s1), (r) => r === "active" ? null : r);
await t("same event again -> duplicate (idempotent)", () => apply(s1), (r) => r === "duplicate" ? null : r);
await t("older version of the same grant -> stale", () => apply({ ...s1, event_id: randomUUID(), version: s1.version - 10, status: "refunded" }), (r) => r === "stale" ? null : r);
await t("grant id owned by another Elco user -> invalid", () => apply({ ...s1, event_id: randomUUID(), version: ++ver, elco_user_id: E_PRO }), (r) => r === "invalid" ? null : r);
await t("a link id that isn't this user's link -> no account (pending_link)", () => apply(ev({ grant_id: randomUUID(), elco_user_id: E_STARTER, link_id: L_P, tier: "starter", sc: 12 })), (r) => r === "pending_link" ? null : r);
await t("pro grant -> active", () => apply(ev({ grant_id: G_P, elco_user_id: E_PRO, link_id: L_P, tier: "pro", sc: null, mt: 4 })), (r) => r === "active" ? null : r);
await t("unlinked Elco user -> pending_link (never matched by email)", () => apply(ev({ grant_id: G_U, elco_user_id: E_UNLINKED, tier: "pro", mt: 4 })), (r) => r === "pending_link" ? null : r);
await te("anon / members can't call apply_elco_benefit", () => as("authenticated", STARTER, `select public.apply_elco_benefit('${randomUUID()}','${randomUUID()}',1,'${E_STARTER}',null,'pro','purchase','active',now(),now()+interval '1 day',null,4,null)`), /permission denied/);
await t("events are logged with outcomes", () => svc(`select count(*)::int n, count(*) filter (where outcome='processing')::int p from public.elco_benefit_events`), (r) => r.rows[0].n >= 6 && r.rows[0].p === 0 ? null : JSON.stringify(r.rows[0]));

// sessions: members-only speaking club x 13, mentoring x 5, a members-only workshop
await svc(`insert into public.member_sessions (id, title, kind, starts_at, members_only, capacity, join_url, status)
  select gen_random_uuid(), 'Speaking club '||g, 'speaking_club', date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta' + interval '20 days' + make_interval(hours => g), true, 20, 'https://meet.example.test/sc', 'scheduled' from generate_series(1, 13) g`);
await svc(`insert into public.member_sessions (id, title, kind, starts_at, members_only, capacity, join_url, status)
  select gen_random_uuid(), 'Mentoring '||g, 'mentoring', date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta' + interval '21 days' + make_interval(hours => g), true, 1, 'https://meet.example.test/m', 'scheduled' from generate_series(1, 5) g`);
await svc(`insert into public.member_sessions (title, kind, starts_at, members_only, capacity, join_url, status) values ('Workshop', 'workshop', now() + interval '2 days', true, 10, 'https://meet.example.test/w', 'scheduled')`);
// Some sessions may fall in the past early in a month; keep only future ones in the checks.
const ids = async (kind) => (await svc(`select id from public.member_sessions where kind=$1 and starts_at > now() order by starts_at`, [kind])).rows.map((r) => r.id);
const sc = await ids("speaking_club"), me = await ids("mentoring"), ws = await ids("workshop");
const reg = (uid, sid) => as("authenticated", uid, `select public.register_member_session($1) r`, [sid]).then((r) => r.rows[0].r);
let n = 0;
for (const sid of sc.slice(0, 12)) { try { if ((await reg(STARTER, sid)) === "registered") n++; } catch { /* quota */ } }
n === Math.min(12, sc.length) ? ok(`Starter registers for members-only Speaking Club up to the quota (${n})`) : bad("starter quota", n);
if (sc.length >= 13) await te("13th Speaking Club session this month refused for Starter", () => reg(STARTER, sc[12]), /elco_quota_used/);
await te("Starter can't take mentoring (not in the plan)", () => reg(STARTER, me[0]), /elco_not_included/);
await te("Elco benefits don't open other members-only sessions (workshop)", () => reg(PRO, ws[0]), /members_only/);
await t("Pro: Speaking Club without a monthly cap", () => reg(PRO, sc[12] || sc[0]), (r) => r === "registered" ? null : r);
let m = 0;
for (const sid of me.slice(0, 4)) { try { if ((await reg(PRO, sid)) === "registered") m++; } catch { /* quota */ } }
m === Math.min(4, me.length) ? ok(`Pro books mentoring up to 4 a month (${m})`) : bad("pro mentoring", m);
if (me.length >= 5) await te("5th mentoring session refused", () => reg(PRO, me[4]), /elco_quota_used/);
await t("join link revealed to the registered benefit holder", () => as("authenticated", PRO, `select public.member_session_join_url($1) u`, [sc[12] || sc[0]]), (r) => r.rows[0].u ? null : "no link");
await te("no benefit, no membership: still members_only", () => reg(NOBODY, sc[0]), /members_only/);
await t("my_elco_benefits for the member", () => as("authenticated", PRO, `select public.my_elco_benefits() b`), (r) => r.rows[0].b.tier === "pro" && r.rows[0].b.mentoring_per_month === 4 ? null : JSON.stringify(r.rows[0].b));
await t("members see only their own grants, without the Elco user id", () => as("authenticated", STARTER, `select grant_id, tier from public.elco_benefit_grants`), (r) => r.rows.length === 1 ? null : r.rows.length);
await te("members can't read the Elco user id column", () => as("authenticated", STARTER, `select elco_user_id from public.elco_benefit_grants`), /permission denied/);
await t("benefits are not IELS membership (no membership_periods written)", () => svc(`select count(*)::int n from public.membership_periods`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);

// linking later attaches the pending grant; revoking detaches it
const L_U = randomUUID();
await svc(`insert into public.elco_account_links (id, ielsco_user_id, elco_user_id, scopes) values ($1,$2,$3,'{goals:read}')`, [L_U, NOBODY, E_UNLINKED]);
await t("link created -> the pending grant attaches", () => as("authenticated", NOBODY, `select public.my_elco_benefits() b`), (r) => r.rows[0].b.active && r.rows[0].b.tier === "pro" ? null : JSON.stringify(r.rows[0].b));
await svc(`update public.elco_account_links set revoked_at = now() where id = $1`, [L_U]);
await t("link revoked -> the grant detaches", () => as("authenticated", NOBODY, `select public.my_elco_benefits() b`), (r) => r.rows[0].b.active === false ? null : JSON.stringify(r.rows[0].b));

// refund / expiry
await t("refund event (newer version) -> revoked", () => apply({ ...ev({ grant_id: G_P, elco_user_id: E_PRO, link_id: L_P, tier: "pro", mt: 4 }), status: "refunded" }), (r) => r === "revoked" ? null : r);
await t("after refund the member has no live benefit", () => as("authenticated", PRO, `select public.my_elco_benefits() b`), (r) => r.rows[0].b.active === false ? null : JSON.stringify(r.rows[0].b));
await t("expired grant (ends in the past) gives no access", () => apply({ ...ev({ grant_id: G_S, elco_user_id: E_STARTER, link_id: L_S, tier: "starter", sc: 12 }), starts_at: new Date(Date.now() - 40 * 86400e3).toISOString(), ends_at: new Date(Date.now() - 86400e3).toISOString() })
  .then(() => as("authenticated", STARTER, `select public.my_elco_benefits() b`)), (r) => r.rows[0].b.active === false ? null : JSON.stringify(r.rows[0].b));

// exam passes (migration 20261105010000): shown on IELSco, never a session quota
const G_X = randomUUID();
const exam = (o) => svc(`select public.apply_elco_benefit($1,$2,$3,$4,$5,'exam','purchase',$6,now() - interval '1 hour', now() + interval '180 days',null,0,'ELCO-X',$7) r`,
  [randomUUID(), G_X, ++ver, E_STARTER, L_S, o.status || "active", o.modes]).then((r) => r.rows[0].r);
await t("exam pass grant (all three exams) -> active", () => exam({ modes: ["toefl", "ielts", "toeic"] }), (r) => r === "active" ? null : r);
await t("exam grant without modes -> invalid", () => svc(`select public.apply_elco_benefit($1,$2,1,$3,null,'exam','purchase','active',now(),now()+interval '1 day',null,0,null,'{}') r`, [randomUUID(), randomUUID(), E_STARTER]), (r) => r.rows[0].r === "invalid" ? null : r.rows[0].r);
await t("my_elco_benefits lists exam access and the link", () => as("authenticated", STARTER, `select public.my_elco_benefits() b`),
  (r) => r.rows[0].b.linked === true && r.rows[0].b.exams.length === 1 && r.rows[0].b.exams[0].modes.length === 3 ? null : JSON.stringify(r.rows[0].b));
await t("an exam pass alone never opens Speaking Club (quota stays Starter/Pro)", () => svc(`select count(*)::int n from public.elco_benefit_now($1)`, [STARTER]), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);
await svc(`update public.elco_account_links set elco_display_name = 'Nadia (Elco)' where id = $1`, [L_S]);
await t("member reads the Elco display name of their link", () => as("authenticated", STARTER, `select elco_display_name from public.elco_account_links where revoked_at is null`), (r) => r.rows[0]?.elco_display_name === "Nadia (Elco)" ? null : JSON.stringify(r.rows));

// regression: an IELS member still registers for any members-only session
await svc(`insert into public.membership_periods (user_id, source, starts_at, ends_at, note) values ($1, 'staff_grant', now() - interval '1 day', now() + interval '30 days', 'test')`, [MEMBER]);
await t("regression: IELS members register for members-only workshops", () => reg(MEMBER, ws[0]), (r) => r === "registered" ? null : r);

if (rollback) {
  await db.exec(readFileSync(rollback.replace("ROLLBACK-20261105-elco-benefits.sql", "ROLLBACK-20261105010000-elco-identity-exam-access.sql"), "utf8"));
  await db.exec(readFileSync(rollback, "utf8"));
  await t("rollback removes the tables and restores the session functions", () => db.query(`select to_regclass('public.elco_benefit_grants') g, pg_get_functiondef('public.register_member_session(uuid)'::regprocedure) f`),
    (r) => r.rows[0].g === null && !/elco_benefit/.test(r.rows[0].f) ? null : "still there");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
