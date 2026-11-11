"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { SOURCE_ZONE, browserZone, formatDate, formatDateTime, isValidZone } from "@/lib/time/zone";
import { formatSession } from "@/lib/circle/sessions";

// The viewer's display zone: their saved choice (public.users.timezone), else the browser's zone.
// Server render and the first client render use SOURCE_ZONE so markup matches; the real zone arrives after mount.

const STORAGE_KEY = "ielsco.timezone";

type Ctx = {
  /** Zone to display times in. SOURCE_ZONE until mounted. */
  zone: string;
  /** False during SSR / first render (zone is still SOURCE_ZONE). */
  ready: boolean;
  /** The saved choice, or null for "automatic" (browser). */
  preferred: string | null;
  /** The browser's own zone (after mount). */
  detected: string;
  /** Update the in-memory choice after the settings page saved it. */
  setPreferred: (zone: string | null) => void;
};

const TimeZoneContext = createContext<Ctx>({ zone: SOURCE_ZONE, ready: false, preferred: null, detected: SOURCE_ZONE, setPreferred: () => {} });

const readStored = () => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isValidZone(v) ? v : null;
  } catch {
    return null;
  }
};
const writeStored = (zone: string | null) => {
  try {
    if (zone) window.localStorage.setItem(STORAGE_KEY, zone);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* private mode */ }
};

export function TimeZoneProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [detected, setDetected] = useState(SOURCE_ZONE);
  const [preferred, setPreferredState] = useState<string | null>(null);

  const setPreferred = useCallback((zone: string | null) => {
    const z = isValidZone(zone) ? zone : null;
    setPreferredState(z);
    writeStored(z);
  }, []);

  useEffect(() => {
    setDetected(browserZone());
    setPreferredState(readStored());
    setReady(true);

    // Signed in: the saved choice in public.users wins (also on another device). getSession reads local storage only.
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid || cancelled) return;
      const { data: row, error } = await supabase.from("users").select("timezone").eq("id", uid).maybeSingle();
      if (cancelled || error) return;
      const saved = (row as { timezone?: string | null } | null)?.timezone ?? null;
      setPreferredState(isValidZone(saved) ? saved : null);
      writeStored(isValidZone(saved) ? saved : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<Ctx>(() => ({
    zone: ready ? preferred ?? detected : SOURCE_ZONE,
    ready,
    preferred,
    detected,
    setPreferred,
  }), [ready, preferred, detected, setPreferred]);

  return <TimeZoneContext.Provider value={value}>{children}</TimeZoneContext.Provider>;
}

export const useTimeZone = () => useContext(TimeZoneContext);
/** Shorthand: the zone to display times in. */
export const useViewerZone = () => useContext(TimeZoneContext).zone;

/** Formatters bound to the viewer's zone: date(), dateTime() (always zone-labelled) and session() for Circle slots. */
export function useLocalFormat() {
  const zone = useViewerZone();
  return useMemo(() => ({
    zone,
    date: (d: string | Date, opts?: Intl.DateTimeFormatOptions) => formatDate(d, zone, opts),
    dateTime: (d: string | Date) => formatDateTime(d, zone),
    session: (start: Date) => formatSession(start, zone),
  }), [zone]);
}
