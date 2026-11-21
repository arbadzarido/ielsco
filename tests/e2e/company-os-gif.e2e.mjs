// GIF Summer 2027 workspace end-to-end: every tab renders for the Operations manager on desktop and at 360px; she
// edits a research item and proposes a fact change (which flags outputs and creates revision tasks) but can't answer a
// decision; Arba approves a recommendation from the decision page; an IELSco member outside the project sees the
// decision queue but not the budget.
//
// Runs on the stack in tests/e2e/company-os/README.md with 20261129000000 and 20261129010000 applied after fixtures
// for PRJ-0033 and PPL-0001..0008 (see the GIF section of that README).
// Usage: node tests/e2e/company-os-gif.e2e.mjs [screenshot dir]
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

const browser = await chromium.launch();
const errors = [];
async function signIn(google, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { errors.push(e.message); console.log("  pageerror:", e.message); });
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ verified: true, ...google }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const settle = (page) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(500));
const go = async (page, path) => { await page.goto(`${OS}${path}`); await settle(page); };
const TABS = ["overview", "decisions", "tasks", "facts", "timeline", "research", "risks", "budget", "countries", "people", "partners", "outputs", "changes", "onsite", "checklists", "findings"];

// ── 1. Renita (Operations manager, the project's division): every tab, desktop and phone ───────────────────────────
for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 360, height: 780 }]]) {
  const { ctx, page } = await signIn({ email: "renita@ielsco.test" }, viewport);
  for (const t of TABS) {
    await go(page, `/os/gif${t === "overview" ? "" : `?tab=${t}`}`);
    const body = await page.locator("body").innerText().catch(() => "");
    check(`${label}: ${t} renders`, body.includes("Global Impact Fellowship") && !/Something went wrong/.test(body), body.slice(0, 120));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (label === "phone") check(`phone: ${t} has no horizontal page scroll`, overflow <= 1, `${overflow}px`);
    if (["overview", "decisions", "tasks", "budget", "people"].includes(t)) await page.screenshot({ path: `${OUT}/gif-${label}-${t}.png`, fullPage: label === "desktop" });
  }
  await go(page, "/os/gif/decisions/GIF-DEC-001");
  check(`${label}: decision page shows the options`, await page.getByText("Confirm USD 300 / IDR 5,000,000").first().isVisible());
  await page.screenshot({ path: `${OUT}/gif-${label}-decision.png`, fullPage: label === "desktop" });
  if (label === "desktop") {
    const actions = await page.getByLabel("Action").locator("option").allInnerTexts();
    check("an editor can't approve, only comment or mark status", !actions.includes("Approve the recommendation") && actions.includes("Comment"), actions.join(","));
    await go(page, "/os/gif?tab=budget");
    check("the budget shows revenue from decided prices", await page.getByText("IDR 919,900,000").first().isVisible().catch(() => false));
    await go(page, "/os/gif?tab=research");
    await page.getByLabel("Research status").first().selectOption("In progress"); await settle(page);
    check("an editor changes a research status", sql(`select status from public.os_programme_research where code = 'GIF-RES-001'`) === "In progress");
    await go(page, "/os/gif?tab=facts");
    await page.getByRole("row", { name: /Participant capacity/ }).getByRole("button", { name: "Change" }).click();
    await page.getByLabel("Value").fill("80");
    await page.getByLabel("Reason for the change").fill("Two coaches instead of three");
    await page.getByRole("button", { name: "Save and record change" }).click(); await settle(page);
    check("a fact change is versioned", sql(`select value || '|' || version from public.os_programme_facts where key = 'capacity.total'`) === "80|2");
    check("it creates revision tasks for the outputs that use it", Number(sql(`select count(*) from public.os_programme_change_items where kind = 'output' and revision_task_id is not null`)) >= 3);
    await go(page, "/os/gif?tab=changes");
    check("the change shows in Changes", await page.getByText(/Participant capacity: 100 \(Proposed\)/).first().isVisible());
    await page.screenshot({ path: `${OUT}/gif-desktop-changes.png`, fullPage: true });
  }
  await ctx.close();
}

// ── 2. Arba approves a recommendation ──────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await signIn({ email: "arba@ielsco.test", aal2: true });
  await go(page, "/os/gif/decisions/GIF-DEC-019");
  await page.getByLabel("Action").selectOption("approve_recommendation");
  await page.getByLabel("Reason (optional)").fill("Keep names as planned, subject to confirmation");
  await page.getByTestId("gif-decide").getByRole("button", { name: "Approve the recommendation" }).click(); await settle(page);
  check("Arba's answer is recorded", sql(`select status || '|' || decided_by from public.os_programme_decisions where code = 'GIF-DEC-019'`) === "Decided|PPL-0001");
  check("it is in the company decision log", sql(`select count(*) from public.os_decisions where source_link = '/os/gif/decisions/GIF-DEC-019' and status = 'Approved'`) === "1");
  check("the page shows the decision", await page.getByText(/^Decided on/).first().isVisible());
  await page.screenshot({ path: `${OUT}/gif-desktop-decided.png`, fullPage: true });
  await ctx.close();
}

// ── 3. A member outside the project ────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await signIn({ email: "member@ielsco.test" });
  await go(page, "/os/gif?tab=decisions");
  check("a member sees the decision queue", await page.getByText("Confirm the Self-Funded deposit amount").first().isVisible());
  await go(page, "/os/gif?tab=budget");
  check("a member doesn't see the budget", await page.getByText("The GIF budget is confidential").isVisible());
  await ctx.close();
}

await browser.close();
check("no page errors", errors.length === 0, errors.join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
