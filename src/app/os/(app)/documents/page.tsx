"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ExternalLink, Plus, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { DOC_COLUMNS, NewDocumentSheet, type DocRow } from "@/components/os/doc-forms";
import { Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, btnGhost, btnPrimary, input } from "@/components/os/ui";
import { DOC_STATUSES, DOC_TYPES, SENSITIVITIES, WORKSPACES, companyName, fmtDate, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const dir = useDirectory();
  const [q, setQ] = useState("");
  const [company, setCompany] = useState(params.get("company") ?? "");
  const [division, setDivision] = useState(params.get("division") ?? "");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [sens, setSens] = useState("");
  const [category, setCategory] = useState("");
  const [drift, setDrift] = useState(false);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const docs = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).order("updated_at", { ascending: false }).limit(1000), []);
  const all = docs.data ?? [];
  const categories = Array.from(new Set(all.map((d) => d.category).filter(Boolean) as string[])).sort();
  const rows = all.filter((d) => (!company || d.company_code === company) && (!division || d.division_id === division) && (!type || d.doc_type === type)
    && (!status ? d.status !== "Archived" : d.status === status) && (!sens || d.sensitivity === sens) && (!category || d.category === category)
    && (!drift || d.drift_findings?.length) && (!q || `${d.id} ${d.reference_number ?? ""} ${d.title} ${d.category ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const driftCount = all.filter((d) => d.drift_findings?.length).length;

  return (
    <div>
      <PageTitle title="Documents" description="The register of company documents. Files live in Google Drive; Drive's own sharing decides who can open them."
        actions={<button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-doc"><Plus size={16} aria-hidden="true" />New document</button>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search documents</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or number" className={cn(input, "pl-8")} data-testid="os-doc-search" />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} placeholder="All divisions" className="md:w-44" />
        <Select ariaLabel="Type" value={type} onChange={setType} options={DOC_TYPES.map((t) => ({ value: t.code, label: t.label }))} placeholder="Any type" className="md:w-36" />
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={DOC_STATUSES} placeholder="Not archived" className="md:w-36" />
        <Select ariaLabel="Sensitivity" value={sens} onChange={setSens} options={SENSITIVITIES} placeholder="Any sensitivity" className="md:w-36" />
        {!!categories.length && <Select ariaLabel="Category" value={category} onChange={setCategory} options={categories} placeholder="Any category" className="md:w-40" />}
        {driftCount > 0 && <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={drift} onChange={(e) => setDrift(e.target.checked)} />Only with access findings ({driftCount})</label>}
      </div>
      <ErrorLine message={docs.error} />
      {docs.loading && !docs.data ? <Loading /> : (
        <RowList testId="os-doc-list" rows={rows} rowKey={(d) => d.id} rowHref={(d) => `/os/documents/${d.id}`}
          empty={<Empty title={all.length ? "No documents match" : "No documents registered yet"}
            body={all.length ? "Clear the filters to see more." : "Create one from a Master Template, upload a file, or register a file that's already in Drive."}
            action={<button type="button" className={btnPrimary} onClick={() => setCreating(true)}>New document</button>} />}
          columns={[
            { key: "t", label: "Document", primary: true, className: "w-[36%]", render: (d) => (
              <span className="flex min-w-0 items-center gap-1.5">
                {!!d.drift_findings?.length && <AlertTriangle size={14} className="shrink-0 text-[#B4690E]" aria-label="Access findings" />}
                <span className="truncate">{d.title}</span>
              </span>) },
            { key: "n", label: "Number", className: "w-36", render: (d) => <span className="truncate text-xs text-[#66768A]">{d.reference_number ?? d.id}</span> },
            { key: "s", label: "Status", className: "w-28", render: (d) => <StatusBadge value={d.status} /> },
            { key: "w", label: "Company", className: "w-36", render: (d) => <span className="truncate text-xs text-[#66768A]">{companyName(d.company_code)}{d.division_id ? ` · ${dir?.divisionById.get(d.division_id)?.name ?? ""}` : ""}</span> },
            { key: "o", label: "Owner", className: "w-28", hideOnMobile: true, render: (d) => <span className="truncate">{personLabel(dir?.peopleById ?? new Map(), d.owner_person_id)}</span> },
            { key: "u", label: "Updated", className: "w-24", hideOnMobile: true, render: (d) => <span className="text-xs text-[#66768A]">{fmtDate(d.updated_at.slice(0, 10))}</span> },
            { key: "x", label: "", className: "w-12", hideOnMobile: true, render: (d) => d.drive_url ? <a href={d.drive_url} target="_blank" rel="noopener noreferrer" className={btnGhost} aria-label={`Open ${d.title} in Google Drive`} onClick={(e) => e.stopPropagation()}><ExternalLink size={14} aria-hidden="true" /></a> : null },
          ]} />
      )}
      <NewDocumentSheet open={creating} defaults={{ company_code: company || undefined, division_id: division || undefined }} onClose={() => setCreating(false)} onCreated={(id) => router.push(`/os/documents/${id}`)} />
    </div>
  );
}
