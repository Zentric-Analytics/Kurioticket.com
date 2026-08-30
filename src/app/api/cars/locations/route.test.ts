import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("cars API preserves legacy query response while adding canonical static provenance", async () => {
  const response = await GET(new Request("https://example.test/api/cars/locations?q=LOS&country=NG&limit=3"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(payload.source, "local-fallback");
  assert.equal(payload.provenance.source, "owned-catalog");
  assert.equal(payload.provenance.isLiveAvailability, false);
  assert.equal(payload.suggestions[0].airportCode, "LOS");
  assert.equal(payload.suggestions[0].value, "Murtala Muhammed International Airport (LOS)");
});

test("cars API labels custom text as unverified and preserves it exactly for submission", async () => {
  const response = await GET(new Request("https://example.test/api/cars/locations?q=15%20Example%20Road%2C%20Lagos"));
  const payload = await response.json();
  const custom = payload.suggestions.at(-1);
  assert.equal(custom.value, "15 Example Road, Lagos");
  assert.equal(custom.validation, "unverified-text");
  assert.equal(custom.isProviderValidated, false);
  assert.equal(custom.canonical.staticCoverage.cars, "none");
  assert.equal(payload.recovery.kind, "unverified-text");
});
