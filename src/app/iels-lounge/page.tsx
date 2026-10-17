import { redirect } from "next/navigation";

// IELS Lounge (paid daily practice membership) is retired; IELS Circle is the community now. Saved links go to Circle.
export default function LegacyRedirect() {
  redirect("/circle");
}
