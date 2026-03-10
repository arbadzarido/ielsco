"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { supabase } from "@/data/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
import Popup from "@/components/ui/popup";

const SignupSchema = z
  .object({
    fullName: z.string().min(3, "Your name looks too short — try again? 😊"),
    email: z.string().email("Hmm… that email doesn't look valid 👀"),
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
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setPopup("This email is already registered. Please sign in instead! 🔐");
        } else {
          setPopup(`Error: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        if (authData.user.identities && authData.user.identities.length === 0) {
          setPopup("This email is already registered. Please sign in instead! 🔐");
          setLoading(false);
          return;
        }

        if (!authData.session) {
          // Email confirmation required - show OTP section
          setIsVerifying(true);
          setPopup("✅ Success! Please check your email for the 6-digit verification code.");
        } else {
          // Auto logged in
          setPopup("Account created successfully! Redirecting... 🚀");
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setPopup("Something went wrong. Please try again! 😔");
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
        setPopup("Account verified successfully! Redirecting... 🚀");
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch (error: any) {
      setPopup(`Invalid verification code: ${error.message}`);
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
      setPopup("Verification code resent! Check your email. 📧");
    } catch (error: any) {
      setPopup(`Failed to resend code: ${error.message}`);
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
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        setPopup(`Google sign-up error: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Google signup error:", error);
      setPopup("Google sign-up failed. Please try again! 😔");
    }
  };

  return (
    <AuthLayout>
      {popup && <Popup message={popup} onClose={() => setPopup("")} />}

      <div className="space-y-6 pt-4">
        {!isVerifying ? (
          <div className="animate-in fade-in duration-500">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-[#294154]">Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" className="rounded-xl bg-[#F7F8FA]" {...field} />
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
                      <FormLabel className="font-semibold text-[#294154]">Email</FormLabel>
                      <FormControl>
                        <Input placeholder="example@mail.com" className="rounded-xl bg-[#F7F8FA]" {...field} />
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
                      <FormLabel className="font-semibold text-[#294154]">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showPass ? "text" : "password"} className="rounded-xl bg-[#F7F8FA]" {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-3 text-gray-400">
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
                      <FormLabel className="font-semibold text-[#294154]">Confirm Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input type={showConfirm ? "text" : "password"} className="rounded-xl bg-[#F7F8FA]" {...field} />
                        </FormControl>
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-3 text-gray-400">
                          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button disabled={loading} type="submit" className="w-full py-3 rounded-full bg-[#E56668] text-white font-semibold hover:bg-[#C04C4E] disabled:bg-[#C04C4E] transition-all">
                  {loading ? <Loader2 className="animate-spin" /> : "Sign Up"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-grow border-t" />
                <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">or</span>
                <div className="flex-grow border-t" />
              </div>

              <button
                onClick={handleGoogleSignUp}
                className="inline-flex items-center justify-center gap-3 rounded-full w-full py-3.5 bg-[#294154] text-white font-bold hover:shadow-lg transition active:scale-[0.97]"
              >
                <Image 
                  src="https://authjs.dev/img/providers/google.svg" 
                  alt="Google" 
                  width="20" 
                  height="20" 
                  className="mr-2"
                />
                Continue with Google
              </button>

              <p className="text-center text-gray-500 text-sm">
                Already part of IELS?{" "}
                <Link href="/sign-in" className="text-[#E56668] font-bold hover:underline">Sign in</Link>
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
                className="w-full text-center text-4xl tracking-[0.4em] font-extrabold text-[#294154] border-b-2 border-gray-200 bg-transparent py-4 focus:outline-none focus:border-[#E56668] transition-all"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />

              <Button disabled={loading || otp.length < 6} type="submit" className="w-full py-3 rounded-full bg-[#E56668] text-white font-semibold hover:bg-[#C04C4E] disabled:bg-[#C04C4E] transition-all">
                {loading ? <Loader2 className="animate-spin" /> : "Complete Sign Up"}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400">
              Didn&apos;t receive the code?{" "}
              <button 
                onClick={handleResendOtp} 
                disabled={loading}
                className="text-[#E56668] font-bold hover:underline disabled:opacity-50"
              >
                Resend
              </button>
            </p>
          </div>
        )}

        <div className="pt-6 text-center text-[10px] text-gray-400 leading-relaxed space-y-1 border-t border-gray-100">
          <p>
            By signing in to IELS, you agree to our{" "}
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