import type { Metadata, Viewport } from "next";
import { EB_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Headings: Apple Garamond where the visitor has it installed; EB Garamond (open licence) is the web fallback.
const garamond = EB_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-garamond", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });

const SITE = (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Global Impact Fellowship Summer 2027 | IELSco", template: "%s | GIF Summer 2027" },
  description: "An 8-day international youth programme from Singapore through Malaysia to Thailand, 27 July – 3 August 2027. Apply Fully Funded, join the Project Mentoring Program, or register Self-Funded.",
  openGraph: { type: "website", siteName: "Global Impact Fellowship · IELSco", images: [{ url: "/photos/nus-sign.jpg", width: 720, height: 1280, alt: "GIF 2026 delegates at NUS" }] },
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  robots: process.env.GIF_NOINDEX === "true" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#1B2B3C", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${garamond.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
