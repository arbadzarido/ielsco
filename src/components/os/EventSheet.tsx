"use client";

// Create, edit, duplicate and delete one Company OS event (or one occurrence of a recurring event), and its Google
// Calendar sync. Every write goes through the person's own session (RLS decides); Google sync goes through
// /os/api/calendar/sync, which never overwrites a Google event that changed in Google since the last sync.
//
// Recurring events: the series is ONE row. Editing an occurrence asks for the scope:
//   this occurrence        → an os_event_exceptions row (moved, retitled or cancelled); the series is untouched
//   this and following     → os_split_series: the series ends before it and a linked new series starts there
//   the entire series      → the series row itself (single-occurrence changes are kept and move with it)
// Linked tasks and milestones are never changed by moving an event.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarCheck, Copy, RefreshCw, Repeat, Trash2, Users, X } from "lucide-react";
import { useOsMe } from "./OsProvider";
import { friendlyError, useDirectory } from "./data";
import { useChoice } from "./dialogs";
import { EntityFeed } from "./feed";
import { LinkedDocuments } from "./linked-docs";
import { CompanySelect, DivisionSelect, useDefaultCompany } from "./pickers";
import { Badge, ErrorLine, Field, Select, Sheet, btn, btnDanger, btnGhost, btnPrimary, input, muted } from "./ui";
import { SENSITIVITIES } from "@/lib/os/meta";
import { CATEGORIES, DEFAULT_TZ, addDays, itemDays, zonedInstant, zonedParts } from "@/lib/os/calendar";
import { PRESETS, WEEKDAYS, describeRule, presetOf, presetRule, ruleProblem, shiftRule, splitRules, type PresetKey, type Recurrence, type Weekday } from "@/lib/os/recurrence";
import { ROLE_GROUPS, groupLabel, resolveInvitations, type Candidate, type GroupSpec, type Resolution, type RoleGroup } from "@/lib/os/groups";
import { busyBlocks, conflictLines, findConflicts, linkWarnings, rescheduleReasons, type BusyRow, type Conflict } from "@/lib/os/conflicts";
import { rekeyExceptions } from "@/lib/os/event-moves";
import { cn } from "@/lib/utils";

export interface EventRow {
  id: string; company_code: string; division_id: string | null; project_id: string | null; task_id: string | null; timeline_item_id: string | null;
  campaign_id: string | null; partnership_id: string | null; recurrence: Recurrence | null; series_id: string | null; google_invites: boolean;
  title: string; description: string | null; category: string; starts_at: string; ends_at: string; all_day: boolean; timezone: string;
  location: string | null; meeting_url: string | null; sensitivity: string; status: string; created_by: string | null;
  google_synced_by: string | null; google_event_id: string | null; sync_state: string; sync_error: string | null;
}
export const EVENT_COLUMNS = "id, company_code, division_id, project_id, task_id, timeline_item_id, campaign_id, partnership_id, recurrence, series_id, google_invites, title, description, category, starts_at, ends_at, all_day, timezone, location, meeting_url, sensitivity, status, created_by, google_synced_by, google_event_id, sync_state, sync_error";

/** One occurrence of a recurring event, as the calendar shows it. */
export interface OccurrenceRef { occurrence_start: string; starts_at: string; ends_at: string; index: number; exception: { title?: string | null; description?: string | null; location?: string | null; meeting_url?: string | null } | null }

export type EventDefaults = Partial<Pick<EventRow, "company_code" | "division_id" | "project_id" | "task_id" | "timeline_item_id" | "campaign_id" | "partnership_id" | "category" | "title">> & { date?: string; startTime?: string; endTime?: string };
export type GoogleStatus = { configured: boolean; connected: boolean; email: string | null; timezone: string | null } | null;

const SYNC_LABEL: Record<string, string> = { synced: "In your Google Calendar", pending: "Changed here, not yet sent to Google", conflict: "Changed in Google too", error: "Last sync failed", deleted_remote: "Deleted in Google Calendar" };
const STATUSES = ["Scheduled", "Tentative", "Completed", "Cancelled"];
const RSVP: Record<string, string> = { accepted: "Accepted", declined: "Declined", tentative: "Maybe", needsAction: "No answer yet" };
type Attendee = { person_id: string; via_group: string | null; response_status?: string | null };
type Scope = "this" | "following" | "all";
const withoutCount = (r: Recurrence): Recurrence => { const x = { ...r }; delete x.count; return x; };

export async function syncEvent(id: string, action: string, extra: Record<string, unknown> = {}) {
  const r = await fetch("/os/api/calendar/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_id: id, action, ...extra }) });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, ...j } as { ok: boolean; error?: string; sync_state?: string; google?: { title: string; starts_at: string } | null; google_event?: string; deleted?: boolean };
}

/** Ask which part of a series a change applies to. The first occurrence offers only this one or the whole series. */
export async function askScope(ask: ReturnType<typeof useChoice>, verb: "change" | "move" | "delete", first: boolean): Promise<Scope | null> {
  const k = await ask({
    title: verb === "delete" ? "Delete a repeating event" : verb === "move" ? "Move a repeating event" : "Change a repeating event",
    body: verb === "delete" ? "Which occurrences should be deleted?" : "Which occurrences should change? Linked tasks and milestones stay as they are.",
    options: [
      { key: "this", label: "This occurrence only", primary: true },
      ...(first ? [] : [{ key: "following", label: "This and following occurrences", hint: "Earlier occurrences stay as they were." }]),
      { key: "all", label: "The entire series", danger: verb === "delete" },
    ],
  });
  return (k as Scope | null) ?? null;
}

export function EventSheet({ open, onClose, onSaved, event, occurrence, defaults, google }: {
  open: boolean; onClose: () => void; onSaved: (id: string | null) => void; event: EventRow | null; occurrence?: OccurrenceRef | null; defaults?: EventDefaults; google: GoogleStatus;
}) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const ask = useChoice();
  const defCompany = useDefaultCompany();
  const [dupOf, setDupOf] = useState<EventRow | null>(null);
  const ev = dupOf ? null : event;                   // the event being edited (null when creating or duplicating)
  const src = dupOf ?? event;                        // where the form's values come from
  const occ = dupOf ? null : occurrence ?? null;
  const recurring = Boolean(ev?.recurrence);
  const tz = src?.timezone ?? google?.timezone ?? DEFAULT_TZ;

  const init = useMemo(() => {
    if (src) {
      const s = occ?.starts_at ?? src.starts_at, e = occ?.ends_at ?? src.ends_at;
      const d = itemDays(s, e, src.all_day, src.timezone);
      const r = src.recurrence;
      return { title: dupOf ? `Copy of ${src.title}`.slice(0, 200) : occ?.exception?.title ?? src.title, category: src.category, company: src.company_code, division: src.division_id ?? "",
        project: src.project_id ?? "", milestone: src.timeline_item_id ?? "", campaign: src.campaign_id ?? "", partnership: src.partnership_id ?? "",
        allDay: src.all_day, startDate: d.first, startTime: zonedParts(s, src.timezone).time, endDate: src.all_day ? d.last : zonedParts(e, src.timezone).date,
        endTime: zonedParts(e, src.timezone).time, location: occ?.exception?.location ?? src.location ?? "", url: occ?.exception?.meeting_url ?? src.meeting_url ?? "",
        description: occ?.exception?.description ?? src.description ?? "", sensitivity: src.sensitivity, status: src.status, googleInvites: src.google_invites,
        preset: presetOf(r, zonedParts(src.starts_at, src.timezone).date) as PresetKey, rule: r, endMode: (r?.until ? "until" : r?.count ? "count" : "never") as "never" | "until" | "count",
        until: r?.until ?? "", count: String(r?.count ?? 10) };
    }
    const date = defaults?.date ?? zonedParts(new Date(), tz).date;
    return { title: defaults?.title ?? "", category: defaults?.category ?? "Meeting", company: defaults?.company_code ?? defCompany, division: defaults?.division_id ?? "", project: defaults?.project_id ?? "",
      milestone: defaults?.timeline_item_id ?? "", campaign: defaults?.campaign_id ?? "", partnership: defaults?.partnership_id ?? "",
      allDay: false, startDate: date, startTime: defaults?.startTime ?? "10:00", endDate: date, endTime: defaults?.endTime ?? "11:00", location: "", url: "", description: "", sensitivity: "Internal",
      status: "Scheduled", googleInvites: false, preset: "none" as PresetKey, rule: null as Recurrence | null, endMode: "never" as "never" | "until" | "count", until: "", count: "10" };
  }, [src, occ, dupOf, defaults, defCompany, tz]);
  const [f, setF] = useState(init);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [taskLinks, setTaskLinks] = useState<string[]>([]);
  const [addToGoogle, setAddToGoogle] = useState(false);
  const [removeFromGoogle, setRemoveFromGoogle] = useState(true);
  const [opts, setOpts] = useState<{ projects: { id: string; name: string }[]; tasks: { id: string; title: string; due_date: string | null }[]; milestones: { id: string; title: string; due_date: string | null; is_major: boolean; status: string }[]; campaigns: { id: string; name: string }[]; partnerships: { id: string; organisation: string }[] }>({ projects: [], tasks: [], milestones: [], campaigns: [], partnerships: [] });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gConflict, setGConflict] = useState<{ title: string; starts_at: string } | null>(null);
  const [tab, setTab] = useState<"details" | "links" | "activity">("details");
  const set = <K extends keyof typeof init>(k: K, v: (typeof init)[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => { if (open) { setF(init); setErr(null); setGConflict(null); setAddToGoogle(false); setTab("details"); } }, [open, init]);
  useEffect(() => { if (!open) setDupOf(null); }, [open]);
  useEffect(() => {
    if (!open) return;
    if (src) {
      supabase.from("os_event_attendees").select("person_id, via_group, response_status").eq("event_id", src.id).then(({ data }) => setAttendees((data ?? []) as Attendee[]));
      supabase.from("os_event_tasks").select("task_id").eq("event_id", src.id).then(({ data }) => setTaskLinks((data ?? []).map((r) => r.task_id as string)));
    } else { setAttendees([]); setTaskLinks(defaults?.task_id ? [defaults.task_id] : []); }
  }, [open, src, supabase, defaults?.task_id]);
  useEffect(() => {
    if (!open) return;
    Promise.all([
      supabase.from("os_projects").select("id, name").eq("company_code", f.company).not("status", "in", "(Completed,Cancelled)").order("name").limit(200),
      supabase.from("os_tasks").select("id, title, due_date").eq("company_code", f.company).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(300),
      supabase.from("os_timeline_items").select("id, title, due_date, is_major, status").not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(300),
      supabase.from("os_campaigns").select("id, name").eq("company_code", f.company).not("status", "in", "(Completed,Cancelled)").order("start_date", { nullsFirst: false }).limit(100),
      supabase.from("os_partnerships").select("id, organisation").eq("company_code", f.company).limit(200),
      supabase.rpc("os_invite_candidates", { p_company: f.company }),
    ]).then(([p, t, m, c, pa, cand]) => {
      setOpts({ projects: (p.data ?? []) as never, tasks: (t.data ?? []) as never, milestones: (m.data ?? []) as never, campaigns: (c.data ?? []) as never, partnerships: (pa.data ?? []) as never });
      setCandidates((cand.data ?? []) as Candidate[]);
    });
  }, [open, f.company, supabase]);

  const syncedByOther = Boolean(ev?.google_event_id && ev.google_synced_by && ev.google_synced_by !== me.person.id);
  const inMyGoogle = Boolean(ev?.google_event_id && ev.google_synced_by === me.person.id);
  const names = useMemo(() => new Map([...(dir?.people ?? []).map((p) => [p.id, p.full_name] as const), ...candidates.map((c) => [c.person_id, c.full_name] as const)]), [dir, candidates]);
  const divName = useCallback((id: string) => dir?.divisionById.get(id)?.name ?? id, [dir]);

  const instants = useCallback(() => {
    if (f.allDay) {
      if (f.endDate < f.startDate) return null;
      return { starts_at: zonedInstant(f.startDate, "00:00", tz), ends_at: zonedInstant(addDays(f.endDate, 1), "00:00", tz) };
    }
    const s = zonedInstant(f.startDate, f.startTime, tz), e = zonedInstant(f.endDate, f.endTime, tz);
    return Date.parse(e) < Date.parse(s) ? null : { starts_at: s, ends_at: e };
  }, [f.allDay, f.startDate, f.startTime, f.endDate, f.endTime, tz]);

  // The rule as the form describes it.
  const rule: Recurrence | null = useMemo(() => {
    if (f.preset === "none") return null;
    const base = f.preset === "custom" ? (f.rule ?? presetRule("custom", f.startDate)!) : presetRule(f.preset, f.startDate)!;
    const r: Recurrence = { freq: base.freq, ...(base.interval && base.interval > 1 ? { interval: base.interval } : {}), ...(base.byweekday ? { byweekday: base.byweekday } : {}) };
    if (f.endMode === "until" && f.until) r.until = f.until;
    if (f.endMode === "count") r.count = Number(f.count) || 1;
    return r;
  }, [f.preset, f.rule, f.startDate, f.endMode, f.until, f.count]);

  // Clashes for the people on the event, as warnings (never blocking).
  useEffect(() => {
    if (!open) return;
    const when = instants();
    const people = Array.from(new Set([...attendees.map((a) => a.person_id), me.person.id]));
    if (!when || f.allDay) { setConflicts([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("os_busy", { p_people: people, p_from: when.starts_at, p_to: when.ends_at });
      setConflicts(findConflicts({ ...when, all_day: false, ignore: ev?.id ?? null }, busyBlocks((data ?? []) as BusyRow[], when.starts_at, when.ends_at), names));
    }, 400);
    return () => clearTimeout(t);
  }, [open, attendees, instants, f.allDay, supabase, me.person.id, ev?.id, names]);
  const milestone = opts.milestones.find((m) => m.id === f.milestone) ?? null;
  const warnings = linkWarnings(f.startDate, { milestone, taskDue: opts.tasks.filter((t) => taskLinks.includes(t.id)) });
  const timeFmt = (iso: string) => zonedParts(iso, tz).time;

  const row = () => ({
    title: f.title.trim(), category: f.category, division_id: f.division || null, project_id: f.project || null, timeline_item_id: f.milestone || null,
    campaign_id: f.campaign || null, partnership_id: f.partnership || null, all_day: f.allDay, timezone: tz, location: f.location.trim() || null,
    meeting_url: f.url.trim() || null, description: f.description.trim() || null, sensitivity: f.sensitivity, status: f.status, google_invites: f.googleInvites,
  });

  async function writeAttendeesAndLinks(id: string) {
    const { data: had } = await supabase.from("os_event_attendees").select("person_id").eq("event_id", id);
    const before = new Set((had ?? []).map((r) => r.person_id as string)), after = new Map(attendees.map((a) => [a.person_id, a.via_group]));
    const add = [...after.keys()].filter((p) => !before.has(p)), drop = [...before].filter((p) => !after.has(p));
    if (add.length) { const a = await supabase.from("os_event_attendees").insert(add.map((person_id) => ({ event_id: id, person_id, via_group: after.get(person_id) ?? null }))); if (a.error) return `Saved, but attendees couldn't be updated: ${friendlyError(a.error.message)}`; }
    if (drop.length) await supabase.from("os_event_attendees").delete().eq("event_id", id).in("person_id", drop);
    const { data: tl } = await supabase.from("os_event_tasks").select("task_id").eq("event_id", id);
    const tb = new Set((tl ?? []).map((r) => r.task_id as string)), ta = new Set(taskLinks);
    const tadd = [...ta].filter((t) => !tb.has(t)), tdrop = [...tb].filter((t) => !ta.has(t));
    if (tadd.length) { const a = await supabase.from("os_event_tasks").insert(tadd.map((task_id) => ({ event_id: id, task_id }))); if (a.error) return `Saved, but linked tasks couldn't be updated: ${friendlyError(a.error.message)}`; }
    if (tdrop.length) await supabase.from("os_event_tasks").delete().eq("event_id", id).in("task_id", tdrop);
    return null;
  }

  async function save() {
    setErr(null);
    const when = instants();
    if (!f.title.trim()) return setErr("Give the event a title.");
    if (!when) return setErr("The event ends before it starts.");
    if (f.url && !/^https:\/\//.test(f.url)) return setErr("Meeting links start with https://");
    const rp = ruleProblem(rule);
    if (rp) return setErr(rp);
    if (rule?.until && rule.until < f.startDate) return setErr("The repeat end date is before the first occurrence.");

    // Existing event: which occurrences, and does the change need a confirmation?
    let scope: Scope = "all";
    if (ev && recurring && occ) { const s = await askScope(ask, "change", occ.index === 0); if (!s) return; scope = s; }
    const timeChanged = ev ? when.starts_at !== (occ?.starts_at ?? ev.starts_at) || when.ends_at !== (occ?.ends_at ?? ev.ends_at) : false;
    if (ev && timeChanged) {
      const reasons = rescheduleReasons({ attendees: attendees.length, inGoogle: Boolean(ev.google_event_id), majorMilestone: Boolean(milestone?.is_major), conflicts: conflicts.length, warnings: warnings.length, recurring });
      if (reasons.length) {
        const ok = await ask({ title: "Reschedule this event?", body: <><ul className="list-disc space-y-1 pl-5">{reasons.map((r) => <li key={r}>{r}</li>)}</ul><p className="mt-2">Linked tasks and milestones are not changed.</p></>, options: [{ key: "go", label: "Reschedule", primary: true }] });
        if (!ok) return;
      }
    }
    setBusy(true);
    let id: string | null = ev?.id ?? null;
    let pushIds: string[] = [];
    if (!ev) {
      const res = await supabase.from("os_events").insert({ ...row(), ...when, recurrence: rule, company_code: f.company }).select("id").single();
      if (res.error || !res.data) { setBusy(false); return setErr(res.error ? friendlyError(res.error.message) : "You can't create this event."); }
      id = res.data.id as string;
      const w = await writeAttendeesAndLinks(id);
      if (w) { setBusy(false); setErr(w); return; }
      if (addToGoogle) pushIds = [id];
    } else if (scope === "this" && occ) {
      const x = { event_id: ev.id, occurrence_start: occ.occurrence_start, cancelled: f.status === "Cancelled",
        title: f.title.trim() !== ev.title ? f.title.trim() : null, description: (f.description.trim() || null) !== ev.description ? f.description.trim() || null : null,
        location: (f.location.trim() || null) !== ev.location ? f.location.trim() || null : null, meeting_url: (f.url.trim() || null) !== ev.meeting_url ? f.url.trim() || null : null,
        starts_at: timeChanged ? when.starts_at : null, ends_at: timeChanged ? when.ends_at : null };
      const res = await supabase.from("os_event_exceptions").upsert(x, { onConflict: "event_id,occurrence_start" }).select("event_id").maybeSingle();
      if (res.error || !res.data) { setBusy(false); return setErr(res.error ? friendlyError(res.error.message) : "You can't change this event."); }
      if (inMyGoogle) pushIds = [ev.id];
    } else if (scope === "following" && occ) {
      const sr = splitRules(ev, occ.occurrence_start);
      const dayShift = Math.round((Date.parse(`${f.startDate}T00:00:00Z`) - Date.parse(`${zonedParts(occ.occurrence_start, tz).date}T00:00:00Z`)) / 86400000);
      const changedRule = JSON.stringify(rule) !== JSON.stringify(ev.recurrence);
      const newRule = changedRule ? rule : shiftRule(sr.ruleForNew, dayShift);
      const { data, error } = await supabase.rpc("os_split_series", { p_event: ev.id, p_from: occ.occurrence_start, p_until: sr.untilForOld, p: { ...row(), ...when, recurrence: newRule }, p_keep_exceptions: !timeChanged });
      if (error || !data) { setBusy(false); return setErr(friendlyError(error?.message ?? "You can't change this event.")); }
      id = String(data);
      const w = await writeAttendeesAndLinks(id);
      if (w) { setBusy(false); setErr(w); return; }
      if (inMyGoogle) pushIds = [ev.id, id];
    } else {
      // The whole event (or series). For a series opened at a later occurrence, move the series by the same amount.
      let times = when;
      let rec = rule;
      if (recurring && occ) {
        const delta = Date.parse(when.starts_at) - Date.parse(occ.starts_at), dur = Date.parse(when.ends_at) - Date.parse(when.starts_at);
        const s = new Date(Date.parse(ev.starts_at) + delta).toISOString();
        times = { starts_at: s, ends_at: new Date(Date.parse(s) + dur).toISOString() };
        const days = Math.round(delta / 86400000);
        if (JSON.stringify(rule) === JSON.stringify(ev.recurrence) && rule) rec = shiftRule(rule, days);
        if (delta) await rekeyExceptions(supabase, ev.id, delta);
      }
      const res = await supabase.from("os_events").update({ ...row(), ...times, recurrence: rec }).eq("id", ev.id).select("id, sync_state").maybeSingle();
      if (res.error || !res.data) { setBusy(false); return setErr(res.error ? friendlyError(res.error.message) : "You can't change this event."); }
      const w = await writeAttendeesAndLinks(ev.id);
      if (w) { setBusy(false); setErr(w); return; }
      if (inMyGoogle && res.data.sync_state === "pending") pushIds = [ev.id];
    }
    for (const pid of pushIds) {
      const s = await syncEvent(pid, "push");
      if (!s.ok) { setBusy(false); if (s.sync_state === "conflict") setGConflict(s.google ?? { title: "", starts_at: "" }); setErr(`Saved in Company OS. ${s.error ?? "Google Calendar wasn't updated."}`); onSaved(null); return; }
    }
    setBusy(false);
    onSaved(id);
  }

  async function resolveGoogle(action: "keep_os" | "keep_google" | "unlink" | "push") {
    if (!ev) return;
    setBusy(true); setErr(null);
    if (action === "push" && ev.sync_state === "deleted_remote") await syncEvent(ev.id, "unlink");
    const s = await syncEvent(ev.id, action);
    setBusy(false);
    if (!s.ok) { if (s.sync_state === "conflict") setGConflict(s.google ?? { title: "", starts_at: "" }); return setErr(s.error ?? "That didn't work."); }
    setGConflict(null); onSaved(ev.id);
  }

  async function remove() {
    if (!ev) return;
    let scope: Scope = "all";
    if (recurring && occ) { const s = await askScope(ask, "delete", occ.index === 0); if (!s) return; scope = s; }
    setBusy(true); setErr(null);
    if (scope === "this" && occ) {
      const r = await supabase.from("os_event_exceptions").upsert({ event_id: ev.id, occurrence_start: occ.occurrence_start, cancelled: true }, { onConflict: "event_id,occurrence_start" }).select("event_id").maybeSingle();
      if (r.error || !r.data) { setBusy(false); return setErr("You can't change this event."); }
      if (inMyGoogle) await syncEvent(ev.id, "push");
      setBusy(false); onSaved(null); return;
    }
    if (scope === "following" && occ) {
      const until = splitRules(ev, occ.occurrence_start).untilForOld;
      const r = await supabase.from("os_events").update({ recurrence: { ...withoutCount(ev.recurrence!), until } }).eq("id", ev.id).select("id").maybeSingle();
      if (r.error || !r.data) { setBusy(false); return setErr("You can't change this event."); }
      await supabase.from("os_event_exceptions").delete().eq("event_id", ev.id).gte("occurrence_start", occ.occurrence_start);
      if (inMyGoogle) await syncEvent(ev.id, "push");
      setBusy(false); onSaved(null); return;
    }
    const inGoogle = Boolean(ev.google_event_id) && !syncedByOther;
    const ok = await ask({ title: `Delete “${ev.title}”?`, body: recurring ? "Every occurrence is deleted." : inGoogle ? (removeFromGoogle ? "It will also be removed from your Google Calendar if it hasn't changed there." : "The copy in your Google Calendar stays.") : undefined, options: [{ key: "go", label: "Delete", danger: true, primary: true }] });
    if (!ok) { setBusy(false); return; }
    const s = await syncEvent(ev.id, "delete", { remove_from_google: inGoogle && removeFromGoogle });
    setBusy(false);
    if (!s.ok || !s.deleted) return setErr(s.error ?? "You can't delete this event.");
    if ((s as { google?: string }).google === "changed") window.alert("Deleted in Company OS. The Google Calendar copy was changed in Google, so it was kept there.");
    onSaved(null);
  }

  const duplicate = () => { if (event) { setDupOf(event); setTab("details"); } };
  const title = dupOf ? `Duplicate of ${dupOf.id}` : ev ? `Event ${ev.id}${occ && recurring ? ` · ${new Date(occ.occurrence_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: tz })}` : ""}` : "New event";

  return (
    <Sheet open={open} onClose={onClose} title={title} wide
      footer={<>
        {ev && <button type="button" className={cn(btnDanger, "mr-auto")} onClick={remove} disabled={busy} data-testid="os-event-delete"><Trash2 size={14} aria-hidden="true" />Delete</button>}
        {ev && <button type="button" className={btn} onClick={duplicate} disabled={busy} data-testid="os-event-duplicate"><Copy size={14} aria-hidden="true" />Duplicate</button>}
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-event-save">{busy ? "Saving…" : ev ? "Save" : "Create event"}</button>
      </>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        {ev && (
          <div className="flex rounded-lg bg-[#F0F2F5] p-1 text-sm" role="tablist" aria-label="Event sections">
            {([["details", "Details"], ["links", "Tasks & documents"], ["activity", "Discussion & history"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("min-h-9 flex-1 rounded-md px-2 font-medium", tab === k ? "bg-white shadow-sm" : "text-[#3A4B60]")}>{l}</button>
            ))}
          </div>
        )}
        {ev && tab === "links" && <LinksTab eventId={ev.id} taskLinks={taskLinks} setTaskLinks={setTaskLinks} tasks={opts.tasks} />}
        {ev && tab === "activity" && <EntityFeed type="event" id={ev.id} />}
        <div className={cn("space-y-4", ev && tab !== "details" && "hidden")}>
          {ev?.google_event_id && (
            <div className={cn("rounded-lg border p-3 text-sm", ev.sync_state === "conflict" || gConflict ? "border-[#F1D5A6] bg-[#FDF8EE]" : "border-[#D9E2EA] bg-[#F7F9FB]")} data-testid="os-event-sync">
              <p className="flex items-center gap-1.5 font-medium">
                {ev.sync_state === "conflict" || gConflict ? <AlertTriangle size={14} aria-hidden="true" className="text-[#865400]" /> : <CalendarCheck size={14} aria-hidden="true" className="text-[#2457A6]" />}
                {syncedByOther ? "In another person's Google Calendar" : SYNC_LABEL[gConflict ? "conflict" : ev.sync_state] ?? ev.sync_state}
              </p>
              {!syncedByOther && (ev.sync_state === "conflict" || gConflict) && (
                <>
                  <p className={cn("mt-1", muted)}>Someone changed this event in Google Calendar after it was last synced. Nothing was overwritten. Choose which version to keep.{gConflict?.title ? ` Google has "${gConflict.title}".` : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => resolveGoogle("keep_google")} disabled={busy}>Keep Google&apos;s version</button>
                    <button type="button" className={btn} onClick={() => resolveGoogle("keep_os")} disabled={busy}>Send this version to Google</button>
                    <button type="button" className={btnGhost} onClick={() => resolveGoogle("unlink")} disabled={busy}>Stop syncing</button>
                  </div>
                </>
              )}
              {!syncedByOther && ev.sync_state === "deleted_remote" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => resolveGoogle("push")} disabled={busy}>Add it to Google again</button>
                  <button type="button" className={btnGhost} onClick={() => resolveGoogle("unlink")} disabled={busy}>Stop syncing</button>
                </div>
              )}
              {!syncedByOther && ["pending", "error"].includes(ev.sync_state) && !gConflict && (
                <button type="button" className={cn(btn, "mt-2")} onClick={() => resolveGoogle("push")} disabled={busy}><RefreshCw size={14} aria-hidden="true" />Send to Google now</button>
              )}
              {ev.sync_error && ev.sync_state === "error" && <p className={cn("mt-1 text-xs", muted)}>{ev.sync_error}</p>}
            </div>
          )}
          {ev && !ev.google_event_id && google?.connected && ev.status !== "Cancelled" && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#D9E2EA] bg-[#F7F9FB] p-3 text-sm" data-testid="os-event-sync-local">
              <span className={cn("flex-1", muted)}>Not in your Google Calendar.</span>
              <button type="button" className={btn} onClick={() => resolveGoogle("push")} disabled={busy}><CalendarCheck size={14} aria-hidden="true" />Add to my Google Calendar</button>
            </div>
          )}
          {occ && recurring && <p className="flex items-center gap-1.5 rounded-lg bg-[#F4F0FD] px-3 py-2 text-sm text-[#5638B8]" data-testid="os-event-series-note"><Repeat size={14} aria-hidden="true" />{describeRule(ev!.recurrence)}. You&apos;ll choose which occurrences a change applies to.</p>}
          <Field label="Title">{(id) => <input id={id} className={input} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} data-testid="os-event-title" />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">{(id) => <Select id={id} value={f.category} onChange={(v) => set("category", v)} options={CATEGORIES} />}</Field>
            <Field label="Company">{(id) => ev ? <input id={id} className={input} value={f.company} disabled /> : <CompanySelect id={id} value={f.company} onChange={(v) => setF((x) => ({ ...x, company: v, project: "", campaign: "", partnership: "" }))} />}</Field>
            <Field label="Division">{(id) => <DivisionSelect id={id} value={f.division} onChange={(v) => set("division", v)} />}</Field>
            <Field label="Status">{(id) => <Select id={id} value={f.status} onChange={(v) => set("status", v)} options={STATUSES} />}</Field>
          </div>
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.allDay} onChange={(e) => set("allDay", e.target.checked)} />All day</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts">{(id) => <div className="flex gap-2"><input id={id} type="date" className={input} value={f.startDate} onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, startDate: v, endDate: x.endDate < v ? v : x.endDate })); }} data-testid="os-event-start-date" />{!f.allDay && <input type="time" aria-label="Start time" className={cn(input, "w-32")} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="os-event-start-time" />}</div>}</Field>
            <Field label="Ends">{(id) => <div className="flex gap-2"><input id={id} type="date" className={input} value={f.endDate} min={f.startDate} onChange={(e) => set("endDate", e.target.value)} data-testid="os-event-end-date" />{!f.allDay && <input type="time" aria-label="End time" className={cn(input, "w-32")} value={f.endTime} onChange={(e) => set("endTime", e.target.value)} data-testid="os-event-end-time" />}</div>}</Field>
          </div>
          <p className={cn("-mt-2 text-xs", muted)}>Times are in {tz.replace("_", " ")}.</p>
          <RepeatFields f={f} setF={setF} rule={rule} disabled={Boolean(occ && recurring)} />
          {(conflicts.length > 0 || warnings.length > 0) && (
            <div className="rounded-lg border border-[#F1D5A6] bg-[#FDF8EE] p-3 text-sm" data-testid="os-event-conflicts" role="status">
              <p className="flex items-center gap-1.5 font-medium text-[#865400]"><AlertTriangle size={14} aria-hidden="true" />Heads-up (you can still save)</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {conflictLines(conflicts, timeFmt).map((l) => <li key={l}>Clash: {l}</li>)}
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Location">{(id) => <input id={id} className={input} value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={300} />}</Field>
            <Field label="Meeting link">{(id) => <input id={id} className={input} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://meet.google.com/…" inputMode="url" maxLength={500} />}</Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project">{(id) => <Select id={id} value={f.project} onChange={(v) => set("project", v)} placeholder="None" options={opts.projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} />}</Field>
            <Field label="Timeline milestone">{(id) => <Select id={id} value={f.milestone} onChange={(v) => set("milestone", v)} placeholder="None" options={opts.milestones.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))} />}</Field>
            <Field label="Campaign">{(id) => <Select id={id} value={f.campaign} onChange={(v) => set("campaign", v)} placeholder="None" options={opts.campaigns.map((c) => ({ value: c.id, label: `${c.id} · ${c.name}` }))} />}</Field>
            <Field label="Partnership">{(id) => <Select id={id} value={f.partnership} onChange={(v) => set("partnership", v)} placeholder="None" options={opts.partnerships.map((c) => ({ value: c.id, label: `${c.id} · ${c.organisation}` }))} />}</Field>
          </div>
          {!ev && <TaskPicker taskLinks={taskLinks} setTaskLinks={setTaskLinks} tasks={opts.tasks} />}
          <Invitations attendees={attendees} setAttendees={setAttendees} candidates={candidates} company={f.company} divName={divName} names={names} />
          {google?.connected && (
            <label className="flex min-h-10 items-start gap-2 text-sm" data-testid="os-event-google-invites"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={f.googleInvites} onChange={(e) => set("googleInvites", e.target.checked)} />
              <span>Send Google Calendar invitations to the attendees<span className={cn("block text-xs", muted)}>Only when the event is in your Google Calendar. Google emails each attendee at their work Google account and shows their answers here.</span></span></label>
          )}
          <Field label="Notes">{(id) => <textarea id={id} rows={3} className={input} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />}</Field>
          <Field label="Sensitivity">{(id) => <Select id={id} value={f.sensitivity} onChange={(v) => set("sensitivity", v)} options={SENSITIVITIES} />}</Field>
          {!ev && google?.connected && (
            <label className="flex min-h-10 items-center gap-2 text-sm" data-testid="os-event-add-google"><input type="checkbox" className="h-4 w-4" checked={addToGoogle} onChange={(e) => setAddToGoogle(e.target.checked)} />Also add to my Google Calendar ({google.email})</label>
          )}
          {ev?.google_event_id && !syncedByOther && (
            <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={removeFromGoogle} onChange={(e) => setRemoveFromGoogle(e.target.checked)} />If I delete this event, remove it from my Google Calendar too</label>
          )}
          {ev && <p className={cn("text-xs", muted)}><Badge>{ev.category}</Badge> Created by {dir?.peopleById.get(ev.created_by ?? "")?.full_name ?? ev.created_by ?? "—"}{ev.series_id ? <> · continues <Link className="underline" href={`/os/calendar?event=${ev.series_id}`}>{ev.series_id}</Link></> : null}</p>}
        </div>
      </div>
    </Sheet>
  );
}

type Form = { preset: PresetKey; rule: Recurrence | null; endMode: "never" | "until" | "count"; until: string; count: string; startDate: string };
function RepeatFields<T extends Form>({ f, setF, rule, disabled }: { f: T; setF: (fn: (x: T) => T) => void; rule: Recurrence | null; disabled: boolean }) {
  const custom = f.rule ?? presetRule("custom", f.startDate)!;
  const setCustom = (r: Partial<Recurrence>) => setF((x) => ({ ...x, rule: { ...custom, ...r } }));
  return (
    <fieldset className="rounded-lg border border-[#E6E9EE] p-3" data-testid="os-event-repeat" disabled={disabled}>
      <legend className="px-1 text-xs font-medium text-[#3A4B60]">Repeat</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select ariaLabel="Repeat" value={f.preset} onChange={(v) => setF((x) => ({ ...x, preset: v as PresetKey, rule: v === "custom" ? (x.rule ?? presetRule("custom", x.startDate)) : x.rule }))} options={PRESETS.map((p) => ({ value: p.key, label: p.label }))} />
        {f.preset !== "none" && (
          <Select ariaLabel="Ends" value={f.endMode} onChange={(v) => setF((x) => ({ ...x, endMode: v as Form["endMode"] }))} options={[{ value: "never", label: "Never ends" }, { value: "until", label: "Ends on a date" }, { value: "count", label: "Ends after a number of times" }]} />
        )}
      </div>
      {f.preset === "custom" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Every</span>
            <input type="number" min={1} max={99} aria-label="Interval" className={cn(input, "w-20")} value={custom.interval ?? 1} onChange={(e) => setCustom({ interval: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
            <Select ariaLabel="Unit" value={custom.freq} onChange={(v) => setCustom({ freq: v as Recurrence["freq"], byweekday: v === "weekly" ? custom.byweekday ?? [WEEKDAYS[new Date(`${f.startDate}T00:00:00Z`).getUTCDay()]] : undefined })}
              options={[{ value: "daily", label: "day(s)" }, { value: "weekly", label: "week(s)" }, { value: "monthly", label: "month(s)" }, { value: "yearly", label: "year(s)" }]} className="w-32" />
          </div>
          {custom.freq === "weekly" && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="On these days">
              {(["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as Weekday[]).map((d) => {
                const on = custom.byweekday?.includes(d);
                return <button key={d} type="button" aria-pressed={on} onClick={() => setCustom({ byweekday: on ? (custom.byweekday ?? []).filter((x) => x !== d) : [...(custom.byweekday ?? []), d] })}
                  className={cn("h-9 w-11 rounded-md border text-xs font-semibold", on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#DDE2E8] bg-white text-[#3A4B60]")}>{d.charAt(0) + d.charAt(1).toLowerCase()}</button>;
              })}
            </div>
          )}
        </div>
      )}
      {f.preset !== "none" && f.endMode === "until" && <input type="date" aria-label="Repeat until" className={cn(input, "mt-3")} min={f.startDate} value={f.until} onChange={(e) => setF((x) => ({ ...x, until: e.target.value }))} data-testid="os-event-repeat-until" />}
      {f.preset !== "none" && f.endMode === "count" && <input type="number" aria-label="Number of times" min={1} max={730} className={cn(input, "mt-3 w-28")} value={f.count} onChange={(e) => setF((x) => ({ ...x, count: e.target.value }))} />}
      <p className={cn("mt-2 text-xs", muted)}>{disabled ? "Change the repeat rule from the series (open it with “The entire series”)." : describeRule(rule)}</p>
    </fieldset>
  );
}

function TaskPicker({ taskLinks, setTaskLinks, tasks }: { taskLinks: string[]; setTaskLinks: (t: string[]) => void; tasks: { id: string; title: string }[] }) {
  const [pick, setPick] = useState("");
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-[#3A4B60]">Linked tasks</p>
      <ul className="mb-2 flex flex-wrap gap-1.5" data-testid="os-event-tasks">
        {taskLinks.map((t) => <li key={t}><Badge>{t} {tasks.find((x) => x.id === t)?.title ?? ""}<button type="button" aria-label={`Unlink ${t}`} className="ml-1" onClick={() => setTaskLinks(taskLinks.filter((x) => x !== t))}><X size={12} aria-hidden="true" /></button></Badge></li>)}
        {!taskLinks.length && <li className={cn("text-xs", muted)}>No tasks linked. Linking a task shows it with this event; it doesn&apos;t change the task.</li>}
      </ul>
      <div className="flex gap-2">
        <Select ariaLabel="Link a task" value={pick} onChange={setPick} placeholder="Link a task…" options={tasks.filter((t) => !taskLinks.includes(t.id)).map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))} />
        <button type="button" className={btn} disabled={!pick} onClick={() => { setTaskLinks([...taskLinks, pick]); setPick(""); }}>Link</button>
      </div>
    </div>
  );
}

function LinksTab({ eventId, taskLinks, setTaskLinks, tasks }: { eventId: string; taskLinks: string[]; setTaskLinks: (t: string[]) => void; tasks: { id: string; title: string }[] }) {
  return (
    <div className="space-y-5">
      <TaskPicker taskLinks={taskLinks} setTaskLinks={setTaskLinks} tasks={tasks} />
      <p className={cn("-mt-3 text-xs", muted)}>Task links are saved with the event (Save).</p>
      <div><h3 className="mb-2 text-sm font-semibold">Documents</h3><LinkedDocuments type="event" id={eventId} /></div>
    </div>
  );
}

/** Attendees: individuals, or groups resolved now (with a preview) into individuals that remember their group. */
function Invitations({ attendees, setAttendees, candidates, company, divName, names }: {
  attendees: Attendee[]; setAttendees: (a: Attendee[]) => void; candidates: Candidate[]; company: string; divName: (id: string) => string; names: Map<string, string>;
}) {
  const { supabase } = useOsMe();
  const [role, setRole] = useState<RoleGroup | "">("");
  const [division, setDivision] = useState("");
  const [scope, setScope] = useState(company === "HQ" ? "" : company);
  const [preview, setPreview] = useState<Resolution | null>(null);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [showPeople, setShowPeople] = useState(false);
  useEffect(() => { setScope(company === "HQ" ? "" : company); setPreview(null); }, [company]);
  useEffect(() => { supabase.from("os_divisions").select("id, name").order("id").then(({ data }) => setDivisions((data ?? []) as { id: string; name: string }[])); }, [supabase]);
  const spec: GroupSpec = { ...(role ? { role } : {}), ...(division ? { division } : {}), ...(scope ? { company: scope } : {}) };
  const run = () => setPreview(resolveInvitations(candidates, [spec], [], attendees.map((a) => a.person_id), divName));
  const addAll = () => { if (!preview) return; setAttendees([...attendees, ...preview.invitees.map((i) => ({ person_id: i.person_id, via_group: i.via }))]); setPreview(null); };
  const ids = new Set(attendees.map((a) => a.person_id));
  return (
    <fieldset className="rounded-lg border border-[#E6E9EE] p-3">
      <legend className="px-1 text-xs font-medium text-[#3A4B60]">Attendees ({attendees.length})</legend>
      <ul className="mb-3 flex flex-wrap gap-1.5" data-testid="os-event-attendee-list">
        {attendees.map((a) => (
          <li key={a.person_id}>
            <Badge tone={a.response_status === "accepted" ? "green" : a.response_status === "declined" ? "red" : "neutral"}>
              {names.get(a.person_id) ?? a.person_id}{a.via_group ? <span className="ml-1 opacity-70">· {a.via_group}</span> : null}{a.response_status ? <span className="ml-1 opacity-70">· {RSVP[a.response_status]}</span> : null}
              <button type="button" aria-label={`Remove ${names.get(a.person_id) ?? a.person_id}`} className="ml-1" onClick={() => setAttendees(attendees.filter((x) => x.person_id !== a.person_id))}><X size={12} aria-hidden="true" /></button>
            </Badge>
          </li>
        ))}
        {!attendees.length && <li className={cn("text-xs", muted)}>Nobody invited yet.</li>}
      </ul>
      <div className="grid gap-2 sm:grid-cols-4" data-testid="os-event-groups">
        <Select ariaLabel="Group" value={role} onChange={(v) => { setRole(v as RoleGroup | ""); setPreview(null); }} placeholder="Any role" options={ROLE_GROUPS.map((g) => ({ value: g.key, label: g.label }))} />
        <Select ariaLabel="Group division" value={division} onChange={(v) => { setDivision(v); setPreview(null); }} placeholder="Any division" options={divisions.map((d) => ({ value: d.id, label: d.name }))} />
        <Select ariaLabel="Group company" value={scope} onChange={(v) => { setScope(v); setPreview(null); }} placeholder={company === "HQ" ? "Both companies" : "Any company"} options={(company === "HQ" ? ["IEL", "ELC"] : [company]).map((c) => ({ value: c, label: c === "IEL" ? "IELSco" : c === "ELC" ? "Elco AI" : c }))} />
        <button type="button" className={btn} onClick={run} disabled={!role && !division} data-testid="os-event-group-preview"><Users size={14} aria-hidden="true" />Preview</button>
      </div>
      {preview && (
        <div className="mt-3 rounded-lg bg-[#F7F9FB] p-3 text-sm" data-testid="os-event-group-result">
          <p className="font-medium">{groupLabel(spec, divName)}: {preview.invitees.length} to add{preview.alreadyInvited.length ? `, ${preview.alreadyInvited.length} already invited` : ""}</p>
          {preview.empty.length > 0 && <p className={cn("text-xs", muted)}>Nobody active matches this group.</p>}
          <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-xs">
            {preview.invitees.map((i) => <li key={i.person_id}>{i.name} <span className={muted}>· {i.companies.map((c) => (c === "IEL" ? "IELSco" : c === "ELC" ? "Elco AI" : c)).join(" & ")}{i.divisions.length ? ` · ${i.divisions.map(divName).join(", ")}` : ""}</span></li>)}
          </ul>
          {preview.duplicates.length > 0 && <p className={cn("mt-1 text-xs", muted)}>Merged duplicates: {preview.duplicates.map((d) => d.name).join(", ")}</p>}
          <div className="mt-2 flex gap-2">
            <button type="button" className={btnPrimary} onClick={addAll} disabled={!preview.invitees.length} data-testid="os-event-group-add">Add {preview.invitees.length} {preview.invitees.length === 1 ? "person" : "people"}</button>
            <button type="button" className={btnGhost} onClick={() => setPreview(null)}>Cancel</button>
          </div>
          <p className={cn("mt-2 text-xs", muted)}>Groups are worked out now. People who join the group later aren&apos;t added to this event automatically.</p>
        </div>
      )}
      <button type="button" className={cn(btnGhost, "mt-2")} onClick={() => setShowPeople((s) => !s)} aria-expanded={showPeople}>{showPeople ? "Hide people" : "Choose people one by one"}</button>
      {showPeople && (
        <div className="mt-1 grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-[#E6E9EE] p-2 sm:grid-cols-2" data-testid="os-event-attendees">
          {candidates.map((p) => (
            <label key={p.person_id} className="flex min-h-9 items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={ids.has(p.person_id)} onChange={(e) => setAttendees(e.target.checked ? [...attendees, { person_id: p.person_id, via_group: null }] : attendees.filter((x) => x.person_id !== p.person_id))} />
              {p.short_name ? `${p.short_name} (${p.full_name})` : p.full_name}
            </label>
          ))}
          {!candidates.length && <p className={cn("text-xs", muted)}>No one to invite yet.</p>}
        </div>
      )}
      <p className={cn("mt-1 text-xs", muted)}>Only active staff of this company can be invited. Inviting someone shows them the event and notifies them in Company OS.</p>
    </fieldset>
  );
}
