import type { MobileLocale } from "./mobileLocalizationCatalog";

const profileWelcomeGreetings: Record<MobileLocale, string> = {
  "en-us": "Welcome",
  "es-es": "Te damos la bienvenida",
  fr: "Bienvenue",
  "de-de": "Willkommen",
  "it-it": "Ti diamo il benvenuto",
  "pt-br": "Boas-vindas",
  nl: "Welkom",
  ar: "مرحبًا",
  "zh-cn": "欢迎",
  ja: "ようこそ",
  ko: "환영합니다",
  hi: "स्वागत है",
  tr: "Hoş geldiniz",
  pl: "Witamy",
  sv: "Välkommen",
  id: "Selamat datang",
  th: "ยินดีต้อนรับ",
  vi: "Chào mừng",
};

export function profileWelcomeGreeting(locale: MobileLocale): string {
  return profileWelcomeGreetings[locale];
}
