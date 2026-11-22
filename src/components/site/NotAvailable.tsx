"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, BriefcaseBusiness, CalendarDays, Users } from "lucide-react";
import ElcoActor from "@/components/brand/ElcoActorLazy";
import { btnPrimary, btnSecondary, container, h1, lead, siteRoot } from "./ui";
import { suggest } from "@/lib/didYouMean";
import { cn } from "@/lib/utils";

// Shared "page not found / not available" view (404 and retired tools). Points people somewhere useful: Elco looks
// around (the same character as Elco AI's 404), a mistyped address gets a "Did you mean …?" link, and the most-used
// destinations are one tap away. Mirrors Elco AI's NotFound page; IELSco's own logo, colours and type.
const ROUTES: { path: string; label: string }[] = [
  { path: "/opportunities", label: "Opportunities" },
  { path: "/opportunities/professional", label: "Jobs abroad" },
  { path: "/membership", label: "Membership" },
  { path: "/circle", label: "IELS Circle" },
  { path: "/circle/stories", label: "Member Stories" },
  { path: "/stories", label: "IELSco Stories" },
  { path: "/events", label: "Events" },
  { path: "/careers", label: "Careers" },
  { path: "/about", label: "About" },
  { path: "/products", label: "Programs" },
  { path: "/products/resources", label: "Free resources" },
  { path: "/products/courses", label: "Courses" },
  { path: "/articles", label: "Articles" },
  { path: "/partners", label: "Partners" },
  { path: "/sign-in", label: "Sign in" },
  { path: "/sign-up", label: "Sign up" },
  { path: "/dashboard", label: "Your dashboard" },
];

const POPULAR = [
  { href: "/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { href: "/products/resources", label: "Free resources", icon: BookOpen },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/circle", label: "IELS Circle", icon: Users },
];

/** The page the visitor most likely meant, from the address they typed (/oportunities → /opportunities). */
export function meantRoute(pathname: string) {
  const segs = pathname.split("/").filter(Boolean);
  if (!segs.length) return null;
  const last = segs[segs.length - 1].toLowerCase();
  const terms = ROUTES.map((r) => r.path.split("/").filter(Boolean).pop()!);
  const word = suggest(last.replace(/-/g, " "), terms, 1)[0];
  if (!word) return null;
  const exact = ROUTES.filter((r) => r.path.endsWith(`/${word}`));
  // prefer the route under the same first segment (/products/resourcs → /products/resources)
  return exact.find((r) => r.path.split("/")[1] === segs[0]) ?? exact[0] ?? null;
}

export default function NotAvailable({ title = "We couldn't find that page", text = "The link may be old, or the page has moved.", suggestAddress = true }: { title?: string; text?: string; suggestAddress?: boolean }) {
  // Read after mount: the server renders this page without knowing the address the visitor typed, so the first client render must match.
  const [pathname, setPathname] = useState("");
  useEffect(() => { setPathname(window.location.pathname); }, []);
  const meant = suggestAddress ? meantRoute(pathname) : null;
  return (
    <div className={cn(siteRoot, "flex min-h-[70vh] items-center bg-white py-16 font-sans")} data-testid="not-available">
      <div className={cn(container, "flex max-w-[900px] flex-col items-start gap-10 md:flex-row md:items-center")}>
        <span className="flex h-[160px] shrink-0 items-end md:h-[220px]">
          <ElcoActor pose="thinking" act="confused" idle react style={{ height: "100%" }} testid="not-found-elco" />
        </span>
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">404</p>
          <h1 className={cn(h1, "mt-4 text-[36px] sm:text-[48px]")}>{title}</h1>
          <p className={cn(lead, "mt-5")}>{text}{meant ? "" : " These might help:"}</p>
          {meant && (
            <p className="mt-4 text-[17px] text-[#1A2534]" data-testid="not-found-meant">
              Did you mean <Link href={meant.path} className="font-semibold text-[#2F4157] underline underline-offset-2 hover:text-[#E56668]">ielsco.com{meant.path}</Link> ({meant.label})?
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/opportunities" className={btnPrimary}>Browse opportunities <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/" className={btnSecondary}>Go to the homepage</Link>
          </div>
          <nav aria-label="Popular pages" className="mt-8 grid max-w-[560px] grid-cols-2 gap-3">
            {POPULAR.map((p) => (
              <Link key={p.href} href={p.href} className="flex items-center gap-2 rounded-2xl border border-[#E6E9EE] bg-white px-4 py-3 text-[15px] font-semibold text-[#1A2534] transition-colors hover:border-[#2F4157]">
                <p.icon size={16} className="text-[#577E90]" aria-hidden="true" />{p.label}
              </Link>
            ))}
          </nav>
          {pathname && <p className="mt-6 text-[13px] text-[#2F4157]/60">You asked for <code className="rounded bg-[#F1F4F8] px-1.5 py-0.5">{pathname}</code></p>}
          <p className="mt-6 text-[15px] text-[#2F4157]/65">
            Think this is a mistake? Email <a className="font-semibold underline" href="mailto:hello@ielsco.com">hello@ielsco.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
