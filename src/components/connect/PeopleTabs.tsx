"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";

// In-page switch for Social → People: member discovery, connections, intro requests, and the member's own profile
// and Elco-Pass. Links (not tabs) because each part keeps its own existing page; same underline style as the
// existing Events filter. Members' public profiles (/connect/people/[id]) also count as People.
const PARTS = [
  { label: "Discover", href: "/dashboard/connect/discover", match: ["/dashboard/connect/discover", "/dashboard/connect/people", "/dashboard/people"] },
  { label: "Connections", href: "/dashboard/connect/connections" },
  { label: "Intro requests", href: "/dashboard/connect/requests" },
  { label: "My Elco-Pass", href: "/dashboard/passport", match: ["/dashboard/passport", "/dashboard/connect/passport", "/dashboard/my-learning", "/dashboard/connect/elco"] },
];

const under = (prefix: string, path: string) => path === prefix || path.startsWith(`${prefix}/`);

export function PeopleTabs() {
  const path = usePathname() ?? "";
  return (
    <nav aria-label="People" data-testid="people-tabs" className="flex gap-1 overflow-x-auto border-b border-[#E3E7ED] [scrollbar-width:none]">
      {PARTS.map((p) => {
        const active = (p.match ?? [p.href]).some((m) => under(m, path));
        return (
          <Link key={p.href} href={p.href} aria-current={active ? "page" : undefined} data-testid={`people-tab-${p.href.split("/").pop()}`}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-[15px] font-semibold transition-colors", focusRing,
              active ? "border-[#2F4157] text-[#1A2534]" : "border-transparent text-[#2F4157]/55 hover:text-[#2F4157]")}>
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
