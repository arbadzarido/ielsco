"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useOsMe } from "@/components/os/OsProvider";
import { EmptyState, PageHeader } from "@/components/dashboard/PageStates";
import { btnSecondary, focusRing } from "@/components/dashboard/ui";
import { PeopleAdmin } from "@/components/os/admin/PeopleAdmin";
import { AuditLog, GrantsAdmin, RoutesAdmin } from "@/components/os/admin/AccessAdmin";
import { SecurityAdmin } from "@/components/os/admin/SecurityAdmin";
import { AiAdmin, DivisionsAdmin, HealthAdmin } from "@/components/os/admin/SystemAdmin";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "people", label: "People & accounts" },
  { key: "divisions", label: "Divisions" },
  { key: "security", label: "Security & sessions" },
  { key: "access", label: "Access grants" },
  { key: "routes", label: "Drive folder routes" },
  { key: "ai", label: "AI usage & budget" },
  { key: "health", label: "Integration health" },
  { key: "audit", label: "Audit log" },
] as const;
type Tab = (typeof TABS)[number]["key"];

// Founders only. Hiding the page is a convenience; RLS refuses these reads and writes for everyone else.
export default function OsAdminPage() {
  return <Suspense fallback={null}><OsAdmin /></Suspense>;
}

function OsAdmin() {
  const { me, supabase } = useOsMe();
  const requested = useSearchParams().get("tab");
  const tab: Tab = TABS.some((t) => t.key === requested) ? (requested as Tab) : "people";

  if (me.needsMfa)
    return <EmptyState title="Two-step verification needed" body="Admin is only available after you confirm sign-in with an authenticator app. Set it up in My account; it takes a minute." action={<Link href="/os/account" className={btnSecondary}>Go to My account</Link>} />;
  if (!me.isAdmin)
    return <EmptyState title="Founders only" body="People, access and audit settings are managed by the founders." action={<Link href="/os" className={btnSecondary}>Back to Home</Link>} />;

  return (
    <div>
      <PageHeader title="Admin" description="People, access and where documents will be filed. Every change here is recorded in the audit log." />
      <nav aria-label="Admin sections" className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/os/admin?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined}
            className={cn("shrink-0 rounded-full border px-4 py-2 text-sm font-semibold", tab === t.key ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]", focusRing)}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "people" && <PeopleAdmin supabase={supabase} />}
      {tab === "security" && <SecurityAdmin supabase={supabase} />}
      {tab === "access" && <GrantsAdmin supabase={supabase} />}
      {tab === "routes" && <RoutesAdmin supabase={supabase} />}
      {tab === "divisions" && <DivisionsAdmin />}
      {tab === "ai" && <AiAdmin />}
      {tab === "health" && <HealthAdmin />}
      {tab === "audit" && <AuditLog supabase={supabase} />}
    </div>
  );
}
