import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { PhasePage } from "../phase-2/PhasePage";

export default async function Phase3() {
  const c = await portalContext("/portal/phase-3");
  if (!c.app) redirect("/portal");
  return <PhasePage c={c} phase={3} />;
}
