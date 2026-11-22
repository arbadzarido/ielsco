"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import ErrorState, { stateBtnSecondary } from "./ErrorState";
import { classifyError } from "@/lib/errorKind";

// The body of every app-router error.tsx. A failure while rendering a page is never shown as a 404: it is told apart as
// "you're offline" (retries by itself when the connection returns), "your session ended" (Sign in again) or "something
// went wrong on our side" (Try again), and it always offers a way on. `reset` re-renders the segment.
export default function RouteError({ error, reset, home = "/", homeLabel = "Go to the homepage", compact }: {
  error: Error & { digest?: string }; reset: () => void; home?: string; homeLabel?: string; compact?: boolean;
}) {
  // Offline is read after mount so the server render and the first client render agree.
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const router = useRouter();
  // A server-render failure has to be fetched again from the server, then the segment re-renders.
  const retry = useCallback(() => { startTransition(() => { router.refresh(); reset(); }); }, [router, reset]);
  const kind = classifyError(error, online);
  useEffect(() => {
    if (kind === "server") Sentry.captureException(error);
  }, [error, kind]);
  return (
    <div className="flex min-h-[60vh] items-center bg-white py-10 font-sans" data-testid="route-error" data-digest={error.digest}>
      <div className="w-full">
        <ErrorState kind={kind} onRetry={retry} compact={compact}
          actions={kind === "session" ? undefined : <Link href={home} className={stateBtnSecondary} data-testid="state-home">{homeLabel}</Link>} />
      </div>
    </div>
  );
}
