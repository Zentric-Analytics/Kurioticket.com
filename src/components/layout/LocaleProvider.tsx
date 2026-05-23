"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getTranslations, localeOptions, type LocaleCode } from "@/lib/i18n";
import {
  getStoredLocale,
  setStoredLocale,
} from "@/lib/preferences/preferences";

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
    const saved = getStoredLocale();
    if (localeOptions.some((item) => item.code === saved)) {
      return saved as LocaleCode;
    }
    return DEFAULT_LOCALE;
  });

  const setLocale = (next: LocaleCode) => {
    setLocaleState(next);
    setStoredLocale(next);
  };

  useEffect(() => {
    setStoredLocale(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" || locale === "he" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[preferences]", { locale, source: "cookie/localStorage/default" });
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: getTranslations(locale),
      locales: localeOptions,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside LocaleProvider");
  return context;
}
