// GIF 2026 Assignment & Assessment Portal: shared, framework-free logic (statuses, progress, validation, file sniffing,
// CSV). Used by the delegate portal, the admin dashboard and the API routes; unit-tested in tests/gif-portal.test.mjs.
// Everything that matters for security is ALSO enforced in the database (migration 20261122000000).

export type SubmissionStatus = "in_progress" | "submitted" | "under_review" | "approved" | "revision_required";
export type DisplayStatus = "not_started" | SubmissionStatus;
export type SubmissionType = "group" | "individual";
export type FieldType = "text" | "textarea" | "url" | "select" | "checkbox" | "members" | "files" | "story_proof" | "rating";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
  max?: number;
  accept?: string;
  max_files?: number;
  min_files?: number;
  or_field?: string;
  story_day?: number;
  day_options?: number[]; // story_proof: delegate picks the programme day per upload
}
export interface RubricCriterion { key: string; label: string; description?: string }

export interface Assignment {
  id: string;
  edition: string;
  day_number: number | null;
  track?: "programme" | "eligibility";
  window_label?: string | null;
  slug: string;
  title: string;
  purpose: string | null;
  instructions: string | null;
  deliverables: string[];
  submission_type: SubmissionType;
  submission_format: string | null;
  fields: FieldDef[];
  rubric: RubricCriterion[];
  sort_order: number;
  opens_at: string | null;
  due_at: string | null;
  allow_late: boolean;
  is_active: boolean;
  updated_at?: string;
}
export interface ProgrammeDay { edition: string; day_number: number; title: string; theme: string | null; summary: string | null; day_date: string | null }
export interface Submission {
  id: string;
  assignment_id: string;
  delegate_id: string | null;
  team_id: string | null;
  status: SubmissionStatus;
  responses: Record<string, unknown>;
  version: number;
  submitted_by_delegate_id: string | null;
  first_submitted_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface SubmissionFile {
  id: string;
  submission_id: string;
  field_key: string;
  kind: "story_proof" | "file";
  bucket: "gif-story-proofs" | "gif-submission-files";
  storage_path: string;
  original_name: string | null;
  mime_type: string;
  size_bytes: number;
  story_day: number | null;
  description: string | null;
  uploaded_at: string;
  expires_at: string | null;
  deleted_at: string | null;
  retention_status: "active" | "expired" | "deleted" | "deletion_failed" | "not_applicable";
}
export interface Assessment {
  id: string;
  submission_id: string;
  submission_version: number;
  assessor_id: string;
  status: "under_review" | "approved" | "revision_required";
  rubric_scores: Record<string, number>;
  score: number | null;
  max_score: number | null;
  feedback: string | null;
  revision_instructions: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  revision_required: "Revision Required",
};
// Accent names from components/dashboard/ui.ts ACCENTS
export const STATUS_ACCENT: Record<DisplayStatus, "navy" | "amber" | "teal" | "violet" | "green" | "coral"> = {
  not_started: "navy",
  in_progress: "amber",
  submitted: "teal",
  under_review: "violet",
  approved: "green",
  revision_required: "coral",
};
export const ALL_DISPLAY_STATUSES: DisplayStatus[] = ["not_started", "in_progress", "submitted", "under_review", "approved", "revision_required"];

export const EDITABLE_STATUSES: SubmissionStatus[] = ["in_progress", "submitted", "revision_required"];
export const isDone = (s: DisplayStatus) => s === "submitted" || s === "under_review" || s === "approved";
export const isAwaitingReview = (s: DisplayStatus) => s === "submitted" || s === "under_review";

export function canDelegateEdit(a: Pick<Assignment, "is_active" | "opens_at" | "due_at" | "allow_late">, s: Pick<Submission, "status"> | null, now = Date.now()): boolean {
  if (!a.is_active) return false;
  if (a.opens_at && Date.parse(a.opens_at) > now) return false;
  if (s && !EDITABLE_STATUSES.includes(s.status)) return false;
  if (!a.allow_late && a.due_at && now > Date.parse(a.due_at) && s?.status !== "revision_required") return false;
  return true;
}

export const displayStatus = (s: Pick<Submission, "status"> | null | undefined): DisplayStatus => (s ? s.status : "not_started");

// Combine several parts (e.g. group + individual) into one status for a day card or a tracking-table cell.
export function combineStatuses(list: DisplayStatus[]): DisplayStatus {
  if (!list.length) return "not_started";
  if (list.includes("revision_required")) return "revision_required";
  if (list.every((s) => s === "approved")) return "approved";
  if (list.every((s) => s === "not_started")) return "not_started";
  if (list.every((s) => isDone(s))) return list.some((s) => s === "under_review") ? "under_review" : "submitted";
  return "in_progress";
}

export interface ProgressCounts { total: number; completed: number; pending: number; awaitingReview: number; revision: number; percent: number }
// "completed" = submitted, under review or approved (the delegate's part is done); pending = not started / in progress.
export function progressCounts(statuses: DisplayStatus[]): ProgressCounts {
  const total = statuses.length;
  const completed = statuses.filter(isDone).length;
  const revision = statuses.filter((s) => s === "revision_required").length;
  const awaitingReview = statuses.filter(isAwaitingReview).length;
  const pending = total - completed - revision;
  return { total, completed, pending, awaitingReview, revision, percent: total ? Math.round((completed / total) * 100) : 0 };
}

// The submission that applies to a delegate for an assignment: their own (individual) or their team's (group).
export function submissionFor(a: Pick<Assignment, "id" | "submission_type">, subs: Submission[], delegateId: string | null, teamId: string | null): Submission | null {
  return subs.find((s) => s.assignment_id === a.id && (a.submission_type === "group" ? s.team_id !== null && s.team_id === teamId : s.delegate_id !== null && s.delegate_id === delegateId)) ?? null;
}

// Client mirror of public.gif_submission_missing(): which required fields are still empty.
export function missingRequired(fields: FieldDef[], responses: Record<string, unknown>, fileCounts: Record<string, number>): string[] {
  const out: string[] = [];
  const filled = (k?: string) => !!k && ((typeof responses[k] === "string" && (responses[k] as string).trim() !== "") || typeof responses[k] === "number");
  for (const f of fields) {
    if (!f.required || f.type === "members") continue;
    if (f.type === "files" || f.type === "story_proof") {
      if ((fileCounts[f.key] ?? 0) < Math.max(f.min_files ?? 1, 1) && !filled(f.or_field)) out.push(f.key);
    } else if (f.type === "checkbox") {
      if (responses[f.key] !== true) out.push(f.key);
    } else if (!filled(f.key) && !(f.or_field && (fileCounts[f.or_field] ?? 0) > 0)) {
      out.push(f.key);
    }
  }
  return out;
}

export function isHttpUrl(v: string): boolean {
  try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
}

// ---------------------------------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------------------------------
export const STORY_BUCKET = "gif-story-proofs";
export const FILES_BUCKET = "gif-submission-files";
export const STORY_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MAX_BYTES = 50 * 1024 * 1024;
export const STORY_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const RETENTION_DAYS = 7;
export const RETENTION_NOTE =
  "Instagram Story screenshots are retained for seven days after upload and then automatically deleted. Your submission and assessment status will remain recorded.";

const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", PPTX, DOCX, "video/mp4", "video/quicktime"];

// Detect the real type from the first bytes (never trust the filename or the browser's claimed type).
// OOXML files are ZIPs; the caller passes the extension hint to tell PPTX from DOCX.
export function sniffType(bytes: Uint8Array, nameHint = ""): string | null {
  const b = bytes;
  const at = (i: number, ...v: number[]) => v.every((x, j) => b[i + j] === x);
  if (b.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (b.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (b.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  if (b.length >= 5 && at(0, 0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (b.length >= 4 && at(0, 0x50, 0x4b, 0x03, 0x04)) {
    const ext = nameHint.toLowerCase().split(".").pop();
    return ext === "pptx" ? PPTX : ext === "docx" ? DOCX : null;
  }
  if (b.length >= 12 && at(4, 0x66, 0x74, 0x79, 0x70)) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    return brand === "qt  " ? "video/quicktime" : "video/mp4";
  }
  return null;
}

export function acceptList(accept?: string, kind: "story_proof" | "file" = "file"): string[] {
  if (kind === "story_proof") return STORY_TYPES;
  const list = (accept ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list.filter((t) => FILE_TYPES.includes(t)) : FILE_TYPES;
}

export function validateUpload(file: { size: number; sniffed: string | null }, kind: "story_proof" | "file", accept?: string): string | null {
  const max = kind === "story_proof" ? STORY_MAX_BYTES : FILE_MAX_BYTES;
  if (!file.size) return "This file is empty.";
  if (file.size > max) return `This file is too large. The maximum is ${Math.round(max / 1024 / 1024)} MB.`;
  const allowed = acceptList(accept, kind);
  if (!file.sniffed || !allowed.includes(file.sniffed)) {
    return kind === "story_proof" ? "Please upload a JPG, PNG or WEBP screenshot." : `This file type isn't accepted here (${describeTypes(allowed)}).`;
  }
  return null;
}

export function describeTypes(types: string[]): string {
  const names: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WEBP", "application/pdf": "PDF", [PPTX]: "PPTX", [DOCX]: "DOCX", "video/mp4": "MP4", "video/quicktime": "MOV" };
  return Array.from(new Set(types.map((t) => names[t] ?? t))).join(", ");
}

export const extFor = (mime: string) =>
  ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf", [PPTX]: "pptx", [DOCX]: "docx", "video/mp4": "mp4", "video/quicktime": "mov" } as Record<string, string>)[mime] ?? "bin";

// Storage paths: story proofs gif-story-proofs/{delegate_id}/{submission_id}/{file}; other files gif-submission-files/{submission_id}/{file}
export function storagePath(kind: "story_proof" | "file", ids: { delegateId: string; submissionId: string }, mime: string, unique: string): string {
  const file = `${unique}.${extFor(mime)}`;
  return kind === "story_proof" ? `${ids.delegateId}/${ids.submissionId}/${file}` : `${ids.submissionId}/${file}`;
}
export function pathMatches(kind: "story_proof" | "file", path: string, ids: { delegateId: string; submissionId: string }): boolean {
  const re = /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i;
  const parts = path.split("/");
  if (kind === "story_proof") return parts.length === 3 && parts[0] === ids.delegateId && parts[1] === ids.submissionId && re.test(parts[2]);
  return parts.length === 2 && parts[0] === ids.submissionId && re.test(parts[1]);
}

// Retention: hours left until a story proof is deleted; "warning" within 48 h.
export function retentionInfo(f: Pick<SubmissionFile, "kind" | "expires_at" | "retention_status" | "deleted_at">, now = Date.now()) {
  if (f.kind !== "story_proof" || !f.expires_at) return null;
  if (f.retention_status === "deleted" || f.deleted_at) return { state: "deleted" as const, hoursLeft: 0 };
  const hoursLeft = Math.max(0, Math.floor((Date.parse(f.expires_at) - now) / 3600000));
  if (Date.parse(f.expires_at) <= now) return { state: "expired" as const, hoursLeft: 0 };
  return { state: hoursLeft <= 48 ? ("warning" as const) : ("active" as const), hoursLeft };
}

// ---------------------------------------------------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------------------------------------------------
export function rubricTotal(rubric: RubricCriterion[], scores: Record<string, number>) {
  const vals = rubric.map((c) => scores[c.key]).filter((v): v is number => typeof v === "number");
  return { score: vals.reduce((a, b) => a + b, 0), max: rubric.length * 5, scored: vals.length };
}
// Postgres numeric arrives as a string ("18.00"): show 18/25.
export const fmtScore = (score: number | string | null | undefined, max: number | string | null | undefined) =>
  score === null || score === undefined ? "" : `${Number(score)}/${Number(max)}`;

export const latestAssessment = (list: Assessment[], submissionId: string): Assessment | null =>
  list.filter((a) => a.submission_id === submissionId).sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

// ---------------------------------------------------------------------------------------------------------------------
// Config validation (admin assignment editor)
// ---------------------------------------------------------------------------------------------------------------------
const FIELD_TYPES: FieldType[] = ["text", "textarea", "url", "select", "checkbox", "members", "files", "story_proof", "rating"];
export function validateFieldsConfig(raw: unknown): { ok: true; value: FieldDef[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "Fields must be a JSON array." };
  const keys = new Set<string>();
  for (const [i, f] of raw.entries()) {
    if (!f || typeof f !== "object") return { ok: false, error: `Field ${i + 1} is not an object.` };
    const o = f as Record<string, unknown>;
    if (typeof o.key !== "string" || !/^[a-z][a-z0-9_]{0,40}$/.test(o.key)) return { ok: false, error: `Field ${i + 1}: key must be lower_snake_case.` };
    if (keys.has(o.key)) return { ok: false, error: `Duplicate field key "${o.key}".` };
    keys.add(o.key);
    if (typeof o.label !== "string" || !o.label.trim()) return { ok: false, error: `Field "${o.key}": label is required.` };
    if (!FIELD_TYPES.includes(o.type as FieldType)) return { ok: false, error: `Field "${o.key}": type must be one of ${FIELD_TYPES.join(", ")}.` };
    if (o.type === "select" && (!Array.isArray(o.options) || !o.options.length)) return { ok: false, error: `Field "${o.key}": a select needs options.` };
  }
  for (const f of raw as FieldDef[]) if (f.or_field && !keys.has(f.or_field)) return { ok: false, error: `Field "${f.key}": or_field "${f.or_field}" does not exist.` };
  return { ok: true, value: raw as FieldDef[] };
}
export function validateRubricConfig(raw: unknown): { ok: true; value: RubricCriterion[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: "Rubric must be a JSON array." };
  const keys = new Set<string>();
  for (const c of raw) {
    if (!c || typeof c.key !== "string" || !/^[a-z][a-z0-9_]{0,40}$/.test(c.key) || typeof c.label !== "string" || !c.label.trim())
      return { ok: false, error: "Each criterion needs a lower_snake_case key and a label." };
    if (keys.has(c.key)) return { ok: false, error: `Duplicate criterion "${c.key}".` };
    keys.add(c.key);
  }
  return { ok: true, value: raw as RubricCriterion[] };
}

// ---------------------------------------------------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------------------------------------------------
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// Programme tasks belong to a day; GIF Summer 2027 eligibility tasks don't.
export const isProgramme = (a: Pick<Assignment, "track" | "day_number">) => (a.track ?? "programme") === "programme" && a.day_number !== null;
export const assignmentLabel = (a: Pick<Assignment, "day_number" | "title" | "track">) => (a.day_number ? `Day ${a.day_number}` : "Summer 2027");

export const fmtDateTime = (iso: string | null | undefined, tz = "Asia/Singapore") =>
  iso ? new Date(iso).toLocaleString("en-GB", { timeZone: tz, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " SGT" : "—";
