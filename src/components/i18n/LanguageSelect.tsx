"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

// Native <select>: accessible, compact, works on every device. Language names in their own script, no flags.
export function LanguageSelect({ className, tone = "light", testId = "language-select" }: { className?: string; tone?: "light" | "dark"; testId?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className={cn("relative inline-flex items-center gap-2", className)}>
      <Languages size={16} aria-hidden="true" className={tone === "dark" ? "text-white/80" : "text-[#577E90]"} />
      <span className="sr-only">{t("common.language")}</span>
      <select
        data-testid={testId}
        value={locale}
        title={t("common.languageHint")}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={cn(
          "cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pr-2 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90]",
          tone === "dark" ? "text-white [&>option]:text-[#304156]" : "text-[#304156]"
        )}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} disabled={l.status !== "full"}>
            {l.label}{l.status !== "full" ? ` (${t("common.comingSoon")})` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
