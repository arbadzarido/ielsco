// Pure rules for the Open Recruitment 2027 popup (no imports, so `node --test` can load it).
// "Close" hides it for this browser session; "Don't show again" hides it on this browser for good.
export const POPUP_NEVER_KEY = "iels:recruit2027:never";
export const POPUP_SESSION_KEY = "iels:recruit2027:closed";

// Never on the careers pages or the application itself, and never where people are in the middle of something:
// sign-in/up, onboarding, payments and membership checkout, tests and quizzes, live calls and rooms, the Company OS,
// admin and the school portal.
const BLOCKED = [
  /^\/careers(\/|$)/, /^\/dashboard\/careers(\/|$)/, /^\/sign-(in|up)(\/|$)/, /^\/auth(\/|$)/, /^\/welcome(\/|$)/,
  /^\/dashboard\/onboarding(\/|$)/, /^\/dashboard\/membership(\/|$)/, /^\/membership\/(checkout|pay)/, /^\/api(\/|$)/,
  /^\/(test|quiz)(\/|$)/, /^\/dashboard\/test(\/|$)/, /^\/dashboard\/connect\/(quick-match|rooms|messages)(\/|$)/, /^\/connect\/elco(\/|$)/,
  /^\/os(\/|$)/, /^\/admin(\/|$)/, /^\/dashboard\/admin(\/|$)/, /^\/school(\/|$)/, /^\/planner(\/|$)/,
];

export function popupAllowedOn(pathname: string | null | undefined, host = ""): boolean {
  if (!pathname) return false;
  if (/^(os|school)\./i.test(host)) return false;
  return !BLOCKED.some((re) => re.test(pathname));
}

export function shouldShowPopup(o: { now: number; opensAt: number; closesAt: number; never: boolean; closedThisSession: boolean; pathname: string; host?: string }): boolean {
  if (o.now < o.opensAt || o.now > o.closesAt) return false;
  if (o.never || o.closedThisSession) return false;
  return popupAllowedOn(o.pathname, o.host);
}
