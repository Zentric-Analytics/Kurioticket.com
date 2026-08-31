import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("hotel destination API exposes canonical static provenance and preserves legacy contract", async () => {
  const response = await GET(new Request("https://example.test/api/hotels/destinations?q=JFK&limit=2"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.source, "curated-destinations");
  assert.equal(payload.provenance.source, "owned-catalog");
  assert.equal(payload.provenance.isLiveAvailability, false);
  assert.equal(payload.suggestions[0].searchValue, "JFK Airport area, New York");
  assert.equal(payload.suggestions[0].canonical.codes.iata, "JFK");
});

test("hotel destination API returns permissive zero-result recovery", async () => {
  const response = await GET(new Request("https://example.test/api/hotels/destinations?q=Uncatalogued%20Moon%20Base"));
  const payload = await response.json();
  assert.deepEqual(payload.suggestions, []);
  assert.equal(payload.recovery.kind, "unverified");
  assert.equal(payload.recovery.coverage, "unverified");
  assert.equal(payload.recovery.canSubmit, true);
  assert.equal(payload.recovery.canSubmitQuery, true);
});
