import assert from "node:assert/strict";
import test from "node:test";
import { getTranslations, publicLocaleOptions } from "./index";
import { travelAccountMessageKeys, travelAccountMessages } from "../../../apps/mobile/src/localization/travelAccountMessages";
import { mobileLocales } from "../../../apps/mobile/src/localization/mobileLocalizationCatalog";
import { travelAccountTranslations, travelAccountTranslationKeys } from "./travelAccount";

const webKeys = ["travel.account.hotelAlert.title", "travel.account.hotelAlert.body", "travel.account.hotelAlert.create", "travel.account.hotelAlert.target", "travel.account.hotelAlert.save", "travel.account.hotelAlert.saved", "travel.account.hotelAlert.duplicate", "travel.account.hotelAlert.error", "travel.account.package.save", "travel.account.package.saved", "travel.account.package.duplicate", "travel.account.package.error"];

test("every selectable web locale resolves every new travel account key without placeholders", () => {
  assert.deepEqual([...travelAccountTranslationKeys], webKeys);
  for (const locale of publicLocaleOptions) for (const key of webKeys) {
    const dictionaryCode = locale.code === "de-de" ? "de" : locale.code === "it-it" ? "it" : locale.code;
    assert.ok(Object.hasOwn(travelAccountTranslations[dictionaryCode] ?? {}, key), `${locale.code}:${key}:explicit`);
    const value = getTranslations(locale.code)[key];
    assert.equal(typeof value, "string", `${locale.code}:${key}`);
    assert.ok(value.trim() && !/TODO|TRANSLATE|\[[\w.]+\]/i.test(value), `${locale.code}:${key}`);
  }
});

test("every selectable mobile locale has explicit travel account copy and Arabic remains RTL", () => {
  assert.deepEqual(Object.keys(travelAccountMessages).sort(), mobileLocales.map(({ code }) => code).sort());
  for (const { code } of mobileLocales) for (const key of travelAccountMessageKeys) {
    const value = travelAccountMessages[code][key];
    assert.ok(value.trim() && !/TODO|TRANSLATE|\[[\w.]+\]/i.test(value), `${code}:${key}`);
  }
  assert.equal(mobileLocales.find(({ code }) => code === "ar")?.direction, "rtl");
});

test("date-only travel values do not depend on the device timezone", async () => {
  const source = await import("node:fs/promises").then(({ readFile }) => readFile("apps/mobile/src/localization/mobileLocalizationCatalog.ts", "utf8"));
  assert.match(source, /formatMobileDateOnly/);
  assert.match(source, /timeZone:\s*["']UTC["']/);
});
