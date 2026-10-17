"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bookmarkKey, fetchBookmarks, setBookmark } from "@/lib/dashboard/bookmarks";
import type { BookmarkType } from "@/lib/dashboard/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Status = "loading" | "ready" | "unavailable" | "error";

interface BookmarksApi {
  status: Status;
  error: string | null;
  saved: string[]; // keys "resource:<id>" / "collection:<id>", newest first
  isSaved: (type: BookmarkType, id: string) => boolean;
  isPending: (type: BookmarkType, id: string) => boolean;
  toggle: (type: BookmarkType, id: string) => Promise<void>;
  reload: () => void;
}

const BookmarksContext = createContext<BookmarksApi | null>(null);

export const useBookmarks = () => useContext(BookmarksContext);

export const UNAVAILABLE_MESSAGE =
  "Saving to your account isn't switched on yet (IELS database update pending). Nothing was saved.";

export function BookmarksProvider({ supabase, userId, children }: { supabase: SupabaseClient; userId: string; children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const { t } = useI18n();

  const reload = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetchBookmarks(supabase, userId);
      setSaved(res.keys);
      setStatus(res.available ? "ready" : "unavailable");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [supabase, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = async (type: BookmarkType, id: string) => {
    const key = bookmarkKey(type, id);
    if (status === "unavailable") return setToast(t("bookmarks.unavailable"));
    if (status !== "ready" || pending.includes(key)) return;
    const willSave = !saved.includes(key);
    setPending((p) => [...p, key]);
    try {
      await setBookmark(supabase, userId, type, id, willSave);
      setSaved((s) => (willSave ? [key, ...s.filter((k) => k !== key)] : s.filter((k) => k !== key)));
      setToast(willSave ? t("bookmarks.savedToast") : t("bookmarks.removedToast"));
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setPending((p) => p.filter((k) => k !== key));
    }
  };

  const api: BookmarksApi = {
    status,
    error,
    saved,
    isSaved: (t, id) => saved.includes(bookmarkKey(t, id)),
    isPending: (t, id) => pending.includes(bookmarkKey(t, id)),
    toggle,
    reload,
  };

  return (
    <BookmarksContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
        {toast && (
          <p data-testid="bookmark-toast" className="pointer-events-auto max-w-md rounded-full bg-[#2F4157] px-5 py-3 text-base font-medium text-white shadow-lg">
            {toast}
          </p>
        )}
      </div>
    </BookmarksContext.Provider>
  );
}
