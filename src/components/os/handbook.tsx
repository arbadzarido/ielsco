"use client";

// Renders Company OS Handbook documents (src/content/os/handbook.ts): document control, sections and blocks, and the
// compact document list used on the Handbook, department, division and project pages.
import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { Badge, linkCls, muted, panel } from "@/components/os/ui";
import { HANDBOOK, type Block, type HandbookDoc } from "@/content/os/handbook";
import { cn } from "@/lib/utils";

const isFile = (href: string) => href.startsWith("/os/api/files/");

export function HandbookLink({ label, href, hint }: { label: string; href: string; hint?: string }) {
  const file = isFile(href);
  return (
    <span className="inline-flex items-center gap-1.5">
      {file ? <Download size={14} className="shrink-0 text-[#577E90]" aria-hidden="true" /> : <FileText size={14} className="shrink-0 text-[#577E90]" aria-hidden="true" />}
      {file ? <a href={href} className={linkCls} download>{label}</a> : <Link href={href} className={linkCls}>{label}</Link>}
      {hint && <span className={cn("text-xs", muted)}>· {hint}</span>}
    </span>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[#1F2D3D]">
      {blocks.map((b, i) => {
        if ("p" in b) return <p key={i}>{b.p}</p>;
        if ("note" in b) return <p key={i} className={cn("rounded-lg px-3 py-2", b.tone === "warn" ? "bg-[#FDF2F2] text-[#A12D2F]" : "bg-[#EEF4F8] text-[#2F4157]")}>{b.note}</p>;
        if ("list" in b) {
          const L = b.ordered ? "ol" : "ul";
          return <L key={i} className={cn("space-y-1 pl-5", b.ordered ? "list-decimal" : "list-disc")}>{b.list.map((x, j) => <li key={j}>{x}</li>)}</L>;
        }
        if ("links" in b) return <ul key={i} className="space-y-1.5">{b.links.map((l) => <li key={l.href + l.label}><HandbookLink {...l} /></li>)}</ul>;
        const [h, ...rows] = b.table;
        return (
          <div key={i} className="overflow-x-auto rounded-lg border border-[#E6E9EE]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>{h.map((c) => <th key={c} className="border-b border-[#DDE2E8] bg-[#F7F8FA] px-3 py-1.5 text-left text-xs font-semibold text-[#3A4B60]">{c}</th>)}</tr></thead>
              <tbody>{rows.map((r, j) => <tr key={j} className="align-top">{r.map((c, k) => <td key={k} className={cn("border-b border-[#EEF1F5] px-3 py-1.5", k === 0 && "font-medium")}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

export function DocControl({ doc }: { doc: HandbookDoc }) {
  const items = [["Reference", doc.ref], ["Type", doc.kind], ["Version", doc.version], ["Status", doc.status], ["Owner", doc.owner], ["Approver", doc.approver], ["Effective", doc.effective], ["Review by", doc.review]];
  return (
    <dl className={cn(panel, "grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-sm md:grid-cols-4")} data-testid="os-doc-control">
      {items.map(([k, v]) => <div key={k} className="min-w-0"><dt className={cn("text-xs", muted)}>{k}</dt><dd className="truncate font-medium text-[#1F2D3D]" title={v}>{v}</dd></div>)}
    </dl>
  );
}

export function HandbookDocument({ doc }: { doc: HandbookDoc }) {
  return (
    <article className="space-y-5" data-testid="os-handbook-doc">
      <DocControl doc={doc} />
      {doc.sections.map((s) => (
        <section key={s.heading} className={cn(panel, "p-4 md:p-5")}>
          <h2 className="mb-3 text-base font-semibold text-[#1F2D3D]">{s.heading}</h2>
          <Blocks blocks={s.blocks} />
        </section>
      ))}
    </article>
  );
}

/** A compact list of handbook documents, filtered. */
export function HandbookList({ filter, empty = "No documents yet." }: { filter: (d: HandbookDoc) => boolean; empty?: string }) {
  const docs = HANDBOOK.filter(filter);
  if (!docs.length) return <p className={cn("text-sm", muted)}>{empty}</p>;
  return (
    <ul className={cn(panel, "divide-y divide-[#EEF1F5]")} data-testid="os-handbook-list">
      {docs.map((d) => (
        <li key={d.slug} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <Link href={`/os/handbook/${d.slug}`} className={cn(linkCls, "min-w-0 flex-1 truncate")}>{d.title}</Link>
          <Badge>{d.kind}</Badge>
          <span className={cn("text-xs", muted)}>{d.ref} · v{d.version} · {d.status}</span>
        </li>
      ))}
    </ul>
  );
}
