"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { MentorDashboard } from "@/components/tutoring/dashboard/Mentor";

// Mentor / admin management area. Access is decided by the database (tutoring_is_staff, backed by tutoring_mentors and the
// existing staff_roles table); this page only renders for staff and every action is re-checked by RLS and the RPCs.
export default function MentorPage() {
  return <DashboardPage>{({ supabase }) => <MentorDashboard supabase={supabase} />}</DashboardPage>;
}
