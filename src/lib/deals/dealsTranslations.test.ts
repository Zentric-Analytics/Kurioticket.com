import test from "node:test";
import assert from "node:assert/strict";
import { dictionaries, getTranslations } from "@/lib/i18n";
import { supportedLocales } from "@/lib/supportedLocales";
const keys = [
  "deals.results.heading",
  "deals.results.modify",
  "deals.results.tripSummary",
  "deals.results.flightLoading",
  "deals.results.flightEmpty",
  "deals.results.flightError",
  "deals.results.hotelUnavailable",
  "deals.results.carUnavailable",
  "deals.results.customHotelDates",
  "deals.results.customizeCar",
];
const placeholders = (s: string) =>
  [...s.matchAll(/{{(.*?)}}/g)].map((x) => x[1]).sort();
test("new Deals keys are explicit, nonblank, and placeholder-compatible", () => {
  const english = dictionaries["en-us"];
  for (const locale of supportedLocales.filter(
    (x) => x.status === "available",
  )) {
    const dictionary = getTranslations(locale.code);
    assert.ok(dictionary, locale.code);
    for (const key of keys) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(dictionary, key),
        `${locale.code}: ${key}`,
      );
      assert.ok(dictionary[key].trim());
      assert.deepEqual(
        placeholders(dictionary[key]),
        placeholders(english[key]),
      );
    }
  }
});
test("Arabic remains RTL", () => {
  assert.equal(supportedLocales.find((x) => x.code === "ar")?.direction, "rtl");
});
