// GIF Summer 2027 facts for the main IELSco website (header, footer, home, Events, Products, the recruitment popup and the
// dashboard banner/card). A plain module on purpose (no imports): server components and `node --test` read it.
// The programme itself lives at gif.ielsco.com (apps/gif); these values mirror its settings (apps/gif/src/lib/settings.ts)
// and must be updated together with them.

export const GIF_SITE_URL = "https://gif.ielsco.com";
// The IELSco Dashboard is the single place for GIF participants (21 Nov 2026): registration, applications, submissions and
// payments start at /dashboard/gif (signed in with the IELSco account), which opens the GIF forms through single sign-on
// and keeps status and payments in sync. gif.ielsco.com is for programme information and recruitment.
export const GIF_DASHBOARD_PATH = "/dashboard/gif";
export const GIF_DASHBOARD_URL = `https://www.ielsco.com${GIF_DASHBOARD_PATH}`;
export const GIF_APPLY_URL = GIF_DASHBOARD_PATH;
// Older imports. No GIF registration uses Google Forms any more.
export const GIF_REGISTER_URL = GIF_APPLY_URL;
// The old Early Bird (guidebook pricing) ended at 23:59 WIB on 20 November 2026; nothing shows it after that.
export const EARLY_BIRD_END = "2026-11-20T23:59:00+07:00";

export const GIF_PROGRAMME = {
  name: "Global Impact Fellowship",
  edition: "Summer 2027",
  dates: "27 July – 3 August 2027",
  shortDates: "27 Jul – 3 Aug 2027",
  route: ["Singapore", "Malaysia", "Thailand"] as const,
  startsAt: "2027-07-27T00:00:00+07:00",
  endsAt: "2027-08-03T23:59:59+07:00",
  // Facts only (apps/gif content): eight days, three countries in that order, a project idea developed with peers and mentors.
  description: "An eight-day international youth programme from Singapore through Malaysia to Thailand. Bring a project idea for your community and develop it with peers and mentors from across Southeast Asia.",
  logo: "/images/logos/events/gif.png", // official GIF logo (238×87, same file as gif.ielsco.com brand/gif-logo.png)
} as const;

// The three ways to join (founder decisions 20–21 Nov 2026). Partial Funded is a result of the Fully Funded selection,
// not a pathway of its own. Registration opened 20 Nov 2026 for Self-Funded and Mentoring; Fully Funded opens 25 Nov 2026.
export type GifPathway = { key: "fully_funded" | "self_funded" | "mentoring"; name: string; line: string; opensAt: string };
export const GIF_PATHWAYS: GifPathway[] = [
  { key: "fully_funded", name: "Fully Funded", line: "Competitive selection in three phases for funded places.", opensAt: "2026-11-25T00:00:00+07:00" },
  { key: "self_funded", name: "Self-Funded", line: "Direct registration, subject to programme capacity.", opensAt: "2026-11-20T00:00:00+07:00" },
  { key: "mentoring", name: "Project Mentoring", line: "Weekly mentoring to develop your project; mentees go straight to Phase 3.", opensAt: "2026-11-20T00:00:00+07:00" },
];

export const pathwayOpen = (p: GifPathway, now = Date.now()) => now >= Date.parse(p.opensAt);
export const pathwayStatus = (p: GifPathway, now = Date.now()) => {
  if (pathwayOpen(p, now)) return "Open now";
  const d = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" }).format(new Date(p.opensAt));
  return `Opens ${d}`;
};
export const gifApplyHref = (p?: GifPathway["key"]) => (p ? `${GIF_DASHBOARD_PATH}?pathway=${p}` : GIF_DASHBOARD_PATH);
