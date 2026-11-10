// Company OS division foundation end-to-end: a Growth member schedules a Confidential division meeting, writes the
// minutes, adds an action item and turns it into a task once, mentions the Growth manager in a comment, and sends the
// minutes for review; the manager is notified, replies and approves; Operations can't open it. Desktop and 360px.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after company-os-requests.e2e.mjs.
// Usage: node tests/e2e/company-os-division-foundation.e2e.mjs [screenshot dir]
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

// ── 1. A Growth member runs the meeting ────────────────────────────────────────────────────────────────
const growth = await signIn({ email: "req.growth@ielsco.test" });
let mtg;
{
  const { page } = growth;
  await go(page, "/os/d/gro?tab=meetings");
  check("the Growth workspace has a Meetings tab", await page.getByTestId("os-meeting-new").isVisible());
  await page.getByTestId("os-meeting-new").click();
  const form = page.getByTestId("os-meeting-form");
  await form.getByLabel("Title").fill("Growth weekly sync");
  await form.getByLabel("Agenda").fill("Content calendar for next week");
  await form.getByLabel("Who can see it").selectOption("Confidential");
  await page.getByTestId("os-meeting-save").click();
  await settle(page);
  mtg = sql(`select id from public.os_meetings where title = 'Growth weekly sync' order by created_at desc limit 1`);
  check("the meeting is saved in Growth as Held (dated today)", sql(`select division_id || '|' || status || '|' || sensitivity from public.os_meetings where id = '${mtg}'`) === "DIV-03|Held|Confidential");
  await page.getByTestId("os-meetings").getByRole("link", { name: "Growth weekly sync" }).first().click();
  await page.waitForURL(`**/os/meetings/${mtg}`); await settle(page);
  check("no review step before minutes exist", !(await page.getByTestId("os-meeting-submit").count()));
  await page.getByLabel("Discussion notes").fill("We agreed three posts for next week and one reel.");
  await page.getByLabel("Decisions").fill("Ship the recruitment reminder on Monday.");
  await page.getByTestId("os-meeting-save-minutes").click(); await settle(page);
  await page.getByLabel("Action item").fill("Draft the Monday reminder caption");
  await page.getByLabel("Action due date").fill(new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10));
  await page.getByTestId("os-action-add").click(); await settle(page);
  await page.getByTestId("os-action-to-task").click(); await settle(page);
  const task = sql(`select task_id from public.os_meeting_actions where meeting_id = '${mtg}'`);
  check("the action item became one task in Growth", /^TSK-/.test(task) && sql(`select division_id || '|' || sensitivity from public.os_tasks where id = '${task}'`) === "DIV-03|Confidential", task);
  check("the action now links to its task instead of offering to make another", await page.getByRole("link", { name: task }).isVisible() && !(await page.getByTestId("os-action-to-task").count()));
  // Mention the manager by picking from the list.
  await page.getByLabel("Add a comment").fill("Minutes are ready @Gi");
  await page.getByTestId("os-mention-list").getByText("Gina").click();
  await page.getByRole("button", { name: "Comment", exact: true }).click(); await settle(page);
  check("the mention is stored and the manager notified without any record text",
    sql(`select array_to_string(mentions, ',') from public.os_comments where entity_id = '${mtg}'`) === "PPL-0051"
    && sql(`select title || '|' || coalesce(body, '') from public.os_notifications where person_id = 'PPL-0051' and kind = 'mention' and entity_id = '${mtg}'`) === "Request Growth mentioned you in a comment|");
  await page.getByTestId("os-meeting-submit").click(); await settle(page);
  check("minutes are in review and the author can't approve them", sql(`select status from public.os_meetings where id = '${mtg}'`) === "In review" && !(await page.getByTestId("os-meeting-approve").count()));
  await page.screenshot({ path: `${OUT}/meeting-in-review.png`, fullPage: true });
}

// ── 2. Operations can't open a Confidential Growth meeting ─────────────────────────────────────────────
const ops = await signIn({ email: "req.ops@ielsco.test" });
{
  const { page } = ops;
  await go(page, `/os/meetings/${mtg}`);
  const text = await page.locator("#os-main").innerText();
  check("Operations sees 'not found', with no title or minutes", /Meeting not found/.test(text) && !/Growth weekly sync|three posts/.test(text));
}

// ── 3. The Growth manager replies and approves ─────────────────────────────────────────────────────────
const manager = await signIn({ email: "fnd.manager@ielsco.test" });
{
  const { page } = manager;
  await go(page, `/os/meetings/${mtg}`);
  await page.getByTestId("os-comment").getByRole("button", { name: "Reply" }).click();
  await page.getByLabel("Add a comment").fill("Looks right, approving.");
  await page.getByRole("button", { name: "Reply", exact: true }).last().click(); await settle(page);
  check("the reply is threaded under the comment and its author is told",
    (await page.getByTestId("os-comment-reply").count()) === 1 && sql(`select count(*) from public.os_notifications where person_id = 'PPL-0031' and kind = 'comment_reply' and entity_id = '${mtg}'`) === "1");
  await page.getByTestId("os-meeting-approve").click(); await settle(page);
  check("the manager approved the minutes", sql(`select status || '|' || minutes_approved_by from public.os_meetings where id = '${mtg}'`) === "Approved|PPL-0051");
  check("approved minutes are read-only", !(await page.getByLabel("Discussion notes").count()));
  await page.screenshot({ path: `${OUT}/meeting-approved.png`, fullPage: true });
}

// ── 4. Phone width ─────────────────────────────────────────────────────────────────────────────────────
const phone = await signIn({ email: "req.growth@ielsco.test" }, { width: 360, height: 780 });
{
  const { page } = phone;
  for (const path of [`/os/meetings/${mtg}`, "/os/d/gro?tab=meetings"]) {
    await go(page, path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`no horizontal scroll at 360px: ${path.split("?")[0]}`, over <= 0, `overflow ${over}px`);
  }
  await page.screenshot({ path: `${OUT}/meetings-phone.png`, fullPage: true });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
