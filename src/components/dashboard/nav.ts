import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck, Bell, BookOpenText, GraduationCap, MessageCircle, Search, Bookmark, BriefcaseBusiness, CalendarDays, CalendarHeart, ClipboardList, Compass, Earth,
  HandHeart, HelpCircle, Home, IdCard, Library, ListChecks, Mic, Newspaper, Settings, ShieldCheck, Sparkles, Target, Trophy, User, UserPlus,
  Users, UsersRound,
} from "lucide-react";

// Dashboard information architecture (2026-11-04, docs/IELSCO-PRODUCT-ARCHITECTURE.md §2), drawn by the same sidebar,
// phone top bar and dock as Elco's AppShell (sidebar/NavLinks.tsx, DashboardHeader.tsx, MobileTabBar.tsx):
//   Home         /dashboard                  personal command center
//   Social ▼     People, Connections, Intro requests, Circle groups, Cultural exchange, Safety
//   Discover ▼   Opportunities (primary), News & Stories, Learning Materials (+ tracker, courses)
//   Events ▼     My events, IELSco Events, IELS Circle, Talks, Other Events
//   EL-Passport  identity, learning journey, Elco progress, milestones
//   More ▾       personal tools (MORE_ITEMS); then Inbox, Notifications, Search (UTILITY_ITEMS)
// Profile, settings and help are in the profile card menu (ACCOUNT_ITEMS); the Elco card sits above it.
// Every older URL stays reachable; `match` lists the URL prefixes that belong to each menu so the right one is
// highlighted and its section tabs are shown (DashboardLayout → SectionTabs).
// Quick Match is not in the navigation (no TURN relay yet, see §10); its route, code and database stay.
export type NavItem = { key: string; path: string; icon: LucideIcon; id: string; match?: string[] };
export type NavGroup = { id: string; title: string | null; items: NavItem[] };
export type SectionTab = { label: string; href: string; match?: string[]; exact?: boolean };
// A dropdown entry: label + one line of description. `primary` is drawn as the highlighted first entry.
export type MenuLink = { label: string; description: string; href: string; icon: LucideIcon; primary?: boolean; testId: string };
export type Section = NavItem & { tabs?: SectionTab[]; menu?: MenuLink[] };

export const SECTIONS: Section[] = [
  { key: "nav.home", path: "/dashboard", icon: Home, id: "home" },
  {
    key: "nav.social", path: "/dashboard/social", icon: UsersRound, id: "social",
    match: ["/dashboard/social", "/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/people", "/dashboard/connect/requests",
      "/dashboard/connect/connections", "/dashboard/connect/messages", "/dashboard/connect/safety", "/dashboard/circles", "/dashboard/sea-exchange",
      "/dashboard/connect/quick-match"],
    tabs: [
      { label: "Overview", href: "/dashboard/social", exact: true },
      { label: "People", href: "/dashboard/connect/discover", match: ["/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/people"] },
      { label: "Connections", href: "/dashboard/connect/connections" },
      { label: "Intro requests", href: "/dashboard/connect/requests" },
      { label: "Inbox", href: "/dashboard/connect/messages" },
      { label: "Circle groups", href: "/dashboard/circles" },
      { label: "Cultural exchange", href: "/dashboard/sea-exchange" },
      { label: "Safety", href: "/dashboard/connect/safety" },
    ],
    menu: [
      { label: "People", description: "Members with shared goals and interests", href: "/dashboard/connect/discover", icon: Users, primary: true, testId: "people" },
      { label: "Connections", description: "The people you're connected with", href: "/dashboard/connect/connections", icon: UsersRound, testId: "connections" },
      { label: "Intro requests", description: "Letter Intros you sent or received", href: "/dashboard/connect/requests", icon: UserPlus, testId: "requests" },
      { label: "Circle groups", description: "Topic discussions with other members", href: "/dashboard/circles", icon: Sparkles, testId: "circle-groups" },
      { label: "Cultural exchange", description: "Southeast Asian perspectives, one prompt a week", href: "/dashboard/sea-exchange", icon: Earth, testId: "sea" },
    ],
  },
  {
    key: "nav.discover", path: "/dashboard/discover", icon: Compass, id: "discover",
    match: ["/dashboard/discover", "/dashboard/opportunities", "/dashboard/explore", "/dashboard/pulse", "/dashboard/programs"],
    tabs: [
      { label: "Overview", href: "/dashboard/discover", exact: true },
      { label: "Opportunities", href: "/dashboard/discover/opportunities" },
      { label: "My tracker", href: "/dashboard/opportunities" },
      { label: "News & Stories", href: "/dashboard/discover/stories" },
      { label: "Learning Materials", href: "/dashboard/explore" },
      { label: "Courses", href: "/dashboard/programs" },
    ],
    menu: [
      { label: "Opportunities", description: "Scholarships, internships, jobs, fellowships, exchanges and more", href: "/dashboard/discover/opportunities", icon: BriefcaseBusiness, primary: true, testId: "opportunities" },
      { label: "News & Stories", description: "IELSco news and member stories", href: "/dashboard/discover/stories", icon: Newspaper, testId: "stories" },
      { label: "Learning Materials", description: "Guides, videos, podcasts and collections", href: "/dashboard/explore", icon: Library, testId: "materials" },
      { label: "My opportunity tracker", description: "Interested, applying, applied", href: "/dashboard/opportunities", icon: ListChecks, testId: "tracker" },
    ],
  },
  {
    key: "nav.events", path: "/dashboard/events", icon: CalendarDays, id: "events",
    match: ["/dashboard/events", "/dashboard/circle", "/dashboard/connect/rooms"],
    tabs: [
      { label: "My events", href: "/dashboard/events", exact: true },
      { label: "IELSco Events", href: "/dashboard/events/ielsco" },
      { label: "IELS Circle", href: "/dashboard/circle" },
      { label: "Talks", href: "/dashboard/events/talks" },
      { label: "Other Events", href: "/dashboard/connect/rooms" },
    ],
    menu: [
      { label: "My upcoming events", description: "Everything you registered for, in one list", href: "/dashboard/events", icon: CalendarHeart, primary: true, testId: "my-events" },
      { label: "IELSco Events", description: "Workshops, bootcamps, info sessions", href: "/dashboard/events/ielsco", icon: CalendarDays, testId: "ielsco-events" },
      { label: "IELS Circle", description: "Weekly speaking sessions and cohorts", href: "/dashboard/circle", icon: Mic, testId: "circle" },
      { label: "IELSco Talks", description: "Real stories, global perspectives", href: "/dashboard/events/talks", icon: Sparkles, testId: "talks" },
      { label: "Other Events", description: "Community and partner sessions", href: "/dashboard/connect/rooms", icon: HandHeart, testId: "other-events" },
    ],
  },
  {
    key: "nav.passport", path: "/dashboard/passport", icon: IdCard, id: "passport",
    match: ["/dashboard/passport", "/dashboard/connect/passport", "/dashboard/connect/elco", "/dashboard/my-learning"],
    tabs: [
      { label: "My passport", href: "/dashboard/passport", exact: true },
      { label: "Milestone Hall", href: "/dashboard/passport/milestones" },
      { label: "Social profile", href: "/dashboard/connect/passport" },
      { label: "Elco AI", href: "/dashboard/connect/elco" },
      { label: "My Learning", href: "/dashboard/my-learning" },
    ],
  },
];

// "More" group (sidebar) and the phone More sheet: personal tools. Each destination appears once in the navigation.
export const MORE_ITEMS: NavItem[] = [
  { key: "nav.saved", path: "/dashboard/shelf", icon: Bookmark, id: "shelf" },
  { key: "nav.milestones", path: "/dashboard/passport/milestones", icon: Trophy, id: "milestones" },
  { key: "nav.myGoals", path: "/dashboard/my-goals", icon: Target, id: "my-goals" },
  { key: "nav.myLearning", path: "/dashboard/my-learning", icon: GraduationCap, id: "my-learning" },
  { key: "nav.membership", path: "/dashboard/membership", icon: BadgeCheck, id: "membership", match: ["/dashboard/membership", "/dashboard/settings/membership"] },
  { key: "nav.safety", path: "/dashboard/connect/safety", icon: ShieldCheck, id: "safety" },
];

// Plain rows below the groups (Elco's Leaderboard / Progress rows): inbox and notifications carry a count.
export const UTILITY_ITEMS: NavItem[] = [
  { key: "nav.inbox", path: "/dashboard/connect/messages", icon: MessageCircle, id: "inbox" },
  { key: "nav.notifications", path: "/dashboard/notifications", icon: Bell, id: "notifications" },
  { key: "nav.search", path: "/dashboard/search", icon: Search, id: "search" },
];

// Profile card menu (sidebar bottom) and the Account part of the phone More sheet, like Elco's ACCOUNT list.
export const ACCOUNT_ITEMS: NavItem[] = [
  { key: "nav.profile", path: "/dashboard/profile", icon: User, id: "my-profile" },
  { key: "nav.settings", path: "/dashboard/settings", icon: Settings, id: "settings" },
  { key: "nav.help", path: "/dashboard/help", icon: HelpCircle, id: "help" },
];

// Kept for older imports.
export const NAV_GROUPS: NavGroup[] = [{ id: "main", title: null, items: SECTIONS }];
export const NAV_ITEMS: NavItem[] = [...SECTIONS, ...MORE_ITEMS, ...UTILITY_ITEMS, ...ACCOUNT_ITEMS];

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

// Phone dock (Elco's layout): Home, Social, Discover (centre slot), Events, More. EL-Passport opens the More sheet.
export const MOBILE_ITEMS: NavItem[] = SECTIONS.filter((s) => s.id !== "passport");


// Optional entries switched on per environment. Quick Match stays out until a TURN relay, moderation and enough
// concurrent members exist (docs/IELSCO-PRODUCT-ARCHITECTURE.md §10); NEXT_PUBLIC_QUICK_MATCH_IN_NAV=true adds it to
// Social's tabs as a beta. The database switch (connect_settings.quick_match_enabled) still decides whether calls work.
export const QUICK_MATCH_IN_NAV = process.env.NEXT_PUBLIC_QUICK_MATCH_IN_NAV === "true";
if (QUICK_MATCH_IN_NAV) SECTIONS.find((s) => s.id === "social")?.tabs?.push({ label: "Quick Match (beta)", href: "/dashboard/connect/quick-match" });

const under = (prefix: string, pathname: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isNavActive(path: string, pathname: string | null) {
  if (!pathname) return false;
  return path === "/dashboard" ? pathname === "/dashboard" : under(path, pathname);
}

// Active state for a menu item that owns several URL prefixes. /dashboard/connect itself (the old Connect overview)
// belongs to Social.
export function isItemActive(item: NavItem, pathname: string | null) {
  if (!pathname) return false;
  if (item.path === "/dashboard") return pathname === "/dashboard";
  if (item.match?.some((m) => under(m, pathname))) return true;
  if (item.id === "social") return pathname === "/dashboard/connect";
  return under(item.path, pathname);
}

export const sectionFor = (pathname: string | null) => SECTIONS.find((s) => s.id !== "home" && isItemActive(s, pathname)) ?? null;
export const moreActive = (pathname: string | null) => MORE_ITEMS.some((i) => isItemActive(i, pathname));

export function isTabActive(tab: SectionTab, pathname: string | null) {
  if (!pathname) return false;
  if (tab.exact) return pathname === tab.href;
  return [tab.href, ...(tab.match ?? [])].some((m) => under(m, pathname));
}
