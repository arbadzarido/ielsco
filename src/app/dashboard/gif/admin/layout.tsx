import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireGifAdmin } from "@/lib/gif/admin-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "GIF 2026 Assessment Dashboard", robots: { index: false, follow: false } };

// Server-side gate: only GIF admins (public.gif_admins, checked by user id in the database) get this page at all.
// Everyone else gets a 404, even with the URL. The data itself is protected again by RLS.
export default async function GifAdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireGifAdmin();
  if (!auth.ok && auth.status === 401) redirect("/sign-in");
  if (!auth.ok) notFound();
  return children;
}
