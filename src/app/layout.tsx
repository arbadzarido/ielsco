import type { Metadata } from "next";
// 1. Import Plus Jakarta Sans
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

import LayoutWrapper from "@/components/LayoutWrapper";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { Analytics } from "@vercel/analytics/next";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

// 2. Setup Plus Jakarta Sans
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

// Headings and titles (globals.css: h1-h6 and .font-heading). Only the three weights the type scale uses; next/font
// self-hosts them and sizes the fallback to match, so headings don't shift when the font arrives.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  // Resolves relative canonical and Open Graph URLs. No canonical here: each public page sets its own (see lib/seo.ts).
  metadataBase: new URL(SITE_URL),
  title: "IELSco | International opportunities and the community to go after them",
  description: "IELSco helps young people in Southeast Asia find scholarships, fellowships and programs abroad, prepare strong applications and stay on track with a community. Free to join.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/images/logos/iels_blue1.png", media: "(prefers-color-scheme: light)" },
      { url: "/images/logos/iels_white1.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/favicon.ico",
    apple: "/images/logos/iels_blue1.png",
  },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} style={{ fontSize: '75%' }}>
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
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  "name": "IELSco",
                  "legalName": "PT English Space Berkah Indonesia",
                  "alternateName": ["IELS", "Inclusive English Learning Space"],
                  "url": `${SITE_URL}/`,
                  "logo": `${SITE_URL}/images/logos/iels_blue1.png`,
                  "email": "hello@ielsco.com",
                  "sameAs": [
                    "https://www.instagram.com/iels_co",
                    "https://www.linkedin.com/company/iels-co",
                    "https://x.com/ielsforall"
                  ]
                },
                { "@type": "WebSite", "@id": `${SITE_URL}/#website`, "name": "IELSco", "url": `${SITE_URL}/`, "publisher": { "@id": `${SITE_URL}/#organization` } }
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