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
  type LocaleCode,
} from "@/lib/i18n";

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

function isSupportedLocale(
  value: string | null | undefined
): value is LocaleCode {
  return Boolean(
    value &&
      localeOptions.some((option) => option.code === value)
  );
}

export function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LOCALE;
    }

    const savedLocale = getStoredLocale();

    if (isSupportedLocale(savedLocale)) {
      return savedLocale;
    }

    return DEFAULT_LO