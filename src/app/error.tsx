"use client";

import RouteErrorLazy from "@/components/feedback/RouteErrorLazy";

// Error boundary for every page that has no closer one. A failed request is never shown as a 404: Elco tells "you're
// offline", "your session ended" and "something went wrong on our side" apart, and every state has a way on. The plain
// text shows at once; the Elco version loads right behind it (kept out of every page's first load).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorLazy error={error} reset={reset} />;
}
