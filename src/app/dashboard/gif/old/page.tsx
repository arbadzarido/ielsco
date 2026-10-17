import { redirect } from "next/navigation";

// Old GIF dashboard (before the Batch 2 delegate portal). It promoted the retired IELS Lounge membership via Mayar.
// Saved links go to the current GIF dashboard.
export default function LegacyGifRedirect() {
  redirect("/dashboard/gif");
}
