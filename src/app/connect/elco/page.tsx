"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Link2, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ELCO_MASCOT, ELCO_URL } from "@/lib/elco";
import { btnPrimary, btnSecondary, cardGloss, focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// Consent screen for linking an Elco account (docs/INTEGRATION-ARCHITECTURE.md §4, B1).
// Elco sends the member here with ?state=…; IELSco issues a one-time code and sends them back to Elco's fixed
// callback. Accounts are never matched by email: the member proves control of both accounts in this one flow.

const SCOPES = [
  { id: "goals:read", title: "Read your learning goals", body: "Study, work or explore, your destinations, interests and English level, so Elco can tailor practice." },
  { id: "summary:write", title: "Share your Elco progress with IELSco", body: "A short estimate (level, top focus skills, practice count) shown only to you in IELSco Settings." },
] as const;

const isState = (v: string | null): v is string => !!v && /^[A-Za-z0-9_-]{32,128}$/.test(v);
const callback = (params: Record<string, string>) => `${ELCO_URL}/link/ielsco/callback?${new URLSearchParams(params)}`;

type View = "checking" | "invalid" | "linked" | "consent";

function ConnectElco() {
  const router = useRouter();
  const params = useSearchParams();
  const state = params.get("state");
  const [view, setView] = useState<View>("checking");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(SCOPES.map((s) => s.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isState(state)) return setView("invalid");
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace(`/sign-in?next=${encodeURIComponent(`/connect/elco?state=${state}`)}`);
        return;
      }
      setName(data.user.user_metadata?.full_name || data.user.email || "");
      const { data: link } = await supabase.from("elco_account_links").select("id").is("revoked_at", null).maybeSingle();
      setView(link ? "linked" : "consent");
    });
  }, [state, router]);

  const allow = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/elco/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, scopes }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.redirect_url !== "string") {
        setError(body.message ?? (res.status === 503 ? "Connecting to Elco isn't switched on yet. Please try again later." : "Something went wrong. Please try again."));
        setBusy(false);
        return;
      }
      window.location.assign(body.redirect_url);
    } catch {
      setError("Couldn't reach IELSco. Check your connection and try again.");
      setBusy(false);
    }
  };

  const toggle = (id: string) => setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    // The root layout already provides <main>; this is a section inside it.
    <section aria-label="Connect Elco AI" className="flex min-h-[70vh] items-center justify-center bg-[#F7F8FA] px-4 py-12 text-[#2F4157]">
      <div className={cn(cardGloss, "w-full max-w-lg p-6 md:p-10")} data-testid="connect-elco">
        <div className="mb-6 flex items-center justify-center gap-4">
          <Image src="/images/logos/iels_blue1.png" alt="IELSco" width={48} height={48} />
          <Link2 size={22} className="text-[#577E90]" aria-hidden="true" />
          <Image src={ELCO_MASCOT} alt="Elco AI" width={52} height={52} />
        </div>

        {view === "checking" && (
          <p role="status" className="flex items-center justify-center gap-2 text-lg text-[#2F4157]/70"><Loader2 className="animate-spin" size={18} /> Checking your account…</p>
        )}

        {view === "invalid" && (
          <div className="text-center" data-testid="connect-invalid">
            <h1 className="mb-2 text-2xl font-bold">This link request isn&apos;t valid</h1>
            <p className="mb-6 text-lg text-[#2F4157]/70">Start again from Elco: open Settings and choose “Connect IELSco”.</p>
            <a href={ELCO_URL} className={btnPrimary}>Go to Elco</a>
          </div>
        )}

        {view === "linked" && (
          <div className="text-center" data-testid="connect-already-linked">
            <CheckCircle2 size={32} className="mx-auto mb-3 text-[#577E90]" aria-hidden="true" />
            <h1 className="mb-2 text-2xl font-bold">Already connected</h1>
            <p className="mb-6 text-lg text-[#2F4157]/70">Your IELSco account is already connected to an Elco account. To connect a different one, unlink it first in Settings.</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/settings#connected-apps" className={btnPrimary}>Open Settings</Link>
              <a href={callback({ error: "already_linked", state: state! })} className={btnSecondary}>Back to Elco</a>
            </div>
          </div>
        )}

        {view === "consent" && (
          <div data-testid="connect-consent">
            <h1 className="mb-2 text-center text-2xl font-bold">Connect Elco AI to IELSco</h1>
            <p className="mb-6 text-center text-lg text-[#2F4157]/70">
              Signed in to IELSco as <strong>{name}</strong>. Choose what Elco may use. You can unlink any time from either app.
            </p>
            <fieldset className="mb-6 space-y-3">
              <legend className="sr-only">Permissions</legend>
              {SCOPES.map((s) => {
                const checked = scopes.includes(s.id);
                return (
                  <label key={s.id} data-testid={`connect-scope-${s.id}`} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]", checked ? "border-[#2F4157]" : "border-[#E3E7ED]")}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} className="mt-1 h-4 w-4 accent-[#2F4157]" />
                    <span>
                      <span className="block font-semibold">{s.title}</span>
                      <span className="block text-base text-[#2F4157]/65">{s.body}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <p className="mb-6 flex items-start gap-2 text-sm text-[#2F4157]/60">
              <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              Elco never gets your IELSco password, email or other profile details. Your Elco practice, conversations and memory stay in Elco.
            </p>
            {error && <p role="alert" data-testid="connect-error" className="mb-4 rounded-xl bg-[#E56668]/10 px-4 py-3 text-base">{error}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <a href={callback({ error: "access_denied", state: state! })} data-testid="connect-cancel" className={cn(btnSecondary, focusRing)}>Cancel</a>
              <button type="button" data-testid="connect-allow" disabled={busy || scopes.length === 0} onClick={allow} className={btnPrimary}>
                {busy ? "Connecting…" : "Allow and connect"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ConnectElcoPage() {
  return (
    <Suspense fallback={null}>
      <ConnectElco />
    </Suspense>
  );
}
