"use client";

import ReactCountryFlag from "react-country-flag";
import { cn } from "@/lib/utils";

// Real SVG flag (same library the public Circle page uses). Decorative: the country name is always shown next to it.
export function CountryFlag({ code, size = 20, className }: { code: string; size?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgba(47,65,87,0.12)]", className)} style={{ width: size * 1.35, height: size }}>
      <ReactCountryFlag countryCode={code} svg style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </span>
  );
}
