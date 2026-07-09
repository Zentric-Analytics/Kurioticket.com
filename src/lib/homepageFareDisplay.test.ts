import assert from "node:assert/strict";
import test from "node:test";

import { hasFreshProviderPrice, PUBLIC_HOMEPAGE_FARE_TTL_MS } from "./homepageFareDisplay";

const realDateNow = Date.now;

test("public UI helper rejects last-known-good and cached-provider-only prices", () => {
  Date.now = () => Date.parse("2026-06-09T00:00:00.000Z");
  try {
    const base = {
      providerBacked: true,
      price: 499,
      currency: "USD",
      searchedAt: "2026-06-08T23:00:00.000Z",
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

test("public UI helper accepts only provider fares searched within the 6-hour public window", () => {
  Date.now = () => Date.parse("2026-06-09T00:00:00.000Z");
  try {
    const base = {
      providerBacked: true,
      price: 499,
      currency: "USD",
      expiresAt: "2026-06-10T00:00:00.000Z",
      search: { origin: "JFK", destination: "LHR", currency: "USD" },
      priceState: "fresh" as const,
    };

    assert.equal(PUBLIC_HOMEPAGE_FARE_TTL_MS, 6 * 60 * 60 * 1000);
    assert.equal(hasFreshProviderPrice({ ...base, searchedAt: "2026-06-08T23:00:00.000Z" }, { originCode: "JFK", destinationCode: "LHR" }), true);
    assert.equal(hasFreshProviderPrice({ ...base, searchedAt: "2026-06-08T18:01:00.000Z" }, { originCode: "JFK", destinationCode: "LHR" }), true);
    assert.equal(hasFreshProviderPrice({ ...base, searchedAt: "2026-06-08T17:59:00.000Z" }, { originCode: "JFK", destinationCode: "LHR" }), false);
    assert.equal(hasFreshProviderPrice({ ...base, searchedAt: "2026-06-09T00:01:00.000Z" }, { originCode: "JFK", destinationCode: "LHR" }), false);
    assert.equal(hasFreshProviderPrice({ ...base, searchedAt: undefined }, { originCode: "JFK", destinationCode: "LHR" }), false);
  } finally {
    Date.now = realDateNow;
  }
});

test("public UI helper has no last checked or recently found copy", () => {
  assert.equal(JSON.stringify({ hasFreshProviderPrice }).includes("Last checked"), false);
  assert.equal(JSON.stringify({ hasFreshProviderPrice }).includes("Recently found"), false);
});
