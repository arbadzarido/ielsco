"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  Home, 
  Info, 
  BookOpen, 
  Grid, 
  LogIn, 
  Menu, 
  X, 
  ChevronDown,
  Coffee,
  GraduationCap,
  FileCheck,
  Calendar,
  School,
  Library,
  Sparkles
} from "lucide-react";

export default function Header() {
    const pathname = usePathname();
  // Di dalam komponen Header kamu
const hiddenPaths = [
  "/dashboard",
  "/events/gif",
  "/privacy-policy",
  "/terms-of-service",
  "/welcome/start",
  "/welcome/result",
  "/sign-in",
  "/sign-up", // Tambahkan ini!
  "/api/auth"
];

// Cek apakah pathname saat ini diawali oleh salah satu list di atas
const isHidden = hiddenPaths.some((path) => pathname?.startsWith(path));

if (isHidden) {
  return null;
}
  


  // --- LOGIKA PENYEMBUNYIAN ---
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }
  // Sembunyiin header utama kalau lagi di halaman GIF (karena udah pake GIFHeader)
  if (pathname?.startsWith("/events/gif")) {
    return null;
  }
  if (pathname?.startsWith("/privacy-policy")) {
    return null;
  }
  if (pathname?.startsWith("/terms-of-service")) {
    return null;
  }
    if (pathname?.startsWith("/sign-in")) {
    return null;
  }
  // ---------------------------

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "About", path: "/about", icon: Info },
    { name: "Stories", path: "/stories", icon: BookOpen },
    {
      name: "Products",
      path: "/products",
      icon: Grid,
      children: [
        { name: "IELS Lounge", path: "/iels-lounge", icon: Coffee },
        { name: "IELS Courses", path: "/products/courses", icon: GraduationCap },
        { name: "IELS English Test", path: "/test", icon: FileCheck },
        { name: "IELS Events", path: "/events", icon: Calendar },
        { name: "IELS for Schools", path: "/products/schools", icon: School },
        { name: "E-books & Recordings", path: "/products/resources", icon: Library },
      ],
    },
    {
      name: "Sign in!",
      path: "/sign-in",
      isStart: true,
      icon: LogIn
    },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="fixed top-0 left-0 right-0 w-full bg-[#2F4157] flex items-center justify-between py-6 lg:py-10 px-4 sm:px-8 lg:px-[100px] z-50 shadow-md">
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center font-geologica gap-3 lg:gap-[19px]"
        onClick={closeMobileMenu}
      >
        <Image
          src="/images/logos/iels_white.png"
          width={60}
          height={60}
          className="lg:w-[75px]"
          alt="IELS Logo White"
        />
        <div className="flex flex-col text-white text-[14px] lg:text-[16px]">
          <p>Inclusive English</p>
          <p className="-mt-1">Learning Space</p>
        </div>
      </Link>

      {/* ---------------- TABLET & DESKTOP NAV ---------------- */}
      <div className="hidden md:flex items-center text-white gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          // 1. Handle "Sign in!" (Start Button)
          if (item.isStart) {
            return (
              <Link
                key={item.name}
                href={item.path}
                className="ml-2 inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 bg-[#E56668] text-white font-semibold hover:bg-[#C04C4E] transition transform hover:scale-[1.02] shadow-lg shadow-red-900/20"
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          }

          // 2. Handle Dropdown (Products)
          if (item.children) {
            const isOpen = openDropdown === item.name;
            const isActive = pathname?.startsWith(item.path) || pathname?.startsWith("/test") || pathname?.startsWith("/iels-lounge");

            return (
              <div 
                key={item.name} 
                className="relative group"
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <div
                  className={`flex items-center rounded-full transition-all cursor-pointer ${
                    isActive ? "bg-white text-[#2F4157] font-medium" : "hover:bg-white/10 text-white/90 hover:text-white"
                  }`}
                >
                  {/* Nama Menu Utama */}
                  <Link href={item.path} className="flex items-center gap-2 pl-5 py-2.5 pr-1">
                    <Icon size={18} />
                    {item.name}
                  </Link>

                  {/* Tombol Panah */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenDropdown(isOpen ? null : item.name);
                    }}
                    className="pr-4 py-2 flex items-center justify-center"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "group-hover:rotate-180"}`}
                    />
                  </button>
                </div>

                {/* Menu Dropdown */}
                <div
                  className={`absolute left-0 mt-2 w-64 rounded-2xl bg-white text-[#2F4157] shadow-xl z-[60] transition-all duration-200 border border-gray-100 overflow-hidden
                    ${isOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible lg:group-hover:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:visible"}
                  `}
                >
                  <div className="py-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.path}
                          href={child.path}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600 hover:text-[#E56668]"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <ChildIcon size={18} className="text-gray-400" />
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          // 3. Normal Link
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors font-medium ${
                isActive 
                  ? "bg-white text-[#2F4157]" 
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={toggleMobileMenu}
        className="md:hidden flex flex-col items-center justify-center w-10 h-10 text-white"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeMobileMenu} />}

      {/* MOBILE MENU */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-[80%] max-w-sm bg-[#2F4157] z-50 transition-transform duration-300 shadow-2xl ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* Mobile Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
           <span className="text-white font-geologica font-bold text-lg">Menu</span>
           <button onClick={closeMobileMenu} className="text-white/70 hover:text-white">
             <X size={24} />
           </button>
        </div>

        <nav className="p-6 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Special mobile Start
            if (item.isStart) {
              return (
                <div key={item.name} className="pt-4 mt-4 border-t border-white/10">
                  <Link
                    href={item.path}
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center gap-2 w-full text-center px-4 py-3 rounded-xl bg-[#E56668] text-white font-bold hover:bg-[#C04C4E] transition-all shadow-lg"
                  >
                    <Icon size={20} />
                    {item.name}
                  </Link>
                </div>
              );
            }

            // Dropdown Items (Mobile)
            if (item.children) {
              const isOpen = openDropdown === item.name;
              const isActive = pathname?.startsWith("/products");
              
              return (
                <div key={item.name} className="overflow-hidden">
                  <div className={`rounded-xl transition-colors ${isActive ? "bg-white/10" : ""}`}>
                    <div className="flex items-center justify-between pr-2">
                      <Link
                        href={item.path}
                        onClick={closeMobileMenu}
                        className="flex-1 flex items-center gap-3 px-4 py-3 text-white font-medium"
                      >
                        <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                        {item.name}
                      </Link>
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : item.name)}
                        className="p-3 text-white/70"
                      >
                        <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {/* Mobile Submenu */}
                    <div className={`space-y-1 pl-4 pr-2 overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-2" : "max-h-0"}`}>
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            onClick={closeMobileMenu}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <ChildIcon size={16} />
                            {child.name}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Normal Link (Mobile)
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                  isActive 
                    ? "bg-white text-[#2F4157]" 
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Icon size={20} className={isActive ? "text-[#E56668]" : "text-gray-300"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}