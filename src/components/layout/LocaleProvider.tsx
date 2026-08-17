"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getTranslations,
  localeOptions,
  publicLocaleOptions,
} from "@/lib/i18n";

import {
  getStoredLocaleForMigration,
  setStoredLocale,
} from "@/lib/preferences/preferences";
import { canHydrateLocaleFromAccount } from "@/lib/preferences/localePreference";
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
  const selectionSourceRef = useRef<"default" | "manual" | "account">(
    initialLocaleIsExplicit && isPublicLocale(initialLocale)
      ? "manual"
      : "default",
  );
  const storageMigrationCompleteRef = useRef(initialLocaleIsExplicit);
  const [storageMigrationComplete, setStorageMigrationComplete] = useState(
    initialLocaleIsExplicit,
  );

  const setLocale = useCallback((nextLocale: string) => {
    const normalized = normalizeLanguage(nextLocale);

    if (!isPublicLocale(normalized)) {
      return false;
    }

    setLocaleState(normalized);
    selectionSourceRef.current = "manual";
    setStoredLocale(normalized);
    return true;
  }, []);

  const setLocaleFromAccount = useCallback((nextLocale: string) => {
    const normalized = normalizeLanguage(nextLocale);

    if (
      !canHydrateLocaleFromAccount(
        selectionSourceRef.current,
        storageMigrationCompleteRef.current,
      ) ||
      !isPublicLocale(normalized)
    )
      return false;

    setLocaleState(normalized);
    selectionSourceRef.current = "account";
    setStoredLocale(normalized);
    return true;
  }, []);

  useEffect(() => {
    if (storageMigrationCompleteRef.current) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      const storedLocale = getStoredLocaleForMigration();
      if (storedLocale && isPublicLocale(storedLocale)) {
        selectionSourceRef.current = "manual";
        setLocaleState(storedLocale);
        setStoredLocale(storedLocale);
      }

      storageMigrationCompleteRef.current = true;
      setStorageMigrationComplete(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageMigrationComplete) return;

    setStoredLocale(locale);

    document.documentElement.lang = getDocumentLanguage(locale);

    document.documentElement.dir = getTextDirection(locale);
  }, [locale, storageMigrationComplete]);

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
