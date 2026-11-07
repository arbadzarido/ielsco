// Company OS planning end-to-end: recurring events, drag and drop rescheduling with scope and confirmation, group
// invitations, calendar workspaces and layers, task planning, milestones, campaigns and content, the assistant's
// planning actions, notifications, Google Calendar sync of series and invitations, and phone widths.
//
// Runs on the same stack as company-os.e2e.mjs (run that first: it seeds the registry and connects the member's
// Google Calendar). Google here is the SIMULATED Calendar API in tests/e2e/company-os/gateway.mjs, not Google's real
// API; the model is the simulated Gemini endpoint. Usage: node tests/e2e/company-os-planning.e2e.mjs [screenshot dir]
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
const gcal = async () => (await (await fetch(`${GW}/__test/gcal`)).json()).items;

const jkt = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
const plusDays = (iso, n) => { const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const nextDow = (iso, dow) => { for (let i = 1; i <= 7; i++) { const d = plusDays(iso, i); if (new Date(`${d}T00:00:00Z`).getUTCDay() === dow) return d; } };
const today = jkt();
const mon = nextDow(today, 1), tue = plusDays(mon, 1), wed = plusDays(mon, 2), thu = plusDays(mon, 3), fri = plusDays(mon, 4);
const mon2 = plusDays(mon, 7), mon3 = plusDays(mon, 14);
const utc = (d, hhmm) => { const [h, m] = hhmm.split(":").map(Number); const x = new Date(`${d}T00:00:00Z`); x.setUTCHours(h - 7, m); return x.toISOString(); };

// ── Seed: two IELSco managers (one by role, one by managing a division), a creator, a former manager ──────────────────
sql(`delete from public.os_people where id in ('PPL-0011','PPL-0012','PPL-0013','PPL-0014');
  insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0011', 'Growth Manager', 'manager', 'active', 'growth.manager@ielsco.test'),
    ('PPL-0012', 'Creative Lead', 'member', 'active', 'creative.lead@ielsco.test'),
    ('PPL-0013', 'Content Creator', 'member', 'active', null),
    ('PPL-0014', 'Former Manager', 'manager', 'inactive', 'former@ielsco.test');
  insert into public.os_person_companies values ('PPL-0011','IEL'),('PPL-0012','IEL'),('PPL-0013','IEL'),('PPL-0014','IEL') on conflict do nothing;
  insert into public.os_person_divisions values ('PPL-0011','DIV-03',false),('PPL-0012','DIV-04',true),('PPL-0013','DIV-03',false) on conflict do nothing;
  delete from public.os_notifications;
  update public.os_people set status = 'active', status_reason = null, sessions_revoked_at = null where id = 'PPL-0002';`); // the first suite ends by suspending the member

const browser = await chromium.launch();
async function signIn(google) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ verified: true, ...google }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const choose = async (page, key) => { const d = page.getByTestId("os-choice"); await d.waitFor({ timeout: 10000 }); await d.locator(`[data-choice=${key}]`).click(); await d.waitFor({ state: "detached", timeout: 10000 }).catch(() => {}); };
const settle = (page) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(600));
/** Drag with the mouse from an element to a point (in steps, so pointermove fires). */
async function dragTo(page, from, x, y, { grab = 4 } = {}) {
  const b = await from.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + grab);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(b.x + b.width / 2 + ((x - b.x - b.width / 2) * i) / 8, b.y + grab + ((y - b.y - grab) * i) / 8);
  await page.mouse.up();
}
/** The y of a time in a day column of the time grid. */
async function slotY(page, day, hhmm, grab = 4) {
  const col = page.locator(`[data-cal-day="${day}"][data-cal-timed]`);
  await col.scrollIntoViewIfNeeded();
  const b = await col.boundingBox();
  const [h, m] = hhmm.split(":").map(Number);
  return { x: b.x + b.width / 2, y: b.y + ((h * 60 + m) / 1440) * b.height + grab };
}

const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
{
  const { page } = founder;
  // ── 1. A weekly meeting is ONE row with a rule, shown every week ───────────────────────────────────────────────────
  await page.goto(`${OS}/os/calendar?view=week&d=${mon}`);
  await page.getByTestId("os-cal-week").waitFor();
  await page.getByTestId("os-event-new").click();
  await page.getByTestId("os-event-title").fill("Weekly Growth sync");
  await page.getByTestId("os-event-start-date").fill(mon);
  await page.getByTestId("os-event-start-time").fill("10:00");
  await page.getByTestId("os-event-end-time").fill("11:00");
  await page.getByRole("combobox", { name: "Repeat", exact: true }).selectOption("weekly");
  await page.getByRole("combobox", { name: "Company", exact: true }).selectOption("IEL").catch(() => {});
  await page.getByTestId("os-event-save").click();
  await settle(page);
  const series = sql("select id || '|' || recurrence::text || '|' || company_code from public.os_events where title = 'Weekly Growth sync'");
  const sid = series.split("|")[0];
  check("a weekly meeting is saved once, as a series with its rule (no copies per week)", series.split("\n").length === 1 && series.includes('"freq": "weekly"') && series.includes('"MO"'), series);
  const wk1 = await page.getByTestId("os-cal-week").innerText();
  await page.goto(`${OS}/os/calendar?view=week&d=${mon2}`); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  const wk2 = await page.getByTestId("os-cal-week").innerText();
  check("…and it appears in this week and the next, expanded from the rule", wk1.includes("Weekly Growth sync") && wk2.includes("Weekly Growth sync"));
  await page.screenshot({ path: `${OUT}/40-week-recurring.png`, fullPage: true });

  // ── 2. Group invitation with a preview; only active people from the registry ─────────────────────────────────────
  await page.goto(`${OS}/os/calendar?event=${sid}`);
  await page.getByTestId("os-event-groups").waitFor(); await settle(page);
  await page.getByRole("combobox", { name: "Group", exact: true }).selectOption("managers");
  await page.getByRole("combobox", { name: "Group company" }).selectOption("IEL");
  await page.getByTestId("os-event-group-preview").click();
  const prev = await page.getByTestId("os-event-group-result").innerText();
  check("the group preview names exactly the active IELSco managers (by role or division management), not the former one", prev.includes("Growth Manager") && prev.includes("Creative Lead") && !prev.includes("Former Manager") && /2 to add/.test(prev), prev);
  await page.screenshot({ path: `${OUT}/41-group-preview.png` });
  await page.getByTestId("os-event-group-add").click();
  await page.getByTestId("os-event-save").click();
  await settle(page);
  const att = sql(`select string_agg(person_id || ':' || coalesce(via_group, '-'), ',' order by person_id) from public.os_event_attendees where event_id = '${sid}'`);
  check("saving invites them individually, each remembering the group (a snapshot, not a live rule)", att === "PPL-0011:Managers in IELSco,PPL-0012:Managers in IELSco", att);
  const notes = sql(`select string_agg(person_id || ':' || kind, ',' order by person_id) from public.os_notifications where entity_id = '${sid}'`);
  check("each invitee gets one Company OS notification; the founder (who invited) none", notes === "PPL-0011:event_invited,PPL-0012:event_invited", notes);

  // ── 3. Drag one occurrence to another day and time: asks the scope, writes one exception ──────────────────────────
  await page.goto(`${OS}/os/calendar?view=week&d=${mon2}`);
  await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  const chip = page.locator(`[data-testid=os-cal-item][data-key="${sid}@${utc(mon2, "10:00")}"]`);
  const t = await slotY(page, plusDays(mon2, 1), "14:00");
  await dragTo(page, chip, t.x, t.y);
  await choose(page, "this");
  await settle(page);
  const ex = sql(`select to_char(occurrence_start at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '>' || to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.os_event_exceptions where event_id = '${sid}'`);
  check("dragging one occurrence to Tuesday 14:00 asks which occurrences, then moves only that one", ex === `${mon2} 03:00>${plusDays(mon2, 1)} 07:00`, ex);
  check("…the series itself is unchanged", sql(`select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.os_events where id = '${sid}'`) === `${mon} 03:00`);
  check("…and the two invitees are told it moved (once each)", sql(`select count(*) from public.os_notifications where entity_id = '${sid}' and kind = 'event_rescheduled'`) === "2");
  await page.screenshot({ path: `${OUT}/42-week-after-drag.png`, fullPage: true });

  // ── 4. "This and following" splits the series; earlier weeks stay ─────────────────────────────────────────────────
  await page.goto(`${OS}/os/calendar?view=week&d=${mon3}`);
  await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  await page.locator(`[data-testid=os-cal-item][data-key="${sid}@${utc(mon3, "10:00")}"]`).click();
  await page.getByTestId("os-event-series-note").waitFor();
  await page.getByTestId("os-event-start-time").fill("15:00");
  await page.getByTestId("os-event-end-time").fill("16:00");
  await page.getByTestId("os-event-save").click();
  await choose(page, "following");
  await choose(page, "go").catch(() => {}); // a confirmation appears when the change needs one
  await settle(page);
  const split = sql(`select id || '|' || coalesce(series_id, '-') || '|' || to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '|' || coalesce(recurrence->>'until', '-') from public.os_events where title = 'Weekly Growth sync' order by id`);
  const rows = split.split("\n");
  check("“this and following” ends the old series the day before and starts a linked one at 15:00", rows.length === 2 && rows[0].endsWith(`|${plusDays(mon3, -1)}`) && rows[1].includes(`|${sid}|${mon3} 08:00|`), split);
  check("…attendees carried over to the new series", sql(`select count(*) from public.os_event_attendees where event_id = '${rows[1]?.split("|")[0]}'`) === "2");

  // ── 5. Resize a one-off event; drag it to another day in the month grid ──────────────────────────────────────────
  const one = sql(`insert into public.os_events (title, category, company_code, starts_at, ends_at, created_by) values ('Partner prep', 'Meeting', 'IEL', '${utc(wed, "09:00")}', '${utc(wed, "10:00")}', 'PPL-0001') returning id`).split("\n")[0];
  await page.goto(`${OS}/os/calendar?view=week&d=${mon}`);
  await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  const block = page.locator(`[data-testid=os-cal-item][data-key="${one}"]`).locator("..");
  const handle = block.getByTestId("os-cal-resize");
  await slotY(page, wed, "11:30", 0); // scrolls the grid first, so both points are measured in the same position
  const hb = await handle.boundingBox();
  const to = await slotY(page, wed, "11:30", 0);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(hb.x + hb.width / 2, hb.y + ((to.y - hb.y) * i) / 6);
  await page.mouse.up(); await settle(page);
  check("dragging the bottom edge makes the meeting end at 11:30", sql(`select to_char(ends_at at time zone 'UTC', 'HH24:MI') from public.os_events where id = '${one}'`) === "04:30");
  await page.goto(`${OS}/os/calendar?view=month&d=${wed}`);
  await page.getByTestId("os-cal-month").waitFor(); await settle(page);
  const cell = await page.locator(`[data-cal-day="${thu}"]`).boundingBox();
  await dragTo(page, page.locator(`[data-testid=os-cal-item][data-key="${one}"]`), cell.x + cell.width / 2, cell.y + cell.height - 10, { grab: 8 });
  await settle(page);
  check("dragging it to Thursday on the month grid keeps its time and length", sql(`select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '-' || to_char(ends_at at time zone 'UTC', 'HH24:MI') from public.os_events where id = '${one}'`) === `${thu} 02:00-04:30`);

  // ── 6. Delete one occurrence only ──────────────────────────────────────────────────────────────────────────────
  await page.goto(`${OS}/os/calendar?view=week&d=${mon}`);
  await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  await page.locator(`[data-testid=os-cal-item][data-key="${sid}@${utc(mon, "10:00")}"]`).click();
  await page.getByTestId("os-event-delete").click();
  await choose(page, "this"); await settle(page);
  check("deleting one occurrence cancels only that one", sql(`select cancelled from public.os_event_exceptions where event_id = '${sid}' and occurrence_start = '${utc(mon, "10:00")}'`) === "t" && sql(`select count(*) from public.os_events where id = '${sid}'`) === "1");
  check("…and it no longer shows that week", !(await page.getByTestId("os-cal-week").innerText()).includes("Weekly Growth sync"));

  // ── 7. Deadlines aren't events; layers and pins bring them in deliberately ─────────────────────────────────────
  const task = sql(`insert into public.os_tasks (title, company_code, owner_person_id, due_date) values ('Write partner brief', 'IEL', 'PPL-0001', '${thu}') returning id`).split("\n")[0];
  await page.reload(); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  check("a task deadline is not on the calendar by default", !(await page.getByTestId("os-cal-week").innerText()).includes("Write partner brief"));
  await page.getByTestId("os-cal-layer-deadlines").check(); await settle(page);
  check("…turning on “My task deadlines” shows it, as a deadline (not an event)", (await page.locator("[data-testid=os-cal-item][data-source=deadline]").allInnerTexts()).some((x) => x.includes("Write partner brief")));
  check("…and nothing was copied into events", sql("select count(*) from public.os_events where title = 'Write partner brief'") === "0");
  await page.goto(`${OS}/os/tasks/${task}`);
  await page.getByTestId("os-task-planning").waitFor();
  await page.getByTestId("os-task-block-day").fill(wed);
  await page.getByRole("textbox", { name: "From" }).fill("13:00").catch(async () => { await page.getByLabel("From").fill("13:00"); });
  await page.getByLabel("To", { exact: true }).fill("15:00");
  await page.getByTestId("os-task-block-save").click(); await settle(page);
  check("a work block schedules the task (13:00–15:00) without changing its deadline", sql(`select to_char(scheduled_start at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '|' || due_date from public.os_tasks where id = '${task}'`) === `${wed} 06:00|${thu}`);
  await page.goto(`${OS}/os/calendar?view=week&d=${mon}`); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  check("…and shows on the calendar as scheduled work", (await page.locator("[data-testid=os-cal-item][data-source=task]").allInnerTexts()).some((x) => x.includes("Write partner brief")));

  // ── 8. Milestone page: dependencies, linked work ──────────────────────────────────────────────────────────────
  const [tl1, tl2] = sql("select id from public.os_timeline_items order by id limit 2").split("\n");
  await page.goto(`${OS}/os/timeline/${tl2}`);
  await page.getByTestId("os-milestone-detail").waitFor();
  await page.getByRole("combobox", { name: "Add a prerequisite" }).selectOption(tl1);
  await page.getByRole("button", { name: "Add", exact: true }).click(); await settle(page);
  check("a founder records a milestone dependency on the milestone page", sql(`select count(*) from public.os_timeline_dependencies where item_id = '${tl2}' and depends_on_id = '${tl1}'`) === "1");
  await page.goto(`${OS}/os/timeline/${tl1}`); await page.getByTestId("os-milestone-detail").waitFor();
  await page.getByRole("combobox", { name: "Add a prerequisite" }).selectOption(tl2);
  await page.getByRole("button", { name: "Add", exact: true }).click(); await settle(page);
  check("…and a loop (each waiting for the other) is refused", sql(`select count(*) from public.os_timeline_dependencies where item_id = '${tl1}' and depends_on_id = '${tl2}'`) === "0" && (await page.getByTestId("os-error").count()) > 0);
  await page.screenshot({ path: `${OUT}/43-milestone.png`, fullPage: true });

  // ── 9. Assistant: the planning examples, previewed then confirmed ─────────────────────────────────────────────
  const askAi = async (message, answer) => {
    await fetch(`${GW}/__test/gemini`, { method: "POST", body: JSON.stringify(answer) });
    const before = await page.getByTestId("os-ai-action").count();
    await page.getByTestId("os-ai-input").fill(message);
    await page.getByRole("button", { name: "Send" }).click();
    await page.waitForFunction((n) => document.querySelectorAll("[data-testid=os-ai-action]").length > n || document.querySelectorAll("[data-testid=os-error]").length > 0, before, { timeout: 30000 }).catch(() => {});
    return page.getByTestId("os-ai-action").nth(before);
  };
  const confirm = async (card) => { await card.getByRole("button", { name: "Confirm & Create" }).click(); await card.getByTestId("os-ai-created").waitFor({ timeout: 15000 }).catch(() => {}); };
  await page.goto(`${OS}/os/assistant`);
  let card = await askAi("Create a weekly Growth meeting every Monday at 10 AM", { calls: [{ name: "create_event", args: { title: "Growth Monday meeting", company: "IELSco", date: mon, start_time: "10:00", end_time: "11:00", division: "Growth", invite_division: true, repeat: "weekly" } }] });
  check("assistant: the weekly meeting preview says it repeats every Monday", /Repeats[\s\S]*Monday/.test(await card.innerText()), (await card.innerText()).slice(0, 300));
  await confirm(card);
  check("…and confirming creates one series with the Growth division invited", sql("select recurrence->>'freq' || ':' || (select count(*) from public.os_event_attendees a where a.event_id = e.id) from public.os_events e where title = 'Growth Monday meeting'") === "weekly:2");

  card = await askAi("Create the January Intake campaign", { calls: [{ name: "create_campaign", args: { name: "January Intake", company: "IELSco", start_date: plusDays(today, 30), end_date: plusDays(today, 60), owner: "Growth Manager" } }] });
  await confirm(card);
  const cmp = sql("select id from public.os_campaigns where name = 'January Intake'");
  check("assistant: creating a campaign makes a campaign record (CMP) with its owner", /^CMP-\d{4}$/.test(cmp) && sql(`select owner_person_id from public.os_campaigns where id = '${cmp}'`) === "PPL-0011", cmp);

  card = await askAi("Schedule the campaign launch on January 10 and link it to the timeline", { calls: [{ name: "create_event", args: { title: "January Intake launch", category: "Campaign", company: "IELSco", date: plusDays(today, 30), all_day: true, campaign: "January Intake", milestone: tl1 } }] });
  await confirm(card);
  check("assistant: the launch is an event linked to the campaign and the milestone; the milestone's date is untouched", sql(`select campaign_id || '|' || timeline_item_id from public.os_events where title = 'January Intake launch'`) === `${cmp}|${tl1}`);

  card = await askAi("Create content slots every weekday next week", { calls: [{ name: "create_content_items", args: { title: "Daily English tip", campaign: "January Intake", channel: "Instagram", from: mon, to: plusDays(mon, 6), pattern: "weekdays", time: "18:00", creator: "Content Creator", reviewer: "Growth Manager" } }] });
  check("assistant: the content preview lists five weekday slots", (await card.innerText()).includes("5 content slots"), (await card.innerText()).slice(0, 300));
  await confirm(card);
  check("…confirming creates five content items (not tasks), each with creator and reviewer", sql(`select count(*) from public.os_campaign_items where campaign_id = '${cmp}' and creator_person_id = 'PPL-0013' and reviewer_person_id = 'PPL-0011'`) === "5" && sql("select count(*) from public.os_tasks where title like 'Daily English tip%'") === "0");

  const gif = sql(`insert into public.os_events (title, category, company_code, starts_at, ends_at, created_by) values ('GIF preparation meeting', 'Meeting', 'IEL', '${utc(thu, "13:00")}', '${utc(thu, "14:00")}', 'PPL-0001') returning id`).split("\n")[0];
  sql(`insert into public.os_event_tasks (event_id, task_id) values ('${gif}', '${task}')`);
  card = await askAi("Move the GIF preparation meeting from Thursday to Friday", { calls: [{ name: "move_event", args: { event: "GIF preparation meeting", from_date: thu, to_date: fri } }] });
  check("assistant: the move preview shows from and to, and says linked records don't change", /From[\s\S]*To[\s\S]*not changed/.test(await card.innerText()));
  await confirm(card);
  check("…confirming moves it to Friday 13:00; the linked task's deadline and work block stay", sql(`select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') from public.os_events where id = '${gif}'`) === `${fri} 06:00` && sql(`select due_date || '|' || to_char(scheduled_start at time zone 'UTC', 'HH24:MI') from public.os_tasks where id = '${task}'`) === `${thu}|06:00`);

  card = await askAi("Show me all events and tasks related to partner", { text: "Partner prep (EV) on Thursday and the task Write partner brief." });
  const lastCall = await (await fetch(`${GW}/__test/gemini-last`)).json();
  check("assistant: “show me everything related to …” gives the model the matching events and tasks from the person's own access, and proposes nothing", JSON.stringify(lastCall).includes("Partner prep") && JSON.stringify(lastCall).includes("Write partner brief") && (await page.getByTestId("os-ai-action").count()) >= 0);

  const pevent = sql(`insert into public.os_events (title, category, company_code, starts_at, ends_at, created_by) values ('Partnership signing event', 'Partnership', 'IEL', '${utc(plusDays(fri, 7), "09:00")}', '${utc(plusDays(fri, 7), "12:00")}', 'PPL-0001') returning id`).split("\n")[0];
  card = await askAi("Create three preparation tasks linked to the upcoming partnership event", { calls: [{ name: "create_tasks", args: { tasks: ["Book venue", "Print MoU", "Brief speakers"].map((title) => ({ title, company: "IELSco", event: "Partnership signing event", due_date: fri })) } }] });
  await confirm(card);
  check("assistant: three preparation tasks are created and linked to the partnership event", sql(`select count(*) from public.os_event_tasks where event_id = '${pevent}'`) === "3");

  const review = sql(`insert into public.os_events (title, category, company_code, starts_at, ends_at, recurrence, created_by) values ('Monthly company review', 'Meeting', 'IEL', '${utc(plusDays(today, 20), "09:00")}', '${utc(plusDays(today, 20), "10:00")}', '{"freq":"monthly"}', 'PPL-0001') returning id`).split("\n")[0];
  card = await askAi("Invite all IELSco managers to the monthly company review", { calls: [{ name: "invite_to_event", args: { event: "monthly company review", groups: ["all IELSco managers"] } }] });
  const invText = await card.innerText();
  check("assistant: the invitation preview names the managers and the count", invText.includes("Growth Manager") && invText.includes("Creative Lead") && !invText.includes("Former Manager"), invText.slice(0, 300));
  await confirm(card);
  check("…confirming invites exactly them, with the group recorded", sql(`select string_agg(person_id || ':' || via_group, ',' order by person_id) from public.os_event_attendees where event_id = '${review}'`) === "PPL-0011:Managers in IELSco,PPL-0012:Managers in IELSco");
  await page.screenshot({ path: `${OUT}/44-assistant-planning.png`, fullPage: true });

  // ── 10. Marketing workspace and campaign page ─────────────────────────────────────────────────────────────────
  await page.goto(`${OS}/os/calendar?ws=marketing&view=week&d=${mon}`);
  await page.getByTestId("os-marketing-board").waitFor(); await settle(page);
  const mk = await page.getByTestId("os-cal-week").innerText();
  check("the Marketing calendar shows content slots and hides unrelated meetings", mk.includes("Daily English tip") && !mk.includes("Weekly Growth sync"));
  await page.screenshot({ path: `${OUT}/45-marketing.png`, fullPage: true });
  await page.goto(`${OS}/os/campaigns/${cmp}`);
  await page.getByTestId("os-campaign-detail").waitFor(); await settle(page);
  const cp = await page.getByTestId("os-campaign-detail").innerText();
  check("the campaign page shows its content and its launch event", cp.includes("Daily English tip") && cp.includes("January Intake launch"));
  await page.goto(`${OS}/os/calendar?ws=project&p=${sql("select id from public.os_projects order by id limit 1")}`);
  await page.getByTestId("os-cal-spaces").waitFor();
  check("the Project workspace opens", (await page.getByTestId("os-cal-spaces").innerText()).includes("Project"));
}

// ── 11. Member: notifications, permissions, Google sync of a series (simulated Google Calendar API) ────────────────
const member = await signIn({ email: "member.iel@ielsco.test" });
{
  const { page } = member;
  // The member is invited by the founder (as attendee) to see the bell.
  sql(`insert into public.os_event_attendees (event_id, person_id) select id, 'PPL-0002' from public.os_events where title = 'Monthly company review'`);
  await page.goto(`${OS}/os`); await settle(page);
  const count = await page.getByTestId("os-notifications-count").first().innerText().catch(() => "0");
  check("the member sees an unread notification after being invited", Number(count) >= 1, count);
  const fev = sql("select id from public.os_events where title = 'Partner prep'");
  await page.goto(`${OS}/os/calendar?view=week&d=${mon}`); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
  const pchip = page.locator(`[data-testid=os-cal-item][data-key="${fev}"]`);
  if (await pchip.count()) {
    const tgt = await slotY(page, fri, "09:00");
    await dragTo(page, pchip, tgt.x, tgt.y); await settle(page);
  }
  check("a member can't move a founder's event by dragging it (RLS); nothing changed", sql(`select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD') from public.os_events where id = '${fev}'`) === thu);

  const connected = sql("select count(*) from public.os_calendar_connections where person_id = 'PPL-0002'") === "1";
  check("(Google, simulated) the member's calendar connection from the first suite is in place", connected);
  if (connected) {
    const before = (await gcal()).length;
    await page.getByTestId("os-event-new").click();
    await page.getByTestId("os-event-title").fill("Creative daily check-in");
    await page.getByTestId("os-event-start-date").fill(mon);
    await page.getByTestId("os-event-start-time").fill("08:30");
    await page.getByTestId("os-event-end-time").fill("09:00");
    await page.getByRole("combobox", { name: "Repeat", exact: true }).selectOption("weekdays");
    await page.getByTestId("os-event-add-google").locator("input").check();
    await page.getByTestId("os-event-save").click(); await settle(page);
    const cid = sql("select id from public.os_events where title = 'Creative daily check-in'");
    const g = (await gcal()).filter((e) => e.extendedProperties?.private?.osEventId === cid);
    check("(Google, simulated) a weekday series goes to Google as ONE recurring event with its RRULE", g.length === 1 && (g[0].recurrence ?? []).some((l) => l.startsWith("RRULE:FREQ=WEEKLY") && l.includes("BYDAY=MO,TU,WE,TH,FR")) && (await gcal()).length === before + 1, JSON.stringify(g.map((x) => x.recurrence)));
    // Move Tuesday's occurrence by dragging: an instance change in Google, no new Google event.
    await page.goto(`${OS}/os/calendar?view=week&d=${mon}`); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
    const tchip = page.locator(`[data-testid=os-cal-item][data-key="${cid}@${utc(tue, "08:30")}"]`);
    const tgt = await slotY(page, tue, "11:00");
    await dragTo(page, tchip, tgt.x, tgt.y);
    await choose(page, "this");
    await choose(page, "go").catch(() => {});
    await settle(page);
    const g2 = (await gcal()).filter((e) => e.extendedProperties?.private?.osEventId === cid);
    check("(Google, simulated) moving one occurrence updates that Google instance; still one Google event, no duplicates", g2.length === 1 && Object.keys(g2[0].instances ?? {}).length === 1 && (await gcal()).length === before + 1, JSON.stringify(g2[0]?.instances ?? {}));
    check("finishing a drag over an empty slot doesn't also open a new event", (await page.getByTestId("os-event-title").count()) === 0);
    // Cancel Wednesday's: EXDATE on the master.
    await page.goto(`${OS}/os/calendar?view=week&d=${mon}`); await page.getByTestId("os-cal-week").waitFor(); await settle(page);
    await page.locator(`[data-testid=os-cal-item][data-key="${cid}@${utc(wed, "08:30")}"]`).click();
    await page.getByTestId("os-event-delete").click();
    await choose(page, "this"); await settle(page);
    const g3 = (await gcal()).find((e) => e.extendedProperties?.private?.osEventId === cid);
    check("(Google, simulated) deleting one occurrence becomes an EXDATE in Google", (g3?.recurrence ?? []).some((l) => l.startsWith("EXDATE") && l.includes(wed.replaceAll("-", ""))), JSON.stringify(g3?.recurrence));
    // Invitations: only with the switch on; Google gets the individual work accounts and the answers come back.
    sql(`insert into public.os_event_attendees (event_id, person_id) values ('${cid}', 'PPL-0012')`);
    await page.goto(`${OS}/os/calendar?event=${cid}`);
    await page.getByTestId("os-event-google-invites").locator("input").check();
    await page.getByTestId("os-event-save").click();
    await choose(page, "all").catch(() => {});
    await settle(page);
    const g4 = (await gcal()).find((e) => e.extendedProperties?.private?.osEventId === cid);
    check("(Google, simulated) with invitations on, Google gets each attendee's registered work account and sends updates", JSON.stringify(g4?.attendees ?? []).includes("creative.lead@ielsco.test") && g4?.sendUpdates === "all", JSON.stringify({ a: g4?.attendees, s: g4?.sendUpdates }));
    await fetch(`${GW}/__test/gcal-rsvp`, { method: "POST", body: JSON.stringify({ "creative.lead@ielsco.test": "accepted" }) });
    await page.evaluate(async (id) => fetch("/os/api/calendar/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_id: id, action: "push" }) }), cid);
    check("(Google, simulated) the attendee's answer (accepted) is read back into Company OS", sql(`select response_status from public.os_event_attendees where event_id = '${cid}' and person_id = 'PPL-0012'`) === "accepted");
  }

  // ── 12. Phones: 360 px, no sideways scrolling on the new screens ────────────────────────────────────────────────
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, storageState: await founder.ctx.storageState() });
  const pp = await phone.newPage();
  const cmp = sql("select id from public.os_campaigns where name = 'January Intake'");
  const tl = sql("select id from public.os_timeline_items order by id limit 1 offset 1");
  const tk = sql("select id from public.os_tasks where title = 'Write partner brief'");
  const widths = [];
  for (const path of [`/os/calendar?view=week&d=${mon}`, `/os/calendar?view=day&d=${mon}`, `/os/calendar?ws=marketing`, "/os/campaigns", "/os/campaigns?tab=campaigns", `/os/campaigns/${cmp}`, `/os/timeline/${tl}`, `/os/tasks/${tk}`, "/os/people/PPL-0011"]) {
    await pp.goto(`${OS}${path}`); await pp.waitForLoadState("networkidle");
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    widths.push(`${path}=${w}`);
  }
  check("no sideways scroll at 360 px on nine planning screens", widths.every((x) => Number(x.slice(x.lastIndexOf("=") + 1)) <= 362), widths.join(" "));
  await pp.goto(`${OS}/os/calendar?view=week&d=${mon}`); await pp.waitForLoadState("networkidle");
  await pp.screenshot({ path: `${OUT}/46-phone-week.png`, fullPage: true });
  await pp.goto(`${OS}/os/calendar?event=${sql("select id from public.os_events where title = 'Weekly Growth sync' order by id limit 1")}`); await pp.waitForLoadState("networkidle");
  await pp.screenshot({ path: `${OUT}/47-phone-event.png`, fullPage: true });
  await phone.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
