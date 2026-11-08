// Careers 2027 recruitment journey, end to end against the local stack (never production):
//   DB/auth stand-in: workspace/local-stack/ielsco-db-recruit.mjs on :54332 (real migrations + RLS, window forced open)
//   App: workspace/local-stack/ielsco-recruit-dev.mjs on :3340
// Run (playwright-core 1.49.1 + chromium-1148):  node careers-recruitment.e2e.mjs [baseUrl] [dbUrl] [shotsDir]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const BASE = process.argv[2] || "http://localhost:3340";
const DB = process.argv[3] || "http://127.0.0.1:54332";
const SHOTS = process.argv[4] || join(os.tmpdir(), "careers-e2e");
mkdirSync(SHOTS, { recursive: true });
const PDF = join(SHOTS, "cv.pdf");
writeFileSync(PDF, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const sql = async (q) => (await fetch(`${DB}/__sql`, { method: "POST", body: JSON.stringify({ sql: q }) })).json();

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };
const check = async (n, fn) => { try { const w = await fn(); w ? bad(n, w) : ok(n); } catch (e) { bad(n, e.message.split("\n")[0]); } };

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });

async function fillApplication(page, { name, roles, portfolio = "link" }) {
  await page.getByTestId("apply-next").click(); // account → about
  if (name) await page.getByTestId("f-full-name").fill(name);
  await page.getByTestId("f-whatsapp").fill("0812 3456 7890");
  await page.getByTestId("f-university").fill("Universitas Brawijaya");
  await page.locator("label:has([data-testid=f-year-2])").click();
  await page.getByTestId("f-batch").fill("2024");
  await page.getByTestId("apply-next").click();
  for (const r of roles) await page.getByTestId(`role-option-${r}`).click();
  await page.getByTestId("apply-next").click();
  await page.getByTestId("f-instagram").fill("@applicant.test");
  await page.getByTestId("f-linkedin").fill("https://id.linkedin.com/in/applicant-test");
  await page.getByTestId("f-motivation").fill("I want to help students across Southeast Asia reach global opportunities.");
  await page.getByTestId("f-cv").setInputFiles(PDF);
  await page.getByTestId("f-cv-done").waitFor();
  if (portfolio === "file") { await page.getByTestId("pf-mode-file").click(); await page.getByTestId("f-portfolio").setInputFiles(PDF); await page.getByTestId("f-portfolio-done").waitFor(); }
  else await page.getByTestId("f-portfolio-url").fill("https://behance.net/applicant-test");
  await page.getByTestId("apply-next").click();
}
async function tasksAndSubmit(page) {
  for (const k of ["follow_ielsco", "follow_elco", "comment_mention", "share_story", "twibbon", "story_24h", "repost"]) await page.getByTestId(`task-${k}`).check();
  await page.getByTestId("apply-next").click();
  await page.getByTestId("f-privacy").check();
  await page.getByTestId("f-declaration").check();
  await page.getByTestId("apply-submit").click();
  await page.getByTestId("application-status").waitFor({ timeout: 20000 });
}

// ── 1. Public /careers ──
{
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(`${BASE}/careers`, { waitUntil: "networkidle" });
  await check("careers: hero says 2027 Team Recruitment and is open", async () => (/2027 team recruitment/i.test((await page.locator("h1").innerText()).replace(/\s+/g, " ")) && (await page.getByTestId("recruitment-status").innerText()).match(/now open/i) ? null : "hero"));
  await check("careers: 17 roles in the facts strip", async () => ((await page.getByTestId("careers-facts").innerText()).includes("17") ? null : "count"));
  await check("careers: Content Creator listed with New tag", async () => ((await page.getByTestId("division-growth").innerText()).match(/Content Creator\s*New/i) ? null : await page.getByTestId("division-growth").innerText()));
  await check("careers: seven campaign tasks", async () => ((await page.getByTestId("campaign-tasks").locator("li").count()) === 7 ? null : "tasks"));
  await check("careers: no anonymous form any more", async () => ((await page.locator("[data-testid=career-application-form]").count()) === 0 ? null : "old form present"));
  await shot(page, "01-careers-desktop");
  await page.getByTestId("careers-cta").click();
  await page.waitForURL(/\/sign-in\?next=%2Fdashboard%2Fcareers%2Fapply/, { waitUntil: "commit" });
  await check("Apply now → sign-in with next, careers note shown", async () => ((await page.getByTestId("auth-careers-note").isVisible()) ? null : "note"));
  await shot(page, "02-sign-in-careers");
  await page.close();
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(`${BASE}/careers`, { waitUntil: "networkidle" });
  await check("careers mobile: no horizontal scroll", async () => { const w = await m.evaluate(() => document.documentElement.scrollWidth); return w <= 392 ? null : `scrollWidth ${w}`; });
  await shot(m, "03-careers-mobile");
  await m.close();
}

// ── 2. New user: sign up (Elco-Pass) → application, one role ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const email = `new.applicant.${Date.now()}@example.test`;
  await page.goto(`${BASE}/sign-up?next=${encodeURIComponent("/dashboard/careers/apply")}`, { waitUntil: "networkidle" });
  await page.locator("input[name=fullName]").fill("Nadia Applicant");
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill("Local-test-pass-123");
  await page.locator("input[name=confirmPassword]").fill("Local-test-pass-123");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/dashboard\/careers\/apply/, { timeout: 30000, waitUntil: "commit" });
  await page.getByTestId("apply-wizard").waitFor({ timeout: 20000 });
  await check("new user lands on the application after sign-up", async () => null);
  await check("dashboard sidebar hidden on the application", async () => ((await page.locator("[data-testid=dashboard-sidebar]").count()) === 0 ? null : "sidebar present"));
  await check("account step shows the Elco-Pass email and the optional Elco link", async () => ((await page.getByTestId("apply-account-email").innerText()) === email && (await page.getByTestId("apply-elco-link").isVisible()) ? null : "account"));
  await check("Elco connect goes through the existing secure link flow", async () => ((await page.getByTestId("apply-elco-connect").getAttribute("href"))?.endsWith("/connect/ielsco") ? null : "href"));
  await shot(page, "04-apply-account");
  await page.getByTestId("apply-next").click();
  await check("biodata reused: name prefilled from the account", async () => ((await page.getByTestId("f-full-name").inputValue()) === "Nadia Applicant" ? null : await page.getByTestId("f-full-name").inputValue()));
  await check("email comes from the account and is read-only", async () => ((await page.getByTestId("f-email").inputValue()) === email && (await page.getByTestId("f-email").getAttribute("readonly")) !== null ? null : "email"));
  await page.getByTestId("apply-next").click();
  await check("validation blocks an empty step", async () => ((await page.locator("[role=alert]").count()) >= 3 ? null : "no errors"));
  await page.getByTestId("apply-back").click().catch(() => {});
  await page.goto(`${BASE}/dashboard/careers/apply`);
  await page.getByTestId("apply-wizard").waitFor();
  await fillApplication(page, { name: "Nadia Applicant", roles: ["G4"] });
  await shot(page, "05-apply-tasks");
  await tasksAndSubmit(page);
  await check("submitted: status view with one role", async () => ((await page.getByTestId("application-role-1").innerText()).includes("Content Creator") && (await page.getByTestId("application-role-2").innerText()) === "None" ? null : "roles"));
  await check("submitted: seven tasks to be checked", async () => ((await page.getByTestId("application-tasks").locator("li").count()) === 7 ? null : "tasks"));
  await shot(page, "06-status");
  const row = (await sql(`select a.*, (select count(*) from public.career_application_drafts d where d.user_id = a.user_id) drafts from public.career_applications a where email = '${email}'`))[0];
  await check("DB: tied to the user, statuses, timestamps, portfolio link, draft cleared", async () => (row && row.user_id && row.status === "submitted" && row.campaign_verification === "pending" && row.privacy_accepted_at && row.declaration_accepted_at && row.tasks_confirmed_at && row.role_id === "G4" && row.division === "growth" && row.portfolio_url && row.cv_path.startsWith(`applicants/${row.user_id}/`) && Number(row.drafts) === 0 ? null : JSON.stringify(row)));
  await ctx.close();
}

// Existing local accounts have finished onboarding (otherwise the dashboard sends them to /dashboard/onboarding first).
await sql(`insert into public.member_profiles (user_id, display_name, onboarding_completed_at, origin_country) select id, 'Local', now(), 'ID' from auth.users where email in ('demo.member@example.test', 'demo.admin@example.test') on conflict (user_id) do update set onboarding_completed_at = now(), origin_country = 'ID'`);
await sql(`delete from public.career_applications where email in ('demo.member@example.test', 'demo.admin@example.test')`);
await sql(`delete from public.career_application_drafts where user_id in (select id from auth.users where email in ('demo.member@example.test', 'demo.admin@example.test'))`);

// ── 3. Existing user: sign in → saved progress → two roles → change application (no duplicate) ──
let memberEmail = "demo.member@example.test";
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/dashboard/careers/apply`);
  await page.waitForURL(/\/sign-in\?next=/, { waitUntil: "commit" });
  await page.getByTestId("auth-email-input").fill(memberEmail);
  await page.getByTestId("auth-password-input").fill("anything");
  await page.getByTestId("auth-submit-btn").click();
  await page.waitForURL(/\/dashboard\/careers\/apply/, { timeout: 30000, waitUntil: "commit" });
  await page.getByTestId("apply-wizard").waitFor();
  await check("existing user signs in and returns to the application", async () => null);
  await page.getByTestId("apply-next").click();
  await page.getByTestId("f-whatsapp").fill("+62 811 222 333");
  await page.getByTestId("f-university").fill("Universitas Indonesia");
  await page.waitForTimeout(2500);
  await check("progress saved indicator", async () => ((await page.getByTestId("apply-save-state").innerText()).includes("saved") ? null : await page.getByTestId("apply-save-state").innerText()));
  await page.reload();
  await page.getByTestId("apply-wizard").waitFor();
  await check("saved progress restored after reload (step and answers)", async () => ((await page.getByTestId("apply-resumed").isVisible()) && (await page.getByTestId("f-university").inputValue()) === "Universitas Indonesia" ? null : "not restored"));
  await page.goto(`${BASE}/dashboard/careers/apply`);
  await page.getByTestId("apply-wizard").waitFor();
  await page.getByTestId("apply-back").click(); // back to account so fillApplication starts from the top
  await fillApplication(page, { roles: ["K1", "O1"], portfolio: "file" });
  await tasksAndSubmit(page);
  await check("two roles stored as 1st and 2nd choice", async () => ((await page.getByTestId("application-role-1").innerText()).includes("Graphic Designer") && (await page.getByTestId("application-role-2").innerText()).includes("Project Manager") ? null : "roles"));
  const before = await sql(`select id, updated_at from public.career_applications where email = '${memberEmail}'`);
  await page.getByTestId("application-edit").click();
  await page.getByTestId("apply-updating").waitFor();
  for (let i = 0; i < 2; i++) await page.getByTestId("apply-next").click(); // account → about → roles
  await page.getByTestId("role-option-O1").click(); // drop the 2nd choice
  await page.getByTestId("apply-next").click(); await page.getByTestId("apply-next").click(); await page.getByTestId("apply-next").click();
  await page.getByTestId("f-privacy").check(); await page.getByTestId("f-declaration").check();
  await page.getByTestId("apply-submit").click();
  await page.getByTestId("application-status").waitFor();
  const after = await sql(`select id, role_2_id from public.career_applications where email = '${memberEmail}'`);
  await check("changing the application updates the same row (no duplicate)", async () => (after.length === 1 && before.length === 1 && after[0].id === before[0].id && after[0].role_2_id === null ? null : JSON.stringify({ before, after })));
  // Dashboard banner
  await page.goto(`${BASE}/dashboard`);
  const card = page.getByTestId("home-recruitment");
  const hasCard = await card.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (hasCard) {
    await check("dashboard card shows the application status", async () => ((await page.getByTestId("home-recruitment-status").innerText()).includes("Submitted") ? null : "status"));
    await shot(page, "07-dashboard-card");
    await page.getByTestId("home-recruitment-cta").click();
    await page.waitForURL(/\/dashboard\/careers\/apply/, { waitUntil: "commit" });
    await check("dashboard card → application", async () => null);
  } else bad("dashboard card visible", `not on ${page.url()}`);
  await ctx.close();
}

// ── 4. Banner for someone who hasn't applied; admin verification; mobile wizard ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`);
  await page.getByTestId("auth-email-input").fill("demo.admin@example.test");
  await page.getByTestId("auth-password-input").fill("anything");
  await page.getByTestId("auth-submit-btn").click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: "commit" });
  await page.goto(`${BASE}/dashboard`);
  const hasCard = await page.getByTestId("home-recruitment").waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (hasCard) await check("banner says IELSco & Elco AI are recruiting, Apply now", async () => ((await page.getByTestId("home-recruitment-cta").innerText()).includes("Apply now") ? null : "cta"));
  else console.log("NOTE banner not reached for admin (", page.url(), ")");
  await page.goto(`${BASE}/dashboard/admin/operations`);
  await page.getByRole("tab", { name: "Applications" }).click();
  await page.getByTestId("admin-career-applications").waitFor();
  const item = page.locator("li", { hasText: memberEmail }).first();
  await item.getByTestId("admin-task-follow_ielsco").selectOption("verified");
  await item.getByTestId("admin-task-repost").selectOption("not_found");
  await page.waitForTimeout(1500);
  const r = (await sql(`select campaign_tasks, campaign_verification from public.career_applications where email = '${memberEmail}'`))[0];
  await check("admin records per-task verification", async () => (r.campaign_tasks.follow_ielsco === "verified" && r.campaign_tasks.repost === "not_found" && r.campaign_verification === "incomplete" ? null : JSON.stringify(r)));
  await shot(page, "08-admin-tasks");
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in?next=${encodeURIComponent("/dashboard/careers/apply")}`);
  await page.getByTestId("auth-email-input").fill(memberEmail);
  await page.getByTestId("auth-password-input").fill("anything");
  await page.getByTestId("auth-submit-btn").click();
  await page.waitForURL(/\/dashboard\/careers\/apply/, { timeout: 30000, waitUntil: "commit" });
  await page.getByTestId("application-status").waitFor();
  await check("applicant sees the admin's per-task result", async () => ((await page.getByTestId("status-task-follow_ielsco").innerText()).includes("Verified") && (await page.getByTestId("status-task-repost").innerText()).includes("Not found") ? null : "tasks"));
  await check("mobile: no horizontal scroll on the status page", async () => { const w = await page.evaluate(() => document.documentElement.scrollWidth); return w <= 392 ? null : `scrollWidth ${w}`; });
  await shot(page, "09-status-mobile");
  await page.getByTestId("application-edit").click();
  await page.getByTestId("apply-next").click(); await page.getByTestId("apply-next").click();
  await check("mobile: roles step fits", async () => { const w = await page.evaluate(() => document.documentElement.scrollWidth); return w <= 392 ? null : `scrollWidth ${w}`; });
  await shot(page, "10-roles-mobile");
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed. Screenshots: ${SHOTS}`);
process.exit(fail ? 1 : 0);
