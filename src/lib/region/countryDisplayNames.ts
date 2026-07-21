import { supportedLocales } from "@/lib/supportedLocales";

const DEFAULT_LOCALE = "en-US";

const localeByCode = new Map(
  supportedLocales.map((locale) => [locale.code, locale.locale]),
);

const displayNamesByLocale = new Map<string, Intl.DisplayNames>();

const regionDisplayNameOverrides: Record<string, Record<string, string>> = {
  "en-US": { EU: "European Union" },
  ar: { EU: "الاتحاد الأوروبي" },
  "nl-NL": { EU: "Europese Unie" },
  "es-ES": { EU: "Unión Europea" },
  fr: { EU: "Union européenne" },
  "de-DE": { EU: "Europäische Union" },
  "it-IT": { EU: "Unione europea" },
  "pt-BR": { EU: "União Europeia" },
  "zh-CN": { EU: "欧盟" },
};

export function getCanonicalDisplayLocale(locale?: string | null) {
  if (!locale) return DEFAULT_LOCALE;

  const normalizedLocale = locale.trim().toLowerCase();
  return localeByCode.get(normalizedLocale) ?? locale;
}

export function getCountryDisplayNameForLocale(
  countryCode: string,
  locale?: string | null,
  fallbackName?: string,
) {
  const normalizedCode = countryCode.trim().toUpperCase();
  const displayLocale = getCanonicalDisplayLocale(locale);
  const localeOverrides = regionDisplayNameOverrides[displayLocale];
  const override = localeOverrides?.[normalizedCode];

  if (override) return override;

  try {
    let displayNames = displayNamesByLocale.get(displayLocale);

    if (!displayNames) {
      displayNames = new Intl.DisplayNames([displayLocale], { type: "region" });
      displayNamesByLocale.set(displayLocale, displayNames);
    }

    return displayNames.of(normalizedCode) ?? fallbackName ?? normalizedCode;
  } catch {
    return fallbackName ?? normalizedCode;
  }
}
