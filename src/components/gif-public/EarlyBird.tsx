"use client";

import { useEffect, useState } from "react";
import { EARLY_BIRD_END, GIF_REGISTER_URL } from "@/lib/gif-summer-2027";

// The page is statically built, so the Early Bird status is re-checked in the browser after mount and switches by itself
// once the window has closed. Registration goes through the program's Google Form.
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

/** "Open" until the Early Bird deadline, then "Closed". */
export function EarlyBirdStatus() {
  const open = useEarlyBirdOpen();
  return <dd className="inline font-bold" data-testid="gif-early-bird-status" suppressHydrationWarning>{open ? "Open" : "Closed"}</dd>;
}

/** Registration CTA (the program's form): "Register for Early Bird" until the deadline, then "Register for GIF Summer 2027". */
export function EarlyBirdCta({ className }: { className: string }) {
  const open = useEarlyBirdOpen();
  return (
    <a href={GIF_REGISTER_URL} target="_blank" rel="noopener noreferrer" className={className} data-testid="gif-early-bird-cta" suppressHydrationWarning>
      {open ? "Register for Early Bird" : "Register for GIF Summer 2027"}
    </a>
  );
}
