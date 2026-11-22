  // LayoutWrapper.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/header";

// The two recruitment popups only open after a pause or some scrolling, so their code loads after the page is interactive
// instead of being part of every page's first load.
const RecruitmentPopup = dynamic(() => import("@/components/careers/RecruitmentPopup").then((m) => m.RecruitmentPopup), { ssr: false });
const GifRecruitPopup = dynamic(() => import("@/components/gif-public/GifRecruitPopup").then((m) => m.GifRecruitPopup), { ssr: false });

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The popups wait for the page to settle (2.5 s, or the first scroll/tap) before their code is even requested, so they
  // never compete with the first paint. Their own rules (20 s on the page or 45% scrolled, once per session) are unchanged.
  const [popupsReady, setPopupsReady] = useState(false);
  useEffect(() => {
    const ready = () => setPopupsReady(true);
    const t = window.setTimeout(ready, 2500);
    window.addEventListener("scroll", ready, { once: true, passive: true });
    window.addEventListener("pointerdown", ready, { once: true });
    return () => { window.clearTimeout(t); window.removeEventListener("scroll", ready); window.removeEventListener("pointerdown", ready); };
  }, []);
  
  // 1. Definisikan list path yang harus bener-bener bersih (Tanpa Padding Atas)
  const noPaddingPaths = [
    "/school/dashboard",
    "/quiz",
    "/school/sign-in",
    "/planner",
    "/dashboard",
    "/os",
    "/privacy-policy",
    "/terms-of-service",
    "/cafe",
     "/welcome/start",
  "/welcome/result",
    "/sign-in",
    "/sign-up",
    "/api/auth"
  ];

  // 2. Cek apakah pathname saat ini masuk dalam list di atas
  const shouldRemovePadding = noPaddingPaths.some((path) => pathname?.startsWith(path));

  return (
    <>
      {/* Header otomatis hilang sendiri karena logic internal di header.tsx 
         sudah kita set untuk return null pada path yang sama.
      */}
      <Header />
      
      {/* One global header for every public page (it hides itself on dashboards/auth, see header.tsx).
          Pages must not render their own <Header />. */}
      <main className={shouldRemovePadding ? "pt-0" : "pt-24"}>
        {children}
      </main>
      {/* Open Recruitment 2027 poster (once per session; see lib/careers/popup.ts for where it never shows). */}
      {popupsReady && <RecruitmentPopup />}
      {/* GIF Summer 2027 recruitment (public pages only, after engagement; never in the same session as the one above). */}
      {popupsReady && <GifRecruitPopup />}
    </>
  );
}