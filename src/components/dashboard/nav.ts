import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck, BookOpenText, Bookmark, ClipboardList, Compass, Earth, GraduationCap, HelpCircle, Home, ListChecks, Menu, MessagesSquare, Settings,
  Target, User,
} from "lucide-react";

// Dashboard information architecture (2026-10-29): exactly five top-level menus.
//   Home     /dashboard
//   Discover People (Connect discovery + Passport + the older People directory), Circles, Opportunities, IELSco Pulse,
//            SEA Cultural Exchange
//   Social   Intro requests, Messages, Connections, Safety
//   Connect  Quick Match, Rooms & Events (community rooms + official IELS events), Connect with Elco
//   More     Goals, Membership, Saved, My Learning, Profile, Settings, Help
// Every older URL stays reachable; `match` lists the URL prefixes that belong to each menu so the right one is
// highlighted and its section tabs are shown (DashboardLayout → SectionTabs).
export type NavItem = { key: string; path: string; icon: LucideIcon; id: string; match?: string[] };
export type NavGroup = { id: string; title: string | null; items: NavItem[] };
export type SectionTab = { label: string; href: string; match?: string[]; exact?: boolean };

export const SECTIONS: (NavItem & { tabs?: SectionTab[] })[] = [
  { key: "nav.home", path: "/dashboard", icon: Home, id: "home" },
  {
    key: "nav.discover", path: "/dashboard/discover", icon: Compass, id: "discover",
    match: ["/dashboard/discover", "/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/connect/passport", "/dashboard/people",
      "/dashboard/circles", "/dashboard/circle", "/dashboard/pulse", "/dashboard/explore", "/dashboard/sea-exchange"],
    tabs: [
      { label: "Overview", href: "/dashboard/discover", exact: true },
      { label: "People", href: "/dashboard/connect/discover", match: ["/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/connect/passport", "/dashboard/people"] },
      { label: "Circles", href: "/dashboard/circles", match: ["/dashboard/circles", "/dashboard/circle"] },
      { label: "Opportunities", href: "/dashboard/discover/opportunities" },
      { label: "IELSco Pulse", href: "/dashboard/pulse", match: ["/dashboard/pulse", "/dashboard/explore"] },
      { label: "SEA Cultural Exchange", href: "/dashboard/sea-exchange" },
    ],
  },
  {
    key: "nav.social", path: "/dashboard/social", icon: MessagesSquare, id: "social",
    match: ["/dashboard/social", "/dashboard/connect/requests", "/dashboard/connect/messages", "/dashboard/connect/connections", "/dashboard/connect/safety"],
    tabs: [
      { label: "Overview", href: "/dashboard/social", exact: true },
      { label: "Intro requests", href: "/dashboard/connect/requests" },
      { label: "Messages", href: "/dashboard/connect/messages" },
      { label: "Connections", href: "/dashboard/connect/connections" },
      { label: "Safety", href: "/dashboard/connect/safety" },
    ],
  },
  {
    key: "nav.connect", path: "/dashboard/connect", icon: Earth, id: "connect",
    match: ["/dashboard/connect/quick-match", "/dashboard/connect/rooms", "/dashboard/events", "/dashboard/connect/elco"],
    tabs: [
      { label: "Overview", href: "/dashboard/connect", exact: true },
      { label: "Quick Match", href: "/dashboard/connect/quick-match" },
      { label: "Rooms & Events", href: "/dashboard/connect/rooms", match: ["/dashboard/connect/rooms", "/dashboard/events"] },
      { label: "Connect with Elco", href: "/dashboard/connect/elco" },
    ],
  },
];

// "More": supporting features. A disclosure in the sidebar, the bottom sheet on phones.
export const MORE_ITEMS: NavItem[] = [
  { key: "nav.myGoals", path: "/dashboard/my-goals", icon: Target, id: "my-goals" },
  { key: "nav.membership", path: "/dashboard/membership", icon: BadgeCheck, id: "membership", match: ["/dashboard/membership", "/dashboard/settings/membership"] },
  { key: "nav.myShelf", path: "/dashboard/shelf", icon: Bookmark, id: "shelf" },
  { key: "nav.myLearning", path: "/dashboard/my-learning", icon: GraduationCap, id: "my-learning" },
  { key: "nav.profile", path: "/dashboard/profile", icon: User, id: "my-profile" },
  { key: "nav.settings", path: "/dashboard/settings", icon: Settings, id: "settings" },
  { key: "nav.help", path: "/dashboard/help", icon: HelpCircle, id: "help" },
];
export const MORE_SECTION: NavItem = { key: "nav.more", path: "#more", icon: Menu, id: "more" };

// Kept for older imports: the four section links (Home, Discover, Social, Connect) as one group.
export const NAV_GROUPS: NavGroup[] = [{ id: "main", title: null, items: SECTIONS }];
export const NAV_ITEMS: NavItem[] = [...SECTIONS, ...MORE_ITEMS];

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

// Phone bottom bar: the four sections + "More" (opens the sheet).
export const MOBILE_ITEMS: NavItem[] = SECTIONS;

// Account menu (profile area), desktop and mobile.
export const ACCOUNT_ITEMS: NavItem[] = MORE_ITEMS.filter((i) => ["my-profile", "my-learning", "settings", "help"].includes(i.id));

const under = (prefix: string, pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isNavActive(path: string, pathname: string | null) {
  if (!pathname) return false;
  return path === "/dashboard" ? pathname === "/dashboard" : under(path, pathname);
}

// Active state for a menu item that owns several URL prefixes. /dashboard/connect itself is the Connect overview, but
// /dashboard/connect/<x> belongs to whichever section lists it.
export function isItemActive(item: NavItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.path === "/dashboard") return pathname === "/dashboard";
  if (item.match?.some((m) => under(m, pathname))) return true;
  if (item.id === "connect") return pathname === "/dashboard/connect";
  return under(item.path, pathname);
}

export const sectionFor = (pathname: string | null) => SECTIONS.find((s) => s.id !== "home" && isItemActive(s, pathname)) ?? null;
export const moreActive = (pathname: string | null) => MORE_ITEMS.some((i) => isItemActive(i, pathname));

export function isTabActive(tab: SectionTab, pathname: string | null) {
  if (!pathname) return false;
  if (tab.exact) return pathname === tab.href;
  return [tab.href, ...(tab.match ?? [])].some((m) => under(m, pathname));
}
