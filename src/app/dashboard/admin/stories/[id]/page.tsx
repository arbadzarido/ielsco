"use client";

import { use } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { StoryEditor } from "@/components/dashboard/stories-admin/StoryEditor";

// /dashboard/admin/stories/new creates a story (?section=ielsco for an IELSco story); /dashboard/admin/stories/<uuid>
// edits one. Same editor and schema for Member Stories and IELSco Stories.
export default function MemberStoryEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ section?: string; translate?: string }> }) {
  const { id } = use(params);
  const sp = use(searchParams);
  return (
    <DashboardPage>
      {({ supabase }) => (
        <AdminGate>
          <StoryEditor key={id} supabase={supabase} id={id} newSection={sp.section === "ielsco" ? "ielsco" : "member"} translateFrom={sp.translate ?? null} />
        </AdminGate>
      )}
    </DashboardPage>
  );
}
