import assert from "node:assert/strict";
import test from "node:test";
import { translations } from "./en";

test("English Flight trip-type labels use the canonical display copy", () => {
  assert.deepEqual(
    { roundTrip: translations.roundTrip, oneWay: translations.oneWay, multiCity: translations.multiCity },
    { roundTrip: "Round-trip", oneWay: "One-way", multiCity: "Multi-city" },
  );
});
