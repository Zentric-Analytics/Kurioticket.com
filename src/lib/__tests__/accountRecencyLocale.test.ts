import assert from "node:assert/strict";
import test from "node:test";
import { getTranslations } from "../i18n";

test("account recency translations are not overwritten by English defaults", () => {
  for (const locale of ["ar", "es", "hi", "fr", "de", "it", "ko", "ja", "nl", "pt-br", "tr", "zh-cn", "vi", "th", "pl", "sv", "id"]) {
    const translated = getTranslations(locale)["accountDashboard.recently"];
    assert.ok(translated, `${locale} must provide account recency text`);
    assert.notEqual(translated, getTranslations("en-us")["accountDashboard.recently"], `${locale} must retain its translation after defaults are applied`);
  }
});

test("personalization translation identifiers stay identical across locales", () => {
  const key = "accountDashboard.preferences.customization.personalizedTravelDeals";
  for (const locale of ["ar", "es", "hi", "fr", "de", "it", "ko", "ja", "nl", "pt-br", "tr", "zh-cn", "vi", "th", "pl", "sv", "id"]) {
    const dictionary = getTranslations(locale);
    assert.ok(dictionary[key], `${locale} must resolve the canonical preference key`);
    assert.notEqual(dictionary[key], getTranslations("en-us")[key]);
    assert.deepEqual(Object.keys(dictionary).filter((entry) => entry.startsWith("accountDashboard.preferences.customization.personalizedTravel")), [key]);
  }
});
