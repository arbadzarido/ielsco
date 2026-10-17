"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export function Avatar({ name, url, size = 44, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: size * 0.38 };

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} onError={() => setFailed(true)} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-[#577E90]/15 font-bold text-[#2F4157]", className)}
    >
      {initials(name)}
    </span>
  );
}
