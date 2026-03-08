import type { Metadata } from "next";
import { Inter, Geologica } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
  description:
    "Empowering youths for global success through a supportive community and mentorship. Join our Community",
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
        {/* Gunakan Wrapper untuk mengatur logika Header & Padding */}
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Analytics />
        <SpeedInsights/>
      </body>
    </html>
  );
}