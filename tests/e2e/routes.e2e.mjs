// Route smoke test for the dashboard navigation against the LOCAL stack only (:54322 DB stand-in, :3300 app; override
// with APP_URL / DB_URL).
// For each route, desktop and phone: no page errors or console errors, an <h1>, the right top-level menu highlighted,
// headings in Poppins, no horizontal overflow on a 390px phone. Screenshots go to the folder given as argv[3].
// Usage: node routes.e2e.mjs <path to playwright-core> <screenshot dir>
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || "playwright-core");
const OUT = process.argv[3] || ".";
mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || "http://localhost:3300", DB = process.env.DB_URL || "http://127.0.0.1:54322";
const MEMBER = "bbbbbbbb-0000-4000-8000-000000000002";
const sql = async (q) => (await fetch(`${DB}/__sql`, { method: "POST", body: JSON.stringify({ sql: q }) })).json();
await sql(`insert into public.member_profiles (user_id, display_name, connect_guidelines_at, adult_confirmed_at, connect_discoverable, languages_spoken, connect_goals, connect_topics)
  values ('${MEMBER}', 'Raka Pratama', now(), now(), true, '{id,en}', '{culture_exchange}', '{culture}') on conflict (user_id) do nothing`);
await sql(`update public.member_profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where user_id = '${MEMBER}'`);

// [route, expected sidebar group id ("none" = no group lit), expected section tabs id (always null: the tab row was removed)]
const ROUTES = [
  ["/dashboard", "home", null],
  // Social: People (with connections, intro requests, Elco-Pass) and Inbox; hidden pages still belong here.
  ["/dashboard/connect/discover", "social", null], ["/dashboard/people", "social", null], ["/dashboard/connect/connections", "social", null],
  ["/dashboard/connect/requests", "social", null], ["/dashboard/passport", "social", null], ["/dashboard/passport/milestones", "social", null],
  ["/dashboard/connect/passport", "social", null], ["/dashboard/connect/elco", "social", null], ["/dashboard/my-learning", "social", null],
  ["/dashboard/connect/messages", "social", null], ["/dashboard/social", "social", null], ["/dashboard/circles", "social", null],
  ["/dashboard/sea-exchange", "social", null], ["/dashboard/connect/safety", "social", null], ["/dashboard/connect/quick-match", "social", null],
  // Discover: Programs, Opportunities, News & Stories, Learning Materials.
  ["/dashboard/programs", "discover", null], ["/dashboard/discover/opportunities", "discover", null], ["/dashboard/opportunities", "discover", null],
  ["/dashboard/discover/stories", "discover", null], ["/dashboard/explore", "discover", null], ["/dashboard/discover", "discover", null],
  ["/dashboard/search?q=english", "discover", null],
  // Events: Circle (its own item), IELSco Events (official events and Talks) and Other Events.
  ["/dashboard/events/ielsco", "events", null], ["/dashboard/events/talks", "events", null], ["/dashboard/circle", "events", null],
  ["/dashboard/events", "events", null], ["/dashboard/connect/rooms", "events", null], ["/dashboard/connect/rooms/new", "events", null],
  // Profile card pages: no group lit.
  ["/dashboard/shelf", "none", null], ["/dashboard/notifications", "none", null], ["/dashboard/membership", "none", null],
  ["/dashboard/profile", "none", null], ["/dashboard/settings", "none", null], ["/dashboard/help", "none", null], ["/dashboard/my-goals", "none", null],
  ["/dashboard/gif", "none", null],
];

const browser = await chromium.launch();
let pass = 0, fail = 0;
for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, reducedMotion: label === "phone" ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/401|Failed to load resource|favicon|Download the React DevTools/.test(m.text())) errors.push(`console: ${m.text().slice(0, 160)}`); });
  await page.goto(`${APP}/sign-in`);
  await page.fill('input[type="email"]', "demo.member@example.test");
  await page.fill('input[type="password"]', "local-test-only");
  await page.press('input[type="password"]', "Enter");
  await page.waitForURL(/\/dashboard/, { timeout: 60000 });
  for (const [route, menu, tabs] of ROUTES) {
    errors.length = 0;
    await page.goto(`${APP}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 }); // dev server compiles a page on first visit
    await page.locator("h1").first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const nav = [...document.querySelectorAll('[aria-current][data-testid^="nav-"]:not([data-testid^="nav-menu-"]), [aria-current][data-testid^="mobile-nav-"]')].map((e) => e.getAttribute("data-testid"));
      const tabs = document.querySelector('[data-testid^="section-tabs-"]')?.getAttribute("data-testid") ?? null;
      return { h1: h1?.textContent?.trim() ?? null, font: h1 ? getComputedStyle(h1).fontFamily : null, nav, tabs,
        overflow: document.documentElement.scrollWidth - window.innerWidth, loading: !!document.querySelector('[data-testid="loading-state"]') };
    });
    const problems = [];
    if (!r.h1) problems.push("no h1");
    if (r.font && !/poppins/i.test(r.font)) problems.push(`h1 font ${r.font}`);
    const navIds = r.nav.map((n) => n.replace(/^(mobile-)?nav-/, ""));
    const want = menu;
    if (["home", "social", "discover", "events"].includes(menu) && !navIds.includes(want)) problems.push(`menu ${want} not active (${navIds}) at ${new URL(page.url()).pathname}`);
    if (menu === "none" && navIds.some((n) => ["home", "social", "discover", "events"].includes(n))) problems.push(`unexpected active ${navIds}`);
    if (tabs && r.tabs !== `section-tabs-${tabs}`) problems.push(`tabs ${r.tabs}`);
    if (!tabs && r.tabs) problems.push(`unexpected tabs ${r.tabs}`);
    if (r.overflow > 1) problems.push(`horizontal overflow ${r.overflow}px`);
    if (r.loading) problems.push("still loading");
    problems.push(...errors);
    const name = `${label}${route.replace(/[/?=&]/g, "_")}`;
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    if (problems.length) { fail++; console.log(`FAIL ${label} ${route} -> ${problems.join("; ")}`); } else { pass++; console.log(`PASS ${label} ${route} (h1: ${r.h1})`); }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
