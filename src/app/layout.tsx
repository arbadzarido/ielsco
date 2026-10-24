import type { Metadata } from "next";
// 1. Import Plus Jakarta Sans
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import LayoutWrapper from "@/components/LayoutWrapper";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

// 2. Setup Plus Jakarta Sans
const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves relative canonical and Open Graph URLs. No canonical here: each public page sets its own (see lib/seo.ts).
  metadataBase: new URL(SITE_URL),
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
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image" },
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
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  "name": "IELS",
                  "legalName": "PT English Space Berkah Indonesia",
                  "alternateName": ["IELSco", "IELS Community"],
                  "url": `${SITE_URL}/`,
                  "logo": `${SITE_URL}/images/logos/iels_blue1.png`,
                  "email": "hello@ielsco.com",
                  "sameAs": [
                    "https://www.instagram.com/iels_co",
                    "https://www.linkedin.com/company/iels-co",
                    "https://x.com/ielsforall"
                  ]
                },
                { "@type": "WebSite", "@id": `${SITE_URL}/#website`, "name": "IELS", "url": `${SITE_URL}/`, "publisher": { "@id": `${SITE_URL}/#organization` } }
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
      </body>
    </html>
  );
}