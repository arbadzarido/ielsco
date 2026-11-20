// Fully Funded Phase 1 social media tasks: each delegate does each task; the team verifies each one by hand
// (pattern from the careers campaign tasks). Pure module (node --test imports it).
import type { Settings } from "./settings.ts";

export type TaskState = { status: "submitted" | "verified" | "not_found"; at: string; by?: string; note?: string };
export type TaskMap = Record<string, TaskState>;

export function tasksFor(s: Settings) {
  return s.phase1_tasks.enabled ? s.phase1_tasks.items : [];
}

export function taskLink(s: Settings, link?: string): { href: string; label: string } | null {
  if (link === "ielsco") return { href: s.instagram.ielsco, label: "@iels.co" };
  if (link === "elco") return { href: s.instagram.elco, label: "@elco.ai" };
  if (link === "post") return s.instagram.recruitment_post ? { href: s.instagram.recruitment_post, label: "Open the recruitment post" } : { href: s.instagram.ielsco, label: "Find the post on @iels.co" };
  return null;
}

// Every required task verified for this delegate (true when tasks are switched off).
export function tasksComplete(s: Settings, map: TaskMap | null | undefined): boolean {
  return tasksFor(s).every((t) => map?.[t.key]?.status === "verified");
}

export function tasksSummary(s: Settings, map: TaskMap | null | undefined) {
  const items = tasksFor(s);
  const count = (st: string) => items.filter((t) => map?.[t.key]?.status === st).length;
  return { total: items.length, verified: count("verified"), submitted: count("submitted"), notFound: count("not_found"), todo: items.filter((t) => !map?.[t.key]).length };
}

export function normalizeHandle(raw: string): string | null {
  const h = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : null;
}
