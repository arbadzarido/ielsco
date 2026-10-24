import type { Metadata } from "next";
// 1. Import Plus Jakarta Sans
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import LayoutWrapper from "@/components/LayoutWrapper";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { Analytics } from "@vercel/analytics/next";

// 2. Setup Plus Jakarta Sans
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ielsco.com"),
  title: "IELSco | International opportunities and the community to go after them",
  description: "IELSco helps young people in Southeast Asia find scholarships, fellowships and programs abroad, prepare strong applications and stay on track with a community. Free to join.",
  openGraph: {
    siteName: "IELSco",
    type: "website",
    locale: "en_US",
    images: ["/images/site/community-in-person.webp"],
  },
  twitter: { card: "summary_large_image", site: "@ielsforall" },
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
    <html lang="en" style={{ fontSize: '75%' }}>
      <body
        // 3. Masukkan variable Jakarta Sans dan set font-sans sebagai default
        className={`${jakartaSans.variable} antialiased bg-white text-[#1A2534] font-sans`}
      >
        {/* --- SEO SCHEMA MARKUP START --- */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "IELSco",
              "legalName": "PT English Space Berkah Indonesia",
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

        <I18nProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </I18nProvider>
        {/* Cookieless Vercel Web Analytics; only when the project has it switched on (NEXT_PUBLIC_ANALYTICS_ENABLED). */}
        {process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" && <Analytics />}
      </body>
    </html>
  );
}