import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("hotel suggestions expose only provider-bound query results without live-availability claims", () => {
  const source = read("../../app/api/hotels/destinations/route.ts");
  assert.match(source, /canonicalLocations/);
  assert.match(source, /supportedByProviders: \["kayak"\]/);
  assert.match(source, /provider-query-required/);
  assert.match(source, /canSubmit: false/);
  assert.match(source, /isLiveAvailability: false/);
});

test("car suggestions require a query and provider binding before offering selectable locations", () => {
  const source = read("../../app/api/cars/locations/route.ts");
  assert.match(source, /canonicalLocations/);
  assert.match(source, /supportedByProviders: \["kayak"\]/);
  assert.match(source, /provider-query-required/);
  assert.match(source, /Enter a pickup location/);
  assert.match(source, /canSubmit: false/);
  assert.match(source, /isLiveAvailability: false/);
});
