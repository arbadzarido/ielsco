"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Lock } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, StatusBadge, btn, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { companyName, fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Kpi = Record<string, string | number | boolean | null> & { id: string; name: string; company_code: string; division_id: string | null; values_restricted: boolean; unit: string | null; target_value: number | null };
type Val = { id: string; period_label: string; period_end: string; value: number; value_basis: string | null; recorded_by: string | null; recorded_at: string; evidence_link: string | null };

export default function KpiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const kpi = useQuery<Kpi | null>((s) => s.from("os_kpis").select("*").eq("id", id).maybeSingle(), [id]);
  const vals = useQuery<Val[]>((s) => s.from("os_kpi_values").select("id, period_label, period_end, value, value_basis, recorded_by, recorded_at, evidence_link").eq("kpi_id", id).order("period_end"), [id]);
  const [log, setLog] = useState({ period_label: "", period_end: "", value: "", value_basis: "", evidence_link: "" });
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (kpi.loading && !kpi.data) return <Loading />;
  const k = kpi.data;
  if (!k) return <Empty title="KPI not found" body="It doesn't exist, or you can't see it." action={<Link href="/os/kpis" className={btn}>Back to KPIs</Link>} />;
  const v = vals.data ?? [];
  const pct = k.unit === "%" ? "%" : "";

  async function addValue() {
    setErr(null);
    const n = Number(log.value);
    if (!log.period_label.trim() || !log.period_end || !Number.isFinite(n)) return setErr("Give the period, its end date and a number.");
    const { error } = await supabase.from("os_kpi_values").insert({ kpi_id: id, period_label: log.period_label.trim(), period_end: log.period_end, value: n, value_basis: log.value_basis || null, evidence_link: log.evidence_link || null });
    if (error) return setErr(friendlyError(error.message));
    setLog({ period_label: "", period_end: "", value: "", value_basis: "", evidence_link: "" }); vals.reload();
  }
  const txt = (key: string) => (k[key] === null || k[key] === "" ? "—" : String(k[key]));

  return (
    <div>
      <PageTitle title={k.name} crumbs={[{ href: "/os/kpis", label: "KPIs" }]}
        description={`${k.id} · ${companyName(k.company_code)} · ${txt("level")} · ${txt("function")}`}
        actions={<button type="button" className={btn} onClick={() => setEditing(true)}>Edit target and thresholds</button>} />
      <ErrorLine message={err} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section title="Trend">
            {k.values_restricted ? (
              <p className={cn(panel, "flex items-start gap-2 p-4 text-sm")}><Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />This is a Finance KPI. Its values live in the Restricted Finance Control and are never stored in Company OS.</p>
            ) : v.length >= 3 ? (
              <div className={cn(panel, "h-64 p-3")} data-testid="os-kpi-chart" role="img" aria-label={`${k.name} over ${v.length} periods; values in the table below`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={v.map((x) => ({ p: x.period_label, value: Number(x.value) }))} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <CartesianGrid stroke="#EEF1F5" vertical={false} />
                    <XAxis dataKey="p" tick={{ fontSize: 11, fill: "#66768A" }} tickLine={false} axisLine={{ stroke: "#E1E5EB" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#66768A" }} tickLine={false} axisLine={false} width={44} />
                    <Tooltip formatter={(x) => [`${x}${pct}`, k.name]} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#E1E5EB" }} />
                    <Line type="monotone" dataKey="value" stroke="#2F4157" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className={cn("text-sm", muted)}>{v.length ? `${v.length} period${v.length === 1 ? "" : "s"} logged. The trend chart appears once three periods are logged.` : "No values logged yet. The KPI Log in the Operations Master was empty when it was migrated."}</p>}
          </Section>
          {!k.values_restricted && (
            <Section title="Values">
              {!!v.length && (
                <div className={cn(panel, "mb-3 overflow-x-auto")}>
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs text-[#66768A]"><tr><th className="px-3 py-2 font-medium">Period</th><th className="px-3 py-2 font-medium">Ends</th><th className="px-3 py-2 text-right font-medium">Value</th><th className="px-3 py-2 font-medium">Basis</th><th className="px-3 py-2 font-medium">Recorded</th></tr></thead>
                    <tbody>{[...v].reverse().map((x) => (
                      <tr key={x.id} className="border-b border-[#F0F2F5] last:border-0">
                        <td className="px-3 py-2">{x.period_label}</td><td className="px-3 py-2 text-xs">{fmtDate(x.period_end)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{x.value}{pct}</td>
                        <td className="px-3 py-2 text-xs">{x.evidence_link ? <a href={x.evidence_link} target="_blank" rel="noopener noreferrer" className={linkCls}>{x.value_basis ?? "Evidence"}</a> : x.value_basis ?? "—"}</td>
                        <td className="px-3 py-2 text-xs text-[#66768A]">{personLabel(dir?.peopleById ?? new Map(), x.recorded_by)} · {fmtDateTime(x.recorded_at)}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              )}
              <div className={cn(panel, "grid gap-3 p-4 sm:grid-cols-2")} data-testid="os-kpi-log">
                <p className="text-sm font-medium sm:col-span-2">Log a value</p>
                <Field label="Period">{(fid) => <input id={fid} className={input} placeholder="2026-11 or 2026-W45" value={log.period_label} onChange={(e) => setLog({ ...log, period_label: e.target.value })} />}</Field>
                <Field label="Period ends">{(fid) => <input id={fid} type="date" className={input} value={log.period_end} onChange={(e) => setLog({ ...log, period_end: e.target.value })} />}</Field>
                <Field label={`Value${k.unit ? ` (${k.unit})` : ""}`}>{(fid) => <input id={fid} inputMode="decimal" className={input} value={log.value} onChange={(e) => setLog({ ...log, value: e.target.value })} />}</Field>
                <Field label="Basis (optional)">{(fid) => <input id={fid} className={input} placeholder="Counted from the attendance sheet" value={log.value_basis} onChange={(e) => setLog({ ...log, value_basis: e.target.value })} />}</Field>
                <Field label="Evidence link (optional)" className="sm:col-span-2">{(fid) => <input id={fid} className={input} value={log.evidence_link} onChange={(e) => setLog({ ...log, evidence_link: e.target.value })} />}</Field>
                <div className="sm:col-span-2"><button type="button" className={btnPrimary} onClick={addValue}>Log value</button>
                  <span className={cn("ml-2 text-xs", muted)}>The KPI owner and the division manager can log values.</span></div>
              </div>
            </Section>
          )}
          <Section title="Definition">
            <div className={cn(panel, "p-4")}>
              <KeyValue items={[
                { label: "Business purpose", value: txt("business_purpose") }, { label: "Definition", value: txt("definition") },
                { label: "Formula", value: txt("formula") }, { label: "Data source", value: txt("data_source") },
                { label: "Collection", value: txt("collection_method") }, { label: "Indicator", value: txt("indicator_type") },
                { label: "Action when missed", value: txt("action_when_missed") }, { label: "Start condition", value: txt("start_condition") },
                { label: "Notes", value: txt("notes") },
              ]} />
            </div>
          </Section>
          <Section title="Documents"><LinkedDocuments type="kpi" id={k.id} /></Section>
          <EntityFeed type="kpi" id={k.id} />
        </div>
        <aside>
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Owner", value: k.owner_text ? String(k.owner_text) : "—" },
              { label: "Reporting period", value: txt("reporting_period") },
              { label: "Unit", value: txt("unit") },
              { label: "Baseline", value: txt("baseline") },
              { label: "Target", value: k.target_value !== null ? `${k.target_value}${pct}` : <StatusBadge value={String(k.target_status ?? "No approved target")} /> },
              { label: "Reference (not approved)", value: txt("reference_target") },
              { label: "Green / amber / red", value: `${txt("green_threshold")} / ${txt("amber_threshold")} / ${txt("red_threshold")}` },
              { label: "Sheet value on 7 Nov 2026", value: k.values_restricted ? "Restricted" : k.sheet_latest_value ? `${k.sheet_latest_value}${k.sheet_latest_period_end ? ` (${fmtDate(String(k.sheet_latest_period_end))})` : ""}` : "—" },
              { label: "Data status", value: txt("data_status") },
              { label: "Tracked now", value: txt("track_now") },
            ]} />
          </section>
        </aside>
      </div>
      <RecordSheet open={editing} title="Target and thresholds" table="os_kpis" record={k as Record<string, unknown>}
        fields={[{ key: "baseline", label: "Baseline" }, { key: "target_value", label: "Approved target (number)", hint: "Only enter a target that has been approved. Leave empty otherwise." },
          { key: "target_status", label: "Target status", kind: "select", options: ["No approved target", "Proposed — awaiting approval", "Reference only — requires validation", "Approved"], required: true },
          { key: "green_threshold", label: "Green" }, { key: "amber_threshold", label: "Amber" }, { key: "red_threshold", label: "Red" },
          { key: "action_when_missed", label: "Action when missed", kind: "textarea" }, { key: "data_status", label: "Data status" }, { key: "notes", label: "Notes", kind: "textarea" }]}
        onClose={() => setEditing(false)} onSaved={() => { setEditing(false); kpi.reload(); }} />
    </div>
  );
}
