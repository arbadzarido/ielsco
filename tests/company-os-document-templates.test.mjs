// Template-first documents: how a template resolves company, division and folder, who can use it, how the form is
// validated, and the Manager Offering Letter's dates, amounts and text.
import test from "node:test";
import assert from "node:assert/strict";
import { companyOptions, divisionFor, filterTemplates, legalState, missingConfiguration, recommend, resolveStorage, validateInputs, validateTemplateMeta } from "../src/lib/os/doc-templates.ts";
import {
  MANAGER_AGREEMENT_FIELDS, PHASE2_MAX_IDR, PHASE2_MIN_IDR, SAMPLE_VALUES, addMonths, agreementSchedule, managerAgreementBlocks, managerAgreementTitle,
  readManagerAgreement, renderManagerAgreementHtml,
} from "../src/lib/os/manager-agreement.ts";

const tpl = (o = {}) => ({
  id: "manager-offering-letter", name: "Manager Offering Letter & Engagement Agreement", description: "", use_when: null, category: "People / Human Resources", doc_type: "CTR", sensitivity: "Confidential",
  company_codes: ["IEL", "ELC"], division_ids: null, storage_division_id: "DIV-05", kind: "builtin", builtin_key: "manager_agreement", drive_template_file_id: null, eligibility: "authorized", access_mode: "named",
  approval_required: true, legal_status: "draft_pending_legal", content_revision: 1, legal_approved_revision: null, owner_person_id: null, fields: MANAGER_AGREEMENT_FIELDS, version: 1, active: true, ...o,
});
const route = (o) => ({ id: "r", company_code: "IEL", division_id: null, doc_type: null, sensitivity: "Internal", drive_folder_id: "f", folder_name: "Folder", status: "approved", ...o });
const names = { company: (c) => ({ IEL: "IELSco", ELC: "Elco AI", HQ: "HQ" })[c], division: (d) => ({ "DIV-05": "People" })[d] ?? null };

// ── Resolution
test("a template with one storage division files there; the person never picks a division", () => {
  assert.equal(divisionFor(tpl(), null), "DIV-05");
  assert.equal(divisionFor(tpl(), "DIV-03"), "DIV-05");
});
test("a template for one division selects it automatically; for several, asks; an unsupported one is refused", () => {
  const one = tpl({ storage_division_id: null, division_ids: ["DIV-03"] }), many = tpl({ storage_division_id: null, division_ids: ["DIV-03", "DIV-04"] }), any = tpl({ storage_division_id: null });
  assert.equal(divisionFor(one, null), "DIV-03");
  assert.equal(divisionFor(many, null), null);
  assert.equal(divisionFor(many, "DIV-04"), "DIV-04");
  assert.equal(divisionFor(many, "DIV-09"), null);
  assert.equal(divisionFor(any, "DIV-09"), "DIV-09");
});
test("with no approved People route, each company reports exactly what is missing", () => {
  const r = resolveStorage(tpl(), [route({ division_id: "DIV-03", sensitivity: "Internal" })], names);
  assert.equal(r.length, 2);
  for (const x of r) { assert.equal(x.route, null); assert.match(x.missing, /No Drive folder route covers/); }
  assert.deepEqual(missingConfiguration(r[0], tpl(), "IELSco", "People"), ["Add and approve a Drive folder route for IELSco · People · Confidential (document type CTR or any type) in Admin → Drive folder routes."]);
});
test("a proposed People route is named but not used", () => {
  const routes = [route({ id: "p1", company_code: "IEL", division_id: "DIV-05", sensitivity: "Confidential", status: "proposed", folder_name: "16 IELSco — Personnel Records (Restricted)" })];
  const [iel, elc] = resolveStorage(tpl(), routes, names);
  assert.equal(iel.route, null); assert.equal(iel.proposed.id, "p1"); assert.match(iel.missing, /proposed route to “16 IELSco/);
  assert.deepEqual(missingConfiguration(iel, tpl(), "IELSco", "People"), ["Approve the proposed route “16 IELSco — Personnel Records (Restricted)” for IELSco · People · Confidential in Admin → Drive folder routes."]);
  assert.equal(elc.proposed, null);
});
test("once approved, only that company's own folder is used", () => {
  const routes = [route({ id: "a1", company_code: "IEL", division_id: "DIV-05", sensitivity: "Confidential", folder_name: "IEL personnel" }), route({ id: "a2", company_code: "ELC", division_id: "DIV-05", sensitivity: "Confidential", folder_name: "ELC personnel" }),
    route({ id: "a3", company_code: "IEL", division_id: "DIV-03", sensitivity: "Confidential", folder_name: "IEL growth" })];
  const [iel, elc] = resolveStorage(tpl(), routes, names);
  assert.equal(iel.route.folder_name, "IEL personnel"); assert.equal(elc.route.folder_name, "ELC personnel");
});
test("a route for another division or another sensitivity never matches", () => {
  const [iel] = resolveStorage(tpl(), [route({ division_id: "DIV-03", sensitivity: "Confidential" }), route({ division_id: "DIV-05", sensitivity: "Internal" }), route({ division_id: "DIV-05", sensitivity: "Restricted" })], names);
  assert.equal(iel.route, null);
});
test("company options say who can save and why not", () => {
  const res = resolveStorage(tpl(), [route({ company_code: "IEL", division_id: "DIV-05", sensitivity: "Confidential" })], names);
  const opts = companyOptions(tpl(), res, { isFounder: false, divisionIds: [], canCreate: () => false }, names.company);
  assert.deepEqual(opts.map((o) => [o.company, o.ok]), [["IEL", true], ["ELC", false]]); // named-readers templates are permitted by their own authorisation list
  const std = companyOptions(tpl({ access_mode: "standard", eligibility: "staff" }), res, { isFounder: false, divisionIds: [], canCreate: () => false }, names.company);
  assert.equal(std[0].ok, false); assert.match(std[0].reason, /can't create documents/);
});

// ── Catalog
test("search, category, type and company filters narrow the catalog", () => {
  const a = tpl(), b = tpl({ id: "meeting-minutes", name: "Meeting minutes", category: "Operations", doc_type: "MOM", company_codes: ["HQ"], description: "Notes of a meeting", use_when: "After any team meeting" });
  assert.deepEqual(filterTemplates([a, b], { q: "offering letter" }).map((t) => t.id), ["manager-offering-letter"]);
  assert.deepEqual(filterTemplates([a, b], { q: "after any team" }).map((t) => t.id), ["meeting-minutes"]);
  assert.deepEqual(filterTemplates([a, b], { category: "Operations" }).map((t) => t.id), ["meeting-minutes"]);
  assert.deepEqual(filterTemplates([a, b], { docType: "CTR" }).map((t) => t.id), ["manager-offering-letter"]);
  assert.deepEqual(filterTemplates([a, b], { company: "ELC" }).map((t) => t.id), ["manager-offering-letter"]);
  assert.equal(filterTemplates([a, b], {}).length, 2);
});
test("recommendations follow the person's own divisions", () => {
  const people = tpl(), growth = tpl({ id: "g", storage_division_id: null, division_ids: ["DIV-03"] });
  assert.deepEqual(recommend([people, growth], { divisionIds: ["DIV-03"] }).map((t) => t.id), ["g"]);
  assert.deepEqual(recommend([people, growth], { divisionIds: [] }), []);
});
test("legal state: draft until approved for the current revision", () => {
  assert.equal(legalState(tpl()), "internal_draft");
  assert.equal(legalState(tpl({ legal_status: "legally_approved", legal_approved_revision: 1 })), "execution_ready");
  assert.equal(legalState(tpl({ legal_status: "legally_approved", legal_approved_revision: 1, content_revision: 2 })), "internal_draft");
  assert.equal(legalState(tpl({ legal_status: "not_required" })), "not_required");
});

// ── Metadata validation
test("incompatible template settings are explained", () => {
  assert.equal(validateTemplateMeta(tpl()).length, 0);
  assert.match(validateTemplateMeta(tpl({ eligibility: "staff" })).join(" "), /named people only can't be open to any staff/);
  assert.match(validateTemplateMeta(tpl({ access_mode: "standard", eligibility: "staff", sensitivity: "Restricted" })).join(" "), /Restricted documents can't be generated by any staff/);
  assert.match(validateTemplateMeta(tpl({ company_codes: [] })).join(" "), /at least one company/);
  assert.match(validateTemplateMeta(tpl({ storage_division_id: "DIV-05", division_ids: ["DIV-03"] })).join(" "), /storage division must be one of/);
  assert.match(validateTemplateMeta(tpl({ kind: "drive_copy" })).join(" "), /Drive master template/);
});

// ── Generic field validation
test("required, type, range and option checks", () => {
  const fields = [{ key: "a", label: "A", type: "text", required: true, maxLength: 3 }, { key: "n", label: "N", type: "number", min: 1, max: 5 }, { key: "d", label: "D", type: "date" }, { key: "s", label: "S", type: "select", options: [{ value: "x", label: "X" }] }];
  assert.deepEqual(Object.keys(validateInputs(fields, {})), ["a"]);
  assert.deepEqual(Object.keys(validateInputs(fields, { a: "toolong", n: "9", d: "2026-13-45", s: "y" })).sort(), ["a", "d", "n", "s"]);
  assert.deepEqual(validateInputs(fields, { a: "ok", n: "3", d: "2027-01-04", s: "x", extra: "ignored" }), {});
});

// ── Manager agreement: dates
test("the engagement is nine months: three then six, each ending the day before the next starts", () => {
  const s = agreementSchedule("2027-01-04");
  assert.deepEqual([s.phase1.start, s.phase1.end, s.phase2.start, s.phase2.end, s.end], ["2027-01-04", "2027-04-03", "2027-04-04", "2027-10-03", "2027-10-03"]);
});
test("month-end starts clamp to the shorter month and stay consecutive", () => {
  assert.equal(addMonths("2027-01-31", 1), "2027-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  const s = agreementSchedule("2027-05-31");
  assert.equal(s.phase1.end, "2027-08-30"); assert.equal(s.phase2.start, "2027-08-31"); assert.equal(s.end, "2028-02-28");
});
test("a start on 1 January ends on 30 September", () => { assert.equal(agreementSchedule("2027-01-01").end, "2027-09-30"); });

// ── Manager agreement: values
test("a complete form is accepted with the standard Phase 1 amount", () => {
  const r = readManagerAgreement({ ...SAMPLE_VALUES });
  assert.deepEqual(r.errors, {}); assert.deepEqual(r.warnings, []);
});
test("Phase 2 must be IDR 1,000,000 to 2,000,000", () => {
  assert.ok(readManagerAgreement({ ...SAMPLE_VALUES, phase2_amount: PHASE2_MIN_IDR - 1 }).errors.phase2_amount);
  assert.ok(readManagerAgreement({ ...SAMPLE_VALUES, phase2_amount: PHASE2_MAX_IDR + 1 }).errors.phase2_amount);
  assert.ok(readManagerAgreement({ ...SAMPLE_VALUES, phase2_amount: 2_500_000 }).errors.phase2_amount); // the earlier IDR 2-3 million idea is not accepted
  assert.deepEqual(readManagerAgreement({ ...SAMPLE_VALUES, phase2_amount: PHASE2_MIN_IDR }).errors, {});
  assert.deepEqual(readManagerAgreement({ ...SAMPLE_VALUES, phase2_amount: PHASE2_MAX_IDR }).errors, {});
});
test("a non-standard Phase 1 amount is a warning, not silently accepted", () => {
  assert.match(readManagerAgreement({ ...SAMPLE_VALUES, phase1_amount: 500000 }).warnings.join(" "), /not the standard IDR 300,000/);
});
test("required fields, email, date and notice are checked; unknown keys are dropped", () => {
  const r = readManagerAgreement({ ...SAMPLE_VALUES, manager_name: "", position: "", manager_division: "", manager_email: "nope", start_date: "2027-02-30", notice_days: 3 });
  assert.deepEqual(Object.keys(r.errors).sort(), ["manager_division", "manager_email", "manager_name", "notice_days", "position", "start_date"]);
  assert.equal(Object.hasOwn(readManagerAgreement({ ...SAMPLE_VALUES, evil: "x" }).values, "evil"), false);
});
test("targets in the special terms trigger a warning", () => {
  assert.match(readManagerAgreement({ ...SAMPLE_VALUES, special_terms: "Sales quota of 10 deals" }).warnings.join(" "), /belong in a job description/);
});

// ── Manager agreement: text
const ctx = (mode) => ({ companyLegalName: "PT English Space Berkah Indonesia", companyName: "IELSco", divisionName: "Growth", mode, generatedOn: "2026-11-10" });
test("the draft carries the banner, the drafting notes and a draft title", () => {
  const html = renderManagerAgreementHtml(SAMPLE_VALUES, ctx("internal_draft"));
  assert.match(html, /DRAFT — PENDING LEGAL REVIEW/); assert.match(html, /Drafting note/);
  assert.match(managerAgreementTitle(SAMPLE_VALUES, "internal_draft"), /DRAFT — pending legal review/);
});
test("an execution-ready document has neither banner nor notes", () => {
  const html = renderManagerAgreementHtml(SAMPLE_VALUES, ctx("execution_ready"));
  assert.doesNotMatch(html, /DRAFT/); assert.doesNotMatch(html, /Drafting note/);
  assert.doesNotMatch(managerAgreementTitle(SAMPLE_VALUES, "execution_ready"), /DRAFT/);
});
test("the text states the agreed terms and none that were ruled out", () => {
  const html = renderManagerAgreementHtml(SAMPLE_VALUES, ctx("internal_draft"));
  for (const must of ["nine (9) months", "three (3) months", "six (6) months", "IDR 300,000", "IDR 1,500,000", "twelve (12) hours", "sixty (60) minutes", "fully remote", "Singapore, Malaysia and Thailand", "July and August 2027", "SGD 600 to 900", "not a guaranteed appointment, promotion, ownership or equity entitlement", "No incentive is automatic or guaranteed", "mandatory"]) assert.ok(html.includes(must), must);
  const body = managerAgreementBlocks(SAMPLE_VALUES, ctx("internal_draft")).flatMap((b) => b.p ?? []).join(" ");
  for (const mustNot of ["2,000,000 to 3,000,000", "probation", "Probation", "KPI of", "commission of"]) assert.ok(!body.includes(mustNot), mustNot); // the draft's review notes may mention probation; the agreement text does not
  assert.doesNotMatch(body, /\d+(\.\d+)?\s?%/); // no invented incentive percentages
});
test("one master text serves every position and division; only the person's details change", () => {
  const a = renderManagerAgreementHtml({ ...SAMPLE_VALUES, position: "People Manager" }, { ...ctx("internal_draft"), divisionName: "People" });
  const b = renderManagerAgreementHtml({ ...SAMPLE_VALUES, position: "Creative Manager" }, { ...ctx("internal_draft"), divisionName: "Creative" });
  assert.match(a, /People Manager/); assert.match(b, /Creative Manager/);
  assert.equal(a.replace(/People Manager|People/g, "X"), b.replace(/Creative Manager|Creative/g, "X"));
});
test("each company is named by its own legal entity", () => {
  assert.match(renderManagerAgreementHtml(SAMPLE_VALUES, { ...ctx("internal_draft"), companyLegalName: "PT Elco Edukasi Berkah Indonesia", companyName: "Elco AI" }), /PT Elco Edukasi Berkah Indonesia/);
});
test("everything typed into the form is escaped", () => {
  const html = renderManagerAgreementHtml({ ...SAMPLE_VALUES, manager_name: `<script>alert(1)</script> & "Q"`, special_terms: "<img src=x onerror=alert(1)>" }, ctx("internal_draft"));
  assert.doesNotMatch(html, /<script>alert/); assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;Q&quot;/);
});
test("special terms appear when given and 'None' when not", () => {
  assert.match(renderManagerAgreementHtml(SAMPLE_VALUES, ctx("internal_draft")), /Special terms agreed for this Manager<\/h2><p>None\.<\/p>/);
  assert.match(renderManagerAgreementHtml({ ...SAMPLE_VALUES, special_terms: "Starts after exams." }, ctx("internal_draft")), /Starts after exams\./);
});
test("the agreement sets no KPI, OKR or quota", () => {
  const text = managerAgreementBlocks(SAMPLE_VALUES, ctx("internal_draft")).flatMap((b) => b.p ?? []).join(" ");
  assert.match(text, /sets no targets/); assert.doesNotMatch(text, /\bKPIs?\b.*\d|\bOKR\b.*\d|quota of/i);
});
test("the draft's legal-review notes cover the points flagged for review", () => {
  const notes = managerAgreementBlocks(SAMPLE_VALUES, ctx("internal_draft")).map((b) => b.note ?? "").join(" ");
  for (const k of ["legal characterisation", "probation", "minimum wage", "working time", "notice periods", "bilingual", "social-security"]) assert.ok(new RegExp(k, "i").test(notes), k);
});
