"use client";

// Marketing: campaigns (the plan: dates, objective, owner, project and milestone links) and their content items (the
// posts, videos and emails, with channel, creator, reviewer and publish date). Content items are not tasks.
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Plus, Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { useDefaultCompany } from "@/components/os/pickers";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, btn, btnPrimary, input, ring } from "@/components/os/ui";
import { CAMPAIGN_PLAN_STATUSES, CAMPAIGN_STATUSES, WORKSPACES, companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { CAMPAIGN_COLS, CONTENT_COLS, campaignFields, contentFields, type Campaign, type ContentItem } from "@/components/os/campaign-fields";
import { cn } from "@/lib/utils";

export default function CampaignsPage() { return <Suspense fallback={null}><Campaigns /></Suspense>; }

function Campaigns() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") === "campaigns" ? "campaigns" : "content";
  return (
    <div>
      <PageTitle title="Marketing" description="Campaigns and the content that goes out for them: what's planned, in production, in review and published. The Marketing calendar shows it on dates."
        actions={<Link href="/os/calendar?ws=marketing" className={btn}><CalendarDays size={15} aria-hidden="true" />Marketing calendar</Link>} />
      <div className="mb-4 flex rounded-lg bg-[#F0F2F5] p-1 text-sm sm:w-fit" role="tablist" aria-label="Marketing">
        {([["content", "Content"], ["campaigns", "Campaigns"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => router.replace(`/os/campaigns${k === "content" ? "" : "?tab=campaigns"}`)} className={cn("min-h-9 flex-1 rounded-md px-4 font-medium", ring, tab === k ? "bg-white shadow-sm" : "text-[#3A4B60]")} data-testid={`os-mkt-tab-${k}`}>{l}</button>
        ))}
      </div>
      {tab === "content" ? <ContentList openId={params.get("open")} /> : <CampaignList />}
    </div>
  );
}

function ContentList({ openId: initialOpen }: { openId: string | null }) {
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const items = useQuery<ContentItem[]>((s) => s.from("os_campaign_items").select(CONTENT_COLS).order("planned_publish_date", { nullsFirst: false }), []);
  const camps = useQuery<{ id: string; name: string }[]>((s) => s.from("os_campaigns").select("id, name").order("start_date", { nullsFirst: false }).limit(300), []);
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [campaign, setCampaign] = useState("");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const all = items.data ?? [];
  const campName = new Map((camps.data ?? []).map((c) => [c.id, c.name]));
  const label = (i: ContentItem) => (i.campaign_id ? campName.get(i.campaign_id) ?? i.campaign_id : i.campaign);
  const campaigns = Array.from(new Set(all.map(label).filter(Boolean) as string[])).sort();
  const rows = all.filter((i) => (!company || i.company_code === company) && (!status ? i.status !== "Cancelled" : i.status === status) && (!campaign || label(i) === campaign)
    && (!q || `${i.id} ${i.title} ${label(i) ?? ""} ${i.channel ?? ""} ${i.pillar ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const editing = all.find((i) => i.id === openId) ?? null;
  const people = dir?.peopleById ?? new Map();
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search content</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={CAMPAIGN_STATUSES} placeholder="Not cancelled" className="md:w-40" />
        {!!campaigns.length && <Select ariaLabel="Campaign" value={campaign} onChange={setCampaign} options={campaigns} placeholder="All campaigns" className="md:w-48" />}
        <button type="button" className={cn(btnPrimary, "col-span-2 md:ml-auto")} onClick={() => setCreating(true)} data-testid="os-new-campaign"><Plus size={16} aria-hidden="true" />Content item</button>
      </div>
      <ErrorLine message={items.error} />
      {items.loading && !items.data ? <Loading /> : (
        <RowList testId="os-campaign-list" rows={rows} rowKey={(i) => i.id}
          empty={<Empty title={all.length ? "Nothing matches" : "No content planned yet"} body={all.length ? "Clear the filters." : "Plan a post, video or email with its channel, creator, reviewer and publish date."} />}
          columns={[
            { key: "t", label: "Content", primary: true, className: "w-[30%]", render: (i) => <button type="button" className="truncate text-left font-medium hover:underline" onClick={() => setOpenId(i.id)}>{i.title}</button> },
            { key: "c", label: "Campaign", className: "w-36", render: (i) => i.campaign_id ? <Link href={`/os/campaigns/${i.campaign_id}`} className="truncate text-xs text-[#2457A6] hover:underline">{label(i)}</Link> : <span className="truncate text-xs text-[#66768A]">{i.campaign ?? "—"}</span> },
            { key: "ch", label: "Channel", className: "w-28", hideOnMobile: true, render: (i) => <span className="text-xs">{i.channel ?? "—"}</span> },
            { key: "s", label: "Status", className: "w-32", render: (i) => <StatusBadge value={i.status} /> },
            { key: "o", label: "Creator / reviewer", className: "w-36", render: (i) => <span className="text-xs">{personLabel(people, i.creator_person_id ?? i.owner_person_id)}{i.reviewer_person_id ? ` → ${personLabel(people, i.reviewer_person_id)}` : ""}</span> },
            { key: "d", label: "Publish", className: "w-28", render: (i) => { const r = !["Published", "Cancelled"].includes(i.status) ? relativeDue(i.planned_publish_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{fmtDate(i.actual_publish_date ?? i.planned_publish_date)}</span>; } },
            { key: "w", label: "Company", className: "w-24", hideOnMobile: true, render: (i) => <span className="text-xs text-[#66768A]">{companyName(i.company_code)}</span> },
          ]} />
      )}
      <RecordSheet open={creating || !!editing} title={editing ? `${editing.id} ${editing.title}` : "New content item"} table="os_campaign_items" record={editing}
        defaults={{ company_code: defCompany, status: "Planned", division_id: "DIV-03" }} fields={contentFields(camps.data ?? [])}
        extra={editing ? <div className="space-y-4"><div><h3 className="mb-2 text-sm font-semibold">Documents</h3><LinkedDocuments type="campaign" id={editing.id} /></div><EntityFeed type="campaign" id={editing.id} /></div> : undefined}
        onClose={() => { setCreating(false); setOpenId(null); }} onSaved={() => { setCreating(false); setOpenId(null); items.reload(); }} />
    </>
  );
}

function CampaignList() {
  const dir = useDirectory();
  const defCompany = useDefaultCompany();
  const list = useQuery<Campaign[]>((s) => s.from("os_campaigns").select(CAMPAIGN_COLS).order("start_date", { ascending: false, nullsFirst: false }).limit(300), []);
  const counts = useQuery<{ campaign_id: string; status: string }[]>((s) => s.from("os_campaign_items").select("campaign_id, status").not("campaign_id", "is", null).limit(5000), []);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const per = new Map<string, { total: number; published: number }>();
  for (const c of counts.data ?? []) { if (c.status === "Cancelled") continue; const x = per.get(c.campaign_id) ?? { total: 0, published: 0 }; x.total++; if (c.status === "Published") x.published++; per.set(c.campaign_id, x); }
  const rows = (list.data ?? []).filter((c) => (!status ? c.status !== "Cancelled" : c.status === status));
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select ariaLabel="Status" value={status} onChange={setStatus} options={CAMPAIGN_PLAN_STATUSES} placeholder="Not cancelled" className="w-44" />
        <button type="button" className={cn(btnPrimary, "ml-auto")} onClick={() => setCreating(true)} data-testid="os-new-campaign-plan"><Plus size={16} aria-hidden="true" />Campaign</button>
      </div>
      <ErrorLine message={list.error} />
      {list.loading && !list.data ? <Loading /> : (
        <RowList testId="os-campaign-plans" rows={rows} rowKey={(c) => c.id}
          empty={<Empty title="No campaigns yet" body="A campaign groups content and launch events under one objective and date range." />}
          columns={[
            { key: "n", label: "Campaign", primary: true, className: "w-[30%]", render: (c) => <Link href={`/os/campaigns/${c.id}`} className="truncate font-medium hover:underline">{c.name}</Link> },
            { key: "s", label: "Status", className: "w-28", render: (c) => <StatusBadge value={c.status} /> },
            { key: "d", label: "Dates", className: "w-40", render: (c) => <span className="text-xs">{fmtDate(c.start_date)}{c.end_date ? ` – ${fmtDate(c.end_date)}` : ""}</span> },
            { key: "p", label: "Content", className: "w-28", render: (c) => { const x = per.get(c.id); return <span className="text-xs">{x ? `${x.published}/${x.total} published` : "None yet"}</span>; } },
            { key: "o", label: "Owner", className: "w-28", hideOnMobile: true, render: (c) => personLabel(dir?.peopleById ?? new Map(), c.owner_person_id) },
            { key: "w", label: "Company", className: "w-24", hideOnMobile: true, render: (c) => <span className="text-xs text-[#66768A]">{companyName(c.company_code)}</span> },
          ]} />
      )}
      <RecordSheet open={creating} title="New campaign" table="os_campaigns" record={null} defaults={{ company_code: defCompany, status: "Planned", division_id: "DIV-03" }} fields={campaignFields}
        onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.reload(); }} />
    </>
  );
}
