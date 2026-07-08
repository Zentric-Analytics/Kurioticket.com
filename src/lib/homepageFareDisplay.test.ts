import assert from "node:assert/strict";
import test from "node:test";

import { hasFreshProviderPrice } from "./homepageFareDisplay";

const realDateNow = Date.now;

test("public UI helper rejects last-known-good and cached-provider-only prices", () => {
  Date.now = () => Date.parse("2026-06-09T00:00:00.000Z");
  try {
    const base = {
      providerBacked: true,
      price: 499,
      currency: "USD",
      expiresAt: "2026-06-10T00:00:00.000Z",
      search: { origin: "JFK", destination: "LHR", currency: "USD" },
    };

    assert.equal(hasFreshProviderPrice({ ...base, priceState: "fresh" }, { originCode: "JFK", destinationCode: "LHR" }), true);
    assert.equal(hasFreshProviderPrice({ ...base, priceState: "last_known_good" }, { originCode: "JFK", destinationCode: "LHR" }), false);
    assert.equal(hasFreshProviderPrice({ ...base, cachedProviderBacked: true }, { originCode: "JFK", destinationCode: "LHR" }), false);
    assert.equal(hasFreshProviderPrice({ ...base, expiresAt: "2026-06-08T00:00:00.000Z" }, { originCode: "JFK", destinationCode: "LHR" }), false);
  } finally {
    Date.now = realDateNow;
  }
});
