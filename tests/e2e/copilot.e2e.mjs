// Elco Copilot + product tour + mascot motion, against the LOCAL stack only (:54322 DB stand-in, :3300 app).
// Usage: node copilot.e2e.mjs <path to playwright-core>
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || "playwright-core");
const APP = "http://localhost:3300", DB = "http://127.0.0.1:54322";
const MEMBER = "bbbbbbbb-0000-4000-8000-000000000002";
const sql = async (q) => (await fetch(`${DB}/__sql`, { method: "POST", body: JSON.stringify({ sql: q }) })).json();
let pass = 0, fail = 0;
const check = async (name, fn) => { try { const w = await fn(); w ? (fail++, console.log("FAIL", name, "->", w)) : (pass++, console.log("PASS", name)); } catch (e) { fail++; console.log("FAIL", name, "->", e.message.split("\n")[0]); } };

await sql(`insert into public.member_profiles (user_id, display_name, onboarding_completed_at) values ('${MEMBER}', 'Raka Pratama', now()) on conflict (user_id) do update set onboarding_completed_at = coalesce(public.member_profiles.onboarding_completed_at, now())`);
await sql(`update public.connect_settings set value = 'false'::jsonb where key = 'quick_match_enabled'`);
await sql(`delete from public.product_tours`);

const browser = await chromium.launch();
async function signIn(viewport, reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(`${APP}/sign-in`);
  await page.fill('input[type="email"]', "demo.member@example.test");
  await page.fill('input[type="password"]', "local-test-only");
  await page.press('input[type="password"]', "Enter");
  await page.waitForURL(/\/dashboard/, { timeout: 60000 });
  return { ctx, page };
}

const { ctx, page } = await signIn({ width: 1440, height: 900 });

await check("first visit opens the five-menu tour; Next/Back/Finish work and completion is saved", async () => {
  await page.goto(`${APP}/dashboard`);
  const dialog = page.getByRole("dialog").filter({ hasText: /Step 1 of/ });
  await dialog.waitFor({ timeout: 30000 });
  const titles = [];
  for (let i = 0; i < 10; i++) {
    const d = page.getByRole("dialog").filter({ hasText: /Step \d+ of/ });
    titles.push(await d.locator("h2, [id$='title']").first().textContent());
    if (i === 1) { await d.getByRole("button", { name: "Back" }).click(); await d.getByRole("button", { name: "Next" }).click(); }
    const finish = d.getByRole("button", { name: "Finish" });
    if (await finish.isVisible()) { await finish.click(); break; }
    await d.getByRole("button", { name: "Next" }).click();
  }
  const want = ["Your dashboard", "Discover", "Social", "Connect", "More", "Elco Copilot"];
  for (const w of want) if (!titles.some((t) => t?.includes(w))) return `missing step "${w}" in ${JSON.stringify(titles)}`;
  await page.waitForTimeout(800);
  const [row] = await sql(`select status, version from public.product_tours where tour_key = 'ielsco-dashboard'`);
  return row?.status === "completed" && row.version === 2 ? null : JSON.stringify(row);
});
await check("tour does not reopen after it was completed", async () => {
  await page.goto(`${APP}/dashboard`); await page.waitForTimeout(3000);
  return (await page.getByRole("dialog").filter({ hasText: /Step 1 of/ }).count()) === 0 ? null : "reopened";
});

await check("Copilot opens with help for the current section (Discover)", async () => {
  await page.goto(`${APP}/dashboard/circles`);
  await page.getByTestId("copilot-button").click();
  const panel = page.getByTestId("copilot-panel");
  await panel.waitFor();
  const first = await panel.locator("summary").first().textContent();
  return /join a Circle/i.test(first) ? null : first;
});
await check("search answers with a link to the real page", async () => {
  await page.getByLabel("Search help").fill("scholarships");
  const panel = page.getByTestId("copilot-panel");
  await panel.getByRole("link", { name: "Browse opportunities" }).click();
  await page.waitForURL(/\/dashboard\/discover\/opportunities/);
});
await check("unknown question: honest 'no answer' with Help link", async () => {
  await page.getByTestId("copilot-button").click();
  await page.getByLabel("Search help").fill("teleport to mars");
  await page.getByTestId("copilot-no-answer").waitFor();
});
await check("Quick Match answer says it isn't switched on (it is off here)", async () => {
  await page.goto(`${APP}/dashboard/connect/quick-match`);
  await page.getByTestId("copilot-button").click();
  await page.getByTestId("copilot-panel").locator("summary").first().click();
  await page.getByTestId("copilot-qm-status").filter({ hasText: "isn't switched on" }).waitFor({ timeout: 10000 });
});
await check("Esc closes the panel and returns focus to the button", async () => {
  await page.keyboard.press("Escape");
  await page.getByTestId("copilot-panel").waitFor({ state: "detached" });
  return (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === "copilot-button" ? null : "focus not returned";
});
await check("'Take a tour' replays the tour from any page", async () => {
  await page.getByTestId("copilot-button").click();
  await page.getByTestId("copilot-tour").click();
  await page.getByRole("dialog").filter({ hasText: /Step 1 of/ }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Skip tour" }).click();
});
await check("Copilot is hidden in a conversation (never covers the message box)", async () => {
  await page.goto(`${APP}/dashboard/connect/messages/aaaaaaaa-0000-4000-8000-000000000001`); await page.waitForTimeout(3000);
  return (await page.getByTestId("copilot-button").count()) === 0 ? null : "visible";
});
await check("Elco idle animation runs when visible", async () => {
  await page.goto(`${APP}/dashboard/sea-exchange`);
  await page.getByTestId("sea-week").waitFor();
  await page.waitForTimeout(800);
  const anim = await page.evaluate(() => { const e = document.querySelector('[data-testid="sea-week"] .elco'); return { on: e?.getAttribute("data-animate"), name: getComputedStyle(e.querySelector(".elco-eyes")).animationName }; });
  return anim.on === "on" && anim.name === "elco-blink" ? null : JSON.stringify(anim);
});
await check("scrolling the mascot out of view pauses it; scrolling back resumes it", async () => {
  const state = () => page.evaluate(() => document.querySelector('[data-testid="sea-week"] .elco')?.getAttribute("data-animate"));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(800);
  const away = await state();
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
  const back = await state();
  return away === "off" && back === "on" ? null : JSON.stringify({ away, back });
});
await ctx.close();

const reduced = await signIn({ width: 390, height: 844 }, "reduce");
await check("reduced motion: no mascot animation", async () => {
  await reduced.page.goto(`${APP}/dashboard/sea-exchange`);
  await reduced.page.getByTestId("sea-week").waitFor();
  const names = await reduced.page.evaluate(() => [...document.querySelectorAll(".elco .elco-eyes, .elco .elco-arm, .elco .elco-float")].map((e) => getComputedStyle(e).animationName));
  return names.every((n) => n === "none") ? null : names.join(",");
});
await check("phone: Copilot button sits above the bottom bar, not on it", async () => {
  const [btn, bar] = await Promise.all([reduced.page.getByTestId("copilot-button").boundingBox(), reduced.page.getByTestId("mobile-tab-bar").boundingBox()]);
  return btn.y + btn.height <= bar.y ? null : JSON.stringify({ btn, bar });
});
await check("phone: More opens the sheet with the supporting pages", async () => {
  await reduced.page.getByTestId("mobile-nav-more").click();
  const sheet = reduced.page.getByTestId("mobile-menu");
  await sheet.waitFor();
  for (const id of ["my-goals", "membership", "shelf", "settings", "help"]) if (!(await sheet.getByTestId(`drawer-${id}`).count())) return `missing ${id}`;
});
await reduced.ctx.close();
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
