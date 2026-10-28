"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { labels } from "@/lib/connect/options";
import type { Person } from "@/lib/connect/types";
import { SEA_FLAGS } from "@/lib/dashboard/options";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, SafetyMenu, useLoad } from "./shared";

function Row({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[#2F4157]/55">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{items.map((i) => <span key={i} className={tag}>{i}</span>)}</div>
    </div>
  );
}

function IntroForm({ ctx, person, onSent }: { ctx: DashboardCtx; person: Person; onSent: () => void }) {
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [common, setCommon] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await connectApi.sendIntro(ctx.supabase, person.id, { message, reason, common, topic });
      track("connect_intro_sent");
      onSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="intro-form" className={cn(cardGloss, "space-y-4 p-6")}>
      <div>
        <h2 className="text-xl font-bold">Send a Letter Intro</h2>
        <p className="text-base text-[#2F4157]/65">Introduce yourself. If {person.display_name} accepts, you&apos;re connected and can message each other.</p>
      </div>
      <div>
        <label htmlFor="intro-message" className={labelClass}>Your introduction *</label>
        <textarea id="intro-message" required minLength={20} maxLength={1000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className={inputClass}
          placeholder={`Hi ${person.display_name}! I'm…`} />
        <p className="mt-1 text-sm text-[#2F4157]/60">{message.trim().length}/1000 · at least 20 characters</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="intro-reason" className={labelClass}>Why would you like to connect?</label>
          <input id="intro-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="intro-common" className={labelClass}>What do you have in common?</label>
          <input id="intro-common" maxLength={200} value={common} onChange={(e) => setCommon(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="intro-topic" className={labelClass}>What would you like to talk about?</label>
          <input id="intro-topic" maxLength={200} value={topic} onChange={(e) => setTopic(e.target.value)} className={inputClass} />
        </div>
      </div>
      {error && <p role="alert" className="text-base text-[#B4383A]">{error}</p>}
      <button type="submit" disabled={busy || message.trim().length < 20} className={btnPrimary} data-testid="intro-send">{busy ? "Sending…" : "Send intro"}</button>
    </form>
  );
}

export function PersonView(ctx: DashboardCtx & { id: string }) {
  const router = useRouter();
  const data = useLoad(() => connectApi.person(ctx.supabase, ctx.id), [ctx.supabase, ctx.id]);
  const [sent, setSent] = useState(false);

  return (
    <ConnectFrame title="Member Passport">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && !data.state.data && (
        <EmptyState title="This member isn't available" body="They may have hidden their Passport, or this link is wrong." action={<Link href="/dashboard/connect/discover" className={btnPrimary}>Back to Discover</Link>} />
      )}
      {data.state.s === "ready" && data.state.data && (() => {
        const p = data.state.data;
        const relation = sent ? "request_sent" : p.relation;
        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className={cn(cardGloss, "space-y-5 p-6")} data-testid="person-detail">
              <div className="flex items-start gap-4">
                <Avatar name={p.display_name} url={p.avatar_url} size={72} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold">{p.display_name}</h2>
                  {p.origin_country && <p className="text-base">{SEA_FLAGS[p.origin_country] && <span aria-hidden="true">{SEA_FLAGS[p.origin_country]} </span>}From {p.origin_country}</p>}
                  <p className="text-sm text-[#2F4157]/60">{[p.role_status, p.country && `Lives in ${p.country}`, p.city, p.timezone].filter(Boolean).join(" · ")}</p>
                </div>
                <SafetyMenu supabase={ctx.supabase} person={p} context="profile" onBlocked={() => router.push("/dashboard/connect/discover")} />
              </div>
              {p.bio && <p className="text-base text-[#2F4157]/80">{p.bio}</p>}
              <Row title="Speaks" items={labels("language", p.languages_spoken)} />
              <Row title="Practising" items={labels("language", p.languages_learning)} />
              {p.english_level && <p className="text-base"><span className="font-semibold">English level:</span> {p.english_level} <span className="text-[#2F4157]/50">(self-reported)</span></p>}
              {p.learning_goal && <p className="text-base"><span className="font-semibold">Language goal:</span> {p.learning_goal}</p>}
              <Row title="Looking for" items={labels("goal", p.goals)} />
              <Row title="Interests" items={labels("topic", p.topics)} />
              <Row title="Activities" items={labels("activity", p.activities)} />
              {(p.availability_days.length > 0 || p.availability_times.length > 0) && (
                <p className="text-base"><span className="font-semibold">Usually free:</span> {[labels("day", p.availability_days).join(", "), labels("time", p.availability_times).join(", ").toLowerCase()].filter(Boolean).join(" · ")}</p>
              )}
              {p.status && <p className="text-sm text-[#2F4157]/60">Status: {p.status === "open" ? "open to chat" : "busy for now"}</p>}
            </section>
            <div className="space-y-4">
              {relation === "connected" && (
                <div className={cn(cardGloss, "space-y-3 p-6")}>
                  <h2 className="text-xl font-bold">You&apos;re connected</h2>
                  <Link href={`/dashboard/connect/messages/${p.id}`} className={btnPrimary} data-testid="person-message">Send a message</Link>
                </div>
              )}
              {relation === "request_sent" && (
                <div data-testid="intro-sent" className={cn(cardGloss, "space-y-3 p-6")}>
                  <h2 className="text-xl font-bold">Intro sent</h2>
                  <p className="text-base text-[#2F4157]/70">{p.display_name} will see it in their requests. You&apos;ll be connected if they accept.</p>
                  <Link href="/dashboard/connect/requests?box=outgoing" className={btnSecondary}>See sent intros</Link>
                </div>
              )}
              {relation === "request_received" && (
                <div className={cn(cardGloss, "space-y-3 p-6")}>
                  <h2 className="text-xl font-bold">{p.display_name} sent you an intro</h2>
                  <Link href="/dashboard/connect/requests" className={btnPrimary}>Answer it</Link>
                </div>
              )}
              {!relation && <IntroForm ctx={ctx} person={p} onSent={() => setSent(true)} />}
              <p className="text-sm text-[#2F4157]/55">Discover suggestions come only from shared Passport answers (languages, goals, interests, availability). IELSco doesn&apos;t use AI to rate members.</p>
            </div>
          </div>
        );
      })()}
    </ConnectFrame>
  );
}
