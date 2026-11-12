// Company OS → Recruitment end to end: a real browser against a production build, a real Postgres with every Company
// OS and careers migration, and tests/e2e/company-os/gateway.mjs (Supabase Auth + PostgREST stand-in running each
// query as the JWT's role, so RLS and the security-definer functions are the real ones).
//
// Stack: as tests/e2e/company-os/README.md, plus tests/e2e/os-recruitment/setup-extra.sql after setup-db.sql and the
// careers migrations (20261101000000, 20261111000000, 20261112000000) and 20261112010000_os_recruitment.sql.
// Usage: PSQL=<path to psql> PGPORT=<port> node tests/e2e/os-recruitment.e2e.mjs [screenshot dir]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const OUT = process.argv[2] || "./os-recruitment-shots";
mkdirSync(OUT, { recursive: true });
const OS = "http://os.localhost:3000";
const GW = "http://localhost:54399";
const PSQL = process.env.PSQL || "psql";
const sql = (q) => execFileSync(PSQL, ["-h", "127.0.0.1", "-p", process.env.PGPORT || "5432", "-U", process.env.PGSUPERUSER || "postgres", "-d", "os_e2e", "-tAqc", q], { encoding: "utf8" }).trim();

let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` -> ${detail}` : ""}`); };

// ── Seed: people, a recruitment grant, three applications ───────────────────────────────────────────────────────────
const A = "aaaaaaaa-1111-4111-8111-000000000001", B = "aaaaaaaa-1111-4111-8111-000000000002", C = "aaaaaaaa-1111-4111-8111-000000000003";
sql(`delete from public.career_applications; truncate public.os_audit_log, public.os_notifications;
  delete from public.os_tasks where candidate_id is not null; delete from public.os_events where candidate_id is not null;
  delete from public.os_grants; delete from public.os_person_divisions; delete from public.os_person_companies;
  alter table public.os_people disable trigger os_people_before_delete; delete from public.os_people; alter table public.os_people enable trigger os_people_before_delete;
  delete from auth.users;
  insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0001', 'Founder Test', 'founder', 'active', 'founder@ielsco.test'),
    ('PPL-0002', 'Recruiter Member', 'member', 'active', 'recruiter@ielsco.test'),
    ('PPL-0003', 'Interviewer Member', 'member', 'active', 'interviewer@ielsco.test'),
    ('PPL-0004', 'Staff No Access', 'member', 'active', 'staff@ielsco.test'),
    ('PPL-0005', 'Division Manager', 'manager', 'active', 'manager@ielsco.test'),
    ('PPL-0006', 'Second Founder', 'founder', 'active', 'founder2@ielsco.test');
  insert into public.os_person_companies values ('PPL-0001','HQ'),('PPL-0001','IEL'),('PPL-0001','ELC'),('PPL-0002','IEL'),('PPL-0003','ELC'),('PPL-0004','IEL'),('PPL-0005','IEL'),('PPL-0006','HQ'),('PPL-0006','IEL');
  insert into public.os_person_divisions values ('PPL-0004','DIV-05',true);
  alter table public.os_grants disable trigger os_grants_before_write;
  insert into public.os_grants (person_id, resource_type, resource_id, level, reason, granted_by) values ('PPL-0002', 'recruitment', '2027', 'edit', 'Recruitment team', 'PPL-0001');
  alter table public.os_grants enable trigger os_grants_before_write;
  insert into public.career_applications (id, cohort, full_name, email, whatsapp, university, academic_year, batch_year, domicile_country, domicile_city, division, role_id, role_2_id,
    instagram_url, linkedin_url, cv_path, portfolio_url, motivation, status, campaign_verification, submitted_at, tasks_confirmed_at, privacy_accepted_at, declaration_accepted_at) values
  ('${A}', '2027', 'Alya Putri', 'alya@example.test', '+6281234567890', 'Universitas Brawijaya', 2, 2024, 'ID', 'Malang', 'growth', 'G4', 'K1',
    'https://www.instagram.com/alya.putri/', 'https://www.linkedin.com/in/alya-putri/', 'applicants/00000000-0000-0000-0000-000000000001/cv-abcdefgh12.pdf', 'https://behance.net/alya',
    'I want to help students across Southeast Asia reach global opportunities.', 'submitted', 'pending', now() - interval '2 days', now(), now(), now()),
  ('${B}', '2027', 'Budi Santoso', 'budi@example.test', '+60123456789', 'Universiti Malaya', 1, 2025, 'MY', 'Kuala Lumpur', 'operations', 'O1', null,
    'https://www.instagram.com/budi.s/', 'https://www.linkedin.com/in/budi-s/', 'applicants/00000000-0000-0000-0000-000000000002/cv-abcdefgh34.pdf', null,
    'Organised and keen to run programs for students.', 'submitted', 'pending', now() - interval '1 day', now(), now(), now()),
  ('${C}', '2027', 'Citra Dewi', 'citra@example.test', '+6281211112222', 'Universitas Indonesia', 3, 2023, 'ID', 'Depok', 'people', 'P1', 'G1',
    'https://www.instagram.com/citra.d/', 'https://www.linkedin.com/in/citra-d/', 'applicants/00000000-0000-0000-0000-000000000003/cv-abcdefgh56.pdf', null,
    'I love writing stories about people and their journeys.', 'submitted', 'pending', now(), now(), now(), now());`);
check("seed: three applications got pipeline rows", sql(`select count(*) from public.os_recruitment_candidates where stage = 'new'`) === "3");

const browser = await chromium.launch();
async function signIn(email, aal2 = false, viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ email, verified: true, aal2 }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const navHasRecruitment = async (page) => (await page.locator('nav a[href="/os/recruitment"], aside a[href="/os/recruitment"]').count()) > 0;
const accessToken = async (ctx) => {
  const c = (await ctx.cookies(OS)).filter((x) => x.name.startsWith("sb-localhost-auth-token") && !x.name.includes("verifier")).sort((a, b) => a.name.localeCompare(b.name));
  if (!c.length) return null;
  let v = c.map((x) => x.value).join("");
  if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString();
  return JSON.parse(v).access_token;
};
const restAs = (token, path) => fetch(`${GW}/rest/v1/${path}`, { headers: { apikey: token, authorization: `Bearer ${token}` } }).then((r) => r.json());

// ── Staff without recruitment access ──
{
  const { ctx, page } = await signIn("staff@ielsco.test");
  await page.goto(`${OS}/os`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
  check("no access: Recruitment is not in the menu", !(await navHasRecruitment(page)));
  await page.goto(`${OS}/os/recruitment`); await page.waitForLoadState("networkidle");
  check("no access: the page says so", (await page.getByText("No recruitment access").count()) > 0);
  const token = await accessToken(ctx);
  const rows = await restAs(token, "career_applications?select=id");
  check("no access: the API returns no applications (RLS)", Array.isArray(rows) && rows.length === 0, JSON.stringify(rows).slice(0, 120));
  const pipe = await restAs(token, "os_recruitment_candidates?select=application_id");
  check("no access: no pipeline rows either", Array.isArray(pipe) && pipe.length === 0);
  await ctx.close();
}

// ── Every active manager and founder is on the recruitment team by role (no grant, no authenticator code needed) ──
for (const [who, email] of [["manager", "manager@ielsco.test"], ["founder without an authenticator code", "founder2@ielsco.test"]]) {
  const { ctx, page } = await signIn(email);
  await page.goto(`${OS}/os`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
  check(`${who}: Recruitment is in the menu`, await navHasRecruitment(page));
  await page.goto(`${OS}/os/recruitment`);
  await page.getByTestId("os-recruitment-list").waitFor({ timeout: 20000 }).catch(() => {});
  check(`${who}: the recruitment list opens`, (await page.getByTestId("os-recruitment-list").count()) > 0 && (await page.getByText("No recruitment access").count()) === 0);
  const token = await accessToken(ctx);
  const rows = await restAs(token, "career_applications?select=id");
  check(`${who}: the API returns the applications`, Array.isArray(rows) && rows.length === 3, JSON.stringify(rows).slice(0, 120));
  const edit = await (await fetch(`${GW}/rest/v1/rpc/os_recruitment_access`, { method: "POST", headers: { apikey: token, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ p_level: "edit" }) })).json();
  check(`${who}: can work candidates (edit access)`, edit === true, JSON.stringify(edit));
  await ctx.close();
}

// ── Founder: the whole workflow ──
{
  const { ctx, page } = await signIn("founder@ielsco.test", true);
  await page.goto(`${OS}/os`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
  check("founder: Recruitment in the menu", await navHasRecruitment(page));
  await page.goto(`${OS}/os/recruitment`);
  await page.getByTestId("os-recruitment-list").waitFor({ timeout: 20000 });
  check("list: three applicants", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 3);
  check("stats: applications and stages", (await page.getByTestId("os-recruitment-stats").innerText()).includes("New application"));
  await page.screenshot({ path: `${OUT}/os-recruitment-list.png` });
  await page.getByTestId("os-recruitment-search").fill("Malang");
  check("search by city", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 1);
  await page.getByTestId("os-recruitment-search").fill("");
  await page.getByLabel("Academic year").selectOption("3");
  check("filter by academic year", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 1);
  await page.getByLabel("Academic year").selectOption("");
  await page.getByLabel("Role", { exact: true }).selectOption("K1");
  check("filter by role (2nd choice counts)", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 1);
  await page.getByLabel("Role", { exact: true }).selectOption("");
  await page.getByLabel("Division", { exact: true }).selectOption("growth");
  check("filter by division (1st or 2nd choice)", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 2);
  await page.goto(`${OS}/os/recruitment?view=pipeline`);
  await page.getByTestId("os-recruitment-pipeline").waitFor();
  check("pipeline board: seven stages", (await page.getByTestId("os-recruitment-pipeline").locator("section").count()) === 7);
  await page.screenshot({ path: `${OS.includes("os") ? OUT : OUT}/os-recruitment-pipeline.png` });

  await page.goto(`${OS}/os/recruitment/${A}`);
  await page.getByTestId("os-candidate").waitFor({ timeout: 20000 });
  const body = await page.getByTestId("os-candidate").innerText();
  check("candidate: personal info with contact for the team", body.includes("alya@example.test") && body.includes("Malang") && body.includes("Universitas Brawijaya"));
  check("candidate: motivation and both roles", body.includes("reach global opportunities") && body.includes("Content Creator") && body.includes("Graphic Designer"));
  // Stage + reviewer
  await page.getByTestId("os-candidate-stage").getByLabel("Stage", { exact: true }).selectOption("cv_screening");
  await page.getByTestId("os-candidate-stage-save").click();
  await page.waitForTimeout(1500);
  check("stage moved to CV screening", sql(`select stage from public.os_recruitment_candidates where application_id = '${A}'`) === "cv_screening");
  check("applicant-facing status follows", sql(`select status from public.career_applications where id = '${A}'`) === "under_review");
  await page.getByTestId("os-candidate-stage").getByLabel("Reviewer", { exact: true }).selectOption("PPL-0002");
  await page.waitForTimeout(1500);
  check("reviewer assigned", sql(`select reviewer_person_id from public.os_recruitment_candidates where application_id = '${A}'`) === "PPL-0002");
  check("stage change audited", Number(sql(`select count(*) from public.os_audit_log where action = 'recruitment.stage' and target_id = '${A}'`)) === 1);
  // Campaign verification
  await page.getByTestId("os-task-follow_ielsco").selectOption("verified");
  await page.waitForTimeout(1200);
  check("campaign task recorded", sql(`select campaign_tasks ->> 'follow_ielsco' from public.career_applications where id = '${A}'`) === "verified");
  // Evaluation
  const ev = page.getByTestId("os-candidate-evaluation");
  await ev.getByLabel("CV quality").selectOption("strong");
  await ev.getByLabel("Motivation", { exact: true }).selectOption("adequate");
  await ev.getByLabel("Summary").fill("Clear CV, relevant campus media work.");
  await page.getByTestId("os-eval-save").click();
  await page.waitForTimeout(1200);
  check("screening evaluation saved (author = founder)", sql(`select author_person_id || ':' || (ratings ->> 'cv_quality') from public.os_recruitment_evaluations where application_id = '${A}' and kind = 'screening'`) === "PPL-0001:strong");
  // Notes
  await page.getByTestId("os-note-body").fill("Team note: strong writing sample.");
  await page.getByTestId("os-note-add").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("os-note-body").fill("Private: double-check availability.");
  await page.getByLabel("Who can see the note").selectOption("private");
  await page.getByTestId("os-note-add").click();
  await page.waitForTimeout(1000);
  check("team and private notes saved", sql(`select string_agg(visibility, ',' order by visibility) from public.os_recruitment_notes where application_id = '${A}'`) === "private,team");
  // Interviewer assignment
  await page.getByLabel("Person to assign").selectOption("PPL-0003");
  await page.getByTestId("os-assign").click();
  await page.waitForTimeout(1200);
  check("interviewer assigned and notified", sql(`select count(*) from public.os_notifications where person_id = 'PPL-0003' and kind = 'candidate_assigned'`) === "1");
  // Task
  await page.getByLabel("Task owner").selectOption("PPL-0002");
  await page.getByTestId("os-task-create").click();
  await page.waitForTimeout(1200);
  check("screening task created, Restricted and linked", sql(`select sensitivity || ':' || owner_person_id from public.os_tasks where candidate_id = '${A}'`) === "Restricted:PPL-0002");
  await page.screenshot({ path: `${OUT}/os-candidate-founder.png`, fullPage: true });
  await ctx.close();
}

// ── Interviewer: only the assigned candidate, only what's needed ──
{
  const { ctx, page } = await signIn("interviewer@ielsco.test");
  await page.goto(`${OS}/os`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(800);
  check("interviewer: Recruitment in the menu (assigned)", await navHasRecruitment(page));
  await page.goto(`${OS}/os/recruitment`);
  await page.getByTestId("os-recruitment-mine").waitFor({ timeout: 20000 });
  check("interviewer: 'Assigned to me' lists only Alya", (await page.getByTestId("os-recruitment-mine").innerText()).includes("Alya Putri") && (await page.getByTestId("os-recruitment-mine").locator("li").count()) === 1);
  check("interviewer: no full applicant table", (await page.getByTestId("os-recruitment-list").count()) === 0);
  await page.goto(`${OS}/os/recruitment/${A}`);
  await page.getByTestId("os-candidate").waitFor({ timeout: 20000 });
  const body = await page.getByTestId("os-candidate").innerText();
  check("interviewer: no email or WhatsApp", !body.includes("alya@example.test") && !body.includes("+6281234567890"));
  check("interviewer: team notes hidden", !body.includes("Team note: strong writing sample.") && !body.includes("double-check availability"));
  check("interviewer: other evaluations hidden", !body.includes("Clear CV, relevant campus media work."));
  const ev = page.getByTestId("os-candidate-evaluation");
  await ev.getByLabel("Evaluation", { exact: true }).selectOption("interview");
  await ev.getByLabel("Communication potential").selectOption("strong");
  await page.getByTestId("os-eval-feedback").fill("Confident, clear answers.");
  await page.getByTestId("os-eval-save").click();
  await page.waitForTimeout(1200);
  check("interviewer: interview feedback saved", sql(`select interview_feedback from public.os_recruitment_evaluations where application_id = '${A}' and author_person_id = 'PPL-0003'`) === "Confident, clear answers.");
  await page.goto(`${OS}/os/recruitment/${B}`); await page.waitForLoadState("networkidle"); await page.waitForTimeout(1500);
  check("interviewer: an unassigned candidate is not shown", (await page.getByText("Candidate not found").count()) > 0);
  const token = await accessToken(ctx);
  check("interviewer: API returns no application rows", (await restAs(token, "career_applications?select=id")).length === 0);
  await ctx.close();
}

// ── Recruiter (edit grant, not a founder) ──
{
  const { ctx, page } = await signIn("recruiter@ielsco.test");
  await page.goto(`${OS}/os/recruitment`);
  await page.getByTestId("os-recruitment-list").waitFor({ timeout: 20000 });
  check("recruiter: sees all applicants", (await page.getByTestId("os-recruitment-list").locator("tbody tr").count()) === 3);
  await page.goto(`${OS}/os/recruitment/${A}`);
  await page.getByTestId("os-candidate").waitFor({ timeout: 20000 });
  const body = await page.getByTestId("os-candidate").innerText();
  check("recruiter: sees the team note and both evaluations, not the founder's private note", body.includes("Team note: strong writing sample.") && !body.includes("double-check availability") && body.includes("Confident, clear answers."));
  await page.getByTestId("os-candidate-stage").getByLabel("Stage", { exact: true }).selectOption("interview");
  await page.getByTestId("os-candidate-stage-save").click();
  await page.waitForTimeout(1500);
  check("recruiter: moves to Interview", sql(`select stage from public.os_recruitment_candidates where application_id = '${A}'`) === "interview");
  check("recruiter: no Onboarding (conversion) section", (await page.getByTestId("os-convert").count()) === 0);
  await ctx.close();
}

// ── Founder: decision and conversion; phone layout ──
{
  const { ctx, page } = await signIn("founder@ielsco.test", true);
  await page.goto(`${OS}/os/recruitment/${A}`);
  await page.getByTestId("os-candidate").waitFor({ timeout: 20000 });
  await page.getByTestId("os-candidate-stage").getByLabel("Stage", { exact: true }).selectOption("accepted");
  await page.getByTestId("os-candidate-stage").getByLabel(/Decision note/).fill("Strong fit for Growth.");
  await page.getByTestId("os-candidate-stage-save").click();
  await page.waitForTimeout(1500);
  check("accepted with a decision note", sql(`select stage || ':' || decided_by || ':' || decision_note from public.os_recruitment_candidates where application_id = '${A}'`) === "accepted:PPL-0001:Strong fit for Growth.");
  await page.reload(); await page.getByTestId("os-convert").waitFor({ timeout: 20000 });
  await page.getByTestId("os-convert").getByLabel("Work Google email").fill("alya@ielsco.test");
  await page.getByTestId("os-convert").getByRole("button", { name: /Create invited person record/ }).click();
  await page.waitForTimeout(1500);
  const person = sql(`select p.id || ':' || p.status from public.os_people p join public.os_recruitment_candidates c on c.employee_person_id = p.id where c.application_id = '${A}'`);
  check("converted: invited person record linked to the application", /^PPL-\d{4}:invited$/.test(person), person);
  check("applicant id preserved", sql(`select count(*) from public.career_applications where id = '${A}'`) === "1");
  await ctx.close();
  const m = await signIn("founder@ielsco.test", true, { width: 360, height: 760 });
  await m.page.goto(`${OS}/os/recruitment`); await m.page.waitForLoadState("networkidle"); await m.page.waitForTimeout(1500);
  check("phone: no horizontal overflow on the list", (await m.page.evaluate(() => document.documentElement.scrollWidth)) <= 362);
  await m.page.screenshot({ path: `${OUT}/os-recruitment-phone.png` });
  await m.ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
