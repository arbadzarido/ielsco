import { redirect } from "next/navigation";

// Retired with IELSco subscriptions (membership plans and the Mayar portal). Saved links go to Settings.
export default function LegacyRedirect() {
  redirect("/dashboard/settings");
}
