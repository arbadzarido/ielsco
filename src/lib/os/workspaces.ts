// Division workspaces: which sections each workspace has and which a person sees. Pure (imported by tests with the
// .ts extension). The database decides what anyone can read; this only decides what the sidebar offers, so a section
// someone can't open is never listed.

export type WsAccess = "none" | "view" | "edit";
export type WsRole = "viewer" | "member" | "officer" | "approver" | "signatory" | "lead";
export interface MyWorkspace {
  division_id: string; code: string; name: string; privacy: "open" | "restricted"; access: WsAccess; roles: WsRole[];
  is_member: boolean; is_manager: boolean; is_lead: boolean;
}

export type WsSection = "overview" | "projects" | "tasks" | "meetings" | "metrics" | "documents" | "requests" | "access"
  | "ledger" | "budgets" | "cashflow" | "setup" | "letters" | "agreements" | "compliance" | "numbering";
export interface WsNavItem { key: string; label: string; href: string; icon: "home" | "briefcase" | "check" | "file" | "inbox" | "shield" | "megaphone" | "handshake" | "users" | "userplus" | "scroll"
  | "wallet" | "piggy" | "chart" | "settings" | "mail" | "signature" | "calendar" | "hash" }

const SECTION: Record<WsSection, { label: string; icon: WsNavItem["icon"] }> = {
  overview: { label: "Overview", icon: "home" },
  projects: { label: "Projects", icon: "briefcase" },
  tasks: { label: "Tasks", icon: "check" },
  meetings: { label: "Meetings", icon: "users" },
  metrics: { label: "Metrics", icon: "chart" },
  documents: { label: "Documents", icon: "file" },
  requests: { label: "Requests", icon: "inbox" },
  access: { label: "Members and access", icon: "shield" },
  ledger: { label: "Transactions", icon: "wallet" },
  budgets: { label: "Budgets", icon: "piggy" },
  cashflow: { label: "Cash flow and reports", icon: "chart" },
  setup: { label: "Categories and accounts", icon: "settings" },
  letters: { label: "Letters", icon: "mail" },
  agreements: { label: "Agreements", icon: "signature" },
  compliance: { label: "Compliance calendar", icon: "calendar" },
  numbering: { label: "Numbering", icon: "hash" },
};
export const SECTION_LABEL: Record<WsSection, string> = Object.fromEntries(Object.entries(SECTION).map(([k, v]) => [k, v.label])) as Record<WsSection, string>;

/** Existing Company OS modules that belong to one division's workspace. */
const DIVISION_MODULES: Record<string, { label: string; href: string; icon: WsNavItem["icon"]; needs?: "recruitment" }[]> = {
  GRO: [{ label: "Campaigns", href: "/os/campaigns", icon: "megaphone" }],
  PAR: [{ label: "Partnerships", href: "/os/partnerships", icon: "handshake" }],
  PPL: [
    { label: "People", href: "/os/people", icon: "users" },
    { label: "Reviews", href: "/os/reviews", icon: "scroll" },
    { label: "Recruitment", href: "/os/recruitment", icon: "userplus", needs: "recruitment" },
  ],
};

export const workspaceHref = (code: string, section: WsSection = "overview") => `/os/d/${code.toLowerCase()}${section === "overview" ? "" : `?tab=${section}`}`;

/** Sections of a workspace, in sidebar order. Finance and Legal have their registers instead of project and task lists;
 * another restricted workspace has documents only. Metrics are for open divisions: Finance figures stay in Finance. `requests` appears once the request system exists. */
export function workspaceSections(ws: Pick<MyWorkspace, "privacy"> & { code?: string }, opts: { requests?: boolean } = {}): WsSection[] {
  const base: WsSection[] = ws.code === "FIN" ? ["overview", "ledger", "budgets", "cashflow", "meetings", "documents"]
    : ws.code === "LEG" ? ["overview", "letters", "agreements", "compliance", "meetings", "documents"]
    : ws.privacy === "restricted" ? ["overview", "meetings", "documents"] : ["overview", "projects", "tasks", "meetings", "metrics", "documents"];
  const tail: WsSection[] = ws.code === "FIN" ? ["setup"] : ws.code === "LEG" ? ["numbering"] : [];
  return [...base, ...(opts.requests ? ["requests" as const] : []), ...tail, "access"];
}

/** The sidebar for one workspace, or nothing when the person has no access to it. */
export function workspaceNav(ws: MyWorkspace, opts: { requests?: boolean; recruitment?: boolean } = {}): WsNavItem[] {
  if (ws.access === "none") return [];
  const items: WsNavItem[] = workspaceSections(ws, opts).map((s) => ({ key: s, label: SECTION[s].label, href: workspaceHref(ws.code, s), icon: SECTION[s].icon }));
  const extra = (DIVISION_MODULES[ws.code] ?? []).filter((m) => m.needs !== "recruitment" || opts.recruitment)
    .map((m) => ({ key: m.href, label: m.label, href: m.href, icon: m.icon }));
  // Division modules sit after the working lists and before Members and access.
  return [...items.slice(0, -1), ...extra, items[items.length - 1]];
}

export const ROLE_LABELS: Record<WsRole, string> = { viewer: "Viewer", member: "Member", officer: "Officer", approver: "Approver", signatory: "Signatory", lead: "Lead" };

/** Roles a person may give in a workspace: founders any (Approver only in Finance, Signatory only in Legal); a lead
 * the everyday roles, with an end date. Mirrors the database rule so the form never offers a refusal. */
export function grantableRoles(code: string, giver: { founder: boolean; lead: boolean }): WsRole[] {
  if (!giver.founder && !giver.lead) return [];
  const base: WsRole[] = ["viewer", "member", "officer"];
  if (!giver.founder) return base;
  return [...base, ...(code === "FIN" ? ["approver" as const] : []), ...(code === "LEG" ? ["signatory" as const] : []), "lead"];
}

const RANK: WsRole[] = ["lead", "approver", "signatory", "officer", "member", "viewer"];
export function accessLabel(ws: Pick<MyWorkspace, "access" | "roles" | "is_member" | "is_lead">): string {
  if (ws.access === "none") return "No access";
  const top = RANK.find((r) => ws.roles.includes(r));
  const role = ws.is_lead ? "Lead" : top ? ROLE_LABELS[top] : ws.is_member ? "Member" : null;
  return `${role ?? (ws.access === "edit" ? "Can edit" : "Can view")}`;
}

/** The workspace a path is in: /os/d/<code>… */
export function workspaceFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/os\/d\/([a-z]{2,3})(?:\/|$)/i);
  return m ? m[1].toUpperCase() : null;
}

/** Latest end date a request may ask for (90 days, as the database allows). */
export const MAX_ACCESS_DAYS = 90;
