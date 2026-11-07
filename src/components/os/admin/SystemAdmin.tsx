"use client";

// Admin: divisions, AI usage and budget, and integration health. Founders only; RLS enforces it.
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { friendlyError, invalidateDirectory, useDirectory, useQuery } from "../data";
import { useOsMe } from "../OsProvider";
import { PersonSelect } from "../pickers";
import { ErrorLine, Field, Loading, Section, Select, Stat, btn, btnPrimary, input, muted, panel } from "../ui";
import { fmtDateTime, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export function DivisionsAdmin() {
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  if (!dir) return <Loading />;
  async function setOwner(id: string, owner: string) {
    setErr(null); setOk(null);
    const { error } = await supabase.from("os_divisions").update({ owner_person_id: owner || null }).eq("id", id);
    if (error) setErr(friendlyError(error.message)); else { setOk("Saved."); invalidateDirectory(supabase); }
  }
  return (
    <Section title="Divisions">
      <p className={cn("mb-3 text-sm", muted)}>The seven divisions from DOC-0053. Division membership and manager flags are set per person in People & accounts. The lead here is informational.</p>
      <ErrorLine message={err} />{ok && <p role="status" className="mb-2 text-sm text-[#25633A]">{ok}</p>}
      <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
        {dir.divisions.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center">
            <span className="flex-1"><span className="font-medium">{d.name}</span> <span className={muted}>· {d.code} · {d.id}</span></span>
            <div className="sm:w-64"><PersonSelect ariaLabel={`Lead of ${d.name}`} value={d.owner_person_id ?? ""} onChange={(v) => setOwner(d.id, v)} placeholder="No lead set" /></div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

type Usage = { id: string; at: string; person_id: string | null; agent: string; model: string; status: string; input_tokens: number; output_tokens: number; cost_usd: number };
export function AiAdmin() {
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const settings = useQuery<{ monthly_budget_usd: number; enabled: boolean; routine_model: string; complex_model: string; per_person_daily_usd: number; updated_at: string } | null>((s) => s.from("os_ai_settings").select("monthly_budget_usd, enabled, routine_model, complex_model, per_person_daily_usd, updated_at").maybeSingle(), []);
  const budget = useQuery<{ budget_usd: number; spent_usd: number; enabled: boolean }[]>((s) => s.rpc("os_ai_budget"), []);
  const monthStart = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 8) + "01";
  const usage = useQuery<Usage[]>((s) => s.from("os_ai_usage").select("id, at, person_id, agent, model, status, input_tokens, output_tokens, cost_usd").gte("at", `${monthStart}T00:00:00+07:00`).order("at", { ascending: false }).limit(500), []);
  const [f, setF] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const s = settings.data;
  const b = budget.data?.[0];
  const rows = usage.data ?? [];
  const sum = (pred: (u: Usage) => boolean) => rows.filter(pred).reduce((n, u) => n + Number(u.cost_usd), 0);
  const byAgent = Array.from(new Set(rows.map((u) => u.agent))).map((a) => ({ a, cost: sum((u) => u.agent === a), calls: rows.filter((u) => u.agent === a && u.status === "settled").length }));
  const byPerson = Array.from(new Set(rows.map((u) => u.person_id ?? ""))).map((p) => ({ p, cost: sum((u) => (u.person_id ?? "") === p) })).sort((x, y) => y.cost - x.cost);
  const v = (k: string, d: unknown) => f[k] ?? String(d ?? "");

  async function save() {
    setErr(null); setOk(null);
    const patch: Record<string, unknown> = {};
    if (f.monthly_budget_usd !== undefined) patch.monthly_budget_usd = Number(f.monthly_budget_usd);
    if (f.per_person_daily_usd !== undefined) patch.per_person_daily_usd = Number(f.per_person_daily_usd);
    if (f.routine_model !== undefined) patch.routine_model = f.routine_model.trim();
    if (f.complex_model !== undefined) patch.complex_model = f.complex_model.trim();
    if (f.enabled !== undefined) patch.enabled = f.enabled === "true";
    if (patch.monthly_budget_usd !== undefined && !(Number(patch.monthly_budget_usd) >= 0 && Number(patch.monthly_budget_usd) <= 25)) return setErr("The monthly budget can be between US$0 and US$25.");
    const { data, error } = await supabase.from("os_ai_settings").update(patch).eq("id", true).select("id").maybeSingle();
    if (error || !data) return setErr(error ? friendlyError(error.message) : "Only founders can change AI settings.");
    setF({}); setOk("Saved."); settings.reload(); budget.reload();
  }

  if (!s) return <Loading />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Spent this month" value={b ? `US$${Number(b.spent_usd).toFixed(2)}` : "…"} hint="Jakarta calendar month" tone={b && b.spent_usd >= b.budget_usd * 0.8 ? "amber" : undefined} />
        <Stat label="Monthly cap" value={`US$${Number(s.monthly_budget_usd).toFixed(2)}`} hint="Hard limit; at most US$25" />
        <Stat label="Calls this month" value={rows.filter((u) => u.status === "settled").length} />
        <Stat label="Agents" value={s.enabled ? "On" : "Paused"} />
      </div>
      <Section title="Budget and models">
        <div className={cn(panel, "grid gap-4 p-4 sm:grid-cols-2")}>
          <ErrorLine message={err} />{ok && <p role="status" className="text-sm text-[#25633A] sm:col-span-2">{ok}</p>}
          <Field label="Monthly budget (US$, at most 25)">{(id) => <input id={id} inputMode="decimal" className={input} value={v("monthly_budget_usd", s.monthly_budget_usd)} onChange={(e) => setF({ ...f, monthly_budget_usd: e.target.value })} />}</Field>
          <Field label="Daily limit per person (US$)">{(id) => <input id={id} inputMode="decimal" className={input} value={v("per_person_daily_usd", s.per_person_daily_usd)} onChange={(e) => setF({ ...f, per_person_daily_usd: e.target.value })} />}</Field>
          <Field label="Routine model" hint="Used for most questions.">{(id) => <input id={id} className={input} value={v("routine_model", s.routine_model)} onChange={(e) => setF({ ...f, routine_model: e.target.value })} />}</Field>
          <Field label="Complex model" hint="Used for analysis, plans, drafts and when someone asks for a deeper answer.">{(id) => <input id={id} className={input} value={v("complex_model", s.complex_model)} onChange={(e) => setF({ ...f, complex_model: e.target.value })} />}</Field>
          <Field label="Agents">{(id) => <Select id={id} value={v("enabled", s.enabled)} onChange={(x) => setF({ ...f, enabled: x })} options={[{ value: "true", label: "On" }, { value: "false", label: "Paused" }]} />}</Field>
          <div className="flex items-end"><button type="button" className={btnPrimary} onClick={save} disabled={!Object.keys(f).length}>Save</button></div>
          <p className={cn("text-xs sm:col-span-2", muted)}>Each call reserves its worst-case cost before it runs, so the cap can&apos;t be passed. When it&apos;s reached the agents say so and everything else keeps working. Last changed {fmtDateTime(s.updated_at)}.</p>
        </div>
      </Section>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="By agent">
          <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{byAgent.map((x) => <li key={x.a} className="flex justify-between px-3 py-2"><span className="capitalize">{x.a}</span><span className="tabular-nums">{x.calls} calls · US${x.cost.toFixed(3)}</span></li>)}
            {!byAgent.length && <li className={cn("px-3 py-2", muted)}>No usage this month.</li>}</ul>
        </Section>
        <Section title="By person">
          <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{byPerson.map((x) => <li key={x.p} className="flex justify-between px-3 py-2"><span>{personLabel(dir?.peopleById ?? new Map(), x.p || null, "Removed account")}</span><span className="tabular-nums">US${x.cost.toFixed(3)}</span></li>)}
            {!byPerson.length && <li className={cn("px-3 py-2", muted)}>No usage this month.</li>}</ul>
        </Section>
      </div>
    </div>
  );
}

export function HealthAdmin() {
  type Health = { checks: { key: string; label: string; ok: boolean; detail: string }[]; at: string; drive?: { configured: boolean; connected: boolean; email: string | null };
    oauth?: { client_id: string | null; client_source: string | null; has_secret: boolean; redirect_uris: Record<string, string> } };
  const [data, setData] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = () => { setErr(null); fetch("/os/api/admin/health").then(async (r) => { const j = await r.json().catch(() => ({})); if (r.ok) setData(j); else setErr(j.error ?? "The check didn't run."); }).catch(() => setErr("Couldn't reach the server.")); };
  useEffect(run, []);
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("drive");
    const words: Record<string, string> = {
      connected: "Google Drive is connected. New documents are created with that account.",
      cancelled: "Connecting Google Drive was cancelled.", expired: "The Google sign-in took too long or came from another session. Try again.",
      scope: "Google didn't grant full Drive access. Try again and allow Drive access.", failed: "Connecting Google Drive didn't work. Try again.",
      denied: "Only founders can connect Google Drive.",
    };
    if (r && words[r]) setNote(words[r]);
  }, []);
  const disconnect = async () => {
    if (!window.confirm("Disconnect Google Drive? Existing files stay in Drive; new documents can't be created until a founder connects again.")) return;
    const r = await fetch("/os/api/admin/drive/disconnect", { method: "POST" });
    if (!r.ok) setErr("Couldn't disconnect. Try again."); else { setNote("Google Drive disconnected."); run(); }
  };
  return (
    <Section title="Integration health" action={<button type="button" className={btn} onClick={run}>Check again</button>}>
      <ErrorLine message={err} />
      {note && <p className={cn("mb-2 text-sm", muted)} role="status">{note}</p>}
      {!data ? <Loading /> : (
        <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-health">
          {data.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 px-3 py-2.5 text-sm">
              {c.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#2E7D4F]" aria-label="Working" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-[#A12D2F]" aria-label="Not working" />}
              <span className="flex-1"><span className="font-medium">{c.label}</span><span className={cn("block", muted)}>{c.detail}</span></span>
              {c.key === "drive_write" && data.drive?.configured && (
                data.drive.connected
                  ? <button type="button" className={btn} onClick={disconnect}>Disconnect</button>
                  // A full navigation to Google's consent screen, not an in-app page.
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  : <a className={btn} href="/os/api/admin/drive/connect" data-testid="os-drive-connect">Connect Google Drive</a>
              )}
            </li>
          ))}
          {data.oauth && (
            <li className="px-3 py-2.5 text-sm" data-testid="os-oauth-setup">
              <span className="font-medium">Google sign-in for Drive file creation</span>
              {data.oauth.client_id ? (
                <span className={cn("block", muted)}>
                  OAuth client <code className="break-all text-[#1F2D3D]">{data.oauth.client_id}</code> (from {data.oauth.client_source}{data.oauth.has_secret ? "" : ", secret not set"}).
                  In Google Cloud Console → APIs &amp; Services → Credentials, open this client and add this exact URI under Authorized redirect URIs:
                  <code className="mt-1 block break-all rounded bg-[#F5F7FA] px-2 py-1 text-[#1F2D3D]">{data.oauth.redirect_uris.drive}</code>
                  Without it Google answers &ldquo;Error 400: redirect_uri_mismatch&rdquo;. Reading Drive doesn&apos;t use this; the service account reads on its own.
                </span>
              ) : <span className={cn("block", muted)}>No OAuth client is configured (OS_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID).</span>}
            </li>
          )}
          <li className={cn("px-3 py-2 text-xs", muted)}>Checked {fmtDateTime(data.at)}. Elco AI&apos;s own app and database are separate and aren&apos;t checked from here.</li>
        </ul>
      )}
    </Section>
  );
}
