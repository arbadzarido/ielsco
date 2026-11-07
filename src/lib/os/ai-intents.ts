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
import { CATEGORIES, DEFAULT_TZ, addDays, weekday, zonedInstant, zonedParts } from "./calendar.ts";
import { WEEKDAYS, describeRule, expandSeries, presetRule, ruleProblem, type ExceptionLike, type Occurrence, type Recurrence } from "./recurrence.ts";
import { groupLabel, resolveInvitations, type Candidate, type GroupSpec, type RoleGroup } from "./groups.ts";

export const INTENT_TYPES = ["create_task", "create_tasks", "assign_task", "create_event", "create_timeline_item", "create_campaign", "create_content_items", "move_event", "invite_to_event"] as const;
export type IntentType = (typeof INTENT_TYPES)[number];
export const isIntent = (t: string): t is IntentType => (INTENT_TYPES as readonly string[]).includes(t);

const ref = z.string().trim().min(1).max(120);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const PRIORITIES = ["P1 Critical", "P2 High", "P3 Normal", "P4 Low"] as const;
const unclear = z.array(z.string().max(40)).max(10).optional();
const REPEATS = ["none", "daily", "weekdays", "weekly", "biweekly", "monthly", "yearly"] as const;

export const TaskDraft = z.object({
  title: z.string().trim().min(1).max(300), company: ref.optional(), division: ref.optional(), project: ref.optional(),
  milestone: ref.optional(), assignees: z.array(ref).max(10).optional(), due_date: date.optional(),
  priority: z.enum(PRIORITIES).optional(), description: z.string().max(4000).optional(), event: ref.optional(), unclear,
}).strip();
export const EventDraft = z.object({
  title: z.string().trim().min(1).max(200), category: z.enum(CATEGORIES).optional(), date, end_date: date.optional(),
  start_time: time.optional(), end_time: time.optional(), all_day: z.boolean().optional(), company: ref.optional(),
  division: ref.optional(), project: ref.optional(), attendees: z.array(ref).max(30).optional(),
  invite_division: z.boolean().optional(), location: z.string().max(300).optional(),
  meeting_url: z.string().url().startsWith("https://").max(500).optional(), description: z.string().max(5000).optional(),
  repeat: z.enum(REPEATS).optional(), repeat_days: z.array(z.enum(WEEKDAYS)).min(1).max(7).optional(), repeat_until: date.optional(), repeat_count: z.number().int().min(1).max(730).optional(),
  invite_groups: z.array(ref).max(6).optional(), milestone: ref.optional(), campaign: ref.optional(), partnership: ref.optional(), tasks: z.array(ref).max(10).optional(), unclear,
}).strip();
export const MilestoneDraft = z.object({
  title: z.string().trim().min(1).max(300), due_date: date, company: ref.optional(), workstream: ref.optional(),
  lead_division: ref.optional(), owner: ref.optional(), project: ref.optional(), is_major: z.boolean().optional(),
  deliverable: z.string().max(1000).optional(), unclear,
}).strip();
export const AssignDraft = z.object({ task: ref, assignees: z.array(ref).min(1).max(10), replace: z.boolean().optional(), unclear }).strip();
export const CampaignDraft = z.object({
  name: z.string().trim().min(1).max(200), company: ref.optional(), division: ref.optional(), start_date: date.optional(), end_date: date.optional(),
  objective: z.string().max(2000).optional(), owner: ref.optional(), project: ref.optional(), milestone: ref.optional(), unclear,
}).strip();
export const ContentDraft = z.object({
  title: z.string().trim().min(1).max(200), campaign: ref.optional(), company: ref.optional(), channel: z.string().max(80).optional(), format: z.string().max(80).optional(),
  pillar: z.string().max(80).optional(), dates: z.array(date).max(31).optional(), from: date.optional(), to: date.optional(), pattern: z.enum(["daily", "weekdays", "weekly"]).optional(),
  time: time.optional(), creator: ref.optional(), reviewer: ref.optional(), unclear,
}).strip();
export const MoveDraft = z.object({ event: ref, from_date: date.optional(), to_date: date, start_time: time.optional(), end_time: time.optional(), scope: z.enum(["this", "following", "all"]).optional(), unclear }).strip();
export const InviteDraft = z.object({ event: ref, people: z.array(ref).max(30).optional(), groups: z.array(ref).max(6).optional(), unclear }).strip();

export const INTENT_SCHEMAS = {
  create_task: TaskDraft,
  create_tasks: z.object({ tasks: z.array(TaskDraft).min(1).max(10) }).strip(),
  assign_task: AssignDraft,
  create_event: EventDraft,
  create_timeline_item: MilestoneDraft,
  create_campaign: CampaignDraft,
  create_content_items: ContentDraft,
  move_event: MoveDraft,
  invite_to_event: InviteDraft,
} satisfies Record<IntentType, z.ZodType>;

export type TaskDraftT = z.infer<typeof TaskDraft>;
export type EventDraftT = z.infer<typeof EventDraft>;
export type MilestoneDraftT = z.infer<typeof MilestoneDraft>;
export type AssignDraftT = z.infer<typeof AssignDraft>;
export type CampaignDraftT = z.infer<typeof CampaignDraft>;
export type ContentDraftT = z.infer<typeof ContentDraft>;
export type MoveDraftT = z.infer<typeof MoveDraft>;
export type InviteDraftT = z.infer<typeof InviteDraft>;
export type AnyDraft = TaskDraftT | EventDraftT | MilestoneDraftT | AssignDraftT | CampaignDraftT | ContentDraftT | MoveDraftT | InviteDraftT;

/** Each intent as a list of single-record drafts (create_tasks is several tasks; everything else one). */
export function draftsOf(type: IntentType, payload: unknown): AnyDraft[] | null {
  const r = INTENT_SCHEMAS[type].safeParse(payload);
  if (!r.success) return null;
  return type === "create_tasks" ? (r.data as { tasks: TaskDraftT[] }).tasks : [r.data as AnyDraft];
}
export const kindOf = (type: IntentType): ResolvedItem["kind"] => (({ create_event: "event", create_timeline_item: "milestone", assign_task: "assignment", create_campaign: "campaign", create_content_items: "content", move_event: "move", invite_to_event: "invitation" } as Record<string, ResolvedItem["kind"]>)[type] ?? "task");

// ── The directory: what the person can see, read with their own session ────────────────────────────────────────────

export interface DirPerson { id: string; full_name: string; short_name: string | null; org_role: string; status: string; companies: string[]; divisions: string[]; managed?: string[] }
export interface DirEvent { id: string; title: string; company_code: string; category: string; starts_at: string; ends_at: string; all_day: boolean; timezone: string; recurrence: Recurrence | null; exceptions: ExceptionLike[]; status: string; google_event_id?: string | null }
export interface Directory {
  me: string; today: string; myCompanies: string[];
  people: DirPerson[];
  divisions: { id: string; code: string; name: string }[];
  projects: { id: string; name: string; company_code: string; division_id: string | null; status: string }[];
  workstreams: { code: string; name: string; company_code: string }[];
  milestones: { id: string; title: string; company_code: string }[];
  tasks: { id: string; title: string; company_code: string; project_id: string | null; status: string }[];
  events?: DirEvent[];
  campaigns?: { id: string; name: string; company_code: string; project_id: string | null; timeline_item_id: string | null; status: string }[];
  partnerships?: { id: string; organisation: string; company_code: string }[];
}

export interface Choice { value: string; label: string }
export interface Issue { field: string; query?: string; kind: "missing" | "ambiguous" | "not_found" | "invalid"; message: string; choices?: Choice[] }
export interface ResolvedItem {
  kind: "task" | "event" | "milestone" | "assignment" | "campaign" | "content" | "move" | "invitation";
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
  const ev = d.event ? resolveEventRef(d.event, dir) : null;
  if (ev?.issue) issues.push(ev.issue);
  if (d.due_date && d.due_date < dir.today) warnings.push(`The deadline ${d.due_date} is in the past.`);
  const dup = dir.tasks.find((t) => norm(t.title) === norm(d.title) && t.company_code === co.code && (t.project_id ?? null) === (pr.project?.id ?? null) && !["Done", "Cancelled"].includes(t.status));
  if (dup) warnings.push(`An open task with this title already exists: ${dup.id}.`);
  const draft: TaskDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, division: dv.id ?? d.division, milestone: milestone?.id ?? d.milestone, assignees: ppl.issues.length ? d.assignees : ppl.ids, event: ev?.event?.id ?? d.event, unclear: issues.length ? d.unclear : undefined };
  if (ev?.event && d.due_date && d.due_date > zonedParts(ev.event.starts_at, ev.event.timezone).date && !ev.event.recurrence) warnings.push(`The deadline is after “${ev.event.title}”.`);
  const fields = [
    { label: "Title", value: d.title },
    ...(ev?.event ? [{ label: "For event", value: `${ev.event.title} (${ev.event.id}, ${dayLabel(zonedParts(ev.event.starts_at, ev.event.timezone).date)})` }] : []),
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
    event_id: ev?.event?.id ?? null,
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
  // Groups ("all IELSco managers", "C-Level", "Growth") are worked out now into named people; each remembers its group.
  const inv = co.code && d.invite_groups?.length ? groupInvitees(d.invite_groups, dir, co.code, attendees) : null;
  if (inv) issues.push(...inv.issues);
  const viaGroup = new Map((inv?.invitees ?? []).map((i) => [i.person_id, i.via]));
  const individual = attendees;
  attendees = Array.from(new Set([...attendees, ...(inv?.invitees ?? []).map((i) => i.person_id)]));
  // Repeats
  const rule = repeatRule(d);
  const rp = ruleProblem(rule);
  if (rp) issues.push({ field: "repeat", kind: "invalid", message: rp });
  if (rule?.until && rule.until < d.date) issues.push({ field: "repeat_until", kind: "invalid", message: "The repeat ends before the first occurrence." });
  // Links (explicit, by name or ID; nothing linked is changed)
  const ms = d.milestone ? pickRef("milestone", d.milestone, dir.milestones, "TL", (m) => [m.title], (m) => `${m.title} (${m.id})`, "milestone") : null;
  const cp = d.campaign ? pickRef("campaign", d.campaign, (dir.campaigns ?? []).filter((c) => !co.code || c.company_code === co.code || co.code === "HQ"), "CMP", (c) => [c.name], (c) => `${c.name} (${c.id})`, "campaign") : null;
  const pa = d.partnership ? pickRef("partnership", d.partnership, (dir.partnerships ?? []).filter((x) => !co.code || x.company_code === co.code), "OPP", (x) => [x.organisation], (x) => `${x.organisation} (${x.id})`, "partnership") : null;
  const tk = (d.tasks ?? []).map((q) => pickRef("tasks", q, dir.tasks.filter((t) => !["Done", "Cancelled"].includes(t.status)), "TSK", (t) => [t.title], (t) => `${t.title} (${t.id})`, "open task"));
  for (const r of [ms, cp, pa, ...tk]) if (r?.issue) issues.push(r.issue);
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
  // The stored draft keeps the group names and only the individually named people, so resolving again doesn't double-add.
  const draft: EventDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, division: dv.id ?? d.division, attendees: ppl.issues.length ? d.attendees : individual,
    invite_division: undefined, invite_groups: d.invite_groups, milestone: ms?.hit?.id ?? d.milestone, campaign: cp?.hit?.id ?? d.campaign, partnership: pa?.hit?.id ?? d.partnership,
    tasks: d.tasks ? tk.map((r, n) => r.hit?.id ?? d.tasks![n]) : undefined, unclear: issues.length ? d.unclear : undefined };
  const when = allDay ? (lastDay === d.date ? `${dayLabel(d.date)}, all day` : `${dayLabel(d.date)} to ${dayLabel(lastDay)}, all day`)
    : d.start_time ? `${dayLabel(d.date)}, ${d.start_time}–${d.end_time ?? `${String((Number(d.start_time.slice(0, 2)) + 1) % 24).padStart(2, "0")}${d.start_time.slice(2)}`} (${tz === DEFAULT_TZ ? "WIB" : tz})` : `${dayLabel(d.date)}, time ?`;
  const fields = [
    { label: "Title", value: d.title }, { label: "When", value: when }, { label: "Category", value: d.category ?? "Meeting" },
    { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" },
    ...(division ? [{ label: "Division", value: divName(dir, division) }] : []),
    ...(pr.project ? [{ label: "Project", value: `${pr.project.name} (${pr.project.id})` }] : []),
    ...(rule ? [{ label: "Repeats", value: describeRule(rule) }] : []),
    { label: "Attendees", value: attendees.length ? `${attendees.length}: ${attendees.map((i) => nameOf(dir, i)).join(", ")}` : "None yet" },
    ...(inv ? inv.lines.map((l) => ({ label: "Group", value: l })) : []),
    ...(ms?.hit ? [{ label: "Timeline milestone", value: `${ms.hit.title} (${ms.hit.id})` }] : []),
    ...(cp?.hit ? [{ label: "Campaign", value: `${cp.hit.name} (${cp.hit.id})` }] : []),
    ...(pa?.hit ? [{ label: "Partnership", value: `${pa.hit.organisation} (${pa.hit.id})` }] : []),
    ...(tk.length ? [{ label: "Linked tasks", value: tk.map((r) => r.hit ? `${r.hit.title} (${r.hit.id})` : "?").join(", ") }] : []),
    ...(d.location ? [{ label: "Location", value: d.location }] : []), ...(d.meeting_url ? [{ label: "Meeting link", value: d.meeting_url }] : []),
  ];
  const insert = issues.length ? null : {
    title: d.title, category: d.category ?? "Meeting", company_code: co.code, division_id: division ?? null, project_id: pr.project?.id ?? null,
    starts_at, ends_at, all_day: allDay, timezone: tz, location: d.location ?? null, meeting_url: d.meeting_url ?? null, description: d.description ?? null,
    attendees: attendees.map((id) => (viaGroup.get(id) ? { person_id: id, via_group: viaGroup.get(id) } : id)),
    recurrence: rule, timeline_item_id: ms?.hit?.id ?? null, campaign_id: cp?.hit?.id ?? null, partnership_id: pa?.hit?.id ?? null, task_ids: tk.map((r) => r.hit!.id),
  };
  if (inv && inv.total >= 15) warnings.push(`${inv.total} people will be invited and notified.`);
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

// ── Planning intents: references, groups, repeats ───────────────────────────────────────────────────────────────

/** One record by ID or name from a pool the person can see. */
function pickRef<T extends { id: string }>(field: string, q: string, pool: T[], prefix: string, names: (t: T) => (string | null | undefined)[], label: (t: T) => string, what: string): { hit?: T; issue?: Issue } {
  const hits = idLike(q, prefix) ? pool.filter((t) => t.id === q.trim().toUpperCase()) : byName(pool, q, names);
  if (hits.length === 1) return { hit: hits[0] };
  return { issue: { field, query: q, kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${q}” matches ${hits.length} of them. Choose one.` : `No ${what} you can see matches “${q}”.`, choices: hits.slice(0, 12).map((t) => ({ value: t.id, label: label(t) })) } };
}

/** The repeat rule an event draft describes, or null. */
export function repeatRule(d: Pick<EventDraftT, "repeat" | "repeat_days" | "repeat_until" | "repeat_count" | "date">): Recurrence | null {
  if ((!d.repeat || d.repeat === "none") && !d.repeat_days) return null;
  let r: Recurrence | null;
  if (d.repeat_days?.length) r = { freq: "weekly", ...(d.repeat === "biweekly" ? { interval: 2 } : {}), byweekday: d.repeat_days };
  else r = presetRule(d.repeat as Exclude<typeof d.repeat, undefined>, d.date);
  if (!r) return null;
  if (d.repeat_until) r = { ...r, until: d.repeat_until };
  else if (d.repeat_count) r = { ...r, count: d.repeat_count };
  return r;
}

/** "all IELSco managers", "C-Level", "Growth", "associates in Elco AI" → a group spec. Roles come from the registry. */
export function parseGroup(text: string, dir: Directory): { spec?: GroupSpec; issue?: Issue } {
  const n = ` ${norm(text)} `;
  let role: RoleGroup | undefined;
  if (/ (c ?level|c ?suite|founders?|executives?|direksi|pendiri) /.test(n)) role = "c_level";
  else if (/ (managers?|manajer|heads?|leads?) /.test(n)) role = "managers";
  else if (/ (associates?|members?|anggota) /.test(n)) role = "associates";
  else if (/ (all staff|everyone|everybody|all employees|semua|whole company|all) /.test(n)) role = "all";
  const company = / (ielsco|iel|english space) /.test(n) ? "IEL" : / (elco|elc|elco ai) /.test(n) ? "ELC" : undefined;
  const division = dir.divisions.find((d) => n.includes(` ${norm(d.name)} `) || n.includes(` ${norm(d.code)} `))?.id;
  if (!role && !company && !division) return { issue: { field: "invite_groups", query: text, kind: "not_found", message: `“${text}” isn't a group Company OS knows. Groups are C-Level, Managers, Associates, All staff, a division, or a combination such as “IELSco managers”.`,
    choices: [...["C-Level", "Managers", "Associates", "All staff"].map((g) => ({ value: g, label: g })), ...dir.divisions.map((d) => ({ value: d.name, label: `${d.name} division` }))] } };
  return { spec: { role: role ?? (division ? undefined : "all"), ...(division ? { division } : {}), ...(company ? { company } : {}) } };
}

/** Active, non-guest staff who can be invited to an event in a company (the same rule as os_invite_candidates). */
export function candidatesFor(dir: Directory, company: string): Candidate[] {
  return dir.people.filter((p) => p.status === "active" && p.org_role !== "guest" && (p.org_role === "founder" || company === "HQ" || p.companies.includes(company)))
    .map((p) => ({ person_id: p.id, full_name: p.full_name, short_name: p.short_name, org_role: p.org_role, companies: p.companies, divisions: p.divisions, managed_divisions: p.managed ?? [] }));
}

function groupInvitees(texts: string[], dir: Directory, company: string, existing: string[]) {
  const issues: Issue[] = [], specs: GroupSpec[] = [], textOf = new Map<string, string>();
  const dn = (id: string) => divName(dir, id);
  for (const t of texts) { const g = parseGroup(t, dir); if (g.issue) issues.push(g.issue); else { specs.push(g.spec!); textOf.set(groupLabel(g.spec!, dn), t); } }
  const res = resolveInvitations(candidatesFor(dir, company), specs, [], existing, dn);
  for (const e of res.empty) issues.push({ field: "invite_groups", query: textOf.get(e) ?? e, kind: "invalid", message: `Nobody active matches “${e}”, so nobody would be invited from it. Leave it out, or choose another group.`,
    choices: ["C-Level", "Managers", "Associates", "All staff"].map((g) => ({ value: g, label: g })) });
  const by = new Map<string, string[]>();
  for (const i of res.invitees) by.set(i.via ?? "", [...(by.get(i.via ?? "") ?? []), i.name]);
  const lines = [...by.entries()].map(([g, names]) => `${g}: ${names.length} (${names.join(", ")})`);
  if (res.duplicates.length) lines.push(`In more than one group, invited once: ${res.duplicates.map((d) => d.name).join(", ")}`);
  return { invitees: res.invitees, issues, lines, total: res.invitees.length + existing.length };
}

const occurrenceOn = (e: DirEvent, date: string): Occurrence | null => expandSeries(e, e.exceptions, zonedInstant(date, "00:00", e.timezone), zonedInstant(addDays(date, 1), "00:00", e.timezone))[0] ?? null;
const nextOccurrence = (e: DirEvent, today: string): Occurrence | null => expandSeries(e, e.exceptions, zonedInstant(today, "00:00", e.timezone), zonedInstant(addDays(today, 400), "00:00", e.timezone))[0] ?? null;
const evLabel = (e: DirEvent, today: string) => { const o = e.recurrence ? nextOccurrence(e, today) : null; return `${e.title} (${e.id}, ${e.recurrence ? `repeats${o ? `, next ${dayLabel(zonedParts(o.starts_at, e.timezone).date)}` : ""}` : dayLabel(zonedParts(e.starts_at, e.timezone).date)})`; };

/** An event by ID or title; with a date, only events that happen that day. Prefers upcoming ones. */
export function resolveEventRef(q: string, dir: Directory, onDate?: string): { event?: DirEvent; issue?: Issue } {
  const pool = (dir.events ?? []).filter((e) => e.status !== "Cancelled");
  let hits = idLike(q, "EV") ? pool.filter((e) => e.id === q.trim().toUpperCase()) : byName(pool, q.replace(/\b(meeting|rapat|event|acara)\b/gi, "").trim() || q, (e) => [e.title]);
  if (onDate && hits.length > 1) { const on = hits.filter((e) => occurrenceOn(e, onDate)); if (on.length) hits = on; }
  if (hits.length > 1) { const up = hits.filter((e) => e.recurrence ? nextOccurrence(e, dir.today) : zonedParts(e.ends_at, e.timezone).date >= dir.today); if (up.length) hits = up; }
  if (hits.length === 1) return { event: hits[0] };
  return { issue: { field: "event", query: q, kind: hits.length ? "ambiguous" : "not_found", message: hits.length ? `“${q}” matches ${hits.length} events. Choose one.` : `No event you can see matches “${q}”.`, choices: hits.slice(0, 12).map((e) => ({ value: e.id, label: evLabel(e, dir.today) })) } };
}

export function resolveCampaign(d: CampaignDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const pr = resolveProject(d.project, dir, undefined);
  if (pr.issue) issues.push(pr.issue);
  const co = companyFor(d.company, dir, pr.project?.company_code);
  if (co.issue) issues.push(co.issue);
  const dv = resolveDivision(d.division, dir);
  if (dv.issue) issues.push(dv.issue);
  const owner = resolvePeople(d.owner ? [d.owner] : [], dir, co.code, "owner");
  issues.push(...owner.issues);
  const ms = d.milestone ? pickRef("milestone", d.milestone, dir.milestones, "TL", (m) => [m.title], (m) => `${m.title} (${m.id})`, "milestone") : null;
  if (ms?.issue) issues.push(ms.issue);
  if (d.start_date && d.end_date && d.end_date < d.start_date) issues.push({ field: "end_date", kind: "invalid", message: "The campaign ends before it starts." });
  issues.push(...unclearIssues(d.unclear, { start_date: "start date", end_date: "end date", company: "company", owner: "owner" }));
  const dup = (dir.campaigns ?? []).find((c) => norm(c.name) === norm(d.name) && c.company_code === co.code && !["Completed", "Cancelled"].includes(c.status));
  if (dup) warnings.push(`A campaign with this name already exists: ${dup.id}.`);
  const draft: CampaignDraftT = { ...d, project: pr.project?.id ?? d.project, company: co.code ?? d.company, division: dv.id ?? d.division, owner: owner.ids[0] ?? d.owner, milestone: ms?.hit?.id ?? d.milestone, unclear: issues.length ? d.unclear : undefined };
  const fields = [
    { label: "Campaign", value: d.name }, { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" },
    { label: "Dates", value: d.start_date ? `${dayLabel(d.start_date)}${d.end_date ? ` to ${dayLabel(d.end_date)}` : ""}` : "Not set" },
    ...(pr.project ? [{ label: "Project", value: `${pr.project.name} (${pr.project.id})` }] : []),
    ...(ms?.hit ? [{ label: "Timeline milestone", value: `${ms.hit.title} (${ms.hit.id})` }] : []),
    { label: "Owner", value: owner.ids[0] ? nameOf(dir, owner.ids[0]) : "Nobody yet" }, ...(d.objective ? [{ label: "Objective", value: d.objective }] : []),
  ];
  const insert = issues.length ? null : { name: d.name, company_code: co.code, division_id: dv.id ?? pr.project?.division_id ?? "DIV-03", start_date: d.start_date ?? null, end_date: d.end_date ?? null,
    objective: d.objective ?? null, owner_person_id: owner.ids[0] ?? null, project_id: pr.project?.id ?? null, timeline_item_id: ms?.hit?.id ?? null, status: "Planned" };
  return { kind: "campaign", draft, fields, issues, warnings, insert };
}

/** The publish dates a content draft describes (at most 31). */
export function contentDates(d: Pick<ContentDraftT, "dates" | "from" | "to" | "pattern">): string[] {
  if (d.dates?.length) return Array.from(new Set(d.dates)).sort();
  if (!d.from) return [];
  const to = d.to ?? d.from, out: string[] = [];
  for (let x = d.from, n = 0; x <= to && n < 400; x = addDays(x, 1), n++) {
    if (d.pattern === "weekdays" && [0, 6].includes(weekday(x))) continue;
    if (d.pattern === "weekly" && n % 7 !== 0) continue;
    out.push(x);
  }
  return out;
}

export function resolveContent(d: ContentDraftT, dir: Directory, tz = DEFAULT_TZ): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const cp = d.campaign ? pickRef("campaign", d.campaign, dir.campaigns ?? [], "CMP", (c) => [c.name], (c) => `${c.name} (${c.id})`, "campaign") : null;
  if (cp?.issue) issues.push(cp.issue);
  const co = cp?.hit ? { code: cp.hit.company_code } : companyFor(d.company, dir);
  if (co.issue) issues.push(co.issue);
  const creator = resolvePeople(d.creator ? [d.creator] : [], dir, co.code, "creator");
  const reviewer = resolvePeople(d.reviewer ? [d.reviewer] : [], dir, co.code, "reviewer");
  issues.push(...creator.issues, ...reviewer.issues);
  const dates = contentDates(d);
  if (!dates.length) issues.push({ field: "dates", kind: "missing", message: "On which days should the content go out?" });
  if (dates.length > 31) issues.push({ field: "dates", kind: "invalid", message: `That's ${dates.length} slots. Plan at most 31 at a time.` });
  if (dates[0] && dates[0] < dir.today) warnings.push(`${dates[0]} is in the past.`);
  issues.push(...unclearIssues(d.unclear, { dates: "dates", channel: "channel", campaign: "campaign", time: "time" }));
  const draft: ContentDraftT = { ...d, campaign: cp?.hit?.id ?? d.campaign, company: co.code ?? d.company, creator: creator.ids[0] ?? d.creator, reviewer: reviewer.ids[0] ?? d.reviewer, unclear: issues.length ? d.unclear : undefined };
  const short = (x: string) => `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday(x)]} ${Number(x.slice(8))}/${Number(x.slice(5, 7))}`;
  const fields = [
    { label: "Content", value: d.title }, ...(cp?.hit ? [{ label: "Campaign", value: `${cp.hit.name} (${cp.hit.id})` }] : []),
    { label: "Company", value: co.code ? COMPANY_DISPLAY[co.code] : "?" }, ...(d.channel ? [{ label: "Channel", value: d.channel }] : []),
    { label: "Slots", value: `${dates.length} content slot${dates.length === 1 ? "" : "s"}` },
    { label: "Dates", value: dates.slice(0, 12).map(short).join(", ") + (dates.length > 12 ? ` and ${dates.length - 12} more` : "") + (d.time ? ` at ${d.time}` : "") },
    { label: "Creator", value: creator.ids[0] ? nameOf(dir, creator.ids[0]) : "Nobody yet" }, { label: "Reviewer", value: reviewer.ids[0] ? nameOf(dir, reviewer.ids[0]) : "Nobody yet" },
  ];
  const insert = issues.length ? null : { items: dates.map((x) => ({
    company_code: co.code, campaign_id: cp?.hit?.id ?? null, title: dates.length > 1 ? `${d.title} (${short(x)})` : d.title, channel: d.channel ?? null, format: d.format ?? null, pillar: d.pillar ?? null,
    publish_at: d.time ? zonedInstant(x, d.time, tz) : null, planned_publish_date: x, creator_person_id: creator.ids[0] ?? null, owner_person_id: creator.ids[0] ?? null, reviewer_person_id: reviewer.ids[0] ?? null,
  })) };
  return { kind: "content", draft, fields, issues, warnings, insert };
}

export function resolveMove(d: MoveDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const ref = resolveEventRef(d.event, dir, d.from_date);
  if (ref.issue) issues.push(ref.issue);
  const e = ref.event;
  let occ: ReturnType<typeof occurrenceOn> = null;
  if (e) {
    occ = d.from_date ? occurrenceOn(e, d.from_date) : e.recurrence ? nextOccurrence(e, dir.today) : expandSeries(e, [], e.starts_at, e.ends_at === e.starts_at ? new Date(Date.parse(e.ends_at) + 1).toISOString() : e.ends_at)[0] ?? null;
    if (!occ) issues.push({ field: "from_date", kind: "invalid", message: d.from_date ? `“${e.title}” isn't on ${dayLabel(d.from_date)}.` : `“${e.title}” has no upcoming occurrence.` });
  }
  let scope = d.scope;
  if (e?.recurrence && occ && !scope) issues.push({ field: "scope", kind: "missing", message: "It repeats. Move only this occurrence, this and the following ones, or the whole series?", choices: [{ value: "this", label: "This occurrence only" }, { value: "following", label: "This and following" }, { value: "all", label: "The entire series" }] });
  if (e && !e.recurrence) scope = undefined;
  if (occ?.index === 0 && scope === "following") scope = "all";
  issues.push(...unclearIssues(d.unclear, { to_date: "new date", from_date: "current date", start_time: "new time" }));
  let starts_at = "", ends_at = "";
  if (e && occ) {
    const tz = e.timezone, dur = Date.parse(occ.ends_at) - Date.parse(occ.starts_at);
    if (e.all_day) { starts_at = zonedInstant(d.to_date, "00:00", tz); ends_at = new Date(Date.parse(starts_at) + dur).toISOString(); }
    else {
      starts_at = zonedInstant(d.to_date, d.start_time ?? zonedParts(occ.starts_at, tz).time, tz);
      ends_at = d.end_time ? zonedInstant(d.to_date, d.end_time, tz) : new Date(Date.parse(starts_at) + dur).toISOString();
      if (Date.parse(ends_at) <= Date.parse(starts_at)) issues.push({ field: "end_time", kind: "invalid", message: "It would end before it starts." });
    }
    if (starts_at === occ.starts_at && ends_at === occ.ends_at) issues.push({ field: "to_date", kind: "invalid", message: "That's when it already is." });
    if (d.to_date < dir.today) warnings.push(`${d.to_date} is in the past.`);
    if (e.google_event_id) warnings.push("It's in Google Calendar. The Google copy is updated when the person who synced it sends the change.");
  }
  const fmt = (iso: string) => e ? `${dayLabel(zonedParts(iso, e.timezone).date)}${e.all_day ? "" : ` ${zonedParts(iso, e.timezone).time}`}` : "?";
  const draft: MoveDraftT = { ...d, event: e?.id ?? d.event, from_date: occ && e ? zonedParts(occ.occurrence_start, e.timezone).date : d.from_date, scope, unclear: issues.length ? d.unclear : undefined };
  const fields = [
    { label: "Event", value: e ? `“${e.title}” (${e.id})` : "?" }, { label: "From", value: occ ? fmt(occ.starts_at) : "?" }, { label: "To", value: starts_at ? fmt(starts_at) : "?" },
    ...(e?.recurrence ? [{ label: "Applies to", value: scope === "this" ? "This occurrence only" : scope === "following" ? "This and following occurrences" : scope === "all" ? "The entire series" : "?" }] : []),
    { label: "Linked records", value: "Tasks and milestones linked to it are not changed" },
  ];
  const insert = issues.length || !e || !occ ? null : { event_id: e.id, occurrence_start: occ.occurrence_start, occ_starts_at: occ.starts_at, occ_ends_at: occ.ends_at, starts_at, ends_at, scope: scope ?? "all" };
  return { kind: "move", draft, fields, issues, warnings, insert };
}

export function resolveInvite(d: InviteDraftT, dir: Directory): ResolvedItem {
  const issues: Issue[] = [], warnings: string[] = [];
  const ref = resolveEventRef(d.event, dir);
  if (ref.issue) issues.push(ref.issue);
  const e = ref.event;
  if (!d.people?.length && !d.groups?.length) issues.push({ field: "people", kind: "missing", message: "Who should be invited?" });
  const company = e?.company_code;
  const ppl = resolvePeople(d.people, dir, company && company !== "HQ" ? company : undefined, "attendees");
  issues.push(...ppl.issues);
  const inv = e && d.groups?.length ? groupInvitees(d.groups, dir, e.company_code, ppl.ids) : null;
  if (inv) issues.push(...inv.issues.map((i) => (i.field === "invite_groups" ? { ...i, field: "groups" } : i)));
  const all = [...ppl.ids.map((id) => ({ person_id: id, via_group: null as string | null })), ...(inv?.invitees ?? []).filter((i) => !ppl.ids.includes(i.person_id)).map((i) => ({ person_id: i.person_id, via_group: i.via }))];
  if (all.length >= 15) warnings.push(`${all.length} people will be invited and notified.`);
  const draft: InviteDraftT = { ...d, event: e?.id ?? d.event, people: ppl.issues.length ? d.people : ppl.ids, unclear: undefined };
  const fields = [
    { label: "Event", value: e ? evLabel(e, dir.today) : "?" },
    ...(ppl.ids.length ? [{ label: "People", value: ppl.ids.map((i) => nameOf(dir, i)).join(", ") }] : []),
    ...(inv ? inv.lines.map((l) => ({ label: "Group", value: l })) : []),
    { label: "Invited in total", value: `${all.length} ${all.length === 1 ? "person" : "people"}, each notified in Company OS` },
  ];
  const insert = issues.length || !e || !all.length ? null : { event_id: e.id, attendees: all };
  return { kind: "invitation", draft, fields, issues, warnings, insert };
}

export function resolveIntent(type: IntentType, drafts: AnyDraft[], dir: Directory, tz = DEFAULT_TZ): ResolvedItem[] {
  return drafts.map((d) => type === "create_event" ? resolveEvent(d as EventDraftT, dir, tz)
    : type === "create_campaign" ? resolveCampaign(d as CampaignDraftT, dir)
    : type === "create_content_items" ? resolveContent(d as ContentDraftT, dir, tz)
    : type === "move_event" ? resolveMove(d as MoveDraftT, dir)
    : type === "invite_to_event" ? resolveInvite(d as InviteDraftT, dir)
    : type === "create_timeline_item" ? resolveMilestone(d as MilestoneDraftT, dir)
    : type === "assign_task" ? resolveAssign(d as AssignDraftT, dir)
    : resolveTask(d as TaskDraftT, dir));
}

export function intentPreview(type: IntentType, items: ResolvedItem[]): string {
  const ready = items.every((i) => i.issues.length === 0);
  const what = type === "create_tasks" || (type === "create_task" && items.length > 1) ? `Create ${items.length} tasks` : type === "create_task" ? `Create task “${items[0]?.fields[0]?.value}”`
    : type === "create_event" ? `Schedule “${items[0]?.fields[0]?.value}”` : type === "create_timeline_item" ? `Add milestone “${items[0]?.fields[0]?.value}”`
    : type === "create_campaign" ? `Create campaign “${items[0]?.fields[0]?.value}”` : type === "create_content_items" ? `Plan ${items[0]?.fields.find((f) => f.label === "Slots")?.value ?? "content"}`
    : type === "move_event" ? `Move ${items[0]?.fields[0]?.value}` : type === "invite_to_event" ? `Invite people to ${items[0]?.fields[0]?.value}` : `Assign ${items[0]?.fields[0]?.value}`;
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
  description: S("STRING"), event: S("STRING", "An existing event this task prepares for, by title or EV-ID (e.g. 'the partnership event')"),
  unclear: S("ARRAY", "Fields the instruction left unclear", { items: S("STRING") }),
};
export const FUNCTION_DECLARATIONS = [
  { name: "create_task", description: "Propose one new task. The person reviews it before anything is created.", parameters: S("OBJECT", undefined, { properties: taskProps, required: ["title"] }) },
  { name: "create_tasks", description: "Propose several new tasks at once (up to 10), e.g. 'three Growth tasks'.", parameters: S("OBJECT", undefined, { properties: { tasks: S("ARRAY", undefined, { items: S("OBJECT", undefined, { properties: taskProps, required: ["title"] }) }) }, required: ["tasks"] }) },
  { name: "assign_task", description: "Propose assigning people to an EXISTING task.", parameters: S("OBJECT", undefined, { properties: { task: S("STRING", "TSK-ID or the task title"), assignees: S("ARRAY", undefined, { items: S("STRING") }), replace: S("BOOLEAN", "true to replace current assignees") }, required: ["task", "assignees"] }) },
  { name: "create_event", description: "Propose a calendar event (meeting, activity, deadline, campaign date…).", parameters: S("OBJECT", undefined, { properties: {
    title: S("STRING"), category: S("STRING", undefined, { enum: [...CATEGORIES], format: "enum" }), date: S("STRING", "YYYY-MM-DD"), end_date: S("STRING", "Last day, YYYY-MM-DD, for multi-day events"),
    start_time: S("STRING", "HH:MM, 24-hour, Asia/Jakarta"), end_time: S("STRING", "HH:MM"), all_day: S("BOOLEAN"), company: S("STRING"), division: S("STRING"), project: S("STRING"),
    attendees: S("ARRAY", "People by name", { items: S("STRING") }), invite_division: S("BOOLEAN", "Invite everyone in the division, e.g. 'a Growth meeting'"),
    invite_groups: S("ARRAY", "Groups as the person said them: 'C-Level', 'managers', 'all IELSco managers', 'associates in Elco AI', 'all staff', a division name", { items: S("STRING") }),
    repeat: S("STRING", "How it repeats; 'weekly' for 'every Monday'", { enum: ["none", "daily", "weekdays", "weekly", "biweekly", "monthly", "yearly"], format: "enum" }),
    repeat_days: S("ARRAY", "For weekly repeats on specific days: MO TU WE TH FR SA SU", { items: S("STRING", undefined, { enum: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"], format: "enum" }) }),
    repeat_until: S("STRING", "Last date of the repeat, YYYY-MM-DD"), repeat_count: S("INTEGER", "Number of occurrences"),
    milestone: S("STRING", "Timeline milestone it is for, by name or TL-ID"), campaign: S("STRING", "Campaign by name or CMP-ID"), partnership: S("STRING", "Partner organisation or OPP-ID"),
    tasks: S("ARRAY", "Existing tasks to link, by title or TSK-ID", { items: S("STRING") }),
    location: S("STRING"), meeting_url: S("STRING", "https link"), description: S("STRING"), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["title", "date"] }) },
  { name: "create_timeline_item", description: "Propose a milestone on the company timeline (e.g. 'Mojo launch by Nov 12').", parameters: S("OBJECT", undefined, { properties: {
    title: S("STRING"), due_date: S("STRING", "YYYY-MM-DD"), company: S("STRING"), workstream: S("STRING", "Workstream code (WS1…) or name"), lead_division: S("STRING"),
    owner: S("STRING", "Person by name"), project: S("STRING"), is_major: S("BOOLEAN"), deliverable: S("STRING"), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["title", "due_date"] }) },
  { name: "create_campaign", description: "Propose a marketing campaign (the plan: name, dates, objective). Its launch is a separate create_event with category Campaign and campaign set.", parameters: S("OBJECT", undefined, { properties: {
    name: S("STRING"), company: S("STRING"), division: S("STRING"), start_date: S("STRING", "YYYY-MM-DD"), end_date: S("STRING", "YYYY-MM-DD"), objective: S("STRING"), owner: S("STRING", "Person by name"),
    project: S("STRING"), milestone: S("STRING", "Timeline milestone by name or TL-ID"), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["name"] }) },
  { name: "create_content_items", description: "Propose content slots (posts, videos, emails) on publish dates, e.g. 'an Instagram post every weekday next week'. Content items are not tasks.", parameters: S("OBJECT", undefined, { properties: {
    title: S("STRING", "What the content is, e.g. 'Daily English tip'"), campaign: S("STRING"), company: S("STRING"), channel: S("STRING"), format: S("STRING"), pillar: S("STRING"),
    dates: S("ARRAY", "Exact publish dates, YYYY-MM-DD", { items: S("STRING") }), from: S("STRING", "First date, YYYY-MM-DD"), to: S("STRING", "Last date, YYYY-MM-DD"),
    pattern: S("STRING", "With from/to", { enum: ["daily", "weekdays", "weekly"], format: "enum" }), time: S("STRING", "HH:MM publish time"), creator: S("STRING", "Person by name"), reviewer: S("STRING", "Person by name"),
    unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["title"] }) },
  { name: "move_event", description: "Propose moving an EXISTING event, e.g. 'move the GIF preparation meeting from Thursday to Friday'. Linked tasks and milestones are never changed.", parameters: S("OBJECT", undefined, { properties: {
    event: S("STRING", "Event title as the person said it, or EV-ID"), from_date: S("STRING", "The date it is on now, YYYY-MM-DD, when the person said it"), to_date: S("STRING", "New date, YYYY-MM-DD"),
    start_time: S("STRING", "New start HH:MM, only if the person gave one"), end_time: S("STRING", "New end HH:MM"),
    scope: S("STRING", "For repeating events, only if the person said which", { enum: ["this", "following", "all"], format: "enum" }), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["event", "to_date"] }) },
  { name: "invite_to_event", description: "Propose inviting people or groups to an EXISTING event, e.g. 'invite all IELSco managers to the monthly company review'.", parameters: S("OBJECT", undefined, { properties: {
    event: S("STRING", "Event title or EV-ID"), people: S("ARRAY", "People by name", { items: S("STRING") }),
    groups: S("ARRAY", "Groups as said: 'C-Level', 'managers', 'all IELSco managers', 'associates', 'all staff', a division", { items: S("STRING") }), unclear: S("ARRAY", undefined, { items: S("STRING") }) }, required: ["event"] }) },
] as const;

/** What the confirmation card shows: everything except the insert payload. */
export const cardItems = (items: ResolvedItem[]) => ({ items: items.map((i) => ({ kind: i.kind, draft: i.draft, fields: i.fields, issues: i.issues, warnings: i.warnings })) });
