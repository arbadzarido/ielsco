"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Compass, LogOut } from "lucide-react";
import { ACCOUNT_ITEMS } from "./nav";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { focusRing, glassMenu } from "./ui";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Profile area: profile, My Learning, Settings, Help, the product tour, language and sign-out.
const MENU_LINKS = [
  ...ACCOUNT_ITEMS.map(({ key, path, icon, id }) => ({ key, href: path, icon, id })),
  { key: "tour.take", href: "/dashboard?tour=1", icon: Compass, id: "take-tour" },
];

export function AccountMenu({ userName, userAvatar, placement = "down" }: { userName: string; userAvatar?: string | null; placement?: "down" | "up" }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className={cn("relative", placement === "up" && "w-full")} ref={ref}>
      <button
        type="button"
        data-testid="account-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("nav.openAccountMenu")}
        onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-2 rounded-xl p-1 pr-2 text-[#304156] hover:bg-[#304156]/[0.06]", placement === "up" && "w-full", focusRing)}
      >
        <Avatar name={userName} url={userAvatar} size={36} className="bg-[#304156] text-white" />
        <span className={cn("truncate font-semibold", placement === "up" ? "min-w-0 flex-1 text-left text-[15px]" : "hidden max-w-[140px] text-[15px] sm:block")}>{placement === "up" ? userName : userName.split(" ")[0]}</span>
        <ChevronDown size={16} className={cn("transition-transform", open !== (placement === "up") && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" data-testid="account-menu" className={cn(glassMenu, "absolute right-0 z-50 w-64 rounded-2xl p-2", placement === "up" ? "bottom-full left-0 mb-3" : "mt-3 max-h-[calc(100dvh-6rem)] overflow-y-auto")}>
          <p className="truncate px-3 pb-2 pt-1 text-base font-semibold text-[#2F4157]">{userName}</p>
          {MENU_LINKS.map(({ key, href, icon: Icon, id }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              data-testid={`account-menu-${id}`}
              onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-[#2F4157] hover:bg-[#F7F8FA]", focusRing)}
            >
              <Icon size={18} className="text-[#577E90]" /> {t(key)}
            </Link>
          ))}
          <div className="my-1 h-px bg-[#E3E7ED]/60" />
          <div className="px-3 py-1.5">
            <LanguageSelect testId="account-language-select" />
          </div>
          <div className="my-1 h-px bg-[#E3E7ED]/60" />
          <button
            type="button"
            role="menuitem"
            data-testid="account-menu-sign-out"
            onClick={signOut}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-semibold text-[#2F4157] hover:bg-[#F7F8FA]", focusRing)}
          >
            <LogOut size={18} className="text-[#577E90]" /> {t("nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
