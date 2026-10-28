"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { AvatarField } from "@/components/dashboard/profile/AvatarField";
import { btnLink, btnPrimary, cardGloss, inputClass, labelClass } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { ACTIVITIES, DAYS, ENGLISH_LEVELS, GOALS, LANGUAGES, TIMES, TIMEZONES, TOPICS } from "@/lib/connect/options";
import type { Passport } from "@/lib/connect/types";
import { ORIGIN_OPTIONS } from "@/lib/dashboard/options";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Chips, ConnectFrame, LoadGate, useLoad } from "./shared";

export const GUIDELINES = [
  "Be kind and patient. Everyone here is practising.",
  "No harassment, hate, sexual content, scams or selling.",
  "Don't ask for money, passwords, or someone's home address.",
  "Keep personal contact details private until you trust someone.",
  "Report anything that feels wrong. Reports are confidential.",
];

function Section({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={cn(cardGloss, "space-y-5 p-6")}>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-base text-[#2F4157]/65">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function PassportEditor({ ctx, initial }: { ctx: DashboardCtx; initial: Passport }) {
  const [p, setP] = useState<Passport>(initial);
  const [acceptGuidelines, setAcceptGuidelines] = useState(initial.guidelines_accepted);
  const [confirmAdult, setConfirmAdult] = useState(initial.adult_confirmed);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [zones, setZones] = useState(TIMEZONES);
  const set = <K extends keyof Passport>(k: K, v: Passport[K]) => setP((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local && !TIMEZONES.includes(local)) setZones([local, ...TIMEZONES]);
    if (!initial.timezone && local) setP((x) => ({ ...x, timezone: local }));
  }, [initial.timezone]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const saved = await connectApi.savePassport(ctx.supabase, {
        display_name: p.display_name, origin_country: p.origin_country, country: p.country, city: p.city, timezone: p.timezone,
        bio: p.bio, english_level: p.english_level, languages_spoken: p.languages_spoken, languages_learning: p.languages_learning,
        learning_goal: p.learning_goal, topics: p.topics, activities: p.activities, goals: p.goals,
        availability_days: p.availability_days, availability_times: p.availability_times, status: p.status,
        discoverable: p.discoverable, accept_guidelines: acceptGuidelines, confirm_adult: confirmAdult,
      });
      setP(saved);
      track("connect_passport_saved", { discoverable: saved.discoverable });
      setMsg({ ok: true, text: saved.discoverable ? "Passport saved. Members can now find you in Discover." : "Passport saved. You're hidden from Discover." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="passport-form" noValidate>
      <Section title="About you" description="Your name, photo and short introduction.">
        <AvatarField profile={{ ...ctx.profile, display_name: p.display_name }} onChange={(url) => set("avatar_url", url)} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="pp-name" className={labelClass}>Display name *</label>
            <input id="pp-name" required minLength={2} maxLength={80} value={p.display_name} onChange={(e) => set("display_name", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pp-origin" className={labelClass}>Where you&apos;re from</label>
            <select id="pp-origin" value={p.origin_country ?? ""} onChange={(e) => set("origin_country", e.target.value || null)} className={inputClass}>
              <option value="">Choose…</option>
              {[...ORIGIN_OPTIONS, ...(p.origin_country && !ORIGIN_OPTIONS.includes(p.origin_country) ? [p.origin_country] : [])].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pp-country" className={labelClass}>Country you live in</label>
            <input id="pp-country" maxLength={100} value={p.country ?? ""} onChange={(e) => set("country", e.target.value || null)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="pp-city" className={labelClass}>City or region (optional)</label>
            <input id="pp-city" maxLength={80} value={p.city ?? ""} onChange={(e) => set("city", e.target.value || null)} className={inputClass} aria-describedby="pp-city-hint" />
            <p id="pp-city-hint" className="mt-1 text-sm text-[#2F4157]/60">Only your connections see this.</p>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="pp-bio" className={labelClass}>Short introduction</label>
            <textarea id="pp-bio" rows={3} maxLength={300} value={p.bio ?? ""} onChange={(e) => set("bio", e.target.value || null)} className={inputClass}
              placeholder="Hi! I'm a second-year student in Yogyakarta and I love talking about films." />
            <p className="mt-1 text-sm text-[#2F4157]/60">{(p.bio ?? "").length}/300 · Don&apos;t include phone numbers or addresses.</p>
          </div>
        </div>
      </Section>

      <Section title="Languages" description="Used to suggest language-exchange partners.">
        <Chips legend="Languages you speak" hint="Up to 8" options={LANGUAGES} value={p.languages_spoken} onChange={(v) => set("languages_spoken", v)} max={8} />
        <Chips legend="Languages you want to practise" hint="Up to 5" options={LANGUAGES} value={p.languages_learning} onChange={(v) => set("languages_learning", v)} max={5} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="pp-level" className={labelClass}>English level (self-reported)</label>
            <select id="pp-level" value={p.english_level ?? ""} onChange={(e) => set("english_level", e.target.value || null)} className={inputClass}>
              <option value="">Prefer not to say</option>
              {ENGLISH_LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pp-goal" className={labelClass}>Language goal (optional)</label>
            <input id="pp-goal" maxLength={200} value={p.learning_goal ?? ""} onChange={(e) => set("learning_goal", e.target.value || null)} className={inputClass} placeholder="Speak confidently in job interviews" />
          </div>
        </div>
      </Section>

      <Section title="Interests and goals">
        <Chips legend="What you're looking for" options={GOALS} value={p.goals} onChange={(v) => set("goals", v)} max={7} />
        <Chips legend="Interests" hint="Up to 10" options={TOPICS} value={p.topics} onChange={(v) => set("topics", v)} max={10} />
        <Chips legend="What you do" hint="Up to 4" options={ACTIVITIES} value={p.activities} onChange={(v) => set("activities", v)} max={4} />
      </Section>

      <Section title="Availability" description="Roughly when you like to chat. Times are in your own time zone.">
        <Chips legend="Days" options={DAYS} value={p.availability_days} onChange={(v) => set("availability_days", v)} />
        <Chips legend="Times" options={TIMES} value={p.availability_times} onChange={(v) => set("availability_times", v)} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="pp-tz" className={labelClass}>Time zone</label>
            <select id="pp-tz" value={p.timezone ?? ""} onChange={(e) => set("timezone", e.target.value || null)} className={inputClass}>
              <option value="">Choose…</option>
              {zones.map((z) => <option key={z}>{z}</option>)}
            </select>
            <p className="mt-1 text-sm text-[#2F4157]/60">Only your connections see this.</p>
          </div>
          <Chips legend="Status" single options={[{ value: "open", label: "Open to chat" }, { value: "busy", label: "Busy for now" }]}
            value={p.status ? [p.status] : []} onChange={(v) => set("status", (v[0] as Passport["status"]) ?? null)} />
        </div>
      </Section>

      <Section title="Visibility and safety">
        {!initial.guidelines_accepted || !initial.adult_confirmed ? (
          <div className="space-y-3">
            <p className="font-semibold">IELSco Connect guidelines</p>
            <ul className="list-disc space-y-1 pl-5 text-base text-[#2F4157]/75">{GUIDELINES.map((g) => <li key={g}>{g}</li>)}</ul>
            <label className="flex items-start gap-2 text-base"><input type="checkbox" className="mt-1" checked={acceptGuidelines} onChange={(e) => setAcceptGuidelines(e.target.checked)} /> I agree to follow the Connect guidelines.</label>
            <label className="flex items-start gap-2 text-base"><input type="checkbox" className="mt-1" checked={confirmAdult} onChange={(e) => setConfirmAdult(e.target.checked)} /> I confirm I am 18 or older. Connect is for adults because members meet people they don&apos;t know.</label>
          </div>
        ) : (
          <p className="text-base text-[#2F4157]/70">You accepted the Connect guidelines and confirmed you&apos;re 18+.</p>
        )}
        <label className="flex items-start gap-3 rounded-xl border border-[#E3E7ED] p-4">
          <input type="checkbox" data-testid="pp-discoverable" className="mt-1" checked={p.discoverable} onChange={(e) => set("discoverable", e.target.checked)} />
          <span>
            <span className="block font-semibold">Show me in Discover</span>
            <span className="block text-sm text-[#2F4157]/65">
              Members see your name, photo, languages, English level, interests, goals and availability. Where you&apos;re from, where you live, your role and
              introduction follow your <Link href="/dashboard/profile" className={btnLink}>profile privacy choices</Link>. Email, phone and links are never shown in Connect.
            </span>
          </span>
        </label>
      </Section>

      <div className="sticky bottom-20 mr-[80px] lg:mr-[88px] z-10 flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white/95 p-4 shadow-lg md:bottom-4 md:flex-row md:items-center md:justify-between">
        <p role="status" data-testid="passport-status" className={cn("text-base", msg && !msg.ok && "text-[#B4383A]")}>{msg?.text ?? "Changes are saved when you press Save."}</p>
        <button type="submit" disabled={busy} data-testid="passport-save" className={btnPrimary}>{busy ? "Saving…" : "Save Passport"}</button>
      </div>
    </form>
  );
}

export function PassportView(ctx: DashboardCtx) {
  const data = useLoad(() => connectApi.myPassport(ctx.supabase), [ctx.supabase]);
  return (
    <ConnectFrame title="IELSco Passport" description="Your Connect identity: who you are, the languages you speak and what you'd like to find here.">
      <LoadGate state={data.state} onRetry={data.reload} label="Loading your Passport…" />
      {data.state.s === "ready" && (
        <PassportEditor ctx={ctx} initial={{ ...data.state.data, display_name: data.state.data.display_name || ctx.profile.display_name }} />
      )}
    </ConnectFrame>
  );
}
