import { supportedLocales } from "@/lib/supportedLocales";
import { translations as ar } from "./ar";
import { translations as bg } from "./bg";
import { translations as cs } from "./cs";
import { translations as da } from "./da";
import { translations as de } from "./de";
import { translations as el } from "./el";
import { translations as en } from "./en";
import { translations as es } from "./es";
import { translations as et } from "./et";
import { translations as fi } from "./fi";
import { translations as fr } from "./fr";
import { translations as ha } from "./ha";
import { translations as he } from "./he";
import { translations as hi } from "./hi";
import { translations as hr } from "./hr";
import { translations as hu } from "./hu";
import { translations as id } from "./id";
import { translations as ig } from "./ig";
import { translations as it } from "./it";
import { translations as ja } from "./ja";
import { translations as ko } from "./ko";
import { translations as lt } from "./lt";
import { translations as lv } from "./lv";
import { translations as ms } from "./ms";
import { translations as nl } from "./nl";
import { translations as no } from "./no";
import { translations as pl } from "./pl";
import { translations as ptBr } from "./pt-br";
import { translations as ptPt } from "./pt-pt";
import { translations as ro } from "./ro";
import { translations as ru } from "./ru";
import { translations as sk } from "./sk";
import { translations as sl } from "./sl";
import { translations as sr } from "./sr";
import { translations as sv } from "./sv";
import { translations as sw } from "./sw";
import { translations as th } from "./th";
import { translations as tr } from "./tr";
import type { TranslationDictionary } from "./types";
import { translations as uk } from "./uk";
import { translations as ur } from "./ur";
import { translations as vi } from "./vi";
import { translations as yo } from "./yo";
import { translations as zhCn } from "./zh-cn";
import { translations as zhTw } from "./zh-tw";

export const dictionaries: Record<string, TranslationDictionary> = {
  "en-us": en, "en-gb": en, "fr-fr": fr, de, "es-es": es, it, nl, "pt-br": ptBr, "pt-pt": ptPt,
  pl, ru, uk, tr, "ar-sa": ar, he, "zh-cn": zhCn, "zh-tw": zhTw, ja, ko, hi, id, ms, th, vi, cs, da,
  fi, el, hu, no, ro, sk, sv, bg, hr, lt, lv, et, sl, sr, sw, yo, ig, ha, ur,
};

export type LocaleCode = keyof typeof dictionaries;
export const localeOptions = supportedLocales.map((locale) => ({ ...locale }));
export const publicLocaleOptions = localeOptions.filter((locale) => locale.translationStatus === "ready");
const fallbackLocale: LocaleCode = "en-us";
const localeAliases: Record<string, string> = { en: "en-us", fr: "fr-fr", es: "es-es", ar: "ar-sa", pt: "pt-pt", zh: "zh-cn" };
export function getTranslations(locale?: string | null): TranslationDictionary {
  if (!locale) return dictionaries[fallbackLocale];
  const normalized = locale.trim().toLowerCase();
  const resolvedLocale = localeAliases[normalized] ?? normalized;
  return dictionaries[resolvedLocale] ?? dictionaries[fallbackLocale];
}

export function getLocaleCountryCode(code: string): string {
  const map: Record<string, string> = {
    "en-us": "US", "en-gb": "GB", "fr-fr": "FR", de: "DE", "es-es": "ES", it: "IT", nl: "NL", "pt-br": "BR", "pt-pt": "PT",
    pl: "PL", ru: "RU", uk: "UA", tr: "TR", "ar-sa": "SA", he: "IL", "zh-cn": "CN", "zh-tw": "TW", ja: "JP", ko: "KR", hi: "IN",
    id: "ID", ms: "MY", th: "TH", vi: "VN", cs: "CZ", da: "DK", fi: "FI", el: "GR", hu: "HU", no: "NO", ro: "RO", sk: "SK", sv: "SE",
    bg: "BG", hr: "HR", lt: "LT", lv: "LV", et: "EE", sl: "SI", sr: "RS", sw: "KE", yo: "NG", ig: "NG", ha: "NG", ur: "PK",
  };
  return map[code] ?? "US";
}
