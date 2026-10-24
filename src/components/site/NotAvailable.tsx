import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { btnPrimary, btnSecondary, container, h1, lead, siteRoot } from "./ui";
import { cn } from "@/lib/utils";

// Shared "page not found / not available" view (404 and retired tools). Points people somewhere useful.
export default function NotAvailable({ title = "We couldn't find that page", text = "The link may be old, or the page has moved." }: { title?: string; text?: string }) {
  return (
    <div className={cn(siteRoot, "flex min-h-[70vh] items-center bg-white py-16 font-sans")} data-testid="not-available">
      <div className={cn(container, "flex max-w-[900px] flex-col items-start gap-10 md:flex-row md:items-center")}>
        <Image src="/images/contents/mascot/poses/relaxed.png" alt="" width={220} height={220} className="h-[160px] w-auto shrink-0 md:h-[220px]" priority />
        <div>
        <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">404</p>
        <h1 className={cn(h1, "mt-4 text-[36px] sm:text-[48px]")}>{title}</h1>
        <p className={cn(lead, "mt-5")}>{text} These might help:</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/opportunities" className={btnPrimary}>Browse opportunities <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/" className={btnSecondary}>Go to the homepage</Link>
        </div>
        <p className="mt-10 text-[15px] text-[#2F4157]/65">
          Think this is a mistake? Email <a className="font-semibold underline" href="mailto:hello@ielsco.com">hello@ielsco.com</a>.
        </p>
        </div>
      </div>
    </div>
  );
}
