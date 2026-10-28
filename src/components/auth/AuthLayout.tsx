"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

// Auth layout shared in spirit with Elco (ai.ielsco.com): an inset navy brand panel beside a focused 400px form on
// desktop; the form alone on phones. IELSco branding (logo, mascot), not Elco's.
const POINTS = [
  "Find people with the same goals, from your country and abroad",
  "Programs, events and opportunities in one place",
  "Practise English for study and work",
];

export default function AuthLayout({
  children,
  title = "Welcome to IELSco",
  subtitle = "Your community for studying and working abroad.",
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-white font-sans lg:grid lg:grid-cols-2" data-testid="auth-layout">
      <aside className="relative m-[16px] hidden flex-col justify-between overflow-hidden rounded-[28px] bg-[#2F4157] p-[40px] text-white lg:flex xl:p-[56px]">
        <Link href="/" className="inline-flex items-center gap-[12px]" data-testid="auth-brand-home">
          <Image src="/images/logos/iels_white1.png" alt="" width={36} height={36} />
          <span className="text-[24px] font-bold tracking-tight">IELSco</span>
        </Link>
        <div className="max-w-[448px]">
          <span className="mb-[32px] flex h-[160px] w-[160px] items-center justify-center rounded-[32px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <Image src="/images/contents/mascot/hi.svg" alt="" width={112} height={112} className="h-[112px] w-auto" />
          </span>
          <p className="font-heading text-[36px] font-semibold leading-tight">Unlock global opportunities, together.</p>
          <ul className="mt-[24px] space-y-[12px]">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-[12px] text-[15px] text-white/85">
                <span className="mt-[2px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white/15"><Check className="h-[14px] w-[14px]" aria-hidden="true" /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[14px] text-white/60">International English Learning Society</p>
      </aside>

      <main className="flex min-h-screen flex-col px-[20px] pb-[32px] pt-[calc(env(safe-area-inset-top)+20px)] sm:px-[40px]">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-[10px] lg:invisible" data-testid="auth-home-link">
            <Image src="/images/logos/iels_blue1.png" alt="" width={32} height={32} />
            <span className="text-[20px] font-bold tracking-tight text-[#1A2534]">IELSco</span>
          </Link>
          <Link href="/" className="text-[14px] font-semibold text-[#2F4157]/70 hover:text-[#2F4157]" data-testid="auth-back-home">Back to home</Link>
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-[40px]">
          <h1 className="font-heading text-[32px] font-semibold leading-tight text-[#2F4157] sm:text-[36px]">{title}</h1>
          {subtitle && <p className="mt-[8px] text-[15px] text-[#5A6A7E]">{subtitle}</p>}
          <div className="mt-[32px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
