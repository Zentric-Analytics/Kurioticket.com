"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getTranslations,
  localeOptions,
  type LocaleCode,
} from "@/lib/i18n";
import { LANGUAGE_STORAGE_KEY, normalizeLanguage } from "@/lib/language";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: ReturnType<typeof getTranslations>;
  locales: typeof localeOptions;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const DEFAULT_LOCALE: LocaleCode = "en-us";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    const local = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const cookie = document.cookie.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${LANGUAGE_STORAGE_KEY}=`))?.split("=")[1];
    const saved = normalizeLanguage(local || cookie);
    if (localeOptions.some((item) => item.code === saved)) return saved as LocaleCode;
    return DEFAULT_LOCALE;
  });

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    document.cookie = `${LANGUAGE_STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: getTranslations(locale),
      locales: localeOptions,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
