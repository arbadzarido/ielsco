"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/content";

// Mirrors the IELSco site header (white, hairline border, 72px, pill links, pill CTAs) with the official GIF logo.
export default function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  return (
    <header className="site-header">
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap">
        <div className="bar">
          <Link href="/" className="brand" aria-label="Global Impact Fellowship by IELSco, home">
            <Image className="gif-logo" src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} priority />
            <span className="by">Summer 2027<br />by <Image src="/brand/iels-navy.png" alt="IELSco" width={70} height={18} style={{ display: "inline", verticalAlign: "-3px" }} /></span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.filter((n) => n.primary).map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
          </nav>
          <div className="header-cta">
            <Link className="signin" href={signedIn ? "/portal" : "/login"}>{signedIn ? "Portal" : "Log in"}</Link>
            <Link className="btn btn-primary btn-sm" href="/apply?pathway=self_funded" data-track="apply_click">Apply Now</Link>
            <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
            <Link href={signedIn ? "/portal" : "/login"}>{signedIn ? "Your portal" : "Log in"}</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
