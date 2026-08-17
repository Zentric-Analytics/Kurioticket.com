import assert from "node:assert/strict";
import test from "node:test";

import {
  getInitialValues,
  hasExplicitDifferentReturnLocation,
} from "./carsSearchUtils";

test("same-location URLs preserve implicit return intent", () => {
  for (const query of [
    "pickupLocation=LAX",
    "pickupLocation=LAX&dropoffLocation=LAX",
  ]) {
    const values = getInitialValues(new URLSearchParams(query));
    assert.equal(values.returnToDifferentLocation, false);
    assert.equal(values.dropoffLocation, "");
  }
});

test("explicit and legacy different-location URLs preserve different return intent", () => {
  assert.equal(
    hasExplicitDifferentReturnLocation({
      pickupLocation: "LAX",
      dropoffLocation: "SFO",
      marker: "",
    }),
    true,
  );
  const values = getInitialValues(
    new URLSearchParams(
      "pickupLocation=LAX&dropoffLocation=SFO&returnToDifferentLocation=1",
    ),
  );
  assert.equal(values.returnToDifferentLocation, true);
  assert.equal(values.dropoffLocation, "SFO");
});
