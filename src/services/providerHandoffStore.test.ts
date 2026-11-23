import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createProviderHandoffStore, handoffTrackingId, providerHandoffKey } from "./providerHandoffStore";

test("handoff tracking accepts only opaque UUIDs without manufacturing missing search context", () => {
  const id = randomUUID();
  assert.equal(handoffTrackingId(id.toUpperCase()), id);
  for (const invalid of [undefined, null, "", "search-for-lagos", "/hotels?token=secret", {}, 12]) {
    assert.equal(handoffTrackingId(invalid), undefined);
  }
});

test("handoff retry keys are scoped to the verified visitor or account", () => {
  const handoffId = randomUUID();
  const guest = { handoffId, visitorId: "visitor-a", userId: null };
  assert.equal(providerHandoffKey(guest), providerHandoffKey({ ...guest, userId: "newly-linked-account" }));
  assert.notEqual(providerHandoffKey(guest), providerHandoffKey({ ...guest, visitorId: "visitor-b" }));
  assert.notEqual(providerHandoffKey(guest), providerHandoffKey({ ...guest, visitorId: null, userId: "account-a" }));
  assert.notEqual(providerHandoffKey({ ...guest, visitorId: null, userId: "account-a" }), providerHandoffKey({ ...guest, visitorId: null, userId: "account-b" }));
  assert.match(providerHandoffKey(guest)!, /^[a-f0-9]{64}$/);
  assert.equal(providerHandoffKey({ ...guest, handoffId: undefined }), null);
  assert.equal(providerHandoffKey({ ...guest, handoffId: "not-a-uuid" }), null);
});

test("missing optional storage leaves the provider action independent", async () => {
  const store = createProviderHandoffStore(() => null);
  assert.equal(await store.recordRedirect({ type: "hotel", provider: "Test provider", resultId: "offer-1",
    sourcePage: "hotel-details", destinationUrl: "https://provider.example/offer", visitorId: null, userId: null }), null);
});
