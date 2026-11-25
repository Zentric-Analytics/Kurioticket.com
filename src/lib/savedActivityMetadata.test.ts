import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { confirmedSavedActivityMetadata, savedResultReference } from "./savedActivityMetadata";

test("save and unsave use the same product and safe reference contract", () => {
  const sources = [
    { savedType: "flight" as const, product: "FLIGHT" as const, payload: { flightResultId: "flight-001" }, resultId: undefined },
    { savedType: "hotel" as const, product: "HOTEL" as const, payload: { hotelResultId: "hotel-002" }, resultId: undefined },
    { savedType: "car" as const, product: "CAR" as const, payload: { result: { id: "car-003" } }, resultId: "car-003" },
  ];
  for (const item of sources) {
    const metadata = confirmedSavedActivityMetadata({ ...item, savedItemId: "saved-001" }, { applicationSource: "WEB" });
    assert.equal(metadata.product, item.product);
    assert.equal(metadata.savedType, item.savedType);
    assert.equal(metadata.savedItemId, "saved-001");
    assert.equal(metadata.resultId, item.resultId ?? savedResultReference(item.savedType, item.payload));
    assert.equal(metadata.applicationSource, "WEB");
    assert.equal(metadata.outcome, "confirmed");
  }
});

test("verified native attribution is stored while unknown device source is not inferred", () => {
  for (const applicationSource of ["IOS", "ANDROID"] as const) {
    const event = confirmedSavedActivityMetadata({ savedType: "hotel", product: "HOTEL", savedItemId: "saved-002" },
      { applicationSource, appVersion: "1.2.3" });
    assert.equal(event.applicationSource, applicationSource);
    assert.equal(event.appVersion, "1.2.3");
  }
  assert.equal(confirmedSavedActivityMetadata({ savedType: "flight", product: "FLIGHT", savedItemId: "x" }).applicationSource, "UNKNOWN");
});

test("safe references hash opaque identifiers and never copy sensitive travel data", () => {
  const opaque = "https://example.com?a=1";
  assert.equal(savedResultReference("flight", { flightResultId: opaque }), createHash("sha256").update(opaque).digest("hex"));
  assert.equal(savedResultReference("hotel", { hotelResultId: "x".repeat(129) }), createHash("sha256").update("x".repeat(129)).digest("hex"));
  assert.equal(savedResultReference("hotel", { hotelResultId: "x".repeat(4097) }), undefined);
  assert.equal(savedResultReference("hotel", { result: { id: "opaque:safe-23" } }), "opaque:safe-23");
  assert.equal(savedResultReference("search", { result: { id: "x" } }), "x");
  const event = confirmedSavedActivityMetadata({
    savedType: "flight", product: "FLIGHT", savedItemId: "id1", payload: { origin: "LOS", destination: "LHR" },
  });
  assert.equal("origin" in event, false);
  assert.equal("destination" in event, false);
});
