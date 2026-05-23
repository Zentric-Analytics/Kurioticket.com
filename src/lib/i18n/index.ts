import { supportedLocales } from "@/lib/supportedLocales";
import { translations as ar } from "./ar";
import { translations as cs } from "./cs";
import { translations as da } from "./da";
import { translations as de } from "./de";
import { translations as el } from "./el";
import { translations as en } from "./en";
import { translations as es } from "./es";
import { translations as fi } from "./fi";
import { translations as fr } from "./fr";
import { translations as ha } from "./ha";
import { translations as he } from "./he";
import { translations as hi } from "./hi";
import { translations as hu } from "./hu";
import { translations as id } from "./id";
import { translations as ig } from "./ig";
import { translations as it } from "./it";
import { translations as ja } from "./ja";
import { translations as ko } from "./ko";
import { translations as ms } from "./ms";
import { translations as nl } from "./nl";
import { translations as no } from "./no";
import { translations as pl } from "./pl";
import { translations as ptBr } from "./pt-br";
import { translations as ptPt } from "./pt-pt";
import { translations as ro } from "./ro";
import { translations as ru } from "./ru";
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
  "en-us": en, "en-gb": en, "fr-fr": fr, de, "es-es": es, it, "pt-br": ptBr, "pt-pt": ptPt,
  ja, ko, "zh-cn": zhCn, "zh-tw": zhTw, "ar-sa": ar, he, hi, tr, ru, uk, nl, pl,
  id, ms, th, vi, cs, da, fi, el, hu, no, ro, sv, ur, sw, yo, ig, ha,
};

export type LocaleCode = keyof typeof dictionaries;
export const localeOptions = supportedLocales.map((locale) => ({ ...locale }));
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
    "en-us": "US", "en-gb": "GB", "fr-fr": "FR", de: "DE", "es-es": "ES", it: "IT", "pt-br": "BR", "pt-pt": "PT",
    ja: "JP", ko: "KR", "zh-cn": "CN", "zh-tw": "TW", "ar-sa": "SA", he: "IL", hi: "IN", tr: "TR", ru: "RU", uk: "UA", nl: "NL", pl: "PL",
    id: "ID", ms: "MY", th: "TH", vi: "VN", cs: "CZ", da: "DK", fi: "FI", el: "GR", hu: "HU", no: "NO", ro: "RO", sv: "SE", ur: "PK", sw: "KE", yo: "NG", ig: "NG", ha: "NG",
  };
  return map[code] ?? "US";
}
