import { localeOptions, getTranslations, type LocaleCode } from "@/lib/i18n";

export const LANGUAGE_STORAGE_KEY = "ct_language";
export const LANGUAGE_CHANGE_EVENT = "kurioticket-language-change";

export type LanguageDirection = "ltr" | "rtl";

export type LanguageOption = {
  code: string;
  label: string;
  dir: LanguageDirection;
  countryCode: string;
  fallbackText: string;
};

export const languageOptions: LanguageOption[] = localeOptions.map((item) => ({
  code: item.code,
  label: item.label,
  dir: item.rtl ? "rtl" : "ltr",
  countryCode: item.countryCode,
  fallbackText: item.fallbackText,
}));

export type LanguageCode = LocaleCode;

export function getDefaultLanguage(): LanguageCode {
  return "en-us";
}

export function normalizeLanguage(value?: string | null): LanguageCode {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (languageOptions.some((option) => option.code === normalized)) {
    return normalized as LanguageCode;
  }
  if (normalized === "en") return "en-us";
  if (normalized === "en-uk") return "en-gb";
  if (normalized === "fr") return "fr-fr";
  if (normalized === "es") return "es-es";
  if (normalized === "ar") return "ar-sa";
  if (normalized === "pt") return "pt-pt";
  if (normalized === "zh") return "zh-cn";
  return getDefaultLanguage();
}

export function getLanguageOption(code?: string | null) {
  return languageOptions.find((option) => option.code === normalizeLanguage(code));
}

export function getLanguageFromStorage(): LanguageCode {
  if (typeof window === "undefined") return getDefaultLanguage();
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function getUiTranslations(code: LanguageCode) {
  return getTranslations(code);
}

export function applyLanguageToDocument(code: LanguageCode) {
  if (typeof document === "undefined") return;
  const option = getLanguageOption(code);
  document.documentElement.lang = code;
  document.documentElement.dir = option?.dir ?? "ltr";
}

export function setLanguageInStorage(code: LanguageCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  applyLanguageToDocument(code);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { code } }));
}

export function getSuggestedLanguages() {
  return languageOptions.slice(0, 12);
}
