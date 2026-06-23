export type SupportedLocaleStatus = "available" | "preparing";
export type SupportedLocaleDirection = "ltr" | "rtl";

export type SupportedLocale = {
  /**
   * Internal normalized code used by the current client preference layer.
   * Keep lowercase so existing storage and dictionary fallbacks remain stable.
   */
  code: string;
  /** Canonical BCP 47 locale shown to customers. */
  locale: string;
  /** English product label. */
  label: string;
  /** Native display label shown in the selector. */
  nativeLabel: string;
  direction: SupportedLocaleDirection;
  status: SupportedLocaleStatus;
  countryCode: string;
  fallbackText: string;
  rtl?: boolean;
  translationStatus: "ready" | "partial";
};

const preparing = "preparing" as const;

export const supportedLocales: SupportedLocale[] = [
  {
    code: "en-us",
    locale: "en-US",
    label: "English (United States)",
    nativeLabel: "English (United States)",
    direction: "ltr",
    status: "available",
    countryCode: "US",
    fallbackText: "US",
    translationStatus: "ready",
  },
  {
    code: "es-es",
    locale: "es-ES",
    label: "Spanish",
    nativeLabel: "Español",
    direction: "ltr",
    status: "available",
    countryCode: "ES",
    fallbackText: "ES",
    translationStatus: "ready",
  },
  {
    code: "fr",
    locale: "fr",
    label: "French",
    nativeLabel: "Français",
    direction: "ltr",
    status: "available",
    countryCode: "FR",
    fallbackText: "FR",
    translationStatus: "partial",
  },
  {
    code: "de-de",
    locale: "de-DE",
    label: "German",
    nativeLabel: "Deutsch",
    direction: "ltr",
    status: "available",
    countryCode: "DE",
    fallbackText: "DE",
    translationStatus: "ready",
  },
  {
    code: "it-it",
    locale: "it-IT",
    label: "Italian",
    nativeLabel: "Italiano",
    direction: "ltr",
    status: "available",
    countryCode: "IT",
    fallbackText: "IT",
    translationStatus: "partial",
  },
  {
    code: "pt-br",
    locale: "pt-BR",
    label: "Português (Brasil)",
    nativeLabel: "Português",
    direction: "ltr",
    status: "available",
    countryCode: "BR",
    fallbackText: "BR",
    translationStatus: "partial",
  },
  {
    code: "nl",
    locale: "nl-NL",
    label: "Dutch",
    nativeLabel: "Nederlands",
    direction: "ltr",
    status: "available",
    countryCode: "NL",
    fallbackText: "NL",
    translationStatus: "partial",
  },
  {
    code: "ar",
    locale: "ar",
    label: "Arabic",
    nativeLabel: "العربية",
    direction: "rtl",
    status: "available",
    countryCode: "SA",
    fallbackText: "AR",
    rtl: true,
    translationStatus: "partial",
  },
  {
    code: "zh-cn",
    locale: "zh-CN",
    label: "Chinese (Simplified)",
    nativeLabel: "中文",
    direction: "ltr",
    status: preparing,
    countryCode: "CN",
    fallbackText: "CN",
    translationStatus: "partial",
  },
  {
    code: "ja-jp",
    locale: "ja-JP",
    label: "Japanese",
    nativeLabel: "日本語",
    direction: "ltr",
    status: preparing,
    countryCode: "JP",
    fallbackText: "JP",
    translationStatus: "partial",
  },
  {
    code: "ko-kr",
    locale: "ko-KR",
    label: "Korean",
    nativeLabel: "한국어",
    direction: "ltr",
    status: preparing,
    countryCode: "KR",
    fallbackText: "KR",
    translationStatus: "partial",
  },
  {
    code: "hi-in",
    locale: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    direction: "ltr",
    status: preparing,
    countryCode: "IN",
    fallbackText: "IN",
    translationStatus: "partial",
  },
  {
    code: "tr-tr",
    locale: "tr-TR",
    label: "Turkish",
    nativeLabel: "Türkçe",
    direction: "ltr",
    status: preparing,
    countryCode: "TR",
    fallbackText: "TR",
    translationStatus: "partial",
  },
  {
    code: "pl-pl",
    locale: "pl-PL",
    label: "Polish",
    nativeLabel: "Polski",
    direction: "ltr",
    status: preparing,
    countryCode: "PL",
    fallbackText: "PL",
    translationStatus: "partial",
  },
  {
    code: "sv-se",
    locale: "sv-SE",
    label: "Swedish",
    nativeLabel: "Svenska",
    direction: "ltr",
    status: preparing,
    countryCode: "SE",
    fallbackText: "SE",
    translationStatus: "partial",
  },
  {
    code: "id-id",
    locale: "id-ID",
    label: "Indonesian",
    nativeLabel: "Bahasa Indonesia",
    direction: "ltr",
    status: preparing,
    countryCode: "ID",
    fallbackText: "ID",
    translationStatus: "partial",
  },
  {
    code: "th-th",
    locale: "th-TH",
    label: "Thai",
    nativeLabel: "ไทย",
    direction: "ltr",
    status: preparing,
    countryCode: "TH",
    fallbackText: "TH",
    translationStatus: "partial",
  },
  {
    code: "vi-vn",
    locale: "vi-VN",
    label: "Vietnamese",
    nativeLabel: "Tiếng Việt",
    direction: "ltr",
    status: preparing,
    countryCode: "VN",
    fallbackText: "VN",
    translationStatus: "partial",
  },
];
