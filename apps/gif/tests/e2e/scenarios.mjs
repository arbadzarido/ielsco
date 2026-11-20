// End-to-end scenarios (run by tests/e2e/run.mjs). Fictional people, example.test emails, sandbox fake Midtrans only.
import { chromium } from "playwright";
import pg from "pg";
import crypto from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
    await scope.getByLabel("Relationship").fill("Parent");
    await scope.getByLabel("Phone (with country code)").fill("+62 812 0000 0001");
  }
  async function apply(page, { pathway, team, leader, members = [], selfFunded = false }) {
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
  async function payOnline(page, rowText, outcome = "settlement") {
    await page.goto("/portal/payments");
    const row = page.locator("tr", { hasText: rowText }).first();
    await row.getByRole("button", { name: /Pay online|Continue payment/ }).click();
    await page.waitForURL(/127\.0\.0\.1:3499\/pay\//);
    await page.locator(`#pay-${outcome}`).click();
    await page.waitForURL(/\/portal\/payments\/return/);
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
      check("home shows Apply Now + Explore Opportunities", text.includes("Apply Now") && text.includes("Explore Opportunities"));
      check("home marks universities as planned", text.includes("Planned engagement") && !/Confirmed partner/i.test(text));
      check("home shows mentor placeholders, no invented names", (text.match(/Mentor profile coming soon/g) ?? []).length === 5);
      check("home has no fabricated testimonials", text.includes("Delegate stories from GIF 2026 will appear here"));
      const css = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; } }).join(" "));
      check("no yellow in CSS palette", !css.toLowerCase().includes("f9e15b") && !css.includes("rgb(249, 225, 91)"));
      await page.getByRole("radio", { name: "Indonesian citizens (IDR)" }).first().check();
      check("currency toggle shows IDR prices", (await page.locator("body").innerText()).includes("IDR 15,000,000"));
      // Sponsorship form
      await page.goto("/sponsorship");
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
      check("A has one Elco Pro obligation of IDR 99,000", ob && Number(ob.amount) === 99000 && ob.currency === "IDR");
      check("registration email sent", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'application_submitted'", [A.email])));
      check("consents recorded with version + IP", (await one("select count(*)::int as n from gif.consents c join gif.accounts a on a.id = c.account_id where a.email = $1 and document_version like '2026-11-25%'", [A.email])).n >= 7);
      // Duplicate application attempt
      await page.goto("/apply");
      check("second application redirected to portal", page.url().endsWith("/portal"));
      // Pay: return URL alone never marks paid. Start checkout, come back via finish URL without paying.
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: "Pay online" }).click();
      await page.waitForURL(/\/pay\//);
      const order1 = page.url().split("/pay/")[1];
      await page.goto(`/portal/payments/return?order_id=${order1}&transaction_status=settlement&status_code=200`);
      await page.waitForTimeout(2500);
      check("forged return URL does not mark paid", (await obligation(A.email, "elco_pro")).status === "open");
      // Double click → same checkout reused (no second order)
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: /Pay online|Continue payment/ }).click();
      await page.waitForURL(/\/pay\//);
      check("second click reuses the live checkout", page.url().split("/pay/")[1] === order1);
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

    // ── B. Team Self-Funded: Indonesian leader + Malaysian member ───────────────────────────────────────────────────
    const B = { name: "Budi Santoso", email: "budi@example.test", wa: "+62 813 3333 4444", dob: "2004-08-01", nat: "ID", inst: "Universitas Example", level: "undergraduate" };
    const M = { name: "Nur Aisyah", email: "aisyah@example.test", wa: "+60 12 345 6789", dob: "2005-01-20", nat: "MY", inst: "Universiti Example", level: "undergraduate" };
    {
      const page = await newPage();
      await login(page, B.email, "/apply?pathway=self_funded");
      await apply(page, { pathway: "self_funded", team: "River Keepers", leader: B, members: [M], selfFunded: true });
      const app = await appOf(B.email);
      check("team self-funded submitted with 2 participants", app.mode === "team" && (await one("select count(*)::int as n from gif.participants where application_id = $1", [app.id])).n === 2);
      const dl = await obligation(B.email, "deposit"), bl = await obligation(B.email, "balance");
      const dm = await obligation(M.email, "deposit");
      check("leader IDR deposit 5,000,000 + balance 10,000,000", Number(dl.amount) === 5000000 && dl.currency === "IDR" && Number(bl.amount) === 10000000);
      check("member USD deposit 300 (no FX conversion)", Number(dm.amount) === 300 && dm.currency === "USD");
      check("team invite email to member", !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'team_invite'", [M.email])));
      await page.goto("/portal/payments");
      check("balance blocked until deposit paid", (await page.locator("tr", { hasText: "balance" }).first().innerText()).includes("Pay the deposit first"));
      // Payment failure path
      await payOnline(page, "Self-Funded deposit", "deny");
      await page.getByText("The payment failed").waitFor({ timeout: 30_000 });
      check("denied payment → failed, obligation still open", (await obligation(B.email, "deposit")).status === "open" && !!(await one("select 1 from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'failed'", [B.email])));
      // Expired path via webhook from fake gateway (pending → expire)
      await payOnline(page, "Self-Funded deposit", "pending");
      const pend = await one("select order_id from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'pending'", [B.email]);
      check("pending payment → Payment Verification", (await appOf(B.email)).status === "payment_verification");
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: pend.order_id, transaction_status: "expire", notify: true }) });
      await new Promise((r) => setTimeout(r, 1000));
      check("expired payment → failed email + back to Awaiting Payment", (await one("select status from gif.payments where order_id = $1", [pend.order_id])).status === "expired" && (await appOf(B.email)).status === "awaiting_payment"
        && !!(await one("select 1 from gif.email_outbox where to_email = $1 and template = 'payment_failed'", [B.email])));
      // Amount mismatch is never accepted
      await payOnline(page, "Self-Funded deposit", "pending");
      const pend2 = await one("select order_id from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'pending' order by p.created_at desc limit 1", [B.email]);
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: pend2.order_id, transaction_status: "settlement", gross_amount: "5000.00", notify: true }) });
      await new Promise((r) => setTimeout(r, 1000));
      check("amount mismatch not marked paid (audited)", (await obligation(B.email, "deposit")).status === "open" && !!(await one("select 1 from gif.audit_log where action = 'payment_amount_mismatch'")));
      await fetch(`${mt}/__control/set`, { method: "POST", body: JSON.stringify({ order_id: pend2.order_id, transaction_status: "settlement", gross_amount: "5000000.00", notify: true }) });
      await new Promise((r) => setTimeout(r, 1000));
      check("leader deposit settled → seat confirmed", (await one("select seat_status from gif.participants where email = $1", [B.email])).seat_status === "confirmed");
      check("app not confirmed until every member's deposit is verified", (await appOf(B.email)).status !== "confirmed_participant");
      await page.context().close();

      // Member signs in: sees team, accepts terms, sees only own obligations, requests USD invoice
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
      check("member sees only own USD obligations", mtext.includes("USD 300") && !mtext.includes("IDR 5,000,000"));
      await mp.locator("tr", { hasText: "deposit" }).getByRole("button", { name: "Request invoice" }).click();
      await mp.getByText("Invoice requested").waitFor();
      check("invoice request emailed to finance", !!(await one("select 1 from gif.email_outbox where template = 'invoice_request'")));
      // Member can't open the leader's receipt
      const leaderPay = await one("select p.id from gif.payments p join gif.participants x on x.id = p.participant_id where x.email = $1 and p.status = 'paid'", [B.email]);
      const rr = await mp.goto(`/portal/receipts/${leaderPay.id}`);
      check("member cannot open leader's receipt", rr.status() === 404);
      const ad = await mp.goto("/admin");
      check("candidate cannot open admin", !mp.url().includes("/admin") || ad.status() === 404);
      const ex = await mp.request.get("/api/admin/export?type=applicants");
      check("candidate cannot export CSV", ex.status() === 403);
      await mp.context().close();

      // Finance records the member's USD deposit manually (audited)
      const fp = await newPage();
      await login(fp, "finance@example.test", "/admin");
      await fp.goto(`/admin/applicants/${app.id}`);
      const row = fp.locator("tr", { hasText: "Self-Funded deposit" }).filter({ hasText: "Nur Aisyah" });
      await row.getByText("Record manual payment").click();
      await row.getByLabel("Bank reference / proof").fill("SWIFT-REF-E2E-001");
      await row.getByRole("button", { name: "Record payment" }).click();
      await waitDb(async () => (await obligation(M.email, "deposit")).status === "paid");
      const appB = await appOf(B.email);
      check("manual USD deposit → team Confirmed Participant", appB.status === "confirmed_participant", appB.status);
      check("manual payment audited", !!(await one("select 1 from gif.audit_log where action = 'manual_payment_recorded' and actor = 'finance@example.test'")));
      check("onboarding emails sent to both", (await one("select count(*)::int as n from gif.email_outbox where template = 'onboarding' and application_id = $1", [app.id])).n === 2);
      // Wrong manual amount refused
      const brow = fp.locator("tr", { hasText: "Self-Funded balance" }).filter({ hasText: "Nur Aisyah" });
      await brow.getByText("Record manual payment").click();
      await brow.getByLabel("Amount (USD)").fill("100");
      await brow.getByLabel("Bank reference / proof").fill("PARTIAL");
      await brow.getByRole("button", { name: "Record payment" }).click();
      await brow.getByText(/must equal the obligation/).waitFor();
      check("partial manual payment refused", (await obligation(M.email, "balance")).status === "open");
      await fp.context().close();

      // Leader pays the balance online; then a duplicate payment is detected and refunded
      const lp = await newPage();
      await login(lp, B.email);
      await payOnline(lp, "Self-Funded balance", "settlement");
      await lp.getByText("Payment verified").waitFor({ timeout: 30_000 });
      check("leader balance paid", (await obligation(B.email, "balance")).status === "paid");
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
      await page.waitForURL(/\/pay\//);
      const o1 = decodeURIComponent(page.url().split("/pay/")[1]);
      await db.query("update gif.payments set checkout_expires_at = now() - interval '1 minute' where order_id = $1", [o1]); // first tab left open too long
      await page.goto("/portal/payments");
      await page.locator("tr", { hasText: "Elco Pro" }).getByRole("button", { name: /Pay online|Continue payment/ }).click();
      await page.waitForURL(/\/pay\//);
      const o2 = decodeURIComponent(page.url().split("/pay/")[1]);
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
      check("mentoring USD 80 Early Bird obligation", Number(ob.amount) === 80 && ob.currency === "USD", `${ob.amount} ${ob.currency}`);
      await page.goto("/portal/payments");
      check("USD payer offered invoice, not a converted IDR charge", (await page.locator("tr", { hasText: "Mentoring" }).innerText()).includes("Request invoice"));
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
      check("mentee cashback USD 50 pending verification", cb && Number(cb.amount) === 50 && cb.currency === "USD" && cb.status === "pending_verification");
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

    // ── Cron and mobile ────────────────────────────────────────────────────────────────────────────────────────────
    {
      let r = await fetch(`${base}/api/cron/daily`);
      check("cron refuses without secret", r.status === 401);
      r = await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
      check("cron runs with secret", r.status === 200, await r.text());
      const page = await newPage({ width: 375, height: 812 });
      for (const p of ["/", "/opportunities", "/mentoring", "/apply", "/refund-policy"]) {
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
