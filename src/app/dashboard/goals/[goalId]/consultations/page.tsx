import { redirect } from "next/navigation";

// Retired with IELSco subscriptions (tier-gated legacy page). Saved links go to the current equivalent.
export default function LegacyRedirect() {
  redirect("/dashboard/my-goals");
}
