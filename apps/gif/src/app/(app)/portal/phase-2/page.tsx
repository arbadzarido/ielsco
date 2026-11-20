import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { PhasePage } from "./PhasePage";

export default async function Phase2() {
  const c = await portalContext("/portal/phase-2");
  if (!c.app) redirect("/portal");
  return <PhasePage c={c} phase={2} />;
}
