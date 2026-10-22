import test from "node:test";
import assert from "node:assert/strict";
import { readHotelDestinationSelection, writeHotelDestinationSelection } from "./destinationSelection";
import type { HotelDestinationSuggestion } from "@/data/hotelDestinations";
import { publicLocationSelection, resolveProviderSelection } from "@/lib/locations/selectionAuthority";
import type { CanonicalLocation } from "@/lib/locations/types";

const destination = "Abuja, Abuja Capital Territory, Nigeria";
const canonical: CanonicalLocation = { id: "abuja", kind: "city", primaryLabel: "Abuja", supportingLabel: "Nigeria", submittedValue: destination, selectionToken: "opaque-server-token-123456789", providerBindings: [{ provider: "kayak", value: "kplace:123", verification: "verified", provenance: "provider-discovery" }], staticCoverage: { flights: "none", hotels: "none", cars: "none", packages: "none" }, source: { catalog: "kurioticket", datasetVersion: "test" } };
const suggestion: HotelDestinationSuggestion = { id: "abuja", name: "Abuja", country: "Nigeria", countryCode: "NG", kind: "city", searchValue: destination, canonical };

test("hotel selection round-trips the server-issued token without exposing provider bindings", () => {
  const params = new URLSearchParams({ destination });
  writeHotelDestinationSelection(params, suggestion, destination);
  assert.equal(params.get("destinationId"), "abuja");
  const selection = readHotelDestinationSelection(params.get("destinationLocation"), destination);
  assert.equal(selection?.selectionToken, canonical.selectionToken);
  assert.equal(selection?.submittedValue, destination);
  assert.deepEqual(selection?.providerBindings, []);
});

test("editing a selected destination cannot retain its old provider identity", () => {
  const params = new URLSearchParams({ destination: "Lagos" });
  writeHotelDestinationSelection(params, suggestion, "Lagos");
  assert.equal(params.has("destinationId"), false);
  assert.equal(params.has("destinationLocation"), false);
  assert.equal(readHotelDestinationSelection(JSON.stringify(canonical), "Lagos"), undefined);
});

test("invalid and oversized URL selections are ignored safely", () => {
  for (const value of [null, "{", "null", "{}", "x".repeat(4097)]) {
    assert.equal(readHotelDestinationSelection(value, destination), undefined);
  }
});

test("the selected place still resolves at the server after the web URL round-trip", () => {
  const publicLocation = publicLocationSelection(canonical, "hotels");
  const params = new URLSearchParams({ destination });
  writeHotelDestinationSelection(params, { ...suggestion, canonical: publicLocation }, destination);
  const selection = readHotelDestinationSelection(params.get("destinationLocation"), destination);
  assert.ok(selection);
  assert.deepEqual(resolveProviderSelection(selection, "hotels", "kayak"), { ok: true, value: "kplace:123" });
  assert.equal(resolveProviderSelection({ ...selection, id: "different-city" }, "hotels", "kayak").ok, false);
});
