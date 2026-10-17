import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Mail, MessageCircle } from "lucide-react";
import { container, focusRing } from "@/components/site/ui";
import { cn } from "@/lib/utils";

// Public footer: white, hairline top border. Links only go to pages and channels that exist.
const COLUMNS: { title: string; links: { name: string; url: string; external?: boolean }[] }[] = [
  {
    title: "IELSco",
    links: [
      { name: "About", url: "/about" },
      { name: "Product", url: "/products" },
      { name: "Partners", url: "/partners" },
      { name: "Careers at IELS", url: "/careers" },
    ],
  },
  {
    title: "Community",
    links: [
      { name: "IELS Circle", url: "https://circle.ielsco.com", external: true },
      { name: "Member stories", url: "https://circle.ielsco.com/stories", external: true },
      { name: "Events", url: "/events" },
      { name: "Global Impact Fellowship", url: "/events/gif" },
    ],
  },
  {
    title: "Learn",
    links: [
      { name: "Free resources", url: "/products/resources" },
      { name: "IELS Courses", url: "/products/courses" },
      { name: "IELS for Schools", url: "https://school.ielsco.com", external: true },
    ],
  },
];

const linkCls = cn("rounded text-[15px] text-[#2F4157]/75 transition-colors hover:text-[#1A2534] hover:underline underline-offset-4", focusRing);

export default function Footer() {
  return (
    <footer className="border-t border-[#E6E9EE] bg-white font-sans" data-testid="site-footer">
      <div className={cn(container, "grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr]")}>
        <div className="max-w-sm">
          <Image src="/images/logos/iels_horizontal_navy.png" alt="IELS" width={1564} height={409} sizes="120px" className="h-[30px] w-auto" />
          <p className="mt-5 text-[15px] leading-relaxed text-[#2F4157]/75">
            A community connecting Southeast Asian learners with people, resources, programs and study and work opportunities.
          </p>
          <p className="mt-2 text-[13px] font-medium text-[#2F4157]/55">PT English Space Berkah Indonesia</p>
          <div className="mt-5 flex gap-2">
            {[
              { href: "https://www.instagram.com/iels_co", label: "IELS on Instagram", icon: Instagram },
              { href: "https://www.linkedin.com/company/iels-co", label: "IELS on LinkedIn", icon: Linkedin },
              { href: "https://x.com/ielsforall", label: "IELS on X", icon: null },
            ].map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                className={cn("flex h-10 w-10 items-center justify-center rounded-full border border-[#E6E9EE] text-[#2F4157] hover:border-[#2F4157]", focusRing)}>
                {s.icon ? <s.icon size={18} aria-hidden="true" /> : <span aria-hidden="true" className="text-[15px] font-bold">𝕏</span>}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-[14px] font-bold text-[#1A2534]">{col.title}</p>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.name}>
                    {l.external
                      ? <a href={l.url} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.name}</a>
                      : <Link href={l.url} className={linkCls}>{l.name}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <p className="text-[14px] font-bold text-[#1A2534]">Contact</p>
            <ul className="mt-4 space-y-3">
              <li><a href="mailto:hello@ielsco.com" className={cn(linkCls, "inline-flex items-center gap-2")}><Mail size={16} aria-hidden="true" />hello@ielsco.com</a></li>
              <li><a href="https://wa.me/6285770024261" target="_blank" rel="noopener noreferrer" className={cn(linkCls, "inline-flex items-center gap-2")}><MessageCircle size={16} aria-hidden="true" />WhatsApp</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[#E6E9EE]">
        <div className={cn(container, "flex flex-col gap-3 py-6 text-[13px] text-[#2F4157]/60 sm:flex-row sm:items-center sm:justify-between")}>
          <p>© {new Date().getFullYear()} PT English Space Berkah Indonesia. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy-policy" className={linkCls}>Privacy policy</Link>
            <Link href="/terms-of-service" className={linkCls}>Terms of service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
