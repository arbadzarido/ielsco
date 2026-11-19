import "server-only";
import { headers } from "next/headers";

// Client IP as set by Vercel's edge (not spoofable there); falls back to the first X-Forwarded-For hop elsewhere.
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-vercel-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || null;
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}

export async function viewerCountry(): Promise<string | null> {
  const c = (await headers()).get("x-vercel-ip-country");
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}

export function siteUrl(): string {
  return (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");
}
