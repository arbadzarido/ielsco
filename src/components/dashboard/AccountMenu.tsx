"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Compass, LogOut } from "lucide-react";
import { BottomSheet, sheetRow } from "./BottomSheet";
import { ACCOUNT_ITEMS } from "./nav";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";
import { focusRing, glassMenu } from "./ui";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { shortName } from "@/lib/names";
import { useAccountSummary } from "./useAccountSummary";

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
  // Same structure as Elco's sidebar profile: avatar, short name, one line of detail (role, else "IELSco account"; "member" means a paid membership).
  const summary = useAccountSummary();
  const fullName = summary?.display_name?.trim() || userName;
  const name = shortName(fullName);
  const avatar = summary?.hasProfile ? summary.avatar_url : userAvatar;
  const detail = summary?.role_status?.trim() || "IELSco account";

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
        title={placement === "up" ? fullName : undefined}
        className={cn("flex items-center gap-2 rounded-xl p-1 pr-2 text-[#304156] hover:bg-[#304156]/[0.06]", placement === "up" && "w-full gap-3 p-1.5", focusRing)}
      >
        <Avatar name={name} url={avatar} size={placement === "up" ? 40 : 36} className="bg-[#304156] text-white" />
        {placement === "up" ? (
          <span className="min-w-0 flex-1 text-left">
            <span data-testid="sidebar-user-name" className="block truncate text-[15px] font-semibold leading-tight text-[#1A2534]">{name}</span>
            <span data-testid="sidebar-user-detail" className="mt-0.5 block truncate text-[13px] leading-tight text-[#2F4157]/60">{detail}</span>
          </span>
        ) : (
          <span className="hidden max-w-[140px] truncate text-[15px] font-semibold sm:block">{name.split(" ")[0]}</span>
        )}
        <ChevronDown size={16} className={cn("shrink-0 transition-transform", open !== (placement === "up") && "rotate-180")} />
      </button>

      {open && (
        <div role="menu" data-testid="account-menu" className={cn(glassMenu, "absolute right-0 z-50 w-64 rounded-2xl p-2", placement === "up" ? "bottom-full left-0 mb-3" : "mt-3 max-h-[calc(100dvh-6rem)] overflow-y-auto")}>
          <p className="truncate px-3 pb-2 pt-1 text-base font-semibold text-[#2F4157]">{fullName}</p>
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

// Phones and tablets (< lg): the avatar in the top bar opens the account actions as a bottom sheet, the same pattern
// as the "More" sheet and Elco's menus, instead of a desktop dropdown squeezed onto a phone.
export function AccountSheet({ userName, userAvatar }: { userName: string; userAvatar?: string | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const summary = useAccountSummary();
  const fullName = summary?.display_name?.trim() || userName;
  const name = shortName(fullName);
  const avatar = summary?.hasProfile ? summary.avatar_url : userAvatar;
  const detail = summary?.role_status?.trim() || "IELSco account";

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        aria-label={t("nav.openAccountMenu")} data-testid="account-menu-button"
        className={cn("flex h-[44px] w-[44px] items-center justify-center rounded-full", focusRing)}>
        <Avatar name={name} url={avatar} size={36} className="bg-[#304156] text-white" />
      </button>
      <BottomSheet open={open} onClose={close} title={t("nav.account")} returnFocusTo={opener} testId="account-sheet">
        <div className="mb-[8px] flex items-center gap-[12px] rounded-[16px] bg-[#F7F8FA] p-[12px]" data-testid="account-sheet-identity">
          <Avatar name={name} url={avatar} size={48} className="bg-[#304156] text-white" />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-[#1A2534]" title={fullName}>{fullName}</p>
            <p className="truncate text-[14px] text-[#2F4157]/60">{detail}</p>
          </div>
        </div>
        <ul>
          {MENU_LINKS.map(({ key, href, icon: Icon, id }) => (
            <li key={href}>
              <Link href={href} onClick={close} data-testid={`account-menu-${id}`} className={sheetRow}>
                <Icon size={22} strokeWidth={1.8} className="shrink-0 text-[#577E90]" aria-hidden="true" />{t(key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="my-[8px] h-[1px] bg-[#E3E7ED]" />
        <div className="flex min-h-[48px] items-center px-[12px]">
          <LanguageSelect testId="account-language-select" className="w-full gap-[14px] [&>svg]:h-[22px] [&>svg]:w-[22px] [&_select]:min-h-[44px] [&_select]:flex-1 [&_select]:text-[16px]" />
        </div>
        <div className="my-[8px] h-[1px] bg-[#E3E7ED]" />
        <button type="button" onClick={signOut} data-testid="account-menu-sign-out" className={cn(sheetRow, "font-semibold text-[#C04C4E]")}>
          <LogOut size={22} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />{t("nav.signOut")}
        </button>
      </BottomSheet>
    </>
  );
}
