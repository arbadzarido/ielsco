"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { ADMIN_NAV_GROUP, SECTIONS, isChildActive, isItemActive, type Section } from "../nav";
import { useStoryAdmin } from "../stories-admin/useStoryAdmin";
import { useHeaderCounts } from "../useHeaderCounts";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Port of Elco's sidebar navigation (elco-app/frontend/src/components/AppShell.jsx: PrimaryItem, NavGroup, NavItem,
// Divider, SectionLabel). Same structure, colours, radii, icon sizes and states; only the items are IELSco's.
// Elco's rem sizes are written in px here because IELSco's root font size is 75% (1rem = 12px, Elco's is 16px).
// Elco's .press / .panel-in classes are expressed with Tailwind (active:scale, tw-animate-css) so no global CSS changes.
export const ring = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";
const press = "transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100";

export type Leaf = { href: string; label: string; icon: LucideIcon; id: string; sub?: string; match?: string[]; exact?: boolean; count?: number };

export function Divider() {
  return <div role="separator" className="mx-[12px] border-t border-[#E3E7ED]" />;
}

export function SectionLabel({ children, id }: { children: React.ReactNode; id?: string }) {
  return <p id={id} className="mb-[6px] px-[16px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A97A8]">{children}</p>;
}

// Count chip: Elco's streak chip (coral on soft coral).
function Count({ n, label }: { n: number; label: string }) {
  if (!n) return null;
  return <span className="ml-auto rounded-full bg-[#FDEEEE] px-[10px] py-[2px] text-[12px] font-semibold text-[#C04C4E]">{n > 99 ? "99+" : n}<span className="sr-only"> {label}</span></span>;
}

// Secondary destination: plain row, tinted when current (Elco NavItem).
export function NavItem({ item, onClick, sub = false, testPrefix = "nav" }: { item: Leaf; onClick?: () => void; sub?: boolean; testPrefix?: string }) {
  const path = usePathname();
  const active = isChildActive(item, path);
  return (
    <Link href={item.href} onClick={onClick} data-testid={`${testPrefix}-item-${item.id}`} aria-current={active ? "page" : undefined}
      className={cn("flex items-center gap-[14px] rounded-[16px] text-[15px] transition-colors", ring,
        sub ? "min-h-[40px] px-[12px] py-[6px]" : "min-h-[44px] px-[16px] py-[8px] [@media(max-height:900px)]:min-h-[40px]",
        active ? "bg-[#E8EEF3] font-semibold text-[#1A2534]" : "text-[#4A5B70] hover:bg-[#2F4157]/[0.06] hover:text-[#2F4157]")}>
      <item.icon className={cn(sub ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]", "shrink-0")} strokeWidth={1.8} aria-hidden="true" />
      <span className="min-w-0 leading-tight"><span className="block">{item.label}</span>
        {item.sub && <span className="block text-[12px] font-normal text-[#6B7A8F] [@media(max-height:900px)]:hidden">{item.sub}</span>}</span>
      {item.count !== undefined && <Count n={item.count} label="unread" />}
    </Link>
  );
}

// A parent category: a button that opens and closes its group, never a page (Elco NavGroup). Open while one of its
// pages is current; otherwise closed unless the member opened it before (remembered on this device).
export function NavGroup({ id, label, icon: Icon, items, inside, onClick, testPrefix = "nav" }: {
  id: string; label: string; icon: LucideIcon; items: Leaf[]; inside: boolean; onClick?: () => void; testPrefix?: string;
}) {
  const key = `iels-nav-${id}`;
  const [open, setOpen] = useState(inside);
  useEffect(() => {
    if (inside) { setOpen(true); return; }
    try { if (window.localStorage.getItem(key) === "1") setOpen(true); } catch { /* storage unavailable */ }
  }, [inside, key]);
  const toggle = () => setOpen((o) => { try { window.localStorage.setItem(key, o ? "0" : "1"); } catch { /* storage unavailable */ } return !o; });
  const listId = `${testPrefix}-group-${id}`;
  return (
    <div data-testid={`${testPrefix}-group-${id}`}>
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls={listId} data-testid={`${testPrefix}-${id}`} aria-current={inside ? "true" : undefined}
        className={cn(press, "group flex w-full items-center gap-[12px] rounded-[16px] px-[10px] py-[8px] text-left text-[#1A2534] hover:bg-[#2F4157]/[0.06]", ring)}>
        <span className={cn("flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] transition-colors [@media(max-height:900px)]:h-[36px] [@media(max-height:900px)]:w-[36px]",
          inside ? "bg-[#2F4157] text-white" : "bg-[#F1F4F8] text-[#2F4157] group-hover:bg-white")}>
          <Icon className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex-1 text-[16px] font-semibold">{label}</span>
        <ChevronDown className={cn("h-[16px] w-[16px] text-[#8A97A8] transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} role="group" aria-label={label} className="ml-[29px] mt-[2px] grid gap-[2px] border-l border-[#E3E7ED] pl-[10px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300">
          {items.map((c) => <NavItem key={c.id} item={c} onClick={onClick} sub testPrefix={testPrefix} />)}
        </div>
      )}
    </div>
  );
}

// Home: taller row, the icon in its own tile; navy when current (Elco PrimaryItem).
export function PrimaryItem({ section, onClick, testPrefix = "nav" }: { section: Section; onClick?: () => void; testPrefix?: string }) {
  const { t } = useI18n();
  const path = usePathname();
  const active = isItemActive(section, path);
  return (
    <Link href={section.path} onClick={onClick} data-testid={`${testPrefix}-${section.id}`} aria-current={active ? "page" : undefined}
      className={cn("group relative flex items-center gap-[12px] overflow-hidden rounded-[16px] px-[10px] py-[8px] transition-colors", ring,
        active ? "bg-[#2F4157] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_rgba(47,65,87,0.22)]" : "text-[#1A2534] hover:bg-[#2F4157]/[0.06]")}>
      <span className={cn("flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[12px] [@media(max-height:900px)]:h-[36px] [@media(max-height:900px)]:w-[36px]",
        active ? "bg-white/15 text-white" : "bg-[#F1F4F8] text-[#2F4157] group-hover:bg-white")}>
        <section.icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="block text-[16px] font-semibold leading-tight">{t(section.key)}</span>
    </Link>
  );
}

// A group's pages as rows; the Inbox row carries the unread count.
export function sectionLeaves(section: Section, unread = 0): Leaf[] {
  return (section.children ?? []).map((c) => ({ ...c, count: c.id === "inbox" ? unread : undefined }));
}

export function NavLinks({ onNavigate, testPrefix = "nav" }: { onNavigate?: () => void; testPrefix?: string }) {
  const path = usePathname();
  const { t } = useI18n();
  const { isAdmin } = useStoryAdmin();
  const { unread } = useHeaderCounts();
  const [home, ...groups] = SECTIONS;
  return (
    <>
      <PrimaryItem section={home} onClick={onNavigate} testPrefix={testPrefix} />
      <Divider />
      {groups.map((s) => (
        <NavGroup key={s.id} id={s.id} label={t(s.key)} icon={s.icon} items={sectionLeaves(s, unread)} inside={isItemActive(s, path)} onClick={onNavigate} testPrefix={testPrefix} />
      ))}
      {isAdmin && (
        <>
          <Divider />
          <div className="flex flex-col gap-[2px]">
            {ADMIN_NAV_GROUP.items.map((i) => <NavItem key={i.id} item={{ href: i.path, label: t(i.key), icon: i.icon, id: i.id }} onClick={onNavigate} testPrefix={testPrefix} />)}
          </div>
        </>
      )}
    </>
  );
}
