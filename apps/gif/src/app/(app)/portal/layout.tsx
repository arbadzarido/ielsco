import type { Metadata } from "next";
import { AppHeader, AppShell } from "@/components/AppChrome";
import { portalContext } from "@/lib/portal";

export const metadata: Metadata = { title: "Portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const c = await portalContext();
  const p = c.app?.pathway;
  const items = [
    { href: "/portal", label: "Dashboard" },
    { href: "/portal/application", label: "Application" },
    { href: "/portal/payments", label: "Payments" },
    { href: "/portal/documents", label: "Documents" },
    ...(p === "fully_funded" ? [{ href: "/portal/tasks", label: "Phase 1 tasks" }, { href: "/portal/phase-2", label: "Phase 2" }] : []),
    ...(p === "fully_funded" || p === "mentoring" ? [{ href: "/portal/phase-3", label: "Phase 3" }, { href: "/portal/results", label: "Results" }] : []),
    ...(p === "mentoring" ? [{ href: "/portal/mentoring", label: "Mentoring" }] : []),
    { href: "/portal/onboarding", label: "Preparation" },
  ];
  return (
    <>
      <AppHeader email={c.account.email} staff={!!c.account.staffRole} />
      <AppShell who={c.account.email} items={c.app ? items : [{ href: "/portal", label: "Dashboard" }]}>{children}</AppShell>
    </>
  );
}
