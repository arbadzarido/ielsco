import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. LOGIC LAMA: Env Variables
  // Production project (public anon key). IELSCO_LOCAL_SUPABASE_* points a local run at a disposable database instead;
  // those names exist only on developer machines, so production builds are unaffected.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.IELSCO_LOCAL_SUPABASE_URL || "https://hkubzamchahvdpvojepc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.IELSCO_LOCAL_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdWJ6YW1jaGFodmRwdm9qZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjU4MTgsImV4cCI6MjA4ODMyNTgxOH0.fYIyGlDuGk4vCE4eus1W0u2LhaMg_aKG0ZUbK7F3AsA",
  },

  // 2. LOGIC LAMA: Remote Patterns
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Approved Member Stories media (public bucket "member-stories").
      { protocol: 'https', hostname: 'hkubzamchahvdpvojepc.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },

  // Short, guessable paths for pages whose routes are nested. Permanent (308) so links and search engines settle on the
  // real URL. Main site only: on circle./school. the proxy rewrites paths into those sections.
  async redirects() {
    const main = [{ type: "host" as const, value: "^(?:www\\.)?ielsco\\.com$|^localhost$" }];
    return [
      { source: "/schools", destination: "/school", permanent: true, has: main },
      { source: "/programs", destination: "/products", permanent: true, has: main },
      { source: "/courses", destination: "/products/courses", permanent: true, has: main },
      { source: "/resources", destination: "/products/resources", permanent: true, has: main },
      // 2026 cohort divisions that the 2027 structure renamed or retired.
      { source: "/careers/business", destination: "/careers/partnerships", permanent: true, has: main },
      { source: "/careers/talent", destination: "/careers/people", permanent: true, has: main },
      { source: "/careers/finance", destination: "/careers", permanent: true, has: main },
    ];
  },

  // 3. OPTIMASI RAM (Penting buat RAM 8GB lo)
  // swcMinify Dihapus karena sudah default di Next.js 15/16
  experimental: {
    optimizePackageImports: ['@prisma/client', 'lucide-react'],
  },

  // 4. Webpack Fallback
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "iels",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  automaticVercelMonitors: true,
  disableLogger: true,
});