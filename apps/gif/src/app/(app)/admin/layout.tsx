import type { Metadata } from "next";
import { AppHeader, AppShell } from "@/components/AppChrome";
import { requireStaff, can } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await requireStaff("read");
  const r = a.staffRole;
  const items = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/applicants", label: "Applicants" },
    ...(can(r, "evaluate") ? [{ href: "/admin/evaluate", label: "My evaluations" }] : []),
    ...(can(r, "select") ? [{ href: "/admin/selection", label: "Selection" }] : []),
    ...(can(r, "finance") ? [{ href: "/admin/payments", label: "Payments" }] : []),
    ...(can(r, "content") ? [{ href: "/admin/content", label: "Content & settings" }] : []),
    ...(can(r, "review") ? [{ href: "/admin/sponsorship", label: "Sponsorship requests" }, { href: "/admin/emails", label: "Emails" }] : []),
    ...(can(r, "staff") ? [{ href: "/admin/staff", label: "Staff" }, { href: "/admin/audit", label: "Audit log" }] : []),
  ];
  return (
    <>
      <AppHeader email={a.email} staff />
      <AppShell who={`${a.email} · ${r}`} items={items}>{children}</AppShell>
    </>
  );
}
