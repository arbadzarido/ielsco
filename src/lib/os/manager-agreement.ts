// Manager Offering Letter & Engagement Agreement: the one master text for every manager, in every division and in both
// companies. Pure (no server-only imports). The text is built here, filled from the form, escaped, and turned into HTML
// that Google Drive converts to a Google Doc.
//
// STATUS: DRAFT — PENDING LEGAL REVIEW. While the registry says so, every document made from this text carries a draft
// banner and visible drafting notes. Change the wording → raise MANAGER_AGREEMENT_REVISION here AND content_revision in the
// registry, so an earlier legal approval no longer counts for the new wording.
import type { DocTemplate, TemplateField } from "./doc-templates";

export const MANAGER_AGREEMENT_KEY = "manager_agreement";
export const MANAGER_AGREEMENT_REVISION = 1;
export const STANDARD_PHASE1_IDR = 300_000;
export const PHASE2_MIN_IDR = 1_000_000;
export const PHASE2_MAX_IDR = 2_000_000;
export const PHASE1_MONTHS = 3;
export const PHASE2_MONTHS = 6;
export const DEFAULT_NOTICE_DAYS = 14;

export const MANAGER_AGREEMENT_FIELDS: TemplateField[] = [
  { key: "manager_name", label: "Manager's full name", type: "text", required: true, maxLength: 120 },
  { key: "manager_email", label: "Manager's email", type: "text", maxLength: 160, help: "Optional. Used only on the agreement." },
  { key: "manager_address", label: "Manager's address", type: "text", maxLength: 240, help: "Optional." },
  { key: "position", label: "Position", type: "text", required: true, maxLength: 100, placeholder: "For example Growth Manager" },
  { key: "manager_division", label: "Division the manager leads", type: "division", required: true },
  { key: "manager_person", label: "Company OS profile (optional)", type: "person", help: "If chosen, this person can open their own agreement in Company OS once a founder has approved it." },
  { key: "start_date", label: "Engagement start date", type: "date", required: true, help: "The end date and the two phases are calculated from this: 3 months, then 6 months." },
  { key: "phase1_amount", label: "Phase 1 monthly amount (IDR)", type: "number", required: true, default: STANDARD_PHASE1_IDR, min: 0, help: "The standard amount is IDR 300,000." },
  { key: "phase2_amount", label: "Phase 2 monthly amount (IDR)", type: "number", required: true, min: PHASE2_MIN_IDR, max: PHASE2_MAX_IDR, help: "Agreed per person, between IDR 1,000,000 and 2,000,000." },
  { key: "signatory_name", label: "Authorised signatory (name)", type: "text", required: true, maxLength: 120 },
  { key: "signatory_title", label: "Authorised signatory (title)", type: "text", required: true, maxLength: 120 },
  { key: "signing_place", label: "Place of signing", type: "text", maxLength: 80, help: "Optional." },
  { key: "notice_days", label: "Termination notice (days)", type: "number", default: DEFAULT_NOTICE_DAYS, min: 7, max: 60, help: "A proposed default for legal review to confirm." },
  { key: "special_terms", label: "Other mutually agreed special terms", type: "textarea", maxLength: 2000, help: "Optional. Do not put targets, KPIs or quotas here; those belong in a job description or work plan." },
];

/** A built-in template keeps its fields in code; the registry row only points at it. */
export const withFields = (t: DocTemplate): DocTemplate => (t.builtin_key === MANAGER_AGREEMENT_KEY ? { ...t, fields: MANAGER_AGREEMENT_FIELDS } : t);

// ── Dates ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A YYYY-MM-DD that is a real calendar date (no 30 February). */
export const isRealDate = (s: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
/** Adds whole months in UTC; a day that doesn't exist in the target month moves to its last day. */
export function addMonths(isoDate: string, months: number): string {
  const d = parse(isoDate);
  const day = d.getUTCDate();
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(day, last));
  return iso(t);
}
export const addDays = (isoDate: string, days: number) => iso(new Date(parse(isoDate).getTime() + days * 86_400_000));

/** Nine months from the start date, in two phases: 3 months, then 6. Each period ends the day before the next begins. */
export function agreementSchedule(start: string) {
  const p1End = addDays(addMonths(start, PHASE1_MONTHS), -1);
  const p2Start = addMonths(start, PHASE1_MONTHS);
  const end = addDays(addMonths(start, PHASE1_MONTHS + PHASE2_MONTHS), -1);
  return { start, phase1: { start, end: p1End, months: PHASE1_MONTHS }, phase2: { start: p2Start, end, months: PHASE2_MONTHS }, end, totalMonths: PHASE1_MONTHS + PHASE2_MONTHS };
}

export interface ManagerAgreementValues {
  manager_name: string; manager_email: string; manager_address: string; position: string; manager_division: string; manager_person: string;
  start_date: string; phase1_amount: number; phase2_amount: number; signatory_name: string; signatory_title: string; signing_place: string;
  notice_days: number; special_terms: string;
}

const str = (v: unknown) => (typeof v === "number" ? String(v) : typeof v === "string" ? v.trim() : "");
const num = (v: unknown, dflt: number) => { const s = str(v); if (!s) return dflt; const n = Number(s); return Number.isFinite(n) ? n : NaN; };

/** Cleans and checks the form. Errors block saving; warnings are shown beside the preview. */
export function readManagerAgreement(inputs: Record<string, unknown>): { values: ManagerAgreementValues; errors: Record<string, string>; warnings: string[] } {
  const v: ManagerAgreementValues = {
    manager_name: str(inputs.manager_name), manager_email: str(inputs.manager_email), manager_address: str(inputs.manager_address),
    position: str(inputs.position), manager_division: str(inputs.manager_division), manager_person: str(inputs.manager_person),
    start_date: str(inputs.start_date), phase1_amount: num(inputs.phase1_amount, STANDARD_PHASE1_IDR), phase2_amount: num(inputs.phase2_amount, NaN),
    signatory_name: str(inputs.signatory_name), signatory_title: str(inputs.signatory_title), signing_place: str(inputs.signing_place),
    notice_days: num(inputs.notice_days, DEFAULT_NOTICE_DAYS), special_terms: str(inputs.special_terms),
  };
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const need = (k: keyof ManagerAgreementValues, label: string, max: number) => {
    const s = String(v[k]);
    if (!s) errors[k] = `${label} is required.`; else if (s.length > max) errors[k] = `${label} is too long.`;
  };
  need("manager_name", "The manager's name", 120); need("position", "The position", 100); need("signatory_name", "The signatory's name", 120); need("signatory_title", "The signatory's title", 120);
  if (!v.manager_division) errors.manager_division = "Choose the manager's division.";
  if (v.manager_email.length > 160) errors.manager_email = "The email is too long.";
  else if (v.manager_email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v.manager_email)) errors.manager_email = "That doesn't look like an email address.";
  if (v.manager_address.length > 240) errors.manager_address = "The address is too long.";
  if (v.signing_place.length > 80) errors.signing_place = "The place is too long.";
  if (v.special_terms.length > 2000) errors.special_terms = "Special terms can be at most 2000 characters.";
  if (!isRealDate(v.start_date)) errors.start_date = "Choose the start date.";
  else {
    const y = Number(v.start_date.slice(0, 4));
    if (y < 2026 || y > 2035) errors.start_date = "The start date looks wrong; check the year.";
  }
  if (!Number.isFinite(v.phase1_amount) || v.phase1_amount < 0 || !Number.isInteger(v.phase1_amount)) errors.phase1_amount = "Enter the Phase 1 amount in whole rupiah.";
  else if (v.phase1_amount !== STANDARD_PHASE1_IDR) warnings.push(`Phase 1 is not the standard IDR ${STANDARD_PHASE1_IDR.toLocaleString("en-US")}. Make sure this was agreed.`);
  if (!Number.isFinite(v.phase2_amount) || !Number.isInteger(v.phase2_amount)) errors.phase2_amount = "Enter the Phase 2 amount in whole rupiah.";
  else if (v.phase2_amount < PHASE2_MIN_IDR || v.phase2_amount > PHASE2_MAX_IDR) errors.phase2_amount = `Phase 2 must be between IDR ${PHASE2_MIN_IDR.toLocaleString("en-US")} and ${PHASE2_MAX_IDR.toLocaleString("en-US")}.`;
  if (!Number.isInteger(v.notice_days) || v.notice_days < 7 || v.notice_days > 60) errors.notice_days = "Notice must be between 7 and 60 days.";
  if (/\b(KPI|OKR|quota|target)s?\b/i.test(v.special_terms)) warnings.push("Special terms mention targets or KPIs. Those belong in a job description or work plan, not in this agreement.");
  return { values: v, errors, warnings };
}

// ── Text ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface RenderContext {
  companyLegalName: string;      // from the registry, for the selected company
  companyName: string;           // IELSco / Elco AI
  divisionName: string;
  /** "internal_draft" shows the draft banner and the drafting notes; "execution_ready" omits them. */
  mode: "internal_draft" | "execution_ready";
  generatedOn: string;           // ISO date
}

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const idr = (n: number) => `IDR ${n.toLocaleString("en-US")}`;
const longDate = (s: string) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

type Block = { h?: string; p?: string[]; note?: string };

export function managerAgreementBlocks(v: ManagerAgreementValues, c: RenderContext): Block[] {
  const s = agreementSchedule(v.start_date);
  const co = c.companyLegalName;
  return [
    { h: "1. Purpose and nature of this engagement", p: [
      `1.1 ${co} (the “Company”), operating the ${c.companyName} business, offers ${v.manager_name} (the “Manager”) the position of ${v.position} in the ${c.divisionName} division, on the terms below.`,
      "1.2 The Company is an early-stage organisation with limited financial resources. Its managers are mostly university students, and so are its founders. This engagement is meant to give the Manager real startup management experience, leadership and entrepreneurship development, exposure to business operations, and opportunities to take part in international projects, together with a modest monthly financial appreciation and the chance of additional incentives. It is not a full-time job and does not promise the pay or security of a large company.",
      "1.3 The legal nature of this engagement (for example whether it is an employment relationship, a fixed-term employment agreement, an internship or another arrangement) depends on its actual substance under Indonesian law, not on the labels used here. Whatever its nature, any protection that Indonesian law makes mandatory for the Manager applies, and nothing in this agreement is intended to reduce it.",
    ], note: "Legal review: confirm the legal characterisation of the engagement (see the checklist) and conform this clause, the payment terms and the termination terms to it. Do not add a probation clause to a fixed-term employment agreement without legal validation." },
    { h: "2. Engagement period", p: [
      `2.1 The engagement starts on ${longDate(s.start)} and runs for nine (9) months, until ${longDate(s.end)}, in two phases.`,
      `2.2 Phase 1, Initial Evaluation Period: three (3) months, from ${longDate(s.phase1.start)} to ${longDate(s.phase1.end)}. During this phase the Manager and the Company's leadership get to know how the work fits. At the end of Phase 1 they review the engagement together, as described in clause 12.`,
      `2.3 Phase 2, Continued Engagement: six (6) months, from ${longDate(s.phase2.start)} to ${longDate(s.phase2.end)}, if both sides wish to continue after the Phase 1 review.`,
      "2.4 Extending the engagement beyond nine months needs a new written agreement.",
    ], note: "Legal review: the nine-month term, the Phase 1 review, and how a fixed term interacts with the review and with early termination." },
    { h: "3. Working arrangement", p: [
      "3.1 The engagement is fully remote. There is no mandatory office attendance.",
      "3.2 The Company expects roughly twelve (12) hours of work per week on average, spread flexibly around the Manager's studies. It is a guide to the level of commitment, not a timesheet.",
      "3.3 There is at most one scheduled team meeting per week, with a target length of sixty (60) minutes. Other coordination is by agreement.",
      "3.4 The Manager sets their own working hours within reasonable coordination with the division and the Company's leadership, and tells them in good time when academic commitments will limit availability.",
      "3.5 The Manager may pursue other academic, professional, entrepreneurial or personal activities, subject to clause 10 (conflicts of interest) and clause 8 (confidentiality).",
      "3.6 The Company does not expect full-time availability. The arrangement rests on mutual coordination, accountability and reasonable contribution.",
    ], note: "Legal review: working time (about 12 hours a week) and flexible, remote work; confirm how the statutory working-time and rest rules apply to this arrangement." },
    { h: "4. General responsibilities", p: [
      `4.1 The Manager will, within the time described above: support the development and operation of the ${c.divisionName} division; coordinate with other divisions and managers; support team members and organisational initiatives; take part in planning and periodic evaluations; keep communication open, accountable and professional; contribute to a collaborative and productive culture; and protect the Company's information and resources.`,
      "4.2 This agreement sets no targets. Role-specific goals, work plans and any performance measures are agreed separately, with the Manager, in a job description or work plan that reflects the Manager's real capacity and the resources available.",
    ] },
    { h: "5. Monthly financial appreciation", p: [
      `5.1 Phase 1: ${idr(v.phase1_amount)} per month.`,
      `5.2 Phase 2: ${idr(v.phase2_amount)} per month.`,
      "5.3 The Company pays this amount monthly, in arrears, by bank transfer to the account the Manager provides, subject to any tax withholding the law requires.",
      "5.4 The Company calls this amount a financial appreciation. How it is characterised under Indonesian law depends on the legal nature of the engagement (clause 1.3), not on that name. If a mandatory rule applies to it, for example a minimum wage rule, social security contributions or a compensation payment on completion of a fixed term, that rule applies.",
    ], note: "Legal review: whether the monthly amounts are lawful for this kind of engagement (for example against the applicable minimum wage), tax treatment, social-security (BPJS) coverage, and any compensation payable at the end of a fixed term. The founders' financial constraints are real; if the proposed structure does not fit the legal form, list the alternatives rather than changing the amounts here." },
    { h: "6. Additional incentives", p: [
      "6.1 The Manager may have the chance to earn additional financial incentives, for example sales commissions, referral incentives, content-creation (UGC) incentives, performance-based appreciation, project-based profit sharing, sponsorship-related incentives, or other contributions to projects that both sides agree.",
      "6.2 No incentive is automatic or guaranteed by this agreement. Each one applies only under separately approved written terms that state who is eligible, what activity or project it covers, and how it is calculated. This agreement does not set any percentage or amount.",
      "6.3 The Company intends to recognise meaningful contributions beyond the monthly amount, and will discuss incentive terms with the Manager before the related work begins.",
      "6.4 Calling an incentive an appreciation, commission or share does not decide whether it counts as wages under Indonesian law. If a mandatory rule applies to it, that rule applies.",
    ] },
    { h: "7. Development opportunities and organisational benefits", p: [
      "These are opportunities the Company intends to offer. Unless a clause below says otherwise, they are not guarantees, and none is pay.",
      "7.1 Startup and leadership exposure. Direct exposure to startup leadership and decision-making; practical experience building an organisation from an early stage; cross-functional collaboration; and exposure to business strategy, operations, growth and organisational development.",
      "7.2 Entrepreneurship development. The chance to learn entrepreneurship directly from the founders, to see business development and venture-building at close range, to propose and develop new business initiatives, and potentially to lead future projects or initiatives.",
      `7.3 Future business-unit leadership. The Company may consider suitable managers for future leadership roles, including the possibility of becoming CEO of a future business unit established under ${co}. This is a development opportunity only. It is not a guaranteed appointment, promotion, ownership or equity entitlement.`,
      "7.4 International projects and regional networks. The Manager may be offered opportunities to take part in international projects, regional networking activities, overseas organisational programs and cross-country collaborations.",
      "7.5 2027 overseas program. The Company's current plan includes activities in Singapore, Malaysia and Thailand around July and August 2027, lasting about seven to nine days. Managers are expected to be available to be considered for the relevant program. For participants the Company approves, the Company intends to fund official program-related travel expenses in full. Taking part depends on the program being confirmed, on selection, scheduling, visa and immigration requirements, and operational feasibility. Exact dates and the itinerary will be communicated separately, and the scope of funded expenses will be confirmed before travel. This is an intended benefit and an opportunity, not an unconditional guarantee.",
      "7.6 External internship and career opportunities. The Company may introduce or refer the Manager to external remote internship opportunities, some of which may pay around SGD 600 to 900 per month. Any such opportunity is subject to availability, external selection and the third party's own terms. It is not compensation paid or guaranteed by the Company.",
    ], note: "Legal review: that benefits described as intended or optional (items 7.3 to 7.6) are not drafted as binding promises; the overseas-travel funding wording; and whether any benefit has tax or employment-law consequences." },
    { h: "8. Confidentiality", p: [
      "8.1 The Manager will keep confidential, and use only for the Company's work, non-public information they receive through the engagement, such as plans, finances, partner and customer details, personal data of other people, and internal documents.",
      "8.2 This does not cover information that is public through no fault of the Manager, that the Manager already lawfully knew, or that the law requires them to disclose.",
      "8.3 These duties continue for two (2) years after the engagement ends, and for as long as the information stays confidential in the case of personal data and trade secrets.",
    ], note: "Legal review: the length and scope of the confidentiality duty after the engagement, and personal-data protection obligations." },
    { h: "9. Work products and intellectual property", p: [
      "9.1 Work the Manager creates for the Company as part of this engagement (documents, designs, content, code, plans and similar) belongs to the Company, to the extent the law allows, from creation. The Manager will sign any simple document needed to confirm this.",
      "9.2 The Manager keeps ownership of what they created before the engagement or independently of it, and of their general skills and knowledge. They may describe their role and, where it is not confidential, show non-confidential work in a portfolio, and the Company will credit the Manager's authorship where it reasonably can.",
    ] },
    { h: "10. Conflicts of interest", p: [
      "10.1 The Manager will tell the Company early about any activity that could compete with the Company or conflict with its interests, and will not use the Company's confidential information or resources for another activity.",
      "10.2 Other study, work and ventures are welcome as long as they do not breach clause 8 or this clause. The Company will not unreasonably refuse a request to continue them.",
    ] },
    { h: "11. Professional conduct and communication", p: [
      "11.1 Both sides will act in good faith, with honesty and respect. The Manager will follow the Company's reasonable written policies that have been shared with them, including those on harassment, discrimination, safeguarding and the handling of data. The Company will treat the Manager respectfully and fairly and will not require unsafe or unlawful conduct.",
      "11.2 The Manager will keep the division and the Company's leadership reasonably informed, and will raise concerns early. The Company will do the same, and will give the Manager reasonable notice of meetings and decisions that affect them.",
    ] },
    { h: "12. Review and amendment", p: [
      "12.1 The Manager and the Company's leadership will review the engagement at the end of Phase 1 and may review it at other times by agreement. Possible outcomes are to continue as planned, to adjust the arrangement, or to end the engagement.",
      "12.2 Any change to this agreement must be in writing and agreed by both sides.",
    ] },
    { h: "13. Termination", p: [
      `13.1 Either side may end the engagement before the end date by giving the other at least ${v.notice_days} days' written notice (a message to the email address given in this agreement counts as writing). The Company will explain its reasons when it ends the engagement.`,
      "13.2 Either side may end the engagement sooner for serious misconduct or a serious breach of this agreement, after giving the other side a chance to respond, where reasonably possible.",
      "13.3 On ending, the Company will pay any amount owed for the period worked, and the Manager will hand over their work in an orderly way. Obligations that by their nature continue (confidentiality, intellectual property) continue.",
      "13.4 Nothing in this clause takes away rights or payments that Indonesian law gives the Manager on ending, depending on the legal nature of the engagement (clause 1.3).",
    ], note: "Legal review: notice periods, grounds for early termination, and any severance or compensation rights; the 14-day notice default is only a proposal." },
    { h: "14. Return or deletion of data and access", p: [
      "14.1 When the engagement ends, the Manager will return or delete the Company's documents, data and credentials they hold, stop using the Company's accounts, and confirm in writing that they have done so if asked.",
      "14.2 The Company will remove the Manager's access promptly. The Manager may keep their own personal records of their role and pay, and copies of this agreement.",
    ] },
    { h: "15. Governing law and disputes", p: [
      "15.1 This agreement is governed by the laws of the Republic of Indonesia.",
      "15.2 The parties will first try to settle any disagreement through discussion in good faith, and then through mediation, before going to any court or body that has authority under Indonesian law.",
    ], note: "Legal review: the dispute forum, whether an industrial-relations dispute procedure applies, and the requirement that agreements involving an Indonesian party be in Indonesian (a bilingual version will be needed)." },
    { h: "16. General", p: [
      "16.1 This agreement, together with any separately agreed written incentive terms, job description or work plan, is the whole agreement about the engagement. If a provision is invalid, the rest stays in force.",
      `16.2 This agreement takes effect on ${longDate(s.start)}.`,
    ] },
  ];
}

const CSS = "body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.45;color:#1b2430} h1{font-size:18pt;margin:0 0 4pt} h2{font-size:12pt;margin:16pt 0 4pt} p{margin:0 0 6pt} td{vertical-align:top;padding:3pt 8pt 3pt 0} .meta td:first-child{color:#55657a;width:140pt} .banner{border:1.5pt solid #b4690e;background:#fff4e0;padding:6pt 8pt;margin:0 0 12pt;font-weight:bold;color:#7a4300} .note{border-left:3pt solid #b4690e;background:#fff8ec;padding:4pt 8pt;margin:2pt 0 8pt;font-size:9.5pt;color:#7a4300} .sign td{padding-top:30pt;border-top:0.75pt solid #55657a;width:48%}";

export function managerAgreementTitle(v: Pick<ManagerAgreementValues, "manager_name">, mode: RenderContext["mode"]) {
  return `Manager Offering Letter & Engagement Agreement — ${v.manager_name}${mode === "internal_draft" ? " (DRAFT — pending legal review)" : ""}`;
}

export function renderManagerAgreementHtml(v: ManagerAgreementValues, c: RenderContext): string {
  const draft = c.mode === "internal_draft";
  const s = agreementSchedule(v.start_date);
  const blocks = managerAgreementBlocks(v, c);
  const body = blocks.map((b) => `${b.h ? `<h2>${esc(b.h)}</h2>` : ""}${(b.p ?? []).map((p) => `<p>${esc(p)}</p>`).join("")}${draft && b.note ? `<p class="note"><b>Drafting note (remove after legal review):</b> ${esc(b.note)}</p>` : ""}`).join("");
  const special = v.special_terms
    ? `<h2>Special terms agreed for this Manager</h2>${v.special_terms.split(/\n{1,}/).map((p) => `<p>${esc(p)}</p>`).join("")}`
    : "<h2>Special terms agreed for this Manager</h2><p>None.</p>";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(managerAgreementTitle(v, c.mode))}</title><style>${CSS}</style></head><body>`
    + (draft ? `<p class="banner">DRAFT — PENDING LEGAL REVIEW. Internal draft for review only. Not an approved agreement and not for signature.</p>` : "")
    + `<h1>Manager Offering Letter &amp; Engagement Agreement</h1>`
    + `<table class="meta"><tr><td>Company</td><td>${esc(c.companyLegalName)} (${esc(c.companyName)})</td></tr>`
    + `<tr><td>Manager</td><td>${esc(v.manager_name)}${v.manager_email ? ` · ${esc(v.manager_email)}` : ""}${v.manager_address ? `<br>${esc(v.manager_address)}` : ""}</td></tr>`
    + `<tr><td>Position</td><td>${esc(v.position)}, ${esc(c.divisionName)}</td></tr>`
    + `<tr><td>Engagement</td><td>${esc(longDate(s.start))} to ${esc(longDate(s.end))} (nine months)</td></tr>`
    + `<tr><td>Phase 1</td><td>${esc(longDate(s.phase1.start))} to ${esc(longDate(s.phase1.end))} · ${esc(idr(v.phase1_amount))} per month</td></tr>`
    + `<tr><td>Phase 2</td><td>${esc(longDate(s.phase2.start))} to ${esc(longDate(s.phase2.end))} · ${esc(idr(v.phase2_amount))} per month</td></tr>`
    + `<tr><td>Prepared</td><td>${esc(longDate(c.generatedOn))}</td></tr></table>`
    + body + special
    + `<h2>Signatures</h2>${v.signing_place ? `<p>Signed at ${esc(v.signing_place)}.</p>` : ""}`
    + `<table class="sign" style="width:100%"><tr><td>For ${esc(c.companyLegalName)}<br><br><br>${esc(v.signatory_name)}<br>${esc(v.signatory_title)}<br>Date:</td><td>&nbsp;</td><td>The Manager<br><br><br>${esc(v.manager_name)}<br>Date:</td></tr></table>`
    + `</body></html>`;
}

/** Sample values for the fictional preview and the tests. Not a real person. */
export const SAMPLE_VALUES: ManagerAgreementValues = {
  manager_name: "Sample Manager", manager_email: "sample.manager@example.com", manager_address: "", position: "Growth Manager", manager_division: "DIV-03", manager_person: "",
  start_date: "2027-01-04", phase1_amount: STANDARD_PHASE1_IDR, phase2_amount: 1_500_000, signatory_name: "Sample Signatory", signatory_title: "Co-founder",
  signing_place: "", notice_days: DEFAULT_NOTICE_DAYS, special_terms: "",
};
