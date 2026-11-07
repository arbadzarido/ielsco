// Company OS AI: actions that create real records from a plain-language instruction ("assign Farrel to …", "three
// Growth tasks by Friday", "schedule a Growth meeting next Tuesday 2 PM").
//
// The model never writes IDs it hasn't seen and never writes SQL. It proposes a DRAFT through a declared function
// (Gemini function calling, or the ```action``` fallback) using the words the person used: names, a division, a
// project name, a date. The server then RESOLVES every reference against records the person can see:
//   one match  → the field is filled with that record's real ID;
//   several    → the field lists the matches for the person to choose from;
//   none       → the field says so; nothing is invented.
// The person sees the resolved preview and confirms, cancels or edits it. On confirm the server resolves the edited
// draft again (never trusting the browser) and runs it with the person's own session, so RLS decides. Pure: no
// network, no database; the directory of visible records is passed in.
import { z } from "zod";
import { CATEGORIES, DEFAULT_TZ, addDays, weekday, zonedInstant } from "./calendar.ts";

export const INTENT_TYPES = ["create_task", "create_tasks", "assign_task", "create_event", "create_timeline_item"] as const;
export type IntentType = (typeof INTENT_TYPES)[number];
export const isIntent = (t: string): t is IntentType => (INTENT_TYPES as readonly string[]).includes(t);

const ref = z.string().trim().min(1).max(120);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const PRIORITIES = ["P1 Critical", "P2 High", "P3 Normal", "P4 Low"] as const;
const unclear = z.array(z.string().max(40)).max(10).optional();

export const TaskDraft = z.object({
  title: z.string().trim().min(1).max(300), company: ref.optional(), division: ref.optional(), project: ref.optional(),
  milestone: ref.optional(), assignees: z.array(ref).max(10).optional(), due_date: date.optional(),
  priority: z.enum(PRIORITIES).optional(), description: z.string().max(4000).optional(), unclear,
}).strip();
export const EventDraft = z.object({
  title: z.string().trim().min(1).max(200), category: z.enum(CATEGORIES).optional(), date, end_date: date.optional(),
  start_time: time.optional(), end_time: time.optional(), all_day: z.boolean().optional(), company: ref.optional(),
  division: ref.optional(), project: ref.optional(), attendees: z.array(ref).max(30).optional(),
  invite_division: z.boolean().optional(), location: z.string().max(300).optional(),
  meeting_url: z.string().url().startsWith("https://").max(500).optional(), description: z.string().max(5000).optional(), unclear,
}).strip();
export const MilestoneDraft = z.object({
  title: z.string().trim().min(1).max(300), due_date: date, company: ref.optional(), workstream: ref.optional(),
  lead_division: ref.optional(), owner: ref.optional(), project: ref.optional(), is_major: z.boolean().optional(),
  deliverable: z.string().max(1000).optional(), unclear,
}).strip();
export const AssignDraft = z.object({ task: ref, assignees: z.array(ref).min(1).max(10), replace: z.boolean().optional(), unclear }).strip();

export const INTENT_SCHEMAS = {
  create_task: TaskDraft,
  create_tasks: z.object({ tasks: z.array(TaskDraft).min(1).max(10) }).strip(),
  assign_task: AssignDraft,
  create_event: EventDraft,
  create_timeline_item: MilestoneDraft,
} satisfies Record<IntentType, z.ZodType>;

export type TaskDraftT = z.infer<typeof TaskDraft>;
export type EventDraftT = z.infer<typeof EventDraft>;
export type MilestoneDraftT = z.infer<typeof MilestoneDraft>;
export type AssignDraftT = z.infer<typeof AssignDraft>;
export type AnyDraft = TaskDraftT | EventDraftT | MilestoneDraftT | AssignDraftT;

/** Each intent as a list of single-record drafts (create_tasks is several tasks; everything else one). */
export function draftsOf(type: IntentType, payload: unknown): AnyDraft[] | null {
  const r = INTENT_SCHEMAS[type].safeParse(payload);
  if (!r.success) return null;
  return type === "create_tasks" ? (r.data as { tasks: TaskDraftT[] }).tasks : [r.data as AnyDraft];
}
export const kindOf = (type: IntentType) => (type === "create_event" ? "event" : type === "create_timeline_item" ? "milestone" : type === "assign_task" ? "assignment" : "task");

// ── The directory: what the person can see, read with their own session ────────────────────────────────────────────

export interface DirPerson { id: string; full_name: string; short_name: string | null; org_role: string; status: string; companies: string[]; divisions: string[] }
export interface Directory {
  me: string; today: string; myCompanies: string[];
  people: DirPerson[];
  divisions: { id: string; code: string; name: string }[];
  projects: { id: string; name: string; company_code: string; division_id: string | null; status: string }[];
  workstreams: { code: string; name: string; company_code: string }[];
  milestones: { id: string; title: string; company_code: string }[];
  tasks: { id: string; title: string; company_code: string; project_id: string | null; status: string }[];
}

export interface Choice { value: string; label: string }
export interface Issue { field: string; query?: string; kind: "missing" | "ambiguous" | "not_found" | "invalid"; message: string; choices?: Choice[] }
export interface ResolvedItem {
  kind: "task" | "event" | "milestone" | "assignment";
  draft: AnyDraft;              // the draft with every resolved reference replaced by its ID (resolving again is a no-op)
  fields: { label: string; value: string }[];
  issues: Issue[];
  warnings: string[];
  insert: Record<string, unknown> | null; // the record to write, only when there are no issues
}

const COMPANY_NAMES: Record<string, string> = { hq: "HQ", "hq office": "HQ", founders: "HQ", iel: "IEL", ielsco: "IEL", "ielsco indonesia": "IEL", "english space": "IEL", elc: "ELC", elco: "ELC", "elco ai": "ELC", elcoai: "ELC" };
export const COMPANY_DISPLAY: Record<string, string> = { HQ: "HQ", IEL: "IELSco", ELC: "Elco AI" };
const SELF = new Set(["me", "myself", "i", "saya", "aku", "gue", "gua"]);

export const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s: string) => norm(s).split(" ").filter(Boolean);
const idLike = (s: string, prefix: string) => new RegExp(`^${prefix}-\\d{3,}$`, "i").test(s.trim());

/** Best matches by name: exact name first, then every query word starting a word of the name, then substring. */
function byName<T>(items: T[], q: string, names: (t: T) => (string | null | undefined)[]): T[] {
  const nq = norm(q), qw = words(q);
  if (!nq) return [];
  const exact = items.filter((t) => names(t).some((n) => n && norm(n) === nq));
  if (exact.length) return exact;
  const prefix = items.filter((t) => names(t).some((n) => { const w = n ? words(n) : []; return qw.every((x) => w.some((y) => y.startsWith(x))); }));
  if (prefix.length) return prefix;
  return nq.length >= 4 ? items.filter((t) => names(t).some((n) => n && norm(n).includes(nq))) : [];
}

export function resolveCompany(q: string | undefined, dir: Directory): { code?: string; issue?: Issue } {
  const choices = dir.myCompanies.map((c) => ({ value: c, label: COMPANY_DISPLAY[c] ?? c }));
  if (!q) return {};
  const code = ["HQ", "IEL", "ELC"].includes(q.toUpperCase()) ? q.toUpperCase() : COMPANY_NAMES[norm(q)];
  if (!code) return { issue: { field: "company", kind: "not_found", message: `There's no company called “${q}”.`, choices } };
  if (!dir.myCompanies.includes(code)) return { issue: { field: "company", kind: "invalid", message: `You don't work in ${COMPANY_DISPLAY[code]}, so you can't add records there.`, choices } };
  return { code };
}

export function resolveDivision(q: string | undefined, dir: Directory, field = "division"): { id?: string; issue?: Issue } {
  if (!q) return {};
  const m = dir.divisions.filter((d) => d.id.toLowerCase() === q.trim().toLowerCase() || d.code.toLowerCase() === q.trim().toLowerCase());
  const hits = m.length ? m : byName(dir.divisions, q.replace(/\b(division|divisi|team|tim)\b/gi, ""), (d) => [d.name]);
  const choices = (hits.length > 1 ? hits : dir.divisions).map((d) => ({ value: d.id, label: d.name }));
  if (hits.length === 1) return { id: hits[0].id };
  return { issue: { field, kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${q}” matches more than one division.` : `There's no division called “${q}”.`, choices } };
}

export function resolveProject(q: string | undefined, dir: Directory, company?: string): { project?: Directory["projects"][number]; issue?: Issue } {
  if (!q) return {};
  if (idLike(q, "PRJ")) {
    const p = dir.projects.find((x) => x.id === q.trim().toUpperCase());
    return p ? { project: p } : { issue: { field: "project", kind: "not_found", message: `You can't see a project ${q.trim().toUpperCase()}.` } };
  }
  const pool = dir.projects.filter((p) => !company || p.company_code === company);
  let hits = byName(pool, q.replace(/\b(project|proyek|program)\b/gi, ""), (p) => [p.name]);
  const open = hits.filter((p) => !["Completed", "Cancelled"].includes(p.status));
  if (open.length) hits = open;
  if (hits.length === 1) return { project: hits[0] };
  return { issue: { field: "project", kind: hits.length ? "ambiguous" : "not_found",
    message: hits.length ? `“${q}” matches ${hits.length} projects. Choose one.` : `No project you can see is called “${q}”${company ? ` in ${COMPANY_DISPLAY[company]}` : ""}. Choose one, or remove the project.`,
    choices: (hits.length ? hits : pool.filter((p) => !["Completed", "Cancelled"].includes(p.status)).slice(0, 12)).map((p) => ({ value: p.id, label: `${p.name} (${p.id})` })) } };
}

/** People by name or ID. Only active, non-guest people who work in the company can be assigned or invited. */
export function resolvePeople(qs: string[] | undefined, dir: Directory, company: string | undefined, field: string): { ids: string[]; issues: Issue[] } {
  const ids: string[] = [], issues: Issue[] = [];
  const eligible = (p: DirPerson) => p.org_role !== "guest" && ["active", "onboarding"].includes(p.status);
  for (const q of qs ?? []) {
    let hits: DirPerson[];
    if (SELF.has(norm(q))) hits = dir.people.filter((p) => p.id === dir.me);
    else if (idLike(q, "PPL")) hits = dir.people.filter((p) => p.id === q.trim().toUpperCase());
    else {
      // Match everyone the person can see, then prefer active members; a guest or former member is named, not hidden.
      const all = byName(dir.people, q, (p) => [p.full_name, p.short_name]);
      const active = all.filter(eligible);
      hits = active.length ? active : all;
    }
    const label = (p: DirPerson) => `${p.full_name} (${p.id}${p.companies.length ? `, ${p.companies.map((c) => COMPANY_DISPLAY[c] ?? c).join(" & ")}` : ""})`;
    if (hits.length === 0) { issues.push({ field, query: q, kind: "not_found", message: `There's nobody called “${q}” among the people you can see. Choose someone, or remove them.`, choices: dir.people.filter((p) => eligible(p) && (!company || p.companies.includes(company))).slice(0, 15).map((p) => ({ value: p.id, label: label(p) })) }); continue; }
    if (hits.length > 1) { issues.push({ field, query: q, kind: "ambiguous", message: `“${q}” could be ${hits.length} people. Choose one.`, choices: hits.map((p) => ({ value: p.id, label: label(p) })) }); continue; }
    const p = hits[0];
    if (!eligible(p)) { issues.push({ field, query: q, kind: "invalid", message: `${p.full_name} isn't an active member, so they can't be ${field === "attendees" ? "invited" : "assigned"}.` }); continue; }
    if (company && !p.companies.includes(company)) { issues.push({ field, query: q, kind: "invalid", message: `${p.full_name} doesn't work in ${COMPANY_DISPLAY[company] ?? company}. Choose someone who does, or remove them.`, choices: dir.people.filter((x) => eligible(x) && x.companies.includes(company)).slice(0, 15).map((x) => ({ value: x.id, label: label(x) })) }); continue; }
    if (!ids.includes(p.id)) ids.push(p.id);
  }
  return { ids, issues };
}

const nameOf = (dir: Directory, id: string) => dir.people.find((p) => p.id === id)?.full_name ?? id;
const divName = (dir: Directory, id: string | null | undefined) => (id ? dir.divisions.find((d) => d.id === id)?.name ?? id : "");
const dayLabel = (d: string) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday(d)]} ${d}`;
function unclearIssues(u: string[] | undefined, known: Record<string, string>): Issue[] {
  return (u ?? []).filter((f) => known[f]).map((f) => ({ field: f, kind: "missing" as const, message: `The instruction didn't make the ${known[f]} clear. Fill it in.` }));
}
function companyFor(q: string | undefined, dir: Directory, fromProject?: string): { code?: string; issue?: Issue } {
  if (fromProject) {
    const c = resolveCompany(q, dir);
    if (c.code && c.code !== fromProject) return { issue: { field: "company", kind: "invalid", message: `The project is in ${COMPANY_DISPLAY[fromProject]}, not ${COMPANY_DISPLAY[c.code]}.` } };
    return { code: fromProject };
  }
  if (q) return resolveCompany(q, dir);
  if (dir.myCompanies.length === 1) return { code: dir.myCompanies[0] };
  return { issue: { field: "company", kind: "missing", message: "Which company is this for?", choices: dir.myCompanies.map((c) => ({ value: c, label: COMPANY_DISPLAY[c] ?? c })) } };
}

// ── Resolution per record kind ───────────────────────────────────────────────────────────────────────────────────

export function resolveTask(d: TaskDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const pr = resolveProject(d.project, dir, undefined);
  if (pr.issue) issues.push(pr.issue);
  const co = companyFor(d.company, dir, pr.project?.company_code);
  if (co.issue) issues.push(co.issue);
  const dv = resolveDivision(d.division, dir);
  if (dv.issue) issues.push(dv.issue);
  const division = dv.id ?? pr.project?.division_id ?? undefined;
  let milestone: Directory["milestones"][number] | undefined;
  if (d.milestone) {
    const hits = idLike(d.milestone, "TL") ? dir.milestones.filter((m) => m.id === d.milestone!.trim().toUpperCase()) : byName(dir.milestones, d.milestone, (m) => [m.title]);
    if (hits.length === 1) milestone = hits[0];
    else issues.push({ field: "milestone", kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${d.milestone}” matches several milestones.` : `No milestone you can see is called “${d.milestone}”.`, choices: hits.slice(0, 12).map((m) => ({ value: m.id, label: `${m.title} (${m.id})` })) });
  }
  const ppl = resolvePeople(d.assignees, dir, co.code, "assignees");
  issues.push(...ppl.issues, ...unclearIssues(d.unclear, { due_date: "deadline", project: "project", division: "division", company: "company", assignees: "assignee" }));
  if (d.due_date && d.due_date < dir.today) warnings.push(`The deadline ${d.due_date} is in the past.`);
  const dup = dir.tasks.find((t) => norm(t.title) === norm(d.title) && t.company_code === co.code && (t.project_id ?? null) === (pr.project?.id ?? null) && !["Done", "Cancelled"].includes(t.status));
  if (dup) warnings.push(`An open task with this title already exists: ${dup.id}.`);
  const draft: TaskDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, division: dv.id ?? d.division, milestone: milestone?.id ?? d.milestone, assignees: ppl.issues.length ? d.assignees : ppl.ids, unclear: issues.length ? d.unclear : undefined };
  const fields = [
    { label: "Title", value: d.title },
    { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" },
    ...(division ? [{ label: "Division", value: divName(dir, division) }] : []),
    ...(pr.project ? [{ label: "Project", value: `${pr.project.name} (${pr.project.id})` }] : []),
    ...(milestone ? [{ label: "Milestone", value: `${milestone.title} (${milestone.id})` }] : []),
    { label: "Assignee", value: ppl.ids.length ? ppl.ids.map((i) => `${nameOf(dir, i)} (${i})`).join(", ") : d.assignees?.length ? "Needs your choice" : "Nobody yet" },
    { label: "Deadline", value: d.due_date ? dayLabel(d.due_date) : "No deadline" },
    { label: "Priority", value: d.priority ?? "P3 Normal" },
  ];
  const insert = issues.length ? null : {
    title: d.title, company_code: co.code, division_id: division ?? null, project_id: pr.project?.id ?? null, timeline_item_id: milestone?.id ?? null,
    owner_person_id: ppl.ids[0] ?? null, assignees: ppl.ids, due_date: d.due_date ?? null, priority: d.priority ?? "P3 Normal", description: d.description ?? null,
  };
  return { kind: "task", draft, fields, issues, warnings, insert };
}

export function resolveEvent(d: EventDraftT, dir: Directory, tz = DEFAULT_TZ): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const pr = resolveProject(d.project, dir, undefined);
  if (pr.issue) issues.push(pr.issue);
  const co = companyFor(d.company, dir, pr.project?.company_code);
  if (co.issue) issues.push(co.issue);
  const dv = resolveDivision(d.division, dir);
  if (dv.issue) issues.push(dv.issue);
  const division = dv.id ?? pr.project?.division_id ?? undefined;
  const ppl = resolvePeople(d.attendees, dir, co.code, "attendees");
  issues.push(...ppl.issues);
  let attendees = ppl.ids;
  if (d.invite_division && division && co.code) {
    attendees = Array.from(new Set([...attendees, ...dir.people.filter((p) => p.divisions.includes(division) && p.companies.includes(co.code!) && p.org_role !== "guest" && ["active", "onboarding"].includes(p.status)).map((p) => p.id)]));
  } else if (d.invite_division && !division) issues.push({ field: "division", kind: "missing", message: "Which division should be invited?", choices: dir.divisions.map((x) => ({ value: x.id, label: x.name })) });
  const allDay = Boolean(d.all_day);
  if (!allDay && !d.start_time) issues.push({ field: "start_time", kind: "missing", message: "What time does it start? Or make it an all-day event." });
  issues.push(...unclearIssues(d.unclear, { date: "date", start_time: "start time", end_time: "end time", division: "division", company: "company", project: "project" }));
  const lastDay = d.end_date && d.end_date >= d.date ? d.end_date : d.date;
  let starts_at = "", ends_at = "";
  if (allDay) { starts_at = zonedInstant(d.date, "00:00", tz); ends_at = zonedInstant(addDays(lastDay, 1), "00:00", tz); }
  else if (d.start_time) {
    starts_at = zonedInstant(d.date, d.start_time, tz);
    ends_at = d.end_time ? zonedInstant(lastDay, d.end_time, tz) : new Date(Date.parse(starts_at) + 3600_000).toISOString();
    if (ends_at < starts_at) issues.push({ field: "end_time", kind: "invalid", message: "The event ends before it starts." });
  }
  if (d.date < dir.today) warnings.push(`${d.date} is in the past.`);
  const draft: EventDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, division: dv.id ?? d.division, attendees: ppl.issues.length ? d.attendees : attendees, invite_division: undefined, unclear: issues.length ? d.unclear : undefined };
  const when = allDay ? (lastDay === d.date ? `${dayLabel(d.date)}, all day` : `${dayLabel(d.date)} to ${dayLabel(lastDay)}, all day`)
    : d.start_time ? `${dayLabel(d.date)}, ${d.start_time}–${d.end_time ?? `${String((Number(d.start_time.slice(0, 2)) + 1) % 24).padStart(2, "0")}${d.start_time.slice(2)}`} (${tz === DEFAULT_TZ ? "WIB" : tz})` : `${dayLabel(d.date)}, time ?`;
  const fields = [
    { label: "Title", value: d.title }, { label: "When", value: when }, { label: "Category", value: d.category ?? "Meeting" },
    { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" },
    ...(division ? [{ label: "Division", value: divName(dir, division) }] : []),
    ...(pr.project ? [{ label: "Project", value: `${pr.project.name} (${pr.project.id})` }] : []),
    { label: "Attendees", value: attendees.length ? attendees.map((i) => nameOf(dir, i)).join(", ") : "None yet" },
    ...(d.location ? [{ label: "Location", value: d.location }] : []), ...(d.meeting_url ? [{ label: "Meeting link", value: d.meeting_url }] : []),
  ];
  const insert = issues.length ? null : {
    title: d.title, category: d.category ?? "Meeting", company_code: co.code, division_id: division ?? null, project_id: pr.project?.id ?? null,
    starts_at, ends_at, all_day: allDay, timezone: tz, location: d.location ?? null, meeting_url: d.meeting_url ?? null, description: d.description ?? null, attendees,
  };
  return { kind: "event", draft, fields, issues, warnings, insert };
}

export function resolveMilestone(d: MilestoneDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const pr = resolveProject(d.project, dir, undefined);
  if (pr.issue) issues.push(pr.issue);
  const co = companyFor(d.company, dir, pr.project?.company_code);
  if (co.issue) issues.push(co.issue);
  const dv = resolveDivision(d.lead_division, dir, "lead_division");
  if (dv.issue) issues.push(dv.issue);
  const lead = dv.id ?? pr.project?.division_id ?? undefined;
  const pool = dir.workstreams;
  let ws: Directory["workstreams"][number] | undefined;
  const wsChoices = pool.map((w) => ({ value: w.code, label: `${w.code} ${w.name}` }));
  if (d.workstream) {
    const hits = pool.filter((w) => w.code.toLowerCase() === d.workstream!.trim().toLowerCase()).concat(pool.some((w) => w.code.toLowerCase() === d.workstream!.trim().toLowerCase()) ? [] : byName(pool, d.workstream, (w) => [w.name]));
    if (hits.length === 1) ws = hits[0];
    else issues.push({ field: "workstream", kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${d.workstream}” matches several workstreams.` : `There's no workstream called “${d.workstream}”.`, choices: (hits.length ? hits : pool).map((w) => ({ value: w.code, label: `${w.code} ${w.name}` })) });
  } else issues.push({ field: "workstream", kind: "missing", message: "Which timeline workstream does this milestone belong to?", choices: wsChoices });
  const owner = resolvePeople(d.owner ? [d.owner] : [], dir, co.code, "owner");
  issues.push(...owner.issues, ...unclearIssues(d.unclear, { due_date: "date", workstream: "workstream", company: "company", lead_division: "lead division", owner: "owner" }));
  if (d.due_date < dir.today) warnings.push(`${d.due_date} is in the past.`);
  const draft: MilestoneDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, lead_division: dv.id ?? d.lead_division, workstream: ws?.code ?? d.workstream, owner: owner.ids[0] ?? d.owner, unclear: issues.length ? d.unclear : undefined };
  const fields = [
    { label: "Milestone", value: d.title }, { label: "Date", value: dayLabel(d.due_date) },
    { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" }, { label: "Workstream", value: ws ? `${ws.code} ${ws.name}` : "?" },
    ...(lead ? [{ label: "Lead division", value: divName(dir, lead) }] : []),
    ...(pr.project ? [{ label: "Project", value: `${pr.project.name} (${pr.project.id})` }] : []),
    { label: "Owner", value: owner.ids[0] ? nameOf(dir, owner.ids[0]) : "Nobody yet" }, ...(d.is_major ? [{ label: "Major milestone", value: "Yes" }] : []),
  ];
  const insert = issues.length || !ws ? null : {
    title: d.title, due_date: d.due_date, company_code: co.code, workstream_code: ws.code, workstream_name: ws.name, lead_division_id: lead ?? null,
    lead_division: lead ? divName(dir, lead) : null, owner_person_id: owner.ids[0] ?? null, owner_name: owner.ids[0] ? nameOf(dir, owner.ids[0]) : null,
    is_major: Boolean(d.is_major), deliverable: d.deliverable ?? null, linked_refs: pr.project?.id ?? null, status: "Not started",
  };
  return { kind: "milestone", draft, fields, issues, warnings, insert };
}

export function resolveAssign(d: AssignDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [];
  const hits = idLike(d.task, "TSK") ? dir.tasks.filter((t) => t.id === d.task.trim().toUpperCase()) : byName(dir.tasks.filter((t) => !["Done", "Cancelled"].includes(t.status)), d.task, (t) => [t.title]);
  const task = hits.length === 1 ? hits[0] : undefined;
  if (!task) issues.push({ field: "task", kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${d.task}” matches ${hits.length} tasks. Choose one.` : `No task you can see matches “${d.task}”.`, choices: hits.slice(0, 12).map((t) => ({ value: t.id, label: `${t.title} (${t.id})` })) });
  const ppl = resolvePeople(d.assignees, dir, task?.company_code, "assignees");
  issues.push(...ppl.issues);
  const draft: AssignDraftT = { ...d, task: task?.id ?? d.task, assignees: ppl.issues.length ? d.assignees : ppl.ids, unclear: undefined };
  const fields = [{ label: "Task", value: task ? `${task.title} (${task.id})` : "?" }, { label: d.replace ? "Assignees become" : "Add assignee", value: ppl.ids.map((i) => `${nameOf(dir, i)} (${i})`).join(", ") || "?" }];
  return { kind: "assignment", draft, fields, issues, warnings: [], insert: issues.length || !task ? null : { task_id: task.id, assignees: ppl.ids, replace: Boolean(d.replace) } };
}

export function resolveIntent(type: IntentType, drafts: AnyDraft[], dir: Directory, tz = DEFAULT_TZ): ResolvedItem[] {
  return drafts.map((d) => type === "create_event" ? resolveEvent(d as EventDraftT, dir, tz)
    : type === "create_timeline_item" ? resolveMilestone(d as MilestoneDraftT, dir)
    : type === "assign_task" ? resolveAssign(d as AssignDraftT, dir)
    : resolveTask(d as TaskDraftT, dir));
}

export function intentPreview(type: IntentType, items: ResolvedItem[]): string {
  const ready = items.every((i) => i.issues.length === 0);
  const what = type === "create_tasks" || (type === "create_task" && items.length > 1) ? `Create ${items.length} tasks` : type === "create_task" ? `Create task “${items[0]?.fields[0]?.value}”`
    : type === "create_event" ? `Schedule “${items[0]?.fields[0]?.value}”` : type === "create_timeline_item" ? `Add milestone “${items[0]?.fields[0]?.value}”` : `Assign ${items[0]?.fields[0]?.value}`;
  return `${what}${ready ? "" : " (needs your input)"}`;
}

// ── Date context for the model ──────────────────────────────────────────────────────────────────────────────────

/** Today and the next 14 days with their weekdays, so "Friday" and "next Tuesday" become real dates. */
export function dateContext(today: string): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = Array.from({ length: 15 }, (_, i) => addDays(today, i)).map((d, i) => `${d} ${names[weekday(d)]}${i === 0 ? " (today)" : i === 1 ? " (tomorrow)" : ""}`);
  return `Today is ${names[weekday(today)]} ${today} (Asia/Jakarta). Calendar: ${days.join("; ")}. A bare weekday ("Friday", "next Tuesday") is the first such day after today. If the person may mean a different week, or the date is otherwise ambiguous, still give your best date and list the field in "unclear".`;
}

// ── Function declarations (Gemini function calling) ──────────────────────────────────────────────────────────────

const S = (type: string, description?: string, extra: object = {}) => ({ type, ...(description ? { description } : {}), ...extra });
const taskProps = {
  title: S("STRING", "Short task title"), company: S("STRING", "HQ, IELSco or Elco AI, if the person said or it is obvious"),
  division: S("STRING", "Division name as the person said it, e.g. Creative"), project: S("STRING", "Project name or PRJ-ID as the person said it"),
  milestone: S("STRING", "Timeline milestone this task delivers, by name or TL-ID"),
  assignees: S("ARRAY", "People to assign, by the name the person used (never invent IDs)", { items: S("STRING") }),
  due_date: S("STRING", "Deadline as YYYY-MM-DD, from the calendar given"), priority: S("STRING", undefined, { enum: [...PRIORITIES], format: "enum" }),
  description: S("STRING"), unclear: S("ARRAY", "Fields the instruction left unclear", { items: S("STRING") }),
};
export const FUNCTION_DECLARATIONS = [
  { name: "create_task", description: "Propose one new task. The person reviews it before anything is created.", parameters: S("OBJECT", undefined, { properties: taskProps, required: ["title"] }) },
  { name: "create_tasks", description: "Propose several new tasks at once (up to 10), e.g. 'three Growth tasks'.", parameters: S("OBJECT", undefined, { properties: { tasks: S("ARRAY", undefined, { items: S("OBJECT", undefined, { properties: taskProps, required: ["title"] }) }) }, required: ["tasks"] }) },
  { name: "assign_task", description: "Propose assigning people to an EXISTING task.", parameters: S("OBJECT", undefined, { properties: { task: S("STRING", "TSK-ID or the task title"), assignees: S("ARRAY", undefined, { items: S("STRING") }), replace: S("BOOLEAN", "true to replace current assignees") }, required: ["task", "assignees"] }) },
  { name: "create_event", description: "Propose a calendar event (meeting, activity, deadline, campaign date…).", parameters: S("OBJECT", undefined, { properties: {
    title: S("STRING"), category: S("STRING", undefined, { enum: [...CATEGORIES], format: "enum" }), date: S("STRING", "YYYY-MM-DD"), end_date: S("STRING", "Last day, YYYY-MM-DD, for multi-day events"),
    start_time: S("STRING", "HH:MM, 24-hour, Asia/Jakarta"), end_time: S("STRING", "HH:MM"), all_day: S("BOOLEAN"), company: S("STRING"), division: S("STRING"), project: S("STRING"),
    attendees: S("ARRAY", "People by name", { items: S("STRING") }), invite_division: S("BOOLEAN", "Invite everyone in the division, e.g. 'a Growth meeting'"),
    location: S("STRING"), meeting_url: S("STRING", "https link"), description: S("STRING"), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["title", "date"] }) },
  { name: "create_timeline_item", description: "Propose a milestone on the company timeline (e.g. 'Mojo launch by Nov 12').", parameters: S("OBJECT", undefined, { properties: {
    title: S("STRING"), due_date: S("STRING", "YYYY-MM-DD"), company: S("STRING"), workstream: S("STRING", "Workstream code (WS1…) or name"), lead_division: S("STRING"),
    owner: S("STRING", "Person by name"), project: S("STRING"), is_major: S("BOOLEAN"), deliverable: S("STRING"), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["title", "due_date"] }) },
] as const;

/** What the confirmation card shows: everything except the insert payload. */
export const cardItems = (items: ResolvedItem[]) => ({ items: items.map((i) => ({ kind: i.kind, draft: i.draft, fields: i.fields, issues: i.issues, warnings: i.warnings })) });
