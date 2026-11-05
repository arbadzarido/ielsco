"use client";

import { useEffect, useState } from "react";

// GIF Summer 2027 Early Bird window (guidebook): closes 23:59 GMT+7 on 9 November 2026. The page is statically built,
// so the status is re-checked in the browser after mount and switches by itself once the window has closed.
export const EARLY_BIRD_END = "2026-11-09T23:59:00+07:00";
const isOpen = () => Date.now() < Date.parse(EARLY_BIRD_END);

function useEarlyBirdOpen() {
  // First render uses the build-time value (matches the static HTML); the browser then uses its own clock.
  const [open, setOpen] = useState(isOpen);
  useEffect(() => {
    setOpen(isOpen());
    const ms = Date.parse(EARLY_BIRD_END) - Date.now();
    if (ms <= 0 || ms > 2 ** 31 - 1) return undefined;
    const t = window.setTimeout(() => setOpen(false), ms + 1000);
    return () => window.clearTimeout(t);
  }, []);
  return open;
}

const mailto = (subject: string) => "mailto:arbadza@ielsco.com?subject=" + encodeURIComponent(subject);

/** "Open" until the Early Bird deadline, then "Closed". */
export function EarlyBirdStatus() {
  const open = useEarlyBirdOpen();
  return <dd className="inline font-bold" data-testid="gif-early-bird-status" suppressHydrationWarning>{open ? "Open" : "Closed"}</dd>;
}

/** Early Bird application CTA; after the deadline it becomes a general enquiry (general registration is not open yet). */
export function EarlyBirdCta({ className }: { className: string }) {
  const open = useEarlyBirdOpen();
  return (
    <a href={mailto(open ? "GIF Summer 2027 Early Bird" : "GIF Summer 2027")} className={className} data-testid="gif-early-bird-cta" suppressHydrationWarning>
      {open ? "Apply for Early Bird" : "Ask about GIF Summer 2027"}
    </a>
  );
}
