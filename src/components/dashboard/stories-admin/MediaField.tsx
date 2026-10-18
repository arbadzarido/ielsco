"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ImagePlus, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { btnSecondary, focusRing } from "../ui";
import { cn } from "@/lib/utils";
import { PRIVATE_PREFIX, approveSubmissionImage, isPrivateRef, uploadStoryImage, validateImage, type SubmissionImage } from "./data";

// One image slot (banner, avatar, section image, gallery item). Values are a public URL / site path, or
// "submission://<path>" for a member's private upload that hasn't been approved yet.
export function MediaField({
  supabase, storyKey, value, onChange, signed, submissionImages = [], label, aspect = "aspect-video", compact = false,
}: {
  supabase: SupabaseClient;
  storyKey: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  signed: Record<string, string>;
  submissionImages?: SubmissionImage[];
  label: string;
  aspect?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const priv = isPrivateRef(value);
  const src = priv ? signed[value!.slice(PRIVATE_PREFIX.length)] : value;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-[6px] text-[14px] font-semibold text-[#2F4157]">{label}</p>
      <div className={cn("relative overflow-hidden rounded-[12px] border border-[#E3E7ED] bg-[#F7F8FA]", aspect, compact ? "max-w-[160px]" : "max-w-[420px]")}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[13px] text-[#2F4157]/45">{priv ? "Private image (loading…)" : "No image"}</span>
        )}
        {priv && <span className="absolute left-[6px] top-[6px] rounded-full bg-[#9A4A2E] px-[8px] py-[2px] text-[11px] font-semibold text-white">Private: not approved</span>}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="animate-spin" /></span>}
      </div>
      <div className="mt-[8px] flex flex-wrap gap-[6px]">
        <label className={cn(btnSecondary, "cursor-pointer px-3 py-1.5 text-[13px]")}>
          <ImagePlus size={14} aria-hidden="true" /> {value ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const bad = validateImage(f);
              if (bad) return setError(bad);
              run(async () => onChange(await uploadStoryImage(supabase, storyKey, f, f.type)));
            }}
          />
        </label>
        {priv && (
          <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-[13px]")} onClick={() => run(async () => onChange(await approveSubmissionImage(supabase, storyKey, value!)))}>
            <ShieldCheck size={14} aria-hidden="true" /> Approve (make public)
          </button>
        )}
        {value && (
          <button type="button" className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#B23F41] hover:bg-[#E56668]/10", focusRing)} onClick={() => onChange(null)}>
            <Trash2 size={14} aria-hidden="true" /> Remove
          </button>
        )}
        {submissionImages.length > 0 && (
          <select
            aria-label={`${label}: use a submitted photo`}
            className="rounded-full border border-[#E3E7ED] bg-white px-3 py-1.5 text-[13px]"
            value=""
            onChange={(e) => e.target.value && onChange(`${PRIVATE_PREFIX}${e.target.value}`)}
          >
            <option value="">Use submitted photo…</option>
            {submissionImages.map((im, i) => <option key={im.path} value={im.path}>Photo {i + 1}{im.note ? `: ${im.note.slice(0, 40)}` : ""}</option>)}
          </select>
        )}
      </div>
      {!priv && value && !/^https?:\/\//.test(value) && <p className="mt-[4px] text-[12px] text-[#2F4157]/50">{value}</p>}
      {error && <p role="alert" className="mt-[4px] text-[13px] text-[#B23F41]">{error}</p>}
    </div>
  );
}
