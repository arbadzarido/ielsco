"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/os/types";
import { OsProvider, useOs } from "./OsProvider";

// Navigation from the architecture proposal. Items whose phase hasn't shipped are listed but marked "Soon", so the team
// sees where things will live without dead links.
const NAV: { href: string; label: string; soon?: boolean; founderOnly?: boolean }[] = [
  { href: "/os", label: "Home" },
  { href: "/os/work", label: "Work", soon: true },
  { href: "/os/documents", label: "Documents", soon: true },
  { href: "/os/knowledge", label: "Knowledge", soon: true },
  { href: "/os/workspaces", label: "Workspaces" },
  { href: "/os/admin", label: "Admin", founderOnly: true },
];

function Gate({ children }: { children: ReactNode }) {
  const { state, reload } = useOs();
  if (state.status === "loading") return <LoadingState label="Checking your access…" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={reload} />;
  if (state.status === "signed-out")
    return (
      <EmptyState
        title="Sign in to the Company OS"
        body="Use your IELSco account. Access is set up by a founder."
        action={<Link href="/sign-in?next=/os" className={btnPrimary}>Sign in</Link>}
      />
    );
  if (state.status === "not-staff")
    return (
      <EmptyState
        title="You don't have Company OS access yet"
        body={`You're signed in${state.email ? ` as ${state.email}` : ""}, but this account isn't linked to a team record. Ask a founder to add you; they'll need this email address.`}
        action={<Link href="/dashboard" className={btnSecondary}>Go to your IELSco dashboard</Link>}
      />
    );
  return <>{children}</>;
}

function Header() {
  const { state } = useOs();
  const pathname = usePathname();
  const me = state.status === "ready" ? state.me : null;
  const isFounder = me?.person.org_role === "founder";
  const active = (href: string) => (href === "/os" ? pathname === "/os" : pathname.startsWith(href));

  return (
    <header className="border-b border-[#E3E7ED] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <Link href="/os" className={cn("text-lg font-bold tracking-tight text-[#2F4157]", focusRing)}>
          Company OS
        </Link>
        {me && (
          <nav aria-label="Company OS" className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {NAV.filter((n) => !n.founderOnly || isFounder).map((n) =>
              n.soon ? (
                <span key={n.href} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#2F4157]/45" title="Coming in a later phase">
                  {n.label} <span className="rounded-full bg-[#F1F4F8] px-1.5 text-[11px] font-semibold">Soon</span>
                </span>
              ) : (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active(n.href) ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
                    active(n.href) ? "bg-[#2F4157] text-white" : "text-[#2F4157] hover:bg-[#F1F4F8]",
                    focusRing,
                  )}
                >
                  {n.label}
                </Link>
              ),
            )}
          </nav>
        )}
        {me && (
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-right leading-tight">
              <span className="block font-semibold text-[#2F4157]">{me.person.short_name || me.person.full_name}</span>
              <span className="block text-[#2F4157]/60">{ROLE_LABEL[me.person.org_role]}</span>
            </span>
            <form action="/auth/signout" method="post">
              <button type="submit" className={cn(btnSecondary, "px-3 py-1.5 text-sm")}>Sign out</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

export function OsShell({ children }: { children: ReactNode }) {
  return (
    <OsProvider>
      <div className="min-h-screen bg-[#F7F8FA] text-[#2F4157]">
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <Gate>{children}</Gate>
        </div>
      </div>
    </OsProvider>
  );
}
