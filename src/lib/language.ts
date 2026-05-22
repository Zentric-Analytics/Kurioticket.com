export const LANGUAGE_STORAGE_KEY =
  "ct_language";

export const LANGUAGE_CHANGE_EVENT =
  "curioticket-language-change";

export type LanguageDirection =
  | "ltr"
  | "rtl";

export type LanguageOption = {
  code: string;
  label: string;
  flagCode: string;
  dir: LanguageDirection;
  suggested: boolean;
};

export const languageOptions: LanguageOption[] =
  [
    {
      code: "en-US",
      label: "English (US)",
      flagCode: "US",
      dir: "ltr",
      suggested: true,
    },
    {
      code: "en-GB",
      label: "English (UK)",
      flagCode: "GB",
      dir: "ltr",
      suggested: true,
    },
    {
      code: "fr-FR",
      label: "Français",
      flagCode: "FR",
      dir: "ltr",
      suggested: true,
    },
    {
      code: "es-ES",
      label: "Español",
      flagCode: "ES",
      dir: "ltr",
      suggested: true,
    },
    {
      code: "de-DE",
      label: "Deutsch",
      flagCode: "DE",
      dir: "ltr",
      suggested: true,
    },
    {
      code: "it-IT",
      label: "Italiano",
      flagCode: "IT",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "pt-PT",
      label: "Português",
      flagCode: "PT",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "nl-NL",
      label: "Nederlands",
      flagCode: "NL",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "pl-PL",
      label: "Polski",
      flagCode: "PL",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "ar-SA",
      label: "العربية",
      flagCode: "SA",
      dir: "rtl",
      suggested: true,
    },
    {
      code: "tr-TR",
      label: "Türkçe",
      flagCode: "TR",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "zh-CN",
      label: "简体中文",
      flagCode: "CN",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "ja-JP",
      label: "日本語",
      flagCode: "JP",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "ko-KR",
      label: "한국어",
      flagCode: "KR",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "hi-IN",
      label: "हिन्दी",
      flagCode: "IN",
      dir: "ltr",
      suggested: false,
    },
    {
      code: "id-ID",
      label: "Bahasa Indonesia",
	  flagCode: "ID",
	  dir: "ltr",
	  suggested: false,
	},
	  