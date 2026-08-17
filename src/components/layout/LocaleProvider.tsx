"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getTranslations,
  localeOptions,
  publicLocaleOptions,
} from "@/lib/i18n";

import { setStoredLocale } from "@/lib/preferences/preferences";
import {
  findLanguageOption,
  isAvailableLanguage,
  normalizeLanguage,
  type LanguageCode,
} from "@/lib/language";

type LocaleContextValue = {
  locale: LanguageCode;
  setLocale: (locale: string) => boolean;
  setLocaleFromAccount: (locale: string) => boolean;
  t: ReturnType<typeof getTranslations>;
  locales: typeof localeOptions;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const DEFAULT_LOCALE: LanguageCode = "en-us";

function getTextDirection(locale: LanguageCode) {
  return findLanguageOption(locale)?.direction ?? "ltr";
}

function getDocumentLanguage(locale: LanguageCode) {
  return findLanguageOption(locale)?.locale ?? "en-US";
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  initialLocaleIsExplicit = false,
}: {
  children: React.ReactNode;
  initialLocale?: string;
  initialLocaleIsExplicit?: boolean;
}) {
  const [locale, setLocaleState] = useState<LanguageCode>(() =>
    isPublicLocale(initialLocale)
      ? normalizeLanguage(initialLocale)
      : DEFAULT_LOCALE,
  );
  const [selectionSource, setSelectionSource] = useState<
    "default" | "manual" | "account"
  >(() =>
    initialLocaleIsExplicit && isPublicLocale(initialLocale)
      ? "manual"
      : "default",
  );

  const setLocale = useCallback((nextLocale: string) => {
    const normalized = normalizeLanguage(nextLocale);

    if (!isPublicLocale(normalized)) {
      return false;
    }

    setLocaleState(normalized);
    setSelectionSource("manual");
    setStoredLocale(normalized);
    return true;
  }, []);

  const setLocaleFromAccount = useCallback(
    (nextLocale: string) => {
      const normalized = normalizeLanguage(nextLocale);

      if (selectionSource !== "default" || !isPublicLocale(normalized))
        return false;

      setLocaleState(normalized);
      setSelectionSource("account");
      setStoredLocale(normalized);
      return true;
    },
    [selectionSource],
  );

  useEffect(() => {
    setStoredLocale(locale);

    document.documentElement.lang = getDocumentLanguage(locale);

    document.documentElement.dir = getTextDirection(locale);
  }, [locale]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[preferences]", {
        locale,
        source: "manual-selection/localStorage/default",
      });
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      setLocaleFromAccount,
      t: getTranslations(locale),
      locales: localeOptions,
    }),
    [locale, setLocale, setLocaleFromAccount],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}

function isPublicLocale(
  value: string | null | undefined,
): value is LanguageCode {
  return Boolean(
    value &&
    isAvailableLanguage(value) &&
    publicLocaleOptions.some(
      (option) => option.code === normalizeLanguage(value),
    ),
  );
}
