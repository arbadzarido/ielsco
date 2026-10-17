"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_CHANGED_EVENT } from "@/lib/dashboard/avatar";

// What the account menu shows about the signed-in member: name, photo and role from member_profiles. Pages pass a
// name/avatar too (some from the older users table); when the member has a profile row, it wins, so a new photo
// shows everywhere at once. Loaded once per page load and shared by the sidebar and header.
export interface AccountSummary {
  hasProfile: boolean;
  display_name: string | null;
  avatar_url: string | null;
  role_status: string | null;
}

let cached: Promise<AccountSummary | null> | null = null;

function load(): Promise<AccountSummary | null> {
  if (!cached) {
    cached = (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase.from("member_profiles")
        .select("display_name, avatar_url, role_status").eq("user_id", auth.user.id).maybeSingle();
      if (error || !data) return { hasProfile: false, display_name: null, avatar_url: null, role_status: null };
      return { hasProfile: true, ...data };
    })().catch(() => null);
  }
  return cached;
}

export function useAccountSummary() {
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((s) => { if (alive) setSummary(s); });
    const onAvatar = (e: Event) => {
      const url = (e as CustomEvent<string | null>).detail ?? null;
      setSummary((s) => ({ ...(s ?? { display_name: null, role_status: null }), hasProfile: true, avatar_url: url }));
      cached = null; // next page load re-reads
    };
    window.addEventListener(AVATAR_CHANGED_EVENT, onAvatar);
    return () => { alive = false; window.removeEventListener(AVATAR_CHANGED_EVENT, onAvatar); };
  }, []);
  return summary;
}
