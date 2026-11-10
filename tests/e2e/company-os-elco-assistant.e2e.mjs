// Elco Assistant end-to-end (the Company OS assistant; not the Elco AI company): the panel on every page, page
// context, a multi-step instruction carried out in one go (a project and its tasks), duplicate prevention on a
// repeat, follow-ups that act on "those" by ID, partial failure under the member's own permissions, what a member's
// context may contain, the ask-first switch with Confirm all, the prompt size, and phone layout.
//
// Runs on the same stack as company-os.e2e.mjs (run that first: it seeds the registry). The model is the SIMULATED
// Gemini endpoint in tests/e2e/company-os/gateway.mjs: the test queues each answer, so this proves what the app does
// with a model's answer and what it sends to the model, not the real model's judgement.
// Usage: node tests/e2e/company-os-elco-assistant.e2e.mjs [screenshot dir]
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
const one = (q) => sql(q).split("\n")[0];
const jkt = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const plusDays = (iso, n) => { const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nextDow = (iso, dow) => { for (let i = 1; i <= 7; i++) { const d = plusDays(iso, i); if (new Date(`${d}T00:00:00Z`).getUTCDay() === dow) return d; } };
const today = jkt(), fri = nextDow(today, 5), mon = nextDow(fri, 1);
const queue = (answer) => fetch(`${GW}/__test/gemini`, { method: "POST", body: JSON.stringify(answer) });
const lastModelRequest = async () => (await fetch(`${GW}/__test/gemini-last`)).json();

// ── Seed ───────────────────────────────────────────────────────────────────────────────────────────────────────────
sql(`update public.os_people set status = 'active', status_reason = null, sessions_revoked_at = null where id in ('PPL-0001','PPL-0002');
  delete from public.os_task_assignees where task_id in (select id from public.os_tasks where title like 'EA %');
  delete from public.os_tasks where title like 'EA %';
  delete from public.os_projects where name like 'EA %';`);
const prj = one(`insert into public.os_projects (name, company_code, status, owner_person_id) values ('EA Global Fellowship', 'IEL', 'Active', 'PPL-0001') returning id`);
const mine = one(`insert into public.os_tasks (title, company_code, project_id, owner_person_id) values ('EA Member draft', 'IEL', '${prj}', 'PPL-0002') returning id`);
const founders = one(`insert into public.os_tasks (title, company_code, project_id, owner_person_id) values ('EA Founder budget', 'IEL', '${prj}', 'PPL-0001') returning id`);
const elcoSecret = one(`insert into public.os_tasks (title, company_code, owner_person_id) values ('EA Elco pricing secret', 'ELC', 'PPL-0001') returning id`);

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
const settle = (page) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(500));
/** Send a message from the panel and wait for the reply. */
async function ask(page, message, answer) {
  if (answer) await queue(answer);
  const panel = page.getByTestId("os-elco-panel");
  const before = await panel.getByTestId("os-ai-reply").count();
  await panel.getByTestId("os-ai-input").fill(message);
  await panel.getByRole("button", { name: "Send" }).click();
  await page.waitForFunction((n) => document.querySelectorAll("[data-testid=os-elco-panel] [data-testid=os-ai-reply]").length > n || document.querySelector("[data-testid=os-elco-panel] [data-testid=os-error]"), before, { timeout: 30000 }).catch(() => {});
  return (await panel.getByTestId("os-ai-reply").nth(before).innerText().catch(() => "")) || "";
}
const userTurn = (req) => { const c = req.contents ?? []; return JSON.stringify(c[c.length - 1] ?? {}); };

// ── 1. Founder: the panel on every page, with the page's context ────────────────────────────────────────────────
const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
{
  const { page } = founder;
  await page.evaluate(() => { localStorage.removeItem("os-elco-panel-open"); localStorage.removeItem("os-elco-panel-conversation"); localStorage.removeItem("os-elco-auto"); });
  const seen = [];
  for (const path of ["/os", "/os/tasks", `/os/projects/${prj}`, "/os/calendar", "/os/documents", "/os/people", "/os/timeline", "/os/w/ielsco"]) {
    await page.goto(`${OS}${path}`); await settle(page);
    seen.push(`${path}:${await page.getByTestId("os-elco-open").count()}`);
  }
  check("the Elco Assistant button is on every Company OS page", seen.every((s) => s.endsWith(":1")), seen.join(" "));
  await page.goto(`${OS}/os/assistant`); await settle(page);
  check("…except the full Assistant page, which is the assistant itself", (await page.getByTestId("os-elco-open").count()) === 0 && (await page.getByRole("heading", { name: "Elco Assistant" }).count()) > 0);
  check("the navigation calls it Elco Assistant", (await page.getByRole("link", { name: "Elco Assistant" }).count()) > 0);

  await page.goto(`${OS}/os/projects/${prj}`); await settle(page);
  const mainBefore = await page.locator("#os-main").innerText();
  await page.getByTestId("os-elco-open").click();
  await page.getByTestId("os-elco-panel").waitFor();
  const ctxLabel = await page.getByTestId("os-elco-context").innerText();
  check("opening the panel keeps the page where it is", page.url().endsWith(`/os/projects/${prj}`) && mainBefore.includes("EA Global Fellowship") && (await page.locator("#os-main").getByText("EA Global Fellowship").first().isVisible()) && (await page.locator("#os-main li").getByText("EA Member draft").isVisible()));
  check("the panel says which record it is looking at", ctxLabel.includes(`Project ${prj}`), ctxLabel);
  await page.waitForTimeout(400); // the page eases aside
  const pad = await page.evaluate(() => getComputedStyle(document.getElementById("os-main")).paddingRight);
  check("on a desktop the panel sits beside the page instead of covering it", pad === "400px", pad);
  check("the empty panel offers suggestions for this page", (await page.getByTestId("os-elco-panel").getByTestId("os-ai-suggestions").getByRole("button").count()) >= 2);
  await page.screenshot({ path: `${OUT}/60-elco-panel-project.png` });

  const r0 = await ask(page, "What's open on this project?", { text: "Two open tasks: EA Member draft and EA Founder budget." });
  const req0 = await lastModelRequest();
  const turn0 = userTurn(req0);
  check("the model gets the page: the project and its tasks, read with the founder's own access", turn0.includes(prj) && turn0.includes("EA Global Fellowship") && turn0.includes("EA Member draft") && turn0.includes("EA Founder budget"), turn0.slice(0, 400));
  const sys = JSON.stringify(req0.systemInstruction ?? "");
  check("the system instruction names it Elco Assistant and keeps it apart from the Elco AI company", sys.includes("You are Elco Assistant") && sys.includes("you are not Elco AI"));
  check("a short question gets a small answer budget", req0.generationConfig?.maxOutputTokens === 1500, JSON.stringify(req0.generationConfig));
  // The function declarations and instructions are a fixed prefix (the same on every call); what varies is the turn.
  const size = { total: JSON.stringify(req0).length, turn: JSON.stringify(req0.contents ?? []).length };
  console.log(`  prompt size: ${size.total} characters in all, ${size.turn} in this turn's data`);
  check("…and a compact prompt (under 24k characters in all, under 8k of page and conversation data)", size.total < 24000 && size.turn < 8000, JSON.stringify(size));
  check("the reply is shown in the panel", r0.includes("Two open tasks"));

  // ── 2. A multi-step instruction: a new project and its tasks, carried out at once ─────────────────────────────
  await page.goto(`${OS}/os/tasks`); await settle(page);
  check("the panel stays open and follows the person to the next page", (await page.getByTestId("os-elco-panel").count()) === 1 && (await page.getByTestId("os-elco-context").innerText()).startsWith("Looking at: Tasks"));
  const plan = { text: "Setting up the project and its three tasks.", calls: [
    { name: "create_project", args: { name: "EA Investment & Loan", company: "HQ", sensitivity: "Confidential" } },
    { name: "create_tasks", args: { tasks: ["EA Follow up Mr. Alex", "EA Prepare loan summary", "EA Check repayment terms"].map((title) => ({ title, project: "EA Investment & Loan", assignees: ["Founder Test"], due_date: fri })) } },
  ] };
  const r1 = await ask(page, `Create a project Investment & Loan in HQ with three tasks for me, due Friday`, plan);
  const newPrj = one("select id from public.os_projects where name = 'EA Investment & Loan'");
  const made = sql(`select string_agg(t.id || ':' || coalesce(t.project_id,'-') || ':' || t.due_date || ':' || (select string_agg(person_id, '') from public.os_task_assignees a where a.task_id = t.id), ',' order by t.title) from public.os_tasks t where t.title in ('EA Follow up Mr. Alex','EA Prepare loan summary','EA Check repayment terms')`);
  check("one instruction creates the project and then its three tasks inside it, with no confirmation needed", /^PRJ-\d{4}$/.test(newPrj) && made.split(",").length === 3 && made.split(",").every((r) => r.includes(`:${newPrj}:${fri}:PPL-0001`)), `${newPrj} ${made}`);
  check("the reply lists what was done with the real IDs from the database", r1.includes("Done (4)") && r1.includes(newPrj) && made.split(",").every((r) => r1.includes(r.split(":")[0])), r1);
  const cards = page.getByTestId("os-elco-panel").getByTestId("os-ai-action");
  check("…and the cards show them as done, not as suggestions", (await cards.count()) === 2 && (await page.getByTestId("os-elco-panel").locator("[data-testid=os-ai-action][data-status=executed]").count()) === 2);
  check("both actions are in the audit trail as executed", sql("select string_agg(action_type || ':' || status, ',' order by action_type) from public.os_ai_actions where preview like '%EA %' or details::text like '%EA Investment%'").includes("create_project:executed"));
  await page.locator("#os-main li").getByText("EA Follow up Mr. Alex").first().waitFor({ timeout: 10000 }).catch(() => {});
  check("the task list behind the panel shows the new tasks without a reload", await page.locator("#os-main li").getByText("EA Follow up Mr. Alex").first().isVisible().catch(() => false));
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("…shown as cards beside the panel, task names in full, no sideways scroll", sideways <= 1 && (await page.locator("#os-main li").getByText("EA Prepare loan summary").first().boundingBox())?.width > 40, String(sideways));
  await page.screenshot({ path: `${OUT}/61-elco-multistep.png` });

  // ── 3. The same instruction again: nothing is duplicated ────────────────────────────────────────────────────────
  const r2 = await ask(page, "Create a project Investment & Loan in HQ with three tasks for me, due Friday", plan);
  check("repeating the instruction creates no second project and no duplicate tasks", sql("select count(*) from public.os_projects where name = 'EA Investment & Loan'") === "1" && sql("select count(*) from public.os_tasks where title like 'EA Follow up%' or title like 'EA Prepare loan%' or title like 'EA Check repayment%'") === "3");
  check("…and says they were already there, by ID", r2.includes("Already there") && r2.includes(newPrj), r2);

  // ── 4. A follow-up about "those": the model is given the records from this conversation ──────────────────────────
  const ids = made.split(",").map((r) => r.split(":")[0]);
  await queue({ text: "Moving them.", calls: [{ name: "update_tasks", args: { tasks: ids, due_date: mon, priority: "P2 High" } }] });
  const r3 = await ask(page, "Move those to Monday and make them high priority");
  const turn3 = userTurn(await lastModelRequest());
  check("a follow-up gives the model this conversation's records with their IDs", turn3.includes("conversation_records") && ids.every((i) => turn3.includes(i)), turn3.slice(0, 300));
  check("…so “those” updates exactly those three tasks", sql(`select string_agg(due_date || ':' || priority, ',') from public.os_tasks where id in ('${ids.join("','")}')`) === Array(3).fill(`${mon}:P2 High`).join(","));
  check("…and the reply reports each update", r3.includes("Done (3)") && ids.every((i) => r3.includes(`Updated ${i}`)), r3);

  // Closing work is never done without asking.
  await queue({ calls: [{ name: "update_tasks", args: { tasks: [ids[0]], status: "Done" } }] });
  const r4 = await ask(page, "Mark the first one done");
  check("marking work done waits for confirmation instead of running", sql(`select status from public.os_tasks where id = '${ids[0]}'`) !== "Done" && r4.includes("Waiting for your confirmation"), r4);
  await page.getByTestId("os-elco-panel").locator("[data-testid=os-ai-action][data-status=proposed]").last().getByRole("button", { name: "Confirm" }).click();
  await page.waitForTimeout(1500);
  check("…and the founder's confirmation does it", sql(`select status from public.os_tasks where id = '${ids[0]}'`) === "Done");

  // ── 5. Ask before every change, then Confirm all ────────────────────────────────────────────────────────────────
  await page.getByTestId("os-elco-panel").getByRole("button", { name: "New conversation" }).click();
  await page.getByTestId("os-elco-panel").getByTestId("os-ai-ask-first").check();
  // Two tasks in one reply come back as ONE card (one confirmation for the batch); a project is a second card.
  await queue({ calls: [{ name: "create_project", args: { name: "EA Ask-first project", company: "IELSco" } }, { name: "create_task", args: { title: "EA Ask-first one", company: "IELSco" } }, { name: "create_task", args: { title: "EA Ask-first two", company: "IELSco" } }] });
  await ask(page, "Add an IELSco project and two tasks: ask-first one and two");
  check("with “Ask me before every change” on, nothing is created until confirmed", sql("select count(*) from public.os_tasks where title like 'EA Ask-first%'") === "0" && sql("select count(*) from public.os_projects where name = 'EA Ask-first project'") === "0");
  check("…and two tasks from one reply share one card", (await page.getByTestId("os-elco-panel").locator("[data-testid=os-ai-action][data-status=proposed]").count()) === 2);
  const all = page.getByTestId("os-ai-confirm-all");
  check("…and several suggestions can be confirmed with one button", await all.isVisible().catch(() => false));
  await all.click();
  await page.waitForFunction(() => !document.querySelector("[data-testid=os-elco-panel] [data-testid=os-ai-action][data-status=proposed]"), null, { timeout: 20000 }).catch(() => {});
  check("Confirm all creates each of them", sql("select count(*) from public.os_tasks where title like 'EA Ask-first%'") === "2" && sql("select count(*) from public.os_projects where name = 'EA Ask-first project'") === "1");
  await page.getByTestId("os-elco-panel").getByTestId("os-ai-ask-first").uncheck();

  // ── 6. A long work list: one call, the light model, room for every item ─────────────────────────────────────────
  const twenty = Array.from({ length: 20 }, (_, i) => `EA Batch item ${i + 1}`);
  await queue({ calls: [{ name: "create_tasks", args: { tasks: twenty.map((title) => ({ title, company: "IELSco", due_date: fri })) } }] });
  const r6 = await ask(page, `Create these tasks for Friday:\n${twenty.map((t) => `- ${t.slice(3)}`).join("\n")}`);
  const req6 = await lastModelRequest();
  check("a 20-item list is created in full in one batch", sql("select count(*) from public.os_tasks where title like 'EA Batch item %'") === "20" && r6.includes("Done (20)"), r6.slice(0, 200));
  check("…with an answer budget sized for the list", (req6.generationConfig?.maxOutputTokens ?? 0) >= 5000, JSON.stringify(req6.generationConfig));
  await page.screenshot({ path: `${OUT}/62-elco-batch.png` });
  globalThis.founderConv = await page.evaluate(() => localStorage.getItem("os-elco-panel-conversation"));
}

// ── 7. Member: only what they can open, and partial failure under their own permissions ─────────────────────────────
const member = await signIn({ email: "member.iel@ielsco.test" });
{
  const { page } = member;
  await page.evaluate(() => { localStorage.removeItem("os-elco-panel-conversation"); localStorage.removeItem("os-elco-auto"); });
  await page.goto(`${OS}/os/tasks`); await settle(page);
  await page.getByTestId("os-elco-open").click();
  await ask(page, "What are the open tasks?", { text: "Here they are." });
  const turn = userTurn(await lastModelRequest());
  check("a member's context never contains another company's records", !turn.includes("EA Elco pricing secret") && !turn.includes(elcoSecret), turn.slice(0, 200));
  await queue({ calls: [{ name: "update_tasks", args: { tasks: [mine, founders], due_date: mon } }] });
  const r = await ask(page, "Move both project tasks to Monday");
  check("partial failure: the member's own task is moved…", sql(`select due_date from public.os_tasks where id = '${mine}'`) === mon);
  check("…the founder's task is not, under the member's own permissions", sql(`select coalesce(due_date::text, '-') from public.os_tasks where id = '${founders}'`) !== mon);
  check("…and the reply says exactly which one was done and which wasn't", r.includes(`Updated ${mine}`) && r.includes("Not done (1)") && r.includes(founders), r);
  const foreign = await page.evaluate(async (c) => (await fetch("/os/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent: "assistant", conversation_id: c, message: "continue" }) })).status, globalThis.founderConv);
  check("a member can't continue (or read the records of) the founder's conversation", foreign === 404 || foreign === 403, String(foreign));
  await page.screenshot({ path: `${OUT}/63-elco-member.png` });
}

// ── 8. Phone: full-screen sheet, no sideways scroll, closes back to the page ───────────────────────────────────────
{
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, storageState: await founder.ctx.storageState() });
  const pp = await phone.newPage();
  await pp.goto(`${OS}/os/tasks`); await settle(pp);
  check("on a phone the panel starts closed", (await pp.getByTestId("os-elco-panel").count()) === 0);
  const btn = await pp.getByTestId("os-elco-open").boundingBox();
  check("…the button is a comfortable touch target", btn && btn.height >= 44 && btn.width >= 44, JSON.stringify(btn));
  await pp.getByTestId("os-elco-open").click();
  const box = await pp.getByTestId("os-elco-panel").boundingBox();
  const sw = await pp.evaluate(() => document.documentElement.scrollWidth);
  check("…opens as a full-screen sheet with no sideways scroll", box && Math.round(box.width) === 360 && sw <= 362, `${JSON.stringify(box)} ${sw}`);
  await pp.screenshot({ path: `${OUT}/64-elco-phone.png` });
  await pp.getByTestId("os-elco-close").click();
  check("…and closes back to the same page", (await pp.getByTestId("os-elco-panel").count()) === 0 && pp.url().endsWith("/os/tasks"));
  await phone.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
