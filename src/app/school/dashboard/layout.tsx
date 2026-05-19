// =============================================================================
// app/school/layout.tsx — Authenticated shell for all /school/* routes
// Desktop: sidebar + top header
// Mobile:  top app-bar + bottom nav bar (no sidebar)
// =============================================================================

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Sidebar    from "@/app/school/dashboard/Sidebar";
import Header     from "@/app/school/dashboard/Header";

async function getUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getUser();

  if (!profile || !["TEACHER", "SCHOOL_ADMIN"].includes(profile.role)) {
    redirect("/school/sign-in");
  }

  return (
    <div
      className="min-h-screen bg-[#F7F8FA] flex"
      style={{ fontFamily: "'Geologica', sans-serif" }}
    >
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <Sidebar profile={profile} />

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: desktop breadcrumbs / mobile app-bar */}
        <Header profile={profile} />

        {/* Page content */}
        {/* pb-24 on mobile to clear the fixed bottom nav */}
        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-8 pb-24 lg:pb-8 overflow-x-hidden">
          <div className="w-full max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}