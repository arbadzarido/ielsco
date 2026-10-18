import Link from "next/link";
import type { ReactNode } from "react";

// Shared layout for IELSco's legal pages: title, last-updated date, intro, a table of contents and numbered sections.
// px sizes (the root font size is 75%).
export const LEGAL_UPDATED = "18 October 2026";
export const COMPANY = "PT English Space Berkah Indonesia";
export const CONTACT_EMAIL = "hello@ielsco.com";
export const WHATSAPP = { label: "+62 882-9725-3491", href: "https://wa.me/6288297253491" };

export type LegalSection = { id: string; h: string; body: ReactNode };

export default function LegalDoc({ title, intro, sections, other }: { title: string; intro: ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] px-4 py-16 font-sans sm:px-8">
      <div className="mx-auto max-w-6xl rounded-3xl border border-[#EAEAEA] bg-white p-6 shadow-sm sm:p-12">
        <header className="max-w-3xl border-b border-gray-200 pb-8">
          <img src="/images/logos/iels_blue1.png" alt="IELSco" className="mb-8 h-12 w-auto object-contain" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">IELSco · Legal</p>
          <h1 className="mt-2 text-[36px] font-extrabold tracking-tight text-[#294154] md:text-[48px]">{title}</h1>
          <p className="mt-2 text-[15px] font-medium text-gray-500" data-testid="legal-updated">Last updated: {LEGAL_UPDATED}</p>
          <div className="mt-6 text-[16px] leading-relaxed text-[#4A5568]">{intro}</div>
        </header>
        <div className="mt-10 grid gap-10 lg:grid-cols-[250px_1fr]">
          <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-2 text-[14px] font-bold text-[#294154]">On this page</p>
            <ol className="space-y-1.5 text-[14px]">
              {sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} className="text-gray-600 hover:text-[#294154]">{i + 1}. {s.h}</a></li>)}
            </ol>
            <p className="mt-4 text-[13px] text-gray-500">See also: <Link href={other.href} className="underline">{other.label}</Link></p>
          </nav>
          <div className="max-w-3xl space-y-10 text-[15px] leading-relaxed text-[#4A5568] md:text-[16px]">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="mb-3 text-[22px] font-bold text-[#294154]">{i + 1}. {s.h}</h2>
                <div className="space-y-3 [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
