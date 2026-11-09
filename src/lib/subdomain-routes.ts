// circle.ielsco.com and school.ielsco.com are served by this app through a rewrite into /circle/* and /school/*.
// Only the routes below exist there. Any other path (for example a relative "/careers" link from the shared header or
// footer before it knows its host) used to rewrite to /circle/careers and answer 404; it belongs to the main site,
// so the proxy sends it there with a permanent redirect instead.

export const MAIN_SITE = "https://www.ielsco.com";

const SUBDOMAIN_ROUTES = {
  circle: ["/", "/agenda", "/stories"],
  school: ["/", "/dashboard", "/sign-in"],
} as const;

export type Subdomain = keyof typeof SUBDOMAIN_ROUTES;

const ownsPath = (routes: readonly string[], pathname: string) =>
  routes.some((r) => (r === "/" ? pathname === "/" : pathname === r || pathname.startsWith(`${r}/`)));

/** Where a subdomain request should go: "rewrite" into the subdomain's routes, or "redirect" to the main site.
 *  Paths already prefixed with /circle or /school, and /api, keep the existing behaviour ("pass"). */
export function subdomainRoute(sub: Subdomain, pathname: string): "pass" | "rewrite" | "redirect" {
  if (pathname === `/${sub}` || pathname.startsWith(`/${sub}/`) || pathname === "/api" || pathname.startsWith("/api/")) return "pass";
  return ownsPath(SUBDOMAIN_ROUTES[sub], pathname) ? "rewrite" : "redirect";
}
