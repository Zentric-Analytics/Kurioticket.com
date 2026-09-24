import assert from "node:assert/strict";
import test from "node:test";
import { decodeProviderRouteId } from "./providerRouteId";
import { isKayakCarResultId, resolveCarDetails, type CarDetailsDependencies } from "@/services/travel/carAggregator";
import type { NormalizedCarResult } from "@/lib/cars/types";

test("encoded KAYAK car route IDs resolve the exact cached provider car", async () => {
  const id = "kayak-sandbox:provider-car:3";
  const car = { id, inventorySource: "kayak-sandbox", offers: [] } as unknown as NormalizedCarResult;
  const decoded = decodeProviderRouteId(encodeURIComponent(id));
  assert.equal(isKayakCarResultId(decoded), true);
  const dependencies: CarDetailsDependencies = {
    getExact: async (_vertical, lookupId) => lookupId === id ? car : null,
    getCohort: async () => [],
    searchKayak: async () => { throw new Error("No provider search expected"); },
    rememberExact: async () => {},
    rememberCohort: async () => {},
    buildStatic: () => { throw new Error("No static fallback expected"); },
  };
  assert.equal(await resolveCarDetails(decoded, undefined, undefined, dependencies), car);
});

test("flight details query preserves the original KAYAK provider ID", () => {
  const id = "kayak-sandbox:provider-flight:7";
  const decoded = decodeProviderRouteId(encodeURIComponent(id));
  const url = new URL("https://example.test/api/flights/details?id=" + encodeURIComponent(decoded));
  assert.equal(url.searchParams.get("id"), id);
  assert.equal(url.search.includes("%253A"), false);
});

test("plain IDs survive and decoding is bounded with malformed escapes", () => {
  for (const id of ["static-car", "duffel-offer", "kayak-sandbox:1:2", "bad%escape"])
    assert.equal(decodeProviderRouteId(id), id);
  assert.equal(decodeProviderRouteId("kayak-sandbox%253A1"), "kayak-sandbox%3A1");
});
