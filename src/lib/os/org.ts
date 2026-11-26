// The HQ structure (from 26 Nov 2026): two departments, six divisions, and the four portfolio projects. Pure, so tests
// import it with the .ts extension. Division ids, codes and departments match migration 20261214000000; the database
// is the source of truth for who belongs where (os_person_divisions), this file only names and orders things.

export type DepartmentKey = "operations" | "growth";

export interface DepartmentDef {
  key: DepartmentKey; name: string; short: string; lead: string; leadTitle: string; purpose: string; divisions: string[];
}
export interface DivisionDef {
  id: string; code: string; name: string; department: DepartmentKey; purpose: string; previously?: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  { key: "operations", name: "Operations Department", short: "Operations", lead: "Farrel", leadTitle: "Co-Founder & COO",
    purpose: "Runs execution across every project: plans, logistics, partners and people.", divisions: ["OPS", "PAR", "PPL"] },
  { key: "growth", name: "Growth Department", short: "Growth", lead: "Arba", leadTitle: "Co-Founder & CEO",
    purpose: "Brings people to every project: strategy, content, design and distribution.", divisions: ["GRO", "MKT", "CRE"] },
];

export const DIVISIONS: DivisionDef[] = [
  { id: "DIV-02", code: "OPS", name: "Operations", department: "operations", purpose: "Execution and coordination across projects: plans, milestones, logistics, SOPs, workflows, reporting and operational risk." },
  { id: "DIV-06", code: "PAR", name: "Business", department: "operations", previously: "Partnerships", purpose: "Partnerships in five categories, from first contact to written confirmation." },
  { id: "DIV-05", code: "PPL", name: "People", department: "operations", purpose: "HR and people operations, plus delegate and community care." },
  { id: "DIV-03", code: "GRO", name: "Growth", department: "growth", purpose: "Social media distribution, audience growth, KOL and UGC creators, growth experiments." },
  { id: "DIV-10", code: "MKT", name: "Marketing", department: "growth", purpose: "Content strategy: pillars, calendar, campaigns, briefs to Creative, review and approval." },
  { id: "DIV-04", code: "CRE", name: "Creative", department: "growth", purpose: "Design and creative production: requests, queue, revisions, approval and delivery." },
];
/** Divisions retired on 26 Nov 2026. Their rows stay (inactive) so history keeps its labels. */
export const RETIRED_DIVISIONS: Record<string, string> = { "DIV-01": "Community (retired)", "DIV-07": "Courses & Learning (retired)" };

export const departmentByKey = (k: string | null | undefined) => DEPARTMENTS.find((d) => d.key === k);
export const divisionByCode = (c: string | null | undefined) => DIVISIONS.find((d) => d.code === (c ?? "").toUpperCase());
export const divisionById = (id: string | null | undefined) => DIVISIONS.find((d) => d.id === id);
export const departmentOfDivision = (id: string | null | undefined): DepartmentKey | null => divisionById(id)?.department ?? null;
export const departmentName = (k: string | null | undefined) => departmentByKey(k)?.short ?? "—";
export const divisionsOf = (k: DepartmentKey) => DIVISIONS.filter((d) => d.department === k);

export const PARTNER_CATEGORIES = [
  { value: "media", label: "Media Partnership" },
  { value: "corporate", label: "Corporate Partnership" },
  { value: "academic", label: "Academic Partnership" },
  { value: "community", label: "Community Partnership" },
  { value: "recruitment", label: "Recruitment Partnership" },
] as const;
export const partnerCategoryLabel = (v: string | null | undefined) => PARTNER_CATEGORIES.find((c) => c.value === v)?.label ?? "Uncategorised";

export type PortfolioKey = "circle" | "gif" | "elco" | "course";
export const PORTFOLIO_KEYS: PortfolioKey[] = ["circle", "gif", "elco", "course"];

// ── Task table helpers ───────────────────────────────────────────────────────────────────────────────────────────
export interface GridTask {
  id: string; title: string; status: string; priority: string; owner_person_id: string | null; due_date: string | null;
  division_id: string | null; department: string | null; project_id: string | null; company_code: string;
}
export type GroupKey = "none" | "project" | "department" | "division" | "month" | "status" | "owner";
export const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "none", label: "No grouping" }, { key: "project", label: "Project" }, { key: "department", label: "Department" },
  { key: "division", label: "Division" }, { key: "month", label: "Month" }, { key: "status", label: "Status" }, { key: "owner", label: "PIC" },
];

/** "2026-12" for a due date, "none" without one. */
export const monthKey = (due: string | null | undefined) => (due ? due.slice(0, 7) : "none");
export function monthLabel(key: string): string {
  if (key === "none") return "No deadline";
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function groupKeyOf(t: GridTask, g: GroupKey): string {
  switch (g) {
    case "project": return t.project_id ?? "none";
    case "department": return t.department ?? departmentOfDivision(t.division_id) ?? "none";
    case "division": return t.division_id ?? "none";
    case "month": return monthKey(t.due_date);
    case "status": return t.status;
    case "owner": return t.owner_person_id ?? "none";
    default: return "all";
  }
}

const STATUS_ORDER = ["Blocked", "In Progress", "In Review", "Ready", "Backlog", "Done", "Cancelled"];
/** Groups in a stable, useful order: months by date, statuses by urgency, the rest by label, "none" last. */
export function groupTasks<T extends GridTask>(rows: T[], g: GroupKey, label: (key: string) => string): { key: string; label: string; rows: T[] }[] {
  if (g === "none") return [{ key: "all", label: "All", rows }];
  const map = new Map<string, T[]>();
  for (const r of rows) { const k = groupKeyOf(r, g); map.set(k, [...(map.get(k) ?? []), r]); }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "none") return 1;
    if (b === "none") return -1;
    if (g === "month") return a.localeCompare(b);
    if (g === "status") return STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b);
    return label(a).localeCompare(label(b));
  });
  return keys.map((k) => ({ key: k, label: label(k), rows: map.get(k)! }));
}

export interface TaskFilter { q?: string; status?: string; owner?: string; department?: string; division?: string; project?: string; month?: string; showDone?: boolean }
export const OPEN_STATUSES = ["Backlog", "Ready", "In Progress", "In Review", "Blocked"];
export function filterTasks<T extends GridTask>(rows: T[], f: TaskFilter, view: string, ctx: { me: string; assignees: Map<string, string[]>; today: string; soon: string }): T[] {
  const open = (s: string) => OPEN_STATUSES.includes(s);
  return rows.filter((t) => {
    if (view === "mine" && !(t.owner_person_id === ctx.me || (ctx.assignees.get(t.id) ?? []).includes(ctx.me))) return false;
    if (view === "overdue" && !(t.due_date && t.due_date < ctx.today && open(t.status))) return false;
    if (view === "upcoming" && !(t.due_date && t.due_date >= ctx.today && t.due_date <= ctx.soon && open(t.status))) return false;
    if (view === "stale" && !(open(t.status) && t.due_date && t.due_date < ctx.today && t.status === "Backlog")) return false;
    if (!f.showDone && !f.status && !open(t.status)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.owner && (f.owner === "none" ? t.owner_person_id !== null : t.owner_person_id !== f.owner)) return false;
    if (f.department && (t.department ?? departmentOfDivision(t.division_id) ?? "none") !== f.department) return false;
    if (f.division && (t.division_id ?? "none") !== f.division) return false;
    if (f.project && (t.project_id ?? "none") !== f.project) return false;
    if (f.month && monthKey(t.due_date) !== f.month) return false;
    if (f.q && !`${t.id} ${t.title}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });
}

/** Status colours for the table: one clear colour per state (background, text). */
export const STATUS_COLOURS: Record<string, { bg: string; fg: string }> = {
  Backlog: { bg: "#EEF1F5", fg: "#3A4B60" },
  Ready: { bg: "#E3EEFB", fg: "#1D4F8C" },
  "In Progress": { bg: "#DDF3EE", fg: "#0F6655" },
  "In Review": { bg: "#EFE6FA", fg: "#5B3394" },
  Blocked: { bg: "#FBE3E3", fg: "#A12D2F" },
  Done: { bg: "#E2F3E5", fg: "#22683A" },
  Cancelled: { bg: "#F1F1F1", fg: "#77808C" },
};
export const PRIORITY_COLOURS: Record<string, { bg: string; fg: string }> = {
  "P1 Critical": { bg: "#FBE3E3", fg: "#A12D2F" },
  "P2 High": { bg: "#FDF0D8", fg: "#865400" },
  "P3 Normal": { bg: "#F3F5F7", fg: "#3A4B60" },
  "P4 Low": { bg: "#F7F8FA", fg: "#77808C" },
};
