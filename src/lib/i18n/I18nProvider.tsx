"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { en } from "./messages/en";
import { id } from "./messages/id";
import { DEFAULT_LOCALE, isSupportedLocale, type Locale } from "./locales";

const MESSAGES: Partial<Record<Locale, unknown>> = { en, id };
const STORAGE_KEY = "iels_locale";

function lookup(obj: unknown, key: string): string | undefined {
  const v = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
  return typeof v === "string" ? v : undefined;
}

// Translate with English fallback. Unknown keys log once in dev and return the English text or "".
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>) {
  const raw = lookup(MESSAGES[locale], key) ?? lookup(en, key);
  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") console.warn(`[i18n] Missing key: ${key}`);
    return "";
  }
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : raw;
}

interface I18nApi {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nApi>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
});

export const useI18n = () => useContext(I18nContext);

// Visitors: localStorage + cookie. Members: also Supabase auth user_metadata.interface_language
// (existing auth infrastructure, no schema change) so the choice follows them across devices.
// No preference → browser language if supported, else English. Never inferred from country.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const browser = navigator.language?.slice(0, 2);
    if (isSupportedLocale(stored)) setLocaleState(stored);
    else if (isSupportedLocale(browser)) setLocaleState(browser);

    const apply = (meta: Record<string, unknown> | undefined) => {
      const pref = meta?.interface_language;
      if (isSupportedLocale(pref)) {
        setLocaleState(pref);
        window.localStorage.setItem(STORAGE_KEY, pref);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.user_metadata));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") apply(session?.user.user_metadata);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
      supabase.auth.getSession().then(async ({ data }) => {
        if (!data.session) return;
        const { error } = await supabase.auth.updateUser({ data: { interface_language: next } });
        if (error) console.error("[i18n] Could not save language to your account:", error.message);
      });
    },
    [supabase]
  );

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}
