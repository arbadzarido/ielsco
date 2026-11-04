import type { LucideIcon } from "lucide-react";
import { CircleCIcon } from "@/components/brand/CircleCIcon";
import {
  BadgeCheck, BookOpenText, Bookmark, CalendarDays, ClipboardList, Compass, GraduationCap, HandHeart, HelpCircle, Home, IdCard,
  Library, ListChecks, MessageCircle, Newspaper, BriefcaseBusiness, Settings, Users, UsersRound,
} from "lucide-react";

// Dashboard navigation (2026-11-05, docs/IELSCO-PRODUCT-ARCHITECTURE.md §2), drawn by the Elco-style sidebar, phone
// top bar and dock (sidebar/NavLinks.tsx, DashboardHeader.tsx, MobileTabBar.tsx). The visible structure is exactly:
//   Home
//   Social ▾     People, Inbox
//   Discover ▾   Programs, Opportunities, News & Stories, Learning Materials
//   Events ▾     Circle, IELSco Events, Other Events
// Pages that are no longer in the sidebar keep their routes. Each one is listed in a `match` below so the right group
// stays highlighted on it: Connections, intro requests and Elco-Pass belong to People; IELSco Talks to IELSco Events;
// Circle groups, Cultural exchange and Quick Match are hidden but routed (Social).
// Circle (2026-11-05 revision) is the ongoing IELS Circle community and speaking club, with its own destination and the
// official Circle "C" mark; IELSco Events are official one-time events and IELSco Talks; Other Events are external.
// Personal pages (Saved, Membership, settings…) are in the profile card menu (ACCOUNT_ITEMS).
export type NavItem = { key: string; path: string; icon: LucideIcon; id: string; match?: string[] };
export type NavGroup = { id: string; title: string | null; items: NavItem[] };
// A group's page: `match` = other URL prefixes that count as this page; `exact` = only this URL.
export type NavChild = { label: string; href: string; icon: LucideIcon; id: string; match?: string[]; exact?: boolean };
export type Section = NavItem & { children?: NavChild[] };

const PEOPLE_PAGES = ["/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/people", "/dashboard/connect/connections",
  "/dashboard/connect/requests", "/dashboard/passport", "/dashboard/connect/passport", "/dashboard/my-learning", "/dashboard/connect/elco"];

export const SECTIONS: Section[] = [
  { key: "nav.home", path: "/dashboard", icon: Home, id: "home" },
  {
    // `path` is where the phone dock's Social cell goes: the group's first page.
    key: "nav.social", path: "/dashboard/connect/discover", icon: UsersRound, id: "social",
    match: [...PEOPLE_PAGES, "/dashboard/social", "/dashboard/connect/messages", "/dashboard/connect/safety", "/dashboard/circles",
      "/dashboard/sea-exchange", "/dashboard/connect/quick-match"],
    children: [
      { label: "People", href: "/dashboard/connect/discover", icon: Users, id: "people", match: PEOPLE_PAGES },
      { label: "Inbox", href: "/dashboard/connect/messages", icon: MessageCircle, id: "inbox" },
    ],
  },
  {
    key: "nav.discover", path: "/dashboard/programs", icon: Compass, id: "discover",
    match: ["/dashboard/discover", "/dashboard/opportunities", "/dashboard/explore", "/dashboard/pulse", "/dashboard/programs", "/dashboard/search"],
    children: [
      { label: "Programs", href: "/dashboard/programs", icon: GraduationCap, id: "programs" },
      { label: "Opportunities", href: "/dashboard/discover/opportunities", icon: BriefcaseBusiness, id: "opportunities", match: ["/dashboard/opportunities"] },
      { label: "News & Stories", href: "/dashboard/discover/stories", icon: Newspaper, id: "stories" },
      { label: "Learning Materials", href: "/dashboard/explore", icon: Library, id: "materials", match: ["/dashboard/pulse"] },
    ],
  },
  {
    key: "nav.events", path: "/dashboard/events/ielsco", icon: CalendarDays, id: "events",
    match: ["/dashboard/events", "/dashboard/circle", "/dashboard/connect/rooms"],
    children: [
      { label: "Circle", href: "/dashboard/circle", icon: CircleCIcon, id: "circle" },
      // IELSco Talks are part of IELSco Events (a section on that page), not an item of their own.
      { label: "IELSco Events", href: "/dashboard/events/ielsco", icon: CalendarDays, id: "ielsco-events", match: ["/dashboard/events"] },
      { label: "Other Events", href: "/dashboard/connect/rooms", icon: HandHeart, id: "other-events" },
    ],
  },
];

// Profile card menu (sidebar bottom) and the Account part of the phone More sheet.
export const ACCOUNT_ITEMS: NavItem[] = [
  { key: "nav.profilePassport", path: "/dashboard/passport", icon: IdCard, id: "my-profile", match: ["/dashboard/profile"] },
  { key: "nav.saved", path: "/dashboard/shelf", icon: Bookmark, id: "shelf" },
  { key: "nav.membership", path: "/dashboard/membership", icon: BadgeCheck, id: "membership", match: ["/dashboard/membership", "/dashboard/settings/membership"] },
  { key: "nav.settings", path: "/dashboard/settings", icon: Settings, id: "settings" },
  { key: "nav.help", path: "/dashboard/help", icon: HelpCircle, id: "help" },
];

// Kept for older imports.
export const NAV_GROUPS: NavGroup[] = [{ id: "main", title: null, items: SECTIONS }];
export const NAV_ITEMS: NavItem[] = [...SECTIONS, ...ACCOUNT_ITEMS];

// Shown only to staff admins (public.staff_roles, checked with useStoryAdmin). Access is enforced by RLS / RPCs.
export const ADMIN_NAV_GROUP: NavGroup = {
  id: "admin",
  title: "nav.adminGroup",
  items: [
    { key: "nav.memberStories", path: "/dashboard/admin/stories", icon: BookOpenText, id: "admin-stories" },
    { key: "nav.adminOperations", path: "/dashboard/admin/operations", icon: ClipboardList, id: "admin-operations" },
    { key: "nav.adminOpportunities", path: "/dashboard/admin/opportunities", icon: ListChecks, id: "admin-opportunities" },
  ],
};

// Hidden features that can be put back later without code changes elsewhere: Quick Match returns as a Social page
// with NEXT_PUBLIC_QUICK_MATCH_IN_NAV=true (it still needs connect_settings.quick_match_enabled and a TURN relay).
export const QUICK_MATCH_IN_NAV = process.env.NEXT_PUBLIC_QUICK_MATCH_IN_NAV === "true";
if (QUICK_MATCH_IN_NAV) {
  SECTIONS.find((s) => s.id === "social")?.children?.push({ label: "Quick Match (beta)", href: "/dashboard/connect/quick-match", icon: UsersRound, id: "quick-match" });
}

const under = (prefix: string, pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isNavActive(path: string, pathname: string | null) {
  if (!pathname) return false;
  return path === "/dashboard" ? pathname === "/dashboard" : under(path, pathname);
}

// Active state for a menu item that owns several URL prefixes.
export function isItemActive(item: NavItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.path === "/dashboard") return pathname === "/dashboard";
  if (item.match?.some((m) => under(m, pathname))) return true;
  if (item.id === "social") return pathname === "/dashboard/connect";
  return under(item.path, pathname);
}

export function isChildActive(c: NavChild, pathname: string | null) {
  if (!pathname) return false;
  if (c.exact) return pathname === c.href;
  return [c.href, ...(c.match ?? [])].some((m) => under(m, pathname));
}

export const sectionFor = (pathname: string | null) => SECTIONS.find((s) => s.id !== "home" && isItemActive(s, pathname)) ?? null;
