"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { useDefaultCompany } from "@/components/os/pickers";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Loading, PageTitle, Select, StatusBadge, btnGhost, btnPrimary, muted, panel } from "@/components/os/ui";
import { KR_STATUSES, OBJECTIVE_STATUSES, SENSITIVITIES, WORKSPACES, companyName, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Objective = { id: string; company_code: string; division_id: string | null; parent_objective_id: string | null; title: string; description: string | null; period: string; owner_person_id: string | null; status: string; sensitivity: string };
type KR = { id: string; objective_id: string; title: string; kpi_id: string | null; owner_person_id: string | null; unit: string | null; start_value: number | null; target_value: number | null; target_status: string; current_value: number | null; status: string };

/** Progress only when a target and a current value exist: no target, no percentage. */
function krProgress(k: KR): number | null {
  if (k.target_value === null || k.current_value === null) return null;
  const start = Number(k.start_value ?? 0), target = Number(k.target_value), cur = Number(k.current_value);
  if (target === start) return null;
  return Math.max(0, Math.min(100, Math.round(((cur - start) / (target - start)) * 100)));
}

export default function OkrsPage() {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const defCompany = useDefaultCompany();
  const year = String(new Date().getFullYear());
  const [period, setPeriod] = useState("");
  const [company, setCompany] = useState("");
  const objs = useQuery<Objective[]>((s) => s.from("os_objectives").select("id, company_code, division_id, parent_objective_id, title, description, period, owner_person_id, status, sensitivity").order("period", { ascending: false }).order("id"), []);
  const krs = useQuery<KR[]>((s) => s.from("os_key_results").select("id, objective_id, title, kpi_id, owner_person_id, unit, start_value, target_value, target_status, current_value, status").order("id"), []);
  const kpis = useQuery<{ id: string; name: string }[]>((s) => s.from("os_kpis").select("id, name").order("id"), []);
  const [newObj, setNewObj] = useState<Partial<Objective> | null>(null);
  const [editObj, setEditObj] = useState<Objective | null>(null);
  const [newKr, setNewKr] = useState<string | null>(null);
  const [editKr, setEditKr] = useState<KR | null>(null);

  const all = objs.data ?? [];
  const periods = Array.from(new Set(all.map((o) => o.period))).sort().reverse();
  const shown = all.filter((o) => (!period || o.period === period) && (!company || o.company_code === company));
  const byId = new Map(all.map((o) => [o.id, o]));
  const tops = shown.filter((o) => !o.parent_objective_id || !shown.some((p) => p.id === o.parent_objective_id));
  const children = (id: string) => shown.filter((o) => o.parent_objective_id === id);
  const reload = () => { objs.reload(); krs.reload(); };

  const renderObjective = (o: Objective, depth: number): React.ReactNode => {
    const list = (krs.data ?? []).filter((k) => k.objective_id === o.id);
    const prog = list.map(krProgress).filter((x): x is number => x !== null);
    const parent = o.parent_objective_id ? byId.get(o.parent_objective_id) : null;
    return (
      <li key={o.id} className={cn(depth > 0 && "ml-3 border-l border-[#E6E9EE] pl-3 md:ml-6 md:pl-4")}>
        <section className={cn(panel, "p-4")} data-testid="os-objective">
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs", muted)}>{o.id} · {companyName(o.company_code)}{o.division_id ? ` · ${dir?.divisionById.get(o.division_id)?.name ?? o.division_id}` : ""} · {o.period}</p>
              <h2 className="mt-0.5 font-semibold">{o.title}</h2>
              {parent && depth === 0 && <p className={cn("mt-0.5 flex items-center gap-1 text-xs", muted)}><ChevronRight size={12} aria-hidden="true" />Supports {parent.id}: {parent.title}</p>}
              {o.description && <p className="mt-1 text-sm text-[#3A4B60]">{o.description}</p>}
            </div>
            <StatusBadge value={o.status} />
            <button type="button" className={btnGhost} onClick={() => setEditObj(o)}>Edit</button>
          </div>
          <p className={cn("mt-1 text-xs", muted)}>Owner: {personLabel(people, o.owner_person_id)}{prog.length ? ` · Average key-result progress ${Math.round(prog.reduce((a, b) => a + b, 0) / prog.length)}% (${prog.length} of ${list.length} with targets)` : ""}</p>
          <ul className="mt-3 divide-y divide-[#F0F2F5] rounded-lg border border-[#E6E9EE]">
            {list.map((k) => { const p = krProgress(k); return (
              <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <button type="button" className="min-w-0 flex-1 text-left hover:underline" onClick={() => setEditKr(k)}>{k.title}</button>
                <span className="text-xs text-[#66768A]">{personLabel(people, k.owner_person_id)}</span>
                <span className="text-xs tabular-nums sm:w-44">{k.target_value === null ? <span className={muted}>{k.target_status}</span> : <>{k.current_value ?? "—"} / {k.target_value}{k.unit ? ` ${k.unit}` : ""}{p !== null && <span className={muted}> · {p}%</span>}</>}</span>
                <StatusBadge value={k.status} />
              </li>); })}
            {!list.length && <li className={cn("px-3 py-2 text-sm", muted)}>No key results yet.</li>}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={() => setNewKr(o.id)}><Plus size={14} aria-hidden="true" />Key result</button>
            <button type="button" className={btnGhost} onClick={() => setNewObj({ company_code: o.company_code, parent_objective_id: o.id, period: o.period })}><Plus size={14} aria-hidden="true" />Aligned objective</button>
          </div>
        </section>
        {!!children(o.id).length && <ul className="mt-3 space-y-3">{children(o.id).map((c) => renderObjective(c, depth + 1))}</ul>}
      </li>
    );
  };

  const objFields = [
    { key: "title", label: "Objective", required: true }, { key: "description", label: "Description", kind: "textarea" as const },
    { key: "period", label: "Period", required: true, hint: "A year (2027), quarter (2027-Q1) or half (2027-H1)." },
    { key: "division_id", label: "Division", kind: "division" as const, hint: "Leave empty for a company objective." },
    { key: "owner_person_id", label: "Owner", kind: "person" as const }, { key: "status", label: "Status", kind: "select" as const, options: OBJECTIVE_STATUSES, required: true },
    { key: "parent_objective_id", label: "Supports objective", kind: "select" as const, options: all.filter((o) => o.id !== editObj?.id).map((o) => ({ value: o.id, label: `${o.id} · ${o.title}` })) },
    { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: SENSITIVITIES, required: true },
  ];
  const krFields = [
    { key: "title", label: "Key result", required: true }, { key: "owner_person_id", label: "Owner", kind: "person" as const },
    { key: "kpi_id", label: "Measured by KPI", kind: "select" as const, options: (kpis.data ?? []).map((k) => ({ value: k.id, label: `${k.id} · ${k.name}` })) },
    { key: "unit", label: "Unit" }, { key: "start_value", label: "Start value" },
    { key: "target_value", label: "Target value", hint: "Leave empty until a target is agreed." },
    { key: "target_status", label: "Target status", kind: "select" as const, options: ["No approved target", "Proposed — awaiting approval", "Approved"], required: true },
    { key: "current_value", label: "Current value" }, { key: "status", label: "Status", kind: "select" as const, options: KR_STATUSES, required: true },
  ];

  return (
    <div>
      <PageTitle title="OKRs" description="Company and division objectives with key results. Progress shows only where a target has been set."
        actions={<button type="button" className={btnPrimary} onClick={() => setNewObj({ company_code: defCompany, period: year })} data-testid="os-new-objective"><Plus size={16} aria-hidden="true" />Objective</button>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex">
        <Select ariaLabel="Period" value={period} onChange={setPeriod} options={periods} placeholder="All periods" className="md:w-36" />
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-40" />
      </div>
      <ErrorLine message={objs.error} />
      {objs.loading && !objs.data ? <Loading /> : tops.length ? <ul className="space-y-4">{tops.map((o) => renderObjective(o, 0))}</ul>
        : <Empty title={all.length ? "No objectives match" : "No objectives yet"} body={all.length ? "Clear the filters." : "Set a company objective first, then align division objectives under it. Key results can be measured by a KPI."}
            action={<button type="button" className={btnPrimary} onClick={() => setNewObj({ company_code: defCompany, period: year })}>New objective</button>} />}
      <RecordSheet open={!!newObj || !!editObj} title={editObj ? `Objective ${editObj.id}` : "New objective"} table="os_objectives" record={editObj}
        defaults={editObj ? undefined : { company_code: newObj?.company_code ?? defCompany, period: newObj?.period ?? year, parent_objective_id: newObj?.parent_objective_id ?? "", status: "Draft" }}
        fields={objFields} onClose={() => { setNewObj(null); setEditObj(null); }} onSaved={() => { setNewObj(null); setEditObj(null); reload(); }} />
      <RecordSheet open={!!newKr || !!editKr} title={editKr ? `Key result ${editKr.id}` : "New key result"} table="os_key_results" record={editKr}
        defaults={editKr ? undefined : { objective_id: newKr, status: "Not started", target_status: "No approved target" }}
        fields={krFields} onClose={() => { setNewKr(null); setEditKr(null); }} onSaved={() => { setNewKr(null); setEditKr(null); reload(); }} />
    </div>
  );
}
