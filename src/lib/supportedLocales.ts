export type SupportedLocale = {
  code: string;
  label: string;
  rtl?: boolean;
  countryCode: string;
  fallbackText: string;
  translationStatus: "ready" | "partial";
};

export const supportedLocales: SupportedLocale[] = [
  { code: "en-us", label: "English (US)", countryCode: "US", fallbackText: "US", translationStatus: "ready" },
  { code: "en-gb", label: "English (UK)", countryCode: "GB", fallbackText: "GB", translationStatus: "ready" },
  { code: "de", label: "Deutsch", countryCode: "DE", fallbackText: "DE", translationStatus: "partial" },
  { code: "fr-fr", label: "Français", countryCode: "FR", fallbackText: "FR", translationStatus: "partial" },
  { code: "es-es", label: "Español", countryCode: "ES", fallbackText: "ES", translationStatus: "partial" },
  { code: "it", label: "Italiano", countryCode: "IT", fallbackText: "IT", translationStatus: "partial" },
  { code: "nl", label: "Nederlands", countryCode: "NL", fallbackText: "NL", translationStatus: "partial" },
  { code: "pt-pt", label: "Português (Portugal)", countryCode: "PT", fallbackText: "PT", translationStatus: "partial" },
  { code: "pt-br", label: "Português (Brasil)", countryCode: "BR", fallbackText: "BR", translationStatus: "partial" },
  { code: "pl", label: "Polski", countryCode: "PL", fallbackText: "PL", translationStatus: "partial" },
  { code: "ru", label: "Русский", countryCode: "RU", fallbackText: "RU", translationStatus: "partial" },
  { code: "uk", label: "Українська", countryCode: "UA", fallbackText: "UA", translationStatus: "partial" },
  { code: "tr", label: "Türkçe", countryCode: "TR", fallbackText: "TR", translationStatus: "partial" },
  { code: "ar-sa", label: "العربية", rtl: true, countryCode: "SA", fallbackText: "SA", translationStatus: "partial" },
  { code: "he", label: "עברית", rtl: true, countryCode: "IL", fallbackText: "IL", translationStatus: "partial" },
  { code: "zh-cn", label: "简体中文", countryCode: "CN", fallbackText: "CN", translationStatus: "partial" },
  { code: "zh-tw", label: "繁體中文", countryCode: "TW", fallbackText: "TW", translationStatus: "partial" },
  { code: "ja", label: "日本語", countryCode: "JP", fallbackText: "JP", translationStatus: "partial" },
  { code: "ko", label: "한국어", countryCode: "KR", fallbackText: "KR", translationStatus: "partial" },
  { code: "hi", label: "हिन्दी", countryCode: "IN", fallbackText: "IN", translationStatus: "partial" },
  { code: "id", label: "Bahasa Indonesia", countryCode: "ID", fallbackText: "ID", translationStatus: "partial" },
  { code: "ms", label: "Bahasa Melayu", countryCode: "MY", fallbackText: "MY", translationStatus: "partial" },
  { code: "th", label: "ไทย", countryCode: "TH", fallbackText: "TH", translationStatus: "partial" },
  { code: "vi", label: "Tiếng Việt", countryCode: "VN", fallbackText: "VN", translationStatus: "partial" },
  { code: "cs", label: "Čeština", countryCode: "CZ", fallbackText: "CZ", translationStatus: "partial" },
  { code: "da", label: "Dansk", countryCode: "DK", fallbackText: "DK", translationStatus: "partial" },
  { code: "fi", label: "Suomi", countryCode: "FI", fallbackText: "FI", translationStatus: "partial" },
  { code: "el", label: "Ελληνικά", countryCode: "GR", fallbackText: "GR", translationStatus: "partial" },
  { code: "hu", label: "Magyar", countryCode: "HU", fallbackText: "HU", translationStatus: "partial" },
  { code: "no", label: "Norsk", countryCode: "NO", fallbackText: "NO", translationStatus: "partial" },
  { code: "ro", label: "Română", countryCode: "RO", fallbackText: "RO", translationStatus: "partial" },
  { code: "sk", label: "Slovenčina", countryCode: "SK", fallbackText: "SK", translationStatus: "partial" },
  { code: "sv", label: "Svenska", countryCode: "SE", fallbackText: "SE", translationStatus: "partial" },
  { code: "bg", label: "Български", countryCode: "BG", fallbackText: "BG", translationStatus: "partial" },
  { code: "hr", label: "Hrvatski", countryCode: "HR", fallbackText: "HR", translationStatus: "partial" },
  { code: "lt", label: "Lietuvių", countryCode: "LT", fallbackText: "LT", translationStatus: "partial" },
  { code: "lv", label: "Latviešu", countryCode: "LV", fallbackText: "LV", translationStatus: "partial" },
  { code: "et", label: "Eesti", countryCode: "EE", fallbackText: "EE", translationStatus: "partial" },
  { code: "sl", label: "Slovenščina", countryCode: "SI", fallbackText: "SI", translationStatus: "partial" },
  { code: "sr", label: "Srpski", countryCode: "RS", fallbackText: "RS", translationStatus: "partial" },
];
