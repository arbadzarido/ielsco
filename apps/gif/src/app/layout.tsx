import type { Metadata, Viewport } from "next";
import { Poppins, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Same type system as ielsco.com: Poppins headings (IELSco --font-heading), Plus Jakarta Sans body.
const heading = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-heading", display: "swap" });
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });

const SITE = (process.env.GIF_SITE_URL || "https://gif.ielsco.com").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Global Impact Fellowship Summer 2027 | IELSco", template: "%s | GIF Summer 2027" },
  description: "An 8-day international youth programme from Singapore through Malaysia to Thailand, 27 July – 3 August 2027. Develop a social-impact project through a three-stage competition, with a USD 5,000 total prize pool. Self-Funded registration is open: 20 Super Early Bird places.",
  openGraph: { type: "website", siteName: "Global Impact Fellowship · IELSco", images: [{ url: "/photos/nus-sign.jpg", width: 720, height: 1280, alt: "GIF 2026 delegates at NUS" }] },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }], apple: "/apple-icon.png" },
  robots: process.env.GIF_NOINDEX === "true" ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = { themeColor: "#FFFFFF", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
