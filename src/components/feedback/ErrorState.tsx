"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Home, LogIn, RotateCcw, WifiOff } from "lucide-react";
import ElcoActor from "@/components/brand/ElcoActorLazy";
import type { Act } from "@/components/brand/ElcoActor";
import { classifyError, type ErrorKind } from "@/lib/errorKind";
import { suggest } from "@/lib/didYouMean";
import { cn } from "@/lib/utils";

// One set of error and empty states for the whole site, each with Elco reacting in character. Mirrors Elco AI's
// components/feedback/ErrorState.jsx (same kinds, same poses). Kinds never get mixed up:
//   not_found    the page/resource doesn't exist (a real 404)             Elco looks around, confused
//   unavailable  it exists but can't be opened right now (403/410)        Elco thinks
//   network      the device is offline / the request never arrived        Elco shakes his head; retries when back online
//   server       our side failed (5xx/timeout); temporary                 Elco is sorry; Try again
//   session      signed out / session expired (401)                       Elco waves; Sign in again
//   empty        nothing here yet                                         Elco thinks
//   search       no results: "Did you mean …?" + clear filters + ways on  Elco explains
// No dead ends: every state offers at least one way forward.
const LOOK: Record<ErrorKind, { pose: string; act: Act; title: string; body: string }> = {
  not_found: { pose: "thinking", act: "confused", title: "We can't find that page", body: "The link may be old, or the address has a typo." },
  unavailable: { pose: "thinking", act: "think", title: "This isn't available right now", body: "It may have moved, or it isn't open for your account yet." },
  network: { pose: "neutral", act: "shake", title: "You seem to be offline", body: "Check your connection. We'll try again as soon as you're back online." },
  server: { pose: "thinking", act: "sad", title: "Something went wrong on our side", body: "It's temporary. Please try again in a moment." },
  session: { pose: "talking", act: "wave", title: "Your session has ended", body: "Sign in again to pick up where you left off." },
  empty: { pose: "thinking", act: "think", title: "Nothing here yet", body: "" },
  search: { pose: "explaining", act: "confused", title: "No results", body: "" },
};

const BTN = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";
export const stateBtnPrimary = `${BTN} bg-[#2F4157] text-white hover:bg-[#1A2534]`;
export const stateBtnSecondary = `${BTN} border border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]`;

export default function ErrorState({ kind: k, error, title, body, onRetry, actions, compact = false, children, testid, retryTestid = "state-retry" }: {
  kind?: ErrorKind; error?: unknown; title?: string; body?: string; onRetry?: () => void; actions?: ReactNode; compact?: boolean; children?: ReactNode; testid?: string; retryTestid?: string;
}) {
  const kind: ErrorKind = k || classifyError(error as never);
  const look = LOOK[kind] || LOOK.server;
  // network: retry by itself when the connection comes back
  useEffect(() => {
    if (kind !== "network" || !onRetry) return undefined;
    const f = () => onRetry();
    window.addEventListener("online", f);
    return () => window.removeEventListener("online", f);
  }, [kind, onRetry]);
  const next = typeof window !== "undefined" ? encodeURIComponent(window.location.pathname + window.location.search) : "";
  const detail = body ?? look.body;
  return (
    <div className={cn("mx-auto flex max-w-[520px]", compact ? "items-center gap-5 text-left" : "flex-col items-center px-4 py-10 text-center")}
      role={kind === "empty" || kind === "search" ? "status" : "alert"} data-testid={testid || `state-${kind}`} data-kind={kind}>
      <span className={cn("flex shrink-0 items-end justify-center rounded-full bg-[#EEF2F6]", compact ? "h-[72px] w-[72px]" : "h-[144px] w-[144px]")}>
        <ElcoActor pose={look.pose} act={look.act} react style={{ height: compact ? 64 : 130 }} testid="state-elco" />
      </span>
      <div className={compact ? "min-w-0" : "mt-5"}>
        <h2 className={cn("flex items-center gap-2 text-[22px] font-bold leading-snug text-[#1A2534]", !compact && "justify-center")}>
          {kind === "network" && <WifiOff size={20} aria-hidden="true" />}{title || look.title}
        </h2>
        {detail && <p className="mt-2 text-[16px] leading-relaxed text-[#2F4157]/75">{detail}</p>}
        {children}
        <div className={cn("mt-5 flex flex-wrap gap-3", !compact && "justify-center")}>
          {onRetry && (kind === "server" || kind === "network") && (
            <button type="button" onClick={onRetry} className={stateBtnPrimary} data-testid={retryTestid}><RotateCcw size={16} aria-hidden="true" />Try again</button>
          )}
          {kind === "session" && <Link href={`/sign-in?next=${next}`} className={stateBtnPrimary} data-testid="state-signin"><LogIn size={16} aria-hidden="true" />Sign in again</Link>}
          {actions}
        </div>
      </div>
    </div>
  );
}

/** Back + Home: the default ways out of a not-found or unavailable page. */
export function WayOut({ home = "/", homeLabel = "Go to the homepage" }: { home?: string; homeLabel?: string }) {
  return (
    <>
      <button type="button" onClick={() => window.history.back()} className={`${stateBtnSecondary}`} data-testid="state-back"><ArrowLeft size={16} aria-hidden="true" />Go back</button>
      <Link href={home} className={stateBtnPrimary} data-testid="state-home"><Home size={16} aria-hidden="true" />{homeLabel}</Link>
    </>
  );
}

/**
 * Nothing here yet, with a next step. <EmptyPanel title="No saved items" body="…" action={<Link …/>} />
 */
export function EmptyPanel({ title, body, actions, children, compact }: { title?: string; body?: string; actions?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return <ErrorState kind="empty" title={title} body={body} actions={actions} compact={compact} testid="empty-state">{children}</ErrorState>;
}

/**
 * No search results: "Did you mean …?" from the page's own terms, a clear-filters action and ways on.
 * <SearchEmpty query={q} terms={titles} onPick={setQ} onClear={() => { setQ(""); setFilter("all"); }} actions={<Link …/>} />
 */
export function SearchEmpty({ query, terms = [], onPick, onClear, hint, actions, clearLabel = "Clear search and filters" }: {
  query?: string; terms?: Iterable<string | null | undefined>; onPick?: (q: string) => void; onClear?: () => void; hint?: string; actions?: ReactNode; clearLabel?: string;
}) {
  const q = (query || "").trim();
  const symbolsOnly = q.length > 0 && q.replace(/[^\p{L}\p{N}]/gu, "").length === 0;
  const ideas = q && !symbolsOnly ? suggest(q, terms, 3) : [];
  return (
    <ErrorState kind="search" testid="search-empty" title={symbolsOnly ? "Try letters or numbers" : q ? `No results for “${q}”` : "No results"}
      body={symbolsOnly ? "That search only has symbols in it." : hint || "Check the spelling, try a shorter word, or clear the filters."}
      actions={<>{onClear && <button type="button" onClick={onClear} className={stateBtnSecondary} data-testid="search-clear">{clearLabel}</button>}{actions}</>}>
      {ideas.length > 0 && (
        <p className="mt-3 text-[16px] text-[#1A2534]" data-testid="did-you-mean">
          Did you mean{" "}
          {ideas.map((w, i) => (
            <span key={w}>
              {i > 0 && (i === ideas.length - 1 ? " or " : ", ")}
              <button type="button" onClick={() => onPick?.(w)} className="font-semibold text-[#2F4157] underline underline-offset-2 hover:text-[#1A2534]">{w}</button>
            </span>
          ))}
          ?
        </p>
      )}
    </ErrorState>
  );
}
