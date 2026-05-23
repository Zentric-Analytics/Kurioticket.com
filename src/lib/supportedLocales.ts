export type SupportedLocale = {
  code: string;
  label: string;
  rtl?: boolean;
  countryCode: string;
  fallbackText: string;
};

export const supportedLocales: SupportedLocale[] = [
  { code: "en-us", label: "English (US)", countryCode: "US", fallbackText: "US" },
  { code: "en-gb", label: "English (UK)", countryCode: "GB", fallbackText: "GB" },
  { code: "de", label: "Deutsch", countryCode: "DE", fallbackText: "DE" },
  { code: "fr-fr", label: "Français", countryCode: "FR", fallbackText: "FR" },
  { code: "es-es", label: "Español", countryCode: "ES", fallbackText: "ES" },
  { code: "it", label: "Italiano", countryCode: "IT", fallbackText: "IT" },
  { code: "nl", label: "Nederlands", countryCode: "NL", fallbackText: "NL" },
  { code: "pt-pt", label: "Português (Portugal)", countryCode: "PT", fallbackText: "PT" },
  { code: "pt-br", label: "Português (Brasil)", countryCode: "BR", fallbackText: "BR" },
  { code: "pl", label: "Polski", countryCode: "PL", fallbackText: "PL" },
  { code: "ru", label: "Русский", countryCode: "RU", fallbackText: "RU" },
  { code: "uk", label: "Українська", countryCode: "UA", fallbackText: "UA" },
  { code: "tr", label: "Türkçe", countryCode: "TR", fallbackText: "TR" },
  { code: "ar-sa", label: "العربية", rtl: true, countryCode: "SA", fallbackText: "SA" },
  { code: "he", label: "עברית", rtl: true, countryCode: "IL", fallbackText: "IL" },
  { code: "zh-cn", label: "简体中文", countryCode: "CN", fallbackText: "CN" },
  { code: "zh-tw", label: "繁體中文", countryCode: "TW", fallbackText: "TW" },
  { code: "ja", label: "日本語", countryCode: "JP", fallbackText: "JP" },
  { code: "ko", label: "한국어", countryCode: "KR", fallbackText: "KR" },
  { code: "hi", label: "हिन्दी", countryCode: "IN", fallbackText: "IN" },
  { code: "id", label: "Bahasa Indonesia", countryCode: "ID", fallbackText: "ID" },
  { code: "ms", label: "Bahasa Melayu", countryCode: "MY", fallbackText: "MY" },
  { code: "th", label: "ไทย", countryCode: "TH", fallbackText: "TH" },
  { code: "vi", label: "Tiếng Việt", countryCode: "VN", fallbackText: "VN" },
  { code: "cs", label: "Čeština", countryCode: "CZ", fallbackText: "CZ" },
  { code: "da", label: "Dansk", countryCode: "DK", fallbackText: "DK" },
  { code: "fi", label: "Suomi", countryCode: "FI", fallbackText: "FI" },
  { code: "el", label: "Ελληνικά", countryCode: "GR", fallbackText: "GR" },
  { code: "hu", label: "Magyar", countryCode: "HU", fallbackText: "HU" },
  { code: "no", label: "Norsk", countryCode: "NO", fallbackText: "NO" },
  { code: "ro", label: "Română", countryCode: "RO", fallbackText: "RO" },
  { code: "sk", label: "Slovenčina", countryCode: "SK", fallbackText: "SK" },
  { code: "sv", label: "Svenska", countryCode: "SE", fallbackText: "SE" },
  { code: "bg", label: "Български", countryCode: "BG", fallbackText: "BG" },
  { code: "hr", label: "Hrvatski", countryCode: "HR", fallbackText: "HR" },
  { code: "lt", label: "Lietuvių", countryCode: "LT", fallbackText: "LT" },
  { code: "lv", label: "Latviešu", countryCode: "LV", fallbackText: "LV" },
  { code: "et", label: "Eesti", countryCode: "EE", fallbackText: "EE" },
  { code: "sl", label: "Slovenščina", countryCode: "SI", fallbackText: "SI" },
  { code: "sr", label: "Srpski", countryCode: "RS", fallbackText: "RS" },
];
