"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// Pages can tell Elco Assistant about state that isn't in the address: the filters in use and what is selected.
// Only plain IDs and short filter values travel; the server reads every record again with the person's own session.

export interface PublishedContext { filters?: Record<string, string | null | undefined>; selection?: string[] }
const Ctx = createContext<{ value: PublishedContext; set: (v: PublishedContext) => void } | null>(null);

export function AssistantPageProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<PublishedContext>({});
  const v = useMemo(() => ({ value, set }), [value]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useAssistantPageValue(): PublishedContext { return useContext(Ctx)?.value ?? {}; }

/** Call from a page with its current filters and selection; cleared when the page unmounts. */
export function usePublishAssistantContext(ctx: PublishedContext) {
  const c = useContext(Ctx);
  const set = c?.set;
  const key = JSON.stringify(ctx);
  const last = useRef("");
  useEffect(() => {
    if (!set || last.current === key) return;
    last.current = key;
    set(JSON.parse(key) as PublishedContext);
  }, [set, key]);
  useEffect(() => () => { set?.({}); }, [set]);
}

export function cleanFilters(f: PublishedContext["filters"]): Record<string, string> {
  return Object.fromEntries(Object.entries(f ?? {}).filter(([, v]) => typeof v === "string" && v.trim() !== "").map(([k, v]) => [k, String(v)]));
}
