"use client";

// A person's workload for the next two weeks: scheduled hours per day (meetings and work blocks), open task deadlines
// and clashes. Read through os_busy, which only covers people who share a company with the viewer and shows "Busy"
// instead of the title of anything the viewer can't see, so nothing private leaks.
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useOsMe } from "./OsProvider";
import { muted, panel } from "./ui";
import { busyBlocks, type BusyBlock, type BusyRow } from "@/lib/os/conflicts";
import { DEFAULT_TZ, addDays, weekday, zonedInstant, zonedParts } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

/** Hours per civil day and overlapping pairs, from busy blocks. Pure (exported for tests). */
export function workload(blocks: BusyBlock[], days: string[], tz = DEFAULT_TZ) {
  const timed = blocks.filter((b) => !b.all_day).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const hours = new Map(days.map((d) => [d, 0]));
  for (const b of timed) { const d = zonedParts(b.starts_at, tz).date; if (hours.has(d)) hours.set(d, hours.get(d)! + (Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 3600000); }
  const clashes: [BusyBlock, BusyBlock][] = [];
  for (let i = 0; i < timed.length; i++) for (let j = i + 1; j < timed.length && timed[j].starts_at < timed[i].ends_at; j++) if (!(timed[i].ref_id && timed[i].ref_id === timed[j].ref_id)) clashes.push([timed[i], timed[j]]);
  return { hours, clashes };
}

export function PersonWorkload({ personId }: { personId: string }) {
  const { supabase } = useOsMe();
  const today = zonedParts(new Date(), DEFAULT_TZ).date;
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const [blocks, setBlocks] = useState<BusyBlock[] | null>(null);
  const [due, setDue] = useState<{ due_date: string }[]>([]);
  useEffect(() => {
    const from = zonedInstant(today, "00:00"), to = zonedInstant(addDays(today, 14), "00:00");
    supabase.rpc("os_busy", { p_people: [personId], p_from: from, p_to: to }).then(({ data }) => setBlocks(busyBlocks((data ?? []) as BusyRow[], from, to)));
    supabase.from("os_tasks").select("due_date").eq("owner_person_id", personId).gte("due_date", today).lte("due_date", addDays(today, 13)).not("status", "in", "(Done,Cancelled)").limit(200)
      .then(({ data }) => setDue((data ?? []) as { due_date: string }[]));
  }, [supabase, personId, today]);
  if (!blocks) return null;
  const { hours, clashes } = workload(blocks, days);
  const dueBy = new Map<string, number>();
  for (const d of due) dueBy.set(d.due_date, (dueBy.get(d.due_date) ?? 0) + 1);
  const max = Math.max(8, ...hours.values());
  return (
    <section className={cn(panel, "p-4")} data-testid="os-person-workload">
      <h2 className="text-sm font-semibold">Next two weeks</h2>
      <p className={cn("mb-3 text-xs", muted)}>Scheduled hours (meetings and work blocks) and task deadlines per day. Items you can&apos;t open show as Busy.</p>
      <div className="grid grid-cols-7 gap-1" role="table" aria-label="Scheduled hours per day">
        {days.map((d) => {
          const h = hours.get(d) ?? 0, n = dueBy.get(d) ?? 0, wkend = [0, 6].includes(weekday(d));
          return (
            <div key={d} role="cell" className={cn("rounded-md border border-[#E6E9EE] p-1 text-center", wkend && "bg-[#F7F9FB]", d === today && "border-[#2E7D4F]")} title={`${d}: ${h.toFixed(1)} h scheduled, ${n} deadline${n === 1 ? "" : "s"}`}>
              <p className="text-[10px] text-[#66768A]">{new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" })}</p>
              <div className="mx-auto mt-1 flex h-10 w-3 items-end overflow-hidden rounded-sm bg-[#F0F2F5]" aria-hidden="true"><div className={cn("w-full", h > 6 ? "bg-[#B4590B]" : "bg-[#2457A6]")} style={{ height: `${(h / max) * 100}%` }} /></div>
              <p className="mt-0.5 text-[11px] font-medium">{h ? `${Math.round(h * 10) / 10}h` : "–"}</p>
              {n > 0 && <p className="text-[10px] text-[#A12D2F]">{n} due</p>}
            </div>
          );
        })}
      </div>
      {clashes.length > 0 && (
        <div className="mt-3 rounded-lg border border-[#F1D5A6] bg-[#FDF8EE] p-2 text-xs" role="status">
          <p className="flex items-center gap-1 font-medium text-[#865400]"><AlertTriangle size={12} aria-hidden="true" />{clashes.length} clash{clashes.length === 1 ? "" : "es"}</p>
          <ul className="mt-1 space-y-0.5">{clashes.slice(0, 5).map(([a, b]) => <li key={`${a.ref_id}${a.starts_at}${b.ref_id}`}>{zonedParts(b.starts_at).date} {zonedParts(b.starts_at).time}: {a.title} / {b.title}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
