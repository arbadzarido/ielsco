"use client";

import { useParams } from "next/navigation";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { CourseDetailView } from "@/components/dashboard/programs/CourseDetailView";

export default function CourseDetailPage() {
  const { track } = useParams<{ track: string }>();
  return <DashboardPage>{(ctx) => <CourseDetailView {...ctx} track={track} />}</DashboardPage>;
}
