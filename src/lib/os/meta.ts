// Company OS vocabularies, labels and small formatting helpers shared by every module.
// Status, priority and type lists match the checks in supabase/migrations/20261108000000_company_os_work.sql, which
// take them from Operations Master → Config_Lists.
import type { CompanyCode } from "./types";

export type Sensitivity = "Internal" | "Confidential" | "Restricted";
export const SENSITIVITIES: Sensitivity[] = ["Internal", "Confidential", "Restricted"];

export const PROJECT_STATUSES = ["Proposed", "Approved", "Active", "On Hold", "Completed", "Cancelled"] as const;
export const TASK_STATUSES = ["Backlog", "Ready", "In Progress", "In Review", "Blocked", "Done", "Cancelled"] as const;
export const OPEN_TASK_STATUSES = ["Backlog", "Ready", "In Progress", "In Review", "Blocked"] as const;
export const BOARD_COLUMNS = ["Backlog", "Ready", "In Progress", "In Review", "Blocked", "Done"] as const;
export const PRIORITIES = ["P1 Critical", "P2 High", "P3 Normal", "P4 Low"] as const;
export const PROJECT_TYPES = ["Program", "Event", "Product", "Campaign", "Partnership", "Internal", "Hiring", "Finance / Admin"] as const;
export const DOC_STATUSES = ["Draft", "In Review", "Approved", "Superseded", "Archived"] as const;
export const DOC_TYPES: { code: string; label: string }[] = [
  { code: "GOV", label: "Governance" }, { code: "POL", label: "Policy" }, { code: "SOP", label: "SOP" },
  { code: "TPL", label: "Template" }, { code: "PLN", label: "Plan" }, { code: "RPT", label: "Report" },
  { code: "MIN", label: "Minutes" }, { code: "MOM", label: "Minutes of meeting" }, { code: "PRP", label: "Proposal" },
  { code: "CTR", label: "Contract" }, { code: "LET", label: "Letter" }, { code: "FIN", label: "Finance" }, { code: "REF", label: "Reference" },
];
export const DECISION_STATUSES = ["Proposed", "Approved", "Rejected", "Superseded"] as const;
export const OPP_STAGES = ["1 Identified", "2 Contacted", "3 Meeting held", "4 Proposal or quotation sent", "5 Negotiating", "6 Won", "7 Lost", "On hold"] as const;
export const EVIDENCE_STATUSES = ["1 Researched (no contact yet)", "2 Contacted", "3 Interested", "4 Verbally discussed", "5 Formally confirmed in writing"] as const;
export const CAMPAIGN_STATUSES = ["Idea", "Planned", "In production", "In review", "Ready to publish", "Published", "Cancelled"] as const;
export const CAMPAIGN_PLAN_STATUSES = ["Idea", "Planned", "Active", "Paused", "Completed", "Cancelled"] as const;
export const PRODUCT_ITEM_TYPES = ["Release", "Feature", "Defect", "Pilot cohort"] as const;
export const PRODUCT_STATUSES = ["Planned", "In progress", "In QA", "Released", "Fixed", "Open", "Held", "Cancelled"] as const;
export const OBJECTIVE_STATUSES = ["Draft", "Active", "Achieved", "Partly achieved", "Missed", "Dropped"] as const;
export const KR_STATUSES = ["Not started", "On track", "At risk", "Off track", "Done", "Dropped"] as const;
export const TIMELINE_STATUSES = ["Not started", "In progress", "Done", "Blocked", "Deferred", "Cancelled"] as const;
export const REVIEW_STATUSES = ["Not started", "Self-assessment", "Manager review", "Completed", "Acknowledged"] as const;
export const MEMBERSHIP_TYPES = ["Founder", "Manager", "Employee", "Contractor", "Volunteer", "Intern", "Partner", "AI Assistant"] as const;

// Workspaces. The URL slug is lower case; the code is what the database stores.
export const WORKSPACES: { code: CompanyCode; slug: string; name: string; legal: string | null; logo: string; logoAlt: string }[] = [
  { code: "HQ", slug: "hq", name: "HQ", legal: "Shared founders office", logo: "/icon-192.png", logoAlt: "IELSco and Elco AI" },
  { code: "IEL", slug: "ielsco", name: "IELSco", legal: "PT English Space Berkah Indonesia", logo: "/icon-192.png", logoAlt: "IELSco" },
  { code: "ELC", slug: "elco", name: "Elco AI", legal: "PT Elco Edukasi Berkah Indonesia", logo: "/images/contents/mascot/elco.svg", logoAlt: "Elco AI" },
];
export const workspaceBySlug = (slug: string) => WORKSPACES.find((w) => w.slug === slug.toLowerCase());
export const workspaceByCode = (code: string | null | undefined) => WORKSPACES.find((w) => w.code === code);
export const companyName = (code: string | null | undefined) => workspaceByCode(code)?.name ?? code ?? "—";

// Tones for badges: a quiet neutral by default, colour only where the state needs attention.
export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "teal";
export const STATUS_TONE: Record<string, Tone> = {
  Proposed: "neutral", Approved: "blue", Active: "teal", "On Hold": "amber", Completed: "green", Cancelled: "neutral",
  Backlog: "neutral", Ready: "blue", "In Progress": "teal", "In Review": "violet", Blocked: "red", Done: "green",
  Draft: "neutral", Superseded: "neutral", Archived: "neutral", Rejected: "neutral",
  "Not started": "neutral", "In progress": "teal", Deferred: "amber",
  "On track": "green", "At risk": "amber", "Off track": "red", Achieved: "green", "Partly achieved": "amber", Missed: "red", Dropped: "neutral",
  Idea: "neutral", Planned: "blue", "In production": "teal", "Ready to publish": "violet", Published: "green",
  "In QA": "violet", Released: "green", Fixed: "green", Open: "amber", Held: "amber",
  "Self-assessment": "blue", "Manager review": "violet", Acknowledged: "green",
  Internal: "neutral", Confidential: "amber", Restricted: "red",
  "P1 Critical": "red", "P2 High": "amber", "P3 Normal": "neutral", "P4 Low": "neutral",
};

// ── Dates (Asia/Jakarta, the companies' working time zone) ────────────────────────────────────────────────────────
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
export function fmtDate(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(opts.year === false ? {} : { year: "numeric" }), timeZone: iso.length === 10 ? "UTC" : "Asia/Jakarta" });
}
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}
export function relativeDue(due: string | null | undefined, today = todayJakarta()): { label: string; overdue: boolean; soon: boolean } | null {
  if (!due) return null;
  const n = daysBetween(today, due);
  if (n < 0) return { label: `${-n} day${n === -1 ? "" : "s"} overdue`, overdue: true, soon: false };
  if (n === 0) return { label: "Due today", overdue: false, soon: true };
  if (n === 1) return { label: "Due tomorrow", overdue: false, soon: true };
  if (n <= 7) return { label: `Due in ${n} days`, overdue: false, soon: true };
  return { label: `Due ${fmtDate(due, { year: false })}`, overdue: false, soon: false };
}
export const isOpenTask = (status: string) => (OPEN_TASK_STATUSES as readonly string[]).includes(status);

/** A short, readable person label from the directory map, falling back to the raw ID. */
export function personLabel(people: Map<string, { full_name: string; short_name: string | null }>, id: string | null | undefined, fallback?: string | null) {
  if (!id) return fallback || "Unassigned";
  const p = people.get(id);
  return p ? p.short_name || p.full_name : fallback || id;
}
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("") || "?";
}
