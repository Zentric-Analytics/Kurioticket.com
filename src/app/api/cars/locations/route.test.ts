import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("cars do not show unverified popular locations before a provider query", async () => {
  const response = await GET(new Request("https://example.test/api/cars/locations"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.suggestions, []);
  assert.equal(payload.recovery.canSubmit, false);
  assert.match(payload.recovery.message, /enter a pickup location/i);
});

test("cars query suggestions never fall back to unbound owned-catalog locations", async () => {
  const response = await GET(new Request("https://example.test/api/cars/locations?q=LOS&country=NG&limit=3"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
  assert.equal(payload.provenance.isLiveAvailability, false);
  assert.ok(payload.suggestions.every((suggestion: { isProviderValidated: boolean; canonical: { selectionToken?: string } }) => suggestion.isProviderValidated && suggestion.canonical.selectionToken));
});

test("cars API does not offer unverified typed addresses as selectable search locations", async () => {
  const response = await GET(new Request("https://example.test/api/cars/locations?q=15%20Example%20Road%2C%20Lagos"));
  const payload = await response.json();
  assert.equal(payload.suggestions.some((suggestion: { kind: string }) => suggestion.kind === "custom"), false);
  assert.equal(payload.recovery.canSubmit, false);
  assert.equal(payload.recovery.canSubmitQuery, false);
  assert.match(payload.recovery.message, /suggestions|location/i);
});
