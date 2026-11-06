"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Second step for accounts with an authenticator app (required for founders' Admin access). Supabase Auth TOTP:
// verifying upgrades this session to aal2, which the database checks on every Company OS query.
export function MfaChallenge() {
  const supabase = useMemo(() => createClient(), []);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "verifying" | "wrong" | "error">("loading");

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      const f = data?.totp?.find((x) => x.status === "verified");
      if (error || !f) return setState("error");
      setFactorId(f.id);
      setState("ready");
    });
  }, [supabase]);

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setState("verifying");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) { setState("wrong"); setCode(""); return; }
    window.location.assign("/os");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4" data-testid="os-mfa-challenge">
      <form onSubmit={verify} className="w-full max-w-sm rounded-2xl border border-[#E3E7ED] bg-white p-8">
        <ShieldCheck className="text-[#577E90]" size={28} aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold">Two-step verification</h1>
        <p className="mt-2 text-base text-[#1B2A3C]/70">Enter the 6-digit code from your authenticator app.</p>
        <label htmlFor="mfa-code" className="mt-6 block text-sm font-semibold">Code</label>
        <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} disabled={state === "loading" || state === "error"}
          className="mt-2 w-full rounded-xl border border-[#D5DBE3] px-4 py-3 text-center text-2xl tracking-[0.4em] focus:border-[#577E90] focus:outline-none" />
        {state === "wrong" && <p role="alert" className="mt-3 text-[#8A2C2E]">That code didn&apos;t work. Check the time on your phone and try again.</p>}
        {state === "error" && <p role="alert" className="mt-3 text-[#8A2C2E]">We couldn&apos;t load your verification method. Sign out and sign in again.</p>}
        <button type="submit" disabled={state !== "ready" && state !== "wrong"}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A3C] px-5 py-3 font-semibold text-white disabled:opacity-60">
          {state === "verifying" && <Loader2 className="animate-spin" size={18} aria-hidden="true" />} Verify
        </button>
      </form>
      <form action="/os/auth/signout" method="post" className="absolute bottom-8">
        <button type="submit" className="text-sm font-semibold text-[#577E90] hover:underline">Sign out</button>
      </form>
    </main>
  );
}
