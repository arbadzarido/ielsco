"use client";

import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { PeopleView } from "@/components/dashboard/people/PeopleView";

export default function PeoplePage() {
  return <DashboardPage>{(ctx) => <PeopleView {...ctx} />}</DashboardPage>;
}
