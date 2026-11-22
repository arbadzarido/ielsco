"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { btnSecondary } from "./ui";
import { cn } from "@/lib/utils";

// Previous / next for server-paged lists (range + exact count). `page` is 0-based. Shows "Showing 26-50 of 312".
export function pageWindow(page: number, pageSize: number, total: number) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  return { from, to: Math.min(total, (page + 1) * pageSize), pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function PagerBar({ page, pageSize, total, onPage, busy = false, className }: {
  page: number; pageSize: number; total: number; onPage: (page: number) => void; busy?: boolean; className?: string;
}) {
  const { from, to, pages } = pageWindow(page, pageSize, total);
  if (total <= pageSize) return null;
  return (
    <nav aria-label="Pagination" className={cn("mt-6 flex flex-wrap items-center justify-between gap-3", className)} data-testid="pager">
      <p className="text-sm text-[#2F4157]/70" aria-live="polite">Showing {from}-{to} of {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 0 || busy} className={cn(btnSecondary, "px-4 py-2 text-sm disabled:opacity-50")} data-testid="pager-prev">
          <ChevronLeft size={16} aria-hidden="true" /> Previous
        </button>
        <span className="text-sm text-[#2F4157]/70">Page {page + 1} of {pages}</span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={page + 1 >= pages || busy} className={cn(btnSecondary, "px-4 py-2 text-sm disabled:opacity-50")} data-testid="pager-next">
          Next <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
