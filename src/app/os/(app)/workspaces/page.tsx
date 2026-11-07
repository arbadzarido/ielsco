import { redirect } from "next/navigation";

// The old divisions page now lives in the HQ workspace.
export default function WorkspacesPage() {
  redirect("/os/w/hq?tab=divisions");
}
