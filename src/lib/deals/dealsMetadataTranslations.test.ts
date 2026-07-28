import assert from "node:assert/strict";
import test from "node:test";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";

const metadataKeys = [
  "deals.results.tripOptionsTitle",
] as const;

test("Deals Results metadata exists for every available locale", () => {
  for (const locale of availableLocaleOptions) {
    const dictionary = getTranslations(locale.code);
    for (const key of metadataKeys) {
      assert.ok(dictionary[key]?.trim(), `${locale.code}: ${key}`);
    }
  }
});
