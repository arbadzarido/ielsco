"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LayoutDashboard, LogOut, Menu, UserCircle, X } from "lucide-react";
import { btnPrimary, btnSecondary, focusRing } from "@/components/site/ui";
import { cn } from "@/lib/utils";

// Public-site header (Opportunities, Community, Programs, Resources, For Schools, Membership). Hidden on dashboards and auth pages, which have their own
// chrome. Domain-aware: on circle.ielsco.com / school.ielsco.com, main-site links point back to ielsco.com.

function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

const HIDDEN_PATHS = [
  "/school/dashboard", "/quiz", "/school/sign-in", "/dashboard", "/cafe", "/planner", "/privacy-policy",
  "/terms-of-service", "/welcome/start", "/welcome/result", "/sign-in", "/sign-up", "/api/auth",
];

type NavChild = { name: string; path: string; note?: string };
type NavItem = { name: string; path: string; active: boolean; children?: NavChild[] };

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Host detection runs on the client only, so server and first client render agree.
  // prod: the real ielsco.com domains. Elsewhere (localhost, Vercel previews) Circle lives at /circle on the same origin.
  const [host, setHost] = useState({ school: false, circle: false, local: false, prod: true, main: "https://ielsco.com" });
  useEffect(() => {
    const h = window.location.hostname;
    const local = h.includes("localhost") || h === "127.0.0.1";
    setHost({ school: h.includes("school."), circle: h.includes("circle."), local, prod: h.endsWith("ielsco.com"), main: local ? window.location.origin : "https://ielsco.com" });
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    async function fetchProfile(userId: string) {
      const { data: userData } = await supabase.from("users").select("full_name, avatar_url").eq("id", userId).single();
      if (userData) {
        setUserName(userData.full_name ?? null);
        setUserAvatar(userData.avatar_url ?? null);
      }
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); fetchProfile(user.id); }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else { setUserName(null); setUserAvatar(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpenDropdown(null);
      setProfileOpen(false);
      setMobileOpen((open) => { if (open) menuButtonRef.current?.focus(); return false; });
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  // Close menus on navigation; lock page scroll while the mobile menu is open.
  useEffect(() => { setMobileOpen(false); setOpenDropdown(null); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  async function handleSignOut() {
    await createClient().auth.signOut();
    setProfileOpen(false);
    router.push("/");
    router.refresh();
  }

  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  const offMain = host.school || host.circle;
  const main = (path: string) => (offMain ? `${host.main}${path}` : path);
  const circleBase = host.circle ? "" : host.prod ? "https://circle.ielsco.com" : "/circle";
  const signInHref = host.circle ? `${host.main}/sign-in` : host.local && pathname?.startsWith("/school") ? "/school/sign-in" : "/sign-in";
  const onCircle = host.circle || !!pathname?.startsWith("/circle");

  // Main navigation answers: what can I find (Opportunities, Resources), who do I meet (Community), what can I join
  // (Programs, Membership), and the institutional path (For Schools). About, Partners and Careers live in the footer.
  const navItems: NavItem[] = [
    { name: "Opportunities", path: main("/opportunities"), active: !offMain && !!pathname?.startsWith("/opportunities") },
    {
      name: "Community",
      path: circleBase || "/",
      active: onCircle,
      children: [
        { name: "IELS Circle: weekly sessions", path: circleBase || "/" },
        { name: "Member stories", path: `${circleBase}/stories` },
        { name: "Cohort agenda", path: `${circleBase}/agenda` },
      ],
    },
    {
      name: "Programs",
      path: main("/products"),
      active: !offMain && (!!pathname?.startsWith("/products") && !pathname?.startsWith("/products/resources") || !!pathname?.startsWith("/events")),
      children: [
        { name: "All programs", path: main("/products") },
        { name: "IELS Courses", path: main("/products/courses") },
        { name: "Events", path: main("/events") },
        { name: "Global Impact Fellowship", path: main("/events/gif") },
      ],
    },
    { name: "Resources", path: main("/products/resources"), active: !offMain && !!pathname?.startsWith("/products/resources") },
    { name: "For Schools", path: main("/school"), active: host.school || (!offMain && pathname === "/school") },
    { name: "Membership", path: main("/membership"), active: !offMain && !!pathname?.startsWith("/membership") },
  ];

  const linkBase = cn("rounded-full px-3.5 py-2 text-[15px] font-semibold transition-colors", focusRing);
  const linkState = (active: boolean) => (active ? "bg-[#2F4157] text-white" : "text-[#2F4157]/80 hover:bg-[#F1F4F8] hover:text-[#2F4157]");

  const Avatar = ({ size = 36 }: { size?: number }) =>
    userAvatar ? (
      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs come from several hosts
      <img src={userAvatar} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span className="flex items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white" style={{ width: size, height: size }}>
        {userName?.charAt(0)?.toUpperCase() ?? <UserCircle size={size * 0.6} aria-hidden="true" />}
      </span>
    );

  const Account = ({ mobile = false }: { mobile?: boolean }) => {
    if (authLoading) return <span className="h-9 w-24 animate-pulse rounded-full bg-[#F1F4F8]" aria-hidden="true" />;
    if (!user) {
      return (
        <div className={cn("flex items-center gap-2", mobile && "flex-col items-stretch")}>
          <Link href={signInHref} className={cn(mobile ? btnSecondary : "rounded-full px-3 py-2 text-[15px] font-semibold text-[#2F4157] hover:bg-[#F1F4F8]", focusRing)} data-testid="header-sign-in">
            Sign in
          </Link>
          <Link href={main("/sign-up")} className={cn(btnPrimary, "min-h-[42px] px-5", mobile && "w-full")} data-testid="header-join">
            Join free
          </Link>
        </div>
      );
    }
    if (mobile) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[#E6E9EE] p-3">
            <Avatar size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[#1A2534]">{userName}</p>
            </div>
          </div>
          <Link href={main("/dashboard")} className={cn(btnPrimary, "w-full")}>
            <LayoutDashboard size={18} aria-hidden="true" /> Go to dashboard
          </Link>
          <button type="button" onClick={handleSignOut} className={cn("flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[15px] font-semibold text-[#C94F51] hover:bg-[#FDF1F1]", focusRing)}>
            <LogOut size={18} aria-hidden="true" /> Sign out
          </button>
        </div>
      );
    }
    return (
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => setProfileOpen(!profileOpen)}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          className={cn("flex items-center gap-2 rounded-full border border-[#E6E9EE] py-1 pl-1 pr-3 hover:border-[#C9D1DC]", focusRing)}
        >
          <Avatar />
          <span className="hidden text-[15px] font-semibold text-[#2F4157] lg:inline">{userName?.split(" ")[0] ?? "Account"}</span>
          <ChevronDown size={16} className={cn("text-[#2F4157]/60 transition-transform", profileOpen && "rotate-180")} aria-hidden="true" />
        </button>
        {profileOpen && (
          <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E6E9EE] bg-white p-2 shadow-[0_16px_40px_rgba(26,37,52,0.12)]">
            <div className="border-b border-[#E6E9EE] px-3 pb-3 pt-2">
              <p className="truncate text-[15px] font-bold text-[#1A2534]">{userName}</p>
            </div>
            <Link role="menuitem" href={main("/dashboard")} onClick={() => setProfileOpen(false)} className={cn("mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#2F4157] hover:bg-[#F1F4F8]", focusRing)}>
              <LayoutDashboard size={18} aria-hidden="true" /> Go to dashboard
            </Link>
            <button role="menuitem" type="button" onClick={handleSignOut} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-[#C94F51] hover:bg-[#FDF1F1]", focusRing)}>
              <LogOut size={18} aria-hidden="true" /> Sign out
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E6E9EE] bg-white font-sans" data-testid="site-header">
      <div className="mx-auto flex h-[72px] w-full max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={main("/")} className={cn("flex shrink-0 items-center rounded-lg", focusRing)} aria-label="IELSco home">
          <Image src="/images/logos/iels_horizontal_navy.png" width={1564} height={409} sizes="140px" priority className="h-[30px] w-auto lg:h-[34px]" alt="IELS" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.name} className="relative" onMouseEnter={() => setOpenDropdown(item.name)} onMouseLeave={() => setOpenDropdown(null)}>
                <div className={cn("flex items-center rounded-full transition-colors", linkState(item.active))}>
                  <Link href={item.path} aria-current={item.active ? "page" : undefined} className={cn("rounded-full py-2 pl-3.5 pr-1 text-[15px] font-semibold", focusRing)}>
                    {item.name}
                  </Link>
                  <button
                    type="button"
                    aria-label={`${item.name} pages`}
                    aria-expanded={openDropdown === item.name}
                    onClick={() => setOpenDropdown(openDropdown === item.name ? null : item.name)}
                    className={cn("rounded-full py-2 pl-1 pr-3", focusRing)}
                  >
                    <ChevronDown size={16} className={cn("transition-transform", openDropdown === item.name && "rotate-180")} aria-hidden="true" />
                  </button>
                </div>
                {openDropdown === item.name && (
                  <div className="absolute left-0 top-full pt-2">
                    <ul className="w-64 rounded-2xl border border-[#E6E9EE] bg-white p-2 shadow-[0_16px_40px_rgba(26,37,52,0.12)]">
                      {item.children.map((c) => (
                        <li key={c.path}>
                          <Link href={c.path} onClick={() => setOpenDropdown(null)} className={cn("block rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#2F4157] hover:bg-[#F1F4F8]", focusRing)}>
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Link key={item.name} href={item.path} aria-current={item.active ? "page" : undefined} className={cn(linkBase, linkState(item.active))}>
                {item.name}
              </Link>
            ),
          )}
          <div className="ml-3"><Account /></div>
        </nav>

        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls="site-mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className={cn("flex h-11 w-11 items-center justify-center rounded-full text-[#2F4157] hover:bg-[#F1F4F8] lg:hidden", focusRing)}
        >
          {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {mobileOpen && (
        <div id="site-mobile-menu" className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto border-t border-[#E6E9EE] bg-white lg:hidden" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
          <nav aria-label="Main" className="mx-auto max-w-[560px] px-4 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.path} aria-current={item.active ? "page" : undefined} className={cn("block rounded-2xl px-4 py-3.5 text-[17px] font-semibold", linkState(item.active), focusRing)}>
                    {item.name}
                  </Link>
                  {item.children && (
                    <ul className="mb-2 ml-4 mt-1 border-l border-[#E6E9EE] pl-3">
                      {item.children.slice(1).map((c) => (
                        <li key={c.path}>
                          <Link href={c.path} className={cn("block rounded-xl px-3 py-2.5 text-[15px] font-medium text-[#2F4157]/80 hover:bg-[#F1F4F8]", focusRing)}>
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-[#E6E9EE] pt-6"><Account mobile /></div>
          </nav>
        </div>
      )}
    </header>
  );
}
