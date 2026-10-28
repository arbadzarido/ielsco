// Two-user Quick Match end-to-end test against the LOCAL stack only (workspace/local-stack/ielsco-db.mjs on :54322 and the
// app on :3300 via ielsco-platform-dev.mjs). Real WebRTC between two isolated browser sessions, using Chromium's fake
// camera/microphone. Not part of `npm test` (needs playwright-core and a Chromium build).
// Usage: node quick-match.e2e.mjs <path to playwright-core>   (e.g. a scratch install of playwright-core@1.49.1)
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || "playwright-core");
const APP = "http://localhost:3300", DB = "http://127.0.0.1:54322";
const MEMBER = "bbbbbbbb-0000-4000-8000-000000000002", ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log("PASS", n); };
const bad = (n, w) => { fail++; console.log("FAIL", n, "->", w); };
const sql = async (q) => (await fetch(`${DB}/__sql`, { method: "POST", body: JSON.stringify({ sql: q }) })).json();
const check = async (name, fn) => { try { const w = await fn(); w ? bad(name, w) : ok(name); } catch (e) { bad(name, e.message.split("\n")[0]); } };

// Test data straight into the local stand-in: two Connect-ready members, Quick Match on, no earlier calls.
await sql(`insert into public.member_profiles (user_id, display_name, connect_guidelines_at, adult_confirmed_at, connect_discoverable, connect_topics)
  values ('${MEMBER}', 'Raka Pratama', now(), now(), true, '{culture}'), ('${ADMIN}', 'Kenji Sato', now(), now(), true, '{travel}')
  on conflict (user_id) do update set display_name = excluded.display_name, connect_guidelines_at = now(), adult_confirmed_at = now()`);
await sql(`update public.connect_settings set value = 'true'::jsonb where key = 'quick_match_enabled'`);
for (const t of ["connect_calls", "connect_match_queue", "connect_connections"]) await sql(`delete from public.${t}`); // the stub runs one statement per call

const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
async function member(email, { denyMedia = false } = {}) {
  const ctx = await browser.newContext({ permissions: denyMedia ? [] : ["microphone", "camera"], viewport: { width: 1200, height: 900 } });
  // A browser where the member blocked the microphone: getUserMedia rejects with NotAllowedError.
  if (denyMedia) await ctx.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("blocked", "NotAllowedError")); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [${email} pageerror]`, e.message));
  await page.goto(`${APP}/sign-in`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', "local-test-only");
  await page.press('input[type="password"]', "Enter");
  await page.waitForURL(/\/dashboard/, { timeout: 60000 });
  return { ctx, page };
}
const start = async (page, mode) => {
  await page.goto(`${APP}/dashboard/connect/quick-match`);
  await page.getByTestId("qm-setup").waitFor({ timeout: 60000 });
  await page.locator("label", { hasText: mode === "video" ? "Video (camera optional)" : /^Voice$/ }).click();
  await page.getByTestId("qm-start").click();
};

const a = await member("demo.member@example.test");
const b = await member("demo.admin@example.test");

// ── Test A: queue and match ─────────────────────────────────────────────────────────────────────────────────────────
await start(a.page, "video");
await check("A waits in the queue (no fake match)", async () => { await a.page.getByTestId("qm-waiting").waitFor({ timeout: 15000 }); });
await start(b.page, "video");
await check("both reach the call screen", async () => {
  await a.page.getByTestId("call-screen").waitFor({ timeout: 30000 });
  await b.page.getByTestId("call-screen").waitFor({ timeout: 30000 });
});
await check("exactly one active call, queue empty", async () => {
  const [c] = await sql(`select (select count(*) from public.connect_calls where ended_at is null)::int calls, (select count(*) from public.connect_match_queue)::int queued`);
  return c.calls === 1 && c.queued === 0 ? null : JSON.stringify(c);
});

// ── Test B: media ───────────────────────────────────────────────────────────────────────────────────────────────────
await check("WebRTC connects peer-to-peer (both show Connected)", async () => {
  await a.page.getByTestId("call-link").filter({ hasText: "Connected" }).waitFor({ timeout: 45000 });
  await b.page.getByTestId("call-link").filter({ hasText: "Connected" }).waitFor({ timeout: 45000 });
});
await check("remote audio track is live on both sides", async () => {
  for (const p of [a.page, b.page]) {
    const n = await p.evaluate(() => [...document.querySelectorAll("video")].flatMap((v) => (v.srcObject?.getAudioTracks?.() ?? []).filter((t) => t.readyState === "live")).length);
    if (n < 1) return `no live remote audio track (${n})`;
  }
});
await check("camera starts OFF; the other side sees 'camera is off'", async () => {
  await b.page.getByText("Raka Pratama's camera is off").waitFor({ timeout: 10000 });
});
await check("turning the camera on shows video on the other side (frames decoded)", async () => {
  await a.page.getByRole("button", { name: "Turn camera on" }).click();
  await b.page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => v.videoWidth > 0 && !v.classList.contains("hidden")), null, { timeout: 30000 });
});
await check("and the other direction: Kenji's camera reaches Raka", async () => {
  await b.page.getByRole("button", { name: "Turn camera on" }).click();
  await a.page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => v.videoWidth > 0 && !v.classList.contains("hidden") && !v.muted), null, { timeout: 30000 });
});
await check("camera off again → the other side shows 'camera is off'", async () => {
  await b.page.getByRole("button", { name: "Turn camera off" }).click();
  await a.page.getByText("Kenji Sato's camera is off").waitFor({ timeout: 15000 });
});
await check("mute toggles the outgoing audio track", async () => {
  await a.page.getByRole("button", { name: "Mute" }).click();
  await a.page.getByRole("button", { name: "Unmute" }).waitFor({ timeout: 5000 });
  await a.page.getByRole("button", { name: "Unmute" }).click();
});
await check("timer counts down from at most 8:00", async () => {
  const t = await a.page.getByTestId("call-timer").textContent();
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s <= 480 && m * 60 + s > 400 ? null : t;
});

// ── Test C: server-enforced limit and cleanup ───────────────────────────────────────────────────────────────────────
await check("server expiry ends the call on both sides (no client action)", async () => {
  await sql(`update public.connect_calls set expires_at = now() + interval '3 seconds' where ended_at is null`);
  await a.page.getByTestId("after-call").waitFor({ timeout: 20000 });
  await b.page.getByTestId("after-call").waitFor({ timeout: 20000 });
  const [c] = await sql(`select end_reason from public.connect_calls order by created_at desc limit 1`);
  if (c.end_reason !== "timeout") return c.end_reason;
  const sig = await a.page.evaluate(async () => (await fetch("/api/connect/ice")).status);
  return sig === 404 ? null : `ICE credentials still issued after the call (${sig})`;
});

// ── Test D: consent ─────────────────────────────────────────────────────────────────────────────────────────────────
await check("one-sided yes does not connect", async () => {
  await a.page.locator("fieldset", { hasText: "Would you like to connect" }).locator("label", { hasText: "Yes" }).click();
  await a.page.getByTestId("after-call-submit").click();
  await a.page.getByTestId("after-call-result").filter({ hasText: "If Kenji Sato also says yes" }).waitFor({ timeout: 10000 });
  const [c] = await sql(`select count(*)::int n from public.connect_connections`);
  return c.n === 0 ? null : "connected too early";
});
await check("mutual yes connects (source quick_match)", async () => {
  await b.page.locator("fieldset", { hasText: "Would you like to connect" }).locator("label", { hasText: "Yes" }).click();
  await b.page.getByTestId("after-call-submit").click();
  await b.page.getByTestId("after-call-result").filter({ hasText: "both said yes" }).waitFor({ timeout: 10000 });
  const [c] = await sql(`select source from public.connect_connections`);
  return c?.source === "quick_match" ? null : JSON.stringify(c);
});

// ── Leave, block, permission denied ─────────────────────────────────────────────────────────────────────────────────
await sql(`delete from public.connect_calls`); // the 24 h no-repeat rule would otherwise keep this pair apart
await check("either side can leave; the other side is told", async () => {
  await start(a.page, "voice"); await a.page.getByTestId("qm-waiting").waitFor({ timeout: 15000 });
  await start(b.page, "voice");
  await b.page.getByTestId("call-screen").waitFor({ timeout: 30000 });
  await b.page.getByTestId("call-link").filter({ hasText: "Connected" }).waitFor({ timeout: 45000 });
  await b.page.getByTestId("call-end").click();
  await b.page.getByTestId("after-call").waitFor({ timeout: 10000 });
  await a.page.getByTestId("after-call").waitFor({ timeout: 15000 });
  const [c] = await sql(`select end_reason, ended_by from public.connect_calls order by created_at desc limit 1`);
  return c.end_reason === "left" && c.ended_by === ADMIN ? null : JSON.stringify(c);
});
await check("an outsider (signed out) gets no ICE credentials", async () => {
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  const status = await p.evaluate(async (u) => (await fetch(u)).status, `${APP}/api/connect/ice`).catch(async () => { await p.goto(APP); return p.evaluate(async () => (await fetch("/api/connect/ice")).status); });
  await ctx.close();
  return status === 401 ? null : String(status);
});
await sql(`delete from public.connect_calls`);
await check("microphone denied → clear message; leaving ends the call, the partner is not left in a phantom call", async () => {
  await b.ctx.close();
  const denied = await member("demo.admin@example.test", { denyMedia: true });
  await start(a.page, "voice"); await a.page.getByTestId("qm-waiting").waitFor({ timeout: 15000 });
  await start(denied.page, "voice");
  await denied.page.getByTestId("call-mic-error").waitFor({ timeout: 30000 });
  await denied.page.getByRole("button", { name: "Leave this match" }).click();
  await denied.page.getByTestId("after-call").waitFor({ timeout: 10000 });
  const [c] = await sql(`select end_reason from public.connect_calls order by created_at desc limit 1`);
  if (c.end_reason !== "failed") return c.end_reason;
  // The waiting member either saw the short call end or never picked it up and kept searching. Never stuck in a call.
  await a.page.getByTestId("after-call").or(a.page.getByTestId("qm-waiting")).waitFor({ timeout: 15000 });
  await a.page.waitForTimeout(6000);
  if (await a.page.getByTestId("call-screen").isVisible()) return "partner stuck on a call screen";
  await denied.ctx.close();
});

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
