import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const originalDisplayNames = Intl.DisplayNames;
const formatToPartsDescriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, "formatToParts");

try {
  Object.defineProperty(Intl, "DisplayNames", { value: undefined, configurable: true });
  const context = await jiti.import(resolve(import.meta.dirname, "../../../src/lib/geo/context.ts"));
  assert.equal(context.normalizeCountryCode("gb"), "GB");
  assert.equal(context.countryCodeToCountryName("gb"), "GB");

  Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", { value: undefined, configurable: true });
  const currency = await jiti.import(resolve(import.meta.dirname, "../src/features/currency/displayCurrency.ts"));
  assert.match(currency.formatCurrency(420, "USD"), /US\$|USD/);
  const fare = currency.displayPrice(420, "USD", "CAD", { USD: 1, CAD: 1.4 });
  assert.equal(fare.providerAmount, 420);
  assert.equal(fare.providerCurrency, "USD");
  assert.match(fare.formatted, /CA\$|CAD/);
  assert.ok(fare.accessibilityLabel.length > 0);
} finally {
  Object.defineProperty(Intl, "DisplayNames", { value: originalDisplayNames, configurable: true });
  if (formatToPartsDescriptor) {
    Object.defineProperty(Intl.NumberFormat.prototype, "formatToParts", formatToPartsDescriptor);
  }
}

console.log("Hermes startup compatibility smoke test passed.");
