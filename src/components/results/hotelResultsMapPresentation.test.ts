import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getHotelResultsMapPosition } from "./hotelResultsMapPresentation";

const demoHotelIds = [
  "demo-catalog-harborline-city",
  "demo-catalog-linen-house",
  "demo-catalog-station-inn",
  "demo-catalog-riverside-loom",
  "demo-catalog-atlas-arcade",
  "demo-catalog-gallery-court",
  "demo-catalog-wayfarer-yard",
];

describe("getHotelResultsMapPosition", () => {
  it("returns stable unique percentage positions for every demo hotel", () => {
    const positionKeys = new Set<string>();

    for (const hotelId of demoHotelIds) {
      const position = getHotelResultsMapPosition(hotelId);
      const repeatedPosition = getHotelResultsMapPosition(hotelId);

      assert.notEqual(position, null);
      assert.deepEqual(repeatedPosition, position);
      assert.ok(position.xPercent >= 0 && position.xPercent <= 100);
      assert.ok(position.yPercent >= 0 && position.yPercent <= 100);
      positionKeys.add(`${position.xPercent}:${position.yPercent}`);
    }

    assert.equal(positionKeys.size, demoHotelIds.length);
  });

  it("returns null for unknown hotel IDs", () => {
    assert.equal(getHotelResultsMapPosition("unknown-hotel-id"), null);
  });
});
