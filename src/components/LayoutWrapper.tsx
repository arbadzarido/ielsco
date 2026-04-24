"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // 1. Definisikan list path yang harus bener-bener bersih (Tanpa Padding Atas)
  const noPaddingPaths = [
    "/school/dashboard",
    "/school/sign-in",
    "/dashboard",
    "/privacy-policy",
    "/terms-of-service",
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
      
      <main className={shouldRemovePadding ? "pt-0" : "pt-30"}>
        {children}
      </main>
    </>
  );
}