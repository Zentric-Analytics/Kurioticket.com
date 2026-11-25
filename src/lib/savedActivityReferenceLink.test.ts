import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { confirmedSavedActivityMetadata, savedResultReference } from "./savedActivityMetadata";

test("verifiable account save result IDs are preserved when safe", () => {
  assert.equal(savedResultReference("flight", { result: { id: "flight:123" } }), "flight:123");
  assert.equal(savedResultReference("hotel", { hotelResultId: "hotel:456" }), "hotel:456");
  assert.equal(savedResultReference("car", {}, "car:789"), "car:789");
});

test("opaque provider references are matched by bounded SHA-256 identity", () => {
  const opaque = "provider/quote?offer=123&signature=private";
  const expected = createHash("sha256").update(opaque).digest("hex");
  assert.equal(savedResultReference("flight", { result: { id: opaque } }), expected);
  assert.equal(savedResultReference("hotel", { hotelResultId: opaque }), expected);
  assert.equal(savedResultReference("car", {}, opaque), expected);
  assert.equal(savedResultReference("flight", { result: { id: "x".repeat(4097) } }), undefined);
});

test("confirmed save audit omits raw opaque result reference", () => {
  const opaque = "https://example.invalid/private/offer";
  const metadata = confirmedSavedActivityMetadata({
    product: "FLIGHT", savedType: "flight", savedItemId: "saved-123",
    payload: { result: { id: opaque } },
  });
  assert.equal(metadata.resultId, createHash("sha256").update(opaque).digest("hex"));
  assert.doesNotMatch(JSON.stringify(metadata), /example\.invalid|private\/offer/);
});
