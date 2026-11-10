// Template-first documents, end to end on the LOCAL stack (Google is a stand-in, not real Google): the catalog, automatic
// metadata, the draft Manager Offering Letter, route handling (missing → proposed → approved), the Drive file it creates,
// named readers, the legal-approval switch and the Admin template registry.
//
// Runs on the same stack as company-os.e2e.mjs (tests/e2e/company-os/README.md), after it (needs its seeded people).
// Usage: node tests/e2e/company-os-document-templates.e2e.mjs [screenshot dir]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const OUT = process.argv[2] || "./os-e2e-shots";
mkdirSync(OUT, { recursive: true });
const OS = "http://os.localhost:3000";
const GW = "http://localhost:54399";
const DRIVE_CB = `${OS}/os/api/admin/drive/callback`, CAL_CB = `${OS}/os/api/calendar/callback`;
let pass = 0, fail = 0;
const check = (name, cond, detail = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"} ${name}${!cond && detail ? ` -> ${String(detail).slice(0, 300)}` : ""}`); };
const sql = (q) => execFileSync("sudo", ["-u", "postgres", "psql", "-d", "os_e2e", "-tAqc", q], { encoding: "utf8" }).trim();
const mock = (modes) => fetch(`${GW}/__test/google-drive`, { method: "POST", body: JSON.stringify(modes) });
const mockFiles = async () => (await (await fetch(`${GW}/__test/google-drive-files`, { method: "POST", body: "{}" })).json()).files;

const browser = await chromium.launch();
async function signIn(google) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  page.on("dialog", (d) => d.accept());
  await fetch(`${GW}/__test/next-google`, { method: "POST", body: JSON.stringify({ verified: true, ...google }) });
  await page.goto(`${OS}/os/login`);
  await page.getByTestId("os-google-signin").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/os/auth/"), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}
const settle = (page) => page.waitForLoadState("networkidle").then(() => page.waitForTimeout(500));

// A clean slate for this test: Drive connected through the real flow, People routes as the migration proposed them.
sql(`delete from public.os_drive_connection; update public.os_folder_routes set status = 'proposed' where division_id = 'DIV-05' and sensitivity = 'Confidential';`);
sql(`delete from public.os_documents where template_id = 'manager-offering-letter'; delete from public.os_doc_template_authorized where template_id = 'manager-offering-letter';`);
sql(`update public.os_doc_templates set legal_status = 'draft_pending_legal', active = true where id = 'manager-offering-letter';`);
sql(`insert into public.os_doc_templates (id, name, description, use_when, category, doc_type, company_codes, kind, drive_template_file_id, eligibility)
     values ('meeting-minutes', 'Meeting minutes', 'Notes and decisions from a meeting.', 'After any team meeting.', 'Operations', 'MOM', array['HQ','IEL','ELC'], 'drive_copy', '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789', 'staff') on conflict (id) do update set active = true;`);
await mock({});
await fetch(`${GW}/__test/google-redirects`, { method: "POST", body: JSON.stringify({ uris: [DRIVE_CB, CAL_CB] }) });

const founder = await signIn({ email: "founder@ielsco.test", aal2: true });
const { page } = founder;
await page.goto(`${OS}/os/admin?tab=health`);
await page.getByTestId("os-health").waitFor(); await settle(page);
await page.getByTestId("os-drive-connect").click();
await page.waitForURL(/drive=connected/, { timeout: 15000 });
await settle(page);

const openCatalog = async () => { await page.goto(`${OS}/os/documents`); await settle(page); await page.getByTestId("os-new-doc").click(); await page.getByTestId("os-doc-catalog").waitFor(); await settle(page); };
const fill = async (label, v) => page.getByLabel(label, { exact: true }).fill(v);
const form = page.getByTestId("os-tpl-form");

// ── 1. The catalog: search, filters, the template's own metadata ─────────────────────────────────────────
await openCatalog();
const cardText = await page.getByTestId("os-tpl-card").filter({ hasText: "Manager Offering Letter" }).first().innerText().catch((e) => `no card: ${e.message}`);
check("the catalog lists the Manager Offering Letter with its category, sensitivity and draft status", /Confidential/.test(cardText) && /Draft — pending legal review/.test(cardText) && /IELSco/.test(cardText) && /Elco AI/.test(cardText) && (await page.getByRole("heading", { name: "People / Human Resources" }).count()) >= 1, cardText);
await page.getByTestId("os-tpl-search").fill("offering letter");
check("search finds it", (await page.getByTestId("os-tpl-card").count()) === 1);
await page.getByTestId("os-tpl-search").fill("zzzz-nothing");
check("a search with no match says so and points to adding a file", await page.getByText("No template matches").isVisible() && await page.getByTestId("os-add-file").isVisible());
await page.getByTestId("os-tpl-search").fill("");
await page.getByLabel("Category").selectOption("Operations");
check("a category filter hides templates from other categories", (await page.getByTestId("os-tpl-card").filter({ hasText: "Manager Offering Letter" }).count()) === 0);
await page.getByLabel("Category").selectOption("");
await page.screenshot({ path: `${OUT}/dt-01-catalog.png`, fullPage: true });

// ── 2. Choosing it loads the metadata: no company, division, type, sensitivity or Drive settings to pick ───
await page.getByTestId("os-tpl-card").filter({ hasText: "Manager Offering Letter" }).click();
await form.waitFor();
check("the form shows only the template's fields, plus the company because two are valid", await form.getByLabel("Company", { exact: true }).isVisible() && await form.getByLabel("Manager's full name", { exact: true }).isVisible());
check("…and no division, type, sensitivity or folder pickers for the document itself", (await form.getByLabel("Sensitivity").count()) === 0 && (await form.getByLabel("Type", { exact: true }).count()) === 0 && (await form.getByLabel("Division", { exact: true }).count()) === 0);
check("a draft template warns that it is not for signature", await form.getByText("still waiting for legal review").isVisible());
await form.getByLabel("Company", { exact: true }).selectOption("IEL");
await page.waitForTimeout(800);
const routeBox = await page.getByTestId("os-tpl-route").innerText();
check("with no approved People route it names the proposed folder and the exact admin step", /Approve the proposed route “16 IELSco — Personnel Records \(Restricted\)” for IELSco · People · Confidential/.test(routeBox), routeBox);
check("saving is blocked until a route is approved", await page.getByTestId("os-tpl-save").isDisabled());

// ── 3. Fill in, validate, preview ──────────────────────────────────────────────────────────────────────
await fill("Manager's full name", "Sample Manager");
await fill("Position", "Growth Manager");
await form.getByLabel("Division the manager leads", { exact: true }).selectOption("DIV-03");
await fill("Engagement start date", "2027-01-04");
await fill("Phase 2 monthly amount (IDR)", "2500000");
await fill("Authorised signatory (name)", "Sample Signatory");
await fill("Authorised signatory (title)", "Co-founder");
await page.getByTestId("os-tpl-preview-btn").click(); await settle(page);
check("a Phase 2 amount outside IDR 1–2 million is refused with the range", await page.getByText("Phase 2 must be between IDR 1,000,000 and 2,000,000.").isVisible());
await fill("Phase 2 monthly amount (IDR)", "1500000");
await page.getByTestId("os-tpl-preview-btn").click();
await page.getByTestId("os-tpl-preview").waitFor();
const frame = page.frameLocator('[data-testid="os-tpl-preview"]');
const doc = await frame.locator("body").innerText();
check("the preview is marked as a draft pending legal review", /DRAFT — PENDING LEGAL REVIEW/.test(doc));
check("the nine months are calculated: 4 Jan 2027 to 3 Oct 2027, phases of three and six months", /4 January 2027 to 3 October 2027 \(nine months\)/.test(doc) && /4 January 2027 to 3 April 2027/.test(doc) && /4 April 2027 to 3 October 2027/.test(doc), doc.slice(0, 600));
check("the monthly amounts are IDR 300,000 then IDR 1,500,000 and the company is named by its legal entity", /IDR 300,000 per month/.test(doc) && /IDR 1,500,000 per month/.test(doc) && /PT English Space Berkah Indonesia/.test(doc));
check("the overseas program, the external internship and the 'not guaranteed' wording are there", /Singapore, Malaysia and Thailand/.test(doc) && /SGD 600 to 900/.test(doc) && /not a guaranteed appointment/.test(doc));
check("no KPI numbers, quotas or invented incentive percentages", !/\d\s?%/.test(doc.replace(/\s+/g, " ")) && /sets no targets/.test(doc));
check("the preview iframe is sandboxed", (await page.getByTestId("os-tpl-preview").getAttribute("sandbox")) === "");
await page.getByTestId("os-tpl-preview").scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/dt-02-preview.png`, fullPage: true });
check("nothing was saved by previewing", Number(sql(`select count(*) from public.os_documents where template_id = 'manager-offering-letter'`)) === 0 && (await mockFiles()).length === 0);

// ── 4. Founder approves the route, then the document is saved through it ─────────────────────────────────
sql(`update public.os_folder_routes set status = 'approved' where company_code = 'IEL' and division_id = 'DIV-05' and sensitivity = 'Confidential'`);
await form.getByLabel("Company", { exact: true }).selectOption("ELC"); await page.waitForTimeout(600);
check("the other company still has no approved route and is told so", /Elco/.test(await page.getByTestId("os-tpl-route").innerText()) && await page.getByTestId("os-tpl-save").isDisabled());
await form.getByLabel("Company", { exact: true }).selectOption("IEL"); await page.waitForTimeout(800);
check("an approved route is named, and Save becomes available", /Will be filed in the approved folder “16 IELSco — Personnel Records \(Restricted\)”/.test(await page.getByTestId("os-tpl-route").innerText()) && await page.getByTestId("os-tpl-save").isEnabled());
await page.getByTestId("os-tpl-save").click();
await page.waitForURL(/\/os\/documents\/DOC-\d+/, { timeout: 20000 });
await settle(page);
const docId = new URL(page.url()).pathname.split("/").pop();
check("the document page says it is a draft pending legal review and shows named readers", await page.getByTestId("os-doc-draft-banner").isVisible() && await page.getByText("Named readers only").isVisible());
await page.screenshot({ path: `${OUT}/dt-03-saved.png`, fullPage: true });
const row = sql(`select company_code||'|'||coalesce(division_id,'')||'|'||doc_type||'|'||sensitivity||'|'||access_mode||'|'||coalesce(generation_status,'')||'|'||template_version||'|'||status||'|'||coalesce(reference_number,'') from public.os_documents where id = '${docId}'`);
check("the template, not the form, decided company, division, type, sensitivity, readers and status", /^IEL\|DIV-05\|CTR\|Confidential\|named\|internal_draft\|\d+\|In Review\|IEL-CTR-\d{4}-\d{3}$/.test(row), row);
const files = await mockFiles();
const f = files[0];
check("one Google Doc was made in the approved folder, from HTML", files.length === 1 && f.mimeType === "application/vnd.google-apps.document" && f.parents.includes(sql(`select drive_folder_id from public.os_folder_routes where company_code = 'IEL' and division_id = 'DIV-05' and sensitivity = 'Confidential' and status = 'approved'`)) && /DRAFT — PENDING LEGAL REVIEW/.test(f.media ?? "") && /Manager Offering Letter/.test(f.name), JSON.stringify({ n: files.length, name: f?.name, mime: f?.mimeType }));
check("the register row keeps the Drive file, URL, route and inputs; the audit log has no personal inputs", sql(`select (drive_file_id is not null and drive_url is not null and folder_route_id is not null and inputs->>'manager_name' = 'Sample Manager')::text from public.os_documents where id = '${docId}'`) === "true"
  && Number(sql(`select count(*) from public.os_audit_log where action = 'document.generate' and target_id = '${docId}' and detail::text not like '%Sample Manager%'`)) === 1);

// ── 5. A draft can't be approved; people who aren't named can't see or generate ──────────────────────────
const approved = sql(`select 1 from public.os_documents where id = '${docId}' and status = 'Approved'`);
await page.getByLabel("Status").selectOption("Approved"); await settle(page);
check("a draft pending legal review can't be marked Approved", approved === "" && sql(`select status from public.os_documents where id = '${docId}'`) !== "Approved");

const member = await signIn({ email: "req.growth@ielsco.test" });
const m = member.page;
await m.goto(`${OS}/os/documents`); await settle(m);
await m.getByTestId("os-new-doc").click(); await m.getByTestId("os-doc-catalog").waitFor(); await settle(m);
check("a member who isn't authorised doesn't see the template", (await m.getByTestId("os-tpl-card").filter({ hasText: "Manager Offering Letter" }).count()) === 0);
const gen = await m.evaluate(async () => { const r = await fetch("/os/api/documents/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ template_id: "manager-offering-letter", mode: "preview", company: "IEL", inputs: {} }) }); return r.status; });
check("…and the generate API refuses them", gen === 404 || gen === 403, String(gen));
await m.goto(`${OS}/os/documents/${docId}`); await settle(m);
check("…and the document is not found for them", await m.getByText("Document not found").isVisible());
check("…nor does it appear in their register", (await m.goto(`${OS}/os/documents`), await settle(m), (await m.getByText("Manager Offering Letter").count()) === 0));

// ── 6. Admin → Document templates: coverage, authorisation, legal approval, versions ────────────────────
await page.goto(`${OS}/os/admin?tab=templates`); await page.getByTestId("os-templates-admin").waitFor(); await settle(page);
const cov = await page.getByTestId("os-tpl-coverage").innerText();
check("route coverage shows IELSco resolved and Elco AI waiting for approval", /Manager Offering Letter[\s\S]*IELSco[\s\S]*16 IELSco — Personnel Records/.test(cov) && /Waiting for approval: “26 Elco — Personnel Records/.test(cov), cov);
await page.getByTestId("os-tpl-row").filter({ hasText: "Manager Offering Letter" }).click();
const ed = page.getByTestId("os-tpl-editor");
await ed.waitFor();
const v0 = Number(sql(`select version from public.os_doc_templates where id = 'manager-offering-letter'`));
check("the editor shows the metadata, authorised people and a pending legal status", await ed.getByText("Legal status: Draft — pending legal review").isVisible() && await ed.getByText("Authorised people (besides founders)").isVisible() && await ed.getByText("Nobody yet: only founders can use this template.").isVisible());
await ed.getByLabel("Who can generate it").selectOption("staff");
check("incompatible settings are explained and can't be saved", await page.getByText("named people only can't be open to any staff").isVisible() && await page.getByTestId("os-tpl-save-meta").isDisabled());
await ed.getByLabel("Who can generate it").selectOption("authorized");
await ed.getByLabel("Description").fill((await ed.getByLabel("Description").inputValue()) + " ");
check("a change previews its impact and its next version", await page.getByTestId("os-tpl-impact").isVisible() && new RegExp(`version ${v0 + 1}`).test(await page.getByTestId("os-tpl-impact").innerText()));
await page.getByTestId("os-tpl-save-meta").click(); await settle(page);
check("saving makes the next version and keeps the earlier ones", Number(sql(`select count(*) from public.os_doc_template_versions where template_id = 'manager-offering-letter'`)) >= v0 + 1 && Number(sql(`select version from public.os_doc_templates where id = 'manager-offering-letter'`)) === v0 + 1);
await page.getByTestId("os-tpl-row").filter({ hasText: "Manager Offering Letter" }).click(); await page.getByTestId("os-tpl-row").filter({ hasText: "Manager Offering Letter" }).click();
const ed2 = page.getByTestId("os-tpl-editor"); await ed2.waitFor();
check("legal approval needs an explicit confirmation", await ed2.getByRole("button", { name: "Mark legally approved" }).isDisabled());
await ed2.getByTestId("os-tpl-legal-confirm").check();
await ed2.getByRole("button", { name: "Mark legally approved" }).click(); await settle(page);
check("marking it approved is recorded with the founder and the revision", sql(`select legal_status||'|'||legal_approved_by||'|'||legal_approved_revision from public.os_doc_templates where id = 'manager-offering-letter'`) === "legally_approved|PPL-0001|1"
  && Number(sql(`select count(*) from public.os_audit_log where target_type = 'os_doc_templates' and target_id = 'manager-offering-letter' and detail::text like '%legally_approved%'`)) >= 1);

// A document generated after approval is no longer a draft.
await openCatalog();
check("the template just used now appears under Recently used", (await page.getByRole("region", { name: "Recently used" }).getByTestId("os-tpl-card").filter({ hasText: "Manager Offering Letter" }).count()) === 1);
await page.getByRole("region", { name: "Recently used" }).getByTestId("os-tpl-card").first().click(); await form.waitFor();
await form.getByLabel("Company", { exact: true }).selectOption("IEL");
await fill("Manager's full name", "Second Sample"); await fill("Position", "Operations Manager");
await form.getByLabel("Division the manager leads", { exact: true }).selectOption("DIV-02");
await fill("Engagement start date", "2027-02-01"); await fill("Phase 2 monthly amount (IDR)", "2000000");
await fill("Authorised signatory (name)", "Sample Signatory"); await fill("Authorised signatory (title)", "Co-founder");
await page.getByTestId("os-tpl-preview-btn").click(); await page.getByTestId("os-tpl-preview").waitFor();
const doc2 = await page.frameLocator('[data-testid="os-tpl-preview"]').locator("body").innerText();
check("after legal approval the preview has no draft banner or drafting notes", !/DRAFT/.test(doc2) && !/Drafting note/.test(doc2) && /1 February 2027 to 31 October 2027/.test(doc2), doc2.slice(0, 300));
check("the same master text serves another position and division", /Operations Manager/.test(doc2) && /Operations/.test(doc2));
await page.screenshot({ path: `${OUT}/dt-04-approved-preview.png`, fullPage: true });

sql(`update public.os_doc_templates set legal_status = 'draft_pending_legal' where id = 'manager-offering-letter'; update public.os_folder_routes set status = 'proposed' where division_id = 'DIV-05' and sensitivity = 'Confidential';`);
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
