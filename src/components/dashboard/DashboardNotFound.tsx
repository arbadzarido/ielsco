"use client";

import Link from "next/link";
import DashboardLayout from "./DashboardLayout";
import ErrorState, { stateBtnPrimary, stateBtnSecondary } from "@/components/feedback/ErrorState";

// A dashboard address that doesn't exist (or a record that was removed): a real "not found", inside the dashboard.
export default function DashboardNotFound() {
  return (
    <DashboardLayout>
      <div className="flex min-h-[60vh] items-center py-10">
        <div className="w-full">
          <ErrorState kind="not_found" testid="dashboard-not-found" actions={<>
            <Link href="/dashboard" className={stateBtnPrimary}>Back to Home</Link>
            <Link href="/dashboard/search" className={stateBtnSecondary}>Search IELSco</Link>
          </>} />
        </div>
      </div>
    </DashboardLayout>
  );
}
