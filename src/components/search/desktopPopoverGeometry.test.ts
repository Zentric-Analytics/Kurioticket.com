import assert from "node:assert/strict";
import test from "node:test";

import { resolveDesktopPopoverGeometry } from "./desktopPopoverGeometry";

test("height-aware auto placement prefers below when the desired panel fits", () => {
  assert.deepEqual(resolveDesktopPopoverGeometry({
    availableAbove: 500,
    availableBelow: 430,
    desiredHeight: 420,
  }), { placement: "below", maxHeight: undefined });
});

test("height-aware auto placement uses above when only above fits", () => {
  assert.deepEqual(resolveDesktopPopoverGeometry({
    availableAbove: 430,
    availableBelow: 240,
    desiredHeight: 420,
  }), { placement: "above", maxHeight: undefined });
});

test("height-aware auto placement uses the roomier side when neither side fits", () => {
  assert.deepEqual(resolveDesktopPopoverGeometry({
    availableAbove: 260,
    availableBelow: 300,
    desiredHeight: 420,
  }), { placement: "below", maxHeight: 300 });
});

test("a selected side is capped to its usable viewport space only when needed", () => {
  assert.deepEqual(resolveDesktopPopoverGeometry({
    availableAbove: 275,
    availableBelow: 400,
    desiredHeight: 430,
    placement: "above",
  }), { placement: "above", maxHeight: 275 });
});
