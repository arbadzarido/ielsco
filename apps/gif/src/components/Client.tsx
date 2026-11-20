"use client";
// Small client islands: countdown, currency toggle, analytics consent + tracking.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// ── Countdown ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function Countdown({ to, label, done }: { to: string; label: string; done?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const target = new Date(to).getTime();
  if (now === null) return <div className="countdown" aria-live="off"><span>{label}</span></div>;
  const ms = target - now;
  if (ms <= 0) return <div className="countdown"><span>{done ?? label}</span></div>;
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return (
    <div className="countdown" role="timer" aria-label={`${label}: ${d} days, ${h} hours and ${m} minutes left`}>
      <span>{label}</span>
      <span className="units" aria-hidden="true"><b>{d}</b><span>days</span> <b>{h}</b><span>hrs</span> <b>{m}</b><span>min</span></span>
    </div>
  );
}

// The next deadline that hasn't passed yet (chosen in the browser, so static pages stay correct over the months).
export function NextDeadline({ items }: { items: { to: string; label: string }[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const next = items.find((i) => new Date(i.to).getTime() > (now ?? 0));
  if (!next) return null;
  return <Countdown to={next.to} label={next.label} />;
}

// ── Currency ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Indonesian citizens see IDR, everyone else USD. The default follows the visitor's country (a guess); the toggle lets
// them choose by citizenship. The application itself uses the nationality given, not this toggle.
type Cur = "IDR" | "USD";
const CurCtx = createContext<{ cur: Cur; set: (c: Cur) => void }>({ cur: "USD", set: () => {} });
export function CurrencyProvider({ initial, children }: { initial: Cur; children: ReactNode }) {
  const [cur, setCur] = useState<Cur>(initial);
  useEffect(() => {
    try {
      const v = localStorage.getItem("gif_cur");
      if (v === "IDR" || v === "USD") { setCur(v); return; }
      // gif_cc is set by the proxy from the edge's country header (a default only; the visitor can switch).
      if (/(?:^|;\s*)gif_cc=ID(?:;|$)/.test(document.cookie)) setCur("IDR");
    } catch {}
  }, []);
  const set = useCallback((c: Cur) => { setCur(c); try { localStorage.setItem("gif_cur", c); } catch {} }, []);
  const value = useMemo(() => ({ cur, set }), [cur, set]);
  return <CurCtx.Provider value={value}>{children}</CurCtx.Provider>;
}
const fmt = (n: number, c: Cur) => `${c} ${new Intl.NumberFormat("en-US").format(n)}`;
export function Price({ idr, usd }: { idr: number; usd: number }) {
  const { cur } = useContext(CurCtx);
  return <>{cur === "IDR" ? fmt(idr, "IDR") : fmt(usd, "USD")}</>;
}
export function CurrencyToggle() {
  const { cur, set } = useContext(CurCtx);
  return (
    <fieldset className="btn-row" style={{ gap: 6 }}>
      <legend className="small" style={{ marginBottom: 6 }}>Show prices for</legend>
      <label className="option" style={{ padding: "8px 12px" }}><input type="radio" name="cur" checked={cur === "IDR"} onChange={() => set("IDR")} /> Indonesian citizens (IDR)</label>
      <label className="option" style={{ padding: "8px 12px" }}><input type="radio" name="cur" checked={cur === "USD"} onChange={() => set("USD")} /> International (USD)</label>
    </fieldset>
  );
}

// ── Analytics consent and events ─────────────────────────────────────────────────────────────────────────────────────
const KEY = "gif_analytics_consent";
function sid(): string {
  try {
    let v = localStorage.getItem("gif_sid");
    if (!v) { v = crypto.randomUUID(); localStorage.setItem("gif_sid", v); }
    return v;
  } catch { return ""; }
}
export function track(event: string, props: Record<string, string> = {}) {
  try {
    if (localStorage.getItem(KEY) !== "yes") return;
    const body = JSON.stringify({ event, path: location.pathname, sid: sid(), ...props });
    navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" })) || fetch("/api/analytics", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {}
}

export function Analytics() {
  const path = usePathname();
  const [ask, setAsk] = useState(false);
  useEffect(() => { try { setAsk(localStorage.getItem(KEY) === null); } catch {} }, []);
  useEffect(() => { track("page_view"); }, [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
      if (el) track(el.dataset.track!, el.dataset.pathway ? { pathway: el.dataset.pathway } : {});
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  const choose = (v: "yes" | "no") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setAsk(false);
    fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: v === "yes" }) }).catch(() => {});
    if (v === "yes") track("page_view");
  };
  if (!ask) return null;
  return (
    <div className="cookie" role="dialog" aria-label="Analytics cookies">
      <p style={{ marginBottom: 12 }}>May we count anonymous visits and clicks (such as &ldquo;Apply&rdquo;) to improve this site? No advertising, no IP addresses stored. Essential sign-in cookies are always on. <a href="/privacy-policy">Privacy Policy</a></p>
      <div className="btn-row">
        <button className="btn btn-primary btn-sm" onClick={() => choose("yes")}>Allow analytics</button>
        <button className="btn btn-secondary btn-sm" onClick={() => choose("no")}>Decline</button>
      </div>
    </div>
  );
}
