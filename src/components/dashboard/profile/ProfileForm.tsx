"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { BasicFields, LinkFields } from "./ProfileFields";
import { GoalFields } from "./GoalFields";
import { PrivacyFields } from "./PrivacyFields";
import { MemberCard } from "../MemberCard";
import { normalizeUrl, toPublicPreview } from "@/lib/dashboard/profile";
import type { MemberProfile } from "@/lib/dashboard/types";
import { btnPrimary, card } from "../ui";
import { cn } from "@/lib/utils";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(card, "scroll-mt-24 p-6 md:p-8")}>
      <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
      {description && <p className="mb-6 mt-1 text-base text-[#2F4157]/65">{description}</p>}
      {!description && <div className="mb-6" />}
      {children}
    </section>
  );
}

export function ProfileForm({ initial, onSave }: { initial: MemberProfile; onSave: (p: MemberProfile) => Promise<unknown> }) {
  const [profile, setProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (patch: Partial<MemberProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setMessage(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.display_name.trim()) {
      setMessage({ ok: false, text: "Please add a display name." });
      return;
    }
    setSaving(true);
    const cleaned: MemberProfile = {
      ...profile,
      display_name: profile.display_name.trim(),
      linkedin_url: normalizeUrl(profile.linkedin_url),
      instagram_url: normalizeUrl(profile.instagram_url, "instagram"),
      portfolio_url: normalizeUrl(profile.portfolio_url),
      onboarding_completed_at: profile.onboarding_completed_at ?? (profile.direction ? new Date().toISOString() : null),
    };
    try {
      await onSave(cleaned);
      setProfile(cleaned);
      setMessage({ ok: true, text: "Profile saved." });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-6">
        <Section id="about" title="About you"><BasicFields profile={profile} set={set} /></Section>
        <Section id="goals" title="Goals & interests" description="Used to recommend resources and people. Change them any time.">
          <GoalFields profile={profile} set={set} />
        </Section>
        <Section id="links" title="Links" description="Add a LinkedIn link so members can connect with you. There's no chat inside IELS.">
          <LinkFields profile={profile} set={set} />
        </Section>
        <Section id="privacy" title="Privacy & directory"><PrivacyFields profile={profile} set={set} /></Section>
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-24">
        <p className="text-base font-semibold text-[#2F4157]/70">{profile.is_public ? "How others see you" : "Preview (currently hidden)"}</p>
        <MemberCard member={toPublicPreview(profile)} />
        <button type="submit" data-testid="profile-save-button" disabled={saving} className={cn(btnPrimary, "w-full scroll-mb-28 md:scroll-mb-0")}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} data-testid="profile-save-message" className={cn("flex items-center gap-2 text-base", message.ok ? "text-[#577E90]" : "text-[#E56668]")}>
            {message.ok && <CheckCircle2 size={16} />} {message.text}
          </p>
        )}
      </aside>
    </form>
  );
}
