"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Diamond } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import Link from "next/link";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { ErrorLine, KeyValue, Loading, PageTitle, Select, Sheet, StatusBadge, Tabs, btn, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { TIMELINE_STATUSES, WORKSPACES, fmtDate, relativeDue, todayJakarta } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Item = {
  id: string; company_code: string; workstream_code: string | null; workstream_name: string | null; title: string; deliverable: string | null;
  owner_person_id: string | null; owner_name: string | null; lead_division: string | null; supporting_divisions: string | null; dependencies: string | null;
  planned_start: string | null; due_date: string | null; status: string; decision_gate: string | null; budget_dependency: string | null; evidence: string | null;
  risk: string | null; related_event: string | null; linked_refs: string | null; is_major: boolean; planning_label: string | null; lead_division_id: string | null; project_id: string | null;
};
const COLS = "id, company_code, workstream_code, workstream_name, title, deliverable, owner_person_id, owner_name, lead_division, supporting_divisions, dependencies, planned_start, due_date, status, decision_gate, budget_dependency, evidence, risk, related_event, linked_refs, is_major, planning_label, lead_division_id, project_id";
const MONTH = (iso: string) => iso.slice(0, 7);
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
const dayNum = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);
const BAR: Record<string, string> = { Done: "bg-[#9DC3A8]", "In progress": "bg-[#7FA3B8]", Blocked: "bg-[#E2A3A4]", Deferred: "bg-[#D5D9DF]", Cancelled: "bg-[#E6E9EE]", "Not started": "bg-[#B8C4D2]" };

export default function TimelinePage() {
  const params = useSearchParams();
  const view = params.get("view") === "month" ? "month" : params.get("view") === "list" ? "list" : "year";
  const items = useQuery<Item[]>((s) => s.from("os_timeline_items").select(COLS).order("due_date", { nullsFirst: false }), []);
  const [ws, setWs] = useState("");
  const [status, setStatus] = useState("");
  const [majorOnly, setMajorOnly] = useState(false);
  const [company, setCompany] = useState(params.get("c") ?? "");
  const [division, setDivision] = useState("");
  const [project, setProject] = useState(params.get("p") ?? "");
  const dir = useDirectory();
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name").order("name").limit(300), []);
  const [open, setOpen] = useState<string | null>(params.get("focus"));
  const all = useMemo(() => items.data ?? [], [items.data]);
  const streams = useMemo(() => Array.from(new Map(all.filter((i) => i.workstream_code).map((i) => [i.workstream_code!, i.workstream_name ?? ""])).entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })), [all]);
  const rows = all.filter((i) => (!ws || i.workstream_code === ws) && (!status || i.status === status) && (!majorOnly || i.is_major)
    && (!company || i.company_code === company) && (!division || i.lead_division_id === division) && (!project || i.project_id === project));
  const months = useMemo(() => {
    const ds = all.flatMap((i) => [i.planned_start, i.due_date]).filter(Boolean) as string[];
    if (!ds.length) return [] as string[];
    const [a, b] = [ds.reduce((x, y) => (x < y ? x : y)), ds.reduce((x, y) => (x > y ? x : y))];
    const out: string[] = []; let y = Number(a.slice(0, 4)), m = Number(a.slice(5, 7));
    while (`${y}-${String(m).padStart(2, "0")}` <= MONTH(b)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
    return out;
  }, [all]);
  const [month, setMonth] = useState(MONTH(todayJakarta()));
  const selected = all.find((i) => i.id === open) ?? null;

  return (
    <div>
      <PageTitle title="Master Timeline" description="Migrated from the Operations Master with its TL IDs. Dates marked PROPOSED stay proposed until confirmed." />
      <Tabs label="Timeline views" current={view} hrefFor={(k) => `/os/timeline${k === "year" ? "" : `?view=${k}`}`}
        tabs={[{ key: "year", label: "Annual" }, { key: "month", label: "Monthly" }, { key: "list", label: "List" }]} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <Select ariaLabel="Workstream" value={ws} onChange={setWs} options={streams.map(([c, n]) => ({ value: c, label: `${c} ${n}` }))} placeholder="All workstreams" className="col-span-2 md:w-72" />
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={TIMELINE_STATUSES} placeholder="Any status" className="md:w-36" />
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="Company-wide" className="md:w-36" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} placeholder="All divisions" className="md:w-44" />
        <Select ariaLabel="Project" value={project} onChange={setProject} options={(projects.data ?? []).map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` }))} placeholder="All projects" className="col-span-2 md:w-56" />
        {view === "month" && <Select ariaLabel="Month" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: monthLabel(m) }))} className="md:w-32" />}
        <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={majorOnly} onChange={(e) => setMajorOnly(e.target.checked)} />Major milestones only</label>
      </div>
      <ErrorLine message={items.error} />
      {items.loading && !items.data ? <Loading /> : !all.length ? <p className={cn("text-sm", muted)}>No timeline items you can see.</p>
        : view === "year" ? <YearView rows={rows} months={months} streams={streams.filter(([c]) => !ws || c === ws)} onOpen={setOpen} />
        : view === "month" ? <MonthView rows={rows.filter((i) => (i.due_date && MONTH(i.due_date) === month) || (i.planned_start && MONTH(i.planned_start) <= month && i.due_date && MONTH(i.due_date) >= month))} streams={streams} onOpen={setOpen} />
        : <ListView rows={rows} onOpen={setOpen} />}
      {selected && <ItemSheet item={selected} onClose={() => setOpen(null)} onSaved={() => items.reload()} />}
    </div>
  );
}

/** Simple Gantt-style lanes: one lane per workstream, one bar per item from planned start to due date. */
function YearView({ rows, months, streams, onOpen }: { rows: Item[]; months: string[]; streams: [string, string][]; onOpen: (id: string) => void }) {
  if (!months.length) return null;
  const start = dayNum(`${months[0]}-01`);
  const lastM = months[months.length - 1];
  const end = dayNum(`${lastM}-01`) + new Date(Date.UTC(Number(lastM.slice(0, 4)), Number(lastM.slice(5, 7)), 0)).getUTCDate();
  const span = end - start;
  const pct = (iso: string) => ((dayNum(iso) - start) / span) * 100;
  const today = todayJakarta();
  return (
    <div className={cn(panel, "overflow-x-auto")} data-testid="os-timeline-year">
      <div className="min-w-[880px]">
        <div className="sticky top-0 flex border-b border-[#E6E9EE] bg-[#FAFBFC] text-xs text-[#66768A]">
          <div className="w-44 shrink-0 px-3 py-2 font-medium">Workstream</div>
          <div className="relative flex flex-1">{months.map((m) => <div key={m} className="flex-1 border-l border-[#EEF1F5] px-1.5 py-2">{monthLabel(m)}</div>)}</div>
        </div>
        {streams.map(([code, name]) => {
          const lane = rows.filter((i) => i.workstream_code === code && i.due_date);
          if (!lane.length) return null;
          return (
            <div key={code} className="flex border-b border-[#F0F2F5] last:border-0">
              <div className="w-44 shrink-0 px-3 py-2 text-xs"><p className="font-semibold text-[#1F2D3D]">{code}</p><p className={cn("line-clamp-2", muted)}>{name}</p></div>
              <div className="relative flex-1 py-1.5">
                {months.map((m, i) => <div key={m} className="absolute inset-y-0 border-l border-[#F3F5F8]" style={{ left: `${(i / months.length) * 100}%` }} aria-hidden="true" />)}
                {today >= `${months[0]}-01` && <div className="absolute inset-y-0 w-px bg-[#A12D2F]/50" style={{ left: `${pct(today)}%` }} aria-hidden="true" />}
                <ul className="relative space-y-1">
                  {lane.map((i) => {
                    const s = i.planned_start && i.planned_start <= i.due_date! ? i.planned_start : i.due_date!;
                    const left = pct(s), width = Math.max(pct(i.due_date!) - left + 100 / span, 0.6);
                    return (
                      <li key={i.id} className="relative h-6">
                        <button type="button" onClick={() => onOpen(i.id)} title={`${i.id} ${i.title} · ${fmtDate(s)} – ${fmtDate(i.due_date)}`}
                          className={cn("absolute top-0 flex h-6 min-w-6 items-center gap-1 overflow-hidden rounded px-1.5 text-left text-[11px] font-medium text-[#1F2D3D] hover:ring-2 hover:ring-[#577E90]", BAR[i.status] ?? BAR["Not started"])}
                          style={{ left: `${left}%`, width: `${width}%` }}>
                          {i.is_major && <Diamond size={10} className="shrink-0" aria-label="Major milestone" />}
                          <span className="truncate">{i.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <p className={cn("border-t border-[#E6E9EE] px-3 py-2 text-xs", muted)}>Bars run from planned start to due date. The red line is today. Select a bar for details.</p>
    </div>
  );
}

function MonthView({ rows, streams, onOpen }: { rows: Item[]; streams: [string, string][]; onOpen: (id: string) => void }) {
  if (!rows.length) return <p className={cn("text-sm", muted)}>Nothing planned or due in this month.</p>;
  return (
    <div className="space-y-4" data-testid="os-timeline-month">
      {streams.map(([code, name]) => {
        const lane = rows.filter((i) => i.workstream_code === code);
        if (!lane.length) return null;
        return (
          <section key={code}>
            <h2 className="mb-1.5 text-sm font-semibold">{code} <span className={cn("font-normal", muted)}>{name}</span></h2>
            <ListView rows={lane} onOpen={onOpen} />
          </section>
        );
      })}
    </div>
  );
}

function ListView({ rows, onOpen }: { rows: Item[]; onOpen: (id: string) => void }) {
  return (
    <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-timeline-list">
      {rows.map((i) => { const r = i.status !== "Done" && i.status !== "Cancelled" ? relativeDue(i.due_date) : null; return (
        <li key={i.id}>
          <button type="button" onClick={() => onOpen(i.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm hover:bg-[#FAFBFC]">
            <span className="w-14 shrink-0 text-xs text-[#66768A]">{i.id}</span>
            <span className="min-w-0 flex-1">{i.is_major && <Diamond size={11} className="mr-1 inline" aria-label="Major milestone" />}{i.title}</span>
            <span className="text-xs text-[#66768A]">{i.owner_name ?? "—"}</span>
            <span className={cn("w-24 text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.overdue ? r.label : fmtDate(i.due_date)}</span>
            <StatusBadge value={i.status} />
          </button>
        </li>); })}
      {!rows.length && <li className={cn("px-3 py-3 text-sm", muted)}>No items match.</li>}
    </ul>
  );
}

function ItemSheet({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const { supabase } = useOsMe();
  const [st, setSt] = useState(item.status);
  const [due, setDue] = useState(item.due_date ?? "");
  const [evidence, setEvidence] = useState(item.evidence ?? "");
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    const { data, error } = await supabase.from("os_timeline_items").update({ status: st, due_date: due || null, evidence: evidence || null }).eq("id", item.id).select("id").maybeSingle();
    if (error || !data) return setErr(error ? friendlyError(error.message) : "Only founders and the lead division's manager can change timeline items.");
    onSaved(); onClose();
  }
  return (
    <Sheet open onClose={onClose} title={`${item.id} ${item.title}`} wide
      footer={<><button type="button" className={btn} onClick={onClose}>Close</button><button type="button" className={btnPrimary} onClick={save}>Save</button></>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        <Link href={`/os/timeline/${item.id}`} className={cn(btn, "w-fit")} data-testid="os-timeline-open">Open the milestone page: dependencies, tasks, events, documents</Link>
        {item.planning_label && <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs text-[#865400]">{item.planning_label}</p>}
        <KeyValue items={[
          { label: "Workstream", value: `${item.workstream_code ?? ""} ${item.workstream_name ?? ""}` }, { label: "Owner", value: item.owner_name ?? item.owner_person_id ?? "—" },
          { label: "Lead division", value: item.lead_division ?? "—" }, { label: "Supporting", value: item.supporting_divisions ?? "—" },
          { label: "Planned start", value: fmtDate(item.planned_start) }, { label: "Due", value: fmtDate(item.due_date) },
          { label: "Deliverable", value: item.deliverable ?? "—" }, { label: "Dependencies", value: item.dependencies ?? "—" },
          { label: "Decision gate", value: item.decision_gate ?? "—" }, { label: "Budget", value: item.budget_dependency ?? "—" },
          { label: "Risk", value: item.risk ?? "—" }, { label: "Related", value: [item.related_event, item.linked_refs].filter(Boolean).join(" · ") || "—" },
        ]} />
        <div className="grid gap-3 border-t border-[#E6E9EE] pt-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-[#3A4B60]">Status<Select value={st} onChange={setSt} options={TIMELINE_STATUSES} className="mt-1" /></label>
          <label className="text-xs font-medium text-[#3A4B60]">Due date<input type="date" className={cn(input, "mt-1")} value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="text-xs font-medium text-[#3A4B60] sm:col-span-2">Evidence of completion<textarea rows={2} className={cn(input, "mt-1")} value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
        </div>
      </div>
    </Sheet>
  );
}
