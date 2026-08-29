import assert from "node:assert/strict";
import test from "node:test";

import {
  getCenteredRailScrollLeft,
  getNearbyFareAnchorCorrection,
  isHorizontallyVisibleWithinContainer,
} from "./mobileNearbyFareRail";

test("centered rail position clamps at the first date", () => {
  assert.equal(
    getCenteredRailScrollLeft({
      selectedLeftWithinRail: 12,
      selectedWidth: 96,
      railWidth: 390,
      scrollWidth: 1040,
    }),
    0,
  );
});

test("centered rail position centers a middle searched date", () => {
  assert.equal(
    getCenteredRailScrollLeft({
      selectedLeftWithinRail: 428,
      selectedWidth: 96,
      railWidth: 390,
      scrollWidth: 1040,
    }),
    281,
  );
});

test("centered rail position clamps at the last date", () => {
  assert.equal(
    getCenteredRailScrollLeft({
      selectedLeftWithinRail: 932,
      selectedWidth: 96,
      railWidth: 390,
      scrollWidth: 1040,
    }),
    650,
  );
});

test("selected fare geometry corrects shifts beyond the two pixel tolerance", () => {
  assert.equal(getNearbyFareAnchorCorrection({ selectedWasVisible: true, previousOffsetX: 148, currentOffsetX: 148 }), 0);
  assert.equal(getNearbyFareAnchorCorrection({ selectedWasVisible: true, previousOffsetX: 148, currentOffsetX: 188 }), 40);
  assert.equal(getNearbyFareAnchorCorrection({ selectedWasVisible: true, previousOffsetX: 148, currentOffsetX: 118 }), -30);
  assert.equal(getNearbyFareAnchorCorrection({ selectedWasVisible: true, previousOffsetX: 148, currentOffsetX: 150 }), 0);
});

test("an originally offscreen selected fare is not forcibly anchored", () => {
  assert.equal(getNearbyFareAnchorCorrection({ selectedWasVisible: false, previousOffsetX: -80, currentOffsetX: 120 }), 0);
});

test("horizontal visibility requires intersection inside the rail inset", () => {
  const rail = { left: 10, right: 310 };
  assert.equal(isHorizontallyVisibleWithinContainer({ left: 100, right: 196 }, rail), true);
  assert.equal(isHorizontallyVisibleWithinContainer({ left: -90, right: 10 }, rail), false);
  assert.equal(isHorizontallyVisibleWithinContainer({ left: 310, right: 406 }, rail), false);
});
