import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const originalDisplayNames = Intl.DisplayNames;

try {
  Object.defineProperty(Intl, "DisplayNames", { value: undefined, configurable: true });
  const context = await jiti.import(resolve(import.meta.dirname, "../../../src/lib/geo/context.ts"));
  assert.equal(context.normalizeCountryCode("gb"), "GB");
  assert.equal(context.countryCodeToCountryName("gb"), "GB");
} finally {
  Object.defineProperty(Intl, "DisplayNames", { value: originalDisplayNames, configurable: true });
}

console.log("Hermes startup compatibility smoke test passed.");
