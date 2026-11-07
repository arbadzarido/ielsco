import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Not found · Company OS", robots: { index: false, follow: false } };

export default function OsNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4" data-testid="os-not-found">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#577E90]">Company OS</p>
        <h1 className="mt-3 text-3xl font-bold text-[#1B2A3C]">Page not found</h1>
        <p className="mt-3 text-lg text-[#1B2A3C]/70">This page doesn&apos;t exist in Company OS.</p>
        <Link href="/os" className="mt-8 inline-flex rounded-full bg-[#1B2A3C] px-6 py-3 text-base font-semibold text-white hover:bg-[#2F4157]">
          Go to Company OS
        </Link>
      </div>
    </main>
  );
}
