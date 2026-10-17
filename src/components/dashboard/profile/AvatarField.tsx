"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Check, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_TYPES, avatarFileError, prepareAvatar, removeAvatar, uploadAvatar } from "@/lib/dashboard/avatar";
import type { MemberProfile } from "@/lib/dashboard/types";
import { Avatar } from "../Avatar";
import { btnPrimary, btnSecondary, focusRing, labelClass } from "../ui";
import { cn } from "@/lib/utils";

type Phase = "idle" | "preparing" | "preview" | "saving" | "removing";

// Profile photo: choose → preview → save (saved straight away, separately from the rest of the form), or go back to
// the default avatar. `onChange` keeps the form's copy of avatar_url in sync so a later "Save profile" keeps it.
export function AvatarField({ profile, onChange }: { profile: MemberProfile; onChange: (url: string | null) => void }) {
  const [supabase] = useState(() => createClient());
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [prepared, setPrepared] = useState<{ blob: Blob; ext: "webp" | "jpg" } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const reset = () => {
    setPrepared(null);
    setPreview(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    const bad = avatarFileError(file);
    if (bad) {
      setError(bad);
      e.target.value = "";
      return;
    }
    setPhase("preparing");
    try {
      const p = await prepareAvatar(file);
      setPrepared(p);
      setPreview(URL.createObjectURL(p.blob));
      setPhase("preview");
    } catch {
      setError("We couldn't read that image. Please try another file.");
      reset();
    }
  };

  const save = async () => {
    if (!prepared) return;
    setPhase("saving");
    setError(null);
    try {
      const url = await uploadAvatar(supabase, profile, prepared);
      onChange(url);
      setStatus("Profile photo updated.");
      reset();
    } catch (e) {
      setError((e as Error).message || "Upload failed. Please try again.");
      setPhase("preview");
    }
  };

  const remove = async () => {
    setPhase("removing");
    setError(null);
    try {
      await removeAvatar(supabase, profile);
      onChange(null);
      setStatus("Default avatar restored.");
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Please try again.");
    }
    setPhase("idle");
  };

  const busy = phase === "preparing" || phase === "saving" || phase === "removing";
  return (
    <div data-testid="profile-avatar-field">
      <p className={labelClass}>Profile photo</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[96px] w-[96px] shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview of your new profile photo" className="h-[96px] w-[96px] rounded-full object-cover ring-2 ring-[#577E90] ring-offset-2" data-testid="profile-avatar-preview" />
          ) : (
            <Avatar name={profile.display_name || "IELS member"} url={profile.avatar_url} size={96} className="bg-[#304156] text-white" />
          )}
          {busy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70"><Loader2 className="h-[24px] w-[24px] animate-spin text-[#2F4157]" aria-hidden="true" /></span>}
        </div>
        <div className="min-w-0 flex-1">
          <input ref={inputRef} id="profile-avatar-file" type="file" accept={AVATAR_TYPES.join(",")} className="sr-only" onChange={pick} disabled={busy} data-testid="profile-avatar-input" />
          {phase === "preview" || phase === "saving" ? (
            <div className="flex flex-wrap gap-[8px]">
              <button type="button" className={btnPrimary} onClick={save} disabled={busy} data-testid="profile-avatar-save">
                {phase === "saving" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
                {phase === "saving" ? "Saving…" : "Save photo"}
              </button>
              <button type="button" className={btnSecondary} onClick={reset} disabled={busy} data-testid="profile-avatar-cancel"><X size={16} aria-hidden="true" />Cancel</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-[8px]">
              <label htmlFor="profile-avatar-file" className={cn(btnSecondary, "cursor-pointer", busy && "pointer-events-none opacity-50")} data-testid="profile-avatar-choose">
                <Camera size={16} aria-hidden="true" />{profile.avatar_url ? "Change photo" : "Upload photo"}
              </label>
              {profile.avatar_url && (
                <button type="button" onClick={remove} disabled={busy} data-testid="profile-avatar-remove"
                  className={cn("inline-flex items-center gap-[8px] rounded-full px-[16px] py-2.5 text-base font-semibold text-[#C04C4E] hover:bg-[#FEF4F4] disabled:opacity-50", focusRing)}>
                  <Trash2 size={16} aria-hidden="true" />Use default avatar
                </button>
              )}
            </div>
          )}
          <p className="mt-[8px] text-[14px] text-[#2F4157]/60">
            {phase === "preview" ? "This is how your photo will look. Save to use it." : "JPG, PNG or WebP, up to 5 MB. We crop it to a square and remove location data."}
          </p>
          <p role="alert" className="mt-[4px] text-[14px] text-[#C04C4E]" data-testid="profile-avatar-error">{error}</p>
          <p role="status" className="text-[14px] text-[#577E90]" data-testid="profile-avatar-status">{status}</p>
        </div>
      </div>
    </div>
  );
}
