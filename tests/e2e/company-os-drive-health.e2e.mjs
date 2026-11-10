// Company OS Google Drive and Calendar write health, end to end against the LOCAL Google stand-in (not real Google):
// the founder connects Drive, and Integration health tests the real write path (decrypt, token, Drive call), names the
// exact failure for each broken case, and the write test creates, checks and deletes one file in a test folder only.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after it (needs its seeded people).
// Usage: node tests/e2e/company-os-drive-health.e2e.mjs [screenshot dir]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const OUT = process.argv[2] || "./os-e2e-shots";
mkdirSync(OUT, { recursive: true });
const OS = "http://os.localhost:3000";
const GW = "http://localhost:54399";
const DRIVE_CB = `${OS}/os/api/admin/drive/callback`, CAL_CB = `${OS}/os/api/calendar/callback`;
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` -> ${detail}` : ""}`); };
const sql = (q) => execFileSync("sudo", ["-u", "postgres", "psql", "-d", "os_e2e", "-tAqc", q], { encoding: "utf8" }).trim();
const mock = (modes) => fetch(`${GW}/__test/google-drive`, { method: "POST", body: JSON.stringify(modes) });
const mockFiles = async () => (await (await fetch(`${GW}/__test/google-drive-files`, { method: "POST", body: "{}" })).json()).files;

const browser = await chromium.launch();
async function signIn(google) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
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

// Start with no approved route (an earlier suite may have approved one): the folders row is tested against that.
sql(`delete from public.os_drive_connection; delete from public.os_calendar_connections; update public.os_folder_routes set status = 'proposed' where status = 'approved';`);
await mock({});
await fetch(`${GW}/__test/google-redirects`, { method: "POST", body: JSON.stringify({ uris: [DRIVE_CB, CAL_CB] }) });

const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
const { page } = founder;
const row = (label) => page.getByTestId("os-health").locator("li").filter({ hasText: label }).first();
const recheck = async () => { await page.getByRole("button", { name: "Check again" }).click(); await settle(page); };
const health = async () => { await page.goto(`${OS}/os/admin?tab=health`); await page.getByTestId("os-health").waitFor(); await settle(page); };

// ── 1. Connected and working ────────────────────────────────────────────────────────────────────────────
await health();
await page.getByTestId("os-drive-connect").click();
await page.waitForURL(/drive=connected/, { timeout: 15000 });
await page.getByTestId("os-health").waitFor(); await settle(page);
const w = await row("Google Drive: creating files").innerText();
check("a working connection says it renewed the token and made a Drive call", /Connected as drive\.writer@ielsco\.test/.test(w) && /Token renewal and a Drive call both succeeded/.test(w), w);
check("coming back from Google reports the live result, not just 'connected'", await page.getByText("Google Drive writing works for drive.writer@ielsco.test.").isVisible());
const folders = await row("approved destination folders").innerText();
check("approved folders are a separate row and not ready with no approved route", /No folder route is approved yet/.test(folders) && (await row("approved destination folders").getByLabel("Not working").count()) === 1, folders);
check("Drive is not called fully connected while a row is failing", !(await page.getByTestId("os-health").innerText()).includes("fully connected"));
const healthApi = await page.evaluate(async () => (await fetch("/os/api/admin/health")).json());
check("the health data says write works but Drive isn't ready", healthApi.drive.write_ok === true && healthApi.drive.ready === false, JSON.stringify(healthApi.drive));
check("health never shows tokens, secrets or the sealed value", !/e2e-google-refresh-SECRET|e2e-client-secret|e2e-google-access/.test(JSON.stringify(healthApi)) && !JSON.stringify(healthApi).includes(sql("select token_sealed from public.os_drive_connection").slice(0, 30)));
await page.screenshot({ path: `${OUT}/dh-01-working.png`, fullPage: true });

// ── 2. Each failure is named exactly ────────────────────────────────────────────────────────────────────
const writeRow = async () => { await recheck(); return row("Google Drive: creating files").innerText(); };
await mock({ mode: "api_disabled" });
let t = await writeRow();
check("Drive API switched off: names the code, Google's reason, the project and the fix", /api_disabled, accessNotConfigured, HTTP 403/.test(t) && /project 163195263995/.test(t) && /Enable/.test(t) && /Google's Drive API refused the call/.test(t), t);
check("…and says the sign-in itself worked", /The sign-in worked/.test(t));
check("…and the row is red and not 'Connected as'", !/Connected as/.test(t) && (await row("Google Drive: creating files").getByLabel("Not working").count()) === 1);
await page.screenshot({ path: `${OUT}/dh-02-api-disabled.png`, fullPage: true });
await mock({ mode: "invalid_grant" });
t = await writeRow();
check("revoked or expired token: invalid_grant, at the token stage", /invalid_grant, HTTP 400/.test(t) && /Google refused to renew the access token/.test(t) && /Connect again/.test(t), t);
await mock({ mode: "invalid_client" });
t = await writeRow();
check("wrong client ID or secret: invalid_client with the variables to check", /invalid_client, HTTP 401/.test(t) && /GOOGLE_CLIENT_ID/.test(t), t);
await mock({ mode: "scope" });
t = await writeRow();
check("missing permission: insufficient_scope", /insufficient_scope/.test(t) && /Connect again/.test(t), t);
await mock({ mode: "other_owner" });
await mock({});
const original = sql("select token_sealed from public.os_drive_connection");
sql(`update public.os_drive_connection set token_sealed = 'v1.AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAA'`);
t = await writeRow();
check("a token the server can't decrypt: cannot_decrypt, naming the sealing key", /Decrypting the saved token failed/.test(t) && /sealing key/.test(t), t);
sql(`update public.os_drive_connection set token_sealed = '${original}'`);
sql(`update public.os_drive_connection set google_email = 'someone.else@example.test'`);
t = await writeRow();
check("a token for another Google account than the recorded one is refused", /different Google account/.test(t) && !/Connected as/.test(t), t);
sql(`update public.os_drive_connection set google_email = 'drive.writer@ielsco.test'`);
t = await writeRow();
check("back to normal once the cause is gone", /Connected as drive\.writer@ielsco\.test/.test(t), t);

// ── 3. Calendar uses the same client, so it is checked the same way ─────────────────────────────────────
await page.goto(`${OS}/os/calendar`);
await page.getByTestId("os-cal-connect").click();
await page.waitForURL(/google=connected/, { timeout: 15000 });
await health();
const cal = await row("Google Calendar (your connection)").innerText();
check("the founder's own Calendar connection is checked end to end", /Connected as drive\.writer@ielsco\.test/.test(cal) && /Calendar call both succeeded/.test(cal), cal);
await mock({ calendar: "api_disabled" });
await recheck();
const cal2 = await row("Google Calendar (your connection)").innerText();
check("Calendar API switched off is named like Drive's", /api_disabled, accessNotConfigured, HTTP 403/.test(cal2) && /Calendar API is switched off in Google Cloud project 163195263995/.test(cal2), cal2);
await mock({});

// ── 4. The write test ───────────────────────────────────────────────────────────────────────────────────
const TEST_FOLDER = "TESTFOLDER000000000000000001", WORK_FOLDER = "WORKFOLDER000000000000000001", GROWTH = sql("select drive_folder_id from public.os_divisions where id = 'DIV-03'");
await mock({ folders: [{ id: TEST_FOLDER, name: "Company OS test sandbox" }, { id: WORK_FOLDER, name: "Working documents" }, { id: GROWTH, name: "Growth" }, { id: "TESTFOLDER000000000000000002", name: "Read-only test", canAdd: false }] });
await health();
const runTest = async (folder) => {
  await page.getByLabel("Test folder link or ID").fill(folder);
  await page.getByTestId("os-drive-test-run").click();
  await page.getByTestId("os-drive-test-result").waitFor({ timeout: 15000 });
  return page.getByTestId("os-drive-test-result").innerText();
};
let r = await runTest(GROWTH);
check("a division's folder is refused before anything is created", /division or document-route folder/.test(r) && (await mockFiles()).length === 0, r);
r = await runTest(WORK_FOLDER);
check("a folder whose name has no 'test' is refused", /must contain "test"/.test(r) && (await mockFiles()).length === 0, r);
r = await runTest("TESTFOLDER000000000000000002");
check("a folder the account can't add to is refused", /can't add files to it/.test(r) && (await mockFiles()).length === 0, r);
r = await runTest("NOSUCHFOLDER0000000000000001");
check("an unknown folder reports not_found", /not_found/.test(r) && (await mockFiles()).length === 0, r);
const api = (b) => page.evaluate(async (x) => { const q = await fetch("/os/api/admin/drive/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(x) }); return { status: q.status, body: await q.json().catch(() => ({})) }; }, b);
check("nonsense instead of a folder is refused", (await api({ folder: "hello" })).status === 400 && (await api({})).status === 400);
const audits = () => Number(sql("select count(*) from public.os_audit_log where action = 'drive.write_test' and (detail->>'verified')::boolean and detail->>'cleanup' = 'deleted'"));
const auditsBefore = audits();
r = await runTest(`https://drive.google.com/drive/folders/${TEST_FOLDER}?usp=sharing`);
check("in the test folder: created, owned by the connected account, read back and deleted", /Create a file\./.test(r) && /Owned by drive\.writer@ielsco\.test/.test(r) && /File can be read back\./.test(r) && /Deleted from Drive\./.test(r), r);
check("…the stand-in Drive is empty afterwards (only that file was removed)", (await mockFiles()).length === 0);
check("…its ID and URL are shown, and the run is audited", /File ID TESTFILE/.test(r) && audits() === auditsBefore + 1);
await page.screenshot({ path: `${OUT}/dh-03-write-test.png`, fullPage: true });
await mock({ mode: "other_owner", folders: [{ id: TEST_FOLDER, name: "Company OS test sandbox" }] });
r = await runTest(TEST_FOLDER);
check("a file owned by another account fails the test and is left for inspection", /different account than the connected one/.test(r) && /Left in place/.test(r) && (await mockFiles()).length === 1, r);
await mock({ mode: "api_disabled" });
r = await runTest(TEST_FOLDER);
check("with the API switched off the test stops at the token and Drive call, creating nothing", /api_disabled/.test(r) && !/Create a file/.test(r), r);
await mock({});

// ── 5. Only founders ────────────────────────────────────────────────────────────────────────────────────
const member = await signIn({ email: "req.growth@ielsco.test" });
const asMember = (path, init) => member.page.evaluate(async ([p, i]) => { const r = await fetch(p, i); return r.status; }, [path, init]);
check("a member can't read health or run the write test", (await asMember("/os/api/admin/health")) === 403 && (await asMember("/os/api/admin/drive/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ folder: TEST_FOLDER }) })) === 403);
const outStatus = await new Promise((resolve, reject) => {
  const r = http.request({ host: "127.0.0.1", port: 3000, path: "/os/api/admin/drive/test", method: "POST", headers: { host: "os.localhost:3000", origin: OS, "content-type": "application/json", "user-agent": "Mozilla/5.0 e2e" } }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode)); });
  r.on("error", reject); r.end("{}");
});
check("a signed-out caller can't run it", outStatus === 401 || outStatus === 403, `status ${outStatus}`);
check("no test file was created by the refused calls", (await mockFiles()).length === 0);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
