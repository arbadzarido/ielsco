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

export default nextConfig;