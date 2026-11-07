"use client";

// Documents linked to a record (project, task, meeting, partnership ...). Linking needs access to both sides; the
// database checks it. Opening a file goes to Google Drive, where Drive's own sharing decides whether it opens.
import Link from "next/link";
import { useState } from "react";
import { ExternalLink, FileText, Link2, X } from "lucide-react";
import { friendlyError, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { ErrorLine, Select, StatusBadge, btn, btnGhost, muted, ring } from "./ui";
import { cn } from "@/lib/utils";

type Doc = { id: string; title: string; doc_type: string; status: string; drive_url: string | null };

export function LinkedDocuments({ type, id }: { type: string; id: string }) {
  const { supabase } = useOsMe();
  const links = useQuery<{ document_id: string; os_documents: Doc | null }[]>(
    (s) => s.from("os_document_links").select("document_id, os_documents(id, title, doc_type, status, drive_url)").eq("entity_type", type).eq("entity_id", id) as never, [type, id]);
  const all = useQuery<Doc[]>((s) => s.from("os_documents").select("id, title, doc_type, status, drive_url").not("status", "eq", "Archived").order("title").limit(500), []);
  const [pick, setPick] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const linked = (links.data ?? []).map((l) => l.os_documents).filter(Boolean) as Doc[];
  const linkedIds = new Set(linked.map((d) => d.id));

  async function add() {
    if (!pick) return;
    setErr(null);
    const { error } = await supabase.from("os_document_links").insert({ document_id: pick, entity_type: type, entity_id: id });
    if (error) return setErr(friendlyError(error.message));
    setPick(""); links.reload();
  }
  async function remove(docId: string) {
    const { error } = await supabase.from("os_document_links").delete().eq("document_id", docId).eq("entity_type", type).eq("entity_id", id);
    if (error) setErr(friendlyError(error.message)); else links.reload();
  }

  return (
    <div data-testid="os-linked-docs">
      <ErrorLine message={err} />
      {linked.length ? (
        <ul className="divide-y divide-[#F0F2F5] rounded-lg border border-[#E6E9EE]">
          {linked.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <FileText size={15} className="shrink-0 text-[#66768A]" aria-hidden="true" />
              <Link href={`/os/documents/${d.id}`} className={cn("min-w-0 flex-1 truncate font-medium hover:underline", ring, "rounded")}>{d.title}</Link>
              <StatusBadge value={d.status} />
              {d.drive_url && <a href={d.drive_url} target="_blank" rel="noopener noreferrer" className={btnGhost} aria-label={`Open ${d.title} in Google Drive`}><ExternalLink size={14} aria-hidden="true" /></a>}
              <button type="button" className={btnGhost} onClick={() => remove(d.id)} aria-label={`Unlink ${d.title}`}><X size={14} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      ) : <p className={`text-sm ${muted}`}>No documents linked yet.</p>}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Select ariaLabel="Document to link" value={pick} onChange={setPick} placeholder="Link a document…"
          options={(all.data ?? []).filter((d) => !linkedIds.has(d.id)).map((d) => ({ value: d.id, label: `${d.id} · ${d.title}` }))} />
        <button type="button" className={btn} onClick={add} disabled={!pick}><Link2 size={14} aria-hidden="true" />Link</button>
      </div>
    </div>
  );
}
