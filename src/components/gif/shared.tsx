"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Clock, Trash2, User, Users } from "lucide-react";
import { ACCENTS } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { STATUS_ACCENT, STATUS_LABEL, retentionInfo, type DisplayStatus, type SubmissionFile, type SubmissionType } from "@/lib/gif/portal";

export function StatusPill({ status, className, testId }: { status: DisplayStatus; className?: string; testId?: string }) {
  const a = ACCENTS[STATUS_ACCENT[status]];
  return (
    <span data-testid={testId} data-status={status}
      className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold", a.soft, a.text, className)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", status === "not_started" ? "bg-[#2F4157]/40" : "bg-current")} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: SubmissionType }) {
  const Icon = type === "group" ? Users : User;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E3E7ED] bg-white px-2.5 py-1 text-[13px] font-medium text-[#2F4157]/80">
      <Icon size={13} aria-hidden="true" /> {type === "group" ? "Group" : "Individual"}
    </span>
  );
}

export function RetentionBadge({ file, admin = false }: { file: SubmissionFile; admin?: boolean }) {
  const r = retentionInfo(file);
  if (!r) return null;
  if (r.state === "deleted") return <span className="rounded-full bg-[#F1F4F8] px-2 py-0.5 text-[12px] font-medium text-[#2F4157]/70">Removed after 7 days</span>;
  if (r.state === "expired") return <span className="rounded-full bg-[#FDEDED] px-2 py-0.5 text-[12px] font-semibold text-[#B4383A]">Expired · deleting at next cleanup</span>;
  const label = r.hoursLeft >= 48 ? `${Math.floor(r.hoursLeft / 24)} days left` : `${r.hoursLeft} h left`;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
      r.state === "warning" ? "bg-[#FDF3E3] text-[#8A5A00]" : "bg-[#F1F4F8] text-[#2F4157]/70")}>
      <Clock size={11} aria-hidden="true" /> {admin && r.state === "warning" ? "Expires soon · " : ""}{label}
    </span>
  );
}

// Signed URLs for private files, created with the viewer's own session (storage RLS decides).
export function useSignedUrls(supabase: SupabaseClient, files: SubmissionFile[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = files.filter((f) => !f.deleted_at).map((f) => f.id).join(",");
  useEffect(() => {
    let alive = true;
    const live = files.filter((f) => !f.deleted_at);
    if (!live.length) { setUrls({}); return; }
    (async () => {
      const out: Record<string, string> = {};
      for (const bucket of ["gif-story-proofs", "gif-submission-files"] as const) {
        const list = live.filter((f) => f.bucket === bucket);
        if (!list.length) continue;
        const { data } = await supabase.storage.from(bucket).createSignedUrls(list.map((f) => f.storage_path), 3600);
        data?.forEach((d, i) => { if (d.signedUrl) out[list[i].id] = d.signedUrl; });
      }
      if (alive) setUrls(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, key]);
  return urls;
}

export function FileTile({ file, url, onRemove, admin = false }: { file: SubmissionFile; url?: string; onRemove?: () => void; admin?: boolean }) {
  const isImage = file.mime_type.startsWith("image/");
  const gone = !!file.deleted_at;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E3E7ED] bg-white p-2.5" data-testid="gif-file-tile">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F7F8FA] text-[11px] font-semibold uppercase text-[#2F4157]/60">
        {gone ? "Removed" : isImage && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.description || "Uploaded screenshot"} className="h-full w-full object-cover" />
        ) : (file.mime_type.split("/").pop() || "file").slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-[#2F4157]">{file.original_name || "Upload"}</p>
        {file.description && <p className="line-clamp-2 text-[13px] text-[#2F4157]/70">{file.description}</p>}
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#2F4157]/60">
          <span>{new Date(file.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          {file.story_day ? <span>· Day {file.story_day}</span> : null}
          <RetentionBadge file={file} admin={admin} />
          {!gone && url && <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#577E90] underline underline-offset-2">Open</a>}
        </div>
      </div>
      {onRemove && !gone && (
        <button type="button" onClick={onRemove} aria-label="Remove file"
          className="rounded-full p-2 text-[#2F4157]/50 hover:bg-[#FDEDED] hover:text-[#B4383A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90]">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label ?? "Progress"}
      className="h-2.5 overflow-hidden rounded-full bg-[#EAEFF5]">
      <div className="h-full rounded-full bg-gradient-to-r from-[#2F4157] to-[#577E90] transition-all duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
