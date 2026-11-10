// Company OS cross-division requests end-to-end: a design request from Growth to Creative is triaged, gets one linked
// task, is delivered, sent back once and accepted; nobody outside the two divisions can open it. Then a budget request
// waits for the requesting lead's approval. Desktop and 360px.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after company-os-workspaces.e2e.mjs.
// Usage: node tests/e2e/company-os-requests.e2e.mjs [screenshot dir]
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

// ── Seed: a Growth member, a Creative lead, an Operations member and their manager ───────────────────────────────────
sql(`insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0031', 'Request Growth', 'member', 'active', 'req.growth@ielsco.test'),
    ('PPL-0032', 'Request Creative Lead', 'member', 'active', 'req.creative@ielsco.test'),
    ('PPL-0033', 'Request Ops', 'member', 'active', 'req.ops@ielsco.test'),
    ('PPL-0034', 'Request Ops Manager', 'manager', 'active', 'req.opsmanager@ielsco.test')
  on conflict (id) do update set status = 'active', sessions_revoked_at = null;
  insert into public.os_person_companies values ('PPL-0031','IEL'),('PPL-0032','IEL'),('PPL-0033','IEL'),('PPL-0034','IEL') on conflict do nothing;
  insert into public.os_person_divisions values ('PPL-0031','DIV-03',false),('PPL-0032','DIV-04',false),('PPL-0033','DIV-02',false),('PPL-0034','DIV-02',true) on conflict do nothing;
  insert into public.os_workspace_roles (person_id, division_id, role, reason)
    select 'PPL-0032', 'DIV-04', 'lead', 'Runs Creative intake'
    where not exists (select 1 from public.os_workspace_roles where person_id = 'PPL-0032' and division_id = 'DIV-04' and role = 'lead' and revoked_at is null);`);

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

const reqStatus = (id) => sql(`select status || '|' || approval_status || '|' || revision_rounds from public.os_requests where id = '${id}'`);

// ── 1. Growth sends a design request to Creative ─────────────────────────────────────────────────────────────────
const growth = await signIn({ email: "req.growth@ielsco.test" });
let req;
{
  const { page } = growth;
  await go(page, "/os/requests");
  await page.getByTestId("os-request-new").click();
  const form = page.getByTestId("os-request-form");
  await form.waitFor({ timeout: 15000 });
  const offered = await form.getByLabel("Request type").locator("option").allTextContents();
  check("a Growth member is offered the design route only", offered.includes("Design request") && !offered.includes("Budget or expense request"), offered.join(", "));
  await form.getByLabel("Request type").selectOption("design");
  await form.getByLabel("Company").selectOption("IEL");
  await form.getByLabel("Title").fill("Open day poster");
  await form.getByLabel("Brief").fill("A3 poster and an Instagram square for the open day, with the new logo.");
  await page.getByTestId("os-request-submit").click();
  await page.waitForURL(/\/os\/requests\/REQ-\d+/, { timeout: 15000 });
  req = page.url().match(/REQ-\d+/)[0];
  await settle(page);
  check("request created and opened", (await page.getByTestId("os-request-page").textContent()).includes("Waiting for triage"));
  check("…stored as submitted, no approval needed", reqStatus(req) === "submitted|not_needed|0", reqStatus(req));
  check("…the Creative lead is notified", sql(`select count(*) from public.os_notifications where person_id = 'PPL-0032' and entity_id = '${req}' and kind = 'request_new'`) === "1");
  await go(page, "/os/requests?tab=sent");
  check("it appears under Sent by me", (await page.getByTestId("os-requests-sent").textContent()).includes("Open day poster"));
}

// ── 2. Outside the two divisions it doesn't exist ────────────────────────────────────────────────────────────────
const ops = await signIn({ email: "req.ops@ielsco.test" });
{
  const { page } = ops;
  await go(page, `/os/requests/${req}`);
  check("an Operations member gets Not found", await page.getByText("Request not found").isVisible());
  check("…with nothing from the request on the page", !(await page.content()).includes("Open day poster"));
  await go(page, "/os/requests?tab=all");
  check("…and it's not in their lists", !(await page.content()).includes("Open day poster"));
}

// ── 3. Creative triages it, adds a task, delivers ────────────────────────────────────────────────────────────────
const creative = await signIn({ email: "req.creative@ielsco.test" });
{
  const { page } = creative;
  await go(page, "/os/d/cre?tab=requests");
  check("the Creative workspace has a Requests section", await page.getByTestId("os-ws-nav").getByText("Requests").count() === 1);
  check("the request is in Creative's incoming queue", (await page.getByTestId("os-ws-requests-in").textContent()).includes("Open day poster"));
  await go(page, `/os/requests/${req}`);
  const actions = page.getByTestId("os-request-actions");
  await actions.getByLabel("Owner").selectOption("PPL-0032");
  await actions.getByTestId("os-request-note").fill("On it this week");
  await page.getByTestId("os-request-triage-accept").click();
  await settle(page);
  check("accepted with an owner", sql(`select status || '|' || owner_person_id from public.os_requests where id = '${req}'`) === "accepted|PPL-0032");
  await page.getByTestId("os-request-task-title").fill("Design the open day poster");
  await page.getByTestId("os-request-task-add").click();
  await settle(page);
  const tsk = sql(`select id || '|' || division_id || '|' || company_code from public.os_tasks where request_id = '${req}'`);
  check("one linked task in Creative, IELSco", /^TSK-\d+\|DIV-04\|IEL$/.test(tsk), tsk);
  check("…shown on the request", (await page.getByTestId("os-request-tasks").textContent()).includes("Design the open day poster"));
  check("…and the request is in progress", reqStatus(req) === "in_progress|not_needed|0", reqStatus(req));
  await page.getByTestId("os-request-note").fill("Draft v1 is in Drive");
  await page.getByTestId("os-request-deliver").click();
  await settle(page);
  check("delivered", reqStatus(req).startsWith("delivered"), reqStatus(req));
  check("the owner isn't offered Accept", await page.getByTestId("os-request-accept").count() === 0);
}

// ── 4. Growth sends it back once, Creative redelivers, Growth accepts ────────────────────────────────────────────
{
  const { page } = growth;
  await go(page, `/os/requests/${req}`);
  check("send back needs a note first", await page.getByTestId("os-request-sendback").isDisabled());
  await page.getByTestId("os-request-note").fill("The logo is too small");
  await page.getByTestId("os-request-sendback").click();
  await settle(page);
  check("sent back: in progress, one revision round", reqStatus(req) === "in_progress|not_needed|1", reqStatus(req));
}
{
  const { page } = creative;
  await go(page, `/os/requests/${req}`);
  await page.getByTestId("os-request-deliver").click();
  await settle(page);
}
{
  const { page } = growth;
  await go(page, `/os/requests/${req}`);
  await page.getByTestId("os-request-accept").click();
  await settle(page);
  check("accepted and closed", reqStatus(req) === "closed|not_needed|1", reqStatus(req));
  const hist = sql(`select string_agg(action, ',' order by id) from public.os_request_events where request_id = '${req}'`);
  check("full history kept", hist === "submitted,accepted,task_created,delivered,sent_back,delivered,closed", hist);
  check("history shown on the page", (await page.getByTestId("os-request-history").textContent()).includes("sent it back"));
  await page.screenshot({ path: `${OUT}/request-closed-desktop.png`, fullPage: true });
}

// ── 5. A budget request waits for the Operations lead ────────────────────────────────────────────────────────────
let bud;
{
  const { page } = ops;
  await go(page, "/os/requests?new=1");
  const form = page.getByTestId("os-request-form");
  await form.waitFor({ timeout: 15000 });
  await form.getByLabel("Request type").selectOption("budget");
  check("the form says the lead approves first", (await form.textContent()).includes("lead approves it first"));
  await form.getByLabel("Company").selectOption("IEL");
  await form.getByLabel("Title").fill("Venue deposit");
  await form.getByLabel("Brief").fill("Deposit for the open day venue, as quoted by the venue.");
  await page.getByTestId("os-request-submit").click();
  await page.waitForURL(/\/os\/requests\/REQ-\d+/, { timeout: 15000 });
  bud = page.url().match(/REQ-\d+/)[0];
  await settle(page);
  check("budget request waits for approval", reqStatus(bud) === "submitted|pending|0", reqStatus(bud));
  check("the requester can't approve it", await page.getByTestId("os-request-approve").count() === 0);
}
const opsManager = await signIn({ email: "req.opsmanager@ielsco.test" });
{
  const { page } = opsManager;
  await go(page, "/os/requests?tab=approval");
  check("it's under Needs my approval", (await page.getByTestId("os-requests-approval").textContent()).includes("Venue deposit"));
  await go(page, `/os/requests/${bud}`);
  await page.getByTestId("os-request-approve").click();
  await settle(page);
  check("approved by the Operations manager", sql(`select approval_status from public.os_requests where id = '${bud}'`) === "approved");
  check("…recorded as an approval", sql(`select approver_person_id || '|' || decision from public.os_approvals where entity_id = '${bud}'`) === "PPL-0034|approved");
}
{
  const { page } = growth;
  await go(page, `/os/requests/${bud}`);
  check("a Growth member can't open a Finance request", await page.getByText("Request not found").isVisible());
}

// ── 6. Phone width ─────────────────────────────────────────────────────────────────────────────────────────────
const phone = await signIn({ email: "req.growth@ielsco.test" }, { width: 360, height: 780 });
{
  const { page } = phone;
  for (const path of [`/os/requests/${req}`, "/os/requests?tab=sent"]) {
    await go(page, path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`no horizontal scroll at 360px: ${path.split("?")[0]}`, over <= 0, `overflow ${over}px`);
  }
  await go(page, `/os/requests/${req}`);
  await page.screenshot({ path: `${OUT}/request-phone.png`, fullPage: true });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
