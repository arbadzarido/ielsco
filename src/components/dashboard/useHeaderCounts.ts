"use client";

import { useEffect, useState } from "react";
import { useMyRecords } from "./useMyRecords";
import { badgeCount, buildNotifications, type NotificationCategory } from "@/lib/me/notifications";

// Which notification categories this member muted. A per-device display preference (nothing is sent anywhere), so
// localStorage is enough; every category is on by default.
const MUTED_KEY = "iels:notifications:muted";
export const MUTED_EVENT = "iels:notifications-muted";

export function readMuted(): Set<NotificationCategory> {
  try {
    const raw = window.localStorage.getItem(MUTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as NotificationCategory[]) : []);
  } catch {
    return new Set();
  }
}

export function writeMuted(muted: Set<NotificationCategory>) {
  try {
    window.localStorage.setItem(MUTED_KEY, JSON.stringify([...muted]));
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(MUTED_EVENT));
}

// Badge numbers for the top bar: unread messages (inbox) and notifications that need the member to act.
// Refreshed every two minutes while the tab is visible.
export function useHeaderCounts() {
  const { state, reload } = useMyRecords();
  const [muted, setMuted] = useState<Set<NotificationCategory>>(new Set());

  useEffect(() => {
    const sync = () => setMuted(readMuted());
    sync();
    window.addEventListener(MUTED_EVENT, sync);
    return () => window.removeEventListener(MUTED_EVENT, sync);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === "visible") void reload(); }, 120_000);
    return () => window.clearInterval(id);
  }, [reload]);

  if (state.s !== "ready") return { unread: 0, notifications: 0 };
  return { unread: state.data.unread, notifications: badgeCount(buildNotifications(state.data), muted) };
}
