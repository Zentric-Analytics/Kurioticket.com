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
    {
      code: "ru-RU",
      label: "Русский",
      flagCode: "RU",
      dir: "ltr",
      suggested: false,
    },
  ];

export type LanguageCode =
  (typeof languageOptions)[number]["code"];

export const uiTranslations = {
  en: {
    flights: "Flights",
    hotels: "Hotels",
    deals: "Deals",
    destinations: "Destinations",
    explore: "Explore",
    support: "Support",
    dashboard: "Dashboard",
    logout: "Logout",
    login: "Login",
    signUp: "Sign Up",
    menu: "Menu",
    selectLanguage: "Select your language",
    suggestedLanguages: "Suggested languages",
    allLanguages: "All languages",
    platform: "Platform",
    legal: "Legal",
    premium: "Premium",
    legalCenter: "Legal Center",
    footerAbout:
      "Search flights and hotels for free, compare trusted partner prices, and make calmer travel decisions.",
    footerMeta:
      "Curioticket is a travel metasearch platform.",
    tripRound: "round trip",
    tripOneWay: "one way",
    tripMulti: "multi city",
    supportLabel: "Support",
    fromPrice: "From",
  },

  fr: {
    flights: "Vols",
    hotels: "Hôtels",
    deals: "Offres",
    destinations: "Destinations",
    explore: "Explorer",
    support: "Assistance",
    dashboard: "Tableau de bord",
    logout: "Déconnexion",
    login: "Connexion",
    signUp: "S’inscrire",
    menu: "Menu",
    selectLanguage:
      "Sélectionnez votre langue",
    suggestedLanguages:
      "Langues suggérées",
    allLanguages:
      "Toutes les langues",
    platform: "Plateforme",
    legal: "Légal",
    premium: "Premium",
    legalCenter: "Centre légal",
    footerAbout:
      "Recherchez des vols et des hôtels gratuitement.",
    footerMeta:
      "Curioticket est une plateforme de voyage.",
    tripRound: "aller-retour",
    tripOneWay: "aller simple",
    tripMulti: "multi-destinations",
    supportLabel: "Assistance",
    fromPrice: "À partir de",
  },

  es: {
    flights: "Vuelos",
    hotels: "Hoteles",
    deals: "Ofertas",
    destinations: "Destinos",
    explore: "Explorar",
    support: "Soporte",
    dashboard: "Panel",
    logout: "Cerrar sesión",
    login: "Iniciar sesión",
    signUp: "Registrarse",
    menu: "Menú",
    selectLanguage:
      "Selecciona tu idioma",
    suggestedLanguages:
      "Idiomas sugeridos",
    allLanguages:
      "Todos los idiomas",
    platform: "Plataforma",
    legal: "Legal",
    premium: "Premium",
    legalCenter: "Centro legal",
    footerAbout:
      "Busca vuelos y hoteles gratis.",
    footerMeta:
      "Curioticket es una plataforma de viajes.",
    tripRound: "ida y vuelta",
    tripOneWay: "solo ida",
    tripMulti: "multiciudad",
    supportLabel: "Soporte",
    fromPrice: "Desde",
  },

  ar: {
    flights: "رحلات",
    hotels: "فنادق",
    deals: "العروض",
    destinations: "الوجهات",
    explore: "استكشاف",
    support: "الدعم",
    dashboard: "لوحة التحكم",
    logout: "تسجيل الخروج",
    login: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    menu: "القائمة",
    selectLanguage: "اختر لغتك",
    suggestedLanguages:
      "اللغات المقترحة",
    allLanguages:
      "جميع اللغات",
    platform: "المنصة",
    legal: "قانوني",
    premium: "بريميوم",
    legalCenter:
      "المركز القانوني",
    footerAbout:
      "ابحث عن الرحلات والفنادق مجانًا.",
    footerMeta:
      "كريوتيكيت منصة سفر.",
    tripRound: "ذهاب وعودة",
    tripOneWay: "ذهاب فقط",
    tripMulti: "متعدد المدن",
    supportLabel: "الدعم",
    fromPrice: "ابتداءً من",
  },
} as const;

export type TranslationLanguage =
  keyof typeof uiTranslations;

export function getFlagEmoji(
  flagCode: string
) {
  return flagCode
    .toUpperCase()
    .split("")
    .map((char) =>
      String.fromCodePoint(
        127397 + char.charCodeAt(0)
      )
    )
    .join("");
}

export function getDefaultLanguage(): LanguageCode {
  return "en-US";
}

export function normalizeLanguage(
  value?: string | null
): LanguageCode {
  if (!value) {
    return getDefaultLanguage();
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return getDefaultLanguage();
  }

  const exactMatch =
    languageOptions.find(
      (option) => option.code === trimmed
    );

  if (exactMatch) {
    return exactMatch.code;
  }

  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  if (
    upper === "EN" ||
    lower === "en" ||
    lower === "en-us"
  ) {
    return "en-US";
  }

  if (
    upper === "GB" ||
    lower === "en-gb"
  ) {
    return "en-GB";
  }

  if (
    upper === "FR" ||
    lower === "fr" ||
    lower === "fr-fr"
  ) {
    return "fr-FR";
  }

  if (
    upper === "ES" ||
    lower === "es" ||
    lower === "es-es"
  ) {
    return "es-ES";
  }

  if (
    upper === "AR" ||
    lower === "ar" ||
    lower === "ar-sa"
  ) {
    return "ar-SA";
  }

  return getDefaultLanguage();
}

export function getLanguageOption(
  code?: string | null
) {
  if (!code) {
    return undefined;
  }

  return languageOptions.find(
    (option) => option.code === code
  );
}

export function getLanguageFromStorage(): LanguageCode {
  if (typeof window === "undefined") {
    return getDefaultLanguage();
  }

  const value =
    window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    );

  const normalized =
    normalizeLanguage(value);

  if (value !== normalized) {
    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      normalized
    );
  }

  return normalized;
}

export function getTranslationLanguage(
  code: LanguageCode
): TranslationLanguage {
  const base = String(code).split("-")[0];

  return base in uiTranslations
    ? (base as TranslationLanguage)
    : "en";
}

export function getUiTranslations(
  code: LanguageCode
) {
  return (
    uiTranslations[
      getTranslationLanguage(code)
    ] || uiTranslations.en
  );
}

export function applyLanguageToDocument(
  code: LanguageCode
) {
  if (typeof document === "undefined") {
    return;
  }

  const option =
    getLanguageOption(code) ||
    getLanguageOption(
      getDefaultLanguage()
    );

  if (!option) {
    return;
  }

  document.documentElement.lang =
    option.code;

  document.documentElement.dir =
    option.dir;
}

export function setLanguageInStorage(
  code: LanguageCode
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    LANGUAGE_STORAGE_KEY,
    code
  );

  applyLanguageToDocument(code);

  window.dispatchEvent(
    new CustomEvent(
      LANGUAGE_CHANGE_EVENT,
      {
        detail: { code },
      }
    )
  );
}

export function getSuggestedLanguages() {
  return languageOptions.filter(
    (option) => option.suggested
  );
}