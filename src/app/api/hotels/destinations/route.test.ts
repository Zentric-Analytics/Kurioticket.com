import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "./route";

test("hotel query suggestions never fall back to unbound curated destinations", async () => {
  const response = await GET(new Request("https://example.test/api/hotels/destinations?q=JFK&limit=2"));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.provenance.isLiveAvailability, false);
  assert.ok(payload.suggestions.every((suggestion: { canonical: { selectionToken?: string } }) => suggestion.canonical.selectionToken));
});

test("hotel destination API reports unsupported places as non-submittable instead of allowing free-text drift", async () => {
  const response = await GET(new Request("https://example.test/api/hotels/destinations?q=Uncatalogued%20Moon%20Base"));
  const payload = await response.json();
  assert.deepEqual(payload.suggestions, []);
  assert.equal(payload.recovery.canSubmit, false);
  assert.equal(payload.recovery.canSubmitQuery, false);
  assert.match(payload.recovery.kind, /unsupported-location|provider-unavailable/);
});

test("hotel destination API does not expose curated destinations without a provider-bound query", async () => {
  const response = await GET(new Request("https://example.test/api/hotels/destinations"));
  const payload = await response.json();
  assert.deepEqual(payload.suggestions, []);
  assert.equal(payload.recovery.kind, "continue-typing");
  assert.equal(payload.recovery.canSubmit, false);
});
