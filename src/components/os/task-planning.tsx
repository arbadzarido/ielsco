"use client";

// A task's planning: start date, an optional work block on the calendar, pinning its deadline to the calendar, the
// milestone it serves, and the tasks it depends on. A deadline is not a calendar event: only a work block or an
// explicit pin puts a task on the calendar, and neither creates an event.
import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useOsMe } from "./OsProvider";
import { friendlyError, useQuery } from "./data";
import { ErrorLine, Select, StatusBadge, btn, btnGhost, input, muted, panel } from "./ui";
import { DEFAULT_TZ, zonedInstant, zonedParts } from "@/lib/os/calendar";
import { fmtDate } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Plan = { id: string; company_code: string; due_date: string | null; start_date: string | null; scheduled_start: string | null; scheduled_end: string | null; on_calendar: boolean; timeline_item_id: string | null };
type Mini = { id: string; title: string; status: string; due_date: string | null };

export function TaskPlanning({ id, onChanged }: { id: string; onChanged?: () => void }) {
  const { supabase } = useOsMe();
  const plan = useQuery<Plan | null>((s) => s.from("os_tasks").select("id, company_code, due_date, start_date, scheduled_start, scheduled_end, on_calendar, timeline_item_id").eq("id", id).maybeSingle(), [id]);
  const deps = useQuery<{ before: Mini[]; after: Mini[] }>(async (s) => {
    const [a, b] = await Promise.all([
      s.from("os_task_dependencies").select("os_tasks!os_task_dependencies_depends_on_task_id_fkey(id, title, status, due_date)").eq("task_id", id),
      s.from("os_task_dependencies").select("os_tasks!os_task_dependencies_task_id_fkey(id, title, status, due_date)").eq("depends_on_task_id", id),
    ]);
    const pick = (rows: unknown[] | null) => (rows ?? []).map((r) => (r as { os_tasks: Mini | null }).os_tasks).filter(Boolean) as Mini[];
    return { data: { before: pick(a.data), after: pick(b.data) }, error: a.error ?? b.error };
  }, [id]);
  const company = plan.data?.company_code;
  const options = useQuery<{ tasks: Mini[]; milestones: { id: string; title: string; due_date: string | null; is_major: boolean }[] }>(async (s) => {
    if (!company) return { data: { tasks: [], milestones: [] }, error: null };
    const [t, m] = await Promise.all([
      s.from("os_tasks").select("id, title, status, due_date").eq("company_code", company).neq("id", id).not("status", "in", "(Cancelled)").order("due_date", { nullsFirst: false }).limit(300),
      s.from("os_timeline_items").select("id, title, due_date, is_major").not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(300),
    ]);
    return { data: { tasks: (t.data ?? []) as Mini[], milestones: (m.data ?? []) as never }, error: null };
  }, [company, id]);
  const [f, setF] = useState({ start: "", day: "", from: "09:00", to: "11:00" });
  const [pick, setPick] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    const p = plan.data;
    if (!p) return;
    const s = p.scheduled_start ? zonedParts(p.scheduled_start, DEFAULT_TZ) : null, e = p.scheduled_end ? zonedParts(p.scheduled_end, DEFAULT_TZ) : null;
    setF({ start: p.start_date ?? "", day: s?.date ?? "", from: s?.time ?? "09:00", to: e?.time ?? "11:00" });
  }, [plan.data]);

  if (!plan.data) return null;
  const p = plan.data;
  async function update(patch: Record<string, unknown>, msg: string) {
    setErr(null); setSaved(null);
    const { data, error } = await supabase.from("os_tasks").update(patch).eq("id", id).select("id").maybeSingle();
    if (error || !data) return setErr(error ? friendlyError(error.message) : "You can't change this task.");
    setSaved(msg); plan.reload(); onChanged?.();
  }
  const schedule = () => {
    if (!f.day) return setErr("Choose the day for the work block.");
    const s = zonedInstant(f.day, f.from, DEFAULT_TZ), e = zonedInstant(f.day, f.to, DEFAULT_TZ);
    if (Date.parse(e) <= Date.parse(s)) return setErr("The work block ends before it starts.");
    update({ scheduled_start: s, scheduled_end: e }, "Work block saved. It shows on the calendar; the deadline is unchanged.");
  };
  async function addDep() {
    if (!pick) return;
    const { error } = await supabase.from("os_task_dependencies").insert({ task_id: id, depends_on_task_id: pick });
    if (error) setErr(error.message.includes("cycle") ? "That would make the tasks wait for each other in a loop." : friendlyError(error.message)); else { setPick(""); deps.reload(); }
  }
  async function dropDep(dep: string) {
    const { error } = await supabase.from("os_task_dependencies").delete().eq("task_id", id).eq("depends_on_task_id", dep);
    if (error) setErr(friendlyError(error.message)); else deps.reload();
  }
  const before = deps.data?.before ?? [], after = deps.data?.after ?? [];
  const waiting = before.filter((d) => d.status !== "Done");
  const milestone = options.data?.milestones.find((m) => m.id === p.timeline_item_id);
  return (
    <section className={cn(panel, "space-y-4 p-4")} data-testid="os-task-planning">
      <h2 className="text-sm font-semibold">Planning</h2>
      <ErrorLine message={err} />
      {saved && <p role="status" className={cn("text-xs", muted)}>{saved}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#3A4B60]">Start date
          <input type="date" className={cn(input, "mt-1")} value={f.start} max={p.due_date ?? undefined} onChange={(e) => setF((x) => ({ ...x, start: e.target.value }))} onBlur={() => f.start !== (p.start_date ?? "") && update({ start_date: f.start || null }, "Start date saved.")} data-testid="os-task-start" />
        </label>
        <div className="text-xs font-medium text-[#3A4B60]">Deadline<p className="mt-2 text-sm font-normal">{fmtDate(p.due_date)}</p></div>
      </div>
      <fieldset className="rounded-lg border border-[#E6E9EE] p-3">
        <legend className="px-1 text-xs font-medium text-[#3A4B60]">Work block on the calendar</legend>
        <div className="flex flex-wrap gap-2">
          <input type="date" aria-label="Work day" className={cn(input, "w-40")} value={f.day} onChange={(e) => setF((x) => ({ ...x, day: e.target.value }))} data-testid="os-task-block-day" />
          <input type="time" aria-label="From" className={cn(input, "w-28")} value={f.from} onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))} />
          <input type="time" aria-label="To" className={cn(input, "w-28")} value={f.to} onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={schedule} data-testid="os-task-block-save">{p.scheduled_start ? "Move work block" : "Block time"}</button>
          {p.scheduled_start && <button type="button" className={btnGhost} onClick={() => update({ scheduled_start: null, scheduled_end: null }, "Work block removed.")}>Remove</button>}
        </div>
        <p className={cn("mt-1 text-xs", muted)}>Time set aside to do the task. It&apos;s not a meeting and invites no one.</p>
      </fieldset>
      <label className="flex min-h-10 items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={p.on_calendar} onChange={(e) => update({ on_calendar: e.target.checked }, e.target.checked ? "The deadline now shows on the calendar." : "The deadline no longer shows on the calendar.")} data-testid="os-task-pin" />
        <span>Show the deadline on the calendar<span className={cn("block text-xs", muted)}>Off by default: deadlines live on the task. Everyone can still turn on their own deadlines as a calendar layer.</span></span></label>
      <div>
        <p className="mb-1 text-xs font-medium text-[#3A4B60]">Timeline milestone</p>
        <Select ariaLabel="Timeline milestone" value={p.timeline_item_id ?? ""} onChange={(v) => update({ timeline_item_id: v || null }, v ? "Linked to the milestone." : "Unlinked from the milestone.")} placeholder="None"
          options={(options.data?.milestones ?? []).map((m) => ({ value: m.id, label: `${m.is_major ? "◆ " : ""}${m.id} · ${m.title}` }))} />
        {milestone && <p className={cn("mt-1 text-xs", muted)}><Link className="underline" href={`/os/timeline/${milestone.id}`}>{milestone.title}</Link>, due {fmtDate(milestone.due_date)}{milestone.due_date && p.due_date && p.due_date > milestone.due_date ? ". This task is due after the milestone." : ""}</p>}
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-[#3A4B60]">Waits for</p>
        {waiting.length > 0 && <p className="mb-1 text-xs text-[#865400]">{waiting.length} prerequisite{waiting.length === 1 ? " isn't" : "s aren't"} done yet.</p>}
        <ul className="divide-y divide-[#F0F2F5] rounded-lg border border-[#E6E9EE] text-sm" data-testid="os-task-deps">
          {before.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-2 py-1.5"><Link href={`/os/tasks/${d.id}`} className="min-w-0 flex-1 truncate hover:underline">{d.title}</Link><StatusBadge value={d.status} />
              <button type="button" className={btnGhost} aria-label={`Remove dependency on ${d.id}`} onClick={() => dropDep(d.id)}><X size={14} aria-hidden="true" /></button></li>
          ))}
          {!before.length && <li className={cn("px-2 py-1.5 text-xs", muted)}>Nothing.</li>}
        </ul>
        <div className="mt-2 flex gap-2">
          <Select ariaLabel="Add a prerequisite task" value={pick} onChange={setPick} placeholder="Add a task it waits for…" options={(options.data?.tasks ?? []).filter((t) => !before.some((b) => b.id === t.id)).map((t) => ({ value: t.id, label: `${t.id} · ${t.title}` }))} />
          <button type="button" className={btn} onClick={addDep} disabled={!pick}>Add</button>
        </div>
        {after.length > 0 && <p className={cn("mt-2 text-xs", muted)}>Needed for: {after.map((a, i) => <span key={a.id}>{i ? ", " : ""}<Link className="underline" href={`/os/tasks/${a.id}`}>{a.title}</Link></span>)}</p>}
      </div>
    </section>
  );
}
