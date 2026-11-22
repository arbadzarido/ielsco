"use client";

import { useEffect, useState } from "react";

// prefers-reduced-motion as state (false on the server and first paint, so hydration always matches).
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduced(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return reduced;
}

/** True after `ms` milliseconds (or immediately when ms <= 0). Used to stage the loader. */
export function useDelayed(ms: number, on = true) {
  const [ready, setReady] = useState(ms <= 0);
  useEffect(() => {
    if (!on || ms <= 0) return undefined;
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms, on]);
  return ready;
}
