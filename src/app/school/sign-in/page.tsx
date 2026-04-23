"use client";

// =============================================================================
// File: app/school/sign-in/page.tsx
// Description: IELS For Schools Login Portal (Strictly for Teachers & Admins).
//              Students attempting to log in here will be rejected.
// =============================================================================

import AuthLayout from "@/components/auth/AuthLayout";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";
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
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
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
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setPopup("Invalid email or password. Please try again! 🔐");
        } else {
          setPopup(`Error: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // 2. Fetch the user's role from public.users table
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profileError || !userProfile) {
          setPopup("Account verification failed. Please contact IELS Admin. 🛑");
          await supabase.auth.signOut(); // Force logout just in case
          setLoading(false);
          return;
        }

        // 3. Strict Role-Based Routing (Block Students)
        if (userProfile.role === "STUDENT") {
          setPopup("Access Denied. Students must log in via ielsco.com/sign-in 🛑");
          await supabase.auth.signOut(); // Log them out immediately from this portal
          setLoading(false);
          return;
        }

        // 4. Proceed for Teachers & Admins
        setPopup("Welcome back! Redirecting to Teacher Dashboard... 🎉");
        router.refresh();
        
        setTimeout(() => {
          if (userProfile.role === "TEACHER" || userProfile.role === "SCHOOL_ADMIN") {
            router.push("/school/dashboard");
          } else {
            // Fallback for IELS_ADMIN
            router.push("/admin");
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      setPopup("Something went wrong. Please try again! 😔");
      setLoading(false);
    }
  };

  return (
    <>
      {popup && <Popup message={popup} onClose={() => setPopup("")} />}

      <div className="space-y-6">
        
        {/* Header Text */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E56668]/10 text-[#E56668] rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldAlert size={14} />
            Staff & Faculty Only
          </div>
          <h1 className="text-2xl font-black text-[#2F4157]">School Partner Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Exclusive dashboard for teachers to monitor student progress.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-[#2F4157]">School Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="teacher@school.sch.id"
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
                        placeholder="••••••••"
                        className="border rounded-xl w-full p-3 bg-[#F7F8FA] focus:ring-2 focus:ring-[#E56668]"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-3 text-gray-500 hover:text-[#E56668] transition-colors"
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
              <a 
                href="mailto:school.support@ielsco.com?subject=Teacher%20Password%20Reset%20Request" 
                className="text-xs text-[#E56668] hover:underline font-semibold"
              >
                Forgot password?
              </a>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full py-3 rounded-full bg-[#E56668] text-white font-bold hover:bg-[#C04C4E] disabled:bg-[#C04C4E] transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  Authenticating...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        {/* B2B Provisioning Notice */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-center">
          <p className="text-xs text-[#2F4157] font-medium leading-relaxed">
            <span className="font-bold text-[#E56668]">Students:</span> This portal is for school administrators and teachers. If you are a student, please log in via the <Link href="https://ielsco.com/sign-in" className="text-[#E56668] font-bold hover:underline">main IELS portal</Link>.
          </p>
        </div>

        {/* Terms and Privacy Footer */}
        <div className="pt-6 text-center text-[10px] text-gray-400 leading-relaxed space-y-1 border-t border-gray-100">
          <p>
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-gray-600 transition-colors">Terms of Service</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</Link>.
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