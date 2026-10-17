// sign-in/forgot/verify/verify-client/tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

export default function VerifyOtpForgotClient() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"error" | "success">("error");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Inisialisasi Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  // Proteksi Halaman: Kalau gak ada email, balik ke awal
  useEffect(() => {
    if (!email) {
      router.push("/sign-in/forgot");
    }
  }, [email, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setMsgType("error");

    if (otp.length < 6) {
      setMsg("Please enter the complete 6-digit code.");
      setLoading(false);
      return;
    }

    // LOGIC UTAMA: Verifikasi OTP untuk Password Recovery
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery", // WAJIB 'recovery' supaya Supabase tahu ini flow lupa password
    });

    if (error) {
      setMsg(error.message || "Invalid or expired code. Please try again.");
      setLoading(false);
      return;
    }

    // BERHASIL: Kita lempar ke halaman Set New Password
    // Bukan ke Dashboard!
    // Setelah verifyOtp berhasil:
router.push("/sign-in/forgot/new-password?verified=true");
  }

  async function handleResendCode() {
    setResendLoading(true);
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Pastikan redirectTo mengarah ke callback agar session terbentuk aman
      redirectTo: `${window.location.origin}/auth/callback?next=/sign-in/forgot/new-password`,
    });

    if (error) {
      setMsgType("error");
      setMsg(error.message || "Failed to resend code.");
    } else {
      setMsgType("success");
      setMsg("A new 6-digit code has been sent to your email.");
    }
    setResendLoading(false);
  }

  if (!email) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-[#EAEAEA] space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-[#F0F4F8] rounded-full flex items-center justify-center text-[#294154]">
              <ShieldCheck size={32} />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-extrabold text-[#294154]">Verify Identity</h2>
              <p className="text-gray-500 text-sm leading-relaxed px-4">
                We've sent a 6-digit secure code to <br />
                <span className="font-semibold text-[#294154] break-all">{email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Input OTP */}
            <div>
              <label className="text-xs font-bold text-[#E56668] uppercase tracking-wider mb-2 block text-center">
                Secure Code
              </label>
              <input
                required
                type="text" 
                maxLength={6}
                placeholder="------"
                className="w-full text-center text-4xl tracking-[0.4em] font-extrabold text-[#294154] border-b-2 border-gray-200 bg-transparent py-4 focus:outline-none focus:border-[#E56668] transition-all placeholder:text-gray-300"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                suppressHydrationWarning
                autoFocus
              />
            </div>

            {/* Feedback Message */}
            {msg && (
              <div className={`p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in zoom-in-95 duration-200 ${
                msgType === "error" 
                  ? "bg-red-50 text-red-700 border border-red-100" 
                  : "bg-green-50 text-green-700 border border-green-100"
              }`}>
                {msgType === "error" ? <AlertCircle size={20} className="shrink-0"/> : <CheckCircle2 size={20} className="shrink-0"/>}
                <p className="font-medium">{msg}</p>
              </div>
            )}

            {/* Action Button */}
            <button
              disabled={loading || otp.length < 6}
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E56668] py-3.5 text-white font-bold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.96] active:brightness-95 disabled:pointer-events-none disabled:bg-[#ffb3b4]"
              suppressHydrationWarning
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Verifying...
                </>
              ) : (
                <>
                  Verify Code <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Resend Footer */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-400">
              Didn't receive code?{" "}
              <button 
                onClick={handleResendCode}
                disabled={resendLoading}
                className="text-[#E56668] font-bold hover:text-[#C04C4E] disabled:opacity-50 transition-colors"
                type="button"
              >
                {resendLoading ? "Sending..." : "Resend"}
              </button>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}