import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OsLogin } from "@/components/os/auth/OsLogin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in · Company OS", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Company OS sign-in. Google only; there is no sign-up. An account that is already signed in with OS access goes
// straight to the OS.
export default async function OsLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; signed_out?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: allowed } = await supabase.rpc("os_access_status");
    if (allowed) redirect("/os");
  }
  const params = await searchParams;
  return <OsLogin error={params.error ?? null} signedOut={params.signed_out === "1"} />;
}
