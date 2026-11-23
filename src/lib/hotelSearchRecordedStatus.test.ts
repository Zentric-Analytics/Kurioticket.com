import assert from "node:assert/strict";
import test from "node:test";
import { hotelSearchRecordedStatus } from "./hotelSearchRecordedStatus";

test("hotel outcome differentiates failed searches, partial offers and valid empty results", () => {
  assert.equal(hotelSearchRecordedStatus([{ status: "failed" }], 0), "FAILED");
  assert.equal(hotelSearchRecordedStatus([{ status: "failed" }, { status: "success" }], 0), "FAILED");
  assert.equal(hotelSearchRecordedStatus([{ status: "failed" }, { status: "success" }], 2), "PARTIAL");
  assert.equal(hotelSearchRecordedStatus([{ status: "success" }], 0), "SUCCESS");
  assert.equal(hotelSearchRecordedStatus([{ status: "success" }], 4), "SUCCESS");
});
