// Company OS division workspaces end-to-end: a restricted Finance workspace hidden from a manager, an access request
// approved by a founder, a workspace role given and revoked, the workspace sidebar, and phone width.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md). Usage:
//   node tests/e2e/company-os-workspaces.e2e.mjs [screenshot dir]
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

// ── Seed: a Growth manager, an Operations member, and one Finance document ──────────────────────────────────────────
sql(`delete from public.os_access_requests where requester_person_id in ('PPL-0021','PPL-0022');
  update public.os_workspace_roles set revoked_at = now() where person_id in ('PPL-0021','PPL-0022') and revoked_at is null;
  update public.os_grants set revoked_at = now() where person_id in ('PPL-0021','PPL-0022') and revoked_at is null;
  insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0021', 'Workspace Manager', 'manager', 'active', 'ws.manager@ielsco.test'),
    ('PPL-0022', 'Workspace Member', 'member', 'active', 'ws.member@ielsco.test')
  on conflict (id) do update set status = 'active', sessions_revoked_at = null;
  insert into public.os_person_companies values ('PPL-0021','IEL'),('PPL-0022','IEL') on conflict do nothing;
  insert into public.os_person_divisions values ('PPL-0021','DIV-03',true),('PPL-0022','DIV-02',false) on conflict do nothing;
  insert into public.os_documents (id, title, company_code, division_id, doc_type, sensitivity, status, owner_person_id)
    values ('DOC-9901', 'Finance budget register 2026', 'IEL', 'DIV-08', 'FIN', 'Internal', 'Draft', (select id from public.os_people where org_role = 'founder' order by id limit 1))
    on conflict (id) do nothing;
  delete from public.os_notifications where person_id in ('PPL-0021','PPL-0022');`);
const founderId = sql("select id from public.os_people where org_role = 'founder' and status = 'active' order by id limit 1");

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

// ── 1. A Growth manager can't see Finance ─────────────────────────────────────────────────────────────────────────
const manager = await signIn({ email: "ws.manager@ielsco.test" });
{
  const { page } = manager;
  await go(page, "/os");
  const divs = page.getByTestId("os-divisions");
  await divs.waitFor({ timeout: 15000 });
  check("manager's sidebar lists Growth", await divs.getByTestId("os-division-gro").count() === 1);
  check("manager's sidebar does not list Finance or Legal", await divs.getByTestId("os-division-fin").count() === 0 && await divs.getByTestId("os-division-leg").count() === 0);
  await go(page, "/os/d/fin");
  check("Finance workspace is locked for a manager", await page.getByTestId("os-ws-locked").isVisible());
  check("no Finance record leaks onto the locked page", !(await page.content()).includes("Finance budget register"));
  check("no workspace sidebar for a locked workspace", await page.getByTestId("os-ws-nav-documents").count() === 0);
  await go(page, "/os/documents/DOC-9901");
  check("Finance document is not found for a manager", await page.getByText("Document not found").isVisible() && !(await page.content()).includes("Finance budget register"));
  await go(page, "/os/documents");
  check("Finance document is absent from the documents hub", !(await page.content()).includes("Finance budget register"));
  // Growth workspace: own sidebar with the division's module
  await go(page, "/os/d/gro");
  check("Growth workspace opens for its manager", await page.getByTestId("os-ws-page").isVisible());
  check("Growth sidebar has Campaigns", await page.getByTestId("os-ws-nav").getByText("Campaigns").count() === 1);
  check("workspace sidebar links back to Company OS", await page.getByTestId("os-ws-back").isVisible());
  await page.screenshot({ path: `${OUT}/ws-growth-desktop.png` });

  // Ask for Finance access
  await go(page, "/os/d/fin");
  const form = page.getByTestId("os-access-form");
  await form.getByLabel("Why you need it").fill("Preparing the Q1 campaign budget with Finance.");
  await form.getByRole("button", { name: "Send request" }).click();
  await page.getByTestId("os-access-sent").waitFor({ timeout: 10000 });
  const acr = sql("select id || '|' || status || '|' || level from public.os_access_requests where requester_person_id = 'PPL-0021' and resource_id = 'DIV-08'");
  check("access request recorded as pending", /^ACR-\d+\|pending\|view$/.test(acr), acr);
  check("founder notified of the request", Number(sql(`select count(*) from public.os_notifications where person_id = '${founderId}' and kind = 'access_requested'`)) >= 1);
  check("manager still has no Finance access while pending", sql("select count(*) from public.os_grants where person_id = 'PPL-0021' and resource_id = 'DIV-08' and revoked_at is null") === "0");
}
const acrId = sql("select id from public.os_access_requests where requester_person_id = 'PPL-0021' and resource_id = 'DIV-08' and status = 'pending'");

// ── 2. The founder approves it and gives a Finance role ──────────────────────────────────────────────────────────
const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
{
  const { page } = founder;
  await go(page, `/os/access?focus=${acrId}`);
  const row = page.getByTestId(`os-acr-${acrId}`);
  await row.waitFor({ timeout: 15000 });
  check("founder sees the request to decide", await row.isVisible());
  await row.getByLabel(`Note for ${acrId}`).fill("For the Q1 budget only.");
  await page.getByTestId(`os-acr-approve-${acrId}`).click();
  await settle(page);
  const g = sql(`select r.status || '|' || (g.expires_at is not null)::text || '|' || (g.expires_at <= now() + interval '90 days')::text from public.os_access_requests r join public.os_grants g on g.id = r.grant_id where r.id = '${acrId}'`);
  check("approval writes an expiring grant", g === "approved|true|true", g);
  check("requester notified of the decision", sql("select count(*) from public.os_notifications where person_id = 'PPL-0021' and kind = 'access_decided'") === "1");

  await go(page, "/os/d/fin?tab=access");
  const give = page.getByTestId("os-ws-give-role");
  await give.waitFor({ timeout: 15000 });
  check("founder may give Approver in Finance", await give.getByLabel("Role").locator("option", { hasText: "Approver" }).count() === 1);
  check("Signatory is not offered in Finance", await give.getByLabel("Role").locator("option", { hasText: "Signatory" }).count() === 0);
  await give.getByLabel("Person").selectOption("PPL-0022");
  await give.getByLabel("Role").selectOption("officer");
  await give.getByLabel("Reason").fill("Handles receipts for Operations.");
  await give.getByRole("button", { name: "Give role" }).click();
  await settle(page);
  check("role row written", sql("select count(*) from public.os_workspace_roles where person_id = 'PPL-0022' and division_id = 'DIV-08' and role = 'officer' and revoked_at is null") === "1");
  check("role shows in the list", (await page.getByTestId("os-ws-roles").textContent()).includes("Workspace Member"));
  check("grant shows under temporary access", (await page.getByTestId("os-ws-grants").textContent()).includes("Workspace Manager"));
}

// ── 3. The member now has the Finance workspace, with its own sidebar ─────────────────────────────────────────────
const member = await signIn({ email: "ws.member@ielsco.test" });
{
  const { page } = member;
  await go(page, "/os/d/fin");
  check("Finance opens for the officer", await page.getByTestId("os-ws-page").isVisible());
  const nav = page.getByTestId("os-ws-nav");
  check("restricted sidebar: Overview, Documents, Members and access only",
    await nav.getByText("Documents").count() === 1 && await nav.getByText("Projects").count() === 0 && await nav.getByText("Tasks").count() === 0);
  check("member's division list now includes Finance", await page.getByTestId("os-division-fin").count() === 1);
  await go(page, "/os/d/fin?tab=documents");
  check("officer sees the Finance document", (await page.getByTestId("os-ws-documents").textContent()).includes("Finance budget register"));
  check("an officer cannot give roles", await page.goto(`${OS}/os/d/fin?tab=access`).then(() => settle(page)).then(() => page.getByTestId("os-ws-give-role").count()) === 0);
}
// The manager's approved grant opens Finance for viewing.
{
  const { page } = manager;
  await go(page, "/os/d/fin?tab=documents");
  check("manager with an approved grant sees Finance documents", (await page.getByTestId("os-ws-documents").textContent()).includes("Finance budget register"));
}

// ── 4. Revoking the role closes the workspace again ──────────────────────────────────────────────────────────────
{
  const { page } = founder;
  await go(page, "/os/d/fin?tab=access");
  const li = page.getByTestId("os-ws-roles").locator("li", { hasText: "Workspace Member" });
  await li.getByRole("button", { name: "Revoke" }).click();
  await settle(page);
  check("role revoked, not deleted", Number(sql("select count(*) from public.os_workspace_roles where person_id = 'PPL-0022' and division_id = 'DIV-08' and revoked_at is not null")) >= 1);
  check("revocation audited", Number(sql("select count(*) from public.os_audit_log where action = 'os_workspace_roles.update'")) >= 1);
}
{
  const { page } = member;
  await go(page, "/os/documents/DOC-9901");
  check("after revocation the document is gone again", await page.getByText("Document not found").isVisible());
}

// ── 5. Phone width ─────────────────────────────────────────────────────────────────────────────────────────────
const phone = await signIn({ email: "ws.member@ielsco.test" }, { width: 360, height: 780 });
{
  const { page } = phone;
  await go(page, "/os/d/ops");
  check("Operations workspace opens on a phone", await page.getByTestId("os-ws-page").isVisible());
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no horizontal scroll at 360px", over <= 0, `overflow ${over}px`);
  await page.screenshot({ path: `${OUT}/ws-ops-phone.png`, fullPage: true });
  await go(page, "/os/d/fin");
  const over2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("locked workspace fits at 360px", over2 <= 0, `overflow ${over2}px`);
  await page.screenshot({ path: `${OUT}/ws-locked-phone.png`, fullPage: true });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
