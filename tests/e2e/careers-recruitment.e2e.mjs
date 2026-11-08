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
// The recruitment popup is tested on its own below; everywhere else it is switched off ("Don't show again").
const NO_POPUP = () => { try { localStorage.setItem("iels:recruit2027:never", "1"); } catch {} };
async function newCtx(opts = {}, { popup = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  if (!popup) await ctx.addInitScript(NO_POPUP);
  return ctx;
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });

async function fillApplication(page, { name, roles, portfolio = "link" }) {
  // portfolio: "link" | "file" | "none" (optional for non-Creative roles) | "creative-missing" (expect the error, then add a file)
  await page.getByTestId("apply-next").click(); // account → about
  if (name) await page.getByTestId("f-full-name").fill(name);
  await page.getByTestId("f-whatsapp").fill("0812 3456 7890");
  await page.getByTestId("f-university").fill("Universitas Brawijaya");
  await page.locator("label:has([data-testid=f-year-2])").click();
  await page.getByTestId("f-batch").fill("2024");
  await page.getByTestId("f-country").fill("Indon");
  await page.getByTestId("country-option-ID").click();
  await page.getByTestId("f-city").fill("Malang");
  await page.getByTestId("apply-next").click();
  for (const r of roles) await page.getByTestId(`role-option-${r}`).click();
  await page.getByTestId("apply-next").click();
  await page.getByTestId("f-instagram").fill("@applicant.test");
  await page.getByTestId("f-linkedin").fill("https://id.linkedin.com/in/applicant-test");
  await page.getByTestId("f-motivation").fill("I want to help students across Southeast Asia reach global opportunities.");
  await page.getByTestId("f-cv").setInputFiles(PDF);
  await page.getByTestId("f-cv-done").waitFor();
  if (portfolio === "creative-missing") {
    await check("Creative role: portfolio marked required", async () => ((await page.getByTestId("pf-required").count()) === 1 ? null : "not required"));
    await page.getByTestId("apply-next").click();
    await check("Creative role: no portfolio blocks the step", async () => ((await page.getByText("Creative roles need a portfolio").count()) > 0 ? null : "no error"));
    portfolio = "file";
  }
  if (portfolio === "none") await check("non-Creative roles: portfolio marked optional", async () => ((await page.getByTestId("pf-optional").count()) === 1 ? null : "not optional"));
  if (portfolio === "file") { await page.getByTestId("pf-mode-file").click(); await page.getByTestId("f-portfolio").setInputFiles(PDF); await page.getByTestId("f-portfolio-done").waitFor(); }
  else if (portfolio === "link") await page.getByTestId("f-portfolio-url").fill("https://behance.net/applicant-test");
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
  const page = await (await newCtx({ viewport: { width: 1366, height: 900 } })).newPage();
  await page.goto(`${BASE}/careers`, { waitUntil: "networkidle" });
  await check("careers: hero and open status", async () => ((await page.locator("h1").innerText()).includes("IELSco") && (await page.getByTestId("recruitment-status").innerText()).match(/now open/i) ? null : "hero"));
  await check("careers: IELSco design language (every section has a white background)", async () => {
    const bgs = await page.locator("[data-testid=careers-page] > section").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
    return bgs.every((b) => b === "rgb(255, 255, 255)") ? null : JSON.stringify(bgs);
  });
  await check("careers: no 'Real work' section and no '+ you' tags", async () => { const t = await page.getByTestId("careers-page").innerText(); return /Real work/i.test(t) || /\+ you/.test(t) ? "still there" : null; });
  await check("careers: leadership cards are symmetrical", async () => {
    const boxes = await Promise.all(["arbadza", "farrel"].map((k) => page.getByTestId(`lead-${k}`).boundingBox()));
    const imgs = await Promise.all(["arbadza", "farrel"].map((k) => page.getByTestId(`lead-${k}`).locator("img").boundingBox()));
    return Math.abs(boxes[0].height - boxes[1].height) < 1 && Math.abs(boxes[0].width - boxes[1].width) < 1 && Math.abs(boxes[0].y - boxes[1].y) < 1
      && Math.abs(imgs[0].width - imgs[1].width) < 1 && Math.abs(imgs[0].height - imgs[1].height) < 1 ? null : JSON.stringify({ boxes, imgs });
  });
  await check("careers: one photo carousel with prev/next", async () => {
    const c = page.getByTestId("careers-photo-carousel");
    const before = await c.locator("figure:not([aria-hidden=true]) figcaption").innerText();
    await page.getByTestId("carousel-next").click(); await page.waitForTimeout(900);
    const after = await c.locator("figure:not([aria-hidden=true]) figcaption").innerText();
    const frames = await c.locator("figure").evaluateAll((els) => [...new Set(els.map((e) => `${e.clientWidth}x${e.clientHeight}`))]);
    return before !== after && frames.length === 1 ? null : JSON.stringify({ before, after, frames });
  });
  await check("careers: roles explorer shows responsibilities for each role", async () => {
    await page.getByTestId("division-tab-creative").click();
    const t = await page.getByTestId("division-creative").innerText();
    return /What you.ll do/i.test(t) && t.includes("Graphic Designer") && t.includes("Portfolio required") ? null : t.slice(0, 200);
  });
  await page.getByTestId("division-tab-growth").click();
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
  const m = await (await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await m.goto(`${BASE}/careers`, { waitUntil: "networkidle" });
  await check("careers mobile: no horizontal scroll", async () => { const w = await m.evaluate(() => document.documentElement.scrollWidth); return w <= 392 ? null : `scrollWidth ${w}`; });
  await shot(m, "03-careers-mobile");
  await m.screenshot({ path: join(SHOTS, "03b-careers-mobile-full.png"), fullPage: true });
  await page.screenshot({ path: join(SHOTS, "01b-careers-desktop-full.png"), fullPage: true }).catch(() => {});
  await m.close();
}

// ── 2. New user: sign up (Elco-Pass) → application, one role ──
{
  const ctx = await newCtx();
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
  await fillApplication(page, { name: "Nadia Applicant", roles: ["G4"], portfolio: "none" });
  await shot(page, "05-apply-tasks");
  await tasksAndSubmit(page);
  await check("submitted: status view with one role", async () => ((await page.getByTestId("application-role-1").innerText()).includes("Content Creator") && (await page.getByTestId("application-role-2").innerText()) === "None" ? null : "roles"));
  await check("submitted: seven tasks to be checked", async () => ((await page.getByTestId("application-tasks").locator("li").count()) === 7 ? null : "tasks"));
  await shot(page, "06-status");
  const row = (await sql(`select a.*, (select count(*) from public.career_application_drafts d where d.user_id = a.user_id) drafts from public.career_applications a where email = '${email}'`))[0];
  await check("DB: tied to the user, statuses, timestamps, domicile, no portfolio, draft cleared", async () => (row && row.user_id && row.status === "submitted" && row.campaign_verification === "pending" && row.privacy_accepted_at && row.declaration_accepted_at && row.tasks_confirmed_at && row.role_id === "G4" && row.division === "growth" && !row.portfolio_url && !row.portfolio_path && row.domicile_country === "ID" && row.domicile_city === "Malang" && row.cv_path.startsWith(`applicants/${row.user_id}/`) && Number(row.drafts) === 0 ? null : JSON.stringify(row)));
  await ctx.close();
}

// Existing local accounts have finished onboarding (otherwise the dashboard sends them to /dashboard/onboarding first).
await sql(`insert into public.member_profiles (user_id, display_name, onboarding_completed_at, origin_country) select id, 'Local', now(), 'ID' from auth.users where email in ('demo.member@example.test', 'demo.admin@example.test') on conflict (user_id) do update set onboarding_completed_at = now(), origin_country = 'ID'`);
await sql(`delete from public.career_applications where email in ('demo.member@example.test', 'demo.admin@example.test')`);
await sql(`delete from public.career_application_drafts where user_id in (select id from auth.users where email in ('demo.member@example.test', 'demo.admin@example.test'))`);

// ── 3. Existing user: sign in → saved progress → two roles → change application (no duplicate) ──
let memberEmail = "demo.member@example.test";
{
  const ctx = await newCtx();
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
  await fillApplication(page, { roles: ["K1", "O1"], portfolio: "creative-missing" });
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
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(2500);
  await check("dashboard: no permanent recruitment card", async () => ((await page.locator("[data-testid=home-recruitment]").count()) === 0 ? null : "card still there"));
  await ctx.close();
}

// ── 4. Banner for someone who hasn't applied; admin verification; mobile wizard ──
{
  const ctx = await newCtx();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`);
  await page.getByTestId("auth-email-input").fill("demo.admin@example.test");
  await page.getByTestId("auth-password-input").fill("anything");
  await page.getByTestId("auth-submit-btn").click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: "commit" });
  await page.goto(`${BASE}/dashboard`);
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
  const ctx = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
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

// ── 5. Recruitment popup (public site and dashboard) ──
const popup = (page) => page.getByTestId("recruitment-popup");
{
  const ctx = await newCtx({}, { popup: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/about`);
  await check("public: popup appears after a short pause", async () => { await popup(page).waitFor({ timeout: 12000 }); return null; });
  await check("popup: eligibility, close and don't-show-again are there", async () => {
    const t = await popup(page).innerText();
    return t.includes("1st–3rd year") && (await page.getByTestId("recruitment-popup-close").isVisible()) && (await page.getByTestId("recruitment-popup-never").isVisible()) ? null : t;
  });
  await shot(page, "11-popup-public");
  await page.getByTestId("recruitment-popup-apply").click();
  await page.waitForURL((u) => u.href === `${BASE}/careers`, { timeout: 20000, waitUntil: "commit" });
  await check("public signed out: Apply now → /careers", async () => null);
  await page.waitForTimeout(7500);
  await check("popup never on /careers", async () => ((await popup(page).count()) === 0 ? null : "shown"));
  await page.goto(`${BASE}/about`); await page.waitForTimeout(7500);
  await check("after Apply now it doesn't come back this session", async () => ((await popup(page).count()) === 0 ? null : "shown again"));
  await ctx.close();
}
{
  const ctx = await newCtx({}, { popup: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/about`);
  await popup(page).waitFor({ timeout: 12000 });
  await page.getByTestId("recruitment-popup-close").click();
  await page.goto(`${BASE}/partners`); await page.waitForTimeout(7500);
  await check("close: hidden for the rest of the session", async () => ((await popup(page).count()) === 0 ? null : "shown"));
  const page2 = await ctx.newPage();
  await page2.goto(`${BASE}/about`);
  await check("close: a new session (tab) shows it again", async () => { await popup(page2).waitFor({ timeout: 12000 }); return null; });
  await page2.getByTestId("recruitment-popup-never").check();
  await page2.getByTestId("recruitment-popup-close").click();
  const page3 = await ctx.newPage();
  await page3.goto(`${BASE}/about`); await page3.waitForTimeout(7500);
  await check("don't show again: hidden in new sessions too", async () => ((await popup(page3).count()) === 0 ? null : "shown"));
  await ctx.close();
}
{
  const ctx = await newCtx({}, { popup: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`);
  await page.getByTestId("auth-email-input").fill(memberEmail);
  await page.getByTestId("auth-password-input").fill("anything");
  await page.getByTestId("auth-submit-btn").click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000, waitUntil: "commit" });
  await page.goto(`${BASE}/dashboard`);
  // A first-time dashboard tour is a dialog too: the popup must wait for it, then show.
  if (await page.getByTestId("product-tour-skip").waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
    await page.waitForTimeout(7000);
    await check("dashboard: popup never covers the tour", async () => ((await popup(page).count()) === 0 ? null : "shown over the tour"));
    await page.getByTestId("product-tour-skip").click();
  }
  await check("dashboard: popup appears", async () => { await popup(page).waitFor({ timeout: 15000 }); return null; });
  await shot(page, "12-popup-dashboard");
  await page.getByTestId("recruitment-popup-apply").click();
  await page.waitForURL((u) => u.href === `${BASE}/dashboard/careers/apply`, { timeout: 20000, waitUntil: "commit" });
  await check("dashboard signed in: Apply now → the application", async () => null);
  await page.waitForTimeout(7500);
  await check("popup never during the application", async () => ((await popup(page).count()) === 0 ? null : "shown"));
  await ctx.close();
}
{
  const ctx = await newCtx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { popup: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/about`);
  await popup(page).waitFor({ timeout: 12000 });
  await check("popup fits a phone", async () => {
    const b = await popup(page).locator("[role=dialog]").boundingBox();
    return b.width <= 390 && b.height <= 844 ? null : JSON.stringify(b);
  });
  await shot(page, "13-popup-mobile");
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed. Screenshots: ${SHOTS}`);
process.exit(fail ? 1 : 0);
