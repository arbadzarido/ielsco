"use client";

import { use } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { StoriesAdmin } from "@/components/dashboard/stories-admin/StoriesAdmin";

// ?section=ielsco shows IELSco Stories; the default is Member Stories. Same CMS, same table.
export default function MemberStoriesAdminPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const section = use(searchParams).section === "ielsco" ? "ielsco" : "member";
  return (
    <DashboardPage>
      {({ supabase }) => (
        <AdminGate>
          <StoriesAdmin supabase={supabase} section={section} />
        </AdminGate>
      )}
    </DashboardPage>
  );
}
