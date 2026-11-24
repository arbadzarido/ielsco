// End-to-end scenarios (run by tests/e2e/run.mjs). Fictional people, example.test emails, sandbox fake Midtrans only.
import { chromium } from "playwright";
import pg from "pg";
import crypto from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { signSsoToken, signWorkspaceRequest } from "../../src/lib/ielsco-bridge.ts";

const here = dirname(fileURLToPath(import.meta.url));
const results = [];
let lastPage = null;
function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  — ${detail}` : ""}`);
}

export async function run({ base, mt, env, db: dbc }) {
  const db = new pg.Client(dbc);
  await db.connect();
  const one = async (sql, p = []) => (await db.query(sql, p)).rows[0];
  const all = async (sql, p = []) => (await db.query(sql, p)).rows;
  const browser = await chromium.launch();
  const shots = join(here, "..", "..", "test-results");
  mkdirSync(shots, { recursive: true });

  async function newPage(viewport = { width: 1280, height: 900 }) {
    const ctx = await browser.newContext({ viewport, baseURL: base });
    await ctx.addInitScript(() => { try { localStorage.setItem("gif_analytics_consent", "yes"); } catch {} });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30_000);
    lastPage = page;
    return page;
  }
  async function login(page, email, next = "/portal") {
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    // With IELSco single sign-on on, the email code is the fallback inside "Other ways to sign in".
    const fallback = page.getByText("Other ways to sign in (email code)");
    if (await fallback.isVisible().catch(() => false)) await fallback.click();
    await page.getByLabel("Email address").fill(email);
    const before = await one("select count(*)::int as n from gif.email_outbox where to_email = $1 and template = 'login_code'", [email]);
    await page.getByRole("button", { name: "Email me a code" }).click();
    await page.getByLabel("Sign-in code").waitFor();
    let row = null;
    for (let i = 0; i < 80 && !row; i++) {
      const n = await one("select count(*)::int as n from gif.email_outbox where to_email = $1 and template = 'login_code'", [email]);
      if (n.n > before.n) row = await one("select subject from gif.email_outbox where to_email = $1 and template = 'login_code' order by created_at desc limit 1", [email]);
      else await new Promise((r) => setTimeout(r, 250));
    }
    await page.getByLabel("Sign-in code").fill(row.subject.slice(0, 6));
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }
  async function person(scope, p, { lockedEmail = false } = {}) {
    await scope.getByLabel("Full legal name (as on passport)").fill(p.name);
    if (!lockedEmail) await scope.getByLabel("Email", { exact: true }).fill(p.email);
    await scope.getByLabel("WhatsApp number").fill(p.wa);
    await scope.getByLabel("Date of birth").fill(p.dob);
    await scope.getByLabel("Nationality (citizenship)").selectOption(p.nat);
    await scope.getByLabel("Country of residence").selectOption(p.nat);
    await scope.getByLabel("School or university").fill(p.inst);
    await scope.getByLabel("Education level").selectOption(p.level);
    await scope.getByLabel("Major, stream or field of study").fill("Environmental science");
    await scope.getByLabel("Country of study").selectOption(p.nat);
    await scope.getByLabel("Name", { exact: true }).fill("Parent of " + p.name);
    await scope.getByLabel("Relationship", { exact: true }).first().fill("Parent");
    await scope.getByLabel("Phone (with country code)", { exact: true }).fill("+62 812 0000 0001");
  }
  async function apply(page, { pathway, team, leader, members = [], selfFunded = false, keepGuardian = false }) {
    await page.goto(`/apply?pathway=${pathway}`);
    await page.getByRole("heading", { level: 2 }).waitFor();
    for (let i = 0; i < 5 && !(await page.getByRole("heading", { name: "Pathway", exact: true }).isVisible()); i++) {
      await page.getByRole("button", { name: "Back" }).click();
      await page.waitForTimeout(700);
    }
    if (team) {
      await page.getByText("Team of 2–3").click();
      await page.getByLabel("Team name").fill(team);
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await person(page, leader, { lockedEmail: true });
    await page.getByRole("button", { name: "Continue" }).click();
    if (team) {
      for (let i = 0; i < members.length; i++) {
        if (i > 0) await page.getByRole("button", { name: "Add a team member" }).click();
        await person(page.locator("fieldset", { hasText: `Member ${i + 2}` }).first(), members[i]);
      }
    }
    await page.getByRole("button", { name: "Continue" }).click();
    if (!selfFunded) {
      await page.getByLabel("Project working title").fill("Clean Rivers Network");
      await page.getByLabel("Your project idea").fill("Plastic waste in our river harms fishing families downstream. We will map waste hotspots with students, run collection points with local schools and turn sorted plastic into income for youth groups.");
    }
    await page.getByLabel("Why do you want to join GIF?").fill("I want to learn how to turn a local environmental project into something that lasts, and meet peers across Southeast Asia.");
    await page.getByLabel("How did you hear about GIF?").selectOption("Instagram");
    await page.screenshot({ path: join(shots, "before-review.png"), fullPage: true });
    await page.getByRole("button", { name: "Continue" }).click({ timeout: 10_000 });
    await page.getByRole("heading", { name: "Review and submit" }).waitFor();
    await page.waitForTimeout(300);
    for (const cb of await page.locator("fieldset", { hasText: "Please read and accept" }).getByRole("checkbox").all()) {
      for (let i = 0; i < 3 && !(await cb.isChecked()); i++) { await cb.click(); await page.waitForTimeout(150); }
    }
    await page.getByText("IELSco may use photos and video of me").click();
    await page.getByRole("button", { name: "Submit application" }).click();
    const ok = await page.waitForURL(/\/portal\?submitted=/, { timeout: 30_000 }).then(() => true).catch(() => false);
    if (!ok) {
      await page.screenshot({ path: join(shots, "submit-error.png"), fullPage: true });
      throw new Error(`submit failed on "${await page.locator("h2").first().innerText()}": ${(await page.locator(".notice.err, .error").allInnerTexts()).join(" / ")}`);
    }
  }
  const appOf = (email) => one("select a.* from gif.applications a join gif.accounts c on c.id = a.owner_account_id where c.email = $1 and a.status <> 'withdrawn'", [email]);
  const obligation = (email, kind) => one("select o.* from gif.obligations o join gif.participants p on p.id = o.participant_id where p.email = $1 and o.kind = $2 and o.status <> 'cancelled'", [email, kind]);
  // The portal opens Midtrans Snap as a popup (the fake's Snap JS shows #fake-snap with the order id in data-order).
  const snapOrder = async (page) => { const el = page.locator("#fake-snap"); await el.waitFor(); return el.getAttribute("data-order"); };
  async function payOnline(page, rowText, outcome = "settlement") {
    await page.goto("/portal/payments");
    const row = page.locator("tr", { hasText: rowText }).first();
    await row.getByRole("button", { name: /Pay online|Continue payment|Choose a payment method/ }).click();
    const order = await snapOrder(page);
    await page.locator(`#pay-${outcome}`).click();
    if (outcome === "settlement" || outcome === "pending") await page.waitForURL((u) => u.pathname === "/portal/payments/return" && u.searchParams.get("order_id") === order);
    else await page.getByTestId("attempt-choose").waitFor();
    return order;
  }
  const setDates = async (patch) => {
    const r = await one("select settings from gif.cohorts where is_current");
    const s = r.settings ?? {};
    s.dates = { ...(s.dates ?? {}), ...patch };
    await db.query("update gif.cohorts set settings = $1 where is_current", [JSON.stringify(s)]);
  };
  const waitDb = async (fn, ms = 20_000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
  const iso = (deltaMs) => new Date(Date.now() + deltaMs).toISOString();

  try {
    // ── Public site ─────────────────────────────────────────────────────────────────────────────────────────────────
    {
      const page = await newPage();
      for (const p of ["/", "/about", "/program", "/opportunities", "/fully-funded", "/mentoring", "/self-funded", "/selection-process", "/sponsorship", "/previous-gif", "/faq", "/application-status", "/terms-and-conditions", "/refund-policy", "/privacy-policy"]) {
        const r = await page.goto(p);
        check(`public page ${p} renders`, r.status() === 200, String(r.status()));
      }
      await page.goto("/");
      const text = await page.locator("body").innerText();
      check("home shows Apply Now + See the competition", text.includes("Apply Now") && text.includes("See the competition"));
      check("home leads with the Self-Funded campaign: 20 Super Early Bird + 50 Regular places, live counts", text.includes("Super Early Bird") && /20 of 20 places left/.test(text) && /50 of 50 places left/.test(text));
      check("home shows the USD 5,000 TOTAL prize pool, Top 10 and four award levels", text.includes("USD 5,000") && /total prize pool/i.test(text) && text.includes("Grand Award") && text.includes("Bronze Award") && text.includes("Top 10"));
      check("home: the Grand Finale in Bangkok on 2 August 2027 (Day 7)", text.includes("2 August 2027") && text.includes("Bangkok") && /Day 7/i.test(text));
      check("home: no Fully Funded or Mentoring promotion", !/Fully Funded|Project Mentoring|Join mentoring/.test(text));
      check("nav: no Selection, Mentorship or Opportunities links", (await page.locator("header nav a", { hasText: /Selection|Mentorship|Opportunities/ }).count()) === 0);
      check("/opportunities sends visitors to Self-Funded during the campaign", (await (await newPage()).goto("/opportunities")).url().endsWith("/self-funded"));
      check("hidden pathway pages still work but are noindex", (await (async () => { const pg = await newPage(); await pg.goto("/fully-funded"); return pg.locator("meta[name=robots]").getAttribute("content"); })())?.includes("noindex"));
      check("home marks universities as planned", text.includes("Planned engagement") && !/Confirmed partner/i.test(text));
      check("home: mentor section hidden with the Mentoring pathway, no invented names", !text.includes("Mentor profile coming soon") && !/Mentor:/.test(text));
      check("home has no fabricated testimonials", text.includes("Delegate stories from GIF 2026 will appear here"));
      const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join(" "));
      check("no yellow in CSS palette", !css.toLowerCase().includes("f9e15b") && !css.includes("rgb(249, 225, 91)"));
      check("new GIF palette: sky #5BC2E7 and the #3E9396 → #102129 gradient; no amber, nightfall or maroon", /91, 194, 231|5bc2e7/i.test(css) && /62, 147, 150|3e9396/i.test(css) && /16, 33, 41|102129/i.test(css) && !/b8862e|184, 134, 46|e0b865|224, 184, 101|914d4d|145, 77, 77/i.test(css));
      await page.getByRole("radio", { name: "Indonesian participants (IDR)" }).first().check();
      check("currency toggle shows IDR prices: IDR 13,000,000 Super Early Bird, IDR 17,000,000 Regular", ((t) => t.includes("IDR 13,000,000") && t.includes("IDR 17,000,000"))(await page.locator("body").innerText()));
      await page.getByRole("radio", { name: "International participants (USD)" }).first().check();
      const usdText = await page.locator("body").innerText();
      check("international prices shown: USD 799 Super Early Bird / USD 999 Regular", usdText.includes("USD 799") && usdText.includes("USD 999"));
      check("no old prices anywhere on home", !["USD 899", "IDR 14,999,000", "IDR 13,999,000", "USD 900", "USD 800", "USD 1,000", "IDR 15,000,000", "IDR 99,000"].some((x) => usdText.includes(x) || text.includes(x)));
      check("home never promises prize money to every delegate", /does not guarantee a place in the Top 10 or any prize/i.test(text));
      // Sponsorship form
      await page.goto("/sponsorship");
      // Wait for hydration: typing into the server-rendered form before React attaches gets the fields reset (flaky).
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Full name").fill("Sari Wulandari");
      await page.getByLabel("Email", { exact: true }).fill("sponsor.seeker@example.test");
      await page.getByLabel("WhatsApp (with country code)").fill("+62 811 2222 3333");
      await page.getByLabel("School or university").fill("SMA Example");
      await page.getByLabel("Country", { exact: true }).selectOption("ID");
      await page.getByLabel("Sponsor you plan to approach").selectOption("Company (CSR)");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Request documentation support" }).click();
      await page.getByText("We have received your request").waitFor();
      check("sponsorship request stored + confirmation email", !!(await one("select 1 from gif.sponsorship_requests where email = 'sponsor.seeker@example.test'")) && !!(await one("select 1 from gif.email_outbox where to_email = 'sponsor.seeker@example.test' and template = 'sponsorship_received'")));
      await page.context().close();
    }

    // ── A. Individual Fully Funded with Elco Pro (Indonesian) ───────────────────────────────────────────────────────
    const A = { name: "Ayu Lestari", email: "ayu@example.test", wa: "+62 812 1111 2222", dob: "2007-03-14", nat: "ID", inst: "SMA Negeri Example", level: "high_school" };
    {
      const page = await newPage();
      await login(page, A.email, "/apply?pathway=fully_funded");
      check("login with emailed code", page.url().includes("/apply"));
      // Draft save + resume
      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByLabel("Full legal name (as on passport)").fill(A.name);
      await page.getByRole("button", { name: "Save draft" }).click();
      await waitDb(async () => (await appOf(A.email))?.draft?.leader?.legal_name === A.name);
      const draft = await appOf(A.email);
      check("draft saved with unique application ID", draft?.status === "draft" && /^GIF27-[A-Z0-9]{6}$/.test(draft.code), draft?.code);
      await page.reload();
      await page.getByRole("heading", { name: "Your profile" }).waitFor();
      check("draft resumes with saved values", (await page.getByLabel("Full legal name (as on passport)").inputValue().catch(() => "")) === A.name);
      await apply(page, { pathway: "fully_funded", leader: A });
      const app = await appOf(A.email);
      check("A submitted → Awaiting Payment", app.status === "awaiting_payment", app.status);
      const ob = await obligation(A.email, "elco_pro");
      check("A has one Elco Pro obligation of IDR 98,000", ob && Number(ob.amount) === 98000 && ob.currency === "IDR");
      check("registration email sent", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'application_submitted'", [A.email])));
      check("consents recorded with version + IP", (await one("select count(*)::int as n from gif.consents c join gif.accounts a on a.id = c.account_id where a.email = $1 and document_version like '2026-11-21%'", [A.email])).n >= 7);
      // Duplicate application attempt
      await page.goto("/apply");
      check("second application redirected to portal", page.url().endsWith("/portal"));
      // Pay: return URL alone never marks paid. Start checkout, come back via finish URL without paying.
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: "Pay online" }).click();
      const order1 = await snapOrder(page);
      await page.locator("#snap-close").click(); // closed the popup without paying
      await page.getByTestId("attempt-open").waitFor();
      check("closing Snap shows Continue / Cancel & change, cancels nothing", (await page.getByTestId("attempt-open").innerText()).includes("Cancel & change payment method")
        && (await one("select status, cancel_requested_at from gif.payments where order_id = $1", [order1])).cancel_requested_at === null);
      await page.goto(`/portal/payments/return?order_id=${order1}&transaction_status=settlement&status_code=200`);
      await page.waitForTimeout(2500);
      check("forged return URL does not mark paid", (await obligation(A.email, "elco_pro")).status === "open");
      // Double click → same checkout reused (no second order)
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: /Pay online|Continue payment/ }).click();
      check("Continue payment reopens the same order (no second order)", (await snapOrder(page)) === order1);
      await page.locator("#pay-settlement").click();
      await page.waitForURL(/\/portal\/payments\/return/);
      await page.getByText("Payment verified").waitFor({ timeout: 30_000 });
      let app2 = await appOf(A.email);
      check("A paid but social tasks unverified → Phase 1 not complete yet", app2.status === "submitted", app2.status);
      // Candidate reports the Phase 1 social media tasks
      await page.goto("/portal/tasks");
      await page.getByLabel("Your Instagram username").fill("@ayu.lestari");
      for (const cb of await page.locator("form.panel").getByRole("checkbox").all()) {
        for (let i = 0; i < 3 && !(await cb.isChecked()); i++) { await cb.click(); await page.waitForTimeout(150); }
      }
      await page.getByRole("button", { name: "Send for verification" }).click();
      await waitDb(async () => Object.keys((await one("select social_tasks from gif.participants where email = $1", [A.email])).social_tasks).length === 5);
      await page.goto("/portal/tasks");
      check("portal shows Pending review for reported tasks (not auto-verified)", (await page.locator("body").innerText()).includes("Pending review") && (await appOf(A.email)).status === "submitted");
      check("A submitted 5 social tasks with handle", (await one("select instagram from gif.participants where email = $1", [A.email])).instagram === "ayu.lestari");
      // Staff verifies each task (one marked not found first, then verified)
      const vp = await newPage();
      await login(vp, "owner@example.test", "/admin");
      await vp.goto(`/admin/applicants/${app2.id}`);
      const firstRow = vp.locator("tr", { hasText: "Share the post to your Story" });
      await firstRow.locator("select[name=status]").selectOption("not_found");
      await firstRow.locator("input[name=note]").fill("Story not visible");
      await firstRow.getByRole("button", { name: "Save" }).click();
      await waitDb(async () => (await one("select social_tasks->'share_story'->>'status' as s from gif.participants where email = $1", [A.email])).s === "not_found");
      check("task marked not found keeps Phase 1 open", (await appOf(A.email)).status === "submitted");
      await vp.reload();
      for (const t of ["Follow @iels.co", "Follow @elco.ai", "Like the recruitment post", "Comment and tag 3 friends", "Share the post to your Story"]) {
        await vp.locator("tr", { hasText: t }).getByRole("button", { name: "Save" }).click();
        await waitDb(async () => (await one("select count(*)::int as n from gif.audit_log where action = 'social_task_verified'")).n >= ["Follow @iels.co", "Follow @elco.ai", "Like the recruitment post", "Comment and tag 3 friends", "Share the post to your Story"].indexOf(t) + 1);
        await vp.waitForTimeout(400);
      }
      await vp.context().close();
      app2 = await appOf(A.email);
      check("all tasks verified + paid → Phase 1 Completed", app2.status === "phase_1_completed", app2.status);
      const pay = await one("select * from gif.payments where order_id = $1", [order1]);
      check("payment linked to participant/application with receipt", pay.status === "paid" && pay.receipt_no && pay.participant_id && pay.application_id === app2.id);
      check("Elco Pro pending activation (not claimed active)", (await one("select status from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.email = $1", [A.email])).status === "pending_activation");
      check("payment email sent", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'payment_received'", [A.email])));
      await page.goto(`/portal/receipts/${pay.id}`);
      check("receipt page shows receipt number", (await page.locator("body").innerText()).includes(pay.receipt_no));
      await page.screenshot({ path: join(shots, "receipt.png") });
      await page.context().close();
    }

    // ── Webhook security and idempotency ────────────────────────────────────────────────────────────────────────────
    {
      const p = await one("select order_id, amount from gif.payments where status = 'paid' limit 1");
      const sig = (o, c, g, k) => crypto.createHash("sha512").update(`${o}${c}${g}${k}`).digest("hex");
      const post = (body) => fetch(`${base}/api/payments/midtrans/notification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const body = { order_id: p.order_id, status_code: "200", gross_amount: `${Number(p.amount)}.00`, transaction_status: "settlement" };
      let r = await post({ ...body, signature_key: "f".repeat(128) });
      check("webhook with bad signature → 401", r.status === 401, String(r.status));
      r = await post({ ...body, transaction_status: "refund", signature_key: sig(p.order_id, "200", body.gross_amount, "attacker-key") });
      check("webhook signed with wrong key → 401", r.status === 401);
      const emailsBefore = (await one("select count(*)::int as n from gif.email_outbox where template = 'payment_received'")).n;
      r = await post({ ...body, signature_key: sig(p.order_id, "200", body.gross_amount, "e2e-signature-secret") });
      const r2 = await post({ ...body, signature_key: sig(p.order_id, "200", body.gross_amount, "SB-Mid-server-e2efake") });
      check("valid duplicate webhooks (both keys) accepted idempotently", r.status === 200 && r2.status === 200);
      check("no second payment email after replay", (await one("select count(*)::int as n from gif.email_outbox where template = 'payment_received'")).n === emailsBefore);
      r = await post({ order_id: "NOT-OURS-123", status_code: "200", gross_amount: "1000.00", transaction_status: "settlement", signature_key: sig("NOT-OURS-123", "200", "1000.00", "e2e-signature-secret") });
      check("unknown order acknowledged (200), nothing created", r.status === 200 && !(await one("select 1 from gif.payments where order_id = 'NOT-OURS-123'")));
      r = await fetch(`${base}/api/analytics`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" });
      check("cross-site POST to API refused (CSRF origin check)", r.status === 403);
    }

    // ── B. Team Self-Funded with a flexible deposit and installments: Indonesian leader + Malaysian member ──────────────
    const B = { name: "Budi Santoso", email: "budi@example.test", wa: "+62 813 3333 4444", dob: "2004-08-01", nat: "ID", inst: "Universitas Example", level: "undergraduate" };
    const M = { name: "Nur Aisyah", email: "aisyah@example.test", wa: "+60 12 345 6789", dob: "2005-01-20", nat: "MY", inst: "Universiti Example", level: "undergraduate" };
    {
      const fee = (email) => one("select o.*, o.amount::float8 as amt, o.paid_amount::float8 as paid from gif.obligations o join gif.participants p on p.id = o.participant_id where p.email = $1 and o.kind = 'full' and o.status <> 'cancelled'", [email]);
      // Pay a chosen amount from the fee panel of one delegate (the owner sees one panel per team member).
      async function payFee(page, who, amountIdr, outcome = "settlement", full = false) {
        await page.goto("/portal/payments");
        const panel = page.getByTestId("fee-panel").filter({ hasText: who }).first();
        if (full) await panel.getByTestId("fee-full").click(); else await panel.getByTestId("fee-amount").fill(String(amountIdr));
        await panel.getByTestId("pay").click();
        const order = await snapOrder(page);
        await page.locator(`#pay-${outcome}`).click();
        if (outcome === "settlement" || outcome === "pending") await page.waitForURL((u) => u.pathname === "/portal/payments/return" && u.searchParams.get("order_id") === order);
        else await waitDb(async () => ["failed", "expired", "cancelled"].includes((await one("select status from gif.payments where order_id = $1", [order]))?.status));
        return order;
      }
      const page = await newPage();
      await login(page, B.email, "/apply?pathway=self_funded");
      await apply(page, { pathway: "self_funded", team: "River Keepers", leader: B, members: [M], selfFunded: true });
      const app = await appOf(B.email);
      check("team self-funded submitted with 2 participants", app.mode === "team" && (await one("select count(*)::int as n from gif.participants where application_id = $1", [app.id])).n === 2);
      const fb = await fee(B.email), fm = await fee(M.email);
      check("leader: one programme fee IDR 17,000,000 (Regular; no fixed deposit split)", fb && fb.amt === 17000000 && fb.currency === "IDR" && !(await obligation(B.email, "deposit")));
      check("first payment due within 7 days, the rest by 30 June 2027", Math.abs(new Date(fb.first_due_at).getTime() - Date.now() - 7 * 86400000) < 3600000 && new Date(fb.due_at).toISOString() === "2027-06-30T16:59:59.000Z");
      check("member: programme fee USD 999 (official USD price)", fm && fm.amt === 999 && fm.currency === "USD");
      check("registration email: deposit from IDR 2,500,000, you choose the amount", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'application_submitted' and text_body like '%at least IDR 2,500,000%' and text_body like '%You choose how much%'", [B.email])));
      check("team invite email to member", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'team_invite'", [M.email])));
      await page.goto("/portal/payments");
      const bp = page.getByTestId("fee-panel").filter({ hasText: B.name }).first();
      const bt = await bp.innerText();
      check("fee panel: 'Choose your deposit amount', minimum IDR 2,500,000, fee / verified / remaining", bt.includes("Choose your deposit amount") && bt.includes("IDR 2,500,000") && bt.includes("IDR 17,000,000") && bt.includes("Remaining balance"));
      await bp.getByTestId("fee-amount").fill("2000000");
      check("below the minimum: explained, Pay disabled", (await bp.innerText()).includes("The minimum is IDR 2,500,000") && (await bp.getByTestId("pay").isDisabled()));
      await bp.getByTestId("fee-amount").fill("3000000");
      check("balance after the proposed payment shown", (await bp.getByTestId("fee-after").innerText()) === "IDR 14,000,000");
      // Failure path: the payer's chosen amount is what is charged.
      const o1 = await payFee(page, B.name, 3000000, "deny");
      const p1 = await one("select * from gif.payments where order_id = $1", [o1]);
      check("charged exactly the chosen IDR 3,000,000", Number(p1.amount) === 3000000 && Number(p1.applied_amount) === 3000000 && p1.currency === "IDR");
      check("denied payment → failed, nothing credited", p1.status === "failed" && (await fee(B.email)).paid === 0);
      // Expired path via webhook (pending → expire)
      const o2 = await payFee(page, B.name, 3000000, "pending");
      check("pending payment → Payment Verification", (await appOf(B.email)).status === "payment_verification");
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: o2, transaction_status: "expire", notify: true }) });
      await new Promise((r) => setTimeout(r, 1000));
      check("expired payment → failed email + back to Awaiting Payment", (await one("select status from gif.payments where order_id = $1", [o2])).status === "expired" && (await appOf(B.email)).status === "awaiting_payment"
        && !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'payment_failed'", [B.email])));
      // Amount mismatch is never accepted; the correct notification is.
      const o3 = await payFee(page, B.name, 3000000, "pending");
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: o3, transaction_status: "settlement", gross_amount: "5000.00", notify: true }) });
      await new Promise((r) => setTimeout(r, 1000));
      check("amount mismatch not marked paid (audited)", (await fee(B.email)).paid === 0 && !!(await one("select 1 from gif.audit_log where action = 'payment_amount_mismatch'")));
      for (let i = 0; i < 2; i++) await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: o3, transaction_status: "settlement", gross_amount: "3000000.00", notify: true }) });
      await waitDb(async () => (await fee(B.email)).paid > 0);
      const fb2 = await fee(B.email);
      check("first installment verified → seat confirmed", (await one("select seat_status from gif.participants where email = $1", [B.email])).seat_status === "confirmed");
      check("Super Early Bird: first Self-Funded seat → fee IDR 13,000,000", fb2.amt === 13000000 && !!(await one("select early_bird_at from gif.participants where email = $1", [B.email])).early_bird_at);
      check("IDR 3,000,000 credited once (repeated notification ignored)", fb2.paid === 3000000 && fb2.status === "open");
      const pm = await one("select text_body from gif.email_outbox where template = 'payment_received' and to_email = $1 order by created_at desc limit 1", [B.email]);
      check("payment email shows the remaining balance", !!pm && pm.text_body.includes("Remaining balance: IDR 10,000,000"));
      check("app not confirmed until every member's first payment is verified", (await appOf(B.email)).status !== "confirmed_participant");
      await page.goto("/portal/payments");
      const bp2 = page.getByTestId("fee-panel").filter({ hasText: B.name }).first();
      const bt2 = await bp2.innerText();
      check("after the deposit: 'Pay towards your balance', Super Early Bird price, verified IDR 3,000,000", bt2.includes("Pay towards your balance") && bt2.includes("IDR 13,000,000") && bt2.includes("IDR 3,000,000") && (await bp2.getByTestId("early-bird").count()) === 1);
      await page.context().close();

      // Member signs in: sees team, accepts terms, sees only own USD fee, requests an invoice for a chosen amount
      const mp = await newPage();
      await login(mp, M.email);
      const t = await mp.locator("body").innerText();
      check("member sees team application", t.includes("River Keepers") && t.includes("you are a member"));
      await mp.goto("/portal/payments");
      check("member must accept terms before paying", (await mp.locator("body").innerText()).includes("Accept the terms first"));
      await mp.goto("/portal/application");
      for (const cb of await mp.locator("form.panel").getByRole("checkbox").all()) await cb.check();
      await mp.getByRole("button", { name: "Accept" }).click();
      await mp.getByText(/Your acceptance has been recorded|You accepted the current version/).first().waitFor();
      await mp.goto("/portal/payments");
      const mtext = await mp.locator("body").innerText();
      check("member sees only own USD fee", mtext.includes("USD 999") && !mtext.includes("IDR 17,000,000"));
      const mpanel = mp.getByTestId("fee-panel").first();
      check("USD fee: minimum IDR 2,500,000 = USD 135.14 at USD 1 = IDR 18,500", (await mpanel.innerText()).includes("USD 135.14") && (await mpanel.innerText()).includes("USD 1 = IDR 18,500"));
      await mpanel.getByTestId("fee-amount").fill("3000000");
      check("USD equivalent of the chosen IDR amount shown", (await mpanel.innerText()).includes("Counts as USD 162.16"));
      await mpanel.getByRole("button", { name: "Request invoice" }).click();
      await mp.getByText("Invoice requested").waitFor();
      check("invoice request emailed to finance", !!(await one("select 1 from gif.email_outbox where template = 'invoice_request'")));
      const ir = await one("select r.* from gif.invoice_requests r join gif.participants p on p.id = r.participant_id where p.email = $1", [M.email]);
      check("invoice request recorded in USD for the chosen amount (IDR 3,000,000 = USD 162.16)", ir && ir.status === "invoice_requested" && Number(ir.amount) === 162.16 && ir.currency === "USD", JSON.stringify(ir));
      check("participant gets an invoice acknowledgement email", !!(await one("select 1 from gif.email_outbox where template = 'invoice_requested' and to_email = $1 and text_body like '%USD 162.16%'", [M.email])));
      const finMail = await one("select html, text_body from gif.email_outbox where template = 'invoice_request' order by created_at desc limit 1");
      check("finance email: shared layout, both logos, no date of birth", finMail.html.includes("public-asset/iels_horizontal_navy.png") && finMail.html.includes("public-asset/gif.png") && !finMail.text_body.includes(M.dob));
      await mp.reload();
      const mpanel2 = mp.getByTestId("fee-panel").first();
      check("second request not possible: status shown instead of the button", (await mpanel2.innerText()).includes("Invoice requested") && (await mpanel2.getByRole("button", { name: "Request invoice" }).count()) === 0);
      check("only one open invoice request per item", (await one("select count(*)::int as n from gif.invoice_requests where obligation_id = $1", [ir.obligation_id])).n === 1);
      // Member can't open the leader's receipt
      const leaderPay = await one("select p.id from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'paid'", [B.email]);
      const rr = await mp.goto(`/portal/receipts/${leaderPay.id}`);
      check("member cannot open leader's receipt", rr.status() === 404);
      const ad = await mp.goto("/admin");
      check("candidate cannot open admin", !mp.url().includes("/admin") || ad.status() === 404);
      const ex = await mp.request.get("/api/admin/export?type=applicants");
      check("candidate cannot export CSV", ex.status() === 403);
      await mp.context().close();

      // Finance: invoice sent, then the member's transfer of USD 162.16 recorded as an installment (audited)
      const fp = await newPage();
      await login(fp, "finance@example.test", "/admin");
      await fp.goto("/admin/payments");
      const irow = fp.getByTestId("invoice-requests").locator("tr", { hasText: M.name });
      await irow.getByText("Mark invoice sent").click();
      await irow.getByLabel("Invoice number").fill("INV-E2E-0001");
      await irow.getByRole("button", { name: "Mark sent and email participant" }).click();
      await waitDb(async () => (await one("select r.status from gif.invoice_requests r join gif.participants p on p.id = r.participant_id where p.email = $1", [M.email]))?.status === "invoice_sent");
      check("finance marks invoice sent → participant emailed", !!(await one("select 1 from gif.email_outbox where template = 'invoice_sent' and to_email = $1 and subject like '%INV-E2E-0001%'", [M.email])));
      await fp.goto(`/admin/applicants/${app.id}`);
      const row = () => fp.locator("tr", { hasText: "Self-Funded programme fee" }).filter({ hasText: "Nur Aisyah" });
      // Below the minimum is refused.
      await row().getByText("Record manual payment").click();
      await row().getByLabel(/Amount \(USD\)/).fill("100");
      await row().getByLabel("Bank reference / proof").fill("TOO-SMALL");
      await row().getByRole("button", { name: "Record payment" }).click();
      await row().getByText(/minimum payment is USD 135.14/).waitFor();
      check("manual payment below the minimum refused", (await fee(M.email)).paid === 0);
      await fp.goto(`/admin/applicants/${app.id}`);
      await row().getByText("Record manual payment").click();
      await row().getByLabel(/Amount \(USD\)/).fill("162.16");
      await row().getByLabel("Bank reference / proof").fill("SWIFT-REF-E2E-001");
      await row().getByRole("button", { name: "Record payment" }).click();
      await waitDb(async () => (await fee(M.email)).paid > 0);
      const fm2 = await fee(M.email);
      check("manual installment USD 162.16 credited; early bird → fee USD 799", fm2.paid === 162.16 && fm2.amt === 799 && fm2.status === "open", JSON.stringify({ paid: fm2.paid, amt: fm2.amt }));
      const appB = await appOf(B.email);
      check("both seats confirmed → team Confirmed Participant", appB.status === "confirmed_participant", appB.status);
      check("verified transfer closes the invoice request", (await one("select r.status from gif.invoice_requests r join gif.participants p on p.id = r.participant_id where p.email = $1", [M.email])).status === "paid");
      check("manual payment audited", !!(await one("select 1 from gif.audit_log where action = 'manual_payment_recorded' and actor = 'finance@example.test'")));
      check("onboarding emails sent to both", (await one("select count(*)::int as n from gif.email_outbox where template = 'onboarding' and application_id = $1", [app.id])).n === 2);
      await fp.goto(`/admin/applicants/${app.id}`);
      const summary = await fp.getByTestId("fee-summary").innerText();
      check("admin: fee, verified payments and outstanding per delegate", summary.includes("USD 799") && summary.includes("USD 162.16") && summary.includes("USD 636.84") && summary.includes("IDR 10,000,000") && summary.includes("Early bird"));
      await fp.context().close();

      // Leader: a second installment, then the full remaining balance.
      const lp = await newPage();
      await login(lp, B.email);
      await payFee(lp, B.name, 4000000, "settlement");
      await waitDb(async () => (await fee(B.email)).paid === 7000000);
      check("second installment IDR 4,000,000 → IDR 7,000,000 verified, IDR 6,000,000 left", (await fee(B.email)).paid === 7000000 && (await fee(B.email)).status === "open");
      const ofull = await payFee(lp, B.name, 0, "settlement", true);
      await waitDb(async () => (await fee(B.email)).status === "paid");
      check("full balance: charged exactly IDR 6,000,000 and the fee is paid", Number((await one("select amount from gif.payments where order_id = $1", [ofull])).amount) === 6000000 && (await fee(B.email)).paid === 13000000);
      check("three verified installments on the fee", (await one("select count(*)::int as n from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'paid'", [B.email])).n === 3);
      await lp.context().close();
    }

    // ── Duplicate payment → flagged, refund queued, refunded through the gateway ────────────────────────────────────
    const C = { name: "Lim Wei Jie", email: "weijie@example.test", wa: "+65 8123 4567", dob: "2006-11-02", nat: "SG", inst: "Example Junior College", level: "college" };
    {
      const page = await newPage();
      await login(page, C.email, "/apply?pathway=fully_funded");
      await apply(page, { pathway: "fully_funded", leader: C });
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: "Pay online" }).click();
      const o1 = await snapOrder(page);
      await db.query("update gif.payments set checkout_expires_at = now() - interval '1 minute' where order_id = $1", [o1]); // first tab left open too long
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: /Pay online|Continue payment/ }).click();
      const o2 = await snapOrder(page);
      check("expired checkout replaced by a new order", o1 !== o2);
      await page.locator("#pay-settlement").click();
      await page.waitForURL(/return/);
      await page.goto(`${mt}/pay/${encodeURIComponent(o1)}`);
      await page.locator("#pay-settlement").click(); // the old tab is paid too
      await page.waitForURL(/return/);
      await new Promise((r) => setTimeout(r, 1500));
      const dup = await one("select * from gif.payments where order_id = $1", [o1]);
      check("second settlement flagged as duplicate", dup.status === "paid" && dup.is_duplicate === true);
      check("only one obligation, settled once", (await one("select count(*)::int as n from gif.obligations o join gif.participants p on p.id = o.participant_id where p.email = $1 and o.kind = 'elco_pro'", [C.email])).n === 1);
      const rq = await one("select * from gif.refunds where payment_id = $1", [dup.id]);
      check("refund queued automatically for duplicate", rq?.status === "requested");
      await page.context().close();
      const fp = await newPage();
      await login(fp, "finance@example.test", "/admin");
      await fp.goto("/admin/payments");
      check("refund queue lists the duplicate", (await fp.locator("body").innerText()).includes("Duplicate payment"));
      const appC = await appOf(C.email);
      await fp.goto(`/admin/applicants/${appC.id}`);
      const trow = fp.locator("tr", { hasText: o1 });
      await trow.locator("summary", { hasText: "Refund" }).click();
      await trow.getByLabel("Reason").fill("Duplicate payment");
      await trow.getByRole("checkbox").check();
      await trow.getByRole("button", { name: "Refund via Midtrans" }).click();
      await fp.locator("tr", { hasText: o1 }).filter({ hasText: "refunded" }).first().waitFor();
      check("duplicate refunded via gateway; original stays paid", (await one("select status from gif.payments where order_id = $1", [o1])).status === "refunded"
        && (await one("select status from gif.payments where order_id = $1", [o2])).status === "paid" && (await obligation(C.email, "elco_pro")).status === "paid");
      await fp.context().close();
    }

    // ── D. Mentoring (international, USD via manual) → Phase 3 shortcut ─────────────────────────────────────────────
    const D = { name: "Tran Minh Anh", email: "minhanh@example.test", wa: "+84 912 345 678", dob: "2006-05-05", nat: "VN", inst: "Example High School", level: "high_school" };
    {
      const page = await newPage();
      await login(page, D.email, "/apply?pathway=mentoring");
      await apply(page, { pathway: "mentoring", leader: D });
      const ob = await obligation(D.email, "mentoring");
      check("mentoring USD 79 Early Bird obligation (per person)", Number(ob.amount) === 79 && ob.currency === "USD", `${ob.amount} ${ob.currency}`);
      await page.goto("/portal/payments");
      check("USD payer offered an invoice (card option alongside)", (await page.locator("tr", { hasText: "Mentoring" }).innerText()).includes("Request invoice"));
      await page.context().close();
      const fp = await newPage();
      await login(fp, "owner@example.test", "/admin");
      const appD = await appOf(D.email);
      await fp.goto(`/admin/applicants/${appD.id}`);
      const row = fp.locator("tr", { hasText: "Project Mentoring Program" });
      await row.getByText("Record manual payment").click();
      await row.getByLabel("Bank reference / proof").fill("WISE-E2E-77");
      await row.getByRole("button", { name: "Record payment" }).click();
      await waitDb(async () => (await obligation(D.email, "mentoring")).status === "paid");
      check("mentee enrolled → Phase 1 Completed (straight to Phase 3)", (await appOf(D.email)).status === "phase_1_completed");
      await fp.context().close();
    }

    // ── INTL. International card payment (USD price, charged in IDR at the fixed rate USD 1 = IDR 18,500) ────────────
    const INTL = { name: "Nurul Huda binti Ahmad", email: "nurul.huda@example.test", wa: "+60 13 222 4455", dob: "2004-08-08", nat: "MY", inst: "Universiti Example", level: "undergraduate" };
    {
      const setPayments = async (patch) => {
        const r = await one("select settings from gif.cohorts where is_current");
        const st = r.settings ?? {};
        st.payments = { ...(st.payments ?? {}), ...patch };
        await db.query("update gif.cohorts set settings = $1 where is_current", [JSON.stringify(st)]);
      };
      const page = await newPage();
      await login(page, INTL.email, "/apply?pathway=mentoring");
      await apply(page, { pathway: "mentoring", leader: INTL });
      const ob = await obligation(INTL.email, "mentoring");
      check("E: official USD 79 obligation kept (no conversion on the obligation)", Number(ob.amount) === 79 && ob.currency === "USD");
      await page.goto("/portal/application");
      // The terms are normally accepted when submitting; accept here only if the portal still asks.
      if (await page.getByRole("button", { name: "Accept" }).isVisible().catch(() => false)) {
        for (const cb of await page.locator("form.panel").getByRole("checkbox").all()) await cb.check();
        await page.getByRole("button", { name: "Accept" }).click();
      }
      await page.getByText(/Your acceptance has been recorded|You accepted the current version/).first().waitFor();
      await setPayments({ international_cards: false });
      await page.goto("/portal/payments");
      check("card option hidden when Finance switches it off", (await page.getByTestId("intl-card").count()) === 0 && (await page.getByTestId("intl-invoice").count()) === 1);
      await setPayments({ international_cards: true });
      await page.goto("/portal/payments");
      const card = page.getByTestId("intl-card");
      const ct = await card.innerText();
      check("card option shows IDR 1,461,500, the USD price and the fixed rate", ct.includes("IDR 1,461,500") && ct.includes("USD 79") && ct.includes("USD 1 = IDR 18,500"), ct);
      check("invoice option offered next to the card", (await page.getByTestId("intl-invoice").innerText()).includes("Request invoice"));
      await card.getByRole("button", { name: /Pay IDR 1,461,500 by card/ }).click();
      const order = await snapOrder(page);
      const pay = await one("select * from gif.payments where order_id = $1", [order]);
      check("payment row: IDR amount + original USD amount + rate recorded", Number(pay.amount) === 1461500 && pay.currency === "IDR" && Number(pay.original_amount) === 79 && pay.original_currency === "USD" && Number(pay.fx_rate) === 18500 && pay.fx_source === "settings.payments.usd_idr_card_rate", JSON.stringify(pay));
      const fake = (await (await fetch(`${mt}/__orders`)).json()).find((o) => o.order_id === order);
      check("Midtrans receives the integer IDR amount, cards only", fake.gross_amount === "1461500.00" && JSON.stringify(fake.enabled_payments) === JSON.stringify(["credit_card"]), JSON.stringify(fake));
      // A notification with any other amount (e.g. the USD number) never settles it.
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: order, transaction_status: "settlement", gross_amount: "79.00", notify: true }) });
      check("amount mismatch is not marked paid", (await one("select status from gif.payments where order_id = $1", [order])).status !== "paid");
      for (let i = 0; i < 2; i++) await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: order, transaction_status: "settlement", gross_amount: "1461500.00", notify: true }) });
      await waitDb(async () => (await obligation(INTL.email, "mentoring")).status === "paid");
      check("verified card payment settles the USD obligation once", (await obligation(INTL.email, "mentoring")).status === "paid" && (await one("select count(*)::int as n from gif.payments where obligation_id = $1 and status = 'paid'", [ob.id])).n === 1);
      const pm = await one("select html, text_body from gif.email_outbox where template = 'payment_received' and to_email = $1", [INTL.email]);
      check("payment email shows the IDR amount with the USD price and rate", !!pm && pm.text_body.includes("IDR 1,461,500 (USD 79 at USD 1 = IDR 18,500)") && pm.html.includes("public-asset/gif.png"));
      check("repeated notifications send one email", (await one("select count(*)::int as n from gif.email_outbox where template = 'payment_received' and to_email = $1", [INTL.email])).n === 1);
      const rc = await one("select id from gif.payments where order_id = $1", [order]);
      await page.goto(`/portal/receipts/${rc.id}`);
      check("receipt shows the programme price and the fixed rate", (await page.locator("body").innerText()).includes("paid by card at the fixed rate USD 1 = IDR 18,500"));
      check("IDR obligations unchanged (A's Elco Pro still IDR 98,000)", Number((await obligation(A.email, "elco_pro")).amount) === 98000);
      await setPayments({ international_cards: false });
      await page.context().close();
    }

    // ── Phases 2 and 3 with uploads (windows opened through settings) ──────────────────────────────────────────────
    await setDates({ phase1_close: iso(-3 * 86400000), phase2_open: iso(-2 * 86400000), phase2_close: iso(2 * 86400000) });
    {
      const page = await newPage();
      await login(page, A.email, "/portal/phase-2");
      await page.goto("/portal/phase-2");
      const tmp = join(shots, "fixtures");
      mkdirSync(tmp, { recursive: true });
      writeFileSync(join(tmp, "fake.pdf"), "this is not a pdf at all");
      writeFileSync(join(tmp, "essay.pdf"), "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
      writeFileSync(join(tmp, "deck.pdf"), "%PDF-1.4\n% deck\n%%EOF\n");
      await page.getByLabel("Upload essay PDF").setInputFiles({ name: "essay.pdf", mimeType: "application/pdf", buffer: Buffer.from("not really a pdf") });
      await page.getByText("contents don't match its type").waitFor();
      check("upload with wrong file signature rejected", !!(await one("select 1 from gif.documents where status = 'deleted' and review_note like '%match%'")));
      await page.getByLabel("Upload essay PDF").setInputFiles(join(tmp, "essay.pdf"));
      await page.getByText("Uploaded essay.pdf").waitFor();
      await page.getByLabel("Upload pitch deck").setInputFiles(join(tmp, "deck.pdf"));
      await page.getByText("Uploaded deck.pdf").waitFor();
      check("valid uploads stored privately", (await one("select count(*)::int as n from gif.documents where status = 'uploaded' and kind like 'phase2%'")).n === 2);
      page.on("dialog", (d) => d.accept());
      await page.getByRole("button", { name: "Submit Phase 2" }).click();
      await page.getByText(/^Submitted\. We have emailed/).waitFor();
      check("A Phase 2 submitted", (await appOf(A.email)).status === "phase_2_submitted");
      await page.context().close();
    }
    await setDates({ phase2_close: iso(-1 * 86400000), phase3_open: iso(-60_000), phase3_submit_close: iso(2 * 86400000) });
    for (const who of [A, D]) {
      const page = await newPage();
      await login(page, who.email, "/portal/phase-3");
      await page.goto("/portal/phase-3");
      page.on("dialog", (d) => d.accept());
      if (who === A) {
        await page.getByLabel("Upload video (MP4 or MOV)").setInputFiles({ name: "pitch.mp4", mimeType: "video/mp4", buffer: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(64)]) });
        await page.getByText("Uploaded pitch.mp4").waitFor();
      } else {
        await page.getByLabel("Video link").fill("http://example.com/not-allowed");
        await page.getByRole("button", { name: "Submit Phase 3" }).click();
        await page.getByText(/Use a YouTube/).waitFor();
        check("non-allowed video host refused", (await appOf(D.email)).status !== "phase_3_submitted");
        await page.getByLabel("Video link").fill("https://youtu.be/dQw4w9WgXcQ");
      }
      await page.getByRole("button", { name: "Submit Phase 3" }).click();
      await page.getByText(/^Submitted\. We have emailed/).waitFor();
      check(`${who.name} Phase 3 submitted`, (await appOf(who.email)).status === "phase_3_submitted");
      await page.context().close();
    }

    // ── Selection: assign, score, decide, publish ──────────────────────────────────────────────────────────────────
    {
      const appA = await appOf(A.email), appD = await appOf(D.email);
      const op = await newPage();
      await login(op, "owner@example.test", "/admin");
      await op.goto("/admin/selection");
      for (const app of [appA, appD]) {
        const row = op.locator("tr", { hasText: app.code });
        await row.locator("select[name=evaluator]").selectOption("eval@example.test");
        await row.getByRole("button", { name: "+" }).click();
        await op.waitForTimeout(800);
      }
      check("evaluator assigned to both", (await one("select count(*)::int as n from gif.evaluator_assignments where evaluator_email = 'eval@example.test'")).n === 2);
      const ep = await newPage();
      await login(ep, "eval@example.test", "/admin");
      await ep.goto("/admin/evaluate");
      check("evaluator sees 2 assigned", (await ep.locator("tbody tr").count()) === 2);
      const appB = await appOf(B.email);
      const forbidden = await ep.goto(`/admin/applicants/${appB.id}`);
      check("evaluator cannot open unassigned applicant", forbidden.status() === 404);
      for (const [app, s] of [[appA, 9], [appD, 7]]) {
        await ep.goto(`/admin/evaluate/${app.id}`);
        for (const l of ["Problem identification", "Innovation", "Impact", "Feasibility", "Sustainability", "Leadership and teamwork", "Presentation"]) await ep.getByLabel(`${l} (1–10)`).fill(String(s));
        await ep.getByLabel("Feedback").fill("Clear problem and credible plan.");
        await ep.getByRole("button", { name: "Save scores" }).click();
        await ep.getByText("Scores saved.").waitFor();
      }
      check("scores saved with totals", Number((await one("select total from gif.evaluations where application_id = $1", [appA.id])).total) === 63);
      await ep.context().close();
      await op.goto("/admin/selection");
      const ranks = await op.locator("tbody tr").allInnerTexts();
      check("ranking orders by average total", ranks[0].includes(appA.code));
      for (const [app, outcome] of [[appA, "fully_funded"], [appD, "partial_funded"]]) {
        const row = op.locator("tr", { hasText: app.code });
        await row.locator("select[name=outcome]").selectOption(outcome);
        await row.getByRole("button", { name: "Set" }).click();
        await op.waitForTimeout(800);
      }
      await op.getByLabel("Type PUBLISH to confirm").fill("PUBLISH");
      await op.getByRole("button", { name: "Publish results" }).click();
      await op.getByText(/Published 2 results/).waitFor();
      check("A Selected — Fully Funded", (await appOf(A.email)).status === "selected_fully_funded");
      check("D Selected — Partial Funded", (await appOf(D.email)).status === "selected_partial_funded");
      const cb = await one("select c.* from gif.cashbacks c join gif.participants p on p.id = c.participant_id where p.email = $1", [D.email]);
      check("mentee cashback USD 49 pending verification", cb && Number(cb.amount) === 49 && cb.currency === "USD" && cb.status === "pending_verification");
      const resultMail = await one("select text_body from gif.email_outbox where template = 'result' and to_email = $1", [A.email]);
      check("Fully Funded result email states coverage and excludes flights", resultMail.text_body.includes("programme fee") && resultMail.text_body.includes("international flights"));
      const pfMail = await one("select text_body from gif.email_outbox where template = 'result' and to_email = $1", [D.email]);
      check("Partial Funded result email states USD 699 contribution", pfMail.text_body.includes("USD 699"));
      check("result emails sent", (await one("select count(*)::int as n from gif.email_outbox where template = 'result'")).n === 2);
      // Elco Pro activation recorded by finance only after verification
      await op.goto(`/admin/applicants/${appA.id}`);
      const er = op.locator("tr", { hasText: A.email }).filter({ has: op.locator("input[name=reference]") });
      await er.locator("input[name=reference]").fill("ELCO-GRANT-E2E-1");
      await er.getByRole("button", { name: "Save" }).click();
      await op.locator("tr", { hasText: A.email }).filter({ hasText: "activated" }).first().waitFor();
      await waitDb(async () => !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'elco_activated'", [A.email])));
      check("Elco Pro marked active with reference + email", (await one("select status, elco_reference from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.email = $1", [A.email])).status === "activated"
        && !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'elco_activated'", [A.email])));
      // CSV export
      const csv = await op.request.get("/api/admin/export?type=applicants");
      const body = await csv.text();
      check("applicants CSV export", csv.status() === 200 && body.includes("legal_name") && body.includes(A.email));
      // Settings validation
      await op.goto("/admin/content");
      const ta = op.locator("textarea[name=settings]");
      const json = JSON.parse(await ta.inputValue());
      json.prices.self_funded_deposit.USD = 5000;
      await ta.fill(JSON.stringify(json));
      await op.getByRole("button", { name: "Save settings" }).click();
      await op.getByText("The deposit must be smaller than the total.").waitFor();
      check("invalid settings rejected", true);
      await op.context().close();
      // A accepts the offer → confirmed
      const ap = await newPage();
      await login(ap, A.email, "/portal/results");
      await ap.goto("/portal/results");
      await ap.getByRole("button", { name: "Accept my offer" }).click();
      await ap.waitForTimeout(1500);
      check("A accepts → Confirmed Participant", (await appOf(A.email)).status === "confirmed_participant");
      await ap.context().close();
    }

    // ── Partial Funded acceptance: one contribution in installments, seat secured by the first verified payment ──────────
    {
      const dp = await newPage();
      await login(dp, D.email, "/portal/results");
      await dp.goto("/portal/results");
      check("Partial Funded result shows USD 699 contribution", (await dp.locator("body").innerText()).includes("USD 699"));
      await dp.getByRole("button", { name: "Accept my offer" }).click();
      await waitDb(async () => !!(await obligation(D.email, "full")));
      const pfee = await obligation(D.email, "full");
      check("Partial Funded: one contribution of USD 699, paid in installments", Number(pfee.amount) === 699 && pfee.currency === "USD" && pfee.label === "Partial Funded contribution" && !!pfee.first_due_at);
      check("Partial Funded not confirmed before the first payment", (await appOf(D.email)).status === "selected_partial_funded");
      await dp.context().close();
      const fp = await newPage();
      await login(fp, "finance@example.test", "/admin");
      const appD = await appOf(D.email);
      await fp.goto(`/admin/applicants/${appD.id}`);
      const row = fp.locator("tr", { hasText: "Partial Funded contribution" });
      await row.getByText("Record manual payment").click();
      await row.getByLabel(/Amount \(USD\)/).fill("200");
      await row.getByLabel("Bank reference / proof").fill("WISE-PF-DEP");
      await row.getByRole("button", { name: "Record payment" }).click();
      await waitDb(async () => Number((await obligation(D.email, "full")).paid_amount) === 200);
      check("Partial Funded: USD 200 first installment, USD 499 left", Number((await obligation(D.email, "full")).paid_amount) === 200 && (await obligation(D.email, "full")).status === "open");
      check("Partial Funded first payment verified → Confirmed Participant", (await appOf(D.email)).status === "confirmed_participant");
      await fp.context().close();
    }

    // ── Under-18 applicant: guardian consent required before payment ──────────────────────────────────────────────
    const E = { name: "Raka Putra", email: "raka.minor@example.test", wa: "+62 812 5555 6666", dob: "2010-03-01", nat: "ID", inst: "SMA Example 2", level: "high_school" };
    {
      const page = await newPage();
      await login(page, E.email, "/apply?pathway=self_funded");
      await page.goto("/apply?pathway=self_funded");
      await page.getByRole("button", { name: "Continue" }).click();
      await person(page, E, { lockedEmail: true });
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForTimeout(500);
      check("wizard blocks a minor without guardian details", (await page.getByRole("heading", { name: "Your profile" }).count()) === 1);
      await page.getByLabel("Guardian full name").fill("Dewi Putri");
      await page.getByLabel("Relationship", { exact: true }).last().fill("Mother");
      await page.getByLabel("Guardian email").fill("dewi.guardian@example.test");
      await page.getByLabel("Guardian phone (with country code)").fill("+62 811 7777 8888");
      await page.getByRole("button", { name: "Save draft" }).click();
      await waitDb(async () => (await appOf(E.email))?.draft?.leader?.guardian_email === "dewi.guardian@example.test");
      await apply(page, { pathway: "self_funded", leader: E, selfFunded: true, keepGuardian: true });
      const mail = await one("select html from gif.email_outbox where to_email = 'dewi.guardian@example.test' and template = 'guardian_consent'");
      check("guardian consent email sent", !!mail);
      await page.goto("/portal/payments");
      await page.getByTestId("fee-panel").first().getByTestId("pay").click();
      await page.getByText(/parent or guardian must give consent/).waitFor();
      check("payment refused until guardian consents", !(await one("select 1 from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1", [E.email])));
      const link = mail.html.match(/href="([^"]*guardian-consent\/[^"]+)"/)[1].replace(/^https?:\/\/[^/]+/, "");
      const gp = await newPage();
      await gp.goto(link);
      for (const cb of await gp.locator("form.panel").getByRole("checkbox").all()) await cb.check();
      await gp.getByRole("button", { name: "Give consent" }).click();
      await gp.getByText(/consent for Raka Putra is recorded/).waitFor();
      const g = await one("select guardian_consent_at, guardian_consent_name, guardian_consent_method, guardian_token_hash from gif.participants where email = $1", [E.email]);
      check("guardian consent recorded (name, method), token single-use", !!g.guardian_consent_at && g.guardian_consent_name === "Dewi Putri" && g.guardian_consent_method === "online" && g.guardian_token_hash === null);
      check("guardian consent row with actor email", !!(await one("select 1 from gif.consents where category = 'guardian' and actor_email = 'dewi.guardian@example.test' and account_id is null")));
      await gp.goto(link);
      check("used guardian link no longer valid", (await gp.locator("body").innerText()).includes("no longer valid"));
      await gp.context().close();
      await page.goto("/portal/payments");
      await page.getByTestId("fee-panel").first().getByTestId("pay").click();
      check("payment opens after guardian consent", !!(await snapOrder(page)));
      await page.context().close();
    }

    // ── Payment recovery: wrong method → cancel & change; refused cancel; paid during cancel; duplicates ────────────
    const F = { name: "Fajar Nugroho", email: "fajar@example.test", wa: "+62 812 3333 4444", dob: "2005-05-05", nat: "ID", inst: "Universitas Example", level: "undergraduate" };
    // Earlier scenarios moved the cohort past Phase 1; reopen it for these applicants, then put the dates back.
    const savedDates = (await one("select settings from gif.cohorts where is_current")).settings?.dates ?? {};
    await setDates({ phase1_close: iso(30 * 86400000) });
    {
      const page = await newPage();
      await login(page, F.email, "/apply?pathway=fully_funded");
      await apply(page, { pathway: "fully_funded", leader: F });
      const fpay = (o) => one("select * from gif.payments where order_id = $1", [o]);
      const calls = async (o) => ((await (await fetch(`${mt}/__orders`)).json()).find((x) => x.order_id === o)?.calls ?? {});
      // 1. Picks a virtual account by mistake (pending), then cancels and changes method.
      const v1 = await payOnline(page, "Elco Pro", "pending");
      check("VA chosen → attempt pending", (await fpay(v1)).status === "pending");
      await page.getByTestId("cancel-change").click();
      await page.getByTestId("attempt-choose").waitFor();
      const c1 = await fpay(v1);
      check("cancel confirmed by Midtrans → attempt cancelled (no 1-hour wait)", c1.status === "cancelled" && c1.cancel_result === "cancelled" && (await calls(v1)).cancel === 1, `${c1.status}/${c1.cancel_result}`);
      check("no 'payment failed' email for a cancellation the payer asked for", !(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'payment_failed'", [F.email])));
      check("obligation untouched by the cancellation", (await obligation(F.email, "elco_pro")).status === "open");
      await page.getByTestId("choose-method").click();
      const v2 = await snapOrder(page);
      check("new method → new order id, linked to the cancelled attempt", v2 !== v1 && (await fpay(v1)).replaced_by === (await fpay(v2)).id);
      // 2. Duplicate cancellation requests from two tabs at once.
      await page.locator("#pay-pending").click();
      await page.waitForURL((u) => u.searchParams.get("order_id") === v2);
      const tab2 = await page.context().newPage();
      await Promise.all([page.goto("/portal/payments"), tab2.goto("/portal/payments")]);
      const cancelBtn = (pg) => pg.locator("tr", { hasText: "Elco Pro" }).getByTestId("cancel-change");
      await Promise.all([cancelBtn(page).waitFor(), cancelBtn(tab2).waitFor()]);
      await Promise.all([cancelBtn(page).click(), cancelBtn(tab2).click()]);
      await waitDb(async () => (await fpay(v2)).status === "cancelled");
      check("two simultaneous cancels → exactly one Midtrans cancel", (await calls(v2)).cancel === 1 && (await fpay(v2)).status === "cancelled", JSON.stringify(await calls(v2)));
      await tab2.close();
      // 3. Midtrans refuses to cancel (and to expire): payer is told and can still start a new payment.
      const v3 = await payOnline(page, "Elco Pro", "pending");
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: v3, refuse_cancel: true, refuse_expire: true }) });
      await page.getByTestId("cancel-change").click();
      await page.getByTestId("attempt-not-cancellable").waitFor();
      const c3 = await fpay(v3);
      check("refused cancel → attempt stays pending, marked not cancellable", c3.status === "pending" && c3.cancel_result === "not_cancellable", `${c3.status}/${c3.cancel_result}`);
      check("cancel, then expire, were each tried once", (await calls(v3)).cancel === 1 && (await calls(v3)).expire === 1);
      await page.getByTestId("force-new").click();
      const v4 = await snapOrder(page);
      check("recovery: new payment allowed right away after a refused cancel", v4 !== v3 && (await fpay(v3)).replaced_by === (await fpay(v4)).id);
      const fob = await obligation(F.email, "elco_pro");
      check("no Elco Pro grant requested while attempts were only opened, pending or cancelled",
        !(await (await fetch(`${mt}/__elco`)).json()).calls.some((c) => c.reference === `gif:${fob.id}`));
      // 4. The payer completes the payment just as a cancellation is requested: the payment wins.
      await page.locator("#pay-pending").click();
      await page.waitForURL((u) => u.searchParams.get("order_id") === v4);
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: v4, settle_on_cancel: true }) });
      await page.getByTestId("cancel-change").click();
      await page.getByTestId("attempt-paid").waitFor();
      check("paid during cancellation → attempt paid, obligation paid", (await fpay(v4)).status === "paid" && (await obligation(F.email, "elco_pro")).status === "paid");
      // 5. The attempt Midtrans wouldn't cancel is paid later too: duplicate, refund queued, still one obligation.
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: v3, transaction_status: "settlement", notify: true }) });
      await waitDb(async () => (await fpay(v3)).status === "paid");
      check("old attempt paid later → duplicate with refund queued", (await fpay(v3)).is_duplicate === true
        && !!(await one("select 1 from gif.refunds r join gif.payments p on p.id = r.payment_id where p.order_id = $1", [v3]))
        && (await one("select count(*)::int as n from gif.obligations o join gif.participants p on p.id = o.participant_id where p.email = $1 and o.kind = 'elco_pro'", [F.email])).n === 1);
      // 6. Duplicate webhooks for the paid attempt change nothing.
      for (let i = 0; i < 2; i++) await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: v4, transaction_status: "settlement", notify: true }) });
      await new Promise((r) => setTimeout(r, 800));
      check("duplicate webhooks → one receipt email, payment unchanged", (await one("select count(*)::int as n from gif.email_outbox where to_email = $1 and template = 'payment_received'", [F.email])).n === 1
        && (await fpay(v4)).status === "paid" && (await fpay(v4)).is_duplicate === false);
      // 7. Cancelling an attempt that already closed is a no-op (Midtrans not called again).
      await page.goto(`/portal/payments/return?order_id=${encodeURIComponent(v1)}`);
      await page.getByText("This payment was cancelled").waitFor();
      check("closed attempt shows no cancel button", (await page.getByTestId("cancel-change").count()) === 0 && (await calls(v1)).cancel === 1);
      // 8. Elco API down when the payment verified: stays "activation in progress", the attempt is logged, a retry scheduled.
      const ff = await one("select f.* from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.email = $1", [F.email]);
      const att = await all("select * from gif.elco_grant_attempts where fulfilment_id = $1", [ff.id]);
      check("Elco unavailable → pending_activation, attempt logged, retry scheduled", ff.status === "pending_activation" && att.length >= 1 && att[0].outcome === "error"
        && att[0].http_status === 503 && !!ff.next_attempt_at && ff.grant_attempts >= 1, JSON.stringify({ s: ff.status, att }));
      // Elco comes back; the cron retries once the backoff is due.
      await fetch(`${mt}/__control/elco`, { method: "POST", body: JSON.stringify({ mode: "up" }) });
      let r = await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      check("retry waits for the backoff", (await one("select status from gif.elco_fulfilments where id = $1", [ff.id])).status === "pending_activation", String(r.status));
      await db.query("update gif.elco_fulfilments set next_attempt_at = now() - interval '1 second' where id = $1", [ff.id]);
      r = await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      const ff2 = await one("select * from gif.elco_fulfilments where id = $1", [ff.id]);
      check("Elco grant succeeds on retry → activated by elco-api with grant id + email", ff2.status === "activated" && ff2.activated_by === "elco-api" && /^EG-/.test(ff2.elco_reference ?? "")
        && !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'elco_activated'", [F.email])), `${r.status} ${ff2.status} ${ff2.notes}`);
      // Duplicate grant request (e.g. the response was lost): Elco answers with the same grant; nothing granted twice.
      await db.query("update gif.elco_fulfilments set status = 'pending_activation', next_attempt_at = null where id = $1", [ff.id]);
      await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      const ff3 = await one("select * from gif.elco_fulfilments where id = $1", [ff.id]);
      const eg = await (await fetch(`${mt}/__elco`)).json();
      check("duplicate grant request → same grant id, one grant at Elco, one activation email", ff3.elco_reference === ff2.elco_reference
        && eg.grants.filter(([ref]) => ref === `gif:${ff.obligation_id}`).length === 1
        && (await one("select count(*)::int as n from gif.email_outbox where to_email = $1 and template = 'elco_activated'", [F.email])).n === 1);
      await page.context().close();
    }
    // Elco Pro bought with an email that has no Elco account yet: Elco reserves it for that email's sign-up.
    const G = { name: "Nadia Putri", email: "nadia@newcomer.example.test", wa: "+62 812 5555 6666", dob: "2006-06-06", nat: "ID", inst: "SMA Example 2", level: "high_school" };
    {
      const page = await newPage();
      await login(page, G.email, "/apply?pathway=fully_funded");
      await apply(page, { pathway: "fully_funded", leader: G });
      await payOnline(page, "Elco Pro", "settlement");
      await page.getByText("Payment verified").waitFor({ timeout: 30_000 });
      await waitDb(async () => (await one("select f.status from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.email = $1", [G.email])).status === "activated");
      const fg = await one("select f.* from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.email = $1", [G.email]);
      check("Elco grant right after payment (Elco up); no account yet → reserved for sign-up", fg.status === "activated" && (fg.notes ?? "").startsWith("Reserved on Elco"));
      await page.goto("/portal");
      check("portal tells the delegate to sign up on Elco with that email", (await page.locator("body").innerText()).includes(`Sign up on Elco with ${G.email}`));
      await page.context().close();
      await fetch(`${mt}/__control/elco`, { method: "POST", body: JSON.stringify({ mode: "down" }) });
    }
    {
      const r = await one("select settings from gif.cohorts where is_current");
      await db.query("update gif.cohorts set settings = $1 where is_current", [JSON.stringify({ ...(r.settings ?? {}), dates: savedDates })]);
    }

    // ── Combined accounts: sign in with an IELSco account ─────────────────────────────────────────────────────────
    {
      const page = await newPage();
      await page.goto("/login");
      await page.getByText("Other ways to sign in (email code)").click();
      await page.getByRole("tab", { name: "IELSco account" }).click();
      await page.getByLabel("IELSco email").fill(A.email);
      await page.getByLabel("Password").fill("wrong-password");
      await page.getByRole("button", { name: "Sign in with IELSco" }).click();
      await page.getByText("That IELSco email or password is not correct.").waitFor();
      check("wrong IELSco password refused", page.url().includes("/login"));
      await page.getByLabel("Password").fill("ielsco-pass-1");
      await page.getByRole("button", { name: "Sign in with IELSco" }).click();
      await page.waitForURL(/\/portal/);
      const acct = await one("select ielsco_user_id from gif.accounts where email = $1", [A.email]);
      check("IELSco sign-in links the existing GIF account (application kept)", acct.ielsco_user_id === "11111111-1111-4111-8111-111111111111" && (await page.locator("body").innerText()).includes("Confirmed Participant"));
      await page.context().close();
      const p2 = await newPage();
      await p2.goto("/login");
      await p2.getByText("Other ways to sign in (email code)").click();
      await p2.getByRole("tab", { name: "IELSco account" }).click();
      await p2.getByLabel("IELSco email").fill("unconfirmed@example.test");
      await p2.getByLabel("Password").fill("ielsco-pass-3");
      await p2.getByRole("button", { name: "Sign in with IELSco" }).click();
      await p2.getByText(/Confirm your IELSco email/).waitFor();
      check("unconfirmed IELSco email refused", !(await one("select 1 from gif.accounts where email = 'unconfirmed@example.test'")));
      await p2.context().close();
    }

    // ── Legal pages: Bahasa Indonesia primary, English translation, decided refund terms ───────────────────────────
    {
      const page = await newPage();
      await page.goto("/refund-policy");
      const t = await page.locator("body").innerText();
      check("refund policy in Bahasa Indonesia with English translation", t.includes("Kebijakan Pengembalian Dana") && t.includes("English translation") && t.includes("75%") && t.includes("Sesi 4"));
      const r = await page.goto("/parental-consent");
      check("parental consent document published", r.status() === 200 && (await page.locator("body").innerText()).includes("Persetujuan Orang Tua/Wali"));
      await page.goto("/payment-terms");
      const pt = await page.locator("body").innerText();
      check("payment terms quote Super Early Bird USD 799 / IDR 13,000,000, Regular USD 999 / IDR 17,000,000 and 30 Juni 2027", ["USD 799", "IDR 13.000.000", "USD 999", "IDR 17.000.000"].every((x) => pt.includes(x) || pt.includes(x.replace(/\./g, ","))) && pt.includes("30 Juni 2027") && !pt.includes("tidak tersedia"));
      await page.context().close();
    }

    // ── Cron and mobile ────────────────────────────────────────────────────────────────────────────────────────────
    {
      let r = await fetch(`${base}/api/cron/daily`);
      check("cron refuses without secret", r.status === 401);
      r = await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      check("cron runs with secret", r.status === 200, await r.text());
      const page = await newPage({ width: 375, height: 812 });
      for (const p of ["/", "/opportunities", "/mentoring", "/refund-policy"]) {
        await page.goto(p);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        check(`mobile ${p}: no horizontal scroll`, over <= 1, `overflow ${over}px`);
      }
      await page.goto("/");
      await page.screenshot({ path: join(shots, "mobile-home.png"), fullPage: false });
      await page.getByRole("button", { name: "Menu" }).click();
      check("mobile menu opens with all nav items", (await page.locator("#mobile-nav a").count()) >= 9);
      await login(page, A.email);
      await page.screenshot({ path: join(shots, "mobile-portal.png"), fullPage: true });
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check("mobile portal: no horizontal scroll", over <= 1, `overflow ${over}px`);
      await page.context().close();
    }
    // ── IELSco single sign-on + GIF workspace in the IELSco dashboard (21 Nov 2026) ─────────────────────────────────
    {
      const SECRET = env.IELSCO_GIF_SSO_SECRET;
      const uuid = () => crypto.randomUUID();
      const ws = async (sub, email, secret = SECRET) => {
        const body = JSON.stringify({ sub, email });
        const r = await fetch(`${base}/api/integrations/ielsco/workspace`, { method: "POST", headers: { "Content-Type": "application/json", "X-IELSco-Signature": signWorkspaceRequest(secret, body) }, body });
        return { status: r.status, json: await r.json().catch(() => null) };
      };
      const page = await newPage();
      await page.goto("/login?next=%2Fapply");
      const sso = page.getByRole("link", { name: "Continue with your IELSco account" });
      check("login: IELSco account is the main way in", (await sso.getAttribute("href")) === "http://ielsco.example.test/api/gif/sso?next=%2Fapply");
      // Applicant A (email-code account, linked to this IELSco user by the password test above) arrives from the IELSco
      // dashboard: same GIF account, same link, no new account.
      const aSub = "11111111-1111-4111-8111-111111111111";
      const before = await one("select id from gif.accounts where email = $1", [A.email]);
      const t = signSsoToken(SECRET, { sub: aSub, email: A.email.toUpperCase() });
      await page.goto(`/sso?t=${encodeURIComponent(t)}&next=%2Fportal%2Fpayments`);
      check("SSO: lands on the requested GIF page signed in", new URL(page.url()).pathname === "/portal/payments", page.url());
      const after = await one("select id, ielsco_user_id from gif.accounts where email = $1", [A.email]);
      check("SSO: existing GIF account linked to the IELSco user id, not duplicated", after.id === before.id && after.ielsco_user_id === aSub && (await one("select count(*)::int as n from gif.accounts where email = $1", [A.email])).n === 1);
      // Refusals, checked on the redirect itself (a browser that is already signed in would be forwarded to /portal).
      const hop = async (token) => (await fetch(`${base}/sso?t=${encodeURIComponent(token)}&next=%2Fportal`, { redirect: "manual" })).headers.get("location") ?? "";
      check("SSO: a token works once", (await hop(t)).includes("sso=used"));
      const parts = t.split(".");
      check("SSO: a forged token is refused", (await hop(`${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}AA`)).includes("sso=bad_signature"));
      check("SSO: an email linked to another IELSco user is refused", (await hop(signSsoToken(SECRET, { sub: uuid(), email: A.email }))).includes("sso=conflict"));
      check("SSO: an expired token is refused", (await hop(signSsoToken(SECRET, { sub: aSub, email: A.email }, Date.now() - 10 * 60_000))).includes("sso=expired"));
      await page.context().close();
      // A brand-new IELSco member: one GIF account created and linked on first visit.
      const nSub = uuid(), nEmail = "new.ielsco.member@example.test";
      const p2 = await newPage();
      await p2.goto(`/sso?t=${encodeURIComponent(signSsoToken(SECRET, { sub: nSub, email: nEmail }))}&next=%2Fapply%3Fpathway%3Dself_funded`);
      check("SSO: new IELSco member goes straight to the application", new URL(p2.url()).pathname === "/apply", p2.url());
      check("SSO: new GIF account carries the IELSco user id", !!(await one("select 1 from gif.accounts where email = $1 and ielsco_user_id = $2", [nEmail, nSub])));
      await p2.context().close();
      // Workspace summary for the IELSco dashboard.
      const wa = await ws(aSub, A.email);
      const appA = await appOf(A.email);
      check("workspace: A's application, pathway and status", wa.status === 200 && wa.json.application?.code === appA.code && wa.json.application?.pathway === "fully_funded", JSON.stringify(wa.json?.application));
      check("workspace: pathway-specific progress (Fully Funded has Phase 2)", wa.json.steps.some((x) => x.key === "p2") && !wa.json.steps.some((x) => x.key === "mentoring"));
      check("workspace: payments and history included", wa.json.obligations.length > 0 && Array.isArray(wa.json.payments));
      check("workspace: registration availability per pathway", wa.json.pathways.length === 3 && wa.json.pathways.every((x) => typeof x.open === "boolean" && x.opensAt));
      const wn = await ws(nSub, nEmail);
      check("workspace: no application yet → start action", wn.status === 200 && wn.json.application === null && wn.json.actions[0]?.href === "/apply");
      const stranger = await ws(uuid(), "stranger@example.test");
      check("workspace: unknown person gets no one else's data", stranger.status === 200 && stranger.json.account === null && stranger.json.application === null);
      check("workspace: wrong signature refused", (await ws(aSub, A.email, "x".repeat(40))).status === 401);

      // The IELSco Dashboard is the participant entry point: signed-out /apply goes there (pathway kept).
      const ap = await fetch(`${base}/apply?pathway=mentoring`, { redirect: "manual" });
      check("signed-out /apply → IELSco dashboard with the pathway", [303, 307, 308].includes(ap.status) && ap.headers.get("location") === "http://ielsco.example.test/dashboard/gif?pathway=mentoring", `${ap.status} ${ap.headers.get("location")}`);
      // Participant emails point to the dashboard / open GIF pages through IELSco sign-in; nothing links to a Google Form.
      const mails = await all("select template, html, text_body from gif.email_outbox where template in ('application_submitted', 'payment_received', 'team_invite')");
      check("participant emails link to the IELSco dashboard", mails.length > 0 && mails.every((m) => m.html.includes("http://ielsco.example.test/")), mails.map((m) => m.template).join(","));
      check("payment emails open receipts through IELSco sign-in", mails.filter((m) => m.template === "payment_received").every((m) => m.html.includes("http://ielsco.example.test/api/gif/sso?next=%2Fportal%2Freceipts%2F")));
      check("no Google Forms anywhere in sent emails", !(await one("select 1 from gif.email_outbox where html ~* '(forms\\.gle|docs\\.google\\.com/forms)'")));
      const unsigned = await fetch(`${base}/api/integrations/ielsco/workspace`, { method: "POST", body: JSON.stringify({ sub: aSub, email: A.email }) });
      check("workspace: unsigned request refused", unsigned.status === 401);
    }

    check("analytics funnel recorded server events", (await one("select count(*)::int as n from gif.analytics_events where event in ('application_completed', 'payment_succeeded')")).n >= 3);
    check("analytics stores no IP or email", !(await one("select 1 from gif.analytics_events where props::text like '%@%'")));
  } catch (e) {
    if (lastPage) await lastPage.screenshot({ path: join(shots, "crash.png"), fullPage: true }).catch(() => {});
    check("scenario crashed", false, `${String(e.message ?? e).split("\n")[0]} @ ${(e.stack ?? "").split("\n").filter((l) => l.includes("scenarios.mjs")).join(" | ")}`);
  } finally {
    await browser.close();
    await db.end();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  writeFileSync(join(shots, "e2e-results.json"), JSON.stringify(results, null, 2));
  return failed.length;
}
