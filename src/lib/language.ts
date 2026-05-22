export const LANGUAGE_STORAGE_KEY = "ct_language";
export const LANGUAGE_CHANGE_EVENT = "curioticket-language-change";

export type LanguageDirection = "ltr" | "rtl";

export type LanguageOption = {
  code: string;
  label: string;
  flagCode: string;
  dir: LanguageDirection;
  suggested: boolean;
};

export const languageOptions: LanguageOption[] = [
  { code: "en-US", label: "English (US)", flagCode: "US", dir: "ltr", suggested: true },
  { code: "en-GB", label: "English (UK)", flagCode: "GB", dir: "ltr", suggested: true },
  { code: "fr-FR", label: "Français", flagCode: "FR", dir: "ltr", suggested: true },
  { code: "es-ES", label: "Español", flagCode: "ES", dir: "ltr", suggested: true },
  { code: "de-DE", label: "Deutsch", flagCode: "DE", dir: "ltr", suggested: true },
  { code: "it-IT", label: "Italiano", flagCode: "IT", dir: "ltr", suggested: false },
  { code: "pt-PT", label: "Português", flagCode: "PT", dir: "ltr", suggested: false },
  { code: "nl-NL", label: "Nederlands", flagCode: "NL", dir: "ltr", suggested: false },
  { code: "pl-PL", label: "Polski", flagCode: "PL", dir: "ltr", suggested: false },
  { code: "ar-SA", label: "العربية", flagCode: "SA", dir: "rtl", suggested: true },
  { code: "tr-TR", label: "Türkçe", flagCode: "TR", dir: "ltr", suggested: false },
  { code: "zh-CN", label: "简体中文", flagCode: "CN", dir: "ltr", suggested: false },
  { code: "ja-JP", label: "日本語", flagCode: "JP", dir: "ltr", suggested: false },
  { code: "ko-KR", label: "한국어", flagCode: "KR", dir: "ltr", suggested: false },
  { code: "hi-IN", label: "हिन्दी", flagCode: "IN", dir: "ltr", suggested: false },
  { code: "id-ID", label: "Bahasa Indonesia", flagCode: "ID", dir: "ltr", suggested: false },
  { code: "ru-RU", label: "Русский", flagCode: "RU", dir: "ltr", suggested: false },
];

export type LanguageCode = (typeof languageOptions)[number]["code"];

export function getFlagEmoji(flagCode: string) {
  return flagCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getDefaultLanguage(): LanguageCode {
  return "en-US";
}

export function getLanguageOption(code?: string | null) {
  if (!code) return undefined;

  return languageOptions.find((option) => option.code === code);
}

export function getLanguageFromStorage(): LanguageCode {
  if (typeof window === "undefined") return getDefaultLanguage();

  const value = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const option = getLanguageOption(value);

  return option ? option.code : getDefaultLanguage();
}

export function applyLanguageToDocument(code: LanguageCode) {
  if (typeof document === "undefined") return;

  const option = getLanguageOption(code) || getLanguageOption(getDefaultLanguage());
  if (!option) return;

  document.documentElement.lang = option.code;
  document.documentElement.dir = option.dir;
}

export function setLanguageInStorage(code: LanguageCode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  applyLanguageToDocument(code);

  window.dispatchEvent(
    new CustomEvent(LANGUAGE_CHANGE_EVENT, {
      detail: { code },
    })
  );
}

export function getSuggestedLanguages() {
  return languageOptions.filter((option) => option.suggested);
}

export function getTranslationLanguage(code: LanguageCode) {
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("es")) return "es";
  if (code.startsWith("ar")) return "ar";
  return "en";
}
