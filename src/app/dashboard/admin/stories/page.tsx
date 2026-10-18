"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { StoriesAdmin } from "@/components/dashboard/stories-admin/StoriesAdmin";

export default function MemberStoriesAdminPage() {
  return (
    <DashboardPage>
      {({ supabase }) => (
        <AdminGate>
          <StoriesAdmin supabase={supabase} />
        </AdminGate>
      )}
    </DashboardPage>
  );
}
