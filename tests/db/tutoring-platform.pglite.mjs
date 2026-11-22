// Private Tutoring platform (20261201000000) on PGlite: scenarios A-E from the brief at database level.
// Not part of `npm test` (needs @electric-sql/pglite). Run from a folder with PGlite installed:
//   node tutoring-platform.pglite.mjs <repo>/supabase/migrations/20261201000000_tutoring_platform.sql
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";

const [file, file2] = process.argv.slice(2);
const U = { admin: "00000000-0000-0000-0000-0000000000a1", s1: "00000000-0000-0000-0000-0000000000b1", s2: "00000000-0000-0000-0000-0000000000b2", rando: "00000000-0000-0000-0000-0000000000c1" };
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };
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
  insert into auth.users values ('${U.admin}', 'arbadzarido03@gmail.com', now()), ('${U.s1}', 's1@example.test', now()), ('${U.s2}', 's2@example.test', now()), ('${U.rando}', 'r@example.test', now());
  insert into public.staff_roles values ('${U.admin}', 'admin');
`);
await db.exec(readFileSync(file, "utf8"));
if (file2) await db.exec(readFileSync(file2, "utf8"));
const as = async (who) => { await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ sub: U[who], role: "authenticated" })}', false); set role authenticated`); };
const q = async (who, sql, params) => { await as(who); return (await db.query(sql, params)).rows; };
const expectErr = async (n, who, sql, params, re) => { try { await q(who, sql, params); bad(n, "no error"); } catch (e) { re.test(e.message) ? ok(n) : bad(n, e.message); } };
const expectOk = async (n, who, sql, params) => { try { const r = await q(who, sql, params); ok(n); return r; } catch (e) { bad(n, e.message); } };
const val = async (who, sql, params) => Object.values((await q(who, sql, params))[0] ?? {})[0];

ok("migration applies");
if ((await val("admin", "select count(*)::int from public.tutoring_mentors")) === 1) ok("arbadzarido03 became the mentor (verified account)"); else bad("mentor seed", "missing");

// Scenario E (before anything): only admin can create enrolments
await expectErr("E: student cannot create an enrolment", "s1", `select public.tutoring_create_enrolment('${U.s1}', '${U.admin}', 'growth', 'full')`, [], /forbidden/);
await expectErr("E: deposit refused for a 4-session package", "admin", `select public.tutoring_create_enrolment('${U.s1}', '${U.admin}', 'growth', 'deposit')`, [], /deposit_not_available/);

// Scenario A: Growth, full payment
const eA = await val("admin", `select public.tutoring_create_enrolment('${U.s1}', '${U.admin}', 'growth', 'full')`);
const st = async (id) => (await q("admin", "select status, sessions_completed, sessions_total from public.tutoring_enrolments where id = $1", [id]))[0];
(await st(eA)).status === "pending_payment" ? ok("A: enrolment starts pending_payment") : bad("A pending", "");
await expectErr("A: unpaid student cannot request a booking", "s1", `select public.tutoring_request_booking('${eA}', '[{"start":"2026-12-02T03:00:00Z","end":"2026-12-02T04:00:00Z"}]', 'Asia/Jakarta', 'x')`, [], /not_active/);
const insA = (await q("admin", "select id from public.tutoring_instalments where enrolment_id = $1", [eA]))[0].id;
await expectErr("A: payment cannot be verified before agreement is recorded", "admin", `select public.tutoring_verify_payment('${insA}', 'TRF1')`, [], /agreement_required/);
await q("admin", `select public.tutoring_record_agreement('${eA}')`);
await expectErr("E: student cannot verify payments", "s1", `select public.tutoring_verify_payment('${insA}', 'TRF1')`, [], /forbidden/);
await expectOk("A: admin verifies payment", "admin", `select public.tutoring_verify_payment('${insA}', 'TRF1')`);
(await st(eA)).status === "active" ? ok("A: package active after verification") : bad("A active", "");
const rc = await q("s1", "select r.receipt_no, i.invoice_no from public.tutoring_receipts r join public.tutoring_invoices i on i.id = r.invoice_id");
rc.length === 1 && /^RCP-/.test(rc[0].receipt_no) && /^TUT-/.test(rc[0].invoice_no) ? ok("A: receipt references invoice, visible to the student") : bad("A receipt", JSON.stringify(rc));
await expectErr("A: a verified instalment cannot be verified twice", "admin", `select public.tutoring_verify_payment('${insA}', 'TRF1')`, [], /already_verified/);
const bk = await val("s1", `select public.tutoring_request_booking('${eA}', '[{"start":"2026-12-02T03:00:00Z","end":"2026-12-02T04:00:00Z"}]', 'Asia/Jakarta', 'speaking')`);
(await val("s1", "select status from public.tutoring_bookings where id = $1", [bk])) === "pending_review" ? ok("A: request is pending, not confirmed") : bad("A pending", "");
await expectOk("A: mentor confirms the slot", "admin", `select public.tutoring_decide_booking('${bk}', 'confirm', '2026-12-02T03:00:00Z', '2026-12-02T04:00:00Z', 'ok')`);
(await q("admin", "select 1 from public.tutoring_bookings where id = $1 and status = 'confirmed'", [bk])).length ? ok("A: session confirmed, visible to mentor") : bad("A confirmed", "");
(await q("s1", "select 1 from public.tutoring_bookings where id = $1 and status = 'confirmed'", [bk])).length ? ok("A: session visible to student") : bad("A student view", "");

// Scenario D: rescheduling and double booking (second student, Starter)
const eD = await val("admin", `select public.tutoring_create_enrolment('${U.s2}', '${U.admin}', 'starter', 'full')`);
await q("admin", `select public.tutoring_record_agreement('${eD}')`);
await q("admin", `select public.tutoring_verify_payment((select id from public.tutoring_instalments where enrolment_id = '${eD}'), 'TRF2')`);
const bk2 = await val("s2", `select public.tutoring_request_booking('${eD}', '[{"start":"2026-12-02T03:30:00Z","end":"2026-12-02T04:30:00Z"}]', 'Asia/Jakarta', 'ielts')`);
await expectErr("D: overlapping confirmation is rejected (no double booking)", "admin", `select public.tutoring_decide_booking('${bk2}', 'confirm', '2026-12-02T03:30:00Z', '2026-12-02T04:30:00Z', null)`, [], /no_double_booking|conflicting|exclusion/);
await expectOk("D: mentor proposes an alternative", "admin", `select public.tutoring_decide_booking('${bk2}', 'propose', '2026-12-02T05:00:00Z', '2026-12-02T06:00:00Z', 'Can we do 12:00 WIB?')`);
await expectOk("D: student accepts the alternative", "s2", `select public.tutoring_accept_alternative('${bk2}')`);
(await val("s2", "select status from public.tutoring_bookings where id = $1", [bk2])) === "confirmed" ? ok("D: both dashboards show the new confirmed time") : bad("D confirmed", "");

// Scenario C: completion
await expectErr("E: student cannot complete a session", "s1", `select public.tutoring_complete_session('${bk}', 60, 't', '{}', null, null, null, null, null)`, [], /forbidden/);
await expectOk("C: mentor completes the session", "admin", `select public.tutoring_complete_session('${bk}', 60, 'IELTS writing', array['writing'], 'clear ideas', 'cohesion', 'Good progress', 'Task 2 essay', 'Speaking part 2')`);
const afterC = await st(eA);
afterC.sessions_completed === 1 ? ok("C: remaining balance decreased by one (3 of 4 left)") : bad("C deduct", JSON.stringify(afterC));
(await q("s1", "select feedback from public.tutoring_session_records")).length === 1 ? ok("C: student sees mentor feedback") : bad("C feedback", "");
await expectErr("C: cannot complete the same session twice", "admin", `select public.tutoring_complete_session('${bk}', 60, 't', '{}', null, null, null, null, null)`, [], /not_confirmed/);

// Scenario B: Intensive with deposit
const eB = await val("admin", `select public.tutoring_create_enrolment('${U.rando}', '${U.admin}', 'intensive', 'deposit', null, '2026-12-20')`);
const amts = (await q("admin", "select seq, amount_idr::int a from public.tutoring_instalments where enrolment_id = $1 order by seq", [eB])).map((r) => r.a);
JSON.stringify(amts) === "[299500,149750,149750]" ? ok("B: 50/25/25 schedule, same total") : bad("B schedule", JSON.stringify(amts));
await q("admin", `select public.tutoring_record_agreement('${eB}')`);
const ids = (await q("admin", "select id from public.tutoring_instalments where enrolment_id = $1 order by seq", [eB])).map((r) => r.id);
await expectErr("B: instalments must be verified in order", "admin", `select public.tutoring_verify_payment('${ids[1]}', 'x')`, [], /earlier_instalment_outstanding/);
await q("admin", `select public.tutoring_verify_payment('${ids[0]}', 'DEP')`);
(await val("admin", `select public.tutoring_sessions_unlocked('${eB}')`)) === 2 ? ok("B: deposit unlocks sessions 1-2 only") : bad("B unlock", "");
const slot = '[{"start":"2026-12-03T03:00:00Z","end":"2026-12-03T04:00:00Z"}]';
await q("rando", `select public.tutoring_request_booking('${eB}', '${slot}', 'Asia/Jakarta', null)`);
await q("rando", `select public.tutoring_request_booking('${eB}', '${slot}', 'Asia/Jakarta', null)`);
await expectErr("B: third session blocked until instalment 1 is verified", "rando", `select public.tutoring_request_booking('${eB}', '${slot}', 'Asia/Jakarta', null)`, [], /no_sessions_available/);
await q("admin", `select public.tutoring_verify_payment('${ids[1]}', 'I1')`);
(await val("rando", `select public.tutoring_request_booking('${eB}', '${slot}', 'Asia/Jakarta', null)`)) ? ok("B: instalment 1 unlocks more sessions") : bad("B", "");
(await q("admin", "select count(*)::int c from public.tutoring_receipts r join public.tutoring_payments p on p.id = r.payment_id where p.enrolment_id = $1", [eB]))[0].c === 2 ? ok("B: a receipt per verified instalment") : bad("B receipts", "");
// overdue flagged, not removed
await db.exec("reset role; update public.tutoring_instalments set due_date = '2020-01-01' where id = '" + ids[2] + "'");
await q("admin", "select public.tutoring_flag_overdue()");
(await st(eB)).status === "payment_review" ? ok("B: overdue instalment flags the account for review (records kept)") : bad("B overdue", "");
await expectErr("B: account under review cannot request more sessions", "rando", `select public.tutoring_request_booking('${eB}', '${slot}', 'Asia/Jakarta', null)`, [], /not_active/);

// Scenario E: isolation
(await q("s2", "select count(*)::int c from public.tutoring_enrolments"))[0].c === 1 ? ok("E: student sees only their own enrolment") : bad("E isolation", "");
(await q("s2", "select count(*)::int c from public.tutoring_payments"))[0].c === 1 ? ok("E: student sees only their own payments") : bad("E payments", "");
(await q("s1", "select count(*)::int c from public.tutoring_mentor_notes"))[0].c === 0 ? ok("E: mentor notes hidden from students") : bad("E notes", "");
(await q("s1", "select count(*)::int c from public.tutoring_audit"))[0].c === 0 ? ok("E: audit trail admin-only") : bad("E audit", "");
await expectErr("E: no direct writes", "s1", "update public.tutoring_enrolments set sessions_completed = 0", [], /permission denied/);
(await q("admin", "select count(*)::int c from public.tutoring_audit"))[0].c > 5 ? ok("audit trail recorded") : bad("audit", "");

if (file2) {
  await db.exec("reset role");
  await db.exec(`insert into public.users values ('${U.s1}', 'Sari Student')`);
  const sid = await val("admin", "select public.tutoring_find_student('S1@example.test')");
  sid === U.s1 ? ok("R: admin finds a verified student by email") : bad("find_student", String(sid));
  await expectErr("R: student cannot look up other accounts", "s1", "select public.tutoring_find_student('r@example.test')", [], /forbidden/);
  await expectErr("R: student cannot read the roster", "s1", "select * from public.tutoring_roster()", [], /forbidden/);
  const ro = await q("admin", "select * from public.tutoring_roster()");
  ro.length === 3 && ro.find((r) => r.student_name === "Sari Student") && Number(ro.find((r) => r.enrolment_id === eB).paid_idr) === 449250 ? ok("R: roster shows names, paid totals") : bad("roster", JSON.stringify(ro.map((r) => [r.student_name, r.paid_idr])));
  await q("admin", `select public.tutoring_set_availability('[{"weekday":1,"start":"09:00","end":"12:00"},{"weekday":2,"start":"09:00","end":"12:00"}]')`);
  const sl = await q("s1", `select starts_at from public.tutoring_open_slots('${U.admin}', current_date, current_date + 14)`);
  sl.length >= 6 ? ok("S: open slots generated from availability (" + sl.length + ")") : bad("slots", String(sl.length));
  const first = sl[0].starts_at.toISOString();
  await q("admin", `select public.tutoring_add_block('${first}', '${new Date(new Date(first).getTime() + 3600e3).toISOString()}', 'dentist')`);
  const sl2 = await q("s1", `select starts_at from public.tutoring_open_slots('${U.admin}', current_date, current_date + 14)`);
  sl2.length === sl.length - 1 && !sl2.some((r) => r.starts_at.toISOString() === first) ? ok("S: blocked time is not offered") : bad("blocked", "");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
