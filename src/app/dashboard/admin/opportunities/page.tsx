"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { OpportunitiesAdmin } from "@/components/dashboard/admin/OpportunitiesAdmin";

export default function OpportunitiesAdminPage() {
  return <DashboardPage>{({ supabase }) => <AdminGate><OpportunitiesAdmin supabase={supabase} /></AdminGate>}</DashboardPage>;
}
