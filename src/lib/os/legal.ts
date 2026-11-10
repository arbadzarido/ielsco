// Legal: numbering formats, labels and which steps a person is offered. Pure (imported by tests with the .ts
// extension). Numbers are only ever issued by the database (os_issue_number); formatNumber here only previews a format
// for the founder setting it up, with the same tokens and the same output as os_format_number.

export type RuleKind = "outgoing_letter" | "incoming_letter" | "agreement" | "memorandum" | "other";
export interface NumberRule { id: string; company_code: string; kind: RuleKind; type_code: string; name: string; format: string; reset: "yearly" | "monthly" | "never"; active: boolean; updated_at: string }
export const RULE_COLUMNS = "id, company_code, kind, type_code, name, format, reset, active, updated_at";
export interface RegisterRow { id: string; rule_id: string; company_code: string; kind: string; period_key: string; seq: number; number: string; entity_type: "letter" | "agreement"; entity_id: string; issued_by: string | null; issued_at: string; status: "issued" | "void"; void_reason: string | null; voided_at: string | null }
export const REGISTER_COLUMNS = "id, rule_id, company_code, kind, period_key, seq, number, entity_type, entity_id, issued_by, issued_at, status, void_reason, voided_at";

export type LetterStatus = "draft" | "in_review" | "issued" | "registered" | "archived" | "void";
export interface LetterRow { id: string; direction: "incoming" | "outgoing"; company_code: string; division_id: string | null; rule_id: string; subject: string; counterparty: string;
  letter_date: string | null; received_date: string | null; number: string | null; status: LetterStatus; sensitivity: string; related_type: string | null; related_id: string | null;
  notes: string | null; created_by: string; decided_by: string | null; decided_at: string | null; void_reason: string | null; created_at: string; updated_at: string }
export const LETTER_COLUMNS = "id, direction, company_code, division_id, rule_id, subject, counterparty, letter_date, received_date, number, status, sensitivity, related_type, related_id, notes, created_by, decided_by, decided_at, void_reason, created_at, updated_at";

export type AgreementStatus = "draft" | "under_review" | "active" | "expired" | "terminated";
export interface AgreementRow { id: string; kind: "contract" | "mou" | "nda" | "agreement" | "other"; company_code: string; division_id: string | null; rule_id: string | null; number: string | null;
  title: string; counterparty: string; start_date: string | null; end_date: string | null; renewal_date: string | null; notice_days: number | null; auto_renew: boolean;
  value_amount: number | null; status: AgreementStatus; owner_person_id: string | null; sensitivity: string; related_type: string | null; related_id: string | null;
  notes: string | null; created_by: string; decided_by: string | null; decided_at: string | null; created_at: string; updated_at: string }
export const AGREEMENT_COLUMNS = "id, kind, company_code, division_id, rule_id, number, title, counterparty, start_date, end_date, renewal_date, notice_days, auto_renew, value_amount, status, owner_person_id, sensitivity, related_type, related_id, notes, created_by, decided_by, decided_at, created_at, updated_at";

export interface ComplianceRow { id: string; company_code: string; title: string; due_date: string; recurrence: "none" | "monthly" | "quarterly" | "yearly"; owner_person_id: string | null;
  agreement_id: string | null; status: "open" | "done" | "waived"; notes: string | null; created_at: string; updated_at: string }
export const COMPLIANCE_COLUMNS = "id, company_code, title, due_date, recurrence, owner_person_id, agreement_id, status, notes, created_at, updated_at";

export const RULE_KIND_LABEL: Record<RuleKind, string> = { outgoing_letter: "Outgoing letters", incoming_letter: "Incoming letters", agreement: "Agreements", memorandum: "Memorandums", other: "Other documents" };
export const LETTER_STATUS: Record<LetterStatus, { label: string; tone: "neutral" | "amber" | "green" | "blue" | "red" | "teal" }> = {
  draft: { label: "Draft", tone: "neutral" }, in_review: { label: "Waiting for approval", tone: "amber" }, issued: { label: "Issued", tone: "green" },
  registered: { label: "Registered", tone: "blue" }, archived: { label: "Archived", tone: "teal" }, void: { label: "Void", tone: "red" },
};
export const AGREEMENT_STATUS: Record<AgreementStatus, { label: string; tone: "neutral" | "amber" | "green" | "red" | "teal" }> = {
  draft: { label: "Draft", tone: "neutral" }, under_review: { label: "Under review", tone: "amber" }, active: { label: "Active", tone: "green" },
  expired: { label: "Expired", tone: "teal" }, terminated: { label: "Terminated", tone: "red" },
};
export const AGREEMENT_KIND: Record<AgreementRow["kind"], string> = { contract: "Contract", mou: "MoU", nda: "NDA", agreement: "Agreement", other: "Other" };

/** Starting points a founder can pick when adding a rule; nothing is created until they save one. */
export const RULE_PRESETS: { kind: RuleKind; type_code: string; name: string; format: string; reset: NumberRule["reset"] }[] = [
  { kind: "outgoing_letter", type_code: "SK", name: "Outgoing letter (Surat Keluar)", format: "{company}/{type}/{division}/{month_roman}/{year}/{seq:3}", reset: "yearly" },
  { kind: "incoming_letter", type_code: "SM", name: "Incoming letter (Surat Masuk)", format: "{company}/{type}/{month_roman}/{year}/{seq:3}", reset: "yearly" },
  { kind: "agreement", type_code: "PKS", name: "Agreement (Perjanjian Kerja Sama)", format: "{company}/{type}/{division}/{month_roman}/{year}/{seq:3}", reset: "yearly" },
  { kind: "memorandum", type_code: "MEMO", name: "Internal memorandum", format: "{company}/{type}/{division}/{month_roman}/{year}/{seq:3}", reset: "yearly" },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const TOKENS = ["{company}", "{type}", "{division}", "{year}", "{yy}", "{month}", "{month_roman}", "{seq}", "{seq:N}"];

/** Same output as os_format_number. `date` is YYYY-MM-DD. */
export function formatNumber(format: string, v: { company: string; type: string; division: string | null; date: string; seq: number }): string {
  const [y, m] = v.date.split("-");
  let out = format.replaceAll("{company}", v.company).replaceAll("{type}", v.type).replaceAll("{division}", v.division ?? "")
    .replaceAll("{year}", y).replaceAll("{yy}", y.slice(2)).replaceAll("{month_roman}", ROMAN[Number(m) - 1]).replaceAll("{month}", m);
  out = out.replace(/\{seq:([1-9])\}/g, (_, w) => String(v.seq).padStart(Number(w), "0"));
  return out.replaceAll("{seq}", String(v.seq));
}

/** The database's refusals for a format, checked before saving so the form explains them. */
export function formatProblem(format: string, reset: NumberRule["reset"]): string | null {
  if (!/\{seq(:[1-9])?\}/.test(format)) return "The format needs {seq} or {seq:N}";
  if (/\{(?!(company|type|division|year|yy|month|month_roman|seq|seq:[1-9])\})[^}]*\}/.test(format)) return "Unknown token in the format";
  if (reset === "yearly" && !/\{(year|yy)\}/.test(format)) return "A yearly sequence needs {year} or {yy} in the format";
  if (reset === "monthly" && (!/\{(year|yy)\}/.test(format) || !/\{(month|month_roman)\}/.test(format))) return "A monthly sequence needs the year and month in the format";
  if (format.length < 6 || format.length > 120) return "The format is 6 to 120 characters";
  return null;
}

export type LegalAction = "edit" | "submit" | "approve" | "return" | "void" | "archive" | "terminate" | "expire";
export interface LegalMe { personId: string; operator: boolean; signer: boolean }

export function letterActions(l: Pick<LetterRow, "status" | "created_by" | "direction">, me: LegalMe): LegalAction[] {
  const out: LegalAction[] = [];
  if (me.operator && l.status === "draft") out.push("edit", "submit");
  if (me.signer && l.status === "in_review" && l.created_by !== me.personId) out.push("approve", "return");
  if (me.operator && ["registered", "issued"].includes(l.status)) out.push("archive");
  if (me.signer && ["issued", "registered", "archived"].includes(l.status)) out.push("void");
  return out;
}

export function agreementActions(a: Pick<AgreementRow, "status" | "created_by">, me: LegalMe): LegalAction[] {
  const out: LegalAction[] = [];
  if (me.operator && ["draft", "under_review", "active"].includes(a.status)) out.push("edit");
  if (me.operator && a.status === "draft") out.push("submit");
  if (me.signer && a.status === "under_review" && a.created_by !== me.personId) out.push("approve", "return");
  if (me.operator && a.status === "active") out.push("terminate", "expire");
  return out;
}

/** Days until a date (negative when past), in whole days. */
export function daysUntil(date: string | null | undefined, today: string): number | null {
  if (!date) return null;
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}
/** The reminder band an upcoming date falls in, as the reminders use: overdue, 7, 30 or 60 days. */
export function dueBand(date: string | null | undefined, today: string): "overdue" | "7" | "30" | "60" | null {
  const d = daysUntil(date, today);
  if (d == null || d > 60) return null;
  return d < 0 ? "overdue" : d <= 7 ? "7" : d <= 30 ? "30" : "60";
}
