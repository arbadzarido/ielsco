"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, input, muted } from "@/components/os/ui";
import { WORKSPACES, companyName } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Kpi = { id: string; company_code: string; division_id: string | null; level: string | null; function: string | null; name: string; unit: string | null;
  reporting_period: string | null; target_value: number | null; target_status: string | null; sheet_latest_value: string | null; values_restricted: boolean; track_now: string | null; owner_text: string | null };

export default function KpisPage() {
  const params = useSearchParams();
  const dir = useDirectory();
  const [q, setQ] = useState("");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [level, setLevel] = useState("");
  const [fn, setFn] = useState("");
  const [track, setTrack] = useState("");
  const kpis = useQuery<Kpi[]>((s) => s.from("os_kpis").select("id, company_code, division_id, level, function, name, unit, reporting_period, target_value, target_status, sheet_latest_value, values_restricted, track_now, owner_text").order("id"), []);
  const values = useQuery<{ kpi_id: string; period_label: string; value: number; period_end: string }[]>((s) => s.from("os_kpi_values").select("kpi_id, period_label, value, period_end").order("period_end", { ascending: false }), []);
  const latest = new Map<string, { period_label: string; value: number }>();
  (values.data ?? []).forEach((v) => { if (!latest.has(v.kpi_id)) latest.set(v.kpi_id, v); });
  const all = kpis.data ?? [];
  const functions = Array.from(new Set(all.map((k) => k.function).filter(Boolean) as string[])).sort();
  const rows = all.filter((k) => (!company || k.company_code === company) && (!level || k.level === level) && (!fn || k.function === fn)
    && (!track || (track === "yes" ? /^yes/i.test(k.track_now ?? "") : !/^yes/i.test(k.track_now ?? "")))
    && (!q || `${k.id} ${k.name} ${k.function ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageTitle title="KPIs" description="The KPI Dictionary, migrated from the Operations Master with its IDs. Targets appear only where one was approved." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search KPIs</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search KPIs" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        <Select ariaLabel="Level" value={level} onChange={setLevel} options={["Company", "Function", "Role"]} placeholder="Any level" className="md:w-32" />
        <Select ariaLabel="Function" value={fn} onChange={setFn} options={functions} placeholder="Any function" className="col-span-2 md:w-52" />
        <Select ariaLabel="Tracked now" value={track} onChange={setTrack} options={[{ value: "yes", label: "Tracked now" }, { value: "no", label: "Not tracked yet" }]} placeholder="Tracked or not" className="col-span-2 md:w-40" />
      </div>
      <ErrorLine message={kpis.error} />
      {kpis.loading && !kpis.data ? <Loading /> : (
        <RowList testId="os-kpi-list" rows={rows} rowKey={(k) => k.id} rowHref={(k) => `/os/kpis/${k.id}`}
          empty={<Empty title={all.length ? "No KPIs match" : "No KPIs you can see"} body={all.length ? "Clear the filters." : "KPIs are visible to people in the KPI's company and division."} />}
          columns={[
            { key: "n", label: "KPI", primary: true, className: "w-[34%]", render: (k) => <span className="flex min-w-0 items-center gap-1.5">{k.values_restricted && <Lock size={13} className="shrink-0 text-[#66768A]" aria-label="Values restricted" />}<span className="truncate">{k.name}</span></span> },
            { key: "id", label: "ID", className: "w-24", render: (k) => <span className="text-xs text-[#66768A]">{k.id}</span> },
            { key: "w", label: "Company", className: "w-36", render: (k) => <span className="truncate text-xs text-[#66768A]">{companyName(k.company_code)} · {k.level ?? "—"}</span> },
            { key: "p", label: "Period", className: "w-24", hideOnMobile: true, render: (k) => <span className="text-xs">{k.reporting_period ?? "—"}</span> },
            { key: "v", label: "Latest", className: "w-36", render: (k) => { const l = latest.get(k.id); return k.values_restricted ? <span className={cn("text-xs", muted)}>Restricted</span> : l ? <span className="text-xs tabular-nums">{l.value}{k.unit === "%" ? "%" : ""} <span className={muted}>({l.period_label})</span></span> : <span className={cn("text-xs", muted)}>Not logged</span>; } },
            { key: "t", label: "Target", className: "w-36", render: (k) => k.target_value !== null ? <span className="text-xs tabular-nums">{k.target_value}{k.unit === "%" ? "%" : ""}</span> : <StatusBadge value={k.target_status ?? "No approved target"} /> },
          ]} />
      )}
      {dir && <p className={cn("mt-3 text-xs", muted)}>{rows.length} of {all.length} KPIs.</p>}
    </div>
  );
}
