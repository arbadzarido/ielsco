"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, LoadingState } from "../PageStates";
import { btnSecondary } from "../ui";
import { useStoryAdmin } from "./useStoryAdmin";

// Shows admin pages only to Member Stories admins. This is presentation only: RLS refuses every read and write for
// anyone else anyway.
export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, checked } = useStoryAdmin();
  if (!checked) return <LoadingState label="Checking access…" />;
  if (!isAdmin)
    return (
      <EmptyState
        title="Admins only"
        body="This area is for the IELSco team. If you should have access, ask an IELSco admin."
        action={<Link href="/dashboard" className={btnSecondary}>Back to dashboard</Link>}
      />
    );
  return <>{children}</>;
}
