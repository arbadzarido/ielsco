// Template-first documents. Pure (no server-only imports), so the catalog, the generate API, Admin and the tests all use
// the same rules. A template carries the metadata; this file turns it into "what happens when this person picks it".
import { matchRoute, missingRouteText, type FolderRoute } from "./routes.ts";

export type FieldType = "text" | "textarea" | "date" | "number" | "division" | "person" | "select";
export interface TemplateField {
  key: string; label: string; type: FieldType; required?: boolean; help?: string; placeholder?: string;
  default?: string | number; min?: number; max?: number; maxLength?: number; options?: { value: string; label: string }[];
}

export interface DocTemplate {
  id: string; name: string; description: string; use_when: string | null; category: string; doc_type: string; sensitivity: string;
  company_codes: string[]; division_ids: string[] | null; storage_division_id: string | null;
  kind: "drive_copy" | "builtin"; builtin_key: string | null; drive_template_file_id: string | null;
  eligibility: "founders" | "authorized" | "staff"; access_mode: "standard" | "named"; approval_required: boolean;
  legal_status: "not_required" | "draft_pending_legal" | "legally_approved"; content_revision: number; legal_approved_revision: number | null;
  owner_person_id: string | null; fields: TemplateField[]; version: number; active: boolean;
}
export const TEMPLATE_COLUMNS = "id, name, description, use_when, category, doc_type, sensitivity, company_codes, division_ids, storage_division_id, kind, builtin_key, drive_template_file_id, eligibility, access_mode, approval_required, legal_status, content_revision, legal_approved_revision, owner_person_id, fields, version, active";

export const TEMPLATE_COMPANIES = ["HQ", "IEL", "ELC"] as const;
export const ELIGIBILITY = [
  { value: "founders", label: "Founders only" },
  { value: "authorized", label: "Founders and a named list" },
  { value: "staff", label: "Any staff member" },
] as const;
export const ACCESS_MODES = [
  { value: "standard", label: "Normal document access (by company, division and sensitivity)" },
  { value: "named", label: "Named readers only (founders, the named list, and the person it is about once approved)" },
] as const;

/** Whether a document made from this template is a draft for internal use or ready to sign. */
export function legalState(t: Pick<DocTemplate, "legal_status" | "content_revision" | "legal_approved_revision">): "not_required" | "internal_draft" | "execution_ready" {
  if (t.legal_status === "not_required") return "not_required";
  if (t.legal_status === "legally_approved" && t.legal_approved_revision === t.content_revision) return "execution_ready";
  return "internal_draft";
}
export const LEGAL_LABEL = { not_required: "", internal_draft: "Draft — pending legal review", execution_ready: "Legally approved" } as const;

export interface ViewerScope { isFounder: boolean; divisionIds: string[]; canCreate: (company: string, division: string | null, sensitivity: string) => boolean }

/** Companies a template can be used for, with the folder each resolves to. `division` is the division the document would be filed under. */
export interface CompanyResolution {
  company: string; division: string | null; route: FolderRoute | null; proposed: FolderRoute | null; missing: string | null;
}
export function divisionFor(t: Pick<DocTemplate, "storage_division_id" | "division_ids">, chosen: string | null): string | null {
  if (t.storage_division_id) return t.storage_division_id;
  if (chosen && (!t.division_ids || t.division_ids.includes(chosen))) return chosen;
  if (!chosen && t.division_ids?.length === 1) return t.division_ids[0];
  return null;
}
export function resolveStorage(t: DocTemplate, routes: FolderRoute[], names: { company: (c: string) => string; division: (d: string) => string | null }, chosenDivision: string | null = null): CompanyResolution[] {
  return t.company_codes.map((company) => {
    const division = divisionFor(t, chosenDivision);
    const q = { company, division, docType: t.doc_type, sensitivity: t.sensitivity };
    const route = matchRoute(routes, q);
    const proposed = route ? null : matchRoute(routes, q, "proposed");
    return {
      company, division, route, proposed,
      missing: route ? null : missingRouteText(q, { company: names.company(company), division: division ? names.division(division) : null }, proposed),
    };
  });
}

/** Everything the "New document" screen needs to know about a template for one person. */
export interface TemplateOption { company: string; label: string; ok: boolean; reason: string | null }
export function companyOptions(t: DocTemplate, res: CompanyResolution[], viewer: ViewerScope, companyName: (c: string) => string): TemplateOption[] {
  return res.map((r) => {
    const allowed = t.access_mode === "named" || viewer.canCreate(r.company, r.division, t.sensitivity);
    return { company: r.company, label: companyName(r.company), ok: allowed && Boolean(r.route), reason: !allowed ? "You can't create documents for this company." : r.missing };
  });
}

/** Templates ranked for a person: ones for their own divisions or categories first. Recent templates are handled by the caller. */
export function recommend(templates: DocTemplate[], viewer: Pick<ViewerScope, "divisionIds">, limit = 4): DocTemplate[] {
  const mine = new Set(viewer.divisionIds);
  return templates.filter((t) => (t.storage_division_id && mine.has(t.storage_division_id)) || t.division_ids?.some((d) => mine.has(d))).slice(0, limit);
}

export function filterTemplates<T extends DocTemplate>(templates: T[], f: { q?: string; category?: string; docType?: string; company?: string }): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return templates.filter((t) => (!f.category || t.category === f.category) && (!f.docType || t.doc_type === f.docType) && (!f.company || t.company_codes.includes(f.company))
    && (!q || `${t.name} ${t.description} ${t.use_when ?? ""} ${t.category}`.toLowerCase().includes(q)));
}

const realDate = (s: string) => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };

/** Checks a form against a template's fields. Returns field → message. Unknown keys are ignored (never stored). */
export function validateInputs(fields: TemplateField[], inputs: Record<string, unknown>): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const f of fields) {
    const raw = inputs[f.key];
    const v = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
    if (!v) { if (f.required) errs[f.key] = `${f.label} is required.`; continue; }
    if (f.maxLength && v.length > f.maxLength) errs[f.key] = `${f.label} can be at most ${f.maxLength} characters.`;
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errs[f.key] = `${f.label} must be a date.`;
    if (f.type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !realDate(v)) errs[f.key] = `${f.label} must be a real date.`;
    if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) errs[f.key] = `${f.label} must be a number.`;
      else if (f.min !== undefined && n < f.min) errs[f.key] = `${f.label} must be at least ${f.min.toLocaleString("en-US")}.`;
      else if (f.max !== undefined && n > f.max) errs[f.key] = `${f.label} must be at most ${f.max.toLocaleString("en-US")}.`;
    }
    if (f.type === "select" && f.options && !f.options.some((o) => o.value === v)) errs[f.key] = `Choose a valid ${f.label.toLowerCase()}.`;
  }
  return errs;
}

/** Consistency rules for a template's metadata, in words. Used by Admin before saving; the database enforces the hard ones too. */
export function validateTemplateMeta(t: Pick<DocTemplate, "name" | "category" | "doc_type" | "sensitivity" | "company_codes" | "division_ids" | "storage_division_id" | "eligibility" | "access_mode" | "kind" | "drive_template_file_id">): string[] {
  const out: string[] = [];
  if (!t.name.trim()) out.push("Give the template a name.");
  if (!t.category.trim()) out.push("Choose a category.");
  if (!t.company_codes.length) out.push("Choose at least one company.");
  if (t.access_mode === "named" && t.eligibility === "staff") out.push("A template whose documents are readable by named people only can't be open to any staff member. Choose founders, or founders and a named list.");
  if (t.sensitivity === "Restricted" && t.eligibility === "staff") out.push("Restricted documents can't be generated by any staff member. Choose founders, or founders and a named list.");
  if (t.storage_division_id && t.division_ids && !t.division_ids.includes(t.storage_division_id)) out.push("The storage division must be one of the supported divisions.");
  if (t.kind === "drive_copy" && !t.drive_template_file_id) out.push("Choose the Drive master template this copies.");
  return out;
}

export function missingConfiguration(r: CompanyResolution, t: Pick<DocTemplate, "doc_type" | "sensitivity">, companyLabel: string, divisionLabel: string | null): string[] {
  if (r.route) return [];
  const where = `${companyLabel} · ${r.division ? divisionLabel ?? r.division : "any division"} · ${t.sensitivity}`;
  return r.proposed
    ? [`Approve the proposed route “${r.proposed.folder_name}” for ${where} in Admin → Drive folder routes.`]
    : [`Add and approve a Drive folder route for ${where} (document type ${t.doc_type} or any type) in Admin → Drive folder routes.`];
}
