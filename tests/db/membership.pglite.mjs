// Membership platform migrations + RLS + payment state machine on PGlite (real Postgres in WASM), Supabase-like roles.
// Not part of `npm test` (needs @electric-sql/pglite, which the repo does not install). Copy it next to a PGlite install
// (e.g. workspace/local-stack/tests/) and run:  node --liftoff-only membership.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const ADMIN = "11111111-1111-1111-1111-111111111111", MEMBER = "22222222-2222-2222-2222-222222222222", FREE = "33333333-3333-3333-3333-333333333333";
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
  insert into auth.users (id, email, email_confirmed_at) values
    ('${ADMIN}', 'admin@example.test', now()), ('${MEMBER}', 'member@example.test', now()), ('${FREE}', 'free@example.test', now());
  insert into public.users values ('${MEMBER}', 'Paid Member'), ('${FREE}', 'Free Person');
  insert into public.staff_roles (user_id, role) values ('${ADMIN}', 'admin');`);

const files = readdirSync(dir).filter((f) => f >= "20261026" && f.endsWith(".sql")).sort();
for (const f of files) await db.exec(readFileSync(join(dir, f), "utf8"));
await db.exec(`grant all on all tables in schema public to service_role;`);
const count = async (t) => (await db.query(`select count(*)::int n from public.${t}`)).rows[0].n;
const before = [await count("membership_plans"), await count("opportunities")];
for (const f of files) await db.exec(readFileSync(join(dir, f), "utf8"));
const after = [await count("membership_plans"), await count("opportunities")];
JSON.stringify(before) === JSON.stringify(after) && after[0] === 2 && after[1] === 12
  ? ok(`migrations re-run cleanly (${after[0]} plans, ${after[1]} opportunities)`) : bad("idempotent", JSON.stringify({ before, after }));

async function as(role, uid, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 60)})`) : bad(n, e.message); } };
const svc = (sql, p) => as("service_role", "", sql, p);
const pay = (order, result, gross) => svc(`select public.apply_membership_payment($1,$2,$3,'IDR','tx-1','bank_transfer',$2,null) r`, [order, result, gross]).then((r) => r.rows[0].r);
const order = async (id, uid, plan = "member-3m", months = 3, amount = 129000) =>
  svc(`insert into public.membership_orders (order_id, user_id, plan_code, months, amount_idr, environment, status) values ($1,$2,$3,$4,$5,'sandbox','pending')`, [id, uid, plan, months, amount]);

// --- catalog ------------------------------------------------------------------------------------------------------
await t("plans ship with billing disabled", () => db.query(`select bool_or(billing_enabled) b from public.membership_plans`), (r) => r.rows[0].b ? "billing on" : null);
await t("anon can read public plans", () => as("anon", "", `select code from public.membership_plans`), (r) => r.rows.length === 2 ? null : r.rows.length);
await te("anon cannot change a price", () => as("anon", "", `update public.membership_plans set price_idr = 1000`), /permission denied/);
await te("member cannot change a price", () => as("authenticated", MEMBER, `update public.membership_plans set price_idr = 1000`), /permission denied/);
await t("anon sees only published opportunities", () => as("anon", "", `select count(*)::int n from public.opportunities where status <> 'published'`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);
await t("no seeded opportunity invents a deadline (only GIF's confirmed one)", () => db.query(`select slug from public.opportunities where deadline is not null`),
  (r) => JSON.stringify(r.rows.map((x) => x.slug)) === '["gif-singapore"]' ? null : JSON.stringify(r.rows));

// --- orders / payment state machine -------------------------------------------------------------------------------
await te("members cannot create orders themselves", () => as("authenticated", MEMBER,
  `insert into public.membership_orders (order_id, user_id, plan_code, months, amount_idr, environment) values ('IELS-M-261026-AAAAAAAAAA','${MEMBER}','member-3m',3,1000,'sandbox')`), /permission denied/);
await te("members cannot call apply_membership_payment", () => as("authenticated", MEMBER, `select public.apply_membership_payment('x','paid',1,'IDR',null,null,null,null)`), /permission denied/);
await te("members cannot write their own membership period", () => as("authenticated", MEMBER,
  `insert into public.membership_periods (user_id, source, starts_at, ends_at) values ('${MEMBER}','staff_grant',now(),now()+interval '1 year')`), /permission denied/);

await order("IELS-M-261026-0000000001", MEMBER);
await t("not a member before payment", () => as("authenticated", MEMBER, `select public.is_active_member() m`), (r) => r.rows[0].m ? "active" : null);
await t("pending status is recorded", () => pay("IELS-M-261026-0000000001", "pending", 129000), (r) => r === "pending" ? null : r);
await t("wrong amount never activates", () => pay("IELS-M-261026-0000000001", "paid", 1000), (r) => r === "amount_mismatch" ? null : r);
await t("verified payment activates", () => pay("IELS-M-261026-0000000001", "paid", 129000), (r) => r === "activated" ? null : r);
await t("duplicate notification is a no-op", () => pay("IELS-M-261026-0000000001", "paid", 129000), (r) => r === "already_paid" ? null : r);
await t("late 'pending' after payment is ignored", () => pay("IELS-M-261026-0000000001", "pending", 129000), (r) => r === "ignored_stale" ? null : r);
await t("exactly one period for the order", () => db.query(`select count(*)::int n from public.membership_periods where order_id='IELS-M-261026-0000000001'`), (r) => r.rows[0].n === 1 ? null : r.rows[0].n);
await t("member is active, ~3 months", () => as("authenticated", MEMBER, `select public.my_membership() m`),
  (r) => { const m = r.rows[0].m; const d = (Date.parse(m.access_until) - Date.now()) / 864e5; return m.active && d > 88 && d < 93 ? null : JSON.stringify(m); });
await t("member reads own order, not others'", () => as("authenticated", FREE, `select count(*)::int n from public.membership_orders`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);

await order("IELS-M-261026-0000000002", MEMBER, "member-12m", 12, 399000);
await t("early renewal activates", () => pay("IELS-M-261026-0000000002", "paid", 399000), (r) => r === "activated" ? null : r);
await t("renewal starts when the current period ends (no lost days)", () => as("authenticated", MEMBER, `select public.my_membership() m`),
  (r) => { const d = (Date.parse(r.rows[0].m.access_until) - Date.now()) / 864e5; return d > 450 && d < 460 ? null : d; });
await t("refund of the renewal revokes only that period", () => pay("IELS-M-261026-0000000002", "refunded", 399000), (r) => r === "revoked" ? null : r);
await t("still active on the first period after the refund", () => as("authenticated", MEMBER, `select public.my_membership() m`),
  (r) => { const m = r.rows[0].m; const d = (Date.parse(m.access_until) - Date.now()) / 864e5; return m.active && d > 88 && d < 93 ? null : JSON.stringify(m); });
await t("payment after refund doesn't re-grant", () => pay("IELS-M-261026-0000000002", "paid", 399000), (r) => r.startsWith("ignored_after") ? null : r);
await t("unknown order", () => pay("IELS-M-261026-FFFFFFFFFF", "paid", 1), (r) => r === "unknown_order" ? null : r);
await order("IELS-M-261026-0000000003", FREE);
await t("expired order stays unpaid", () => pay("IELS-M-261026-0000000003", "expired", 129000), (r) => r === "expired" ? null : r);
await t("free user still not a member", () => as("authenticated", FREE, `select public.is_active_member() m`), (r) => r.rows[0].m ? "active" : null);

// --- member-only features -----------------------------------------------------------------------------------------
await svc(`insert into public.member_links (key, label, url) values ('community', 'Member group', 'https://chat.example.test/invite')`);
await t("member sees the community link", () => as("authenticated", MEMBER, `select url from public.member_links`), (r) => r.rows.length === 1 ? null : r.rows.length);
await t("free user does not", () => as("authenticated", FREE, `select url from public.member_links`), (r) => r.rows.length === 0 ? null : r.rows.length);
await t("anon does not", () => as("anon", "", `select url from public.member_links`).catch(() => ({ rows: [] })), (r) => r.rows.length === 0 ? null : r.rows.length);

const sid = (await svc(`insert into public.member_sessions (title, kind, starts_at, capacity, join_url) values ('CV clinic','application_clinic', now() + interval '2 days', 1, 'https://meet.example.test/x') returning id`)).rows[0].id;
await t("anon sees the schedule without join links", () => as("anon", "", `select * from public.list_member_sessions(10)`),
  (r) => r.rows.length === 1 && !("join_url" in r.rows[0]) ? null : JSON.stringify(r.rows));
await te("anon cannot read the sessions table", () => as("anon", "", `select join_url from public.member_sessions`), /permission denied/);
await te("free user can't register for a members-only session", () => as("authenticated", FREE, `select public.register_member_session($1)`, [sid]), /members_only/);
await t("member registers", () => as("authenticated", MEMBER, `select public.register_member_session($1) r`, [sid]), (r) => r.rows[0].r === "registered" ? null : r.rows[0].r);
await t("registering twice is harmless", () => as("authenticated", MEMBER, `select public.register_member_session($1) r`, [sid]), (r) => r.rows[0].r === "already_registered" ? null : r.rows[0].r);
await t("registered member gets the join link", () => as("authenticated", MEMBER, `select public.member_session_join_url($1) u`, [sid]), (r) => r.rows[0].u ? null : "no link");
await t("free user gets no join link", () => as("authenticated", FREE, `select public.member_session_join_url($1) u`, [sid]), (r) => r.rows[0].u ? "leaked" : null);
await svc(`update public.member_sessions set members_only = false where id = $1`, [sid]);
await te("capacity is enforced", () => as("authenticated", FREE, `select public.register_member_session($1)`, [sid]), /full/);

await te("free user can't request feedback", () => as("authenticated", FREE, `select public.request_feedback('cv','https://docs.example.test/cv',null,null)`), /members_only/);
await te("feedback needs an https link", () => as("authenticated", MEMBER, `select public.request_feedback('cv','http://x.test',null,null)`), /check constraint/);
await t("member requests a CV review", () => as("authenticated", MEMBER, `select public.request_feedback('cv','https://docs.example.test/cv','Chevening','') id`), (r) => r.rows[0].id ? null : "no id");
await te("second request within 90 days is refused", () => as("authenticated", MEMBER, `select public.request_feedback('essay','https://docs.example.test/e',null,null)`), /limit_reached/);
await t("member can't mark their own review returned (RLS: 0 rows)", () => as("authenticated", MEMBER, `update public.feedback_requests set status='returned' returning id`), (r) => r.rows.length === 0 ? null : "updated");
await t("admin returns the review", () => as("authenticated", ADMIN, `update public.feedback_requests set status='returned', reviewer_note='Good start', returned_at=now() returning id`), (r) => r.rows.length === 1 ? null : r.rows.length);

await te("free user can't request a buddy", () => as("authenticated", FREE, `select public.request_buddy('study in Japan')`), /members_only/);
await t("member requests a buddy", () => as("authenticated", MEMBER, `select public.request_buddy('study in Japan') s`), (r) => r.rows[0].s === "waiting" ? null : r.rows[0].s);
await t("free user can't see buddy requests", () => as("authenticated", FREE, `select count(*)::int n from public.buddy_requests`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);

// --- tracker cap ----------------------------------------------------------------------------------------------------
const opps = (await db.query(`select id from public.opportunities order by slug`)).rows.map((r) => r.id);
await t("free user tracks 10 opportunities", async () => { for (const id of opps.slice(0, 10)) await as("authenticated", FREE, `insert into public.opportunity_tracker (opportunity_id) values ($1)`, [id]); return as("authenticated", FREE, `select count(*)::int n from public.opportunity_tracker`); }, (r) => r.rows[0].n === 10 ? null : r.rows[0].n);
await te("11th is refused for a free account", () => as("authenticated", FREE, `insert into public.opportunity_tracker (opportunity_id) values ($1)`, [opps[10]]), /tracker_limit/);
await t("members are not capped", async () => { for (const id of opps.slice(0, 12)) await as("authenticated", MEMBER, `insert into public.opportunity_tracker (opportunity_id) values ($1)`, [id]); return as("authenticated", MEMBER, `select count(*)::int n from public.opportunity_tracker`); }, (r) => r.rows[0].n === 12 ? null : r.rows[0].n);
await te("can't track for someone else", () => as("authenticated", MEMBER, `insert into public.opportunity_tracker (user_id, opportunity_id) values ('${FREE}', $1)`, [opps[11]]), /row-level security/);
await t("trackers are private", () => as("authenticated", FREE, `select count(*)::int n from public.opportunity_tracker`), (r) => r.rows[0].n === 10 ? null : r.rows[0].n);

// --- inquiries / staff ----------------------------------------------------------------------------------------------
await t("anon submits a partnership inquiry", () => as("anon", "", `select public.submit_inquiry('partner','Dewi','Dewi@Example.test','Uni X',null,null,'events','Hello') id`), (r) => r.rows[0].id ? null : "no id");
await te("invalid email refused", () => as("anon", "", `select public.submit_inquiry('school','Dewi','not-an-email',null,null,null,null,null)`), /check constraint/);
await te("unknown inquiry kind refused", () => as("anon", "", `select public.submit_inquiry('spam','Dewi','d@example.test',null,null,null,null,null)`), /check constraint/);
await te("flood control: 6th inquiry per email per day", async () => { for (let i = 0; i < 6; i++) await as("anon", "", `select public.submit_inquiry('careers','Bot','bot@example.test',null,null,null,null,null)`); }, /too_many/);
await te("anon can't read inquiries", () => as("anon", "", `select * from public.inquiries`), /permission denied/);
await t("members can't read inquiries", () => as("authenticated", MEMBER, `select count(*)::int n from public.inquiries`), (r) => r.rows[0].n === 0 ? null : r.rows[0].n);
await t("admin reads inquiries", () => as("authenticated", ADMIN, `select count(*)::int n from public.inquiries`), (r) => r.rows[0].n === 6 ? null : r.rows[0].n);
await te("member can't grant memberships", () => as("authenticated", MEMBER, `select public.grant_staff_membership('free@example.test', 3, 'x')`), /not allowed/);
await te("staff grant needs a reason", () => as("authenticated", ADMIN, `select public.grant_staff_membership('free@example.test', 3, '')`), /reason/);
await t("admin grants a 3-month membership", () => as("authenticated", ADMIN, `select public.grant_staff_membership('FREE@example.test', 3, 'Partner scholarship') id`), (r) => r.rows[0].id ? null : "no id");
await t("granted user is now active", () => as("authenticated", FREE, `select public.is_active_member() m`), (r) => r.rows[0].m ? null : "inactive");
await te("non-admin can't read the roster", () => as("authenticated", MEMBER, `select * from public.admin_membership_roster()`), /not allowed/);
await t("admin roster lists both members", () => as("authenticated", ADMIN, `select email, status from public.admin_membership_roster()`), (r) => r.rows.length === 2 && r.rows.every((x) => x.status === "active") ? null : JSON.stringify(r.rows));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
