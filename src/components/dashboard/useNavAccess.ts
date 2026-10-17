"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Whether this member can open the GIF delegate dashboard: they have a GIF registration or a delegate record
// (RLS returns only their own rows). It only decides which link the GIF banner shows; /dashboard/gif enforces access
// itself, so when the check fails the delegate link is shown rather than hidden from a real delegate.
type Access = { gifDelegate: boolean; checked: boolean };

// Cached per user id, so signing out and in as someone else re-checks.
let cache: { userId: string; result: Promise<boolean> } | null = null;

async function check(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const [reg, delegate] = await Promise.all([
    supabase.from("gif_registrations").select("id").eq("user_id", userId).limit(1),
    supabase.from("gif_delegates").select("id").limit(1),
  ]);
  const failed = !!reg.error && !!delegate.error;
  return failed || (reg.data?.length ?? 0) > 0 || (delegate.data?.length ?? 0) > 0;
}

export function useNavAccess(): Access {
  const [access, setAccess] = useState<Access>({ gifDelegate: false, checked: false });
  useEffect(() => {
    let alive = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user.id;
      if (!userId) return;
      if (cache?.userId !== userId) cache = { userId, result: check(supabase, userId).catch(() => true) };
      cache.result.then((gifDelegate) => alive && setAccess({ gifDelegate, checked: true }));
    });
    return () => {
      alive = false;
    };
  }, []);
  return access;
}
