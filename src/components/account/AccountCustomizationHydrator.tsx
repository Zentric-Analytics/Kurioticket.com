"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { normalizeLanguage } from "@/lib/language";

type AccountCustomizationPreferencesResponse = {
  hasPreferences?: boolean;
  preferences?: {
    locale?: unknown;
    currency?: unknown;
    region?: unknown;
  };
};

const customizationPreferencesPathname = "/dashboard/preferences/customization";

export function AccountCustomizationHydrator() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { locale, setLocale, locales } = useLocale();
  const {
    mode,
    setMode,
    selectedCurrency,
    setCurrency,
    options: regionOptions,
    currencies,
  } = useRegion();
  const hydratedSessionKeyRef = useRef<string | null>(null);

  const supportedLocaleCodes = useMemo(
    () =>
      new Set(
        locales
          .filter((option) => option.status === "available")
          .map((option) => option.code),
      ),
    [locales],
  );
  const supportedRegionCodes = useMemo(
    () => new Set(regionOptions.map((option) => option.code)),
    [regionOptions],
  );
  const supportedCurrencyCodes = useMemo(
    () => new Set(currencies.map((option) => option.code)),
    [currencies],
  );

  useEffect(() => {
    if (status !== "authenticated") {
      hydratedSessionKeyRef.current = null;
      return;
    }

    if (pathname === customizationPreferencesPathname) {
      return;
    }

    const user = session?.user as { id?: string | null; email?: string | null } | undefined;
    const sessionKey = user?.id || user?.email || "authenticated";

    if (hydratedSessionKeyRef.current === sessionKey) {
      return;
    }

    let active = true;

    async function hydrateCustomizationPreferences() {
      try {
        const response = await fetch("/api/account/customization-preferences", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!active) return;

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          hydratedSessionKeyRef.current = sessionKey;
          return;
        }

        const data = (await response.json()) as AccountCustomizationPreferencesResponse;

        if (!active) return;

        if (data.hasPreferences !== true || !data.preferences) {
          hydratedSessionKeyRef.current = sessionKey;
          return;
        }

        const nextLocale = normalizeLocalePreference(
          data.preferences.locale,
          supportedLocaleCodes,
        );
        const nextCurrency = normalizeCurrencyPreference(
          data.preferences.currency,
          supportedCurrencyCodes,
        );
        const nextRegion = normalizeRegionPreference(
          data.preferences.region,
          supportedRegionCodes,
        );

        if (nextLocale && nextLocale !== locale) {
          setLocale(nextLocale);
        }

        if (nextCurrency && nextCurrency !== selectedCurrency) {
          setCurrency(nextCurrency);
        }

        if (nextRegion && nextRegion !== mode) {
          setMode(nextRegion);
        }

        hydratedSessionKeyRef.current = sessionKey;
      } catch {
        if (!active) return;
        hydratedSessionKeyRef.current = sessionKey;
      }
    }

    void hydrateCustomizationPreferences();

    return () => {
      active = false;
    };
  }, [
    status,
    pathname,
    session?.user,
    locale,
    setLocale,
    selectedCurrency,
    setCurrency,
    mode,
    setMode,
    supportedLocaleCodes,
    supportedCurrencyCodes,
    supportedRegionCodes,
  ]);

  return null;
}

function normalizeLocalePreference(value: unknown, supportedLocaleCodes: Set<string>) {
  if (typeof value !== "string") return null;

  const normalized = normalizeLanguage(value);

  return supportedLocaleCodes.has(normalized) ? normalized : null;
}

function normalizeCurrencyPreference(value: unknown, supportedCurrencyCodes: Set<string>) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  return supportedCurrencyCodes.has(normalized) ? normalized : null;
}

function normalizeRegionPreference(value: unknown, supportedRegionCodes: Set<string>) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  return supportedRegionCodes.has(normalized) ? normalized : null;
}
