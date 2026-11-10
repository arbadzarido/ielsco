// Company OS division foundation (20261116000000): comment replies and @mentions, and meetings with a minutes workflow
// and action items that become tasks once. On PGlite over every earlier migration. Not part of `npm test`.
//   node company-os-division-foundation.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  founder: "00000000-0000-0000-0000-00000000000f",
  manager: "00000000-0000-0000-0000-0000000000a1", // Growth manager, IELSco + Elco
  creative: "00000000-0000-0000-0000-0000000000a2", // Creative member, IELSco
  elco: "00000000-0000-0000-0000-0000000000a3", // Growth member, Elco
  guest: "00000000-0000-0000-0000-0000000000a4",
  outsider: "00000000-0000-0000-0000-0000000000a5", // signed in, no OS record
  offboarded: "00000000-0000-0000-0000-0000000000a6",
  creative2: "00000000-0000-0000-0000-0000000000b1", // Creative member, IELSco
  ops: "00000000-0000-0000-0000-0000000000b2", // Operations member, IELSco
  opsManager: "00000000-0000-0000-0000-0000000000b3", // Operations manager, IELSco
  finance: "00000000-0000-0000-0000-0000000000b4", // Finance officer (workspace role), IELSco
  growth: "00000000-0000-0000-0000-0000000000b5", // Growth member, IELSco
  ops2: "00000000-0000-0000-0000-0000000000b6", // another Operations member, IELSco
};
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
// A minimal Supabase auth schema: users, Google identities, sessions and MFA factors, plus auth.uid() / auth.jwt()
// reading request.jwt.claims the way PostgREST sets it.
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null,
    identity_data jsonb not null, created_at timestamptz default now());
  create table auth.sessions (id uuid primary key, user_id uuid not null, created_at timestamptz default now(),
    updated_at timestamptz default now(), refreshed_at timestamp);
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  insert into auth.users (id, email) values ${Object.entries(U).map(([k, id]) => `('${id}', '${k}@example.test')`).join(", ")};
  insert into auth.identities (user_id, provider, identity_data) values ${Object.entries(U).map(([k, id]) => `('${id}', 'google', '{"email": "${k}@example.test", "email_verified": true}')`).join(", ")};`);
// Every user starts with one live Google session.
const SESS = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^00000000/, "5e55a000")]));
await db.exec(`insert into auth.sessions (id, user_id) values ${Object.values(U).map((id) => `('${SESS[id]}', '${id}')`).join(", ")}`);

for (const f of ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql", "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql", "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql", "20261115000000_company_os_finance_legal.sql", "20261116000000_company_os_division_foundation.sql"]) {
  const sql = readFileSync(join(dir, f), "utf8");
  await db.exec(sql);
  await db.exec(sql);
}
ok("migrations apply twice");

// Fixtures, as the migration owner. Everyone is on the registry with their Google email; the guest belongs to IELSco
// (a company is required for any access).
await db.exec(`
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-9001', '${U.founder}', 'Test Founder', 'founder', 'active', 'founder@example.test'),
    ('PPL-9002', '${U.manager}', 'Test Growth Manager', 'manager', 'active', 'manager@example.test'),
    ('PPL-9003', '${U.creative}', 'Test Creative Member', 'member', 'active', 'Creative@Example.test'),
    ('PPL-9004', '${U.elco}', 'Test Elco Growth Member', 'member', 'active', 'elco@example.test'),
    ('PPL-9005', '${U.guest}', 'Test Guest', 'guest', 'active', 'guest@example.test'),
    ('PPL-9006', '${U.offboarded}', 'Test Offboarded', 'member', 'offboarded', 'offboarded@example.test');
  insert into public.os_people (id, full_name, org_role, status) values ('PPL-9007', 'No Account Yet', 'member', 'onboarding');
  insert into public.os_person_companies values
    ('PPL-9001','IEL'),('PPL-9001','ELC'),('PPL-9002','IEL'),('PPL-9002','ELC'),('PPL-9003','IEL'),('PPL-9004','ELC'),('PPL-9005','IEL'),('PPL-9006','IEL'),('PPL-9007','IEL');
  insert into public.os_person_divisions values
    ('PPL-9002','DIV-03',true),('PPL-9003','DIV-04',false),('PPL-9004','DIV-03',false),('PPL-9006','DIV-04',false),('PPL-9007','DIV-03',false);
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-9011', '${U.creative2}', 'Test Creative Two', 'member', 'active', 'creative2@example.test'),
    ('PPL-9012', '${U.ops}', 'Test Ops Member', 'member', 'active', 'ops@example.test'),
    ('PPL-9013', '${U.opsManager}', 'Test Ops Manager', 'manager', 'active', 'opsmanager@example.test'),
    ('PPL-9014', '${U.finance}', 'Test Finance Officer', 'member', 'active', 'finance@example.test'),
    ('PPL-9015', '${U.growth}', 'Test Growth Member', 'member', 'active', 'growth@example.test'),
    ('PPL-9016', '${U.ops2}', 'Test Ops Two', 'member', 'active', 'ops2@example.test');
  insert into public.os_person_companies values ('PPL-9011','IEL'),('PPL-9012','IEL'),('PPL-9013','IEL'),('PPL-9014','IEL'),('PPL-9015','IEL'),('PPL-9016','IEL');
  insert into public.os_person_divisions values ('PPL-9011','DIV-04',false),('PPL-9012','DIV-02',false),('PPL-9013','DIV-02',true),('PPL-9015','DIV-03',false),('PPL-9016','DIV-02',false);
  insert into public.os_workspace_roles (person_id, division_id, role, reason) values
    ('PPL-9003','DIV-04','lead','Runs Creative intake'), ('PPL-9014','DIV-08','officer','Finance officer');`);

// JWT claims for a user: a Google (oauth) sign-in a minute ago, in their own session. Founders have passed MFA.
const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid, extra = {}) => (uid ? {
  sub: uid, role: "authenticated", session_id: SESS[uid], aal: uid === U.founder ? "aal2" : "aal1",
  amr: [{ method: "oauth", timestamp: nowS() - 60 }], ...extra,
} : {});
async function as(role, uid, q, params = [], extra = {}) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsFor(uid, extra))]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const user = (uid, q, params, extra) => as("authenticated", uid, q, params, extra);
const one = async (uid, q, params, extra) => Object.values((await user(uid, q, params, extra)).rows[0])[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 60)})`) : bad(n, e.message); } };
const is = (want) => (got) => (got === want ? null : `got ${JSON.stringify(got)}`);
const canView = (uid, company, division, sens, id = "D1") =>
  one(uid, `select public.os_can_view($1, $2, $3, 'document', $4)`, [company, division, sens, id]);
const canEdit = (uid, company, division, sens, id = "D1") =>
  one(uid, `select public.os_can_edit($1, $2, $3, 'document', $4)`, [company, division, sens, id]);

const F = U.founder, GM = U.manager, GR = U.growth, CR = U.creative, OPS = U.ops, GUEST = U.guest;
// A Growth task everyone in IELSco can see, and a Confidential Growth project task Creative can't.
await db.exec(`insert into public.os_tasks (id, title, company_code, division_id, sensitivity) values
  ('TSK-9001', 'Open task', 'IEL', 'DIV-03', 'Internal'), ('TSK-9002', 'Private task', 'IEL', 'DIV-03', 'Confidential');`);
const notes = (uid) => user(uid, `select kind, entity_type, entity_id, title, body from public.os_notifications where person_id = public.os_current_person() order by id`).then((r) => r.rows);

// ── Mentions and replies
let c1;
await t("a member comments and mentions two people", async () => {
  c1 = await one(GR, `insert into public.os_comments (entity_type, entity_id, body, mentions) values ('task', 'TSK-9001', 'Please look @manager', array['PPL-9002','PPL-9003','PPL-9002','PPL-0000','PPL-9005','PPL-9006']) returning id`);
  return one(F, `select array_to_string(mentions, ',') from public.os_comments where id = $1`, [c1]);
}, (m) => (m.split(",").sort().join(",") === "PPL-9002,PPL-9003" ? null : `mentions ${m}`));
await t("the mentioned manager is told, with no record text", async () => notes(GM), (r) => {
  const n = r.find((x) => x.kind === "mention");
  return n && n.entity_id === "TSK-9001" && n.body === null && !/Open task|Please look/.test(n.title) ? null : JSON.stringify(r);
});
await t("a guest and an offboarded person are never notified", async () => one(F, `select count(*)::int from public.os_notifications where person_id in ('PPL-9005','PPL-9006') and kind = 'mention'`), is(0));
await t("mentioning yourself tells nobody", async () => {
  await user(GR, `insert into public.os_comments (entity_type, entity_id, body, mentions) values ('task', 'TSK-9001', 'note to self', array['PPL-9015'])`);
  return one(F, `select count(*)::int from public.os_notifications where person_id = 'PPL-9015' and kind = 'mention'`);
}, is(0));
let r1;
await t("a reply notifies the comment's author", async () => {
  r1 = await one(GM, `insert into public.os_comments (entity_type, entity_id, body, parent_id) values ('task', 'TSK-9001', 'On it', $1) returning id`, [c1]);
  return (await notes(GR)).filter((x) => x.kind === "comment_reply").length;
}, is(1));
await t("a reply to a reply stays one level deep", async () => {
  const id = await one(GR, `insert into public.os_comments (entity_type, entity_id, body, parent_id) values ('task', 'TSK-9001', 'Thanks', $1) returning id`, [r1]);
  return one(F, `select parent_id::int from public.os_comments where id = $1`, [id]);
}, (p) => (p === Number(c1) ? null : `parent ${p}`));
await te("a reply can't point at another record's comment", () => user(GM, `insert into public.os_comments (entity_type, entity_id, body, parent_id) values ('task', 'TSK-9002', 'x y z', $1)`, [c1]), /same record/);
await te("Creative can't comment on a task it can't see", () => user(CR, `insert into public.os_comments (entity_type, entity_id, body, mentions) values ('task', 'TSK-9002', 'hello', array['PPL-9002'])`), /row-level security/);
await t("a mention on a private record names no record, and the reader still can't open it", async () => {
  await user(GM, `insert into public.os_comments (entity_type, entity_id, body, mentions) values ('task', 'TSK-9002', 'secret plan', array['PPL-9003'])`);
  const n = (await notes(CR)).filter((x) => x.entity_id === "TSK-9002");
  const seen = await one(CR, `select count(*)::int from public.os_comments where entity_id = 'TSK-9002'`);
  return { n, seen };
}, ({ n, seen }) => (n.length === 1 && n[0].body === null && !/secret|Private/.test(n[0].title) && seen === 0 ? null : JSON.stringify({ n, seen })));
await te("a comment's mentions can't be changed later", () => user(GR, `update public.os_comments set mentions = array['PPL-9001'] where id = $1`, [c1]), /permission denied/);

// ── Meetings and minutes
let m1;
await t("a Growth member schedules a division meeting", async () => {
  m1 = await one(GR, `insert into public.os_meetings (company_code, division_id, title, held_on, agenda, objectives, reviewer_person_id, attendees)
    values ('IEL', 'DIV-03', 'Growth weekly', current_date + 3, 'Plan next week', 'Agree the calendar', 'PPL-9002', array['PPL-9002','PPL-9015']) returning id`);
  return one(GR, `select status from public.os_meetings where id = $1`, [m1]);
}, is("Scheduled"));
await t("a meeting dated today or earlier starts as Held", async () => {
  const id = await one(GR, `insert into public.os_meetings (company_code, division_id, title, held_on) values ('IEL', 'DIV-03', 'Past sync', current_date - 1) returning id`);
  return one(GR, `select status from public.os_meetings where id = $1`, [id]);
}, is("Held"));
await te("status can't be set directly", () => user(GR, `update public.os_meetings set status = 'Approved' where id = $1`, [m1]), /permission denied/);
await te("minutes can't go to review empty", async () => { await user(GR, `select public.os_meeting_act($1, 'hold')`, [m1]); await user(GR, `select public.os_meeting_act($1, 'submit')`, [m1]); }, /Write the minutes/);
await t("the author writes minutes and sends them for review", async () => {
  await user(GR, `update public.os_meetings set notes = 'We agreed the content calendar for next week.', decisions = 'Ship three posts' where id = $1`, [m1]);
  return one(GR, `select public.os_meeting_act($1, 'submit')`, [m1]);
}, is("In review"));
await t("the reviewer is told", async () => (await notes(GM)).filter((x) => x.kind === "meeting_update" && x.entity_id === m1).length, is(1));
await te("the author can't approve their own minutes", () => user(GR, `select public.os_meeting_act($1, 'approve')`, [m1]), /isn't available/);
await te("another division's member can't approve", () => user(OPS, `select public.os_meeting_act($1, 'approve')`, [m1]), /isn't available|not found/);
await t("the reviewer returns them, then approves after a resubmit", async () => {
  await user(GM, `select public.os_meeting_act($1, 'return')`, [m1]);
  await user(GR, `select public.os_meeting_act($1, 'submit')`, [m1]);
  return one(GM, `select public.os_meeting_act($1, 'approve')`, [m1]);
}, is("Approved"));
await t("approval is recorded", async () => one(F, `select minutes_approved_by || ':' || (minutes_approved_at is not null) from public.os_meetings where id = $1`, [m1]), is("PPL-9002:true"));
await te("approved minutes can't be edited", () => user(GR, `update public.os_meetings set notes = 'Changed after approval, quietly' where id = $1`, [m1]), /Approved minutes/);
await t("the reviewer can reopen them", async () => one(GM, `select public.os_meeting_act($1, 'reopen')`, [m1]), is("Minutes draft"));
await te("a guest can't act on a meeting", () => user(GUEST, `select public.os_meeting_act($1, 'submit')`, [m1]), /not found|isn't available/);

// ── Action items to tasks
let a1;
await t("the author adds an action item", async () => {
  a1 = await one(GR, `insert into public.os_meeting_actions (meeting_id, body, owner_person_id, due_date) values ($1, 'Draft three captions', 'PPL-9015', current_date + 7) returning id`, [m1]);
  return one(GM, `select count(*)::int from public.os_meeting_actions where meeting_id = $1`, [m1]);
}, is(1));
await te("someone outside the division can't add one", () => user(OPS, `insert into public.os_meeting_actions (meeting_id, body) values ($1, 'Sneak this in')`, [m1]), /row-level security/);
let task;
await t("it becomes a task in the meeting's division", async () => {
  task = await one(GR, `select public.os_meeting_action_to_task($1)`, [a1]);
  const r = await user(F, `select division_id, company_code, owner_person_id, status, title from public.os_tasks where id = $1`, [task]);
  return r.rows[0];
}, (r) => (r.division_id === "DIV-03" && r.company_code === "IEL" && r.owner_person_id === "PPL-9015" && r.status === "Ready" && r.title === "Draft three captions" ? null : JSON.stringify(r)));
await t("doing it again returns the same task, not a duplicate", async () => one(GM, `select public.os_meeting_action_to_task($1)`, [a1]), (id) => (id === task ? null : `got ${id}`));
await t("only one task exists for it", async () => one(F, `select count(*)::int from public.os_tasks where title = 'Draft three captions'`), is(1));
await te("an action with a task can't be deleted", async () => { const r = await user(GR, `delete from public.os_meeting_actions where id = $1 returning id`, [a1]); if (!r.rows.length) throw new Error("no rows deleted"); }, /no rows deleted/);
await te("an outsider can't turn an action into a task", () => user(OPS, `select public.os_meeting_action_to_task($1)`, [a1]), /not found/);
await te("task_id can't be set by hand", () => user(GR, `insert into public.os_meeting_actions (meeting_id, body, task_id) values ($1, 'Link by hand', 'TSK-9001')`, [m1]), /permission denied/);
await t("a Confidential meeting's actions are hidden from other divisions", async () => {
  const id = await one(GM, `insert into public.os_meetings (company_code, division_id, title, held_on, sensitivity) values ('IEL', 'DIV-03', 'Private Growth', current_date, 'Confidential') returning id`);
  await user(GM, `insert into public.os_meeting_actions (meeting_id, body) values ($1, 'Quiet follow-up')`, [id]);
  return one(CR, `select count(*)::int from public.os_meeting_actions where meeting_id = $1`, [id]);
}, is(0));
await te("anonymous callers can't run the functions", () => as("anon", null, `select public.os_meeting_act('MTG-0001', 'hold')`), /permission denied/);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
