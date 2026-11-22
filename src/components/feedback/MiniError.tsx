"use client";

import Link from "next/link";
import { classifyError } from "@/lib/errorKind";

// The first thing an error boundary shows: plain text and the two ways on, with no mascot code behind it (so error.tsx adds
// almost nothing to a page's first load, and still works when the connection is down). RouteErrorLazy replaces it with the
// full Elco state as soon as that code has loaded.
export default function MiniError({ error, reset, home = "/", homeLabel = "Go to the homepage" }: { error: Error & { digest?: string }; reset: () => void; home?: string; homeLabel?: string }) {
  const kind = classifyError(error);
  const title = kind === "network" ? "You seem to be offline" : kind === "session" ? "Your session has ended" : "Something went wrong on our side";
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-[520px] flex-col items-center justify-center px-4 py-10 text-center font-sans" role="alert" data-testid="route-error-mini">
      <h2 className="text-[22px] font-bold text-[#1A2534]">{title}</h2>
      <p className="mt-2 text-[16px] text-[#2F4157]/75">{kind === "network" ? "Check your connection, then try again." : "It's temporary. Please try again in a moment."}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-[46px] items-center rounded-full bg-[#2F4157] px-6 text-[15px] font-semibold text-white">Try again</button>
        <Link href={home} className="inline-flex min-h-[46px] items-center rounded-full border border-[#D5DBE3] bg-white px-6 text-[15px] font-semibold text-[#2F4157]">{homeLabel}</Link>
      </div>
    </div>
  );
}
