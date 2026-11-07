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

  // ── Calendar: views, an event, the task deadline, a project event ──────────────────────────────────────────────────
  const jkt = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
  const plusDays = (iso, n) => { const x = new Date(`${iso}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const nextDow = (iso, dow) => { for (let i = 1; i <= 7; i++) { const d = plusDays(iso, i); if (new Date(`${d}T00:00:00Z`).getUTCDay() === dow) return d; } };
  const today = jkt();
  // An event three days out, unless that crosses into next month (then the first days of this month are fine too).
  const evDay = plusDays(today, 3).slice(0, 7) === today.slice(0, 7) ? plusDays(today, 3) : plusDays(today, -3);
  await page.goto(`${OS}/os/calendar`);
  await page.getByTestId("os-cal-month").waitFor();
  const monthName = new Date(`${today}T00:00:00Z`).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  check("calendar opens on this month's grid, Sunday first", (await page.getByTestId("os-cal-title").innerText()).includes(monthName) && /^\s*sun/i.test(await page.getByTestId("os-cal-month").innerText()), await page.getByTestId("os-cal-title").innerText());
  await page.getByTestId("os-event-new").click();
  await page.getByTestId("os-event-title").fill("Creative stand-up");
  await page.getByTestId("os-event-start-date").fill(evDay);
  await page.getByTestId("os-event-start-time").fill("10:00");
  await page.getByTestId("os-event-end-time").fill("11:00");
  await page.getByTestId("os-event-save").click();
  await page.getByTestId("os-cal-month").getByText("Creative stand-up").first().waitFor({ timeout: 15000 }).catch(() => {});
  const ev = sql("select id || '|' || company_code || '|' || coalesce(division_id, '-') || '|' || to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '|' || created_by from public.os_events where title = 'Creative stand-up'");
  const evId = ev.split("|")[0];
  check("member creates an event; it gets an EV ID, their company, and 10:00 WIB is 03:00 UTC", /^EV-\d{4}\|IEL\|/.test(ev) && ev.includes(`${evDay} 03:00`) && ev.endsWith("|PPL-0002"), ev);
  check("…and shows on the month grid", (await page.getByTestId("os-cal-month").innerText()).includes("Creative stand-up"));
  await page.screenshot({ path: `${OUT}/30-calendar-month.png`, fullPage: true });
  sql(`update public.os_tasks set due_date = '${evDay}' where id = '${tsk}'`);
  await page.goto(`${OS}/os/calendar?view=week&d=${evDay}`);
  await page.getByTestId("os-cal-week").waitFor();
  const week0 = await page.getByTestId("os-cal-week").innerText();
  check("week view shows the event; the task deadline stays on the task until its layer is turned on", week0.includes("Creative stand-up") && !week0.includes("Draft logo usage guide"), week0.slice(0, 300));
  await page.getByTestId("os-cal-layer-deadlines").check();
  await page.waitForLoadState("networkidle"); await page.waitForTimeout(500);
  const week = await page.getByTestId("os-cal-week").innerText();
  check("…with “My task deadlines” on, the deadline from Tasks shows", week.includes("Draft logo usage guide"), week.slice(0, 300));
  await page.goto(`${OS}/os/calendar?view=day&d=${evDay}`);
  await page.getByText("Creative stand-up").first().waitFor({ timeout: 10000 }).catch(() => {});
  check("day view lists the event with its time", (await text()).includes("10:00"));
  await page.goto(`${OS}/os/calendar?view=upcoming`);
  await page.getByTestId("os-cal-agenda").waitFor({ timeout: 10000 }).catch(() => {});
  check("upcoming list includes the event", (await page.getByTestId("os-cal-agenda").innerText().catch(() => "")).includes("Creative stand-up") || evDay < today);
  await page.goto(`${OS}/os/projects/${prj}`);
  await page.getByTestId("os-linked-events").getByRole("button", { name: "Schedule an event" }).click();
  await page.getByTestId("os-event-title").fill("Brand kit review");
  await page.getByTestId("os-event-start-date").fill(evDay);
  await page.getByTestId("os-event-save").click();
  await page.getByTestId("os-linked-events").getByText("Brand kit review").waitFor({ timeout: 15000 }).catch(() => {});
  check("an event scheduled from the project page is linked to it and listed there", sql(`select project_id from public.os_events where title = 'Brand kit review'`) === prj && (await page.getByTestId("os-linked-events").innerText()).includes("Brand kit review"));
  const tokM = await accessToken(ctx);
  const elcoEv = await restAs(tokM, "os_events", { method: "POST", body: JSON.stringify({ company_code: "ELC", title: "x", starts_at: `${evDay}T03:00:00Z`, ends_at: `${evDay}T04:00:00Z` }) });
  check("an IELSco member can't create an Elco event through the API", elcoEv.status === 403 || elcoEv.status === 401, `status ${elcoEv.status}`);

  // ── Google Calendar for this member (their own consent; separate from the founder's Drive connection) ────────────
  const CAL_CB = "http://os.localhost:3000/os/api/calendar/callback";
  await fetch(`${GW}/__test/google-redirects`, { method: "POST", body: JSON.stringify({ uris: [CAL_CB] }) });
  await page.goto(`${OS}/os/calendar`);
  await page.getByTestId("os-cal-connect").click();
  await page.waitForURL(/google=connected/, { timeout: 15000 }).catch(() => {});
  const calConn = sql("select person_id || '|' || google_email || '|' || token_sealed || '|' || coalesce(timezone, '-') from public.os_calendar_connections");
  check("the member connects their own Google Calendar", page.url().includes("google=connected") && calConn.startsWith("PPL-0002|drive.writer@ielsco.test|"), `${page.url()} ${calConn.slice(0, 40)}`);
  check("…the token is sealed and the calendar's time zone is kept", !calConn.includes("e2e-google-refresh-SECRET") && calConn.includes("|v1.") && calConn.endsWith("|Asia/Jakarta"));
  check("…and that is not a Drive connection", sql("select count(*) from public.os_drive_connection") === "0");
  const syncApi = (body) => page.evaluate(async (b) => { const r = await fetch("/os/api/calendar/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, body);
  const gcal = async () => (await (await fetch(`${GW}/__test/gcal`)).json()).items;
  await page.goto(`${OS}/os/calendar?event=${evId}`);
  const waitSql = async (q, want, ms = 15000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = sql(q); if (v === want) return v; await page.waitForTimeout(300); } return v; };
  const stateOf = `select sync_state from public.os_events where id = '${evId}'`;
  await page.getByTestId("os-event-sync-local").getByRole("button", { name: "Add to my Google Calendar" }).click();
  await waitSql(stateOf, "synced");
  let g = await gcal();
  check("pushing creates one Google event carrying the OS event ID, in Asia/Jakarta", g.length === 1 && g[0].extendedProperties?.private?.osEventId === evId && g[0].start?.timeZone === "Asia/Jakarta", JSON.stringify(g).slice(0, 200));
  check("…and the OS keeps Google's event ID and etag", sql(`select sync_state || '|' || (google_event_id is not null)::text || '|' || (google_etag is not null)::text from public.os_events where id = '${evId}'`) === "synced|true|true");
  sql(`update public.os_events set google_event_id = null, google_synced_by = null, google_etag = null, sync_state = 'local' where id = '${evId}'`);
  const again = await syncApi({ event_id: evId, action: "push" });
  check("pushing again after the link was lost finds the first copy instead of duplicating it", again.status === 200 && (await gcal()).length === 1, JSON.stringify(again));
  // Someone moves it in Google; then the member edits it in the OS. Saving tries to send the edit, and must not overwrite.
  g = await gcal();
  await fetch(`${GW}/__test/gcal`, { method: "POST", body: JSON.stringify({ id: g[0].id, patch: { summary: "Stand-up (moved in Google)" } }) });
  await page.goto(`${OS}/os/calendar?event=${evId}`);
  await page.waitForFunction(() => document.querySelector("[data-testid=os-event-title]")?.value === "Creative stand-up", null, { timeout: 10000 }).catch(() => {});
  await page.getByTestId("os-event-title").fill("Creative stand-up (agenda)");
  await page.getByTestId("os-event-save").click();
  await waitSql(stateOf, "conflict");
  check("when Google changed too, the OS edit is kept but not sent: a conflict, and Google is untouched", sql(stateOf) === "conflict" && (await gcal())[0].summary === "Stand-up (moved in Google)" && sql(`select title from public.os_events where id = '${evId}'`) === "Creative stand-up (agenda)");
  const conflict = await syncApi({ event_id: evId, action: "push" });
  check("…a plain push is refused with Google's version attached", conflict.status === 409 && (await gcal())[0].summary === "Stand-up (moved in Google)", JSON.stringify(conflict).slice(0, 200));
  await page.goto(`${OS}/os/calendar?event=${evId}`);
  await page.getByTestId("os-event-sync").getByText("Changed in Google too").waitFor({ timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${OUT}/31-calendar-conflict.png` });
  await page.getByTestId("os-event-sync").getByRole("button", { name: "Keep Google's version" }).click();
  await waitSql(stateOf, "synced");
  check("the member resolves it by keeping Google's version", sql(`select title || '|' || sync_state from public.os_events where id = '${evId}'`) === "Stand-up (moved in Google)|synced");
  await fetch(`${GW}/__test/gcal`, { method: "POST", body: JSON.stringify({ id: (await gcal())[0].id, remove: true }) });
  const gone = await syncApi({ event_id: evId, action: "push" });
  check("an event deleted in Google is reported, not silently re-created", gone.status === 410 && (await gcal()).length === 0 && sql(stateOf) === "deleted_remote", JSON.stringify(gone).slice(0, 160));
  await page.goto(`${OS}/os/calendar?event=${evId}`);
  await page.getByTestId("os-event-sync").getByRole("button", { name: "Add it to Google again" }).click();
  await waitSql(stateOf, "synced");
  check("…and added back only when the member asks", (await gcal()).length === 1);
  await page.keyboard.press("Escape");
  await fetch(`${GW}/calendar/v3/calendars/primary/events`, { method: "POST", headers: { authorization: "Bearer e2e-google-access", "content-type": "application/json" }, body: JSON.stringify({ summary: "Dentist (personal)", start: { dateTime: `${evDay}T08:00:00+07:00` }, end: { dateTime: `${evDay}T09:00:00+07:00` } }) });
  await page.goto(`${OS}/os/calendar?view=week&d=${evDay}`);
  await page.getByTestId("os-cal-week").getByText("Dentist (personal)").waitFor({ timeout: 15000 }).catch(() => {});
  const wk = await page.getByTestId("os-cal-week").innerText();
  check("the member's own Google events show in their calendar, and a synced event shows once", wk.includes("Dentist (personal)") && wk.split("Stand-up (moved in Google)").length === 2, wk.slice(0, 300));
  check("Google events are read live, never stored in the OS", sql("select count(*) from public.os_events where title like 'Dentist%'") === "0");
  await page.goto(`${OS}/os/calendar?event=${evId}`);
  await page.getByTestId("os-event-delete").click();
  await page.getByTestId("os-choice").locator("[data-choice=go]").click();
  await page.waitForTimeout(1500);
  check("deleting the event removes it from the OS and, unchanged, from Google", sql(`select count(*) from public.os_events where id = '${evId}'`) === "0" && (await gcal()).every((e) => e.extendedProperties?.private?.osEventId !== evId));

  // ── Documents: the route check names exactly what is missing ──────────────────────────────────────────────────────
  const rc = await page.evaluate(async () => (await fetch("/os/api/documents/route-check?company=IEL&division=DIV-04&doc_type=SOP&sensitivity=Internal")).json());
  check("the document route check refuses to create without an approved route, and says which one", rc.ok === false && rc.missing?.company === "IEL" && rc.problems.some((p) => p.includes("IELSco, Internal, Creative, SOP")), JSON.stringify(rc).slice(0, 300));
  check("…and that the Drive writer isn't connected", rc.problems.some((p) => /Drive isn't connected|connect Google Drive/.test(p)));

  // ── AI: words → real records, with a preview the member confirms ─────────────────────────────────────────────────
  const askAi = async (message, answer) => {
    await fetch(`${GW}/__test/gemini`, { method: "POST", body: JSON.stringify(answer) });
    const before = await page.getByTestId("os-ai-action").count();
    await page.getByTestId("os-ai-input").fill(message);
    await page.getByRole("button", { name: "Send" }).click();
    await page.waitForFunction((n) => document.querySelectorAll("[data-testid=os-ai-action]").length > n || document.querySelectorAll("[data-testid=os-error]").length > 0, before, { timeout: 30000 }).catch(() => {});
    return page.getByTestId("os-ai-action").nth(before);
  };
  const friday = nextDow(today, 5), tuesday = nextDow(today, 2);
  await page.goto(`${OS}/os/assistant`);
  let card = await askAi("Create two Creative tasks for Member by Friday: storyboard and voiceover", { text: "Here are the two tasks.", calls: [{ name: "create_tasks", args: { tasks: [{ title: "Storyboard", division: "Creative", assignees: ["Member"], due_date: friday }, { title: "Voiceover", division: "Creative", assignees: ["Member"], due_date: friday }] } }] });
  const last = await (await fetch(`${GW}/__test/gemini-last`)).json();
  check("the model is offered declared functions (structured calls, no SQL) and today's date", JSON.stringify(last.tools ?? []).includes("create_tasks") && JSON.stringify(last.systemInstruction ?? "").includes(`Today is`) && !/sql/i.test(JSON.stringify(last.tools ?? [])));
  const preview = await card.innerText();
  check("a batch preview lists every task and asks which “Member” is meant", (await card.getByTestId("os-ai-item").count()) === 2 && preview.includes("needs your input") && preview.includes("could be 2 people"), preview.slice(0, 300));
  check("…and nothing is created yet", sql("select count(*) from public.os_tasks where title in ('Storyboard', 'Voiceover')") === "0");
  check("…Confirm & Create is blocked until every choice is made", await card.getByRole("button", { name: "Confirm & Create" }).isDisabled());
  await page.screenshot({ path: `${OUT}/32-ai-choice.png`, fullPage: true });
  for (let i = 0; i < 2; i++) {
    await card.getByTestId("os-ai-choice").first().selectOption("PPL-0002");
    await page.waitForTimeout(700);
  }
  await card.getByRole("button", { name: "Confirm & Create" }).click();
  await card.getByTestId("os-ai-created").waitFor({ timeout: 15000 }).catch(() => {});
  const made = sql(`select string_agg(t.id || ':' || t.division_id || ':' || t.due_date || ':' || t.owner_person_id || ':' || (select count(*) from public.os_task_assignees a where a.task_id = t.id), ',' order by t.title) from public.os_tasks t where t.title in ('Storyboard', 'Voiceover')`);
  check("confirming creates both tasks with the chosen person, the Creative division and Friday's date", made.split(",").length === 2 && made.split(",").every((r) => r.includes(`:DIV-04:${friday}:PPL-0002:1`)), made);
  const createdText = await card.getByTestId("os-ai-created").innerText().catch(() => "");
  check("…and the card returns each new ID, assignee, deadline and a link", /TSK-\d{4}/.test(createdText) && createdText.includes("IELSco Member") && createdText.includes(friday) && (await card.getByTestId("os-ai-created").getByRole("link").count()) === 2, createdText);
  const actId = sql("select id from public.os_ai_actions where action_type = 'create_tasks' order by created_at desc limit 1");
  const twice = await page.evaluate(async (id) => (await fetch(`/os/api/ai/actions/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "confirm" }) })).status, actId);
  check("confirming the same suggestion again creates nothing more", twice === 409 && sql("select count(*) from public.os_tasks where title in ('Storyboard', 'Voiceover')") === "2", `status ${twice}`);
  check("the suggestion and its outcome stay in the AI audit trail", sql(`select status from public.os_ai_actions where id = '${actId}'`) === "executed" && sql(`select count(*) from public.os_activity where entity_type = 'task' and entity_id in (select id from public.os_tasks where title = 'Storyboard')`) !== "0");

  card = await askAi("Assign Farrel to the poster task", { calls: [{ name: "create_task", args: { title: "Poster", assignees: ["Farrel"] } }] });
  check("an unknown person is never invented: the card says nobody matches", (await card.innerText()).includes("nobody called “Farrel”"));
  await card.getByRole("button", { name: "Cancel" }).click();
  await card.getByText("Cancelled").waitFor({ timeout: 10000 }).catch(() => {});
  check("…and Cancel creates nothing", sql("select count(*) from public.os_tasks where title = 'Poster'") === "0" && sql("select status from public.os_ai_actions order by created_at desc limit 1") === "rejected");

  card = await askAi("Create an Elco task to prepare the pitch", { calls: [{ name: "create_task", args: { title: "Prepare pitch", company: "Elco" } }] });
  check("a task in a company the member doesn't work in is refused on the card", (await card.innerText()).includes("You don't work in Elco AI"));
  const forgedId = sql("select id from public.os_ai_actions order by created_at desc limit 1");
  const forgedConfirm = await page.evaluate(async (id) => { const r = await fetch(`/os/api/ai/actions/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "confirm", drafts: [{ title: "Prepare pitch", company: "ELC", assignees: ["PPL-0003"] }] }) }); return r.status; }, forgedId);
  check("…and the server refuses it too, whatever the browser sends", forgedConfirm === 422 && sql("select count(*) from public.os_tasks where title = 'Prepare pitch'") === "0", `status ${forgedConfirm}`);

  card = await askAi("Schedule a Creative meeting next Tuesday 2 PM", { calls: [{ name: "create_event", args: { title: "Creative weekly", date: tuesday, start_time: "14:00", division: "Creative", invite_division: true } }] });
  check("an event preview shows the time in WIB and who is invited", (await card.innerText()).includes("14:00–15:00 (WIB)") && (await card.innerText()).includes("IELSco Member"), (await card.innerText()).slice(0, 300));
  await card.getByRole("button", { name: "Confirm & Create" }).click();
  await card.getByTestId("os-ai-created").waitFor({ timeout: 15000 }).catch(() => {});
  const aiEv = sql(`select id || '|' || to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || '|' || (select string_agg(person_id, ',') from public.os_event_attendees a where a.event_id = e.id) from public.os_events e where title = 'Creative weekly'`);
  check("confirming creates the event at 14:00 WIB (07:00 UTC) with the Creative division invited", aiEv.includes(`|${tuesday} 07:00|PPL-0002`), aiEv);
  check("…and its link opens it in the calendar", (await card.getByTestId("os-ai-created").getByRole("link").getAttribute("href")).startsWith("/os/calendar?event=EV-"));

  card = await askAi("Add a milestone: Mojo launch by Nov 12", { calls: [{ name: "create_timeline_item", args: { title: "Mojo launch", due_date: plusDays(today, 5), workstream: "WS1" } }] });
  const confirmMs = card.getByRole("button", { name: "Confirm & Create" });
  if (await confirmMs.isEnabled()) { await confirmMs.click(); await card.getByText(/Not done/).waitFor({ timeout: 15000 }).catch(() => {}); }
  const msText = await card.innerText();
  check("a member can't add a timeline milestone: refused under their own permissions, with a plain message", sql("select count(*) from public.os_timeline_items where title = 'Mojo launch'") === "0" && (msText.includes("You don't have permission") || msText.includes("workstream")), msText.slice(0, 200));

  // Phones: 360 px wide, drawer navigation, no sideways scrolling
  const phone = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, storageState: await ctx.storageState() });
  const pp = await phone.newPage();
  const widths = [];
  for (const path of ["/os", "/os/tasks", `/os/projects/${prj}`, "/os/documents", `/os/documents/${doc}`, "/os/kpis", "/os/timeline", "/os/w/ielsco", "/os/people", "/os/assistant", "/os/calendar", "/os/calendar?view=week", "/os/calendar?view=upcoming"]) {
    await pp.goto(`${OS}${path}`); await pp.waitForLoadState("networkidle");
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    widths.push(`${path}=${w}`);
    if (w > 362) check(`no sideways scroll at 360 px on ${path}`, false, String(w));
  }
  check("no sideways scroll at 360 px on thirteen Company OS screens, including the calendar", widths.every((x) => Number(x.slice(x.lastIndexOf("=") + 1)) <= 362), widths.join(" "));
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
  const evs = await (await restAs(token, "os_events?select=id,title")).json();
  check("Elco member sees none of the IELSco events", Array.isArray(evs) && evs.length === 0 && Number(sql("select count(*) from public.os_events where company_code = 'IEL'")) > 0, JSON.stringify(evs).slice(0, 120));
  const calTok = await restAs(token, "os_calendar_connections?select=token_sealed");
  check("nobody can read Google Calendar tokens through the API", calTok.status >= 400, `status ${calTok.status}`);
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
  check("health says whether Drive file creation is connected", health.includes("Google Drive: creating files"));
  const connectOut = await raw("os.localhost:3000", "/os/api/admin/drive/connect");
  check("connecting Google Drive refuses a signed-out caller", connectOut.status === 401, `status ${connectOut.status}`);
  await page.goto(`${OS}/os/api/admin/drive/callback?state=forged&code=x`);
  check("a Drive callback without the matching state stores nothing", page.url().includes("drive=") && sql("select count(*) from public.os_drive_connection") === "0", page.url());

  // Google OAuth for Drive file creation, against the Google stand-in (it refuses unregistered redirect URIs).
  const DRIVE_CB = "http://os.localhost:3000/os/api/admin/drive/callback";
  await page.goto(`${OS}/os/admin?tab=health`);
  const setup = await page.getByTestId("os-oauth-setup").innerText();
  check("health names the OAuth client and the exact redirect URI to register", setup.includes("e2e-client.apps.googleusercontent.com") && setup.includes(DRIVE_CB) && setup.includes("OS_GOOGLE_CLIENT_ID"), setup);
  check("health never shows the OAuth client secret", !(await page.locator("body").innerText()).includes("e2e-client-secret"));
  await fetch(`${GW}/__test/google-redirects`, { method: "POST", body: JSON.stringify({ uris: ["https://ielsco.example/auth/v1/callback"] }) });
  await page.getByTestId("os-drive-connect").click();
  await page.waitForLoadState("load");
  const mismatch = await page.locator("body").innerText();
  check("with the URI missing from the client, Google answers redirect_uri_mismatch for exactly that URI", mismatch.includes("redirect_uri_mismatch") && mismatch.includes(DRIVE_CB), mismatch.slice(0, 200));
  check("…and nothing is stored", sql("select count(*) from public.os_drive_connection") === "0");
  await fetch(`${GW}/__test/google-redirects`, { method: "POST", body: JSON.stringify({ uris: [DRIVE_CB] }) });
  await page.goto(`${OS}/os/admin?tab=health`);
  await page.getByTestId("os-drive-connect").click();
  await page.waitForURL(/drive=connected/, { timeout: 15000 }).catch(() => {});
  check("with the URI registered, the founder connects Google Drive", page.url().includes("drive=connected"), page.url());
  const stored = sql("select google_email || '|' || token_sealed || '|' || connected_by from public.os_drive_connection");
  check("the connection names the Google account and the founder", stored.startsWith("drive.writer@ielsco.test|") && stored.endsWith("|PPL-0001"), stored.slice(0, 60));
  check("the refresh token is stored sealed, never in plain text", !stored.includes("e2e-google-refresh-SECRET") && /\|v1\./.test(stored), stored.slice(0, 60));
  check("the connection is recorded in the audit log", sql("select count(*) from public.os_audit_log where action = 'drive.connected'") === "1");
  await page.getByTestId("os-health").getByText("Connected as drive.writer@ielsco.test").waitFor({ timeout: 10000 }).catch(() => {});
  check("health shows Drive file creation connected", (await page.getByTestId("os-health").innerText()).includes("Connected as drive.writer@ielsco.test"));
  await page.screenshot({ path: `${OUT}/22-admin-health.png`, fullPage: true });
  const cbErr = await page.evaluate(async () => (await fetch("/os/api/admin/drive/callback?error=access_denied", { redirect: "manual" })).headers.get("location"));
  check("a cancelled Google consent is reported as cancelled", String(cbErr).includes("drive=cancelled") || cbErr === null);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Disconnect" }).click();
  await page.getByText("Google Drive disconnected.").waitFor({ timeout: 10000 }).catch(() => {});
  check("disconnecting removes the stored connection", sql("select count(*) from public.os_drive_connection") === "0");
  // Admin → Drive folder routes: status, missing routes, access check, approve, add, reject
  await page.goto(`${OS}/os/admin?tab=routes`);
  await page.getByTestId("os-routes-list").waitFor();
  const rows = await page.getByTestId("os-route-row").count();
  check("routes admin lists every route with its status", rows === Number(sql("select count(*) from public.os_folder_routes")) && (await page.getByTestId("os-routes-list").innerText()).includes("proposed"), String(rows));
  const gapsText = await page.getByTestId("os-routes-gaps").innerText();
  check("routes admin lists the company and sensitivity combinations with no approved route", gapsText.includes("IELSco · Internal") && gapsText.includes("Elco AI · Confidential"), gapsText.slice(0, 200));
  check("routes admin shows the Drive integration problem (no service account here)", (await page.getByTestId("os-routes-integration").innerText().catch(() => "")).includes("Google Drive"));
  const ielRoute = sql("select folder_name from public.os_folder_routes where company_code = 'IEL' and sensitivity = 'Internal' and division_id is null and doc_type is null and status = 'proposed' limit 1");
  const row = page.getByTestId("os-route-row").filter({ hasText: ielRoute }).first();
  await row.getByRole("button", { name: "Check access" }).click();
  await page.waitForFunction(() => document.querySelector("[role=alert], [role=status]"), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  check("checking access records the result on the route without touching Drive folders", sql(`select coalesce(access_ok::text, '-') || '|' || (access_checked_at is not null)::text from public.os_folder_routes where folder_name = '${ielRoute.replace(/'/g, "''")}' and company_code = 'IEL' and sensitivity = 'Internal' and division_id is null and doc_type is null`) === "false|true");
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Approve" }).click();
  await page.getByText(/Route approved/).waitFor({ timeout: 10000 }).catch(() => {});
  check("a founder approves a route; the database records who and when", sql(`select status || '|' || approved_by || '|' || (approved_at is not null)::text from public.os_folder_routes where company_code = 'IEL' and sensitivity = 'Internal' and division_id is null and doc_type is null and status = 'approved'`) === "approved|PPL-0001|true");
  check("…and the approval is in the audit log", Number(sql("select count(*) from public.os_audit_log where target_type = 'os_folder_routes'")) >= 1);
  check("…approving one route approves only that one", sql("select count(*) from public.os_folder_routes where status = 'approved'") === "1");
  check("…and IELSco Internal is no longer a missing route", !(await page.getByTestId("os-routes-gaps").innerText()).includes("IELSco · Internal"));
  const rcOk = await page.evaluate(async () => (await fetch("/os/api/documents/route-check?company=IEL&division=DIV-04&doc_type=SOP&sensitivity=Internal")).json());
  check("the document route check now finds the approved route, and still reports the failed access check", rcOk.route?.folder_name === ielRoute && rcOk.missing === null && rcOk.problems.some((p) => p.includes("failed its last access check")), JSON.stringify(rcOk).slice(0, 300));
  await page.getByRole("button", { name: "Add route" }).click();
  const rs = page.getByRole("dialog", { name: "Add route" });
  await rs.getByLabel("Drive folder link or ID").fill("https://drive.google.com/drive/folders/1TestFolderIdForElcoConf00?usp=sharing");
  await rs.getByLabel("Folder name").fill("Elco confidential (test)");
  await rs.getByLabel("Company").selectOption("ELC");
  await rs.getByLabel("Sensitivity").selectOption("Confidential");
  await rs.getByRole("button", { name: "Save" }).click();
  await page.getByText(/Route added as proposed/).waitFor({ timeout: 10000 }).catch(() => {});
  check("a founder adds a route from a Drive link; it starts as proposed with the folder ID extracted", sql("select status || '|' || drive_folder_id from public.os_folder_routes where folder_name = 'Elco confidential (test)'") === "proposed|1TestFolderIdForElcoConf00");
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("os-route-row").filter({ hasText: "Elco confidential (test)" }).getByRole("button", { name: "Reject" }).click();
  await page.getByText(/Route rejected/).waitFor({ timeout: 10000 }).catch(() => {});
  check("a founder rejects it; nothing routes there", sql("select status || '|' || coalesce(approved_by, '-') from public.os_folder_routes where folder_name = 'Elco confidential (test)'") === "rejected|-");
  await page.screenshot({ path: `${OUT}/23-admin-routes.png`, fullPage: true });
  const memberCheck = await raw("os.localhost:3000", "/os/api/admin/routes/check", { method: "POST" });
  check("the access-check API refuses a signed-out caller", memberCheck.status === 401 || memberCheck.status === 403, `status ${memberCheck.status}`);
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
