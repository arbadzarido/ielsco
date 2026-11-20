import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const supabase = (process.env.GIF_SUPABASE_URL || "https://hkubzamchahvdpvojepc.supabase.co").replace(/\/+$/, "");
// Midtrans Snap popup (snap.js + its payment iframe). The local fake Midtrans is allowed only for sandbox test runs.
const testGateway = (process.env.GIF_MIDTRANS_TEST_BASE || "").replace(/\/+$/, "");
const allowTest = !!testGateway && (process.env.GIF_MIDTRANS_ENV || "sandbox") === "sandbox"
  && (process.env.NODE_ENV !== "production" || process.env.GIF_ALLOW_TEST_GATEWAY === "true");
const snap = ["https://app.midtrans.com", "https://app.sandbox.midtrans.com", ...(allowTest ? [testGateway] : [])].join(" ");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${snap}` + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.midtrans.com",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${snap} https://api.midtrans.com https://api.sandbox.midtrans.com`,
  `frame-src ${snap} https://*.midtrans.com`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // This app lives inside the IELSco repo (apps/gif) but is built and deployed on its own.
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      ],
    }];
  },
};

export default nextConfig;
