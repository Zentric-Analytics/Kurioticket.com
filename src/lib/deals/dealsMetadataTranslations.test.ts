import assert from "node:assert/strict";
import test from "node:test";
import { availableLocaleOptions, getTranslations } from "@/lib/i18n";
import { readFileSync } from "node:fs";

const metadataKeys = [
  "deals.results.breadcrumb.current",
] as const;
const pageSource = readFileSync(new URL("../../app/deals/results/page.tsx", import.meta.url), "utf8");

test("Deals Results metadata exists for every available locale", () => {
  for (const locale of availableLocaleOptions) {
    const dictionary = getTranslations(locale.code);
    for (const key of metadataKeys) {
      assert.ok(dictionary[key]?.trim(), `${locale.code}: ${key}`);
    }
  }
});

test("Deals Results metadata uses the page label while retaining its description", () => {
  assert.match(pageSource, /title: t\["deals\.results\.breadcrumb\.current"\]/);
  assert.doesNotMatch(pageSource, /title: t\["deals\.results\.tripOptionsTitle"\]/);
  assert.match(pageSource, /description: t\["deals\.results\.tripOptionsExplanation"\]/);
});
