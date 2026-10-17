"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false); // State baru buat deteksi email terkirim
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/sign-in/forgot/new-password`,
    });

    if (error) {
      setFeedback({ type: "error", msg: error.message });
      setLoading(false);
      return;
    }

    setFeedback({ 
      type: "success", 
      msg: "Check your email! We've sent a secure password reset link. 📧" 
    });
    setLoading(false);
    setIsSent(true); // Aktifkan tampilan sukses
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        
        {/* Back Button */}
        {!isSent && (
          <Link 
            href="/sign-in" 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#294154] transition-colors mb-6 group"
          >
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
            Back to Sign In
          </Link>
        )}

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-[#EAEAEA] space-y-8 transition-all">
          
          {/* TAMPILAN AWAL: INPUT EMAIL */}
          {!isSent ? (
            <>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#FFF5F5] rounded-full flex items-center justify-center mx-auto text-[#E56668]">
                  <Mail size={28} />
                </div>
                <h2 className="text-2xl font-extrabold text-[#294154]">
                  Forgot Password?
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  No worries! Enter your email and we'll send you instructions to reset your key to the IELS dashboard.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#294154] ml-1">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full rounded-xl border border-gray-200 bg-[#F7F8FA] px-4 py-3.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668] transition-all text-[#294154]"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    suppressHydrationWarning
                  />
                </div>

                {feedback?.type === "error" && (
                  <div className="p-4 rounded-xl flex items-start gap-3 text-sm bg-red-50 text-red-700 border border-red-100 animate-in fade-in zoom-in-95">
                    <AlertCircle size={20} className="shrink-0"/>
                    <p className="font-medium">{feedback.msg}</p>
                  </div>
                )}

                <button
                  disabled={loading}
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E56668] py-3.5 text-white font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.96] active:brightness-95 disabled:pointer-events-none disabled:opacity-50"
                  suppressHydrationWarning
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            /* TAMPILAN SUKSES: INSTRUKSI LANJUTAN */
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-extrabold text-[#294154]">Email Sent!</h2>
                <p className="text-gray-500 text-sm leading-relaxed px-4">
                  We've sent a reset link to <span className="font-bold text-[#294154]">{email}</span>. Please check your inbox (and spam folder).
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Link not working?</p>
                
                {/* TOMBOL UNTUK INPUT KODE MANUAL */}
                <Link 
                  href={`/sign-in/forgot/verify?email=${encodeURIComponent(email)}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#294154] py-3.5 text-white font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.96] active:brightness-95"
                >
                  Enter 6-Digit Code Manually <ArrowRight size={18} />
                </Link>

                <button 
                  onClick={() => setIsSent(false)}
                  className="text-sm font-semibold text-gray-400 hover:text-[#E56668] transition-colors"
                >
                  Resend Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}