"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { useDefaultCompany } from "@/components/os/pickers";
import { LinkedEvents } from "@/components/os/linked-events";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, Tabs, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { EVIDENCE_STATUSES, OPP_STAGES, SENSITIVITIES, WORKSPACES, companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Opp = { id: string; company_code: string; division_id: string | null; opportunity_type: string | null; organisation: string; contact: string | null; source: string | null;
  stage: string; evidence_status: string | null; owner_person_id: string | null; estimated_value: number | null; value_basis: string | null; probability: number | null;
  next_action: string | null; follow_up_date: string | null; related_project_id: string | null; outcome: string | null; closed_on: string | null; notes: string | null; sensitivity: string };
const COLS = "id, company_code, division_id, opportunity_type, organisation, contact, source, stage, evidence_status, owner_person_id, estimated_value, value_basis, probability, next_action, follow_up_date, related_project_id, outcome, closed_on, notes, sensitivity";
const OPEN = (s: string) => !["6 Won", "7 Lost"].includes(s);

export default function PartnershipsPage() {
  const params = useSearchParams();
  const view = params.get("view") === "pipeline" ? "pipeline" : "list";
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const opps = useQuery<Opp[]>((s) => s.from("os_partnerships").select(COLS).order("follow_up_date", { nullsFirst: false }), []);
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [stage, setStage] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const all = opps.data ?? [];
  const rows = all.filter((o) => (showClosed || OPEN(o.stage)) && (!company || o.company_code === company) && (!stage || o.stage === stage)
    && (!q || `${o.id} ${o.organisation} ${o.contact ?? ""} ${o.opportunity_type ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const editing = all.find((o) => o.id === openId) ?? null;
  const people = dir?.peopleById ?? new Map();

  const fields = [
    { key: "organisation", label: "Organisation", required: true }, { key: "opportunity_type", label: "Type", hint: "Sponsor, venue, school, media, institution…" },
    { key: "contact", label: "Contact" }, { key: "source", label: "Source" },
    { key: "stage", label: "Stage", kind: "select" as const, options: OPP_STAGES, required: true },
    { key: "evidence_status", label: "Evidence", kind: "select" as const, options: EVIDENCE_STATUSES, hint: "How firm it is. Only 5 is confirmed in writing." },
    { key: "owner_person_id", label: "Owner", kind: "person" as const }, { key: "division_id", label: "Division", kind: "division" as const },
    { key: "estimated_value", label: "Estimated value (IDR)", hint: "Only with a basis below." }, { key: "value_basis", label: "Value basis" },
    { key: "next_action", label: "Next action" }, { key: "follow_up_date", label: "Follow up on", kind: "date" as const },
    { key: "outcome", label: "Outcome" }, { key: "closed_on", label: "Closed on", kind: "date" as const },
    { key: "notes", label: "Notes", kind: "textarea" as const }, { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: SENSITIVITIES, required: true },
  ];

  return (
    <div>
      <PageTitle title="Partnerships" description="Sponsors, venues, schools and institutions in the pipeline. Confidential by default; visible to the Partnerships division, owners and founders."
        actions={<button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-opp"><Plus size={16} aria-hidden="true" />Opportunity</button>} />
      <Tabs label="Partnership views" current={view} hrefFor={(k) => `/os/partnerships${k === "list" ? "" : `?view=${k}`}`} tabs={[{ key: "list", label: "List" }, { key: "pipeline", label: "Pipeline" }]} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search opportunities</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search organisations" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        {view === "list" && <Select ariaLabel="Stage" value={stage} onChange={setStage} options={OPP_STAGES} placeholder="Any stage" className="md:w-52" />}
        <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Show won and lost</label>
      </div>
      <ErrorLine message={opps.error} />
      {opps.loading && !opps.data ? <Loading /> : view === "list" ? (
        <RowList testId="os-opp-list" rows={rows} rowKey={(o) => o.id}
          empty={<Empty title={all.length ? "No opportunities match" : "No opportunities you can see"} body={all.length ? "Clear the filters." : "Add the first partner conversation. Record only what's confirmed; evidence levels keep guesses apart from facts."} />}
          columns={[
            { key: "o", label: "Organisation", primary: true, className: "w-[28%]", render: (o) => <button type="button" className="truncate text-left font-medium hover:underline" onClick={() => setOpenId(o.id)}>{o.organisation}</button> },
            { key: "s", label: "Stage", className: "w-44", render: (o) => <StatusBadge value={o.stage} /> },
            { key: "e", label: "Evidence", className: "w-40", hideOnMobile: true, render: (o) => <span className="truncate text-xs text-[#66768A]">{o.evidence_status ?? "—"}</span> },
            { key: "w", label: "Owner", className: "w-28", render: (o) => personLabel(people, o.owner_person_id) },
            { key: "n", label: "Follow up", className: "w-28", render: (o) => { const r = OPEN(o.stage) ? relativeDue(o.follow_up_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.overdue ? r.label : fmtDate(o.follow_up_date)}</span>; } },
            { key: "c", label: "Company", className: "w-24", hideOnMobile: true, render: (o) => <span className="text-xs text-[#66768A]">{companyName(o.company_code)}</span> },
          ]} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" data-testid="os-opp-pipeline">
          <div className="flex min-w-max gap-3">
            {OPP_STAGES.filter((s) => showClosed || OPEN(s)).map((s) => {
              const col = rows.filter((o) => o.stage === s);
              return (
                <section key={s} className="w-64 shrink-0 rounded-xl bg-[#F5F7FA] p-2">
                  <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-[#3A4B60]">{s}<span className="font-normal text-[#66768A]">{col.length}</span></h2>
                  <ul className="space-y-2">
                    {col.map((o) => (
                      <li key={o.id}><button type="button" onClick={() => setOpenId(o.id)} className={cn(panel, "block w-full p-2.5 text-left text-sm hover:border-[#C9D1DB]")}>
                        <p className="font-medium">{o.organisation}</p>
                        <p className={cn("mt-0.5 text-xs", muted)}>{personLabel(people, o.owner_person_id)}{o.follow_up_date ? ` · ${fmtDate(o.follow_up_date)}` : ""}</p>
                      </button></li>
                    ))}
                    {!col.length && <li className={cn("px-1 text-xs", muted)}>None</li>}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
      <RecordSheet open={creating || !!editing} title={editing ? `${editing.id} ${editing.organisation}` : "New opportunity"} table="os_partnerships" record={editing}
        defaults={{ company_code: defCompany, stage: "1 Identified", sensitivity: "Confidential", division_id: "DIV-06" }} fields={fields}
        extra={editing ? <div className="space-y-4"><div><h3 className="mb-2 text-sm font-semibold">Meetings and events</h3><LinkedEvents type="partnership" id={editing.id} company={editing.company_code} defaults={{ category: "Partnership" }} /></div><div><h3 className="mb-2 text-sm font-semibold">Documents</h3><LinkedDocuments type="partnership" id={editing.id} /></div><EntityFeed type="partnership" id={editing.id} /></div> : undefined}
        onClose={() => { setCreating(false); setOpenId(null); }} onSaved={() => { setCreating(false); setOpenId(null); opps.reload(); }} />
    </div>
  );
}
