"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

// The signed-in visitor's tracked opportunity ids (public.opportunity_tracker, owner-only RLS). Saving inserts a row with
// status 'saved'; the database refuses an 11th row for free accounts (trigger tracker_free_limit), and that message is
// shown as-is. Signed-out visitors get signedIn = false and are sent to sign in.
export function useTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: rows } = await supabase.from("opportunity_tracker").select("opportunity_id");
      if (alive && rows) setSaved(new Set(rows.map((r: { opportunity_id: string }) => r.opportunity_id)));
    });
    return () => { alive = false; };
  }, [supabase]);

  const toggle = useCallback(async (id: string) => {
    if (!userId) return;
    setBusy(id);
    setNotice(null);
    if (saved.has(id)) {
      const { error } = await supabase.from("opportunity_tracker").delete().eq("opportunity_id", id).eq("user_id", userId);
      if (!error) setSaved((s) => { const n = new Set(s); n.delete(id); return n; });
      else setNotice("Couldn't remove it. Please try again.");
    } else {
      const { error } = await supabase.from("opportunity_tracker").insert({ opportunity_id: id, user_id: userId });
      if (!error) {
        setSaved((s) => new Set(s).add(id));
        track("opportunity_saved", { opportunity: id });
      } else if (/tracker_limit/.test(error.message)) {
        setNotice("Free accounts can track 10 opportunities. Remove one in your dashboard, or become a member for unlimited tracking.");
      } else {
        setNotice("Couldn't save it. Please try again.");
      }
    }
    setBusy(null);
  }, [saved, supabase, userId]);

  return { signedIn: userId === undefined ? undefined : !!userId, saved, toggle, busy, notice, clearNotice: () => setNotice(null) };
}
