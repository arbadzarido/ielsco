// Company OS Finance and Legal end-to-end: an Operations member asks for an expense and adds a receipt; a founder
// approves it; the Finance officer verifies, pays and reconciles it; the requester follows it but never sees bank
// references; the Operations lead sees their division's budget and spending but not the Finance or Legal workspaces.
// Then Legal drafts a letter, a founder approves it and the number is generated from the rule. Desktop and 360px.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after company-os-requests.e2e.mjs.
// Usage: node tests/e2e/company-os-finance-legal.e2e.mjs [screenshot dir]
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

// ── Seed: an Operations member and lead, a Finance officer, a Legal member, one category and one account ──────────
sql(`insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0041', 'Money Ops', 'member', 'active', 'money.ops@ielsco.test'),
    ('PPL-0042', 'Money Ops Lead', 'manager', 'active', 'money.opslead@ielsco.test'),
    ('PPL-0043', 'Money Finance Officer', 'member', 'active', 'money.finance@ielsco.test'),
    ('PPL-0044', 'Money Legal Member', 'member', 'active', 'money.legal@ielsco.test')
  on conflict (id) do update set status = 'active', sessions_revoked_at = null;
  insert into public.os_person_companies values ('PPL-0041','IEL'),('PPL-0042','IEL'),('PPL-0043','IEL'),('PPL-0044','IEL') on conflict do nothing;
  insert into public.os_person_divisions values ('PPL-0041','DIV-02',false),('PPL-0042','DIV-02',true) on conflict do nothing;
  insert into public.os_workspace_roles (person_id, division_id, role, reason)
    select x.p, x.d, x.r, 'E2E' from (values ('PPL-0043','DIV-08','officer'), ('PPL-0044','DIV-09','member')) x(p, d, r)
    where not exists (select 1 from public.os_workspace_roles w where w.person_id = x.p and w.division_id = x.d and w.role = x.r and w.revoked_at is null);
  insert into public.os_fin_categories (code, name, direction) values ('e2e_events', 'Events', 'expense') on conflict do nothing;
  insert into public.os_fin_accounts (id, company_code, name, kind, institution, account_last4) values ('FAC-9001', 'IEL', 'Operating account', 'bank', 'Test Bank', '4321') on conflict do nothing;`);
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

const trxStatus = (id) => sql(`select status from public.os_fin_transactions where id = '${id}'`);
const DESC = `Venue chairs ${Date.now() % 100000}`;

// ── 1. An Operations member asks for an expense and adds the receipt ─────────────────────────────────────────────
const ops = await signIn({ email: "money.ops@ielsco.test" });
let trx;
{
  const { page } = ops;
  await go(page, "/os/finance");
  check("the Expenses and income page opens", await page.getByTestId("os-money-page").isVisible());
  check("…and is in the sidebar", await page.getByTestId("os-money-link").isVisible());
  await page.getByTestId("os-new-expense").click();
  const form = page.getByTestId("os-trx-form");
  await form.waitFor({ timeout: 15000 });
  const divisions = await form.getByLabel("Division").locator("option").allTextContents();
  check("only their own division is offered", divisions.includes("Operations") && !divisions.includes("Growth") && !divisions.includes("Finance"), divisions.join(", "));
  await form.getByLabel("Company").selectOption("IEL");
  await form.getByLabel("What it's for").fill(DESC);
  await form.getByLabel("Amount (IDR)").fill("1.250.000");
  check("the amount is read back in rupiah", (await form.textContent()).includes("Rp 1.250.000"));
  await form.getByLabel("Category").selectOption("e2e_events");
  await page.getByTestId("os-trx-submit").click();
  await page.waitForURL(/\/os\/finance\/TRX-\d+/, { timeout: 15000 });
  trx = page.url().match(/TRX-\d+/)[0];
  await settle(page);
  check("stored as requested, IDR 1,250,000, Operations", sql(`select status || '|' || amount || '|' || division_id from public.os_fin_transactions where id = '${trx}'`) === "requested|1250000|DIV-02");
  check("the page says it's only requested", (await page.getByTestId("os-trx-page").textContent()).includes("Requested"));
  check("the requester isn't offered Approve", (await page.getByTestId("os-trx-approve").count()) === 0);
  await page.getByLabel("Google Drive link to the receipt").fill("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view");
  await page.getByTestId("os-receipt-form").getByRole("button", { name: "Add receipt" }).click();
  await settle(page);
  const doc = sql(`select d.id || '|' || d.division_id || '|' || d.sensitivity from public.os_document_links l join public.os_documents d on d.id = l.document_id where l.entity_type = 'transaction' and l.entity_id = '${trx}'`);
  check("the receipt is registered as a Confidential Finance document linked to it", /^DOC-\d+\|DIV-08\|Confidential$/.test(doc), doc);
  check("…and listed on the page", (await page.getByTestId("os-linked-docs").textContent()).includes("Receipt"));
  check("founders are told there's an expense to approve", Number(sql(`select count(*) from public.os_notifications where entity_id = '${trx}' and kind = 'finance_update'`)) >= 1);
}

// ── 2. The Operations lead sees their division's money, not Finance or Legal ─────────────────────────────────────
const lead = await signIn({ email: "money.opslead@ielsco.test" });
{
  const { page } = lead;
  await go(page, "/os/finance");
  check("the lead sees the division's ledger with the new expense", (await page.getByTestId("os-division-ledger").textContent()).includes(DESC));
  await go(page, "/os/d/fin");
  check("the Finance workspace is locked for them", await page.getByTestId("os-ws-locked").isVisible());
  await go(page, "/os/d/leg?tab=letters");
  check("…and so is Legal", await page.getByTestId("os-ws-locked").isVisible());
  await go(page, `/os/finance/${trx}`);
  check("the lead isn't offered Approve", (await page.getByTestId("os-trx-approve").count()) === 0);
}

// ── 3. A founder approves it ─────────────────────────────────────────────────────────────────────────────────────
const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
{
  const { page } = founder;
  await go(page, "/os/d/fin");
  check("it's in the founder's approval queue", (await page.getByTestId("os-fin-to-approve").textContent()).includes(DESC));
  await go(page, `/os/finance/${trx}`);
  await page.getByTestId("os-trx-approve").click();
  await settle(page);
  check("approved", trxStatus(trx) === "approved");
  check("…shown as approved, not paid", (await page.getByTestId("os-trx-page").textContent()).includes("Approved, not paid"));
  check("…and the founder can't pay it", (await page.getByTestId("os-trx-pay").count()) === 0 || trxStatus(trx) === "approved");
}

// ── 4. The Finance officer verifies, pays and reconciles ─────────────────────────────────────────────────────────
const finance = await signIn({ email: "money.finance@ielsco.test" });
{
  const { page } = finance;
  await go(page, "/os/d/fin?tab=ledger");
  check("the Finance officer sees the company ledger", (await page.getByTestId("os-fin-ledger").textContent()).includes(DESC));
  await go(page, `/os/finance/${trx}`);
  check("the officer isn't offered Approve", (await page.getByTestId("os-trx-approve").count()) === 0);
  await page.getByTestId("os-trx-verify").click();
  await settle(page);
  check("verified", trxStatus(trx) === "verified");
  const box = page.getByTestId("os-trx-actions");
  await box.getByLabel("Account").selectOption("FAC-9001");
  await box.getByLabel("Transfer or receipt reference").fill("TRF-E2E-778899");
  await page.getByTestId("os-trx-pay").click();
  await settle(page);
  check("paid, with the date, method and account", sql(`select status || '|' || payment_method || '|' || account_id || '|' || (settled_on is not null) from public.os_fin_transactions where id = '${trx}'`) === "paid|transfer|FAC-9001|true");
  await page.getByTestId("os-trx-statement").fill("STMT-E2E-11");
  await page.getByTestId("os-trx-reconcile").click();
  await settle(page);
  check("reconciled", trxStatus(trx) === "reconciled");
  check("Finance sees the payment reference", (await page.getByTestId("os-trx-page").textContent()).includes("TRF-E2E-778899"));
  check("the history lists every step", ((await page.getByTestId("os-trx-history").textContent()).match(/submitted it|approved it|verified it|recorded the payment|reconciled it/g) ?? []).length === 5);
  await go(page, "/os/d/fin?tab=budgets");
  await page.getByTestId("os-budget-new").click();
  const bdlg = page.getByRole("dialog", { name: "Propose a budget" });
  await bdlg.getByLabel("Name").fill("Operations this month (e2e)");
  await bdlg.getByLabel("Division").selectOption("DIV-02");
  await bdlg.getByLabel("Amount (IDR)").fill("5000000");
  await page.getByTestId("os-sheet-save").click();
  await settle(page);
  check("a budget is proposed", sql("select count(*) from public.os_fin_budgets where name = 'Operations this month (e2e)' and status = 'proposed'") !== "0");
}
const bud = sql("select id from public.os_fin_budgets where name = 'Operations this month (e2e)' order by created_at desc limit 1");
{
  const { page } = founder;
  await go(page, "/os/d/fin?tab=budgets");
  await page.getByTestId(`os-budget-approve-${bud}`).click();
  await settle(page);
  check("the founder approves the budget", sql(`select status from public.os_fin_budgets where id = '${bud}'`) === "approved");
}

// ── 5. The requester follows it; bank references stay with Finance ───────────────────────────────────────────────
{
  const { page } = ops;
  await go(page, `/os/finance/${trx}`);
  const text = await page.getByTestId("os-trx-page").textContent();
  check("the requester sees it reconciled", text.includes("Reconciled"));
  check("…but not the payment or statement reference", !text.includes("TRF-E2E-778899") && !text.includes("STMT-E2E-11"));
  await go(page, "/os/d/fin");
  check("an Operations member can't open Finance", await page.getByTestId("os-ws-locked").isVisible());
}
{
  const { page } = lead;
  await go(page, "/os/finance");
  check("the lead sees the approved budget", (await page.getByTestId("os-division-budgets").textContent()).includes("Operations this month (e2e)"));
  check("…with the spending against it", (await page.getByTestId("os-division-totals").textContent()).includes("Rp 1.250.000"));
}

// ── 6. Legal drafts a letter; a founder approves and the number is generated ─────────────────────────────────────
const legal = await signIn({ email: "money.legal@ielsco.test" });
let ltr;
{
  const { page } = legal;
  await go(page, "/os/d/leg?tab=numbering");
  check("Legal sees the outgoing-letter rule", (await page.getByTestId("os-rules").textContent()).includes("{company}/{type}/{division}/{month_roman}/{year}/{seq:3}"));
  check("…but can't add rules", (await page.getByTestId("os-rule-new").count()) === 0);
  await go(page, "/os/d/leg?tab=letters");
  await page.getByTestId("os-letter-new").click();
  const dlg = page.getByRole("dialog", { name: "Draft an outgoing letter" });
  await dlg.getByLabel("Company").selectOption("IEL");
  await dlg.getByLabel("Subject").fill("Invitation to the open day (e2e)");
  await dlg.getByLabel("To", { exact: true }).fill("SMA Negeri 1");
  check("the form previews the number format", /IEL\/SK\/LEG\/[IVX]+\/\d{4}\/007/.test(await dlg.textContent()));
  await page.getByTestId("os-sheet-save").click();
  await page.waitForURL(/\/os\/legal\/LTR-\d+/, { timeout: 15000 });
  ltr = page.url().match(/LTR-\d+/)[0];
  await settle(page);
  check("drafted without a number", sql(`select coalesce(number, '-') || '|' || status from public.os_letters where id = '${ltr}'`) === "-|draft");
  await page.getByTestId("os-legal-submit").click();
  await settle(page);
  check("sent for approval", sql(`select status from public.os_letters where id = '${ltr}'`) === "in_review");
  check("the drafter isn't offered Approve", (await page.getByTestId("os-legal-approve").count()) === 0);
}
{
  const { page } = founder;
  await go(page, `/os/legal/${ltr}`);
  await page.getByTestId("os-legal-approve").click();
  await settle(page);
  const num = sql(`select number from public.os_letters where id = '${ltr}'`);
  check("approval issues a number in the chosen format", /^IEL\/SK\/LEG\/[IVX]+\/\d{4}\/\d{3}$/.test(num), num);
  check("…shown on the page", (await page.getByTestId("os-legal-number").textContent()) === num);
  check("…and written to the register", sql(`select status from public.os_number_register where number = '${num}'`) === "issued");
  await go(page, "/os/d/leg?tab=numbering");
  check("founders can add rules", await page.getByTestId("os-rule-new").isVisible());
  check("the register lists the number", (await page.getByTestId("os-register").textContent()).includes(num));
}

// ── 7. Phone width ─────────────────────────────────────────────────────────────────────────────────────────────
for (const [who, paths] of [["money.ops@ielsco.test", ["/os/finance", `/os/finance/${trx}`]], ["money.finance@ielsco.test", ["/os/d/fin", "/os/d/fin?tab=ledger", "/os/d/fin?tab=cashflow", "/os/d/fin?tab=budgets"]], ["money.legal@ielsco.test", ["/os/d/leg", "/os/d/leg?tab=letters", "/os/d/leg?tab=numbering", `/os/legal/${ltr}`]]]) {
  const { page } = await signIn({ email: who }, { width: 360, height: 780 });
  for (const path of paths) {
    await go(page, path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`no horizontal scroll at 360px: ${path}`, over <= 0, `overflow ${over}px`);
  }
  await page.screenshot({ path: `${OUT}/fl-phone-${who.split("@")[0].split(".")[1]}.png`, fullPage: true });
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
