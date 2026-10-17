import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarDays, Compass, GraduationCap, HelpCircle, Home, MessagesSquare, Settings, Target, User, Users } from "lucide-react";

// Dashboard information architecture (2026-10). `key` is the i18n message key; `title` is a group heading.
//   Home, Goals
//   Community: People, Circle
//   Explore:   Resources (the existing /dashboard/explore route), Opportunities, Events
// Settings, Help, My Learning and the profile live in the account menu. Older routes stay reachable by URL.
export type NavItem = { key: string; path: string; icon: LucideIcon; id: string };
export type NavGroup = { id: string; title: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    title: null,
    items: [
      { key: "nav.home", path: "/dashboard", icon: Home, id: "home" },
      { key: "nav.goals", path: "/dashboard/my-goals", icon: Target, id: "my-goals" },
    ],
  },
  {
    id: "community",
    title: "nav.community",
    items: [
      { key: "nav.people", path: "/dashboard/people", icon: Users, id: "people" },
      { key: "nav.circleShort", path: "/dashboard/circle", icon: MessagesSquare, id: "circle" },
    ],
  },
  {
    id: "explore",
    title: "nav.exploreGroup",
    items: [
      { key: "nav.resources", path: "/dashboard/explore", icon: Compass, id: "resources" },
      { key: "nav.opportunities", path: "/dashboard/opportunities", icon: Briefcase, id: "opportunities" },
      { key: "nav.events", path: "/dashboard/events", icon: CalendarDays, id: "events" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// Phone bottom bar: four destinations + "More" (opens the drawer with everything).
export const MOBILE_ITEMS: NavItem[] = ["home", "my-goals", "circle", "resources"].map((id) => NAV_ITEMS.find((i) => i.id === id)!);

// Account menu (profile area), desktop and mobile.
export const ACCOUNT_ITEMS: NavItem[] = [
  { key: "nav.profile", path: "/dashboard/profile", icon: User, id: "my-profile" },
  { key: "nav.myLearning", path: "/dashboard/my-learning", icon: GraduationCap, id: "my-learning" },
  { key: "nav.settings", path: "/dashboard/settings", icon: Settings, id: "settings" },
  { key: "nav.help", path: "/dashboard/help", icon: HelpCircle, id: "help" },
];

export function isNavActive(path: string, pathname: string | null) {
  if (!pathname) return false;
  return path === "/dashboard" ? pathname === "/dashboard" : pathname === path || pathname.startsWith(`${path}/`);
}
