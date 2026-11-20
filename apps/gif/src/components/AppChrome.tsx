import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/app/actions/public";
import SideNav from "./SideNav";

export function AppHeader({ email, staff }: { email: string; staff: boolean }) {
  return (
    <header className="site-header">
      <div className="wrap" style={{ maxWidth: "none" }}>
        <div className="bar">
          <Link href="/" className="brand" aria-label="GIF Summer 2027 home">
            <Image className="gif-logo" src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} priority />
            <span className="by">{staff ? "Admin" : "Applicant portal"}<br />Summer 2027</span>
          </Link>
          <div className="header-cta" style={{ marginLeft: "auto" }}>
            <span className="small muted" style={{ display: "none" }}>{email}</span>
            {staff && <Link className="btn btn-secondary btn-sm" href="/admin">Admin</Link>}
            <form action={signOutAction}><button className="btn btn-quiet btn-sm">Sign out</button></form>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ who, items, children }: { who: string; items: { href: string; label: string }[]; children: React.ReactNode }) {
  return (
    <div className="app">
      <aside className="app-side no-print"><div className="who">{who}</div><SideNav items={items} /></aside>
      <main id="main" className="main">{children}</main>
    </div>
  );
}
