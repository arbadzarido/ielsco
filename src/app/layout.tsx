import type { Metadata } from "next";
import { Inter, Geologica } from "next/font/google";
import "./globals.css";

// Import Wrapper baru tadi (bukan Header langsung)
import LayoutWrapper from "@/components/LayoutWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geologica = Geologica({
  variable: "--font-geologica",
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
      {/* Catatan: bg-[#2F4157] adalah background biru tua public.
         DashboardLayout nanti akan menimpanya dengan background sendiri (min-h-screen bg-gray...).
      */}
      <body
        className={`${geologica.variable} ${inter.variable} antialiased bg-[#2F4157] font-inter`}
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

        {/* Gunakan Wrapper untuk mengatur logika Header & Padding */}
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}