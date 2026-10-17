"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthNotice, authInput, authLabel, authLink, authPrimary } from "@/components/auth/AuthUI";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/sign-in/forgot/new-password`,
    });
    setLoading(false);
    if (error) {
      setError(/rate|too many/i.test(error.message) ? "Too many attempts. Please wait a minute and try again." : error.message);
      return;
    }
    setIsSent(true);
  }

  return (
    <AuthLayout
      title={isSent ? "Check your email" : "Reset your password"}
      subtitle={isSent ? "" : "Enter your email and we'll send you a link to choose a new password."}
    >
      {!isSent ? (
        <form onSubmit={handleResetPassword} className="space-y-[16px]" data-testid="forgot-form">
          <div>
            <label htmlFor="forgot-email" className={authLabel}>Email</label>
            <input id="forgot-email" required type="email" autoComplete="email" className={authInput} placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} suppressHydrationWarning data-testid="forgot-email-input" />
          </div>
          <AuthNotice message={error} />
          <button disabled={loading} type="submit" className={authPrimary} suppressHydrationWarning data-testid="forgot-submit-btn">
            {loading && <Loader2 className="h-[16px] w-[16px] animate-spin" aria-hidden="true" />}Send reset link
          </button>
          <p className="pt-4 text-center text-[15px]"><Link href="/sign-in" className={authLink}>Back to sign in</Link></p>
        </form>
      ) : (
        <div className="space-y-[24px]" data-testid="forgot-sent">
          <div className="rounded-[16px] border border-[#D7E6DE] bg-[#EEF6F1] p-[20px] text-[15px] text-[#245F45]">
            <MailCheck className="mb-2 h-[24px] w-[24px]" aria-hidden="true" />
            We&apos;ve sent a reset link to <span className="font-semibold">{email}</span>. Please check your inbox and spam folder.
          </div>
          <div className="space-y-[12px] border-t border-[#E3E7ED] pt-[24px]">
            <p className="text-[14px] font-semibold text-[#5A6A7E]">Link not working?</p>
            <Link href={`/sign-in/forgot/verify?email=${encodeURIComponent(email)}`} className={authPrimary}>
              Enter the 6-digit code instead <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button onClick={() => setIsSent(false)} className="w-full text-center text-[14px] font-semibold text-[#C04C4E] hover:underline">
              Send the email again
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
