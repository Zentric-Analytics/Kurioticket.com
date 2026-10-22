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


test("fresh Cars Main intent leaves pickup and return times unselected", () => {
  const values = getInitialValues(new URLSearchParams());
  assert.equal(values.pickupTime, "");
  assert.equal(values.dropoffTime, "");
});

test("explicit incoming Cars times are preserved", () => {
  const values = getInitialValues(
    new URLSearchParams("pickupTime=09%3A30&dropoffTime=14%3A00"),
  );
  assert.equal(values.pickupTime, "09:30");
  assert.equal(values.dropoffTime, "14:00");
});
