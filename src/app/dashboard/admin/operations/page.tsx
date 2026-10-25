"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { OperationsAdmin } from "@/components/dashboard/admin/OperationsAdmin";

export default function OperationsAdminPage() {
  return <DashboardPage>{({ supabase }) => <AdminGate><OperationsAdmin supabase={supabase} /></AdminGate>}</DashboardPage>;
}
