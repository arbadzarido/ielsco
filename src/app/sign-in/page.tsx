"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import { AuthDivider, AuthNotice, GoogleButton, authInput, authLabel, authLink, authPrimary } from "@/components/auth/AuthUI";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";
import { supabase } from "@/data/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { safeNextPath } from "@/lib/safe-redirect";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password.")
});

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Security: only same-site relative paths (an absolute "next" used to send people off-site after sign-in).
  const nextUrl = safeNextPath(searchParams.get("next"), "/dashboard");

  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" }
  });
  const { errors } = form.formState;

  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) setError("That email and password don't match. Please try again.");
        else if (error.message.includes("Email not confirmed")) setError("Please confirm your email first. Check your inbox for the code or link.");
        else setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      if (data.user) {
        setStatus("Signed in. Taking you to your dashboard…");
        router.refresh();
        router.push(nextUrl);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleBusy(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          queryParams: { access_type: "offline", prompt: "consent" },
        }
      });
      if (error) {
        setError("We couldn't sign you in with Google. Please try again or use your email.");
        setGoogleBusy(false);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("We couldn't sign you in with Google. Please try again or use your email.");
      setGoogleBusy(false);
    }
  };

  return (
    <div>
      <GoogleButton onClick={handleGoogleSignIn} busy={googleBusy} disabled={loading} />
      <AuthDivider />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[16px]" noValidate data-testid="sign-in-form">
        <div>
          <label htmlFor="sign-in-email" className={authLabel}>Email</label>
          <input id="sign-in-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email}
            className={authInput} data-testid="auth-email-input" {...form.register("email")} />
          {errors.email && <p className="mt-[4px] text-[14px] text-[#C04C4E]">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="sign-in-password" className={authLabel}>Password</label>
          <div className="relative">
            <input id="sign-in-password" type={showPass ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password}
              className={`${authInput} pr-12`} data-testid="auth-password-input" {...form.register("password")} />
            <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass}
              className="absolute right-[8px] top-1/2 flex h-[36px] w-[36px] -translate-y-1/2 items-center justify-center rounded-full text-[#6B7A8F] hover:bg-[#F1F4F8]">
              {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p className="mt-[4px] text-[14px] text-[#C04C4E]">{errors.password.message}</p>}
        </div>
        <div className="flex justify-end">
          <Link href="/sign-in/forgot" className="text-[14px] font-semibold text-[#C04C4E] hover:underline">Forgot password?</Link>
        </div>
        <AuthNotice message={error} />
        <AuthNotice message={status} tone="success" />
        <button disabled={loading} type="submit" className={authPrimary} data-testid="auth-submit-btn">
          {loading && <Loader2 className="h-[16px] w-[16px] animate-spin" aria-hidden="true" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-[32px] text-center text-[15px] text-[#5A6A7E]">
        Don&apos;t have an account?{" "}
        <Link href={nextUrl === "/dashboard" ? "/sign-up" : `/sign-up?next=${encodeURIComponent(nextUrl)}`} className={authLink} data-testid="go-signup-link">
          Sign up
        </Link>
      </p>

      <div className="mt-[32px] space-y-1 border-t border-[#E3E7ED] pt-[24px] text-center text-[12px] leading-relaxed text-[#6B7A8F]">
        <p>
          By signing in to IELSco, you agree to our <Link href="/terms-of-service" className="underline">Terms</Link> and{" "}
          <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
        </p>
        <p>
          This site is protected by reCAPTCHA Enterprise and the Google{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a> and{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">Terms of Service</a> apply.
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your IELSco dashboard.">
      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-[24px] w-[24px] animate-spin text-[#2F4157]" aria-hidden="true" /></div>}>
        <SignInContent />
      </Suspense>
    </AuthLayout>
  );
}
