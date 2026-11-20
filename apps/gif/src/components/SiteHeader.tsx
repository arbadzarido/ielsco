"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/content";

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
            <Image src="/brand/iels-navy.png" alt="IELSco" width={100} height={26} priority />
            <span className="word">Global Impact Fellowship<small>Summer 2027</small></span>
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV.slice(1).map((n) => <Link key={n.href} href={n.href} aria-current={current(n.href)}>{n.label}</Link>)}
          </nav>
          <div className="header-cta">
            <Link className="btn btn-secondary btn-sm" href={signedIn ? "/portal" : "/login"}>{signedIn ? "Portal" : "Log in"}</Link>
            <Link className="btn btn-primary btn-sm" href="/apply" data-track="apply_click">Apply Now</Link>
            <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>{open ? "Close" : "Menu"}</button>
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
