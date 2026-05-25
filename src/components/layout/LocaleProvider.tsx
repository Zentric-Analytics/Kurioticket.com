"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getTranslations,
  localeOptions,
  publicLocaleOptions,
  type LocaleCode,
} from "@/lib/i18n";

import {
  getStoredLocale,
  setStoredLocale,
} from "@/lib/preferences/preferences";
import { normalizeLanguage } from "@/lib/language";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: ReturnType<typeof getTranslations>;
  locales: typeof publicLocaleOptions;
};

const LocaleContext =
  createContext<LocaleContextValue | null>(null);

const DEFAULT_LOCALE: LocaleCode =
  "en-us";

function isSupportedLocale(
  value: string | null | undefined
): value is LocaleCode {
  return Boolean(
    value &&
      localeOptions.some(
        (option) =>
          option.code === value
      )
  );
}


function getTextDirection(
  locale: LocaleCode
) {
  return locale.startsWith("ar") ||
    locale.startsWith("he")
    ? "rtl"
    : "ltr";
}

export function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<LocaleCode>(() => {
    const savedLocale =
        getStoredLocale();

      return isSupportedLocale(savedLocale) && isPublicLocale(savedLocale)
        ? savedLocale
        : DEFAULT_LOCALE;
    });

  const setLocale = (
    nextLocale: LocaleCode
  ) => {
    const normalized =
      normalizeLanguage(nextLocale) as LocaleCode;

    if (!isPublicLocale(normalized)) {
      setLocaleState(DEFAULT_LOCALE);
      setStoredLocale(DEFAULT_LOCALE);
      return;
    }

    setLocaleState(normalized);
    setStoredLocale(normalized);
  };

  useEffect(() => {
    setStoredLocale(locale);

    document.documentElement.lang =
      locale;

    document.documentElement.dir =
      getTextDirection(locale);
  }, [locale]);

  useEffect(() => {
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.info(
        "[preferences]",
        {
          locale,
          source:
            "cookie/localStorage/default",
        }
      );
    }
  }, [locale]);

  const value =
    useMemo<LocaleContextValue>(
      () => ({
        locale,
        setLocale,
        t: getTranslations(locale),
        locales: publicLocaleOptions,
      }),
      [locale]
    );

  return (
    <LocaleContext.Provider
      value={value}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context =
    useContext(LocaleContext);

  if (!context) {
    throw new Error(
      "useLocale must be used inside LocaleProvider"
    );
  }

  return context;
}

function isPublicLocale(
  value: string | null | undefined
): value is LocaleCode {
  return Boolean(
    value &&
      publicLocaleOptions.some(
        (option) =>
          option.code === value
      )
  );
}
