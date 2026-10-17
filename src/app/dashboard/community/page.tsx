import { redirect } from "next/navigation";

// The separate community dashboard was retired: Circle is IELSco's community (sessions, check-ins, member stories).
// Kept as a redirect so old links and bookmarks keep working. No community data was removed.
export default function LegacyCommunityRedirect() {
  redirect("/dashboard/circle");
}
