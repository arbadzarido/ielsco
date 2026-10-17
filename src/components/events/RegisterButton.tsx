"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REGISTER_PARAM, isRegistered, registerForEvent, returnPathFor } from "@/lib/events/registration";
import { focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

type State = "checking" | "open" | "closed" | "registering" | "registered";

interface Props {
  eventId: string;
  // ISO timestamp; registration is closed after it.
  closesAt: string;
  whatsappUrl?: string | null;
  label?: string;
  className?: string;
  onRegistered?: () => void;
}

const btn = cn(
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed",
  focusRing
);

// Register with one click. Signed out → sign up (or sign in) and come back; account details incomplete →
// finish them and come back; the registration then completes automatically via ?register=<eventId>.
export function RegisterButton({ eventId, closesAt, whatsappUrl, label = "Register", className, onRegistered }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(false);
  const onRegisteredRef = useRef(onRegistered);
  onRegisteredRef.current = onRegistered;

  const register = useCallback(async () => {
    setError(null);
    setState("registering");
    try {
      const result = await registerForEvent(supabase, eventId);
      const back = encodeURIComponent(returnPathFor(pathname ?? "/", eventId));
      if (result === "signed-out") return router.push(`/sign-up?next=${back}`);
      if (result === "needs-details") return router.push(`/dashboard/profile/account?next=${back}`);
      setState("registered");
      onRegisteredRef.current?.();
    } catch (e) {
      setError((e as Error).message);
      setState("open");
    }
  }, [supabase, eventId, pathname, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isOpen = new Date(closesAt).getTime() > Date.now();
      const { data } = await supabase.auth.getUser();
      const already = data.user ? await isRegistered(supabase, data.user.id, eventId).catch(() => false) : false;
      if (cancelled) return;
      setState(already ? "registered" : isOpen ? "open" : "closed");

      // Coming back from sign-up / account details: finish the registration once, then clean the URL.
      const params = new URLSearchParams(window.location.search);
      if (params.get(REGISTER_PARAM) === eventId && !resumed.current) {
        resumed.current = true;
        params.delete(REGISTER_PARAM);
        window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
        if (data.user && !already && isOpen) register();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, eventId, closesAt, register]);

  if (state === "registered") {
    return (
      <div data-testid={`event-registered-${eventId}`} className={cn("flex flex-col gap-3", className)}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E3E7ED] bg-white px-5 py-3 text-base font-semibold text-[#2F4157]">
            <CheckCircle2 size={18} className="text-[#577E90]" aria-hidden="true" /> You&apos;re registered
          </span>
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" data-testid={`event-whatsapp-${eventId}`} className={cn(btn, "bg-[#25D366] text-white hover:bg-[#1EB257]")}>
              Join WhatsApp group <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
        <p className="text-sm opacity-70">We&apos;ll email you a reminder before it starts.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        data-testid={`event-register-${eventId}`}
        onClick={register}
        disabled={state !== "open"}
        className={cn(btn, state === "closed" ? "bg-[#E3E7ED] text-[#2F4157]/60" : "bg-[#E56668] text-white hover:bg-[#C04C4E] disabled:opacity-70")}
      >
        {(state === "checking" || state === "registering") && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {state === "closed" ? "Registration closed" : state === "registering" ? "Registering…" : label}
      </button>
      {error && <p role="alert" className="text-sm text-[#C04C4E]">{error}</p>}
    </div>
  );
}
