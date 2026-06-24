import { getTranslations, localeOptions } from "@/lib/i18n";

export const LANGUAGE_STORAGE_KEY = "ct_language";
export const LANGUAGE_CHANGE_EVENT = "kurioticket-language-change";

export type LanguageDirection = "ltr" | "rtl";
export type LanguageStatus = "available" | "preparing";
export type LanguageCode = string;

export type LanguageOption = {
  code: string;
  locale: string;
  label: string;
  nativeLabel: string;
  localizedLabels?: Partial<Record<string, string>>;
  direction: LanguageDirection;
  status: LanguageStatus;
  dir: LanguageDirection;
  countryCode: string;
  fallbackText: string;
};

export const languageOptions: LanguageOption[] = localeOptions.map((item) => ({
  code: item.code,
  locale: item.locale,
  label: item.label,
  nativeLabel: item.nativeLabel,
  localizedLabels: item.localizedLabels,
  direction: item.direction,
  status: item.status,
  dir: item.direction,
  countryCode: item.countryCode,
  fallbackText: item.fallbackText,
}));

export const availableLanguageOptions = languageOptions.filter(
  (option) => option.status === "available",
);

export function getDefaultLanguage(): LanguageCode {
  return "en-us";
}

export function isAvailableLanguage(value?: string | null): boolean {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return availableLanguageOptions.some(
    (option) =>
      option.code === normalized || option.locale.toLowerCase() === normalized,
  );
}

export function findLanguageOption(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return languageOptions.find(
    (option) =>
      option.code === normalized || option.locale.toLowerCase() === normalized,
  );
}

export function normalizeLanguage(value?: string | null): LanguageCode {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  const exactAvailableMatch = availableLanguageOptions.find(
    (option) =>
      option.code === normalized || option.locale.toLowerCase() === normalized,
  );

  if (exactAvailableMatch) {
    return exactAvailableMatch.code;
  }

  if (normalized === "en") return "en-us";
  if (normalized === "es") return "es-es";
  if (normalized === "de") return "de-de";
  if (normalized === "it") return "it-it";
  if (normalized === "pt") return "pt-br";
  if (normalized === "zh") return "zh-cn";
  if (normalized === "ja-jp") return "ja";
  if (["ar-sa", "ar-ae", "ar-eg"].includes(normalized)) return "ar";

  return getDefaultLanguage();
}

export function getLanguageOption(code?: string | null) {
  return (
    findLanguageOption(code) ?? findLanguageOption(normalizeLanguage(code))
  );
}

export function getLanguageFromStorage(): LanguageCode {
  if (typeof window === "undefined") return getDefaultLanguage();
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function getUiTranslations(code: LanguageCode) {
  return getTranslations(normalizeLanguage(code));
}

export function applyLanguageToDocument(code: LanguageCode) {
  if (typeof document === "undefined") return;

  const normalized = normalizeLanguage(code);
  const option = getLanguageOption(normalized);

  document.documentElement.lang = option?.locale ?? "en-US";
  document.documentElement.dir = option?.direction ?? "ltr";
}

export function setLanguageInStorage(code: LanguageCode) {
  if (typeof window === "undefined") return;

  const normalized = normalizeLanguage(code);

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  applyLanguageToDocument(normalized);
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: { code: normalized } }),
  );
}

export function getSuggestedLanguages() {
  return languageOptions.slice(0, 12);
}
