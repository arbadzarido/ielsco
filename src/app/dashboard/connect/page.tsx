import { redirect } from "next/navigation";

// The old Connect overview. Its parts now live in Social (people, connections, inbox), Events (community events) and
// Elco-Pass (Elco AI); Quick Match is out of the navigation (docs/IELSCO-PRODUCT-ARCHITECTURE.md §10).
export default function Page() {
  redirect("/dashboard/social");
}
