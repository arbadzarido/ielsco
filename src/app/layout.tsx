import type { Metadata } from "next";
// 1. Import Plus Jakarta Sans
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import LayoutWrapper from "@/components/LayoutWrapper";

// 2. Setup Plus Jakarta Sans
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IELS | English Community",
  description: "IELS (PT English Space Berkah Indonesia) is an inclusive English community empowering youths for global success through supportive mentorship. Join us today.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/logos/iels_blue1.png", media: "(prefers-color-scheme: light)" },
      { url: "/images/logos/iels_white1.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/favicon.ico",
    apple: "/images/logos/iels_blue1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // 3. Masukkan variable Jakarta Sans dan set font-sans sebagai default
        className={`${jakartaSans.variable} antialiased bg-[#2F4157] font-sans`}
      >
        {/* --- SEO SCHEMA MARKUP START --- */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "PT English Space Berkah Indonesia",
              "alternateName": "IELS",
              "url": "https://ielsco.com",
              "logo": "https://ielsco.com/images/logos/iels_blue1.png",
              "sameAs": [
                "https://www.instagram.com/iels_co",
                "https://www.linkedin.com/company/iels-co",
                "https://x.com/ielsforall"
              ]
            })
          }}
        />
        {/* --- SEO SCHEMA MARKUP END --- */}

        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}