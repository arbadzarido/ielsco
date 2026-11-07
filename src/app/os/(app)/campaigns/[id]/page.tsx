"use client";

// One campaign: its plan, its content items (status and publish dates), launch and production events, the project
// and timeline milestone it serves, documents and discussion. Nothing here changes linked records by itself.
import Link from "next/link";
import { use, useState } from "react";
import { Plus } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { CAMPAIGN_COLS, CONTENT_COLS, campaignFields, contentFields, type Campaign, type ContentItem } from "@/components/os/campaign-fields";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { LinkedEvents } from "@/components/os/linked-events";
import { RecordSheet } from "@/components/os/records";
import { Empty, KeyValue, Loading, PageTitle, Progress, RowList, Section, StatusBadge, btn, btnPrimary, panel } from "@/components/os/ui";
import { companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const c = useQuery<Campaign | null>((s) => s.from("os_campaigns").select(CAMPAIGN_COLS).eq("id", id).maybeSingle(), [id]);
  const content = useQuery<ContentItem[]>((s) => s.from("os_campaign_items").select(CONTENT_COLS).eq("campaign_id", id).order("planned_publish_date", { nullsFirst: false }), [id]);
  const links = useQuery<{ project: { id: string; name: string } | null; milestone: { id: string; title: string; due_date: string | null; is_major: boolean } | null }>(async (s) => {
    const row = c.data;
    const [p, m] = await Promise.all([
      row?.project_id ? s.from("os_projects").select("id, name").eq("id", row.project_id).maybeSingle() : Promise.resolve({ data: null }),
      row?.timeline_item_id ? s.from("os_timeline_items").select("id, title, due_date, is_major").eq("id", row.timeline_item_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return { data: { project: p.data as never, milestone: m.data as never }, error: null };
  }, [c.data?.project_id, c.data?.timeline_item_id]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (c.loading && !c.data) return <Loading />;
  const camp = c.data;
  if (!camp) return <Empty title="Campaign not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/campaigns?tab=campaigns" className={btn}>Back to campaigns</Link>} />;
  const live = (content.data ?? []).filter((i) => i.status !== "Cancelled");
  const published = live.filter((i) => i.status === "Published").length;
  const review = live.filter((i) => i.status === "In review").length;
  const overdue = live.filter((i) => i.status !== "Published" && relativeDue(i.planned_publish_date)?.overdue).length;
  const editingItem = (content.data ?? []).find((i) => i.id === openId) ?? null;
  const campOpts = [{ id: camp.id, name: camp.name }];

  return (
    <div data-testid="os-campaign-detail">
      <PageTitle title={camp.name} crumbs={[{ href: "/os/campaigns?tab=campaigns", label: "Campaigns" }]}
        description={`${camp.id} · ${companyName(camp.company_code)}${camp.start_date ? ` · ${fmtDate(camp.start_date)}${camp.end_date ? ` – ${fmtDate(camp.end_date)}` : ""}` : ""}`}
        actions={<><button type="button" className={btn} onClick={() => setEditing(true)}>Edit</button><button type="button" className={btnPrimary} onClick={() => setAdding(true)} data-testid="os-campaign-add-content"><Plus size={16} aria-hidden="true" />Content item</button></>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className={cn(panel, "grid grid-cols-2 gap-4 p-4 sm:grid-cols-4")} aria-label="Campaign overview">
            <div><p className="text-xs text-[#66768A]">Status</p><div className="mt-1"><StatusBadge value={camp.status} /></div></div>
            <div><p className="text-xs text-[#66768A]">Published</p><div className="mt-1.5"><Progress done={published} total={live.length} /></div></div>
            <div><p className="text-xs text-[#66768A]">Awaiting review</p><p className="mt-0.5 text-lg font-semibold">{review}</p></div>
            <div><p className="text-xs text-[#66768A]">Overdue</p><p className={cn("mt-0.5 text-lg font-semibold", overdue && "text-[#A12D2F]")}>{overdue}</p></div>
          </section>
          {(camp.objective || camp.description) && (
            <section className={cn(panel, "space-y-3 p-4 text-sm")}>
              {camp.objective && <div><h2 className="text-xs font-medium text-[#66768A]">Objective</h2><p className="mt-1 whitespace-pre-wrap">{camp.objective}</p></div>}
              {camp.description && <div><h2 className="text-xs font-medium text-[#66768A]">Description</h2><p className="mt-1 whitespace-pre-wrap">{camp.description}</p></div>}
            </section>
          )}
          <Section title={`Content (${live.length})`}>
            <RowList rows={content.data ?? []} rowKey={(i) => i.id} testId="os-campaign-content"
              empty={<Empty compact title="No content yet" body="Add the posts, videos or emails this campaign will publish." />}
              columns={[
                { key: "t", label: "Content", primary: true, className: "w-[38%]", render: (i) => <button type="button" className="truncate text-left font-medium hover:underline" onClick={() => setOpenId(i.id)}>{i.title}</button> },
                { key: "ch", label: "Channel", className: "w-28", render: (i) => <span className="text-xs">{i.channel ?? "—"}</span> },
                { key: "s", label: "Status", className: "w-32", render: (i) => <StatusBadge value={i.status} /> },
                { key: "o", label: "Creator", className: "w-28", hideOnMobile: true, render: (i) => personLabel(people, i.creator_person_id ?? i.owner_person_id) },
                { key: "d", label: "Publish", className: "w-28", render: (i) => { const r = i.status !== "Published" ? relativeDue(i.planned_publish_date) : null; return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{fmtDate(i.actual_publish_date ?? i.planned_publish_date)}</span>; } },
              ]} />
          </Section>
          <Section title="Events"><LinkedEvents type="campaign" id={camp.id} company={camp.company_code} defaults={{ category: "Campaign", project_id: camp.project_id, timeline_item_id: camp.timeline_item_id }} /></Section>
          <Section title="Documents"><LinkedDocuments type="campaign_plan" id={camp.id} /></Section>
          <EntityFeed type="campaign_plan" id={camp.id} />
        </div>
        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Owner", value: personLabel(people, camp.owner_person_id) },
              { label: "Project", value: links.data?.project ? <Link className="underline" href={`/os/projects/${links.data.project.id}`}>{links.data.project.name}</Link> : camp.project_id ?? "—" },
              { label: "Timeline milestone", value: links.data?.milestone ? <Link className="underline" href={`/os/timeline/${links.data.milestone.id}`}>{links.data.milestone.is_major ? "◆ " : ""}{links.data.milestone.title} ({fmtDate(links.data.milestone.due_date)})</Link> : camp.timeline_item_id ?? "—" },
              { label: "Division", value: camp.division_id ? dir?.divisionById.get(camp.division_id)?.name ?? camp.division_id : "—" },
              { label: "Sensitivity", value: <StatusBadge value={camp.sensitivity} /> },
            ]} />
          </section>
        </aside>
      </div>
      <RecordSheet open={editing} title={`${camp.id} ${camp.name}`} table="os_campaigns" record={camp} fields={campaignFields} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); c.reload(); }} />
      <RecordSheet open={adding || !!editingItem} title={editingItem ? `${editingItem.id} ${editingItem.title}` : "New content item"} table="os_campaign_items" record={editingItem}
        defaults={{ company_code: camp.company_code, status: "Planned", division_id: camp.division_id ?? "DIV-03", campaign_id: camp.id }} fields={contentFields(campOpts)}
        onClose={() => { setAdding(false); setOpenId(null); }} onSaved={() => { setAdding(false); setOpenId(null); content.reload(); }} />
    </div>
  );
}
