import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { OsShell } from "@/components/os/OsShell";
import { MfaChallenge } from "@/components/os/auth/MfaChallenge";
import { OsNotice } from "@/components/os/auth/OsNotice";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Server gate for every Company OS page that shows internal data. Runs before any page renders, on every request:
//   no session                -> Company OS sign-in
//   session without OS access -> signed out, back to sign-in with a generic "no access" message
//   access needs MFA          -> the two-step verification prompt
// The pages below are client components that read through RLS, so even without this gate they would get no rows;
// the gate makes sure an outsider never sees the app shell at all.
export const dynamic = "force-dynamic";

export default async function GatedOsLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/os/login");

  const { data: allowed, error } = await supabase.rpc("os_access_status");
  if (error) {
    // PGRST202 / 42883: the function doesn't exist yet, i.e. the migration hasn't been applied to this database.
    const notSetUp = error.code === "PGRST202" || error.code === "42883" || error.code === "PGRST205";
    console.error("[os gate] access check failed", error.code);
    return (
      <OsNotice
        title={notSetUp ? "Company OS isn't set up on this database yet" : "We couldn't check your access"}
        body={notSetUp ? "A founder needs to finish the setup. Please try again later." : "Please try again in a moment."}
      />
    );
  }

  if (!allowed) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") return <MfaChallenge />;
    redirect("/os/auth/signout?reason=denied");
  }

  return <Suspense fallback={null}><OsShell>{children}</OsShell></Suspense>;
}
