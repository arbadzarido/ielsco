"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";
import { supabase } from "@/data/supabase";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Popup from "@/components/ui/popup";

const SignInSchema = z.object({
  email: z.string().email("Hmm… that email doesn't look valid 👀"),
  password: z.string().min(1, "Password is required")
});

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [popup, setPopup] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const form = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (values: z.infer<typeof SignInSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setPopup("Invalid email or password. Please try again! 🔐");
        } else if (error.message.includes("Email not confirmed")) {
          setPopup("Please verify your email before signing in. Check your inbox! 📧");
        } else {
          setPopup(`Error: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        setPopup("Welcome back! Redirecting... 🎉");
        router.refresh();
        setTimeout(() => {
          router.push(nextUrl);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      setPopup("Something went wrong. Please try again! 😔");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${nextUrl}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) {
        setPopup(`Google sign-in error: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setPopup("Google sign-in failed. Please try again! 😔");
    }
  };

  return (
    <>
      {popup && <Popup message={popup} onClose={() => setPopup("")} />}

      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-[#2F4157]">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example@mail.com"
                      className="border rounded-xl w-full p-3 bg-[#F7F8FA] focus:ring-2 focus:ring-[#E56668]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[#E56668]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-[#2F4157]">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPass ? "text" : "password"}
                        placeholder="Enter your password"
                        className="border rounded-xl w-full p-3 bg-[#F7F8FA] focus:ring-2 focus:ring-[#E56668]"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-3 text-gray-500"
                        onClick={() => setShowPass(!showPass)}
                      >
                        {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-[#E56668]" />
                </FormItem>
              )}
            />

            <div className="text-right">
              <Link href="/sign-in/forgot" className="text-sm text-[#E56668] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full py-3 rounded-full bg-[#E56668] text-white font-semibold hover:bg-[#C04C4E] disabled:bg-[#C04C4E] transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="flex items-center gap-3">
          <div className="flex-grow border-t" />
          <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">or</span>
          <div className="flex-grow border-t" />
        </div>

        <button
          onClick={handleGoogleSignIn}
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
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-[#E56668] font-bold hover:underline">
            Sign up here
          </Link>
        </p>

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
    </>
  );
}

export default function SignInPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E56668]"></div>
        </div>
      }>
        <SignInContent />
      </Suspense>
    </AuthLayout>
  );
}