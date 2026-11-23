// Company OS business streams (20261213000000): HQ + IELSco, Elco AI and GIF, on PGlite over every earlier Company OS
// migration and the GIF Summer 2027 content. Checks that the migration keeps every record, assigns streams only from
// data, flags what it can't settle, removes business-unit limits on work without touching sensitivity or division rules,
// and that the manual rollback restores the old rules and can be re-applied.
//   node company-os-streams.pglite.mjs <repo>/supabase/migrations
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [dir] = process.argv.slice(2);
const U = {
  arba: "00000000-0000-0000-0000-0000000000f1", // founder
  renita: "00000000-0000-0000-0000-0000000000a7", // Operations manager (DIV-02), IELSco
  shafira: "00000000-0000-0000-0000-0000000000a4", // Partnership manager (DIV-06), IELSco
  member: "00000000-0000-0000-0000-0000000000b1", // Growth member (DIV-03), IELSco
  elco: "00000000-0000-0000-0000-0000000000b3", // Growth member (DIV-03), Elco only
  guest: "00000000-0000-0000-0000-0000000000b2",
  fresh: "00000000-0000-0000-0000-0000000000b4", // active member with no company at all
};
const FOUNDERS = new Set([U.arba]);
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };

const db = new PGlite({ extensions: { pgcrypto } });
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
const SESS = Object.fromEntries(Object.values(U).map((id) => [id, id.replace(/^00000000/, "5e55a000")]));
await db.exec(`insert into auth.sessions (id, user_id) values ${Object.values(U).map((id) => `('${SESS[id]}', '${id}')`).join(", ")}`);

const CHAIN = ["20261107000000_company_os_foundation.sql", "20261107010000_company_os_access.sql", "20261108000000_company_os_work.sql",
  "20261108010000_company_os_kpi_timeline_data.sql", "20261108020000_company_os_drive_connection.sql", "20261109000000_company_os_calendar_ai.sql",
  "20261110000000_company_os_planning.sql", "20261113000000_company_os_workspaces.sql", "20261114000000_company_os_requests.sql",
  "20261115000000_company_os_finance_legal.sql", "20261116000000_company_os_division_foundation.sql",
  "20261117000000_company_os_subdivisions_metrics.sql", "20261118000000_company_os_document_templates.sql",
  "20261119000000_company_os_elco_assistant.sql", "20261129000000_company_os_programmes.sql"];
const SEED = "20261129010000_company_os_gif_summer_2027.sql";
const STREAMS = "20261213000000_company_os_business_streams.sql";
const ROLLBACK = join(dir, "..", "manual", "ROLLBACK-20261213000000-company-os-business-streams.sql");
for (const f of CHAIN) await db.exec(readFileSync(join(dir, f), "utf8"));

// Fixtures: the GIF project (a programme once the seed runs), a GIF project that is NOT a programme, Elco and HQ work,
// a cross-unit partnership, a Confidential Partnerships project, an IEL transaction on the GIF project.
await db.exec(`
  insert into public.os_people (id, user_id, full_name, org_role, status, google_account) values
    ('PPL-0001', '${U.arba}', 'Arba Test', 'founder', 'active', 'arba@example.test'),
    ('PPL-0007', '${U.renita}', 'Renita Test', 'manager', 'active', 'renita@example.test'),
    ('PPL-0004', '${U.shafira}', 'Shafira Test', 'manager', 'active', 'shafira@example.test'),
    ('PPL-9001', '${U.member}', 'Member Test', 'member', 'active', 'member@example.test'),
    ('PPL-9003', '${U.elco}', 'Elco Test', 'member', 'active', 'elco@example.test'),
    ('PPL-9002', '${U.guest}', 'Guest Test', 'guest', 'active', 'guest@example.test'),
    ('PPL-9005', '${U.fresh}', 'Fresh Test', 'member', 'active', 'fresh@example.test');
  insert into public.os_people (id, full_name, org_role, status) values ('PPL-0002', 'Farrel Test', 'founder', 'onboarding'), ('PPL-0005', 'Mojo Test', 'manager', 'onboarding');
  insert into public.os_person_companies values ('PPL-0001','IEL'),('PPL-0001','ELC'),('PPL-0007','IEL'),('PPL-0004','IEL'),('PPL-9001','IEL'),('PPL-9003','ELC'),('PPL-9002','IEL');
  insert into public.os_person_divisions values ('PPL-0007','DIV-02',true),('PPL-0004','DIV-06',true),('PPL-9001','DIV-03',false),('PPL-9003','DIV-03',false);
  insert into public.os_projects (id, company_code, division_id, name, project_type, owner_person_id, status, sensitivity) values
    ('PRJ-0033', 'IEL', 'DIV-02', 'Global Impact Fellowship Summer 2027', 'Program', 'PPL-0001', 'Active', 'Internal'),
    ('PRJ-0034', 'IEL', 'DIV-02', 'GIF Winter 2026', 'Program', 'PPL-0001', 'Active', 'Internal'),
    ('PRJ-0040', 'ELC', 'DIV-05', 'Elco tutor app beta', 'Product', 'PPL-0001', 'Active', 'Internal'),
    ('PRJ-0041', 'HQ', null, 'Company OS rollout', 'Internal', 'PPL-0001', 'Active', 'Internal'),
    ('PRJ-0042', 'IEL', 'DIV-06', 'Sponsor pipeline (confidential)', 'Partnership', 'PPL-0004', 'Active', 'Confidential'),
    ('PRJ-0043', 'ELC', 'DIV-05', 'Elco board pack', 'Finance / Admin', 'PPL-0001', 'Active', 'Restricted');
  insert into public.os_tasks (id, project_id, company_code, division_id, title, owner_person_id, status, due_date) values
    ('TSK-0106', 'PRJ-0033', 'IEL', 'DIV-02', 'Write concept note', 'PPL-0007', 'In Progress', '2026-12-11'),
    ('TSK-0107', 'PRJ-0033', 'IEL', 'DIV-02', 'Research NUS/UTM/Chula', 'PPL-0004', 'Ready', '2026-12-18'),
    ('TSK-0114', 'PRJ-0033', 'IEL', 'DIV-02', 'Create master timeline', 'PPL-0001', 'Ready', '2026-11-13'),
    ('TSK-0115', 'PRJ-0033', 'IEL', 'DIV-02', 'Create master concept', 'PPL-0001', 'Ready', '2026-11-13'),
    ('TSK-0200', 'PRJ-0040', 'ELC', 'DIV-05', 'Ship beta build', 'PPL-9003', 'Ready', null),
    ('TSK-0201', null, 'HQ', null, 'Close November books', 'PPL-0001', 'Ready', null),
    ('TSK-0202', null, 'IEL', 'DIV-03', 'Draft GIF ambassador posts', 'PPL-9001', 'Ready', null);
  insert into public.os_tasks (id, parent_task_id, company_code, title, status) values ('TSK-0203', 'TSK-0106', 'IEL', 'Outline section 1', 'Ready');
  insert into public.os_partnerships (id, company_code, division_id, organisation, stage, related_project_id, sensitivity) values
    ('OPP-0900', 'ELC', 'DIV-06', 'Cross-unit sponsor', '1 Identified', 'PRJ-0033', 'Internal');
  insert into public.os_id_counters (prefix, last) values ('TSK', 300) on conflict (prefix) do update set last = 300;`);
await db.exec(readFileSync(join(dir, SEED), "utf8"));
await db.exec(`insert into public.os_fin_transactions (id, kind, company_code, division_id, project_id, description, amount, txn_date, requested_by)
  values ('TRX-0900', 'expense', 'IEL', 'DIV-02', 'PRJ-0033', 'GIF venue deposit', 1000000, '2026-11-20', 'PPL-0001'),
         ('TRX-0901', 'expense', 'ELC', 'DIV-05', null, 'Server bill', 500000, '2026-11-20', 'PPL-0001')`);

// Everything that must survive: row counts, company_code and updated_at of every table the migration touches.
const TABLES = ["os_projects", "os_tasks", "os_events", "os_documents", "os_announcements", "os_decisions", "os_meetings", "os_partnerships",
  "os_campaigns", "os_campaign_items", "os_product_items", "os_kpis", "os_objectives", "os_timeline_items", "os_requests", "os_fin_budgets",
  "os_fin_transactions", "os_letters", "os_agreements", "os_task_assignees", "os_project_members", "os_programme_task_meta", "os_person_companies"];
const snapshot = async () => {
  const out = {};
  for (const t of TABLES) {
    const cols = (await db.query(`select string_agg(column_name, ',') c from information_schema.columns where table_schema = 'public' and table_name = $1
      and column_name in ('company_code', 'updated_at', 'id', 'task_id', 'person_id', 'project_id')`, [t])).rows[0].c;
    out[t] = (await db.query(`select count(*)::int n, md5(coalesce(string_agg(row(${cols})::text, '|' order by row(${cols})::text), '')) h from public.${t}`)).rows[0];
  }
  out.activity = (await db.query(`select count(*)::int n from public.os_activity`)).rows[0].n;
  return out;
};
const before = await snapshot();

const mig = readFileSync(join(dir, STREAMS), "utf8");
await db.exec(mig);
await db.exec(mig);
ok("streams migration applies twice");

const nowS = () => Math.floor(Date.now() / 1000);
const claimsFor = (uid) => (uid ? { sub: uid, role: "authenticated", session_id: SESS[uid], aal: FOUNDERS.has(uid) ? "aal2" : "aal1",
  amr: [{ method: "oauth", timestamp: nowS() - 60 }] } : {});
async function as(role, uid, q, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claimsFor(uid))]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(q, params); await db.exec("commit"); return r;
  } catch (e) { await db.exec("rollback"); throw e; }
}
const user = (uid, q, p) => as("authenticated", uid, q, p);
const one = async (uid, q, p) => Object.values((await user(uid, q, p)).rows[0] ?? { x: undefined })[0];
const sys = async (q, p) => Object.values((await db.query(q, p)).rows[0] ?? { x: undefined })[0];
const t = async (n, fn, check) => { try { const r = await fn(); const w = check?.(r); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message); } };
const te = async (n, fn, re) => { try { await fn(); bad(n, "succeeded"); } catch (e) { re.test(e.message) ? ok(`${n} (${e.message.slice(0, 70)})`) : bad(n, e.message); } };
const is = (want) => (got) => (JSON.stringify(got) === JSON.stringify(want) ? null : `got ${JSON.stringify(got)}`);
const atLeast = (n) => (got) => (got >= n ? null : `got ${got}`);
const { arba: A, renita: RE, shafira: SH, member: ME, elco: EL, guest: GU, fresh: FR } = U;
const streams = (table, id) => sys(`select array_to_string(streams, ',') from public.${table} where id = $1`, [id]);

// ── Preservation
const after = await snapshot();
for (const tb of TABLES) await t(`${tb}: same rows, company_code and updated_at untouched`, async () => JSON.stringify(after[tb]) === JSON.stringify(before[tb]), is(true));
await t("the backfill wrote no activity entries", async () => after.activity, is(before.activity));
await t("every operational record has a stream (nothing orphaned)", () => sys(`select ((select count(*) from public.os_projects where streams = '{}') + (select count(*) from public.os_tasks where streams = '{}')
  + (select count(*) from public.os_timeline_items where streams = '{}') + (select count(*) from public.os_kpis where streams = '{}')
  + (select count(*) from public.os_decisions where streams = '{}') + (select count(*) from public.os_partnerships where streams = '{}'))::int`), is(0));
await t("every record has an assignment entry", () => sys(`select ((select count(*) from public.os_stream_assignments)
  - ((select count(*) from public.os_projects) + (select count(*) from public.os_tasks) + (select count(*) from public.os_timeline_items)
     + (select count(*) from public.os_kpis) + (select count(*) from public.os_decisions) + (select count(*) from public.os_partnerships)
     + (select count(*) from public.os_fin_transactions) + (select count(*) from public.os_events) + (select count(*) from public.os_documents)
     + (select count(*) from public.os_meetings) + (select count(*) from public.os_objectives) + (select count(*) from public.os_announcements)
     + (select count(*) from public.os_product_items) + (select count(*) from public.os_requests) + (select count(*) from public.os_campaigns)
     + (select count(*) from public.os_campaign_items) + (select count(*) from public.os_fin_budgets) + (select count(*) from public.os_letters)
     + (select count(*) from public.os_agreements)))::int`), is(0));

// ── Assignment rules
await t("GIF programme project is GIF only", () => streams("os_projects", "PRJ-0033"), is("GIF"));
await t("its tasks are GIF", () => sys(`select count(*)::int from public.os_tasks where project_id = 'PRJ-0033' and streams <> '{GIF}'`), is(0));
await t("a subtask follows its parent", () => streams("os_tasks", "TSK-0203"), is("GIF"));
await t("its milestones are GIF", () => sys(`select count(*)::int from public.os_timeline_items where project_id = 'PRJ-0033' and streams <> '{GIF}'`), is(0));
await t("its decisions are GIF", () => sys(`select count(*)::int from public.os_decisions where project_id = 'PRJ-0033' and streams = '{GIF}'`), atLeast(1));
await t("an Elco partnership on the GIF project carries both and is flagged", async () => [await streams("os_partnerships", "OPP-0900"),
  await sys(`select reason from public.os_stream_reviews where entity_id = 'OPP-0900' and reason = 'company_differs_from_parent'`)], is(["ELC,GIF", "company_differs_from_parent"]));
await t("a GIF-named project that is not a programme keeps IELSco and is flagged (not guessed)", async () => [await streams("os_projects", "PRJ-0034"),
  await sys(`select array_to_string(suggested_streams, ',') from public.os_stream_reviews where entity_id = 'PRJ-0034'`)], is(["IEL", "IEL,GIF"]));
await t("a loose IELSco task about GIF is flagged", () => sys(`select reason from public.os_stream_reviews where entity_id = 'TSK-0202'`), is("text_mentions_other_stream"));
await t("Elco and HQ work map to their streams", async () => [await streams("os_projects", "PRJ-0040"), await streams("os_tasks", "TSK-0200"), await streams("os_tasks", "TSK-0201")], is(["ELC", "ELC", "HQ"]));
await t("timeline workstreams that name a stream take it (WS2-4 GIF, WS5/7 IELSco, WS6 Elco)", () => sys(`select string_agg(distinct workstream_code || '=' || array_to_string(streams, ','), ' ' order by workstream_code || '=' || array_to_string(streams, ','))
  from public.os_timeline_items where workstream_code in ('WS2', 'WS3', 'WS4', 'WS5', 'WS6', 'WS7')`), is("WS2=GIF WS3=GIF WS4=GIF WS5=IEL WS6=ELC WS7=IEL"));
await t("HQ workstreams that name no stream stay HQ and are flagged", () => sys(`select count(*)::int from public.os_stream_reviews r join public.os_timeline_items x on x.id = r.entity_id
  where r.reason = 'workstream_unclear' and x.workstream_code in ('WS0', 'WS1', 'WS8', 'WS9') and x.streams = '{HQ}'`), is(39));
await t("finance on the GIF project is GIF; without a project it stays unattributed; entity unchanged", async () => [await streams("os_fin_transactions", "TRX-0900"),
  await streams("os_fin_transactions", "TRX-0901"), await sys(`select company_code from public.os_fin_transactions where id = 'TRX-0900'`)], is(["GIF", "", "IEL"]));

// ── Work across streams
await t("an Elco-only member now reads IELSco/GIF Internal work", () => count(EL, `select id from public.os_tasks where project_id = 'PRJ-0033'`), atLeast(4));
await t("a member creates a GIF task with no company, for someone in another division", () => one(EL,
  `insert into public.os_tasks (title, streams, owner_person_id, division_id) values ('Brief GIF delegates on the Elco app', '{GIF}', 'PPL-0007', 'DIV-03') returning id || ':' || coalesce(company_code, '-') || ':' || array_to_string(streams, ',')`),
  (v) => (/^TSK-\d+:-:GIF$/.test(v) ? null : `got ${v}`));
await t("a task in a project takes the project's streams", () => one(RE, `insert into public.os_tasks (title, project_id) values ('Visa list', 'PRJ-0033') returning array_to_string(streams, ',')`), is("GIF"));
await t("a record can be in several streams, in canonical order", () => one(ME, `insert into public.os_tasks (title, streams) values ('Joint launch', '{gif,ELC, IEL,GIF}') returning array_to_string(streams, ',')`), is("IEL,ELC,GIF"));
await te("an unknown stream is refused", () => user(ME, `insert into public.os_tasks (title, streams) values ('x', '{ACME}')`), /streams_valid/);
await t("a task with no stream and no company is allowed (shown in HQ as not assigned)", () => one(ME, `insert into public.os_tasks (title) values ('Loose idea') returning cardinality(streams)`), is(0));
await t("a GIF event can link an Elco task (was 'same company')", () => one(RE,
  `select public.os_create_event('{"title": "GIF x Elco sync", "project_id": "PRJ-0033", "task_ids": ["TSK-0200"], "starts_at": "2026-12-01T03:00:00Z", "ends_at": "2026-12-01T04:00:00Z", "streams": ["GIF", "ELC"]}'::jsonb)`),
  (v) => (/^EV-/.test(v) ? null : `got ${v}`));
await t("the event keeps the streams it was given", () => sys(`select array_to_string(streams, ',') from public.os_events where title = 'GIF x Elco sync'`), is("ELC,GIF"));
await t("an Elco member can be invited to a GIF event", () => one(RE,
  `insert into public.os_event_attendees (event_id, person_id) select id, 'PPL-9003' from public.os_events where title = 'GIF x Elco sync' returning person_id`), is("PPL-9003"));
await t("invite candidates list every active staff member", () => count(RE, `select * from public.os_invite_candidates('ELC')`), is(6));
await t("tasks in different companies can depend on each other", () => one(A, `insert into public.os_task_dependencies (task_id, depends_on_task_id) values ('TSK-0106', 'TSK-0200') returning task_id`), is("TSK-0106"));
await t("batch task creation takes streams", () => one(ME, `select public.os_create_tasks('[{"title": "Pitch deck refresh", "streams": ["ELC"]}]'::jsonb) ->> 0`), (v) => (JSON.parse(v).id ? null : v));
await t("…and the new task is Elco", () => sys(`select array_to_string(streams, ',') from public.os_tasks where title = 'Pitch deck refresh'`), is("ELC"));
await t("AI-planned content slots take streams and need no company", () => one(A, `select public.os_create_content_items('[{"title": "GIF countdown post", "streams": ["GIF"], "planned_publish_date": "2026-12-01"}]'::jsonb) -> 0 ->> 'title'`), is("GIF countdown post"));
await t("…stored as GIF with no legal entity", () => sys(`select coalesce(company_code, '-') || ':' || array_to_string(streams, ',') from public.os_campaign_items where title = 'GIF countdown post'`), is("-:GIF"));
await t("activity on new work carries its streams", () => sys(`select array_to_string(streams, ',') from public.os_activity where entity_type = 'task' and summary = 'Visa list' and action = 'insert'`), is("GIF"));
await t("an expense booked in Elco's books can serve the GIF project", () => one(EL,
  `select public.os_fin_submit('expense', 'ELC', 'DIV-03', 250000, '2026-11-25', 'Elco demo kit for GIF', null, 'PRJ-0033')`), (v) => (/^TRX-/.test(v) ? null : `got ${v}`));
await t("…it is in the GIF stream and still in Elco's books", () => sys(`select company_code || ':' || array_to_string(streams, ',') from public.os_fin_transactions where description = 'Elco demo kit for GIF'`), is("ELC:GIF"));
await t("a person with no company can sign in", () => one(FR, `select public.os_current_person()`), is("PPL-9005"));
await t("…and works like any staff member", () => count(FR, `select id from public.os_projects where id in ('PRJ-0033', 'PRJ-0040', 'PRJ-0041')`), is(3));

// ── What still protects records
await t("Confidential stays with its division: a Growth member can't read Partnerships' confidential project", () => count(ME, `select id from public.os_projects where id = 'PRJ-0042'`), is(0));
await t("…the Partnerships manager can", () => count(SH, `select id from public.os_projects where id = 'PRJ-0042'`), is(1));
await t("Restricted stays founders-only", async () => [await count(RE, `select id from public.os_projects where id = 'PRJ-0043'`), await count(A, `select id from public.os_projects where id = 'PRJ-0043'`)], is([0, 1]));
await t("guests still see nothing they were not granted", () => count(GU, `select id from public.os_tasks`), is(0));
await te("a member still can't edit another division's project", () => one(ME, `update public.os_projects set name = 'x' where id = 'PRJ-0040' returning id`).then((v) => { if (v === undefined) throw new Error("no row (refused)"); }), /refused/);
await te("a member can't read the finance ledger of a division they are not in", () => one(ME, `select id from public.os_fin_transactions where id = 'TRX-0901'`).then((v) => { if (v === undefined) throw new Error("no row (refused)"); }), /refused/);
await t("a member can change the streams of a task they own", () => one(ME, `update public.os_tasks set streams = '{IEL,GIF}' where id = 'TSK-0202' returning array_to_string(streams, ',')`), is("IEL,GIF"));

// ── Reviews
await te("a member can't settle a review", () => user(ME, `select public.os_stream_review_resolve(array(select id from public.os_stream_reviews where entity_id = 'PRJ-0034'), 'apply')`), /Only founders and managers/);
await t("a founder applies the suggestion", () => one(A, `select public.os_stream_review_resolve(array(select id from public.os_stream_reviews where entity_id = 'PRJ-0034'), 'apply')`), is(1));
await t("…the project is now IELSco and GIF, and the review is closed and audited", async () => [await streams("os_projects", "PRJ-0034"),
  await sys(`select status from public.os_stream_reviews where entity_id = 'PRJ-0034'`), await sys(`select count(*)::int from public.os_audit_log where action = 'streams.review_apply' and target_id = 'PRJ-0034'`)],
  is(["IEL,GIF", "applied", 1]));
await t("a manager changes a flagged milestone to GIF in bulk", () => one(RE, `select public.os_stream_review_resolve(array(select r.id from public.os_stream_reviews r join public.os_timeline_items x on x.id = r.entity_id where x.workstream_code = 'WS9' and r.status = 'open'), 'change', '{GIF}')`), is(7));
await t("…keeping one leaves its streams as they are", () => one(A, `select public.os_stream_review_resolve(array(select r.id from public.os_stream_reviews r join public.os_timeline_items x on x.id = r.entity_id where x.workstream_code = 'WS0' and r.status = 'open' limit 1), 'keep')`), is(1));
await t("finance streams are set through os_set_streams by Finance or the requester", () => one(EL, `select array_to_string(public.os_set_streams('transaction', (select id from public.os_fin_transactions where description = 'Elco demo kit for GIF'), '{ELC,GIF}'), ',')`), is("ELC,GIF"));
await te("…not by someone else", () => user(ME, `select public.os_set_streams('transaction', 'TRX-0900', '{IEL}')`), /can't change the streams/);
await t("the stream summary has the four streams and counts only what the caller sees", async () => {
  const r = (await user(A, `select stream_code, active_projects from public.os_stream_summary()`)).rows;
  return r.map((x) => x.stream_code).join(",") + ":" + (r.find((x) => x.stream_code === "GIF").active_projects >= 2);
}, is("HQ,IEL,ELC,GIF:true"));
await t("streams are readable by staff", () => count(ME, `select * from public.os_streams`), is(4));

// ── Rollback, then re-apply
const pendingNull = await sys(`select count(*)::int from public.os_tasks where company_code is null`);
await db.exec(readFileSync(ROLLBACK, "utf8"));
ok("rollback runs");
await t("streams columns are gone", () => sys(`select count(*)::int from information_schema.columns where table_schema = 'public' and column_name = 'streams' and table_name not like 'os_streams_rollback%'`), is(0));
await t("records created without a unit got one back and are listed", async () => [await sys(`select count(*)::int from public.os_tasks where company_code is null`),
  await sys(`select count(*)::int from public.os_streams_rollback_units where table_name = 'os_tasks'`) >= pendingNull], is([0, true]));
await t("GIF-only new work went back to IELSco, where GIF lived", () => sys(`select company_code from public.os_tasks where title = 'Brief GIF delegates on the Elco app'`), is("IEL"));
await t("company_code is required again", () => sys(`select is_nullable from information_schema.columns where table_name = 'os_tasks' and column_name = 'company_code'`), is("NO"));
await t("streams were saved before the drop", () => sys(`select count(*)::int from public.os_streams_rollback_backup`), atLeast(200));
await t("sign-in needs a company again", () => one(FR, `select public.os_current_person()`), is(null));
await te("same-company link rule is back", () => user(A, `insert into public.os_events (title, project_id, task_id, starts_at, ends_at) values ('x', 'PRJ-0040', 'TSK-0106', now(), now() + interval '1 hour')`), /same company/);
await t("an Elco-only member is limited to Elco again", () => count(EL, `select id from public.os_tasks where project_id = 'PRJ-0033'`), is(0));
await t("no record was lost by the round trip", async () => (await sys(`select count(*)::int from public.os_projects`)) === before.os_projects.n, is(true));
await db.exec(mig);
ok("migration re-applies after a rollback");
await t("…and assigns streams again", () => streams("os_projects", "PRJ-0033"), is("GIF"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

async function count(uid, q, p) { return one(uid, `select count(*)::int from (${q}) x`, p); }
