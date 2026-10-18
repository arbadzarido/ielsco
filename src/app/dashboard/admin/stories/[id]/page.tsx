"use client";

import { use } from "react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AdminGate } from "@/components/dashboard/stories-admin/AdminGate";
import { StoryEditor } from "@/components/dashboard/stories-admin/StoryEditor";

// /dashboard/admin/stories/new creates a story; /dashboard/admin/stories/<uuid> edits one. Same editor and schema.
export default function MemberStoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <DashboardPage>
      {({ supabase }) => (
        <AdminGate>
          <StoryEditor key={id} supabase={supabase} id={id} />
        </AdminGate>
      )}
    </DashboardPage>
  );
}
