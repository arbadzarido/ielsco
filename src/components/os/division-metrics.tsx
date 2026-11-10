"use client";

// A division's metrics: the KPIs assigned to it, the latest value someone logged, and a quick way to log this period's.
// Nothing is calculated or filled in here: a metric with no logged value says so, and a target appears only where one
// was approved. Who may add, assign or log is decided by the database; the buttons only follow it.
import Link from "next/link";
import { useState } from "react";
import { friendlyError, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { CompanySelect, useDefaultCompany } from "./pickers";
import { Empty, ErrorLine, Field, Loading, RowList, Section, Select, Sheet, StatusBadge, btn, btnGhost, btnPrimary, input, muted } from "./ui";
import { companyName, todayJakarta } from "@/lib/os/meta";
import { currentPeriod, metricValue, parseMetricValue } from "@/lib/os/metrics";
import type { MyWorkspace } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

type Kpi = { id: string; company_code: string; name: string; unit: string | null; reporting_period: string | null; target_value: number | null; target_status: string | null;
  owner_person_id: string | null; values_restricted: boolean };
type Val = { kpi_id: string; period_label: string; period_end: string; value: number };
const KPI_COLUMNS = "id, company_code, name, unit, reporting_period, target_value, target_status, owner_person_id, values_restricted";
const PERIODS = ["Weekly", "Monthly", "Quarterly", "Annual"];

export function WorkspaceMetrics({ ws }: { ws: MyWorkspace }) {
  const { me } = useOsMe();
  const kpis = useQuery<Kpi[]>((s) => s.from("os_kpis").select(KPI_COLUMNS).eq("division_id", ws.division_id).order("id"), [ws.division_id]);
  const ids = (kpis.data ?? []).map((k) => k.id);
  const values = useQuery<Val[]>((s) => ids.length
    ? s.from("os_kpi_values").select("kpi_id, period_label, period_end, value").in("kpi_id", ids).order("period_end", { ascending: false }).limit(1000)
    : Promise.resolve({ data: [], error: null }), [ids.join(",")]);
  const latest = new Map<string, Val>();
  (values.data ?? []).forEach((v) => { if (!latest.has(v.kpi_id)) latest.set(v.kpi_id, v); });
  const canManage = me.isAdmin || ws.is_manager;
  const canLog = (k: Kpi) => !k.values_restricted && (me.isAdmin || ws.is_member || k.owner_person_id === me.person.id);
  const [logging, setLogging] = useState<Kpi | null>(null);
  const [adding, setAdding] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const reload = () => { kpis.reload(); values.reload(); };

  return (
    <Section title="Metrics" action={canManage ? (
      <span className="flex gap-2">
        {me.isAdmin && <button type="button" className={btnGhost} onClick={() => setAssigning(true)}>Assign an existing KPI</button>}
        <button type="button" className={btn} onClick={() => setAdding(true)}>Add metric</button>
      </span>
    ) : undefined}>
      <ErrorLine message={kpis.error ?? values.error} />
      <RowList rows={kpis.data ?? []} rowKey={(k) => k.id} rowHref={(k) => `/os/kpis/${k.id}`} testId="os-ws-metrics"
        empty={kpis.data ? <Empty compact title="No metrics for this division yet"
          body={canManage ? "Add a metric, or assign one from the KPI Dictionary. Values appear once someone logs them." : "The division's manager or a founder adds them."} /> : <Loading />}
        columns={[
          { key: "n", label: "Metric", primary: true, className: "w-[36%]", render: (k) => <span className="truncate">{k.name}</span> },
          { key: "c", label: "Company", className: "w-24", hideOnMobile: true, render: (k) => <span className="text-xs text-[#66768A]">{companyName(k.company_code)}</span> },
          { key: "p", label: "Period", className: "w-24", hideOnMobile: true, render: (k) => <span className="text-xs">{k.reporting_period ?? "—"}</span> },
          { key: "v", label: "Latest", className: "w-36", render: (k) => { const l = latest.get(k.id); return k.values_restricted ? <span className={cn("text-xs", muted)}>Restricted</span>
            : l ? <span className="text-xs tabular-nums">{metricValue(l.value, k.unit)} <span className={muted}>({l.period_label})</span></span> : <span className={cn("text-xs", muted)}>Not logged</span>; } },
          { key: "t", label: "Target", className: "w-40", hideOnMobile: true, render: (k) => k.target_value !== null ? <span className="text-xs tabular-nums">{metricValue(k.target_value, k.unit)}</span> : <StatusBadge value={k.target_status ?? "No approved target"} /> },
          { key: "a", label: "", className: "w-28 text-right", render: (k) => canLog(k)
            ? <button type="button" className={cn(btnGhost, "relative z-10 min-h-8 text-xs")} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLogging(k); }}>Log value</button> : null },
        ]} />
      <p className={cn("mt-2 text-xs", muted)}>Open a metric for its definition, history and trend. <Link href="/os/kpis" className="underline">All KPIs</Link></p>
      {logging && <LogValue kpi={logging} onClose={() => setLogging(null)} onSaved={() => { setLogging(null); reload(); }} />}
      {adding && <AddMetric ws={ws} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
      {assigning && <AssignKpi ws={ws} onClose={() => setAssigning(false)} onSaved={() => { setAssigning(false); reload(); }} />}
    </Section>
  );
}

function LogValue({ kpi, onClose, onSaved }: { kpi: Kpi; onClose: () => void; onSaved: () => void }) {
  const { supabase } = useOsMe();
  const start = currentPeriod(kpi.reporting_period, todayJakarta());
  const [f, setF] = useState({ label: start.label, end: start.end, value: "", basis: "", link: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    const n = parseMetricValue(f.value);
    if (n === null) return setErr("Enter the value as a number.");
    if (!f.label.trim() || !f.end) return setErr("Give the period and the date it ends.");
    if (f.link.trim() && !/^https:\/\//i.test(f.link.trim())) return setErr("The evidence link must start with https://");
    setBusy(true); setErr(null);
    const { error } = await supabase.from("os_kpi_values").insert({ kpi_id: kpi.id, period_label: f.label.trim(), period_end: f.end, value: n, value_basis: f.basis.trim() || null, evidence_link: f.link.trim() || null });
    setBusy(false);
    if (error) return setErr(/duplicate key|unique/i.test(error.message) ? "A value is already logged for that period. Open the metric to see it." : friendlyError(error.message));
    onSaved();
  }
  return (
    <Sheet open onClose={onClose} title={`Log ${kpi.name}`}
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-metric-log-save">{busy ? "Saving…" : "Log value"}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorLine message={err} /></div>
        <Field label={`Value${kpi.unit ? ` (${kpi.unit})` : ""}`} className="sm:col-span-2">{(id) => <input id={id} inputMode="decimal" className={input} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} data-testid="os-metric-value" />}</Field>
        <Field label="Period" hint="For example 2026-W46 or 2026-11.">{(id) => <input id={id} className={input} maxLength={40} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />}</Field>
        <Field label="Period ends">{(id) => <input id={id} type="date" className={input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} />}</Field>
        <Field label="How it was counted (optional)" className="sm:col-span-2">{(id) => <input id={id} className={input} maxLength={300} value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })} />}</Field>
        <Field label="Evidence link (optional)" className="sm:col-span-2">{(id) => <input id={id} className={input} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />}</Field>
      </div>
    </Sheet>
  );
}

function AddMetric({ ws, onClose, onSaved }: { ws: MyWorkspace; onClose: () => void; onSaved: () => void }) {
  const { supabase } = useOsMe();
  const defCompany = useDefaultCompany();
  const [f, setF] = useState({ name: "", company: defCompany, unit: "", period: "Monthly", definition: "", source: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.name.trim()) return setErr("Give the metric a name.");
    setBusy(true); setErr(null);
    const { error } = await supabase.from("os_kpis").insert({ company_code: f.company, division_id: ws.division_id, level: "Function", function: ws.name, name: f.name.trim(),
      unit: f.unit.trim() || null, reporting_period: f.period, definition: f.definition.trim() || null, data_source: f.source.trim() || null, target_status: "No approved target" });
    setBusy(false);
    if (error) return setErr(friendlyError(error.message));
    onSaved();
  }
  return (
    <Sheet open onClose={onClose} title={`New ${ws.name} metric`}
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="os-metric-save">{busy ? "Saving…" : "Add metric"}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorLine message={err} /></div>
        <Field label="Name" className="sm:col-span-2">{(id) => <input id={id} className={input} maxLength={200} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="os-metric-name" />}</Field>
        <Field label="Company">{(id) => <CompanySelect id={id} value={f.company} onChange={(v) => setF({ ...f, company: v })} />}</Field>
        <Field label="Reported">{(id) => <Select id={id} value={f.period} onChange={(v) => setF({ ...f, period: v })} options={PERIODS} />}</Field>
        <Field label="Unit (optional)" hint="For example count, %, IDR.">{(id) => <input id={id} className={input} maxLength={40} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />}</Field>
        <Field label="Where the number comes from (optional)">{(id) => <input id={id} className={input} maxLength={300} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />}</Field>
        <Field label="What it measures (optional)" className="sm:col-span-2">{(id) => <textarea id={id} rows={3} className={input} value={f.definition} onChange={(e) => setF({ ...f, definition: e.target.value })} />}</Field>
        <p className={cn("text-xs sm:col-span-2", muted)}>A new metric has no target. Set one on the metric&apos;s page once it has been approved.</p>
      </div>
    </Sheet>
  );
}

// Founders only: give this division one of the KPIs from the dictionary that no division has yet.
function AssignKpi({ ws, onClose, onSaved }: { ws: MyWorkspace; onClose: () => void; onSaved: () => void }) {
  const { supabase } = useOsMe();
  const free = useQuery<{ id: string; name: string; company_code: string; function: string | null }[]>((s) => s.from("os_kpis").select("id, name, company_code, function").is("division_id", null).eq("values_restricted", false).order("id"), []);
  const [id, setId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from("os_kpis").update({ division_id: ws.division_id }).eq("id", id).select("id").maybeSingle();
    setBusy(false);
    if (error || !data) return setErr(error ? friendlyError(error.message) : "You can't assign this KPI.");
    onSaved();
  }
  return (
    <Sheet open onClose={onClose} title={`Assign a KPI to ${ws.name}`}
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={busy || !id} data-testid="os-metric-assign-save">{busy ? "Saving…" : "Assign"}</button></>}>
      <div className="space-y-4">
        <ErrorLine message={err ?? free.error} />
        <Field label="KPI" hint="Only KPIs with no division are listed. Finance KPIs stay in Finance.">{(fid) => <Select id={fid} value={id} onChange={setId} placeholder="Choose a KPI"
          options={(free.data ?? []).map((k) => ({ value: k.id, label: `${k.id} · ${k.name} (${companyName(k.company_code)}${k.function ? `, ${k.function}` : ""})` }))} />}</Field>
        <p className={cn("text-xs", muted)}>The division&apos;s members can then log its values, and its manager can edit its target. It keeps its ID, definition and history.</p>
      </div>
    </Sheet>
  );
}
