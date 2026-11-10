// Company OS subdivisions and division metrics end-to-end: the Growth manager names a subdivision and puts a member
// in it, adds a division metric; a member logs this week's value and tags a task with the subdivision; someone from
// Operations can't open any of it. Desktop and 360px.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after the division foundation run.
// Usage: node tests/e2e/company-os-subdivisions-metrics.e2e.mjs [screenshot dir]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const OUT = process.argv[2] || "./os-e2e-shots";
mkdirSync(OUT, { recursive: true });
const OS = "http://os.localhost:3000";
const GW = "http://localhost:54399";
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` -> ${detail}` : ""}`); };
const sql = (q) => execFileSync("sudo", ["-u", "postgres", "psql", "-d", "os_e2e", "-tAqc", q], { encoding: "utf8" }).trim();

sql(`insert into public.os_people (id, full_name, short_name, org_role, status, google_account) values
    ('PPL-0031', 'Request Growth', null, 'member', 'active', 'req.growth@ielsco.test'),
    ('PPL-0033', 'Request Ops', null, 'member', 'active', 'req.ops@ielsco.test'),
    ('PPL-0051', 'Foundation Growth Manager', 'Gina', 'manager', 'active', 'fnd.manager@ielsco.test')
  on conflict (id) do update set status = 'active', sessions_revoked_at = null, short_name = excluded.short_name;
  insert into public.os_person_companies values ('PPL-0031','IEL'),('PPL-0033','IEL'),('PPL-0051','IEL') on conflict do nothing;
  insert into public.os_person_divisions values ('PPL-0031','DIV-03',false),('PPL-0033','DIV-02',false),('PPL-0051','DIV-03',true) on conflict do nothing;`);

const browser = await chromium.launch();
async function signIn(google, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ verified: true, ...google }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const settle = (page) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(600));
const go = async (page, path) => { await page.goto(`${OS}${path}`); await settle(page); };

sql(`insert into public.os_tasks (id, title, company_code, division_id, owner_person_id) values ('TSK-9801', 'Plan the reel shoot', 'IEL', 'DIV-03', 'PPL-0031'), ('TSK-9802', 'Untagged Growth task', 'IEL', 'DIV-03', 'PPL-0031') on conflict (id) do nothing`);

// ── 1. The Growth manager sets up a subdivision and a metric ───────────────────────────────────────────
const manager = await signIn({ email: "fnd.manager@ielsco.test" });
let sub, kpi;
{
  const { page } = manager;
  await go(page, "/os/d/gro?tab=access");
  const form = page.getByTestId("os-subdivision-new");
  check("the manager can add a subdivision", await form.isVisible());
  await form.getByLabel("New subdivision").fill("Social media");
  await form.getByLabel("Lead (optional)").selectOption({ label: "Request Growth" });
  await form.getByRole("button", { name: "Add" }).click(); await settle(page);
  sub = sql(`select id from public.os_subdivisions where division_id = 'DIV-03' and name = 'Social media'`);
  check("the subdivision is saved in Growth with its lead", sql(`select lead_person_id || '|' || created_by from public.os_subdivisions where id = ${sub || 0}`) === "PPL-0031|PPL-0051", sub);
  const row = page.getByTestId("os-subdivision").filter({ hasText: "Social media" });
  await row.getByLabel("Add someone to Social media").selectOption({ label: "Request Growth" }); await settle(page);
  check("a division member joins it", sql(`select count(*) from public.os_subdivision_members where subdivision_id = ${sub} and person_id = 'PPL-0031'`) === "1");
  const labels = await row.getByLabel("Add someone to Social media").locator("option").allTextContents().catch(() => []);
  check("people outside the division aren't offered", !labels.includes("Request Ops"), labels.join(","));
  await form.getByLabel("New subdivision").fill("social MEDIA");
  await form.getByRole("button", { name: "Add" }).click(); await settle(page);
  check("the same name twice is refused in plain words", await page.getByText("That already exists.").isVisible() && sql(`select count(*) from public.os_subdivisions where division_id = 'DIV-03'`) === "1");

  await go(page, "/os/d/gro?tab=metrics");
  check("the workspace has a Metrics tab with nothing invented", await page.getByText("No metrics for this division yet").isVisible());
  check("assigning a dictionary KPI is not offered to a manager", !(await page.getByRole("button", { name: "Assign an existing KPI" }).count()));
  await page.getByRole("button", { name: "Add metric" }).click();
  await page.getByTestId("os-metric-name").fill("Posts published");
  await page.getByLabel("Reported").selectOption("Weekly");
  await page.getByLabel("Unit (optional)").fill("count");
  await page.getByTestId("os-metric-save").click(); await settle(page);
  kpi = sql(`select id from public.os_kpis where name = 'Posts published' and division_id = 'DIV-03'`);
  check("the metric is saved for Growth with no target", /^KPI-/.test(kpi) && sql(`select coalesce(target_value::text, 'none') || '|' || target_status || '|' || created_by from public.os_kpis where id = '${kpi}'`) === "none|No approved target|PPL-0051", kpi);
  check("it lists as not logged", await page.getByTestId("os-ws-metrics").getByRole("table").getByText("Not logged").isVisible());
  await page.screenshot({ path: `${OUT}/sub-01-metrics-manager.png` });
}

// ── 2. A Growth member logs a value and tags a task ────────────────────────────────────────────────────
const member = await signIn({ email: "req.growth@ielsco.test" });
{
  const { page } = member;
  await go(page, "/os/d/gro?tab=metrics");
  check("a member can't add metrics", !(await page.getByRole("button", { name: "Add metric" }).count()));
  await page.getByTestId("os-ws-metrics").getByRole("table").getByRole("button", { name: "Log value" }).click();
  await page.getByTestId("os-metric-log-save").click();
  check("an empty value is refused, never saved as zero", await page.getByText("Enter the value as a number.").isVisible() && sql(`select count(*) from public.os_kpi_values where kpi_id = '${kpi}'`) === "0");
  await page.getByTestId("os-metric-value").fill("12");
  await page.getByTestId("os-metric-log-save").click(); await settle(page);
  check("the value is logged by the member for the current week", /^PPL-0031\|12\|\d{4}-W\d{2}$/.test(sql(`select recorded_by || '|' || value::int || '|' || period_label from public.os_kpi_values where kpi_id = '${kpi}'`)));
  check("the list shows the latest value", await page.getByTestId("os-ws-metrics").getByRole("table").getByText(/^12\s*\(/).isVisible());
  await page.getByTestId("os-ws-metrics").getByRole("table").getByRole("button", { name: "Log value" }).click();
  await page.getByTestId("os-metric-value").fill("15");
  await page.getByTestId("os-metric-log-save").click(); await settle(page);
  check("a second value for the same period is refused", await page.getByText("A value is already logged for that period.").isVisible() && sql(`select count(*) from public.os_kpi_values where kpi_id = '${kpi}'`) === "1");

  await go(page, "/os/tasks/TSK-9801");
  await page.getByRole("button", { name: "Edit", exact: true }).click(); await settle(page);
  await page.getByLabel("Subdivision").selectOption({ label: "Social media" });
  await page.getByTestId("os-task-save").click(); await settle(page);
  check("the task is tagged with the subdivision", sql(`select subdivision_id from public.os_tasks where id = 'TSK-9801'`) === sub);
  await go(page, "/os/d/gro?tab=tasks");
  const list = page.getByTestId("os-ws-tasks").getByRole("table");
  check("the workspace task list shows the tag", await list.getByText("Social media").isVisible());
  await page.getByLabel("Subdivision").selectOption({ label: "Social media" }); await page.waitForTimeout(300);
  check("filtering by subdivision narrows the list", await list.getByText("Plan the reel shoot").isVisible() && !(await list.getByText("Untagged Growth task").count()));
  await go(page, "/os/d/gro?tab=access");
  check("a member sees subdivisions but can't change them", await page.getByTestId("os-subdivision").filter({ hasText: "Social media" }).isVisible() && !(await page.getByTestId("os-subdivision-new").count()) && !(await page.getByRole("button", { name: "Archive" }).count()));
  await page.screenshot({ path: `${OUT}/sub-02-access-member.png` });
}

// ── 3. Operations can't get in or log values ───────────────────────────────────────────────────────────
const ops = await signIn({ email: "req.ops@ielsco.test" });
{
  const { page } = ops;
  await go(page, "/os/d/gro?tab=metrics");
  check("someone outside Growth doesn't get its workspace", await page.getByTestId("os-ws-locked").isVisible() && !(await page.getByTestId("os-ws-metrics").getByRole("table").count()));
  await go(page, `/os/kpis/${kpi}`);
  if (await page.getByTestId("os-kpi-log").count()) {
    await page.getByLabel("Period", { exact: true }).fill("2026-W01");
    await page.getByLabel("Period ends").fill("2026-01-04");
    await page.getByLabel(/^Value/).fill("99");
    await page.getByRole("button", { name: "Log value" }).click(); await settle(page);
  }
  check("an outsider's value is refused by the database", sql(`select count(*) from public.os_kpi_values where kpi_id = '${kpi}' and value = 99`) === "0");
}

// ── 4. Phone width ─────────────────────────────────────────────────────────────────────────────────────
const phone = await signIn({ email: "fnd.manager@ielsco.test" }, { width: 360, height: 780 });
{
  const { page } = phone;
  for (const path of ["/os/d/gro?tab=metrics", "/os/d/gro?tab=access", "/os/d/gro?tab=tasks"]) {
    await go(page, path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`no horizontal scroll at 360px: ${path.split("=")[1]}`, over <= 0, `overflow ${over}px`);
  }
  await page.screenshot({ path: `${OUT}/sub-03-access-360.png`, fullPage: true });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
