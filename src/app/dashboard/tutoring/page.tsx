"use client";

import Link from "next/link";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { StudentWorkspace } from "@/components/tutoring/dashboard/Student";
import { useIsTutoringStaff } from "@/components/tutoring/dashboard/useStaff";

// Private Tutoring learning workspace (students). Data is read through RLS, so a student can only ever see their own
// package, payments, sessions and feedback. Mentors/admins get a link to the management area.
export default function TutoringPage() {
  return (
    <DashboardPage>
      {({ supabase, profile }) => <Inner supabase={supabase} name={profile.display_name || "there"} />}
    </DashboardPage>
  );
}

function Inner({ supabase, name }: { supabase: Parameters<typeof useIsTutoringStaff>[0]; name: string }) {
  const staff = useIsTutoringStaff(supabase);
  return (
    <>
      {staff && <p className="mb-4 rounded-xl bg-[#EEF2F7] px-4 py-3 text-base">You manage tutoring students. <Link className="font-semibold underline" href="/dashboard/tutoring/mentor">Open the mentor dashboard</Link></p>}
      <StudentWorkspace supabase={supabase} userName={name} />
    </>
  );
}
