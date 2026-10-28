"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DependencyList, type ReactNode } from "react";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Avatar } from "@/components/dashboard/Avatar";
import { ErrorState, LoadingState, Notice } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, focusRing, glassMenu, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { connectApi, isUnavailable } from "@/lib/connect/api";
import { label, labels, REPORT_REASONS } from "@/lib/connect/options";
import type { Person } from "@/lib/connect/types";
import { track } from "@/lib/analytics";
import { SEA_FLAGS } from "@/lib/dashboard/options";
import { cn } from "@/lib/utils";

export type Load<T> = { s: "loading" } | { s: "unavailable" } | { s: "error"; message: string } | { s: "ready"; data: T };

// Runs `fn` on mount and whenever deps change; `reload` re-runs it without flashing the loading state.
export function useLoad<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<Load<T>>({ s: "loading" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    try {
      setState({ s: "ready", data: await run() });
    } catch (e) {
      setState(isUnavailable(e) ? { s: "unavailable" } : { s: "error", message: (e as Error).message });
    }
  }, [run]);
  useEffect(() => {
    setState({ s: "loading" });
    reload();
  }, [reload]);
  return { state, reload, setState };
}

export function UnavailableNotice() {
  return (
    <Notice testId="connect-unavailable">
      IELSco Connect isn&apos;t switched on yet: its database update is pending. Nothing you do here is saved until then.
    </Notice>
  );
}

// Standard handling of the non-ready states. Returns null when ready.
export function LoadGate<T>({ state, onRetry, label: loadingLabel }: { state: Load<T>; onRetry: () => void; label?: string }) {
  if (state.s === "loading") return <LoadingState label={loadingLabel} />;
  if (state.s === "unavailable") return <UnavailableNotice />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={onRetry} />;
  return null;
}

const TABS = [
  { href: "/dashboard/connect", label: "Home", exact: true },
  { href: "/dashboard/connect/passport", label: "Passport" },
  { href: "/dashboard/connect/discover", label: "Discover" },
  { href: "/dashboard/connect/requests", label: "Requests" },
  { href: "/dashboard/connect/messages", label: "Messages" },
  { href: "/dashboard/connect/connections", label: "Connections" },
  { href: "/dashboard/connect/quick-match", label: "Quick Match" },
  { href: "/dashboard/connect/rooms", label: "Rooms & events" },
  { href: "/dashboard/connect/safety", label: "Safety" },
];

export function ConnectFrame({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-8 md:px-6 md:py-12 lg:px-10">
      <nav aria-label="Connect sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex w-max gap-1.5 md:w-auto md:flex-wrap">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined}
                  className={cn("inline-flex rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors", focusRing,
                    active ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white text-[#2F4157]/80 hover:border-[#577E90]")}>
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">IELSco Connect</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-lg text-[#2F4157]/70">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

// Multi-select (or single-select) chip group. Native checkboxes/radios for keyboard + screen readers.
export function Chips({ legend, options, value, onChange, max, single, hint }: {
  legend: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void;
  max?: number; single?: boolean; hint?: string;
}) {
  const toggle = (v: string) => {
    if (single) return onChange(value.includes(v) ? [] : [v]);
    if (value.includes(v)) return onChange(value.filter((x) => x !== v));
    if (max && value.length >= max) return;
    onChange([...value, v]);
  };
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-sm text-[#2F4157]/60">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={cn("cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]",
              on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]",
              !on && !single && max && value.length >= max && "cursor-not-allowed opacity-50")}>
              <input type={single ? "radio" : "checkbox"} className="sr-only" checked={on} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

// Compact read-only Passport card used across Connect.
export function PersonCard({ person, reasons, footer, compact }: { person: Person; reasons?: string[]; footer?: ReactNode; compact?: boolean }) {
  const from = person.origin_country;
  const meta = [person.role_status, person.country && `Lives in ${person.country}`, person.city].filter(Boolean).join(" · ");
  return (
    <article data-testid={`person-card-${person.id}`} className={cn(card, "flex h-full flex-col p-5")}>
      <div className="mb-3 flex items-start gap-3">
        <Avatar name={person.display_name} url={person.avatar_url} size={compact ? 40 : 52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">
            <Link href={`/dashboard/connect/people/${person.id}`} className={cn("hover:underline", focusRing)}>{person.display_name}</Link>
          </h3>
          {from && <p className="text-base font-medium text-[#2F4157]/80">{SEA_FLAGS[from] && <span aria-hidden="true">{SEA_FLAGS[from]} </span>}From {from}</p>}
          {meta && <p className="text-sm text-[#2F4157]/60">{meta}</p>}
        </div>
        {person.status === "open" && <span className="rounded-full bg-[#E8F3EE] px-2 py-0.5 text-xs font-semibold text-[#2E6B4F]">Open to chat</span>}
      </div>
      {!compact && (
        <>
          {person.languages_spoken.length > 0 && <p className="text-sm"><span className="font-semibold">Speaks:</span> {labels("language", person.languages_spoken).join(", ")}</p>}
          {person.languages_learning.length > 0 && <p className="text-sm"><span className="font-semibold">Learning:</span> {labels("language", person.languages_learning).join(", ")}</p>}
          {person.english_level && <p className="text-sm"><span className="font-semibold">English:</span> {person.english_level} <span className="text-[#2F4157]/50">(self-reported)</span></p>}
          {person.bio && <p className="mt-2 line-clamp-3 text-base text-[#2F4157]/75">{person.bio}</p>}
          {person.goals.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">{person.goals.slice(0, 3).map((g) => <span key={g} className={tag}>{label("goal", g)}</span>)}</div>
          )}
        </>
      )}
      {reasons && reasons.length > 0 && (
        <ul data-testid={`person-reasons-${person.id}`} className="mt-3 space-y-0.5 text-sm font-medium text-[#577E90]">
          {reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}
        </ul>
      )}
      {footer && <div className="mt-auto flex flex-wrap gap-2 border-t border-[#E3E7ED]/60 pt-3">{footer}</div>}
    </article>
  );
}

// "…" menu with Report and Block. The dialog is a native <dialog> (focus trap + Esc built in).
export function SafetyMenu({ supabase, person, context, contextId, onBlocked }: {
  supabase: SupabaseClient; person: { id: string; display_name: string }; context: "profile" | "request" | "message" | "call" | "room";
  contextId?: string | null; onBlocked?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"report" | "block">("report");
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const show = (m: "report" | "block") => {
    setMode(m); setResult(null); setOpen(false);
    dialog.current?.showModal();
  };
  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      if (mode === "report") {
        await connectApi.report(supabase, { user: person.id, context, contextId, reason, details, block: alsoBlock });
        track("connect_report_sent", { context, reason });
        setResult({ ok: true, text: alsoBlock ? "Thanks. The IELSco team will review your report, and you've blocked this member." : "Thanks. The IELSco team will review your report." });
        if (alsoBlock) onBlocked?.();
      } else {
        await connectApi.block(supabase, person.id);
        setResult({ ok: true, text: `You've blocked ${person.display_name}. They can no longer find, contact or match with you.` });
        onBlocked?.();
      }
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button type="button" aria-label={`Safety options for ${person.display_name}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E7ED] bg-white hover:border-[#577E90]", focusRing)}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className={cn(glassMenu, "absolute right-0 z-20 mt-2 w-48 rounded-xl p-1")}>
          <button type="button" onClick={() => show("report")} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-[#F7F8FA]", focusRing)}><Flag size={15} /> Report</button>
          <button type="button" onClick={() => show("block")} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#B4383A] hover:bg-[#F7F8FA]", focusRing)}><Ban size={15} /> Block</button>
        </div>
      )}
      <dialog ref={dialog} aria-labelledby={`safety-title-${person.id}`} className="w-[min(92vw,30rem)] rounded-2xl p-0 backdrop:bg-[#2F4157]/40">
        <div className="space-y-4 p-6 text-[#2F4157]">
          <h2 id={`safety-title-${person.id}`} className="text-xl font-bold">{mode === "report" ? `Report ${person.display_name}` : `Block ${person.display_name}?`}</h2>
          {result ? (
            <p role="status" className={result.ok ? "text-base" : "text-base text-[#B4383A]"}>{result.text}</p>
          ) : mode === "report" ? (
            <>
              <p className="text-sm text-[#2F4157]/70">Only the IELSco team sees reports. {person.display_name} won&apos;t be told who reported them.</p>
              <div>
                <label htmlFor={`reason-${person.id}`} className={labelClass}>What happened?</label>
                <select id={`reason-${person.id}`} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
                  {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`details-${person.id}`} className={labelClass}>Details (optional)</label>
                <textarea id={`details-${person.id}`} value={details} maxLength={1000} rows={3} onChange={(e) => setDetails(e.target.value)} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} /> Also block this member</label>
              <p className="text-sm text-[#2F4157]/60">If someone is in immediate danger, contact local emergency services first.</p>
            </>
          ) : (
            <p className="text-base text-[#2F4157]/75">They won&apos;t be able to find you, send intros, message you, match with you in Quick Match or see your rooms. Pending intros between you are cancelled. They aren&apos;t notified. You can unblock later from Connect → Safety.</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className={btnSecondary}>{result ? "Close" : "Cancel"}</button>
            {!result && (
              <button type="button" disabled={busy} onClick={submit} className={btnPrimary}>{busy ? "Sending…" : mode === "report" ? "Send report" : "Block"}</button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
