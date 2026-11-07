"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { Notice, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { describeDevice } from "@/lib/os/device";
import { ROLE_LABEL, type OsLoginEvent } from "@/lib/os/types";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "");

// My account: your own Company OS sessions (only yours: os_login_history returns nothing about anyone else) and
// two-step verification (Supabase Auth TOTP), which founders need for Admin.
export default function AccountPage() {
  const { me, supabase, reload } = useOsMe();
  const [events, setEvents] = useState<OsLoginEvent[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data: s }, h] = await Promise.all([supabase.auth.getSession(), supabase.rpc("os_login_history", { p_limit: 200 })]);
    try {
      const token = s.session?.access_token?.split(".")[1];
      setCurrent(token ? JSON.parse(atob(token.replace(/-/g, "+").replace(/_/g, "/"))).session_id ?? null : null);
    } catch { setCurrent(null); }
    if (h.error) return setMsg({ ok: false, text: h.error.message });
    setEvents(((h.data as OsLoginEvent[]) ?? []).filter((e) => e.user_id === me.person.user_id));
  }, [supabase, me.person.user_id]);
  useEffect(() => { load(); }, [load]);

  const revoke = async (sessionId: string) => {
    const { error } = await supabase.rpc("os_revoke_session", { p_session: sessionId, p_reason: "Signed out by the account owner from My account" });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "That session has been signed out." });
    load();
  };
  const revokeOthers = async () => {
    const others = (events ?? []).filter((e) => e.active && e.session_id && e.session_id !== current);
    for (const e of others) await supabase.rpc("os_revoke_session", { p_session: e.session_id, p_reason: "Signed out by the account owner (all other sessions)" });
    setMsg({ ok: true, text: others.length ? `Signed out ${others.length} other session${others.length > 1 ? "s" : ""}.` : "No other active sessions." });
    load();
  };

  const active = (events ?? []).filter((e) => e.active);

  return (
    <div className="space-y-8">
      <PageHeader title="My account" description={`${me.person.full_name} · ${ROLE_LABEL[me.person.org_role]} · ${me.person.google_account ?? ""}`} />
      {msg && <p role="status" className={msg.ok ? "text-[#0B6E64]" : "text-[#A23B3D]"}>{msg.text}</p>}

      <TwoStep onChange={reload} />

      <section aria-label="My sessions">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Where you&apos;re signed in</h2>
          {active.length > 1 && <button type="button" className={btnSecondary} onClick={revokeOthers}>Sign out all other sessions</button>}
        </div>
        {!events ? <p className="text-[#2F4157]/70">Loading…</p> : events.length === 0 ? <p className="text-[#2F4157]/70">No sign-ins recorded yet.</p> : (
          <ul className="space-y-2">
            {events.slice(0, 50).map((e) => (
              <li key={e.id} className={cn(card, "flex flex-wrap items-center gap-3 p-4")} data-testid="my-session">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{describeDevice({ browser: e.browser ?? "Unknown", browserVersion: e.browser_version, os: e.os ?? "Unknown", deviceType: e.device_type ?? "unknown" })}
                    {e.session_id && e.session_id === current && <span className={cn(tag, "ml-2 bg-[#E7F6F3] text-[#0B6E64]")}>This browser</span>}</p>
                  <p className="text-sm text-[#2F4157]/60">{fmt(e.at)} · {e.ip ?? "IP unknown"}{e.city || e.country ? ` · ${[e.city, e.country].filter(Boolean).join(", ")}` : ""}
                    {!e.success ? " · refused" : e.active ? " · active" : e.revoked_reason ? ` · ${e.revoked_reason}` : " · ended"}</p>
                </div>
                {e.active && e.session_id && e.session_id !== current && (
                  <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-sm")} onClick={() => revoke(e.session_id!)}>Sign out</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-[#2F4157]/60">Devices are approximate (browser and operating system), and locations come from the IP address. Sessions last at most 12 hours.</p>
      </section>
    </div>
  );
}

function TwoStep({ onChange }: { onChange: () => void }) {
  const { supabase, me } = useOsMe();
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string; status: string }[] | null>(null);
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []).filter((f) => f.status === "verified"));
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const start = async () => {
    // Drop any half-finished enrolment first; Supabase refuses a second unverified factor with the same name.
    const { data: all } = await supabase.auth.mfa.listFactors();
    for (const f of all?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Company OS ${new Date().toISOString().slice(0, 10)}` });
    if (error || !data) return setMsg({ ok: false, text: error?.message ?? "Could not start setup." });
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrol) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrol.id, code: code.trim() });
    if (error) return setMsg({ ok: false, text: "That code didn't work. Check the time on your phone and try again." });
    setEnrol(null); setCode("");
    setMsg({ ok: true, text: "Two-step verification is on. You'll be asked for a code each time you sign in." });
    await load();
    onChange();
  };

  return (
    <section aria-label="Two-step verification" className={cn(card, "p-6")}>
      <h2 className="text-xl font-bold">Two-step verification</h2>
      {msg && <p role="status" className={cn("mt-2", msg.ok ? "text-[#0B6E64]" : "text-[#A23B3D]")}>{msg.text}</p>}
      {factors === null ? <p className="mt-2 text-[#2F4157]/70">Loading…</p> : factors.length > 0 ? (
        <p className="mt-2 text-[#2F4157]/80">On. Each sign-in asks for a code from your authenticator app{me.person.org_role === "founder" ? ", which Admin requires" : ""}. Lost your phone? A founder can remove the old factor in the Supabase dashboard (Authentication, Users) so you can set it up again.</p>
      ) : enrol ? (
        <form onSubmit={verify} className="mt-4 grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Supabase returns the QR code as an SVG data URL generated on its server. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl border border-[#E3E7ED] bg-white p-2" />
          <div className="space-y-3">
            <p>Scan the code with Google Authenticator, Microsoft Authenticator, 1Password or similar. Can&apos;t scan? Enter this key: <code className="break-all rounded bg-[#F1F4F8] px-1">{enrol.secret}</code></p>
            <label className={labelClass} htmlFor="mfa-new">6-digit code from the app</label>
            <input id="mfa-new" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className={cn(inputClass, "max-w-[12rem] tracking-[0.3em]")}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <div className="flex gap-3"><button type="submit" className={btnPrimary}>Turn on</button>
              <button type="button" className={btnSecondary} onClick={() => setEnrol(null)}>Cancel</button></div>
          </div>
        </form>
      ) : (
        <div className="mt-3 space-y-3">
          {me.needsMfa && <Notice>Admin needs this. Founders can&apos;t manage people or sessions until it&apos;s on.</Notice>}
          <p className="text-[#2F4157]/80">Adds a code from an authenticator app to every Company OS sign-in, so a stolen Google session alone isn&apos;t enough.</p>
          <button type="button" className={btnPrimary} onClick={start}>Set up two-step verification</button>
        </div>
      )}
    </section>
  );
}
