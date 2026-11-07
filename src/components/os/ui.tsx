"use client";

// Company OS UI kit: compact, quiet surfaces in the spirit of Linear and Notion. Hairline borders, one accent colour,
// colour on status only where it carries meaning. Every control has a visible focus ring and a 40px+ touch target on
// small screens.
import Link from "next/link";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_TONE, initials, type Tone } from "@/lib/os/meta";

export const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-1";
export const panel = "rounded-xl border border-[#E6E9EE] bg-white";
export const btn = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E1E5EB] bg-white px-3 text-sm font-medium text-[#1F2D3D] hover:bg-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9 ${ring}`;
export const btnPrimary = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#2F4157] px-3 text-sm font-semibold text-white hover:bg-[#3B5270] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9 ${ring}`;
export const btnGhost = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[#3A4B60] hover:bg-[#EEF1F5] disabled:opacity-50 md:min-h-9 ${ring}`;
export const btnDanger = `inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#F1C9CA] bg-white px-3 text-sm font-medium text-[#A12D2F] hover:bg-[#FDF2F2] disabled:opacity-50 md:min-h-9 ${ring}`;
export const input = `w-full min-h-10 rounded-lg border border-[#DDE2E8] bg-white px-3 py-2 text-sm text-[#1F2D3D] placeholder:text-[#8593A3] focus:border-[#577E90] md:min-h-9 ${ring}`;
export const linkCls = `font-medium text-[#2F4157] underline-offset-2 hover:underline ${ring} rounded`;
export const muted = "text-[#66768A]";

const TONES: Record<Tone, string> = {
  neutral: "bg-[#F0F2F5] text-[#4A5A6E]",
  blue: "bg-[#E8F0FB] text-[#2457A6]",
  green: "bg-[#E7F4EC] text-[#22663F]",
  amber: "bg-[#FCF1DC] text-[#865400]",
  red: "bg-[#FCE9E9] text-[#A12D2F]",
  violet: "bg-[#EFEBFC] text-[#5638B8]",
  teal: "bg-[#E3F2F1] text-[#0B6058]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}
export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return <Badge tone={STATUS_TONE[value] ?? "neutral"}>{value}</Badge>;
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  // A stable, quiet colour per name so people are easy to tell apart in lists.
  const palette = ["#2F4157", "#577E90", "#0B6E64", "#5A3DC4", "#8A5A00", "#2E6B4F", "#B4383A"];
  const hash = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4), background: palette[hash % palette.length] }}>
      {initials(name)}
    </span>
  );
}

export function PageTitle({ title, description, actions, crumbs }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: { href: string; label: string }[];
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-[#66768A]">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                <Link href={c.href} className={cn("hover:text-[#1F2D3D]", ring, "rounded")}>{c.label}</Link>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="break-words text-xl font-semibold tracking-tight text-[#1F2D3D] md:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-[#66768A]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children, className, id }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cn("min-w-0", className)} aria-labelledby={title && id ? id : undefined}>
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {title && <h2 id={id} className="text-sm font-semibold text-[#1F2D3D]">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, body, action, compact }: { title: string; body?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-[#DDE2E8] bg-[#FBFCFD] text-center", compact ? "px-4 py-5" : "px-6 py-10")} data-testid="os-empty">
      <p className="text-sm font-semibold text-[#1F2D3D]">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-[#66768A]">{body}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <p role="status" className="py-8 text-center text-sm text-[#66768A]">{label}</p>;
}

export function ErrorLine({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <p role="alert" data-testid="os-error" className="rounded-lg border border-[#F1C9CA] bg-[#FDF2F2] px-3 py-2 text-sm text-[#A12D2F]">{message}</p>;
}

export function Field({ label, children, hint, className }: { label: string; children: (id: string) => ReactNode; hint?: string; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-[#3A4B60]">{label}</label>
      {children(id)}
      {hint && <p className="mt-1 text-xs text-[#66768A]">{hint}</p>}
    </div>
  );
}

export function Select({ id, value, onChange, options, placeholder, className, ariaLabel, disabled }: {
  id?: string; value: string; onChange: (v: string) => void; options: readonly (string | { value: string; label: string })[];
  placeholder?: string; className?: string; ariaLabel?: string; disabled?: boolean;
}) {
  return (
    <select id={id} aria-label={ariaLabel} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn(input, "pr-8", className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Tabs that live in the URL (?tab=...), so a tab can be linked to and survives reload. */
export function Tabs({ tabs, current, hrefFor, label }: { tabs: { key: string; label: string; count?: number }[]; current: string; hrefFor: (key: string) => string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 mb-5 overflow-x-auto border-b border-[#E6E9EE] px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link href={hrefFor(t.key)} aria-current={t.key === current ? "page" : undefined} scroll={false}
              className={cn("-mb-px flex min-h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-medium", ring,
                t.key === current ? "border-[#2F4157] text-[#1F2D3D]" : "border-transparent text-[#66768A] hover:text-[#1F2D3D]")}>
              {t.label}
              {t.count !== undefined && <span className="rounded bg-[#F0F2F5] px-1 text-xs text-[#4A5A6E]">{t.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Side sheet on desktop, full-height sheet on phones. Escape and the backdrop close it; focus moves inside. */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0F1B2A]/30" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={cn("relative flex h-full w-full flex-col bg-white shadow-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}>
        <div className="flex items-center justify-between gap-2 border-b border-[#E6E9EE] px-4 py-3">
          <h2 className="text-base font-semibold text-[#1F2D3D]">{title}</h2>
          <button type="button" onClick={onClose} className={btnGhost} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[#E6E9EE] px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** A row list that reads as a table on wide screens and as stacked cards on phones (no horizontal scrolling). */
export function RowList<T>({ rows, columns, rowKey, rowHref, empty, testId }: {
  rows: T[];
  columns: { key: string; label: string; render: (r: T) => ReactNode; className?: string; primary?: boolean; hideOnMobile?: boolean }[];
  rowKey: (r: T) => string; rowHref?: (r: T) => string; empty?: ReactNode; testId?: string;
}) {
  if (!rows.length) return <>{empty ?? <Empty title="Nothing here yet" compact />}</>;
  return (
    <div className={cn(panel, "overflow-hidden")} data-testid={testId}>
      <table className="hidden w-full table-fixed text-sm md:table">
        <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs font-medium text-[#66768A]">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cn("px-3 py-2 font-medium", c.className)}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-[#F0F2F5] last:border-0 hover:bg-[#FAFBFC]">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2 align-middle", c.className)}>
                  {c.primary && rowHref ? <Link href={rowHref(r)} className={cn("block truncate font-medium text-[#1F2D3D] hover:underline", ring, "rounded")}>{c.render(r)}</Link> : c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="divide-y divide-[#F0F2F5] md:hidden">
        {rows.map((r) => {
          const primary = columns.find((c) => c.primary) ?? columns[0];
          const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
          const body = (
            <>
              <p className="break-words text-sm font-medium text-[#1F2D3D]">{primary.render(r)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#66768A]">
                {rest.map((c) => <span key={c.key} className="flex min-w-0 items-center gap-1"><span className="sr-only">{c.label}:</span>{c.render(r)}</span>)}
              </div>
            </>
          );
          return (
            <li key={rowKey(r)}>
              {rowHref ? <Link href={rowHref(r)} className={cn("block px-3 py-3 active:bg-[#F5F7FA]", ring)}>{body}</Link> : <div className="px-3 py-3">{body}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "red" | "amber" }) {
  const body = (
    <>
      <p className="text-xs font-medium text-[#66768A]">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums text-[#1F2D3D]", tone === "red" && "text-[#A12D2F]", tone === "amber" && "text-[#865400]")}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#66768A]">{hint}</p>}
    </>
  );
  return href
    ? <Link href={href} className={cn(panel, "block p-3 hover:border-[#C9D1DB]", ring)}>{body}</Link>
    : <div className={cn(panel, "p-3")}>{body}</div>;
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium text-[#66768A]">{i.label}</dt>
          <dd className="mt-0.5 break-words text-[#1F2D3D]">{i.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Done / total tasks, shown as a thin bar. */
export function Progress({ done, total }: { done: number; total: number }) {
  if (!total) return <span className="text-xs text-[#8593A3]">No tasks</span>;
  const pct = Math.round((done / total) * 100);
  return (
    <span className="flex items-center gap-2" title={`${done} of ${total} tasks done`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E6E9EE]" aria-hidden="true"><span className="block h-full rounded-full bg-[#2F4157]" style={{ width: `${pct}%` }} /></span>
      <span className="text-xs tabular-nums text-[#66768A]">{done}/{total}</span>
    </span>
  );
}

