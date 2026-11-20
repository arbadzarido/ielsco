"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SideNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/portal" || href === "/admin" ? path === href : path.startsWith(href));
  return <nav aria-label="Section">{items.map((i) => <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>{i.label}</Link>)}</nav>;
}
