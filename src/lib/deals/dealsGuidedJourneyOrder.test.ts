import assert from "node:assert/strict";
import test from "node:test";
import {
  getGuidedDealsDownstreamProducts,
  getGuidedDealsFirstProduct,
  getGuidedDealsPrerequisites,
  getGuidedDealsProductOrder,
} from "./dealsGuidedJourneyOrder";

const orders = {
  "hotel-flight": ["flight", "hotel"],
  "flight-car": ["flight", "car"],
  "hotel-car": ["hotel", "car"],
  "hotel-flight-car": ["flight", "hotel", "car"],
} as const;

test("defines one authoritative active guided product order", () => {
  for (const [mode, order] of Object.entries(orders)) {
    const typedMode = mode as keyof typeof orders;
    assert.deepEqual(getGuidedDealsProductOrder(typedMode), order);
    assert.equal(getGuidedDealsFirstProduct(typedMode), order[0]);
    for (const [index, product] of order.entries()) {
      assert.deepEqual(
        getGuidedDealsPrerequisites(typedMode, product),
        order.slice(0, index),
      );
      assert.deepEqual(
        getGuidedDealsDownstreamProducts(typedMode, product),
        order.slice(index + 1),
      );
    }
  }
});
