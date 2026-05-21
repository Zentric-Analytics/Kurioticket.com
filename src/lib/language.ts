export const languageOptions = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "French", flag: "🇫🇷" },
  { code: "es", label: "Spanish", flag: "🇪🇸" },
  { code: "ar", label: "Arabic", flag: "🇸🇦" },
] as const;

export type LanguageCode = (typeof languageOptions)[number]["code"];
export const languageStorageKey = "curioticket-language";

export function getLanguageFromStorage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  const value = window.localStorage.getItem(languageStorageKey) as LanguageCode | null;
  return languageOptions.some((option) => option.code === value) ? (value as LanguageCode) : "en";
}

export function setLanguageInStorage(code: LanguageCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(languageStorageKey, code);
  window.dispatchEvent(new CustomEvent("curioticket-language-change", { detail: code }));
}
