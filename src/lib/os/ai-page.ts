// Elco Assistant: what the person is looking at. Pure (no network, no database), so the panel, the chat route and the
// tests share one reading of a Company OS address.
//
// The browser sends where it is (path, query and any filters the page publishes); the server turns that into a small
// PageContext and then reads the records it names WITH THE PERSON'S OWN SESSION, so a page the person can open but a
// record they can't see stays invisible to the assistant too. Nothing here grants access.

export type PageKind =
  | "home" | "assistant" | "tasks" | "task" | "projects" | "project" | "documents" | "document" | "calendar" | "people" | "person"
  | "timeline" | "milestone" | "kpis" | "kpi" | "okrs" | "campaigns" | "campaign" | "partnerships" | "recruitment" | "candidate"
  | "requests" | "request" | "finance" | "legal" | "reviews" | "meeting" | "workspace" | "division" | "admin" | "other";

export interface PageInput { path: string; query?: Record<string, string>; filters?: Record<string, string>; selection?: string[]; title?: string }
export interface PageContext {
  kind: PageKind;
  id: string | null;           // the record the page is about, when there is one
  company: string | null;      // HQ / IEL / ELC when the page is scoped to one company
  division: string | null;     // DIV-0x on a division page or filter
  filters: Record<string, string>;
  selection: string[];         // record IDs the person selected on the page
  label: string;               // "Project PRJ-0033", "Tasks (board)" … for the prompt and the panel header
}

const SLUG_COMPANY: Record<string, string> = { hq: "HQ", ielsco: "IEL", elco: "ELC" };
const COMPANY = /^(HQ|IEL|ELC)$/;
const SAFE_VALUE = /^[A-Za-z0-9 _.:,@+\-]{1,80}$/;
const SAFE_KEY = /^[a-z_]{1,24}$/;
const ID = /^[A-Z]{2,4}-\d{3,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep only short, plain values: a filter can never smuggle instructions or query syntax into a prompt or a query. */
function clean(r: Record<string, string> | undefined, max = 12): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r ?? {}).slice(0, 40)) {
    if (Object.keys(out).length >= max) break;
    if (SAFE_KEY.test(k) && typeof v === "string" && SAFE_VALUE.test(v.trim())) out[k] = v.trim();
  }
  return out;
}

const SINGLE: Record<string, PageKind> = {
  tasks: "task", projects: "project", documents: "document", people: "person", timeline: "milestone", kpis: "kpi",
  campaigns: "campaign", recruitment: "candidate", requests: "request", finance: "finance", legal: "legal", reviews: "reviews", meetings: "meeting",
};
const LIST: Record<string, PageKind> = {
  tasks: "tasks", projects: "projects", documents: "documents", people: "people", timeline: "timeline", kpis: "kpis", okrs: "okrs",
  campaigns: "campaigns", partnerships: "partnerships", recruitment: "recruitment", requests: "requests", finance: "finance", legal: "legal",
  reviews: "reviews", calendar: "calendar", assistant: "assistant", admin: "admin", workspaces: "workspace",
};
const LABEL: Record<PageKind, string> = {
  home: "Home", assistant: "Assistant", tasks: "Tasks", task: "Task", projects: "Projects", project: "Project", documents: "Documents", document: "Document",
  calendar: "Calendar", people: "People", person: "Person", timeline: "Timeline", milestone: "Milestone", kpis: "KPIs", kpi: "KPI", okrs: "OKRs",
  campaigns: "Campaigns", campaign: "Campaign", partnerships: "Partnerships", recruitment: "Recruitment", candidate: "Candidate", requests: "Requests",
  request: "Request", finance: "Finance", legal: "Legal", reviews: "Reviews", meeting: "Meeting", workspace: "Workspace", division: "Division", admin: "Admin", other: "Company OS",
};

export function parsePage(input: PageInput | null | undefined): PageContext | null {
  if (!input || typeof input.path !== "string") return null;
  const path = input.path.split("?")[0].replace(/\/+$/, "") || "/os";
  if (!path.startsWith("/os")) return null;
  const query = clean(input.query, 16);
  const filters = { ...Object.fromEntries(Object.entries(query).filter(([k]) => !["agent", "new", "google"].includes(k))), ...clean(input.filters) };
  const selection = (input.selection ?? []).filter((s) => typeof s === "string" && ID.test(s)).slice(0, 50);
  const parts = path.split("/").filter(Boolean).slice(1); // after "os"
  let kind: PageKind = "other", id: string | null = null, company: string | null = null, division: string | null = null;
  if (!parts.length) kind = "home";
  else if (parts[0] === "w" && parts[1]) { kind = "workspace"; company = SLUG_COMPANY[parts[1].toLowerCase()] ?? null; }
  else if (parts[0] === "d" && parts[1]) { kind = "division"; const n = parts[1].toUpperCase(); division = /^\d{1,2}$/.test(n) ? `DIV-${n.padStart(2, "0")}` : /^DIV-\d{2}$/.test(n) ? n : null; }
  else if (parts[1] && SINGLE[parts[0]]) {
    const raw = decodeURIComponent(parts[1]);
    if (ID.test(raw.toUpperCase()) || UUID.test(raw)) { kind = SINGLE[parts[0]]; id = UUID.test(raw) ? raw.toLowerCase() : raw.toUpperCase(); }
    else kind = LIST[parts[0]] ?? "other";
  } else kind = LIST[parts[0]] ?? "other";
  // A list or calendar can be scoped to one company by its own filter (?company=IEL, or the calendar's ?c=IEL).
  const fc = (filters.company ?? filters.c ?? "").toUpperCase();
  if (!company && COMPANY.test(fc)) company = fc;
  const fd = (filters.division ?? "").toUpperCase();
  if (!division && /^DIV-\d{2}$/.test(fd)) division = fd;
  // A calendar event or a list's open record is the page's subject too.
  if (!id && filters.event && ID.test(filters.event.toUpperCase())) id = filters.event.toUpperCase();
  if (!id && filters.p && ID.test(filters.p.toUpperCase()) && kind === "calendar") id = filters.p.toUpperCase();
  const label = `${LABEL[kind]}${id ? ` ${id.length > 20 ? id.slice(0, 8) + "…" : id}` : ""}${company ? ` · ${company}` : ""}${filters.view ? ` (${filters.view})` : ""}`;
  return { kind, id, company, division, filters, selection, label };
}

/** A few things worth asking on this page, shown as one-tap prompts in the panel. */
export function suggestionsFor(p: PageContext | null): string[] {
  switch (p?.kind) {
    case "task": return ["Summarise this task and what's left", "Break this task into subtasks", "Who should I ask about this?"];
    case "tasks": return ["What's overdue or unassigned here?", "Organise my workload for this week", "Create tasks for…"];
    case "project": return ["Summarise this project's progress", "What's blocked or overdue in this project?", "Create the next tasks for this project"];
    case "projects": return ["Which projects need attention?", "Create a project for…"];
    case "documents": case "document": return ["Which template should I use for…?", "Find documents about…", "What's pending review?"];
    case "calendar": return ["What's on this week?", "Any clashes this week?", "Schedule a meeting…"];
    case "people": case "person": return ["Who works on what?", "Who has too many open tasks?"];
    case "timeline": case "milestone": return ["What's due in the next 30 days?", "Which milestones are at risk?"];
    case "kpis": case "kpi": case "okrs": return ["Which KPIs have no approved target?", "Where are we behind?"];
    case "campaigns": case "campaign": return ["What's planned this week?", "Plan content for…"];
    case "partnerships": return ["Which follow-ups are due?", "Draft the next actions"];
    default: return ["What should I focus on today?", "What's overdue across my work?", "Create tasks for…"];
  }
}
