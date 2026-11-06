"use client";

import { useState } from "react";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Company OS sign-in: Google only, no sign-up, no role choice. Whether an account gets in is decided on the server
// after Google returns (app/os/auth/callback/route.ts), so every refusal reads the same and reveals nothing about
// which emails are registered.
const MESSAGES: Record<string, { tone: "error" | "info"; text: string }> = {
  denied: { tone: "error", text: "This Google account doesn't have access to Company OS. If you work at IELSco or Elco AI, ask a founder to add your work Google account, then try again." },
  signin: { tone: "error", text: "Sign-in didn't complete. Please try again." },
  cancelled: { tone: "info", text: "Sign-in was cancelled." },
  unavailable: { tone: "error", text: "Sign-in is temporarily unavailable. Please try again later." },
  expired: { tone: "info", text: "Your session ended. Please sign in again." },
};

export function OsLogin({ error, signedOut }: { error: string | null; signedOut: boolean }) {
  const [state, setState] = useState<"idle" | "redirecting" | "failed">("idle");
  const notice = state === "failed" ? MESSAGES.signin : error ? MESSAGES[error] ?? MESSAGES.signin : signedOut ? { tone: "info" as const, text: "You've signed out of Company OS." } : null;

  const signIn = async () => {
    setState("redirecting");
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/os/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (oauthError) setState("failed");
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#0E1A27] text-white md:flex-row" data-testid="os-login">
      <section className="flex flex-1 flex-col justify-between px-6 py-10 md:px-14 md:py-14">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><Lock size={18} aria-hidden="true" /></span>
          <span className="text-lg font-bold tracking-tight">Company OS</span>
        </div>
        <div className="my-12 max-w-md md:my-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8FB3C4]">IELSco · Elco AI</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">Internal workspace</h1>
          <p className="mt-4 text-lg text-white/70">People, access, documents and work for the IELSco and Elco AI team.</p>
        </div>
        <p className="hidden text-sm text-white/45 md:block">Restricted system. Access is by invitation from a founder and every sign-in is recorded.</p>
      </section>

      <section className="flex flex-1 items-center justify-center bg-[#F4F6F9] px-4 py-12 text-[#1B2A3C] md:rounded-l-[2rem]">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-2 text-base text-[#1B2A3C]/70">Use the work Google account a founder added for you.</p>

          {notice && (
            <p role={notice.tone === "error" ? "alert" : "status"} data-testid="os-login-notice"
              className={notice.tone === "error"
                ? "mt-6 rounded-xl border border-[#E8B4B5] bg-[#FDF2F2] px-4 py-3 text-base text-[#8A2C2E]"
                : "mt-6 rounded-xl border border-[#C9DCE5] bg-[#EEF5F8] px-4 py-3 text-base text-[#24485A]"}>
              {notice.text}
            </p>
          )}

          <button type="button" onClick={signIn} disabled={state === "redirecting"} data-testid="os-google-signin"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-[#D5DBE3] bg-white px-5 py-3.5 text-base font-semibold text-[#1B2A3C] shadow-sm transition hover:border-[#577E90] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2">
            {state === "redirecting" ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <GoogleMark />}
            {state === "redirecting" ? "Opening Google…" : "Continue with Google"}
          </button>

          <div className="mt-8 flex gap-3 rounded-xl bg-white px-4 py-3 text-sm text-[#1B2A3C]/70">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
            <p>There is no sign-up. New team members are invited by a founder. Founders also confirm sign-in with a code from an authenticator app.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
