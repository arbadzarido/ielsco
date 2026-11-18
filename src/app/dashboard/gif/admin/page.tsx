"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { GifAdmin } from "@/components/gif/admin/GifAdmin";

// GIF 2026 Assessment Dashboard. Access is decided on the server (layout.tsx → gif_is_admin) and again by RLS.
export default function GifAdminPage() {
  return <DashboardPage>{({ supabase, user }) => <GifAdmin supabase={supabase} user={user} />}</DashboardPage>;
}
