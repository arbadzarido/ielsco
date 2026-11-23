// IELScourse classroom (20261212000000) on PGlite: tutor assignment, sessions, attendance, materials, announcements,
// progress notes, and who can see what. Not part of `npm test` (needs @electric-sql/pglite). Run from a folder with PGlite:
//   node ielscourse-classroom.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
const U = { admin: "00000000-0000-0000-0000-0000000000a1", tutor: "00000000-0000-0000-0000-0000000000a2", other: "00000000-0000-0000-0000-0000000000a3",
  s1: "00000000-0000-0000-0000-0000000000b1", s2: "00000000-0000-0000-0000-0000000000b2", s3: "00000000-0000-0000-0000-0000000000b3" };
let pass = 0, fail = 0;
const check = (n, cond, w = "") => { if (cond) { pass++; console.log("PASS", n); } else { fail++; console.log("FAIL", n, "->", w); } };
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
  insert into auth.users select id::uuid, k || '@example.test', now() from (values ${Object.entries(U).map(([k, v]) => `('${k}', '${v}')`).join(",")}) x(k, id);
  insert into public.staff_roles values ('${U.admin}', 'admin');
  insert into public.users values ('${U.s1}', 'Sari'), ('${U.s2}', 'Bima');
`);
for (const f of ["20261201000000_tutoring_platform.sql", "20261201010000_tutoring_dashboard_rpcs.sql", "20261201020000_tutoring_revoke_anon_helpers.sql",
  "20261210000000_ielscourse_payments.sql", "20261212000000_ielscourse_classroom.sql"]) await db.exec(readFileSync(join(dir, f), "utf8"));
check("migrations apply", true);

const as = async (who) => { await db.exec(`reset role; select set_config('request.jwt.claims', '${JSON.stringify({ sub: U[who], role: "authenticated" })}', false); set role authenticated`); };
const q = async (who, sql, p) => { await as(who); return (await db.query(sql, p)).rows; };
const val = async (who, sql, p) => Object.values((await q(who, sql, p))[0] ?? {})[0];
const err = async (who, sql, p) => { try { await q(who, sql, p); return null; } catch (e) { return e.message; } };

// Setup: tutor is an active mentor; one Studio group; s1 and s2 have paid this month, s3 has not.
await db.exec(`reset role; insert into public.tutoring_mentors (user_id, display_name) values ('${U.tutor}', 'Tutor Tia'), ('${U.other}', 'Other Tutor');`);
const coh = await val("admin", `select public.course_admin_save_cohort(null, 'studio', 'Studio Evening A', 5, 'open', 'Tuesday 19:30-20:45 WIB', current_date, 'https://meet.example.test/a', null)`);
check("admin creates a group", !!coh);
check("only admins assign tutors", /forbidden/.test(await err("tutor", `select public.course_admin_set_tutor('${coh}', '${U.tutor}')`) ?? ""));
check("tutor must be an active mentor", /not_a_tutor/.test(await err("admin", `select public.course_admin_set_tutor('${coh}', '${U.s1}')`) ?? ""));
await q("admin", `select public.course_admin_set_tutor('${coh}', '${U.tutor}')`);
check("tutor name follows the assignment", (await val("admin", `select tutor_name from public.course_cohorts where id = '${coh}'`)) === "Tutor Tia");
await db.exec(`reset role;
  insert into public.course_memberships (student_id, product, plan_code, cohort_id, order_id, period_start, period_end) values
   ('${U.s1}', 'studio', 'studio_monthly', '${coh}', 'IELS-C-TEST-1', now() - interval '3 days', now() + interval '27 days'),
   ('${U.s2}', 'studio', 'studio_monthly', '${coh}', 'IELS-C-TEST-2', now() - interval '3 days', now() + interval '27 days');`);

check("assigned tutor sees the group", (await q("tutor", "select * from public.course_my_teaching()")).length === 1);
check("another tutor does not", (await q("other", "select * from public.course_my_teaching()")).length === 0);
check("another tutor cannot add a session", /forbidden/.test(await err("other", `select public.course_save_session(null, '${coh}', now(), now() + interval '75 minutes', 'x', null, 'scheduled')`) ?? ""));
const ses = await val("tutor", `select public.course_save_session(null, '${coh}', now() - interval '1 hour', now() - interval '5 minutes', 'Small talk', null, 'scheduled')`);
check("tutor adds a session", !!ses);
check("roster lists paid students only", JSON.stringify((await q("tutor", `select student_name from public.course_roster('${coh}')`)).map((r) => r.student_name)) === '["Bima","Sari"]');
await q("tutor", `select public.course_record_attendance('${ses}', '${U.s1}', 'present', null)`);
await q("tutor", `select public.course_record_attendance('${ses}', '${U.s2}', 'late', 'traffic')`);
await q("tutor", `select public.course_record_attendance('${ses}', '${U.s2}', 'present', null)`);
check("attendance is upserted, one row per student", (await val("admin", `select count(*)::int from public.course_attendance where session_id = '${ses}'`)) === 2);
check("attendance marks the session held", (await val("admin", `select status from public.course_class_sessions where id = '${ses}'`)) === "held");
check("cannot record attendance for an unpaid student", /not_enrolled/.test(await err("tutor", `select public.course_record_attendance('${ses}', '${U.s3}', 'present', null)`) ?? ""));
check("students cannot record attendance", /forbidden/.test(await err("s1", `select public.course_record_attendance('${ses}', '${U.s1}', 'present', null)`) ?? ""));

await q("tutor", `select public.course_add_material('${coh}', 'Week 1 slides', 'https://docs.example.test/w1', null)`);
check("materials must be https", /check/.test(await err("tutor", `select public.course_add_material('${coh}', 'Bad link', 'http://x.test', null)`) ?? ""));
await q("tutor", `select public.course_post_announcement('${coh}', 'No class Friday', 'Public holiday, see you Tuesday.')`);
await db.exec("reset role");
check("announcement notifies paid members", (await db.query(`select count(*)::int c from public.tutoring_notifications where kind = 'course_announcement'`)).rows[0].c === 2);
await q("tutor", `select public.course_add_progress_note('${coh}', '${U.s1}', 'Clear pronunciation; work on past tense.')`);

check("member sees sessions", (await q("s1", "select id from public.course_class_sessions")).length === 1);
check("member sees materials", (await q("s1", "select id from public.course_materials")).length === 1);
check("member sees announcements", (await q("s1", "select id from public.course_announcements")).length === 1);
check("member sees only own attendance", (await q("s1", "select student_id from public.course_attendance")).every((r) => r.student_id === U.s1));
check("member sees own progress note", (await q("s1", "select id from public.course_progress_notes")).length === 1);
check("other member does not see s1's note", (await q("s2", "select id from public.course_progress_notes")).length === 0);
check("non-member sees nothing", (await q("s3", "select id from public.course_class_sessions")).length === 0 && (await q("s3", "select id from public.course_materials")).length === 0);
check("tutor cannot read payments", (await q("tutor", "select order_id from public.course_payment_orders")).length === 0);
check("no direct writes", /permission denied/.test(await err("tutor", `insert into public.course_materials (cohort_id, title, url) values ('${coh}', 'x y', 'https://x.test')`) ?? ""));
const mat = await val("admin", "select id from public.course_materials limit 1");
await q("tutor", `select public.course_remove_material('${mat}')`);
check("removed material disappears for members", (await q("s1", "select id from public.course_materials")).length === 0);
await db.exec(`reset role; update public.course_memberships set period_end = now() - interval '1 day' where student_id = '${U.s2}'`);
check("expired member loses class access", (await q("s2", "select id from public.course_class_sessions")).length === 0);
await q("admin", `select public.course_admin_set_tutor('${coh}', null)`);
check("unassigned tutor loses access", (await q("tutor", "select * from public.course_my_teaching()")).length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
