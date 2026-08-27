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
