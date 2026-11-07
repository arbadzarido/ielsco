// Company OS host isolation. Pure and dependency-free so tests/company-os-host.test.mjs can import it with Node.
//
// os.ielsco.com serves ONLY the Company OS: every path is either an /os/... route, the Sentry tunnel, a short alias
// into /os, or a Company OS 404. Public pages (/dashboard, /sign-in, /sign-up, ...) and public APIs never answer on it.
// The public hosts never serve /os: there it is a plain 404, so unfinished internal screens are not reachable from
// www.ielsco.com.

export const OS_HOSTS = ["os.ielsco.com"];

export function isOsHost(host: string | null | undefined): boolean {
  const name = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  return OS_HOSTS.includes(name) || name === "os.localhost";
}

export const isOsPath = (pathname: string) => pathname === "/os" || pathname.startsWith("/os/");

// Short, memorable URLs on the OS host. They all land inside /os; nothing maps to a public route.
const ALIASES: Record<string, string> = {
  "/": "/os",
  "/login": "/os/login",
  "/sign-in": "/os/login",
  "/dashboard": "/os",
  "/home": "/os",
  "/admin": "/os/admin",
  "/account": "/os/account",
  "/workspaces": "/os/workspaces",
  "/tasks": "/os/tasks",
  "/projects": "/os/projects",
  "/documents": "/os/documents",
};

export type OsHostDecision =
  | { action: "next" }                       // an /os route (or the Sentry tunnel): continue
  | { action: "redirect"; to: string }       // into the /os namespace
  | { action: "api-not-found" };             // public APIs are not served on the OS host

export function osHostRoute(pathname: string): OsHostDecision {
  if (isOsPath(pathname) || pathname === "/monitoring" || pathname.startsWith("/monitoring/")) return { action: "next" };
  if (pathname === "/api" || pathname.startsWith("/api/")) return { action: "api-not-found" };
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (ALIASES[clean]) return { action: "redirect", to: ALIASES[clean] };
  // Anything else (/sign-up, /settings, /dashboard/admin/...) goes to the same path under /os, where it either exists
  // or renders the Company OS 404. It never falls back to the public site.
  return { action: "redirect", to: `/os${clean}` };
}

// /os routes that need a signed-in session. Everything else under /os (login, auth callbacks, unknown paths that
// render the 404) is reachable signed out and shows no internal data.
export const GATED_OS_SECTIONS = [
  "admin", "workspaces", "account", "w", "projects", "tasks", "documents", "timeline", "kpis", "okrs", "people",
  "reviews", "partnerships", "campaigns", "assistant",
] as const;
const GATED = new RegExp(`^/os(/(${GATED_OS_SECTIONS.join("|")})(/.*)?)?/?$`);
export function isGatedOsPath(pathname: string): boolean {
  return GATED.test(pathname);
}
