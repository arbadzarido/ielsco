"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { useDefaultCompany } from "@/components/os/pickers";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, btnPrimary, input } from "@/components/os/ui";
import { CAMPAIGN_STATUSES, SENSITIVITIES, WORKSPACES, companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Item = { id: string; company_code: string; division_id: string | null; campaign: string | null; title: string; audience: string | null; objective: string | null; channel: string | null;
  format: string | null; planned_publish_date: string | null; production_deadline: string | null; owner_person_id: string | null; status: string; actual_publish_date: string | null;
  call_to_action: string | null; published_link: string | null; kpi_id: string | null; related_project_id: string | null; results: string | null; review: string | null; sensitivity: string };
const COLS = "id, company_code, division_id, campaign, title, audience, objective, channel, format, planned_publish_date, production_deadline, owner_person_id, status, actual_publish_date, call_to_action, published_link, kpi_id, related_project_id, results, review, sensitivity";

export default function CampaignsPage() {
  const params = useSearchParams();
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const items = useQuery<Item[]>((s) => s.from("os_campaign_items").select(COLS).order("planned_publish_date", { nullsFirst: false }), []);
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const all = items.data ?? [];
  const campaigns = Array.from(new Set(all.map((i) => i.campaign).filter(Boolean) as string[])).sort();
  const rows = all.filter((i) => (!company || i.company_code === company) && (!status ? i.status !== "Cancelled" : i.status === status) && (!campaign || i.campaign === campaign)
    && (!q || `${i.id} ${i.title} ${i.campaign ?? ""} ${i.channel ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const editing = all.find((i) => i.id === openId) ?? null;

  return (
    <div>
      <PageTitle title="Campaigns" description="The content and campaign calendar: what's planned, in production and published, and how it did."
        actions={<button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-new-campaign"><Plus size={16} aria-hidden="true" />Content item</button>} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search content</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={CAMPAIGN_STATUSES} placeholder="Not cancelled" className="md:w-40" />
        {!!campaigns.length && <Select ariaLabel="Campaign" value={campaign} onChange={setCampaign} options={campaigns} placeholder="All campaigns" className="col-span-2 md:w-48" />}
      </div>
      <ErrorLine message={items.error} />
      {items.loading && !items.data ? <Loading /> : (
        <RowList testId="os-campaign-list" rows={rows} rowKey={(i) => i.id}
          empty={<Empty title={all.length ? "Nothing matches" : "No content planned yet"} body={all.length ? "Clear the filters." : "Plan a post, video or email with its channel, owner and publish date."} />}
          columns={[
            { key: "t", label: "Content", primary: true, className: "w-[32%]", render: (i) => <button type="button" className="truncate text-left font-medium hover:underline" onClick={() => setOpenId(i.id)}>{i.title}</button> },
            { key: "c", label: "Campaign", className: "w-36", render: (i) => <span className="truncate text-xs text-[#66768A]">{i.campaign ?? "—"}</span> },
            { key: "ch", label: "Channel", className: "w-28", hideOnMobile: true, render: (i) => <span className="text-xs">{i.channel ?? "—"}</span> },
            { key: "s", label: "Status", className: "w-32", render: (i) => <StatusBadge value={i.status} /> },
            { key: "o", label: "Owner", className: "w-28", render: (i) => personLabel(dir?.peopleById ?? new Map(), i.owner_person_id) },
            { key: "d", label: "Publish", className: "w-28", render: (i) => { const r = !["Published", "Cancelled"].includes(i.status) ? relativeDue(i.planned_publish_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{fmtDate(i.actual_publish_date ?? i.planned_publish_date)}</span>; } },
            { key: "w", label: "Company", className: "w-24", hideOnMobile: true, render: (i) => <span className="text-xs text-[#66768A]">{companyName(i.company_code)}</span> },
          ]} />
      )}
      <RecordSheet open={creating || !!editing} title={editing ? `${editing.id} ${editing.title}` : "New content item"} table="os_campaign_items" record={editing}
        defaults={{ company_code: defCompany, status: "Planned", division_id: "DIV-03" }}
        fields={[
          { key: "title", label: "Title", required: true }, { key: "campaign", label: "Campaign" }, { key: "channel", label: "Channel", hint: "Instagram, TikTok, email, website…" }, { key: "format", label: "Format" },
          { key: "audience", label: "Audience" }, { key: "objective", label: "Objective" },
          { key: "status", label: "Status", kind: "select", options: CAMPAIGN_STATUSES, required: true }, { key: "owner_person_id", label: "Owner", kind: "person" },
          { key: "production_deadline", label: "Production deadline", kind: "date" }, { key: "planned_publish_date", label: "Planned publish", kind: "date" },
          { key: "actual_publish_date", label: "Published on", kind: "date" }, { key: "published_link", label: "Published link" },
          { key: "call_to_action", label: "Call to action" }, { key: "results", label: "Results", kind: "textarea", hint: "Only figures you've read from the platform." },
          { key: "review", label: "What we learned", kind: "textarea" }, { key: "division_id", label: "Division", kind: "division" },
          { key: "sensitivity", label: "Sensitivity", kind: "select", options: SENSITIVITIES, required: true },
        ]}
        extra={editing ? <div className="space-y-4"><div><h3 className="mb-2 text-sm font-semibold">Documents</h3><LinkedDocuments type="campaign" id={editing.id} /></div><EntityFeed type="campaign" id={editing.id} /></div> : undefined}
        onClose={() => { setCreating(false); setOpenId(null); }} onSaved={() => { setCreating(false); setOpenId(null); items.reload(); }} />
    </div>
  );
}
