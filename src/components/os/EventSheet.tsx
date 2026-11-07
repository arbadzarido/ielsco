"use client";

// Create, edit and delete one Company OS event, and its Google Calendar sync. Every write goes through the person's
// own session (RLS decides); Google sync goes through /os/api/calendar/sync, which never overwrites a Google event that
// changed in Google since the last sync.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, RefreshCw, Trash2 } from "lucide-react";
import { useOsMe } from "./OsProvider";
import { friendlyError, useDirectory } from "./data";
import { CompanySelect, DivisionSelect, useDefaultCompany } from "./pickers";
import { Badge, ErrorLine, Field, Select, Sheet, btn, btnDanger, btnGhost, btnPrimary, input, muted } from "./ui";
import { SENSITIVITIES } from "@/lib/os/meta";
import { CATEGORIES, DEFAULT_TZ, addDays, itemDays, zonedInstant, zonedParts } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

export interface EventRow {
  id: string; company_code: string; division_id: string | null; project_id: string | null; task_id: string | null; timeline_item_id: string | null;
  title: string; description: string | null; category: string; starts_at: string; ends_at: string; all_day: boolean; timezone: string;
  location: string | null; meeting_url: string | null; sensitivity: string; status: string; created_by: string | null;
  google_synced_by: string | null; google_event_id: string | null; sync_state: string; sync_error: string | null;
}
export const EVENT_COLUMNS = "id, company_code, division_id, project_id, task_id, timeline_item_id, title, description, category, starts_at, ends_at, all_day, timezone, location, meeting_url, sensitivity, status, created_by, google_synced_by, google_event_id, sync_state, sync_error";

export type EventDefaults = Partial<Pick<EventRow, "company_code" | "division_id" | "project_id" | "task_id" | "timeline_item_id" | "category" | "title">> & { date?: string };
export type GoogleStatus = { configured: boolean; connected: boolean; email: string | null; timezone: string | null } | null;

const SYNC_LABEL: Record<string, string> = { synced: "In your Google Calendar", pending: "Changed here, not yet sent to Google", conflict: "Changed in Google too", error: "Last sync failed", deleted_remote: "Deleted in Google Calendar" };

export function EventSheet({ open, onClose, onSaved, event, defaults, google }: {
  open: boolean; onClose: () => void; onSaved: (id: string | null) => void; event: EventRow | null; defaults?: EventDefaults; google: GoogleStatus;
}) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const tz = event?.timezone ?? google?.timezone ?? DEFAULT_TZ;
  const init = useMemo(() => {
    if (event) {
      const d = itemDays(event.starts_at, event.ends_at, event.all_day, event.timezone);
      return { title: event.title, category: event.category, company: event.company_code, division: event.division_id ?? "", project: event.project_id ?? "", task: event.task_id ?? "", milestone: event.timeline_item_id ?? "",
        allDay: event.all_day, startDate: d.first, startTime: zonedParts(event.starts_at, event.timezone).time, endDate: event.all_day ? d.last : zonedParts(event.ends_at, event.timezone).date,
        endTime: zonedParts(event.ends_at, event.timezone).time, location: event.location ?? "", url: event.meeting_url ?? "", description: event.description ?? "", sensitivity: event.sensitivity, cancelled: event.status === "Cancelled" };
    }
    const date = defaults?.date ?? zonedParts(new Date(), tz).date;
    return { title: defaults?.title ?? "", category: defaults?.category ?? "Meeting", company: defaults?.company_code ?? defCompany, division: defaults?.division_id ?? "", project: defaults?.project_id ?? "", task: defaults?.task_id ?? "", milestone: defaults?.timeline_item_id ?? "",
      allDay: false, startDate: date, startTime: "10:00", endDate: date, endTime: "11:00", location: "", url: "", description: "", sensitivity: "Internal", cancelled: false };
  }, [event, defaults, defCompany, tz]);
  const [f, setF] = useState(init);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [addToGoogle, setAddToGoogle] = useState(false);
  const [removeFromGoogle, setRemoveFromGoogle] = useState(true);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);
  const [milestones, setMilestones] = useState<{ id: string; title: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<{ title: string; starts_at: string } | null>(null);
  const set = <K extends keyof typeof init>(k: K, v: (typeof init)[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => { if (open) { setF(init); setErr(null); setNote(null); setConflict(null); setAddToGoogle(false); } }, [open, init]);
  useEffect(() => {
    if (!open) return;
    if (event) supabase.from("os_event_attendees").select("person_id").eq("event_id", event.id).then(({ data }) => setAttendees((data ?? []).map((r) => r.person_id as string)));
    else setAttendees([]);
  }, [open, event, supabase]);
  useEffect(() => {
    if (!open) return;
    supabase.from("os_projects").select("id, name").eq("company_code", f.company).not("status", "in", "(Completed,Cancelled)").order("name").limit(200).then(({ data }) => setProjects((data ?? []) as { id: string; name: string }[]));
    let tq = supabase.from("os_tasks").select("id, title").eq("company_code", f.company).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(200);
    if (f.project) tq = tq.eq("project_id", f.project);
    tq.then(({ data }) => setTasks((data ?? []) as { id: string; title: string }[]));
    supabase.from("os_timeline_items").select("id, title").not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(200).then(({ data }) => setMilestones((data ?? []) as { id: string; title: string }[]));
  }, [open, f.company, f.project, supabase]);

  const staff = (dir?.people ?? []).filter((p) => ["active", "onboarding"].includes(p.status) && p.org_role !== "guest");
  const syncedByOther = Boolean(event?.google_event_id && event.google_synced_by && event.google_synced_by !== me.person.id);

  function instants() {
    if (f.allDay) {
      if (f.endDate < f.startDate) return null;
      return { starts_at: zonedInstant(f.startDate, "00:00", tz), ends_at: zonedInstant(addDays(f.endDate, 1), "00:00", tz) };
    }
    const s = zonedInstant(f.startDate, f.startTime, tz), e = zonedInstant(f.endDate, f.endTime, tz);
    return Date.parse(e) < Date.parse(s) ? null : { starts_at: s, ends_at: e };
  }

  async function sync(id: string, action: string, extra: Record<string, unknown> = {}) {
    const r = await fetch("/os/api/calendar/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event_id: id, action, ...extra }) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, ...j } as { ok: boolean; error?: string; sync_state?: string; google?: { title: string; starts_at: string } | null; google_event?: string; deleted?: boolean };
  }

  async function save() {
    setErr(null); setNote(null);
    const when = instants();
    if (!f.title.trim()) return setErr("Give the event a title.");
    if (!when) return setErr("The event ends before it starts.");
    if (f.url && !/^https:\/\//.test(f.url)) return setErr("Meeting links start with https://");
    setBusy(true);
    const row = { title: f.title.trim(), category: f.category, division_id: f.division || null, project_id: f.project || null, task_id: f.task || null, timeline_item_id: f.milestone || null,
      ...when, all_day: f.allDay, timezone: tz, location: f.location.trim() || null, meeting_url: f.url.trim() || null, description: f.description.trim() || null, sensitivity: f.sensitivity, status: f.cancelled ? "Cancelled" : "Scheduled" };
    const res = event
      ? await supabase.from("os_events").update(row).eq("id", event.id).select("id, sync_state").maybeSingle()
      : await supabase.from("os_events").insert({ ...row, company_code: f.company }).select("id, sync_state").single();
    if (res.error || !res.data) { setBusy(false); return setErr(res.error ? friendlyError(res.error.message) : "You can't change this event."); }
    const id = res.data.id as string;
    // Attendees: add the new ones, remove the dropped ones.
    const { data: had } = await supabase.from("os_event_attendees").select("person_id").eq("event_id", id);
    const before = new Set((had ?? []).map((r) => r.person_id as string)), after = new Set(attendees);
    const add = [...after].filter((p) => !before.has(p)), drop = [...before].filter((p) => !after.has(p));
    if (add.length) { const a = await supabase.from("os_event_attendees").insert(add.map((person_id) => ({ event_id: id, person_id }))); if (a.error) { setBusy(false); return setErr(`Saved, but attendees couldn't be updated: ${friendlyError(a.error.message)}`); } }
    if (drop.length) await supabase.from("os_event_attendees").delete().eq("event_id", id).in("person_id", drop);
    // Google: push when asked on create, or when an already-synced event changed here.
    if ((!event && addToGoogle) || (event && res.data.sync_state === "pending" && !syncedByOther)) {
      const s = await sync(id, "push");
      if (!s.ok) { setBusy(false); if (s.sync_state === "conflict") setConflict(s.google ?? { title: "", starts_at: "" }); setErr(`Saved in Company OS. ${s.error ?? "Google Calendar wasn't updated."}`); onSaved(null); return; }
    }
    setBusy(false);
    onSaved(id);
  }

  async function resolve(action: "keep_os" | "keep_google" | "unlink" | "push") {
    if (!event) return;
    setBusy(true); setErr(null);
    if (action === "push" && event.sync_state === "deleted_remote") await sync(event.id, "unlink");
    const s = await sync(event.id, action);
    setBusy(false);
    if (!s.ok) { if (s.sync_state === "conflict") setConflict(s.google ?? { title: "", starts_at: "" }); return setErr(s.error ?? "That didn't work."); }
    setConflict(null); onSaved(event.id);
  }

  async function remove() {
    if (!event) return;
    const inGoogle = Boolean(event.google_event_id) && !syncedByOther;
    if (!window.confirm(`Delete "${event.title}" from Company OS?${inGoogle ? (removeFromGoogle ? " It will also be removed from your Google Calendar if it hasn't changed there." : " The copy in your Google Calendar stays.") : ""}`)) return;
    setBusy(true); setErr(null);
    const s = await sync(event.id, "delete", { remove_from_google: inGoogle && removeFromGoogle });
    setBusy(false);
    if (!s.ok || !s.deleted) return setErr(s.error ?? "You can't delete this event.");
    const g = (s as { google?: string }).google;
    if (g === "changed") window.alert("Deleted in Company OS. The Google Calendar copy was changed in Google, so it was kept there.");
    onSaved(null);
  }

  return (
    <Sheet open={open} onClose={onClose} title={event ? `Event ${event.id}` : "New event"} wide
      footer={<>
        {event && <button type="button" className={cn(btnDanger, "mr-auto")} onClick={remove} disabled={busy} data-testid="os-event-delete"><Trash2 size={14} aria-hidden="true" />Delete</button>}
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-event-save">{busy ? "Saving…" : event ? "Save" : "Create event"}</button>
      </>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        {note && <p className={cn("text-sm", muted)} role="status">{note}</p>}
        {event?.google_event_id && (
          <div className={cn("rounded-lg border p-3 text-sm", event.sync_state === "conflict" || conflict ? "border-[#F1D5A6] bg-[#FDF8EE]" : "border-[#D9E2EA] bg-[#F7F9FB]")} data-testid="os-event-sync">
            <p className="flex items-center gap-1.5 font-medium">
              {event.sync_state === "conflict" || conflict ? <AlertTriangle size={14} aria-hidden="true" className="text-[#865400]" /> : <CalendarCheck size={14} aria-hidden="true" className="text-[#2457A6]" />}
              {syncedByOther ? "In another person's Google Calendar" : SYNC_LABEL[conflict ? "conflict" : event.sync_state] ?? event.sync_state}
            </p>
            {!syncedByOther && (event.sync_state === "conflict" || conflict) && (
              <>
                <p className={cn("mt-1", muted)}>Someone changed this event in Google Calendar after it was last synced. Nothing was overwritten. Choose which version to keep.{conflict?.title ? ` Google has "${conflict.title}".` : ""}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => resolve("keep_google")} disabled={busy}>Keep Google&apos;s version</button>
                  <button type="button" className={btn} onClick={() => resolve("keep_os")} disabled={busy}>Send this version to Google</button>
                  <button type="button" className={btnGhost} onClick={() => resolve("unlink")} disabled={busy}>Stop syncing</button>
                </div>
              </>
            )}
            {!syncedByOther && event.sync_state === "deleted_remote" && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btn} onClick={() => resolve("push")} disabled={busy}>Add it to Google again</button>
                <button type="button" className={btnGhost} onClick={() => resolve("unlink")} disabled={busy}>Stop syncing</button>
              </div>
            )}
            {!syncedByOther && ["pending", "error"].includes(event.sync_state) && !conflict && (
              <button type="button" className={cn(btn, "mt-2")} onClick={() => resolve("push")} disabled={busy}><RefreshCw size={14} aria-hidden="true" />Send to Google now</button>
            )}
            {event.sync_error && event.sync_state === "error" && <p className={cn("mt-1 text-xs", muted)}>{event.sync_error}</p>}
          </div>
        )}
        {event && !event.google_event_id && google?.connected && event.status !== "Cancelled" && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#D9E2EA] bg-[#F7F9FB] p-3 text-sm" data-testid="os-event-sync-local">
            <span className={cn("flex-1", muted)}>Not in your Google Calendar.</span>
            <button type="button" className={btn} onClick={() => resolve("push")} disabled={busy}><CalendarCheck size={14} aria-hidden="true" />Add to my Google Calendar</button>
          </div>
        )}
        <Field label="Title">{(id) => <input id={id} className={input} value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} data-testid="os-event-title" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">{(id) => <Select id={id} value={f.category} onChange={(v) => set("category", v)} options={CATEGORIES} />}</Field>
          <Field label="Company">{(id) => event ? <input id={id} className={input} value={f.company} disabled /> : <CompanySelect id={id} value={f.company} onChange={(v) => { set("company", v); set("project", ""); set("task", ""); }} />}</Field>
          <Field label="Division">{(id) => <DivisionSelect id={id} value={f.division} onChange={(v) => set("division", v)} />}</Field>
          <Field label="Sensitivity">{(id) => <Select id={id} value={f.sensitivity} onChange={(v) => set("sensitivity", v)} options={SENSITIVITIES} />}</Field>
        </div>
        <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.allDay} onChange={(e) => set("allDay", e.target.checked)} />All day</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">{(id) => <div className="flex gap-2"><input id={id} type="date" className={input} value={f.startDate} onChange={(e) => { const v = e.target.value; setF((x) => ({ ...x, startDate: v, endDate: x.endDate < v ? v : x.endDate })); }} data-testid="os-event-start-date" />{!f.allDay && <input type="time" aria-label="Start time" className={cn(input, "w-32")} value={f.startTime} onChange={(e) => set("startTime", e.target.value)} data-testid="os-event-start-time" />}</div>}</Field>
          <Field label="Ends">{(id) => <div className="flex gap-2"><input id={id} type="date" className={input} value={f.endDate} min={f.startDate} onChange={(e) => set("endDate", e.target.value)} data-testid="os-event-end-date" />{!f.allDay && <input type="time" aria-label="End time" className={cn(input, "w-32")} value={f.endTime} onChange={(e) => set("endTime", e.target.value)} data-testid="os-event-end-time" />}</div>}</Field>
        </div>
        <p className={cn("-mt-2 text-xs", muted)}>Times are in {tz.replace("_", " ")}.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">{(id) => <input id={id} className={input} value={f.location} onChange={(e) => set("location", e.target.value)} maxLength={300} />}</Field>
          <Field label="Meeting link">{(id) => <input id={id} className={input} value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://meet.google.com/…" inputMode="url" maxLength={500} />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Project">{(id) => <Select id={id} value={f.project} onChange={(v) => { set("project", v); set("task", ""); }} placeholder="None" options={projects.map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} />}</Field>
          <Field label="Task">{(id) => <Select id={id} value={f.task} onChange={(v) => set("task", v)} placeholder="None" options={tasks.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))} />}</Field>
          <Field label="Milestone">{(id) => <Select id={id} value={f.milestone} onChange={(v) => set("milestone", v)} placeholder="None" options={milestones.map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))} />}</Field>
        </div>
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-[#3A4B60]">Attendees</legend>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-[#E6E9EE] p-2 sm:grid-cols-2" data-testid="os-event-attendees">
            {staff.map((p) => (
              <label key={p.id} className="flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={attendees.includes(p.id)} onChange={(e) => setAttendees((a) => (e.target.checked ? [...a, p.id] : a.filter((x) => x !== p.id)))} />
                {p.short_name ? `${p.short_name} (${p.full_name})` : p.full_name}
              </label>
            ))}
            {!staff.length && <p className={cn("text-xs", muted)}>No one to invite yet.</p>}
          </div>
          <p className={cn("mt-1 text-xs", muted)}>Only people who work in this company can be invited. Inviting someone shows them the event in Company OS.</p>
        </fieldset>
        <Field label="Notes">{(id) => <textarea id={id} rows={3} className={input} value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />}</Field>
        {event && <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.cancelled} onChange={(e) => set("cancelled", e.target.checked)} />Cancelled</label>}
        {!event && google?.connected && (
          <label className="flex min-h-10 items-center gap-2 text-sm" data-testid="os-event-add-google"><input type="checkbox" className="h-4 w-4" checked={addToGoogle} onChange={(e) => setAddToGoogle(e.target.checked)} />Also add to my Google Calendar ({google.email})</label>
        )}
        {event?.google_event_id && !syncedByOther && (
          <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={removeFromGoogle} onChange={(e) => setRemoveFromGoogle(e.target.checked)} />If I delete this event, remove it from my Google Calendar too</label>
        )}
        {event && <p className={cn("text-xs", muted)}><Badge>{event.category}</Badge> Created by {dir?.peopleById.get(event.created_by ?? "")?.full_name ?? event.created_by ?? "—"}</p>}
      </div>
    </Sheet>
  );
}
