"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, BarChart3, Bot, Briefcase, CalendarDays, CalendarRange, CheckSquare, ChevronsLeft, ChevronsRight, ChevronDown, FileText, Handshake,
  Hash, Home, Inbox, KeyRound, Layers, LineChart, LogOut, Mail, Megaphone, Menu, PenLine, PiggyBank, ScrollText, Settings, Shield, Target, UserPlus, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type CompanyCode } from "@/lib/os/types";
import { WORKSPACES, workspaceByCode } from "@/lib/os/meta";
import { OsProvider, useOs } from "./OsProvider";
import { Avatar, Empty, Loading, btn, btnPrimary, ring } from "./ui";
import { ChoiceProvider } from "./dialogs";
import { NotificationsButton } from "./notifications";
import { useRecruitmentAccess } from "./recruitment-access";
import { useMyWorkspaces } from "./workspaces";
import { accessLabel, workspaceFromPath, workspaceHref, workspaceNav, type WsNavItem } from "@/lib/os/workspaces";

const WS_ICON: Record<WsNavItem["icon"], typeof Home> = {
  home: Home, briefcase: Briefcase, check: CheckSquare, file: FileText, inbox: Inbox, shield: Shield, megaphone: Megaphone,
  handshake: Handshake, users: Users, userplus: UserPlus, scroll: ScrollText,
  wallet: Wallet, piggy: PiggyBank, chart: LineChart, settings: Settings, mail: Mail, signature: PenLine, calendar: CalendarDays, hash: Hash,
};

// The Company OS frame: a persistent, collapsible sidebar on desktop and a drawer on phones. Navigation only lists
// modules that exist; Admin shows for founders. What each page shows is decided by RLS, not by this menu.

type NavItem = { href: string; label: string; icon: typeof Home; match?: RegExp; founderOnly?: boolean };
const NAV: { group?: string; items: NavItem[] }[] = [
  { items: [
    { href: "/os", label: "Home", icon: Home, match: /^\/os\/?$/ },
    { href: "/os/tasks?view=mine", label: "My tasks", icon: Inbox },
    { href: "/os/assistant", label: "Assistant", icon: Bot },
  ] },
  { group: "Work", items: [
    { href: "/os/projects", label: "Projects", icon: Briefcase },
    { href: "/os/tasks?view=board", label: "Tasks", icon: CheckSquare },
    { href: "/os/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/os/documents", label: "Documents", icon: FileText },
    { href: "/os/timeline", label: "Timeline", icon: CalendarRange },
  ] },
  { group: "Performance", items: [
    { href: "/os/kpis", label: "KPIs", icon: BarChart3 },
    { href: "/os/okrs", label: "OKRs", icon: Target },
    { href: "/os/people", label: "People", icon: Users },
    { href: "/os/reviews", label: "Reviews", icon: ScrollText },
  ] },
  { group: "Growth", items: [
    { href: "/os/partnerships", label: "Partnerships", icon: Handshake },
    { href: "/os/campaigns", label: "Campaigns", icon: Megaphone },
  ] },
];

export function CompanyLogo({ code, size = 20 }: { code: CompanyCode | string; size?: number }) {
  const w = workspaceByCode(code);
  if (!w) return null;
  if (code === "HQ") {
    // HQ is the founders' office shared by both companies: both real marks, side by side.
    return (
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }} aria-label="HQ (IELSco and Elco AI)" role="img">
        <Image src="/icon-192.png" alt="" width={size} height={size} className="absolute left-0 top-0 rounded-[4px]" style={{ width: size * 0.72, height: size * 0.72 }} />
        <span className="absolute bottom-0 right-0 rounded-full bg-white p-px" style={{ width: size * 0.62, height: size * 0.62 }}>
          <Image src="/images/contents/mascot/elco.svg" alt="" width={size} height={size} className="h-full w-full object-contain" />
        </span>
      </span>
    );
  }
  return <Image src={w.logo} alt={w.logoAlt} width={size} height={size} className={cn("shrink-0 object-contain", code === "IEL" && "rounded-[4px]")} style={{ width: size, height: size }} />;
}

function Gate({ children }: { children: ReactNode }) {
  const { state, reload } = useOs();
  if (state.status === "loading") return <Loading label="Checking your access…" />;
  if (state.status === "error")
    return <Empty title="Something went wrong" body={state.message} action={<button type="button" className={btn} onClick={reload}>Try again</button>} />;
  if (state.status === "signed-out")
    return <Empty title="Your session has ended" body="Sign in again to continue." action={<Link href="/os/login" className={btnPrimary}>Sign in</Link>} />;
  if (state.status === "not-staff")
    return (
      <Empty title="No access" body="This account can't use Company OS right now. If you think that's wrong, ask a founder."
        action={<form action="/os/auth/signout" method="post"><button type="submit" className={btn}>Sign out</button></form>} />
    );
  return <>{children}</>;
}

function WorkspaceSwitcher({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { state } = useOs();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const me = state.status === "ready" ? state.me : null;
  const allowed = WORKSPACES.filter((w) => w.code === "HQ" || me?.companies.includes(w.code) || me?.isAdmin);
  const current = WORKSPACES.find((w) => pathname.startsWith(`/os/w/${w.slug}`)) ?? null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" data-testid="os-workspace-switcher"
        className={cn("flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-[#EDF0F4]", ring)} title="Switch workspace">
        <CompanyLogo code={current?.code ?? "HQ"} size={22} />
        {!collapsed && <>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-[#1F2D3D]">{current ? current.name : "All workspaces"}</span>
            <span className="block truncate text-xs text-[#66768A]">{current ? current.legal : "Choose HQ, IELSco or Elco"}</span>
          </span>
          <ChevronDown size={16} className="text-[#66768A]" aria-hidden="true" />
        </>}
      </button>
      {open && (
        <div role="menu" className={cn("absolute z-40 mt-1 w-64 rounded-xl border border-[#E1E5EB] bg-white p-1 shadow-xl", collapsed ? "left-full top-0 ml-2" : "left-0")}>
          {allowed.map((w) => (
            <button key={w.code} type="button" role="menuitem" data-testid={`os-workspace-${w.slug}`}
              onClick={() => { setOpen(false); onNavigate(); router.push(`/os/w/${w.slug}`); }}
              className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm hover:bg-[#F3F5F8]", ring, current?.code === w.code && "bg-[#F3F5F8]")}>
              <CompanyLogo code={w.code} size={24} />
              <span className="min-w-0">
                <span className="block font-medium text-[#1F2D3D]">{w.name}</span>
                <span className="block truncate text-xs text-[#66768A]">{w.legal}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { state } = useOs();
  const pathname = usePathname();
  const search = useSearchParams();
  const me = state.status === "ready" ? state.me : null;
  const isFounder = me?.person.org_role === "founder";
  const active = (n: NavItem) => {
    if (n.match) return n.match.test(pathname);
    const base = n.href.split("?")[0];
    if (base === "/os/tasks" && pathname.startsWith("/os/tasks")) {
      const mine = pathname === "/os/tasks" && (search.get("view") ?? "mine") === "mine";
      return n.label === "My tasks" ? mine : !mine;
    }
    return pathname === base || pathname.startsWith(`${base}/`);
  };
  // Recruitment shows only for the recruitment team and people assigned to evaluate a candidate.
  const recruit = useRecruitmentAccess();
  const nav = recruit && (recruit.team || recruit.assigned > 0)
    ? NAV.map((g) => (g.group === "Performance" ? { ...g, items: [...g.items, { href: "/os/recruitment", label: "Recruitment", icon: UserPlus }] } : g))
    : NAV;
  const groups = [...nav, ...(isFounder ? [{ group: "Founders", items: [{ href: "/os/admin", label: "Admin", icon: Shield }] }] : [])];
  const wsCode = workspaceFromPath(pathname);

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-3 pb-2 pt-3", collapsed && "justify-center px-2")}>
        <Link href="/os" onClick={onNavigate} className={cn("flex items-center gap-2 rounded-lg text-sm font-semibold text-[#1F2D3D]", ring)}>
          <Image src="/icon-192.png" alt="" width={24} height={24} className="rounded-md" />
          {!collapsed && <span>Company OS</span>}
        </Link>
      </div>
      {me && <div className="px-2 pb-2"><WorkspaceSwitcher collapsed={collapsed} onNavigate={onNavigate} /></div>}
      <nav aria-label="Company OS" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {me && wsCode && <WorkspaceGroup code={wsCode} collapsed={collapsed} onNavigate={onNavigate} recruitment={Boolean(recruit && (recruit.team || recruit.assigned > 0))} />}
        {me && !wsCode && groups.map((g, i) => (
          <div key={g.group ?? i} className="mt-2">
            {g.group && !collapsed && <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#8593A3]">{g.group}</p>}
            {g.group && collapsed && <div className="mx-2 my-2 border-t border-[#E6E9EE]" />}
            <ul className="space-y-0.5">
              {g.items.map((n) => {
                const Icon = n.icon;
                const on = active(n);
                return (
                  <li key={n.href}>
                    <Link href={n.href} onClick={onNavigate} aria-current={on ? "page" : undefined} title={collapsed ? n.label : undefined}
                      className={cn("flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm md:min-h-8", ring, collapsed && "justify-center",
                        on ? "bg-[#E4E9EF] font-semibold text-[#1F2D3D]" : "text-[#3A4B60] hover:bg-[#EDF0F4]")}>
                      <Icon size={17} aria-hidden="true" className={on ? "text-[#2F4157]" : "text-[#66768A]"} />
                      {!collapsed && <span className="truncate">{n.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {me && !collapsed && (
          <div className="mt-4">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8593A3]">Workspaces</p>
            <ul className="space-y-0.5">
              {WORKSPACES.filter((w) => w.code === "HQ" || me.companies.includes(w.code) || me.isAdmin).map((w) => (
                <li key={w.code}>
                  <Link href={`/os/w/${w.slug}`} onClick={onNavigate} aria-current={pathname.startsWith(`/os/w/${w.slug}`) ? "page" : undefined}
                    className={cn("flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm md:min-h-8", ring,
                      pathname.startsWith(`/os/w/${w.slug}`) ? "bg-[#E4E9EF] font-semibold text-[#1F2D3D]" : "text-[#3A4B60] hover:bg-[#EDF0F4]")}>
                    <CompanyLogo code={w.code} size={18} /> <span className="truncate">{w.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {me && <DivisionList collapsed={collapsed} onNavigate={onNavigate} current={wsCode} />}
      </nav>
      {me && (
        <div className={cn("border-t border-[#E6E9EE] p-2", collapsed && "flex flex-col items-center gap-1")}>
          <NotificationsButton compact={collapsed} />
          <Link href="/os/account" onClick={onNavigate} data-testid="os-profile-link" title={collapsed ? "My account" : undefined}
            className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-2 hover:bg-[#EDF0F4]", ring, pathname.startsWith("/os/account") && "bg-[#E4E9EF]")}>
            <Avatar name={me.person.full_name} size={26} />
            {!collapsed && <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-medium text-[#1F2D3D]">{me.person.short_name || me.person.full_name}</span>
              <span className="block truncate text-xs text-[#66768A]">{ROLE_LABEL[me.person.org_role]}{me.needsMfa ? " · verify to unlock Admin" : ""}</span>
            </span>}
            {!collapsed && <Settings size={15} className="text-[#8593A3]" aria-hidden="true" />}
          </Link>
          <form action="/os/auth/signout" method="post">
            <button type="submit" title="Sign out" className={cn("mt-0.5 flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2 text-sm text-[#3A4B60] hover:bg-[#EDF0F4] md:min-h-8", ring, collapsed && "justify-center")}>
              <LogOut size={16} aria-hidden="true" className="text-[#66768A]" />{!collapsed && "Sign out"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function NavLink({ href, label, icon: Icon, on, collapsed, onNavigate, testId }: { href: string; label: string; icon: typeof Home; on: boolean; collapsed: boolean; onNavigate: () => void; testId?: string }) {
  return (
    <Link href={href} onClick={onNavigate} aria-current={on ? "page" : undefined} title={collapsed ? label : undefined} data-testid={testId}
      className={cn("flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm md:min-h-8", ring, collapsed && "justify-center",
        on ? "bg-[#E4E9EF] font-semibold text-[#1F2D3D]" : "text-[#3A4B60] hover:bg-[#EDF0F4]")}>
      <Icon size={17} aria-hidden="true" className={on ? "text-[#2F4157]" : "text-[#66768A]"} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

// Inside a division workspace the sidebar is that workspace's: its sections and its division's modules, only those the
// person can open. The rest of Company OS is one link away.
function WorkspaceGroup({ code, collapsed, onNavigate, recruitment }: { code: string; collapsed: boolean; onNavigate: () => void; recruitment: boolean }) {
  const { list } = useMyWorkspaces();
  const pathname = usePathname();
  const search = useSearchParams();
  const ws = list?.find((w) => w.code === code);
  const items = ws ? workspaceNav(ws, { recruitment, requests: true }) : [];
  const tab = search.get("tab") ?? "overview";
  const on = (i: WsNavItem) => (i.href.startsWith("/os/d/") ? pathname.startsWith(`/os/d/${code.toLowerCase()}`) && tab === i.key : pathname.startsWith(i.href));
  return (
    <div className="mt-2" data-testid="os-ws-nav">
      <NavLink href="/os" label="Company OS" icon={ArrowLeft} on={false} collapsed={collapsed} onNavigate={onNavigate} testId="os-ws-back" />
      {!collapsed && <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[#8593A3]">{ws?.name ?? code} workspace</p>}
      {collapsed && <div className="mx-2 my-2 border-t border-[#E6E9EE]" />}
      <ul className="space-y-0.5">
        {items.map((i) => <li key={i.key}><NavLink href={i.href} label={i.label} icon={WS_ICON[i.icon]} on={on(i)} collapsed={collapsed} onNavigate={onNavigate} testId={`os-ws-nav-${i.key.replace(/[^a-z]/g, "")}`} /></li>)}
      </ul>
    </div>
  );
}

function DivisionList({ collapsed, onNavigate, current }: { collapsed: boolean; onNavigate: () => void; current: string | null }) {
  const { list } = useMyWorkspaces();
  const pathname = usePathname();
  const mine = (list ?? []).filter((w) => w.access !== "none");
  if (collapsed || !list) return null;
  return (
    <div className="mt-4" data-testid="os-divisions">
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8593A3]">Divisions</p>
      <ul className="space-y-0.5">
        {mine.map((w) => (
          <li key={w.code}>
            <Link href={workspaceHref(w.code)} onClick={onNavigate} aria-current={current === w.code ? "page" : undefined} data-testid={`os-division-${w.code.toLowerCase()}`}
              className={cn("flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm md:min-h-8", ring,
                current === w.code ? "bg-[#E4E9EF] font-semibold text-[#1F2D3D]" : "text-[#3A4B60] hover:bg-[#EDF0F4]")}>
              <Layers size={16} aria-hidden="true" className="text-[#66768A]" />
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="text-[11px] text-[#8593A3]">{accessLabel(w)}</span>
            </Link>
          </li>
        ))}
        <li><NavLink href="/os/requests" label="Requests" icon={Inbox} on={pathname.startsWith("/os/requests")} collapsed={false} onNavigate={onNavigate} testId="os-requests-link" /></li>
        <li><NavLink href="/os/finance" label="Expenses and income" icon={Wallet} on={pathname.startsWith("/os/finance")} collapsed={false} onNavigate={onNavigate} testId="os-money-link" /></li>
        <li><NavLink href="/os/access" label="Access requests" icon={KeyRound} on={pathname.startsWith("/os/access")} collapsed={false} onNavigate={onNavigate} testId="os-access-link" /></li>
      </ul>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { try { setCollapsed(localStorage.getItem("os.sidebar") === "collapsed"); } catch { /* storage blocked */ } }, []);
  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = ""; };
  }, [drawer]);
  const toggle = () => setCollapsed((c) => { try { localStorage.setItem("os.sidebar", c ? "open" : "collapsed"); } catch { /* ignore */ } return !c; });

  return (
    <div className="min-h-dvh bg-[#F7F8FA] text-[#1F2D3D]" data-testid="os-shell">
      <a href="#os-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {/* Desktop sidebar */}
      <aside data-testid="os-sidebar" aria-label="Sidebar"
        className={cn("fixed inset-y-0 left-0 z-30 hidden border-r border-[#E6E9EE] bg-[#F3F5F8] transition-[width] duration-150 lg:block", collapsed ? "w-[60px]" : "w-60")}>
        <SidebarBody collapsed={collapsed} onNavigate={() => {}} />
        <button type="button" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} data-testid="os-sidebar-toggle"
          className={cn("absolute -right-3 top-14 flex h-6 w-6 items-center justify-center rounded-full border border-[#E1E5EB] bg-white text-[#66768A] shadow-sm hover:text-[#1F2D3D]", ring)}>
          {collapsed ? <ChevronsRight size={14} aria-hidden="true" /> : <ChevronsLeft size={14} aria-hidden="true" />}
        </button>
      </aside>

      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#E6E9EE] bg-white/95 px-2 backdrop-blur lg:hidden" data-testid="os-topbar">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} data-testid="os-menu-button"
          className={cn("flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#F0F2F5]", ring)}>
          <Menu size={20} aria-hidden="true" />
        </button>
        <Link href="/os" className={cn("flex items-center gap-2 rounded-lg text-sm font-semibold", ring)}>
          <Image src="/icon-192.png" alt="" width={22} height={22} className="rounded-md" /> Company OS
        </Link>
        <span className="ml-auto"><TopbarBell /></span>
      </header>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu" data-testid="os-drawer">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-[#0F1B2A]/35" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs bg-[#F3F5F8] shadow-2xl">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu"
              className={cn("absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-[#E6E9EE]", ring)}>
              <X size={20} aria-hidden="true" />
            </button>
            <SidebarBody collapsed={false} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <main id="os-main" className={cn("min-w-0 transition-[padding] duration-150", collapsed ? "lg:pl-[60px]" : "lg:pl-60")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-6 md:py-7">
          <Gate>{children}</Gate>
        </div>
      </main>
    </div>
  );
}

function TopbarBell() {
  const { state } = useOs();
  return state.status === "ready" ? <NotificationsButton compact /> : null;
}

export function OsShell({ children }: { children: ReactNode }) {
  return (
    <OsProvider>
      <ChoiceProvider>
        <Frame>{children}</Frame>
      </ChoiceProvider>
    </OsProvider>
  );
}
