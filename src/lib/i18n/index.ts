import { supportedLocales } from "@/lib/supportedLocales";
import { translations as ar } from "./ar";
import { translations as de } from "./de";
import { translations as en } from "./en";
import { translations as es } from "./es";
import { translations as fr } from "./fr";
import { translations as he } from "./he";
import { translations as hi } from "./hi";
import { translations as it } from "./it";
import { translations as ja } from "./ja";
import { translations as ko } from "./ko";
import { translations as nl } from "./nl";
import { translations as pl } from "./pl";
import { translations as ptBr } from "./pt-br";
import { translations as ptPt } from "./pt-pt";
import { translations as ru } from "./ru";
import { translations as tr } from "./tr";
import { translations as uk } from "./uk";
import type { TranslationDictionary } from "./types";
import { translations as zhCn } from "./zh-cn";
import { translations as zhTw } from "./zh-tw";

export const dictionaries: Record<string, TranslationDictionary> = {
  "en-us": en,
  "en-gb": en,
  fr,
  de,
  es,
  it,
  "pt-br": ptBr,
  "pt-pt": ptPt,
  ja,
  ko,
  "zh-cn": zhCn,
  "zh-tw": zhTw,
  ar,
  he,
  hi,
  tr,
  ru,
  uk,
  nl,
  pl,
};

export type LocaleCode = keyof typeof dictionaries;

export const localeOptions = supportedLocales
  .filter((locale) => locale.code in dictionaries)
  .map((locale) => ({
    ...locale,
    flag: getLocaleFlag(locale.code),
  }));

const fallbackLocale: LocaleCode = "en-us";

export function getTranslations(locale?: string | null): TranslationDictionary {
  if (!locale) return dictionaries[fallbackLocale];
  const normalized = locale.trim().toLowerCase();
  return dictionaries[normalized] ?? dictionaries[fallbackLocale];
}

export function getLocaleFlag(code: string): string {
  const map: Record<string, string> = {
    "en-us": "🇺🇸",
    "en-gb": "🇬🇧",
    fr: "🇫🇷",
    de: "🇩🇪",
    es: "🇪🇸",
    it: "🇮🇹",
    "pt-br": "🇧🇷",
    "pt-pt": "🇵🇹",
    ja: "🇯🇵",
    ko: "🇰🇷",
    "zh-cn": "🇨🇳",
    "zh-tw": "🇹🇼",
    ar: "🇸🇦",
    he: "🇮🇱",
    hi: "🇮🇳",
    tr: "🇹🇷",
    ru: "🇷🇺",
    uk: "🇺🇦",
    nl: "🇳🇱",
    pl: "🇵🇱",
  };

  return map[code] ?? "🌐";
}
