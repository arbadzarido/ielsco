"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared auth building blocks. Same sizes and styles as Elco's auth pages (ai.ielsco.com), so the two products'
// sign-in screens feel like one ecosystem: 48px fields and buttons, navy primary, outlined Google button, inline errors.
export const authInput =
  "h-[48px] w-full rounded-[12px] border border-[#D5DCE5] bg-white px-[16px] text-[15px] text-[#1A2534] placeholder:text-[#9AA5B4] focus:border-[#2F4157] focus:outline-none focus:ring-4 focus:ring-[#2F4157]/10";
export const authLabel = "mb-[6px] block text-[14px] font-semibold text-[#2F4157]";
export const authPrimary =
  "inline-flex h-[48px] w-full items-center justify-center gap-[8px] rounded-full bg-[#2F4157] px-[24px] text-[15px] font-semibold text-white transition-colors hover:bg-[#1A2534] disabled:cursor-not-allowed disabled:opacity-60";
export const authLink = "font-semibold text-[#C04C4E] underline-offset-4 hover:underline";

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[20px] w-[20px]" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export function GoogleButton({ onClick, busy, disabled, label = "Continue with Google" }: { onClick: () => void; busy?: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      data-testid="auth-google-btn"
      className="inline-flex h-[48px] w-full items-center justify-center gap-[12px] rounded-full border border-[#D5DCE5] bg-white px-[24px] text-[15px] font-semibold text-[#1A2534] transition-colors hover:border-[#2F4157] hover:bg-[#F7F8FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-[20px] w-[20px] animate-spin text-[#2F4157]" aria-hidden="true" /> : <GoogleIcon />}
      {busy ? "Opening Google…" : label}
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-[24px] flex items-center gap-[12px] text-[12px] font-semibold uppercase tracking-[0.14em] text-[#9AA5B4]" aria-hidden="true">
      <span className="h-[1px] flex-1 bg-[#E3E7ED]" />or<span className="h-[1px] flex-1 bg-[#E3E7ED]" />
    </div>
  );
}

export function AuthNotice({ message, tone = "error" }: { message: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-testid={tone === "error" ? "auth-error" : "auth-status"}
      className={cn(
        "flex items-start gap-[10px] rounded-[12px] border p-[12px] text-[14px]",
        tone === "error" ? "border-[#F6C9CA] bg-[#FEF4F4] text-[#8A3A3C]" : "border-[#D7E6DE] bg-[#EEF6F1] text-[#245F45]"
      )}
    >
      {tone === "error" && <AlertCircle className="mt-[2px] h-[16px] w-[16px] shrink-0 text-[#C04C4E]" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}
