import assert from "node:assert/strict";
import test from "node:test";
import {
  dictionaries,
  formatMobileDate,
  formatMobileNumber,
  mobileLocaleCodes,
  mobileLocales,
  mobileTranslationKeys,
  normalizeMobileLocale,
} from "./mobileLocalizationCatalog";
import { translatedMobileValue } from "./mobileTranslationCorrections";

const expectedLocales = ["en-us", "es-es", "fr", "de-de", "it-it", "pt-br", "nl", "ar", "zh-cn", "ja", "ko", "hi", "tr", "pl", "sv", "id", "th", "vi"] as const;

test("mobile exposes exactly the 18 public locales", () => {
  assert.deepEqual(mobileLocaleCodes, expectedLocales);
  assert.deepEqual(mobileLocales.map(({ code }) => code), expectedLocales);
  assert.deepEqual(Object.keys(dictionaries), [...expectedLocales]);
});

test("every selectable dictionary has every key and a defined non-empty value", () => {
  for (const locale of mobileLocales) {
    const dictionary = dictionaries[locale.code];
    assert.deepEqual(Object.keys(dictionary).sort(), [...mobileTranslationKeys].sort(), locale.code);
    for (const key of mobileTranslationKeys) {
      assert.equal(typeof dictionary[key], "string", `${locale.code}.${key}`);
      assert.notEqual(dictionary[key].trim(), "", `${locale.code}.${key}`);
    }
  }
});

test("canonical locales and common BCP-47 aliases normalize safely", () => {
  for (const locale of expectedLocales) assert.equal(normalizeMobileLocale(locale), locale);
  const aliases = { en: "en-us", es: "es-es", de: "de-de", "de-DE": "de-de", it: "it-it", "it-IT": "it-it", pt: "pt-br", "pt-BR": "pt-br", zh: "zh-cn", "zh-CN": "zh-cn", "ja-JP": "ja", "ko-KR": "ko", "hi-IN": "hi", "tr-TR": "tr", "pl-PL": "pl", "sv-SE": "sv", "id-ID": "id", "th-TH": "th", "vi-VN": "vi" } as const;
  for (const [input, expected] of Object.entries(aliases)) assert.equal(normalizeMobileLocale(input), expected);
  assert.equal(normalizeMobileLocale("unsupported"), "en-us");
  assert.equal(normalizeMobileLocale(undefined), "en-us");
});

test("Arabic is RTL and every other mobile locale is LTR", () => {
  assert.equal(mobileLocales.find(({ code }) => code === "ar")?.direction, "rtl");
  assert.ok(mobileLocales.filter(({ code }) => code !== "ar").every(({ direction }) => direction === "ltr"));
});

test("formatters use each locale's Intl identifier", () => {
  for (const code of ["en-us", "fr", "de-de", "ar", "ja"] as const) {
    const intl = mobileLocales.find((locale) => locale.code === code)!.intl;
    assert.equal(formatMobileNumber(1234.5, code), new Intl.NumberFormat(intl).format(1234.5));
    assert.equal(formatMobileDate("2027-01-02T00:00:00Z", code), new Intl.DateTimeFormat(intl).format(new Date("2027-01-02T00:00:00Z")));
  }
});

test("known expanded-dictionary English placeholders are localized", () => {
  assert.deepEqual(
    [dictionaries.fr.profile, dictionaries.fr.settings, dictionaries.fr.currencySearch, dictionaries.fr.darkMode],
    ["Profil", "Paramètres", "Rechercher des devises", "Mode sombre"],
  );
  assert.deepEqual(
    [dictionaries["de-de"].settings, dictionaries["de-de"].contactUs, dictionaries["de-de"].currencySearch],
    ["Einstellungen", "Kontakt", "Währungen suchen"],
  );
  assert.deepEqual(
    [dictionaries.ar.profile, dictionaries.ar.settings, dictionaries.ar.currency, dictionaries.ar.currencySearch, dictionaries.ar.security],
    ["الملف الشخصي", "الإعدادات", "العملة", "البحث عن العملات", "الأمان"],
  );
  assert.deepEqual(
    [dictionaries.ja.profile, dictionaries.ja.settings, dictionaries.ja.currency, dictionaries.ja.security],
    ["プロフィール", "設定", "通貨", "セキュリティ"],
  );
  assert.deepEqual(
    [dictionaries["pt-br"].emailPreferences, dictionaries["pt-br"].contactUs, dictionaries["pt-br"].supportMessage],
    ["Preferências de e-mail", "Fale conosco", "Como podemos ajudar?"],
  );
});

test("Portuguese support introduction is natural in the runtime translation path", () => {
  assert.equal(
    translatedMobileValue("pt-br", "supportIntro", dictionaries["pt-br"].supportIntro),
    "Diga-nos com o que você precisa de ajuda e inclua detalhes de rota, hotel, alerta ou conta que possam nos ajudar a entender o problema.",
  );
});
