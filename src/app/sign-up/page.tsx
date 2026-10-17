"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { supabase } from "@/data/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { safeNextPath } from "@/lib/safe-redirect";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { AuthDivider, AuthNotice, GoogleButton, authInput, authLink, authPrimary } from "@/components/auth/AuthUI";

const SignupSchema = z
  .object({
    fullName: z.string().min(3, "Please enter your full name."),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least 1 uppercase letter")
      .regex(/[a-z]/, "Include at least 1 lowercase letter")
      .regex(/[0-9]/, "Include at least 1 number"),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Both passwords must match!",
    path: ["confirmPassword"]
  });

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [popup, setPopup] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  // Where to go after sign-up (e.g. back to an event to finish registering). Read on the client only.
  const [nextUrl, setNextUrl] = useState("/dashboard");
  useEffect(() => {
    setNextUrl(safeNextPath(new URLSearchParams(window.location.search).get("next"), "/dashboard"));
  }, []);

  const form = useForm({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  type SignupForm = z.infer<typeof SignupSchema>;

  const onSubmit = async (values: SignupForm) => {
    setLoading(true);
    setUserEmail(values.email);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setPopup("An account with this email already exists. Please sign in instead.");
        } else {
          setPopup(`Error: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        if (authData.user.identities && authData.user.identities.length === 0) {
          setPopup("An account with this email already exists. Please sign in instead.");
          setLoading(false);
          return;
        }

        if (!authData.session) {
          // Email confirmation required - show OTP section
          setIsVerifying(true);
          setPopup("Success! Check your email for the 6-digit verification code.");
        } else {
          // Auto logged in
          setPopup("Account created successfully. Redirecting…");
          setTimeout(() => router.push(nextUrl), 1500);
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      setPopup("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: userEmail,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      if (data.session) {
        setPopup("Account verified successfully. Redirecting…");
        setTimeout(() => router.push(nextUrl), 1500);
      }
    } catch (error) {
      setPopup(`Invalid verification code: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) throw error;
      setPopup("Verification code resent. Check your email.");
    } catch (error) {
      setPopup(`Failed to resend code: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        setPopup(`Google sign-up error: ${error.message}`);
      }
    } catch (error) {
      console.error("Google signup error:", error);
      setPopup("We couldn't sign you up with Google. Please try again or use your email.");
    }
  };

  return (
    <AuthLayout title={isVerifying ? "Check your email" : "Create your IELSco account"} subtitle={isVerifying ? "" : "Join the community. It takes a minute."}>
      <div className="space-y-6">
        <AuthNotice message={popup || null} tone={/success|resent|redirecting|verified|created/i.test(popup) ? "success" : "error"} />
        {!isVerifying ? (
          <div className="animate-in fade-in duration-500">
            <GoogleButton onClick={handleGoogleSignUp} disabled={loading} />
            <AuthDivider />
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[#2F4157]">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" className={authInput} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[#2F4157]">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@mail.com" className={authInput} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[#2F4157]">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPass ? "text" : "password"} className={authInput} {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8F]">
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-[#2F4157]">Confirm Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showConfirm ? "text" : "password"} className={authInput} {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7A8F]">
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button disabled={loading} type="submit" className={authPrimary} data-testid="auth-submit-btn">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Create account"}
                </button>
              </form>
            </Form>

            <div className="mt-6 space-y-4">
              <p className="mt-8 text-center text-[15px] text-[#5A6A7E]">
                Already have an account?{" "}
                <Link href={nextUrl === "/dashboard" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(nextUrl)}`} className={authLink} data-testid="go-login-link">Sign in</Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-8 duration-500 space-y-8">
            <button 
              onClick={() => setIsVerifying(false)}
              className="flex items-center text-sm text-gray-400 hover:text-[#294154] transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Signup
            </button>

            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#F0F4F8] rounded-full flex items-center justify-center mx-auto text-[#294154]">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#294154]">Verify Your Email</h2>
              <p className="text-gray-500 text-sm px-4">
                Enter the 6-digit code we just sent to <br />
                <span className="font-semibold text-[#294154]">{userEmail}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <input
                required
                type="text"
                maxLength={6}
                placeholder="------"
                className="w-full text-center text-4xl tracking-[0.4em] font-extrabold text-[#294154] border-b-2 border-gray-200 bg-transparent py-4 focus:outline-none focus:border-[#2F4157] transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />

              <Button disabled={loading || otp.length < 6} type="submit" className={authPrimary}>
                {loading ? <Loader2 className="animate-spin" /> : "Complete Sign Up"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400">
              Didn&apos;t receive the code?{" "}
              <button 
                onClick={handleResendOtp} 
                disabled={loading}
                className="font-semibold text-[#C04C4E] hover:underline disabled:opacity-50"
              >
                Resend
              </button>
            </p>
          </div>
        )}

        <div className="space-y-1 border-t border-[#E3E7ED] pt-6 text-center text-xs leading-relaxed text-[#6B7A8F]">
          <p>
            By creating an account, you agree to our{" "}
            <Link href="/terms-of-service" className="underline hover:text-gray-600 transition-colors">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</Link>.
          </p>
          <p>
            This site is protected by reCAPTCHA Enterprise and the Google{" "}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-gray-600 transition-colors">Privacy Policy</a>{" "}
            and{" "}
            <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-gray-600 transition-colors">Terms of Service</a>{" "}
            apply.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}