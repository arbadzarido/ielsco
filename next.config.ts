import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. LOGIC LAMA: Env Variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://hkubzamchahvdpvojepc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdWJ6YW1jaGFodmRwdm9qZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjU4MTgsImV4cCI6MjA4ODMyNTgxOH0.fYIyGlDuGk4vCE4eus1W0u2LhaMg_aKG0ZUbK7F3AsA",
  },

  // 2. LOGIC LAMA: Remote Patterns
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
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