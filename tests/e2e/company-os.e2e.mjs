// Company OS end-to-end security test: host isolation, Google-only sign-in, the approved-account allowlist, sessions,
// admin actions and RLS, in a real browser against a production build and a REAL Postgres with the migrations applied.
//
// Stack (see tests/e2e/company-os/README.md):
//   Postgres 16 database os_e2e  <- tests/e2e/company-os/setup-db.sql + both Company OS migrations
//   node tests/e2e/company-os/gateway.mjs        (:54399, Supabase Auth + PostgREST stand-in, real roles and RLS)
//   next start -p 3000 built with IELSCO_LOCAL_SUPABASE_URL=http://localhost:54399
// Usage: node tests/e2e/company-os.e2e.mjs [screenshot dir]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const OUT = process.argv[2] || "./os-e2e-shots";
mkdirSync(OUT, { recursive: true });
const OS = "http://os.localhost:3000";
const PUBLIC = "http://localhost:3000";
const GW = "http://localhost:54399";

let pass = 0, fail = 0;
const results = [];
const check = (name, cond, detail = "") => { (cond ? pass++ : fail++); results.push(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` -> ${detail}` : ""}`); console.log(results.at(-1)); };
const sql = (q) => execFileSync("sudo", ["-u", "postgres", "psql", "-d", "os_e2e", "-tAqc", q], { encoding: "utf8" }).trim();

// Raw HTTP with an explicit Host header and no redirect following.
const raw = (host, path, { method = "GET", headers = {} } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: "127.0.0.1", port: 3000, path, method, headers: { host, "user-agent": "Mozilla/5.0 e2e", ...headers } }, (res) => {
    let body = ""; res.on("data", (c) => (body += c)); res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location ?? null, body }));
  });
  req.on("error", reject); req.end();
});

// ── Seed the approved registry ──────────────────────────────────────────────────────────────────────────────────────
sql(`truncate public.os_login_events, public.os_revoked_sessions, public.os_audit_log;
  delete from public.os_grants; delete from public.os_person_divisions; delete from public.os_person_companies;
  alter table public.os_people disable trigger os_people_before_delete; delete from public.os_people; alter table public.os_people enable trigger os_people_before_delete;
  delete from auth.users;
  insert into public.os_people (id, full_name, org_role, status, google_account) values
    ('PPL-0001', 'Founder Test', 'founder', 'active', 'founder@ielsco.test'),
    ('PPL-0002', 'IELSco Member', 'member', 'active', 'member.iel@ielsco.test'),
    ('PPL-0003', 'Elco Member', 'member', 'active', 'member.elc@ielsco.test'),
    ('PPL-0004', 'Invited Person', 'member', 'invited', 'invited@ielsco.test'),
    ('PPL-0005', 'Suspended Person', 'member', 'suspended', 'suspended@ielsco.test'),
    ('PPL-0006', 'Unverified Person', 'member', 'active', 'unverified@ielsco.test');
  insert into public.os_person_companies values ('PPL-0001','HQ'),('PPL-0001','IEL'),('PPL-0001','ELC'),('PPL-0002','IEL'),('PPL-0003','ELC'),('PPL-0004','IEL'),('PPL-0005','IEL'),('PPL-0006','IEL');
  insert into public.os_person_divisions values ('PPL-0002','DIV-04',false),('PPL-0003','DIV-03',false);`);

const browser = await chromium.launch();
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function signIn(google, { ua = UA } = {}) {
  const ctx = await browser.newContext({ userAgent: ua, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ verified: true, ...google }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const accessToken = async (ctx) => {
  const c = (await ctx.cookies(OS)).filter((x) => x.name.startsWith("sb-localhost-auth-token") && !x.name.includes("verifier")).sort((a, b) => a.name.localeCompare(b.name));
  if (!c.length) return null;
  let v = c.map((x) => x.value).join("");
  if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString();
  return JSON.parse(v).access_token;
};
const restAs = (token, path, init = {}) => fetch(`${GW}/rest/v1/${path}`, { ...init, headers: { apikey: token, authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });

// ── 1. Host isolation (no browser state) ────────────────────────────────────────────────────────────────────────────
{
  const r = await raw("os.localhost:3000", "/");
  check("OS host / redirects into /os", r.status === 307 && r.location?.endsWith("/os"), JSON.stringify(r));
  const d = await raw("os.localhost:3000", "/dashboard");
  check("OS host /dashboard goes to the Company OS, not the member dashboard", d.status === 307 && d.location?.endsWith("/os"), JSON.stringify(d));
  const os = await raw("os.localhost:3000", "/os");
  check("signed-out /os redirects to the Company OS sign-in", os.status === 307 && os.location?.endsWith("/os/login"), JSON.stringify(os));
  const adm = await raw("os.localhost:3000", "/os/admin");
  check("signed-out /os/admin redirects to the Company OS sign-in", adm.status === 307 && adm.location?.endsWith("/os/login"), JSON.stringify(adm));
  const su = await raw("os.localhost:3000", "/sign-up");
  check("OS host /sign-up is not the public sign-up", su.status === 307 && su.location?.endsWith("/os/sign-up"), JSON.stringify(su));
  const su2 = await raw("os.localhost:3000", "/os/sign-up");
  check("…and /os/sign-up is a Company OS 404", su2.status === 404 && su2.body.includes("os-not-found") && !/create an account|sign up/i.test(su2.body.replace(/\/os\/sign-up/g, "")), `status ${su2.status}`);
  const unk = await raw("os.localhost:3000", "/os/no-such-page");
  check("unknown OS route is a Company OS 404", unk.status === 404 && unk.body.includes("os-not-found"), `status ${unk.status}`);
  const dsub = await raw("os.localhost:3000", "/os/dashboard/admin/stories");
  check("public dashboard sub-pages 404 on the OS host", dsub.status === 404 && dsub.body.includes("os-not-found"), `status ${dsub.status}`);
  const api = await raw("os.localhost:3000", "/api/membership/plans");
  check("public APIs are not served on the OS host", api.status === 404 && api.body.includes("Not found"), JSON.stringify(api).slice(0, 120));
  const pubOs = await raw("localhost:3000", "/os");
  check("public host /os is a 404", pubOs.status === 404 && !pubOs.body.includes("os-login"), `status ${pubOs.status}`);
  const pubOsLogin = await raw("localhost:3000", "/os/login");
  check("public host /os/login is a 404", pubOsLogin.status === 404, `status ${pubOsLogin.status}`);
  const pubDash = await raw("localhost:3000", "/dashboard");
  check("public host /dashboard keeps its sign-in redirect", pubDash.status === 307 && pubDash.location?.includes("/sign-in"), JSON.stringify(pubDash));
  const pubSignUp = await raw("localhost:3000", "/sign-up");
  check("public host /sign-up still works", pubSignUp.status === 200 && !pubSignUp.body.includes("os-login"), `status ${pubSignUp.status}`);
  const pubSignIn = await raw("localhost:3000", "/sign-in");
  check("public host /sign-in still works", pubSignIn.status === 200, `status ${pubSignIn.status}`);
  const home = await raw("localhost:3000", "/about");
  check("public pages still render", home.status === 200, `status ${home.status}`);
}

// ── 2. Sign-in page ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(`${OS}/`);
  check("visitor at os host / lands on the Company OS sign-in", new URL(page.url()).pathname === "/os/login" && await page.getByTestId("os-login").isVisible());
  const text = await page.locator("body").innerText();
  check("sign-in page has no sign-up or registration", !/sign up|create (an )?account|register/i.test(text), text.slice(0, 200));
  check("sign-in page offers only Google", await page.getByTestId("os-google-signin").isVisible() && (await page.locator("input[type=password], input[type=email]").count()) === 0);
  check("sign-in page shows no public site header", (await page.locator("header nav a[href='/sign-up']").count()) === 0);
  await page.screenshot({ path: `${OUT}/01-login.png`, fullPage: true });
  await page.goto(`${OS}/os/login?error=denied`);
  check("denied message is generic", (await page.getByTestId("os-login-notice").innerText()).includes("doesn't have access"));
  await page.screenshot({ path: `${OUT}/02-login-denied.png`, fullPage: true });
  await ctx.close();
}

// ── 3. Refused accounts ─────────────────────────────────────────────────────────────────────────────────────────────
const refused = [
  ["random Gmail account", { email: "random.person@gmail.com" }, "not_allowlisted"],
  ["Google account with unverified email", { email: "unverified@ielsco.test", verified: false }, "email_unverified"],
  ["verified but not approved (invited)", { email: "invited@ielsco.test" }, "awaiting_approval"],
  ["approved but suspended", { email: "suspended@ielsco.test" }, "suspended"],
];
for (const [label, google, reason] of refused) {
  const { ctx, page } = await signIn(google);
  const u = new URL(page.url());
  check(`${label}: refused at sign-in`, u.pathname === "/os/login" && u.searchParams.get("error") === "denied", page.url());
  check(`${label}: no session left in the browser`, (await accessToken(ctx)) === null);
  const body = await page.locator("body").innerText();
  check(`${label}: sees no internal data`, !/Founder Test|IELSco Member|DIV-0|Workspaces/.test(body));
  const rec = sql(`select success || ':' || reason from public.os_login_events where email = '${google.email}' order by id desc limit 1`);
  check(`${label}: attempt recorded as refused (${reason})`, rec === `false:${reason}`, rec);
  const sessions = sql(`select count(*) from auth.sessions s join auth.users u on u.id = s.user_id where u.email = '${google.email}'`);
  check(`${label}: its Supabase session was ended`, sessions === "0", sessions);
  await page.goto(`${OS}/os`);
  check(`${label}: /os still sends them to sign-in`, new URL(page.url()).pathname === "/os/login");
  await ctx.close();
}

// ── 4. Approved IELSco member ───────────────────────────────────────────────────────────────────────────────────────
const member = await signIn({ email: "member.iel@ielsco.test" });
{
  const { page, ctx } = member;
  check("approved member lands in the Company OS", new URL(page.url()).pathname === "/os" && await page.getByTestId("os-shell").isVisible(), page.url());
  check("member's home shows their record", (await page.locator("body").innerText()).includes("Hi, IELSco"));
  await page.screenshot({ path: `${OUT}/03-member-home.png`, fullPage: true });
  await page.goto(`${OS}/admin`);
  await page.getByText("Founders only").waitFor({ timeout: 15000 }).catch(() => {});
  check("member opening /admin is refused", new URL(page.url()).pathname === "/os/admin" && (await page.locator("body").innerText()).includes("Founders only"));
  check("…and no admin data is loaded", !(await page.locator("body").innerText()).includes("Invite someone"));
  const token = await accessToken(ctx);
  const hist = await (await restAs(token, "rpc/os_login_history", { method: "POST", body: "{}" })).json();
  check("member calling login history API directly gets only their own sign-ins", Array.isArray(hist) && hist.length >= 1 && hist.every((e) => e.email === "member.iel@ielsco.test"), JSON.stringify(hist).slice(0, 200));
  const recArgs = { p_user: "00000000-0000-0000-0000-000000000000", p_session: null, p_success: true, p_reason: "ok", p_provider: "google", p_ip: "1.1.1.1", p_user_agent: "x", p_browser: "x", p_browser_version: "1", p_os: "x", p_device_type: "desktop", p_device_profile: "x", p_country: null, p_region: null, p_city: null };
  const rec = await restAs(token, "rpc/os_record_login", { method: "POST", body: JSON.stringify(recArgs) });
  check("member cannot call the server-only login recorder", rec.status === 403 && (await rec.json()).message.includes("permission denied"), `status ${rec.status}`);
  const why = await restAs(token, "rpc/os_access_reason", { method: "POST", body: JSON.stringify({ p_user: "00000000-0000-0000-0000-000000000000" }) });
  check("member cannot probe the registry", why.status !== 200, `status ${why.status}`);
  await restAs(token, "os_people?id=eq.PPL-0002", { method: "PATCH", body: JSON.stringify({ org_role: "founder" }) });
  check("member modifying their own role via the API has no effect", sql("select org_role from public.os_people where id = 'PPL-0002'") === "member");
  await restAs(token, "os_people?id=eq.PPL-0004", { method: "PATCH", body: JSON.stringify({ status: "active" }) });
  check("member approving someone via the API has no effect", sql("select status from public.os_people where id = 'PPL-0004'") === "invited");
  const ins = await restAs(token, "os_person_companies", { method: "POST", body: JSON.stringify({ person_id: "PPL-0002", company_code: "ELC" }) });
  check("member adding themselves to Elco is refused", ins.status >= 400 && sql("select count(*) from public.os_person_companies where person_id = 'PPL-0002'") === "1", `status ${ins.status}`);
  const audit = await (await restAs(token, "os_audit_log?select=id")).json();
  check("member reading the audit log gets nothing", Array.isArray(audit) && audit.length === 0, JSON.stringify(audit).slice(0, 100));
  const ev = await restAs(token, "os_login_events?select=*");
  check("member reading login events table directly is refused", ev.status === 403, `status ${ev.status}`);
  const elcoInternal = await (await restAs(token, "rpc/os_can_view", { method: "POST", body: JSON.stringify({ p_company: "ELC", p_division: null, p_sensitivity: "Internal", p_resource_type: "document", p_resource_id: "D1" }) })).json();
  check("IELSco member cannot view Elco Internal", elcoInternal === false, JSON.stringify(elcoInternal));
  const restricted = await (await restAs(token, "rpc/os_can_view", { method: "POST", body: JSON.stringify({ p_company: "IEL", p_division: "DIV-04", p_sensitivity: "Restricted", p_resource_type: "document", p_resource_id: "D2" }) })).json();
  check("member cannot view Restricted, even in their own division", restricted === false);
  await page.goto(`${OS}/os/documents/DOC-0001`);
  await page.getByText("Document not found").waitFor();
  check("opening a document the member can't see shows a generic not-found", true);
  await page.goto(`${OS}/os/account`);
  await page.getByTestId("my-session").first().waitFor();
  check("member sees their own session on My account", (await page.getByTestId("my-session").count()) >= 1 && (await page.locator("body").innerText()).includes("This browser"));
  await page.screenshot({ path: `${OUT}/04-my-account.png`, fullPage: true });
  const anonHist = await fetch(`${GW}/rest/v1/rpc/os_login_history`, { method: "POST", headers: { apikey: process.env.E2E_ANON_KEY, authorization: `Bearer ${process.env.E2E_ANON_KEY}`, "content-type": "application/json" }, body: "{}" });
  check("anonymous call to the login history API is refused", anonHist.status >= 400, `status ${anonHist.status}`);
}

// ── 4b. Work modules as the IELSco member (Creative, DIV-04) ───────────────────────────────────────────────────────────
{
  const { page, ctx } = member;
  const text = async () => page.locator("body").innerText();
  // Projects and tasks
  await page.goto(`${OS}/os/projects`);
  await page.getByTestId("os-new-project").click();
  await page.getByTestId("os-project-name").fill("Creative brand kit refresh");
  await page.getByTestId("os-project-save").click();
  await page.waitForURL(/\/os\/projects\/PRJ-\d+/);
  const prj = new URL(page.url()).pathname.split("/").pop();
  check("member creates a project; IDs continue the Operations Master sequence", prj === "PRJ-0028", prj);
  check("…owned by them, in their company and division", sql(`select company_code || ':' || coalesce(division_id, '-') || ':' || owner_person_id from public.os_projects where id = '${prj}'`) === "IEL:DIV-04:PPL-0002");
  await page.getByRole("button", { name: "Task", exact: true }).click();
  await page.getByTestId("os-task-title").fill("Draft logo usage guide");
  await page.getByTestId("os-task-save").click();
  await page.locator("text=Draft logo usage guide").first().waitFor();
  const tsk = sql(`select id from public.os_tasks where title = 'Draft logo usage guide'`);
  check("member adds a task to the project (TSK-0081)", tsk === "TSK-0081" && sql(`select project_id from public.os_tasks where id = '${tsk}'`) === prj, tsk);
  await page.screenshot({ path: `${OUT}/10-project.png`, fullPage: true });
  await page.goto(`${OS}/os/tasks?view=board`);
  await page.getByTestId("os-task-board").waitFor();
  check("task board shows the task", (await page.getByTestId("os-task-board").innerText()).includes("Draft logo usage guide"));
  await page.screenshot({ path: `${OUT}/11-board.png`, fullPage: true });
  await page.goto(`${OS}/os/tasks/${tsk}`);
  await page.getByPlaceholder("Add a comment…").fill("Starting with the colour section.");
  await page.getByRole("button", { name: /^Comment/ }).click();
  await page.getByTestId("os-comments").getByText("Starting with the colour section.").waitFor();
  check("member comments on the task", sql(`select count(*) from public.os_comments where entity_id = '${tsk}' and author_person_id = 'PPL-0002'`) === "1");
  check("…and the task's activity is recorded", Number(sql(`select count(*) from public.os_activity where entity_id = '${tsk}'`)) >= 1);

  // Documents: register an existing Drive file (no Drive call; the file stays where it is)
  await page.goto(`${OS}/os/documents`);
  await page.getByTestId("os-new-doc").click();
  const sheet = page.getByRole("dialog", { name: "New document" });
  await sheet.getByRole("radio", { name: "Existing file" }).click();
  await sheet.getByPlaceholder("https://docs.google.com/…").fill("https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit");
  await page.getByTestId("os-doc-title").fill("Brand kit guidelines");
  await sheet.getByLabel("Type").selectOption("SOP");
  await page.getByTestId("os-doc-save").click();
  await page.waitForURL(/\/os\/documents\/DOC-\d+/);
  const doc = new URL(page.url()).pathname.split("/").pop();
  check("member registers an existing Drive file (DOC-0095)", doc === "DOC-0095", doc);
  check("…its Drive file ID is recorded by the server, not the browser", sql(`select drive_file_id from public.os_documents where id = '${doc}'`) === "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789");
  await page.getByLabel("Status").selectOption("Approved");
  await page.getByTestId("os-error").waitFor();
  check("member cannot approve a document", sql(`select status from public.os_documents where id = '${doc}'`) === "Draft" && (await text()).includes("approve"));
  const forged = await restAs(await accessToken(ctx), `os_documents?id=eq.${doc}`, { method: "PATCH", body: JSON.stringify({ drive_file_id: "forged", reference_number: "IEL-SOP-2026-999" }) });
  check("member cannot write Drive or numbering columns through the API", forged.status >= 400 && sql(`select coalesce(reference_number, '-') from public.os_documents where id = '${doc}'`) === "-", `status ${forged.status}`);
  await page.goto(`${OS}/os/documents`);
  await page.getByTestId("os-doc-search").fill("brand kit");
  check("documents search finds it", (await page.getByTestId("os-doc-list").innerText()).includes("Brand kit guidelines"));
  await page.goto(`${OS}/os/projects/${prj}`);
  await page.getByLabel("Document to link").selectOption(doc);
  await page.getByRole("button", { name: "Link" }).click();
  await page.getByTestId("os-linked-docs").getByText("Brand kit guidelines").waitFor();
  check("member links the document to the project", sql(`select count(*) from public.os_document_links where document_id = '${doc}' and entity_id = '${prj}'`) === "1");

  // KPIs, timeline, OKRs, people, reviews, workspaces
  await page.goto(`${OS}/os/kpis`);
  await page.getByTestId("os-kpi-list").waitFor();
  check("KPI dictionary is browsable", (await page.getByTestId("os-kpi-list").innerText()).includes("KPI-0001"));
  await page.goto(`${OS}/os/kpis/KPI-0001`);
  await page.getByTestId("os-kpi-log").waitFor();
  await page.getByLabel("Period", { exact: true }).fill("2026-W45");
  await page.getByLabel("Period ends").fill("2026-11-08");
  await page.getByLabel(/^Value/).fill("12");
  await page.getByRole("button", { name: "Log value" }).click();
  await page.getByTestId("os-error").waitFor();
  check("member who doesn't own a KPI cannot log its value", sql("select count(*) from public.os_kpi_values") === "0");
  await page.goto(`${OS}/os/timeline`);
  await page.getByTestId("os-timeline-year").waitFor();
  const bars = await page.getByTestId("os-timeline-year").locator("button").count();
  check("Master Timeline annual view draws the migrated items", bars >= 90, `bars ${bars}`);
  await page.screenshot({ path: `${OUT}/12-timeline.png`, fullPage: true });
  await page.goto(`${OS}/os/timeline?view=month`);
  await page.waitForFunction(() => document.querySelector("[data-testid=os-timeline-month]") || document.body.innerText.includes("Nothing planned"), null, { timeout: 15000 });
  check("monthly view renders", (await page.getByTestId("os-timeline-month").count()) + ((await text()).includes("Nothing planned") ? 1 : 0) === 1);
  await page.goto(`${OS}/os/okrs`);
  await page.getByText("No objectives yet").waitFor();
  check("OKRs show a useful empty state", true);
  await page.goto(`${OS}/os/people/PPL-0003`);
  await page.getByText("Employment").waitFor();
  await page.waitForLoadState("networkidle");
  check("member cannot see a colleague's employment record", (await text()).includes("Only Elco Member") || (await text()).includes("can see this"));
  await page.goto(`${OS}/os/reviews`);
  await page.getByText("No reviews for you yet").waitFor();
  check("reviews page shows the member's own (none yet)", true);
  await page.goto(`${OS}/os/w/ielsco`);
  await page.getByText("Active projects").first().waitFor();
  check("IELSco workspace overview loads", (await text()).includes("Deadlines in the next 30 days"));
  await page.screenshot({ path: `${OUT}/13-workspace.png`, fullPage: true });
  await page.goto(`${OS}/os/w/elco`);
  await page.getByText("not in this workspace").waitFor({ timeout: 15000 }).catch(() => {});
  check("IELSco member is kept out of the Elco workspace", (await text()).includes("not in this workspace"));

  // AI: budget cap first, then a failed model call is not charged
  sql("update public.os_ai_settings set monthly_budget_usd = 0");
  await page.goto(`${OS}/os/assistant`);
  await page.getByTestId("os-ai-input").fill("What are my tasks?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByTestId("os-error").waitFor({ timeout: 20000 });
  const alertText = await page.getByTestId("os-error").innerText();
  check("with the budget used up the assistant says so and calls no model", alertText.includes("AI budget for this month") && sql("select count(*) from public.os_ai_usage") === "0", alertText);
  sql("update public.os_ai_settings set monthly_budget_usd = 25");
  await page.getByTestId("os-ai-input").fill("What are my tasks?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForFunction(() => document.querySelectorAll("[data-testid=os-error]").length > 0 && !document.body.innerText.includes("Thinking…"), null, { timeout: 60000 }).catch(() => {});
  const usage = sql("select status || ':' || cost_usd::text from public.os_ai_usage order by at desc limit 1");
  check("a model call that fails is recorded as failed and costs nothing", /^(failed:0\.000000|settled:)/.test(usage), usage);
  check("AI conversations belong to the member only", Number(sql("select count(*) from public.os_ai_conversations where person_id = 'PPL-0002'")) >= 1 && sql("select count(*) from public.os_ai_conversations where person_id <> 'PPL-0002'") === "0");
  const tok = await accessToken(ctx);
  const res = await restAs(tok, "rpc/os_ai_reserve", { method: "POST", body: JSON.stringify({ p_person: "PPL-0002", p_agent: "assistant", p_model: "x", p_max_cost: 0.0001 }) });
  check("members cannot reserve AI budget directly", res.status === 403, `status ${res.status}`);
  const setb = await restAs(tok, "os_ai_settings?id=eq.true", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ monthly_budget_usd: 25, per_person_daily_usd: 25 }) });
  const setRows = setb.ok ? await setb.json() : [];
  check("members cannot change the AI budget", Array.isArray(setRows) && setRows.length === 0 && sql("select per_person_daily_usd from public.os_ai_settings") === "2", `status ${setb.status}`);

  // Phones: 360 px wide, drawer navigation, no sideways scrolling
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const pp = await phone.newPage();
  const widths = [];
  for (const path of ["/os", "/os/tasks", `/os/projects/${prj}`, "/os/documents", `/os/documents/${doc}`, "/os/kpis", "/os/timeline", "/os/w/ielsco", "/os/people", "/os/assistant"]) {
    await pp.goto(`${OS}${path}`); await pp.waitForLoadState("networkidle");
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    widths.push(`${path}=${w}`);
    if (w > 362) check(`no sideways scroll at 360 px on ${path}`, false, String(w));
  }
  check("no sideways scroll at 360 px on ten Company OS screens", widths.every((x) => Number(x.split("=")[1]) <= 362), widths.join(" "));
  await pp.goto(`${OS}/os/tasks`);
  await pp.screenshot({ path: `${OUT}/14-phone-tasks.png`, fullPage: true });
  await pp.getByTestId("os-menu-button").click();
  await pp.getByTestId("os-drawer").waitFor();
  await pp.screenshot({ path: `${OUT}/15-phone-drawer.png` });
  await pp.getByTestId("os-drawer").getByRole("link", { name: "Documents" }).click();
  await pp.waitForURL(/\/os\/documents$/);
  check("phone drawer opens and navigates", (await pp.getByTestId("os-drawer").count()) === 0);
  const tgt = await pp.getByTestId("os-menu-button").boundingBox();
  check("menu button is a 40 px touch target", tgt && tgt.width >= 40 && tgt.height >= 40, JSON.stringify(tgt));
  await phone.close();
}

// ── 5. Elco member ──────────────────────────────────────────────────────────────────────────────────────────────────
const elco = await signIn({ email: "member.elc@ielsco.test" }, { ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
{
  const token = await accessToken(elco.ctx);
  const can = async (company, division, sens) => (await (await restAs(token, "rpc/os_can_view", { method: "POST", body: JSON.stringify({ p_company: company, p_division: division, p_sensitivity: sens, p_resource_type: "document", p_resource_id: "D9" }) })).json());
  check("Elco member cannot view IELSco Confidential of their own division", (await can("IEL", "DIV-03", "Confidential")) === false);
  check("Elco member cannot view IELSco Restricted", (await can("IEL", null, "Restricted")) === false);
  check("Elco member views Elco Confidential of their own division", (await can("ELC", "DIV-03", "Confidential")) === true);
  const hist = await (await restAs(token, "rpc/os_login_history", { method: "POST", body: "{}" })).json();
  check("Elco member cannot see the IELSco member's session history", hist.every((e) => e.email === "member.elc@ielsco.test"));
}

// ── 6. Founder (two-step verified) ──────────────────────────────────────────────────────────────────────────────────
const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
{
  const { page } = founder;
  await page.goto(`${OS}/admin`);
  await page.getByText("Invite someone").waitFor();
  check("founder with two-step verification opens Admin", true);
  await page.screenshot({ path: `${OUT}/05-admin-people.png`, fullPage: true });
  await page.goto(`${OS}/os/admin?tab=security`);
  await page.getByTestId("security-admin").waitFor();
  const rows = await page.getByTestId("login-row").count();
  check("Security & sessions lists sign-ins, including refused ones", rows >= 7 && (await page.locator("body").innerText()).includes("Email not on the approved list"), `rows ${rows}`);
  check("new-device sign-ins are flagged", (await page.locator("body").innerText()).includes("New device"));
  await page.screenshot({ path: `${OUT}/06-admin-security.png`, fullPage: true });

  // Invite → first sign-in → approve
  await page.goto(`${OS}/os/admin?tab=people`);
  await page.fill("#p-full", "New Hire");
  await page.fill("#p-email", "New.Hire@ielsco.test");
  await page.check("input[name=company-ELC]");
  await page.click("button:has-text('Invite')");
  await page.getByText("Invited New Hire").waitFor();
  check("founder invites by Google email (stored lower-case, status invited)", sql("select status || ':' || google_account || ':' || invited_by from public.os_people where full_name = 'New Hire'") === "invited:new.hire@ielsco.test:PPL-0001");
  const hire1 = await signIn({ email: "new.hire@ielsco.test" });
  check("invited person is refused before approval", new URL(hire1.page.url()).searchParams.get("error") === "denied");
  check("…but their login is now linked to the invite", sql("select user_id is not null from public.os_people where full_name = 'New Hire'") === "t");
  await hire1.ctx.close();
  page.once("dialog", (d) => d.accept("Starts on 7 Nov"));
  await page.reload();
  await page.locator("li", { hasText: "New Hire" }).getByRole("button", { name: "Approve" }).click();
  await page.getByText("Approve New Hire: saved.").waitFor();
  check("founder approves; reason recorded", sql("select status || ':' || status_reason from public.os_people where full_name = 'New Hire'") === "active:Starts on 7 Nov");
  const hire2 = await signIn({ email: "new.hire@ielsco.test" });
  check("approved person gets in", new URL(hire2.page.url()).pathname === "/os");
  await hire2.ctx.close();

  // Suspend the IELSco member while they are signed in
  page.once("dialog", (d) => d.accept("Laptop stolen"));
  await page.locator("li", { hasText: "IELSco Member" }).getByRole("button", { name: "Suspend" }).click();
  await page.getByText("Suspend IELSco Member: saved.").waitFor();
  await member.page.goto(`${OS}/os`);
  const mu = new URL(member.page.url());
  check("suspended member is thrown out on the next request", mu.pathname === "/os/login" && mu.searchParams.get("error") === "denied", member.page.url());
  const staleToken = await accessToken(member.ctx);
  check("suspended member's browser session was ended", staleToken === null);
  check("suspension is in the audit log with the founder as actor", sql("select count(*) from public.os_audit_log where target_id = 'PPL-0002' and actor_person_id = 'PPL-0001' and detail->'new'->>'status' = 'suspended'") === "1");

  // Revoke one session from Security & sessions
  const elcoToken = await accessToken(elco.ctx);
  await page.goto(`${OS}/os/admin?tab=security`);
  await page.getByTestId("security-admin").waitFor();
  page.once("dialog", (d) => d.accept("Unrecognised phone"));
  await page.getByTestId("login-row").filter({ hasText: "member.elc@ielsco.test" }).getByRole("button", { name: "End session" }).first().click();
  await page.getByText("Session ended and logged.").waitFor();
  const reuse = await (await restAs(elcoToken, "rpc/os_access_status", { method: "POST", body: "{}" })).json();
  check("a revoked session's token no longer has access (API)", reuse === false, JSON.stringify(reuse));
  const people = await (await restAs(elcoToken, "os_people?select=id")).json();
  check("…and reads no directory with it", Array.isArray(people) && people.length === 0, JSON.stringify(people));
  await elco.page.goto(`${OS}/os/workspaces`);
  check("revoked session is sent back to sign-in", new URL(elco.page.url()).pathname === "/os/login");
  check("revocation reason recorded", sql("select reason from public.os_revoked_sessions limit 1") === "Unrecognised phone");
}

// ── 6b. Founder: approval, KPI trend, OKRs, reviews, admin AI and health ───────────────────────────────────────────────
{
  const { page } = founder;
  const text = async () => page.locator("body").innerText();
  await page.goto(`${OS}/os`);
  await page.getByTestId("os-home-founder").waitFor();
  check("founder's Home shows all three workspaces", (await page.getByTestId("os-home-founder").innerText()).includes("Elco AI"));
  await page.screenshot({ path: `${OUT}/20-founder-home.png`, fullPage: true });

  await page.goto(`${OS}/os/documents/DOC-0095`);
  await page.getByLabel("Status").selectOption("Approved");
  await page.waitForFunction(() => document.body.innerText.includes("Approved"));
  await page.waitForLoadState("networkidle");
  check("founder approves the document; approver is stamped", sql("select status || ':' || approver_person_id from public.os_documents where id = 'DOC-0095'") === "Approved:PPL-0001");

  await page.goto(`${OS}/os/kpis/KPI-0001`);
  for (const [p, e, v] of [["2026-W43", "2026-10-25", "15"], ["2026-W44", "2026-11-01", "13"], ["2026-W45", "2026-11-08", "12"]]) {
    await page.getByLabel("Period", { exact: true }).fill(p);
    await page.getByLabel("Period ends").fill(e);
    await page.getByLabel(/^Value/).fill(v);
    await page.getByRole("button", { name: "Log value" }).click();
    await page.waitForFunction((pl) => document.body.innerText.includes(pl), p);
  }
  await page.getByTestId("os-kpi-chart").waitFor();
  check("KPI trend chart appears once three periods are logged", sql("select count(*) from public.os_kpi_values where kpi_id = 'KPI-0001'") === "3");
  check("logged values continue the LOG ID sequence and record who logged them", sql("select min(id) || ':' || max(recorded_by) from public.os_kpi_values") === "LOG-0001:PPL-0001");
  await page.screenshot({ path: `${OUT}/21-kpi-trend.png`, fullPage: true });
  const fin = sql("select id from public.os_kpis where values_restricted limit 1");
  await page.goto(`${OS}/os/kpis/${fin}`);
  await page.getByText("Restricted Finance Control").waitFor({ timeout: 15000 }).catch(() => {});
  check("finance KPIs have no value log in the OS", (await text()).includes("Restricted Finance Control") && (await page.getByTestId("os-kpi-log").count()) === 0);

  await page.goto(`${OS}/os/okrs`);
  await page.getByTestId("os-new-objective").click();
  await page.getByLabel("Objective", { exact: true }).fill("Run GIF 2027 well");
  await page.getByTestId("os-record-save").click();
  await page.getByTestId("os-objective").first().waitFor();
  check("founder creates a company objective (OBJ-0001)", sql("select id from public.os_objectives") === "OBJ-0001");
  await page.getByRole("button", { name: "Key result" }).click();
  await page.getByLabel("Key result", { exact: true }).fill("Applications received");
  await page.getByTestId("os-record-save").click();
  await page.getByText("Applications received").waitFor();
  check("key result starts with no target and no invented progress", sql("select coalesce(target_value::text, 'null') || ':' || target_status from public.os_key_results") === "null:No approved target" && !(await text()).includes("%"));

  // Review cycle → review for the Elco member → self-assessment → manager review
  await page.goto(`${OS}/os/reviews`);
  await page.getByRole("button", { name: "Review cycle" }).click();
  await page.getByLabel("Name").fill("H1 2027");
  await page.getByLabel("Company", { exact: true }).selectOption("ELC");
  await page.getByLabel("Period start").fill("2027-01-01");
  await page.getByLabel("Period end").fill("2027-06-30");
  await page.getByLabel("Status").selectOption("Open");
  await page.getByTestId("os-record-save").click();
  await page.getByText("H1 2027").first().waitFor();
  await page.getByRole("button", { name: "Add review" }).click();
  await page.getByLabel("Person").selectOption("PPL-0003");
  await page.getByLabel(/^Reviewer/).selectOption("PPL-0001");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForFunction(() => document.body.innerText.includes("Elco Member"));
  check("founder opens a review for the Elco member", sql("select id || ':' || status from public.os_reviews") === "REV-0001:Not started");
  const elco2 = await signIn({ email: "member.elc@ielsco.test" });
  await elco2.page.goto(`${OS}/os/reviews/REV-0001`);
  await elco2.page.getByTestId("os-self-assessment").fill("Shipped the onboarding flow; want to learn analytics.");
  elco2.page.once("dialog", (d) => d.accept());
  await elco2.page.getByRole("button", { name: "Submit" }).click();
  await elco2.page.getByText("Submitted to your reviewer.").waitFor();
  check("the person submits their self-assessment", sql("select status || ':' || (self_submitted_at is not null) from public.os_reviews") === "Manager review:true");
  const elcoTok = await accessToken(elco2.ctx);
  const forgedMgr = await restAs(elcoTok, "os_reviews?id=eq.REV-0001", { method: "PATCH", body: JSON.stringify({ manager_assessment: "Outstanding" }) });
  check("the person cannot write their own manager assessment", forgedMgr.status >= 400 && sql("select coalesce(manager_assessment, '-') from public.os_reviews") === "-", `status ${forgedMgr.status}`);
  const peek = await (await restAs(elcoTok, "os_projects?select=id")).json();
  check("Elco member cannot see the IELSco project", Array.isArray(peek) && !peek.some((x) => x.id === "PRJ-0028"), JSON.stringify(peek).slice(0, 120));
  await page.goto(`${OS}/os/reviews/REV-0001`);
  await page.getByLabel("Manager assessment").fill("Strong half; clear ownership of onboarding.");
  await page.getByLabel("Development plan").fill("Analytics course in Q3; pair with Growth.");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Complete review" }).click();
  await page.getByText("Review completed.").waitFor();
  check("reviewer completes the review", sql("select status from public.os_reviews") === "Completed");
  await elco2.page.goto(`${OS}/os/reviews/REV-0001`);
  await elco2.page.getByRole("button", { name: "Acknowledge" }).click();
  await elco2.page.getByText("Acknowledged.").waitFor();
  check("the person acknowledges it", sql("select status || ':' || (acknowledged_at is not null) from public.os_reviews") === "Acknowledged:true");
  check("reviews have no score, rank or rating column", sql("select count(*) from information_schema.columns where table_name = 'os_reviews' and column_name ~ 'score|rank|rating'") === "0");
  await elco2.ctx.close();

  // Admin
  await page.goto(`${OS}/os/admin?tab=ai`);
  await page.getByText("Spent this month").waitFor();
  check("Admin shows AI spend against the cap", (await text()).includes("US$25.00"));
  await page.goto(`${OS}/os/admin?tab=health`);
  await page.getByTestId("os-health").waitFor();
  const health = await page.getByTestId("os-health").innerText();
  check("integration health reports each integration without secrets", health.includes("Google Drive") && health.includes("AI agents") && !/BEGIN PRIVATE KEY|eyJ/.test(health));
  await page.screenshot({ path: `${OUT}/22-admin-health.png`, fullPage: true });
  const healthAsMember = await raw("os.localhost:3000", "/os/api/admin/health");
  check("health API refuses a signed-out caller", healthAsMember.status === 401, `status ${healthAsMember.status}`);
}

// ── 7. Founder without two-step verification ────────────────────────────────────────────────────────────────────────
{
  const f1 = await signIn({ email: "founder@ielsco.test", aal2: false });
  await f1.page.goto(`${OS}/os/admin`);
  await f1.page.getByText("Two-step verification needed").waitFor({ timeout: 15000 }).catch(() => {});
  check("founder without two-step verification cannot use Admin", (await f1.page.locator("body").innerText()).includes("Two-step verification needed"));
  const token = await accessToken(f1.ctx);
  const others = await (await restAs(token, "rpc/os_login_history", { method: "POST", body: "{}" })).json();
  check("…and gets only their own sign-in history from the API", others.every((e) => e.email === "founder@ielsco.test"));
  await f1.ctx.close();
}

// ── 8. Sign out ─────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const { page, ctx } = founder;
  const token = await accessToken(ctx);
  await page.goto(`${OS}/os`);
  await page.click("[data-testid=os-sidebar] button:has-text('Sign out')");
  await page.waitForURL(/\/os\/login\?signed_out=1/);
  check("sign out lands on the Company OS sign-in", true);
  const after = await (await restAs(token, "rpc/os_access_status", { method: "POST", body: "{}" })).json();
  check("a token copied before sign-out no longer has access", after === false, JSON.stringify(after));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
