// "Recently viewed" — privacy-conscious: only resource IDs + timestamps, max 10, kept in this browser only.
const MAX = 10;
const key = (userId: string) => `iels:recently-viewed:${userId}`;

export interface RecentView {
  id: string;
  at: string;
}

export function getRecentViews(userId: string): RecentView[] {
  try {
    return JSON.parse(window.localStorage.getItem(key(userId)) ?? "[]");
  } catch {
    return [];
  }
}

export function recordView(userId: string, resourceId: string) {
  const next = [{ id: resourceId, at: new Date().toISOString() }, ...getRecentViews(userId).filter((v) => v.id !== resourceId)];
  window.localStorage.setItem(key(userId), JSON.stringify(next.slice(0, MAX)));
}

export function clearRecentViews(userId: string) {
  window.localStorage.removeItem(key(userId));
}
