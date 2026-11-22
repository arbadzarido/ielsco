"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";
import { btnSecondary, card } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import type { Notice } from "@/lib/tutoring/client";

// In-dashboard notifications for tutoring (booking requests, confirmations, feedback, verified payments). Rows are written by the
// database functions; a user reads and marks only their own. WhatsApp follow-ups stay manual (see the payment instructions doc).
const TEXT: Record<string, string> = {
  payment_verified: "Your payment was verified and your receipt is ready.", booking_requested: "A student requested a session.",
  booking_confirm: "Your session is confirmed.", booking_propose: "Your mentor proposed a different time.", booking_reject: "Your booking request was declined. See the note on the request.",
  alternative_accepted: "A student accepted your proposed time.", booking_cancelled: "A session was cancelled.", session_completed: "Your session feedback is ready.",
};

export function Notifications({ supabase }: { supabase: SupabaseClient }) {
  const fmt = useLocalFormat();
  const [list, setList] = useState<Notice[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("tutoring_notifications").select("id, kind, body, created_at, read_at").is("read_at", null).order("created_at", { ascending: false }).limit(5);
    setList((data ?? []) as Notice[]);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);
  if (list.length === 0) return null;
  return (
    <section className={cn(card, "p-4")} aria-label="Notifications" data-testid="tutoring-notifications">
      <ul className="space-y-1 text-base">{list.map((n) => <li key={n.id}><span className="text-sm text-[#2F4157]/60">{fmt.dateTime(n.created_at)}</span> {TEXT[n.kind] ?? n.body}</li>)}</ul>
      <button className={cn(btnSecondary, "mt-3")} onClick={async () => { await supabase.rpc("tutoring_mark_notifications_read"); void load(); }}>Mark all as read</button>
    </section>
  );
}
