import assert from "node:assert/strict";
import test from "node:test";

import { resolveMarketplaceContext } from "./marketplaceContext";

test("marketplace precedence is account, user, detected, then fallback", () => {
  assert.deepEqual(
    [
      resolveMarketplaceContext({ locale: "en-GB", accountMarket: "GB", selectedMarket: "NG", detectedMarket: "US" }),
      resolveMarketplaceContext({ locale: "en-US", selectedMarket: "US", detectedMarket: "NG" }),
      resolveMarketplaceContext({ locale: "en-NG", detectedMarket: "NG" }),
      resolveMarketplaceContext({ locale: "en-US" }),
    ].map(({ marketCountryCode, displayCurrency, source }) => ({ marketCountryCode, displayCurrency, source })),
    [
      { marketCountryCode: "GB", displayCurrency: "GBP", source: "ACCOUNT" },
      { marketCountryCode: "US", displayCurrency: "USD", source: "USER" },
      { marketCountryCode: "NG", displayCurrency: "NGN", source: "DETECTED" },
      { marketCountryCode: "US", displayCurrency: "USD", source: "FALLBACK" },
    ],
  );
});

test("an explicit currency survives market changes", () => {
  const context = resolveMarketplaceContext({
    locale: "de-DE",
    selectedMarket: "GB",
    detectedMarket: "NG",
    explicitCurrency: "EUR",
  });
  assert.equal(context.marketCountryCode, "GB");
  assert.equal(context.displayCurrency, "EUR");
  assert.equal(context.hasExplicitCurrency, true);
});
