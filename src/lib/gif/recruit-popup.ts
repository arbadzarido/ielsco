// Pure rules for the GIF Summer 2027 recruitment popup (no imports, so `node --test` can load it).
// To switch the campaign off, set GIF_POPUP.enabled = false (or change the window dates).

export const GIF_POPUP = {
  enabled: true,
  // Campaign window: from the opening of registration until the programme starts.
  opensAt: "2026-11-20T00:00:00+07:00",
  closesAt: "2027-07-27T00:00:00+07:00",
  // Engagement trigger: after this long on a page, or once the visitor has scrolled this share of it.
  delayMs: 20_000,
  scrollShare: 0.45,
  // Cooldowns after the visitor acts on it.
  dismissDays: 7,
  clickedDays: 30,
} as const;

export const GIF_POPUP_KEY = "iels:gif-s27-popup"; // localStorage: { until: epoch ms }
export const GIF_POPUP_SESSION_KEY = "iels:gif-s27-popup:seen"; // sessionStorage: shown once per session at most
// The Open Recruitment 2027 popup (lib/careers/popup.ts) sets this when it closes; the two never share a session.
export const OTHER_POPUP_SESSION_KEYS = ["iels:recruit2027:closed"];

// Public marketing pages only: never on the dashboard, sign-in/up, checkout or membership payment, tests, the Company OS,
// admin, school portal, careers (its own campaign) or the old GIF pages (they redirect to gif.ielsco.com).
const BLOCKED = [
  /^\/dashboard(\/|$)/, /^\/sign-(in|up)(\/|$)/, /^\/auth(\/|$)/, /^\/welcome(\/|$)/, /^\/membership\/(checkout|pay)/, /^\/checkout(\/|$)/,
  /^\/api(\/|$)/, /^\/(test|quiz|planner|cafe)(\/|$)/, /^\/os(\/|$)/, /^\/admin(\/|$)/, /^\/school(\/|$)/, /^\/careers(\/|$)/,
  /^\/events\/gif(\/|$)/, /^\/connect(\/|$)/,
];

export function gifPopupAllowedOn(pathname: string | null | undefined, host = ""): boolean {
  if (!pathname) return false;
  if (/^(gif|os|school|circle)\./i.test(host)) return false;
  return !BLOCKED.some((re) => re.test(pathname));
}

export function shouldShowGifPopup(o: { now: number; pathname: string; host?: string; snoozedUntil: number; seenThisSession: boolean; otherPopupThisSession: boolean; enabled?: boolean }): boolean {
  if (!(o.enabled ?? GIF_POPUP.enabled)) return false;
  if (o.now < Date.parse(GIF_POPUP.opensAt) || o.now >= Date.parse(GIF_POPUP.closesAt)) return false;
  if (o.seenThisSession || o.otherPopupThisSession || o.now < o.snoozedUntil) return false;
  return gifPopupAllowedOn(o.pathname, o.host);
}

export const snoozeUntil = (now: number, action: "dismiss" | "clicked") =>
  now + (action === "clicked" ? GIF_POPUP.clickedDays : GIF_POPUP.dismissDays) * 86_400_000;
