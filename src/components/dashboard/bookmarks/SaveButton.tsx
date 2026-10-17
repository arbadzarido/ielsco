"use client";

import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useBookmarks } from "./BookmarksProvider";
import type { BookmarkType } from "@/lib/dashboard/types";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function SaveButton({
  type,
  id,
  title,
  variant = "icon",
  className,
}: {
  type: BookmarkType;
  id: string;
  title: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const bookmarks = useBookmarks();
  const { t } = useI18n();
  if (!bookmarks) return null;
  const saved = bookmarks.isSaved(type, id);
  const busy = bookmarks.isPending(type, id) || bookmarks.status === "loading";
  const Icon = busy ? Loader2 : saved ? BookmarkCheck : Bookmark;
  const label = saved ? t("bookmarks.remove", { title }) : t("bookmarks.save", { title });

  return (
    <button
      type="button"
      data-testid={`save-${type}-${id}`}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={() => bookmarks.toggle(type, id)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-60",
        focusRing,
        variant === "icon" ? "h-10 w-10" : "px-4 py-2.5 text-base",
        saved
          ? "bg-[#2F4157] text-white hover:bg-[#3d5470]"
          : "border border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]",
        className
      )}
    >
      <Icon size={17} className={busy ? "animate-spin" : ""} />
      {variant === "full" && (saved ? t("bookmarks.savedLabel") : t("bookmarks.saveLabel"))}
    </button>
  );
}
