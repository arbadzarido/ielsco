"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, focusRing } from "./ui";
import { track } from "@/lib/analytics";

type Kind = "partner" | "school" | "careers" | "membership_waitlist";
type Field = "organization" | "role" | "phone" | "topic" | "message";
export interface InquiryFormProps {
  kind: Kind;
  fields: Field[];
  labels?: Partial<Record<Field | "name" | "email", string>>;
  topics?: { value: string; label: string }[];
  required?: Field[];
  submitLabel: string;
  successTitle: string;
  successText: string;
}

const input = cn("mt-2 block w-full rounded-[14px] border border-[#D5DBE3] bg-white px-4 py-3 text-[16px] font-normal text-[#1A2534] placeholder:text-[#2F4157]/40 hover:border-[#B8C2CF]", focusRing);
const label = "block text-[15px] font-semibold text-[#1A2534]";

// Real submission: POST /api/inquiries → public.submit_inquiry() (validated, rate-limited). Staff read them in
// Dashboard → Admin → Operations. Nothing here pretends to send.
export function InquiryForm({ kind, fields, labels = {}, topics, required = [], submitLabel, successTitle, successText }: InquiryFormProps) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setState("sending");
    setError("");
    try {
      const r = await fetch("/api/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...data }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.message || "We couldn't send your message. Please email hello@ielsco.com.");
      setState("sent");
      track("inquiry_submitted", { kind });
    } catch (err) {
      setState("error");
      setError((err as Error).message);
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-[20px] border border-[#CFE3D8] bg-[#F3FAF6] p-8" role="status" data-testid={`inquiry-${kind}-sent`}>
        <CheckCircle2 className="text-[#2D7A58]" size={28} aria-hidden="true" />
        <p className="mt-4 text-[20px] font-bold text-[#1A2534]">{successTitle}</p>
        <p className="mt-2 text-[16px] leading-relaxed text-[#2F4157]/80">{successText}</p>
      </div>
    );
  }

  const L = (f: Field | "name" | "email", d: string) => labels[f] ?? d;
  const req = (f: Field) => required.includes(f);
  return (
    <form onSubmit={onSubmit} className="space-y-5" data-testid={`inquiry-${kind}`}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>{L("name", "Your name")}<input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} /></label>
        <label className={label}>{L("email", "Email")}<input name="email" type="email" required maxLength={200} autoComplete="email" className={input} /></label>
        {fields.includes("organization") && <label className={label}>{L("organization", "Organization")}<input name="organization" required={req("organization")} maxLength={200} autoComplete="organization" className={input} /></label>}
        {fields.includes("role") && <label className={label}>{L("role", "Your role")}<input name="role" required={req("role")} maxLength={120} autoComplete="organization-title" className={input} /></label>}
        {fields.includes("phone") && <label className={label}>{L("phone", "WhatsApp (optional)")}<input name="phone" type="tel" required={req("phone")} maxLength={40} autoComplete="tel" className={input} /></label>}
        {fields.includes("topic") && topics && (
          <label className={label}>{L("topic", "Topic")}
            <select name="topic" required={req("topic")} defaultValue="" className={input}>
              <option value="" disabled>Choose one</option>
              {topics.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {fields.includes("message") && (
        <label className={label}>{L("message", "Message")}<textarea name="message" required={req("message")} maxLength={3000} rows={5} className={input} /></label>
      )}
      {/* Honeypot: hidden from people and assistive tech; bots that fill it are rejected by the API. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state === "error" && <p className="rounded-[12px] bg-[#FDF1F1] px-4 py-3 text-[15px] text-[#A23B3D]" role="alert">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={state === "sending"} className={cn(btnPrimary, "disabled:opacity-60")}>
          {state === "sending" && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} {submitLabel}
        </button>
        <p className="text-[13px] text-[#2F4157]/60">We use these details only to reply to you. See our <a className="underline" href="/privacy-policy">privacy policy</a>.</p>
      </div>
    </form>
  );
}
