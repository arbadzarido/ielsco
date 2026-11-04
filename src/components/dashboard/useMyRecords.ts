"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadMyRecords, type MyRecords } from "@/lib/me/records";

// The member's records (lib/me/records.ts), shared by the top bar badges and the pages that use them. Dashboard pages
// each render their own layout, so a short in-memory cache stops every navigation from re-running the same queries.
// `reload()` (after registering, cancelling, saving…) always fetches fresh data.
const TTL_MS = 60_000;
let cache: { userId: string; at: number; data: MyRecords } | null = null;
let inflight: { userId: string; promise: Promise<MyRecords> } | null = null;

export function invalidateMyRecords() {
  cache = null;
}

async function fetchRecords(userId: string, fresh: boolean) {
  if (!fresh && cache && cache.userId === userId && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!fresh && inflight?.userId === userId) return inflight.promise;
  const promise = loadMyRecords(createClient(), userId);
  inflight = { userId, promise };
  try {
    const data = await promise;
    cache = { userId, at: Date.now(), data };
    return data;
  } finally {
    if (inflight?.promise === promise) inflight = null;
  }
}

export type RecordsState = { s: "loading" } | { s: "signed-out" } | { s: "error"; message: string } | { s: "ready"; data: MyRecords };

export function useMyRecords(userId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [uid, setUid] = useState<string | null | undefined>(userId);
  const [state, setState] = useState<RecordsState>(() =>
    userId && cache?.userId === userId ? { s: "ready", data: cache.data } : { s: "loading" });

  useEffect(() => {
    if (userId !== undefined) { setUid(userId); return; }
    let alive = true;
    supabase.auth.getUser().then(({ data }) => alive && setUid(data.user?.id ?? null));
    return () => { alive = false; };
  }, [supabase, userId]);

  const run = useCallback(async (fresh: boolean) => {
    if (uid === undefined) return;
    if (uid === null) return setState({ s: "signed-out" });
    try {
      setState({ s: "ready", data: await fetchRecords(uid, fresh) });
    } catch (e) {
      setState({ s: "error", message: (e as Error).message });
    }
  }, [uid]);

  useEffect(() => { void run(false); }, [run]);

  return { state, reload: useCallback(() => run(true), [run]) };
}
