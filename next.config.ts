import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";


const nextConfig: NextConfig = {
    // Tambahkan blok ini:
env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://hkubzamchahvdpvojepc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrdWJ6YW1jaGFodmRwdm9qZXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjU4MTgsImV4cCI6MjA4ODMyNTgxOH0.fYIyGlDuGk4vCE4eus1W0u2LhaMg_aKG0ZUbK7F3AsA",
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Domain spesifik error kamu
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com', // Wildcard biar aman kalau Google ganti server (lh4, lh5, dst)
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "iels",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
