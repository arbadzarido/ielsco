// Notifications Center (docs/IELSCO-PRODUCT-ARCHITECTURE.md §11). There is no notifications table: every item is
// derived from the member's own records at read time (MyRecords), so nothing can be stale or invented and there is
// nothing to clean up. Pure functions, unit-tested in tests/me-notifications.test.mjs.

import type { MyRecords } from "./records";

export type NotificationCategory = "social" | "events" | "opportunities" | "learning";

export const NOTIFICATION_CATEGORIES: { id: NotificationCategory; label: string; description: string }[] = [
  { id: "social", label: "Social", description: "Intro requests and unread messages" },
  { id: "events", label: "Events", description: "Events and Circle sessions you registered for, in the next 7 days" },
  { id: "opportunities", label: "Opportunities", description: "Deadlines of opportunities you track, in the next 14 days" },
  { id: "learning", label: "Learning", description: "Your Elco AI practice, when your account is linked" },
];

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  /** When it matters (deadline, start); used for sorting. */
  at: Date;
  /** Needs the member to do something (counts towards the badge). */
  actionable: boolean;
}

const DAY = 86_400_000;
const ACTIVE_TRACKER = new Set(["saved", "preparing"]);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function daysUntil(target: Date, now: Date) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate()) - start) / DAY);
}
const inDays = (d: number) => (d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`);

export function buildNotifications(r: MyRecords, now = new Date()): AppNotification[] {
  const out: AppNotification[] = [];

  if (r.incomingIntros > 0) {
    out.push({ id: "intros", category: "social", title: plural(r.incomingIntros, "intro request") + " waiting", body: "Accept or decline when you're ready.",
      href: "/dashboard/connect/requests", at: now, actionable: true });
  }
  if (r.unread > 0) {
    out.push({ id: "unread", category: "social", title: plural(r.unread, "unread message"), body: "Open your inbox to reply.",
      href: "/dashboard/connect/messages", at: now, actionable: true });
  }

  for (const a of r.activities) {
    if (a.past || a.kind === "circle_cohort") continue;
    const ms = a.start.getTime() - now.getTime();
    if (ms > 7 * DAY || (a.allDay ? daysUntil(a.start, now) < 0 : ms < -60 * 60_000)) continue;
    const d = daysUntil(a.start, now);
    out.push({ id: `activity-${a.id}`, category: "events", title: a.title, body: `${a.status === "hosting" ? "You're hosting" : "You're registered"} · ${inDays(d)}`,
      href: a.href, at: a.start, actionable: d <= 1 });
  }

  for (const t of r.tracked) {
    if (!ACTIVE_TRACKER.has(t.status)) continue;
    const raw = t.personal_deadline ?? t.opportunity?.deadline;
    if (!raw) continue;
    const deadline = new Date(`${raw}T00:00:00Z`);
    const d = daysUntil(deadline, now);
    if (d < 0 || d > 14) continue;
    out.push({ id: `deadline-${t.opportunity_id}`, category: "opportunities", title: t.opportunity?.title ?? "A tracked opportunity",
      body: `${t.personal_deadline ? "Your deadline" : "Deadline"} ${inDays(d)}. Confirm it on the official page.`, href: "/dashboard/opportunities", at: deadline, actionable: d <= 3 });
  }

  if (r.elco?.linked && r.elco.last_active_at) {
    const idle = Math.floor((now.getTime() - new Date(r.elco.last_active_at).getTime()) / DAY);
    if (idle >= 7) {
      out.push({ id: "elco-idle", category: "learning", title: "Pick up your Elco practice", body: `Your last Elco session was ${plural(idle, "day")} ago.`,
        href: "/dashboard/connect/elco", at: now, actionable: false });
    }
  }

  return out.sort((a, b) => Number(b.actionable) - Number(a.actionable) || a.at.getTime() - b.at.getTime());
}

export const badgeCount = (items: AppNotification[], muted: Set<NotificationCategory> = new Set()) =>
  items.filter((n) => n.actionable && !muted.has(n.category)).length;
