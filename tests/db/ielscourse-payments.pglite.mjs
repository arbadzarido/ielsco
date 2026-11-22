// IELScourse payments (20261210000000) on PGlite: order creation, seat holds, the payment state machine, fulfilment,
// renewals, refunds, One instalments and RLS. Not part of `npm test` (needs @electric-sql/pglite). Run from a folder with
// PGlite installed:  node ielscourse-payments.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const U = { admin: "00000000-0000-0000-0000-0000000000a1", s1: "00000000-0000-0000-0000-0000000000b1", s2: "00000000-0000-0000-0000-0000000000b2", s3: "00000000-0000-0000-0000-0000000000b3" };
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };
const check = (n, cond, w = "") => (cond ? ok(n) : bad(n, w));
const db = new PGlite({ extensions: { pgcrypto, btree_gist } });
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  create table public.users (id uuid primary key, full_name text);
  create table public.staff_roles (user_id uuid primary key, role text not null);
  insert into auth.users values ('${U.admin}', 'arbadzarido03@gmail.com', now()), ('${U.s1}', 's1@example.test', now()), ('${U.s2}', 's2@example.test', now()), ('${U.s3}', 's3@example.test', now());
  insert into public.staff_roles values ('${U.admin}', 'admin');
`);
for (const f of ["20261201000000_tutoring_platform.sql", "20261201010000_tutoring_dashboard_rpcs.sql", "20261201020000_tutoring_revoke_anon_helpers.sql", "20261210000000_ielscourse_payments.sql"]) {
  await db.exec(readFileSync(join(dir, f), "utf8"));
}
// service_role needs table privileges like on Supabase.
await db.exec(`grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;`);
ok("migrations apply");

const as = async (who) => {
  if (who === "svc") { await db.exec(`reset role; select set_config('request.jwt.claims', '', false); set role service_role`); return; }
  await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ sub: U[who], role: "authenticated" })}', false); set role authenticated`);
};
const q = async (who, sql, params) => { await as(who); return (await db.query(sql, params)).rows; };
const val = async (who, sql, params) => Object.values((await q(who, sql, params))[0] ?? {})[0];
const expectErr = async (n, who, sql, params, re) => { try { await q(who, sql, params); bad(n, "no error"); } catch (e) { re.test(e.message) ? ok(n) : bad(n, e.message); } };
let seq = 0;
const oid = () => `IELS-C-261210-${(++seq).toString(16).toUpperCase().padStart(10, "0")}`;
const order = (who, product, cohort, inst, agreed = false, ttl = 60) =>
  q("svc", `select * from public.course_create_order($1, $2, $3, $4, $5, 'production', $6, $7)`, [U[who], product, cohort, inst, oid(), ttl, agreed]).then((r) => r[0]);
const snap = (id) => q("svc", `select public.course_order_snap($1, 'tok-' || $1, 'https://app.midtrans.com/snap/v4/redirection/x')`, [id]);
const apply = (id, result, gross, ts = result === "paid" ? "settlement" : result) =>
  val("svc", `select public.course_apply_payment($1, $2, $3, 'IDR', 'tx-' || $1, 'bank_transfer', $4, null)`, [id, result, gross, ts]);

// ── Cohorts ──
await expectErr("cohort cannot open without a schedule", "admin", `select public.course_admin_save_cohort(null, 'collective', 'C1', 2, 'open', '', null, null, null)`, [], /course_cohort_open_needs_schedule/);
await expectErr("studio capacity above 5 refused", "admin", `select public.course_admin_save_cohort(null, 'studio', 'S1', 6, 'open', 'Tue 19:00 WIB', null, null, null)`, [], /course_cohort_capacity/);
await expectErr("student cannot create cohorts", "s1", `select public.course_admin_save_cohort(null, 'collective', 'C1', 2, 'open', 'Wed and Sat 19:30 WIB', null, null, null)`, [], /forbidden/);
const C1 = await val("admin", `select public.course_admin_save_cohort(null, 'collective', 'Collective Dec A', 2, 'open', 'Wed and Sat 19:30 WIB', '2026-12-05', null, 'Tutor A')`);
const draft = await val("admin", `select public.course_admin_save_cohort(null, 'collective', 'Collective draft', 5, 'draft', null, null, null, null)`);
await expectErr("draft cohort cannot be bought", "svc", `select public.course_create_order('${U.s1}', 'collective', '${draft}', null, 'IELS-C-261210-FFFFFFFFF1', 'production', 60, false)`, [], /cohort_not_open/);
await expectErr("studio order against a collective cohort refused", "svc", `select public.course_create_order('${U.s1}', 'studio', '${C1}', null, 'IELS-C-261210-FFFFFFFFF2', 'production', 60, false)`, [], /unknown_cohort/);
await expectErr("sandbox environment refused", "svc", `select public.course_create_order('${U.s1}', 'collective', '${C1}', null, 'IELS-C-261210-FFFFFFFFF3', 'sandbox', 60, false)`, [], /bad_environment/);
await expectErr("order id format enforced (no ELCO-/IELS-M- ids)", "svc", `select public.course_create_order('${U.s1}', 'collective', '${C1}', null, 'ELCO-261210-0000000001', 'production', 60, false)`, [], /order_id_check|check constraint/);

// ── Seat holds and capacity (2 seats) ──
const o1 = await order("s1", "collective", C1, null);
check("order amount comes from the plan (Rp199,000)", Number(o1.amount_idr) === 199000, o1.amount_idr);
check("invoice number issued", /^ICS-\d{4}-\d{5}$/.test(o1.invoice_no), o1.invoice_no);
await snap(o1.order_id);
const o1again = await order("s1", "collective", C1, null);
check("second click reopens the same order (no duplicate)", o1again.order_id === o1.order_id, o1again.order_id);
const o2 = await order("s2", "collective", C1, null);
await snap(o2.order_id);
await expectErr("third buyer refused: cohort full (seats held)", "svc", `select public.course_create_order('${U.s3}', 'collective', '${C1}', null, 'IELS-C-261210-FFFFFFFFF4', 'production', 60, false)`, [], /cohort_full/);

// ── Payment state machine ──
check("amount mismatch is refused", (await apply(o1.order_id, "paid", 1000)) === "amount_mismatch");
check("mismatch did not pay", (await val("svc", `select status from public.course_payment_orders where order_id = $1`, [o1.order_id])) === "pending");
check("verified payment activates", (await apply(o1.order_id, "paid", 199000)) === "activated");
check("duplicate notification is idempotent", (await apply(o1.order_id, "paid", 199000)) === "already_paid");
check("late pending after paid is ignored", (await apply(o1.order_id, "pending", 199000, "pending")) === "ignored_stale");
const m1 = await q("svc", `select * from public.course_memberships where student_id = $1`, [U.s1]);
check("exactly one membership period", m1.length === 1, m1.length);
check("period is one month", Math.round((new Date(m1[0].period_end) - new Date(m1[0].period_start)) / 864e5) >= 28);
check("Circle active + Elco AI pending entitlements", (await val("svc", `select string_agg(kind || ':' || status, ',' order by kind) from public.course_entitlements where student_id = $1`, [U.s1])) === "circle:active,elco_ai:pending_activation");
const p1 = (await q("svc", `select * from public.course_payment_orders where order_id = $1`, [o1.order_id]))[0];
check("receipt issued on payment", /^ICR-\d{4}-\d{5}$/.test(p1.receipt_no ?? ""), p1.receipt_no);
check("hold converted", (await val("svc", `select converted_at is not null from public.course_seat_holds where order_id = $1`, [o1.order_id])) === true);
check("student notified", (await val("svc", `select count(*)::int from public.tutoring_notifications where user_id = $1 and kind = 'payment_verified'`, [U.s1])) === 1);

check("expired order releases the seat", (await apply(o2.order_id, "expired", 199000, "expire")) === "expired");
const o3 = await order("s3", "collective", C1, null);
check("freed seat can be bought", !!o3?.order_id);
await snap(o3.order_id);

// Late payment of the expired order on a now-full cohort: honoured and flagged, never lost.
check("paid after its hold expired on a full cohort is honoured and flagged", (await apply(o2.order_id, "paid", 199000)) === "activated_over_capacity");
check("flagged for review", (await val("svc", `select review_reason from public.course_payment_orders where order_id = $1`, [o2.order_id])) === "paid_over_capacity");

// ── Renewal ──
const r1 = await order("s1", "collective", C1, null);
check("renewal links the current period and needs no new seat", r1.renewal_of === m1[0].id, r1.renewal_of);
check("renewal holds no seat", (await val("svc", `select count(*)::int from public.course_seat_holds where order_id = $1`, [r1.order_id])) === 0);
await snap(r1.order_id);
check("renewal activates", (await apply(r1.order_id, "paid", 199000)) === "activated");
const m2 = (await q("svc", `select * from public.course_memberships where order_id = $1`, [r1.order_id]))[0];
check("renewal starts when the current period ends", new Date(m2.period_start).getTime() === new Date(m1[0].period_end).getTime());
await expectErr("member cannot buy into a second cohort of the same product", "svc",
  `select public.course_create_order('${U.s1}', 'collective', '${await val("admin", `select public.course_admin_save_cohort(null, 'collective', 'Collective Dec B', 10, 'open', 'Mon 19:00 WIB', null, null, null)`)}', null, 'IELS-C-261210-FFFFFFFFF5', 'production', 60, false)`, [], /member_of_other_cohort/);

// ── Refund after payment ──
check("refund revokes the period", (await apply(r1.order_id, "refunded", 199000, "refund")) === "revoked");
check("membership marked refunded", (await val("svc", `select status from public.course_memberships where order_id = $1`, [r1.order_id])) === "refunded");
check("refund flagged for review", (await val("svc", `select needs_review from public.course_payment_orders where order_id = $1`, [r1.order_id])) === true);
check("a stale paid after refund never re-grants", (await apply(r1.order_id, "paid", 199000)) === "ignored_after_refunded");

// ── One: self-enrol, agreement, instalments ──
const e1 = await val("svc", `select public.course_self_enrol_one($1, 'intensive', 'deposit', null)`, [U.s1]);
check("self-enrol reuses the unpaid enrolment", (await val("svc", `select public.course_self_enrol_one($1, 'intensive', 'deposit', null)`, [U.s1])) === e1);
await expectErr("deposit refused for Growth", "svc", `select public.course_self_enrol_one('${U.s2}', 'growth', 'deposit', null)`, [], /deposit_not_available/);
const inst = await q("svc", `select id, seq, amount_idr from public.tutoring_instalments where enrolment_id = $1 order by seq`, [e1]);
check("Intensive deposit schedule 50/25/25 of Rp599,000", inst.map((i) => Number(i.amount_idr)).join(",") === "299500,149750,149750", inst.map((i) => i.amount_idr).join(","));
await expectErr("checkout needs the payment-schedule agreement", "svc", `select public.course_create_order('${U.s1}', 'one', null, '${inst[0].id}', 'IELS-C-261210-FFFFFFFFF6', 'production', 60, false)`, [], /agreement_required/);
await expectErr("instalment 1 cannot be paid before the deposit", "svc", `select public.course_create_order('${U.s1}', 'one', null, '${inst[1].id}', 'IELS-C-261210-FFFFFFFFF7', 'production', 60, true)`, [], /earlier_instalment_outstanding/);
await expectErr("another student cannot pay this instalment", "svc", `select public.course_create_order('${U.s2}', 'one', null, '${inst[0].id}', 'IELS-C-261210-FFFFFFFFF8', 'production', 60, true)`, [], /forbidden/);
const d = await order("s1", "one", null, inst[0].id, true);
check("deposit order amount = Rp299,500", Number(d.amount_idr) === 299500);
check("One invoice number continues the tutoring invoice", /^TUT-\d{4}-\d{4}-1$/.test(d.invoice_no), d.invoice_no);
await snap(d.order_id);
await expectErr("manual verification blocked while an online payment is open", "admin", `select public.tutoring_verify_payment('${inst[0].id}', 'TRF')`, [], /online_payment_open/);
await expectErr("admin cannot fake an online payment method", "admin", `select public.tutoring_verify_payment('${inst[0].id}', 'TRF', 'midtrans:qris')`, [], /reserved_method/);
check("deposit payment activates the package", (await apply(d.order_id, "paid", 299500)) === "activated");
check("enrolment active", (await val("svc", `select status from public.tutoring_enrolments where id = $1`, [e1])) === "active");
check("instalment verified with no human verifier", (await val("svc", `select (status = 'verified' and verified_by is null)::text from public.tutoring_instalments where id = $1`, [inst[0].id])) === "true");
check("tutoring payment recorded as midtrans with order id", (await val("svc", `select method || '|' || order_id from public.tutoring_payments where instalment_id = $1`, [inst[0].id])) === `midtrans:bank_transfer|${d.order_id}`);
check("order receipt = tutoring receipt", /^RCP-/.test(await val("svc", `select receipt_no from public.course_payment_orders where order_id = $1`, [d.order_id])));
check("sessions unlocked after deposit = 2", (await val("s1", `select public.tutoring_sessions_unlocked($1)`, [e1])) === 2);
const i2 = await order("s1", "one", null, inst[1].id, true);
check("instalment 1 can now be paid", Number(i2.amount_idr) === 149750);

// ── Permissions and RLS ──
await expectErr("students cannot apply payments", "s1", `select public.course_apply_payment('${o1.order_id}', 'paid', 199000, 'IDR', null, null, 'settlement', null)`, [], /permission denied/);
await expectErr("students cannot create orders directly", "s1", `select public.course_create_order('${U.s1}', 'collective', '${C1}', null, 'IELS-C-261210-FFFFFFFFF9', 'production', 60, false)`, [], /permission denied/);
await expectErr("students cannot write orders", "s1", `update public.course_payment_orders set status = 'paid'`, [], /permission denied/);
check("student sees only own orders", (await val("s2", `select count(*)::int from public.course_payment_orders where student_id <> $1`, [U.s2])) === 0);
check("admin sees all orders", (await val("admin", `select count(*)::int from public.course_payment_orders`)) >= 6);
check("payment events are admin-only", (await val("s1", `select count(*)::int from public.course_payment_events`)) === 0);
check("plans are public", (await val("s1", `select count(*)::int from public.course_plans`)) === 2);
const w = await val("s3", `select public.course_join_waitlist('studio', 'weekday evenings')`);
check("waitlist join is idempotent", (await val("s3", `select public.course_join_waitlist('studio', 'weekends')`)) === w);

// ── Housekeeping ──
await q("svc", `update public.course_payment_orders set expires_at = now() - interval '2 hours' where order_id = $1`, [o3.order_id]);
check("stale unpaid order expires", (await val("svc", `select public.course_expire_stale()`)) >= 1);
await q("svc", `update public.course_memberships set period_end = now() + interval '3 days' where order_id = $1`, [o3.order_id]).catch(() => {});
check("renewal reminders run", (await val("svc", `select public.course_send_renewal_reminders()`)) >= 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
