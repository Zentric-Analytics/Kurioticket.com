import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowDesktopStickySearch } from "./desktopStickySearch";

const visibility = (formBottom: number | null | undefined, viewportWidth = 1024) =>
  shouldShowDesktopStickySearch({ viewportWidth, formBottom });

test("full form remains in control while its visible bottom is below the threshold", () => {
  assert.equal(visibility(17), false);
});

test("compact search takes over at the exact Flights threshold", () => {
  assert.equal(visibility(16), true);
});

test("compact search remains visible once the actual form is above the viewport", () => {
  assert.equal(visibility(-120), true);
});

test("compact search yields when upward scrolling returns the actual form", () => {
  assert.equal(visibility(-120), true);
  assert.equal(visibility(17), false);
});

test("sticky desktop behavior is disabled below its supported breakpoint", () => {
  assert.equal(visibility(-120, 1023), false);
});

test("missing and invalid actual-form measurements fail safely", () => {
  assert.equal(visibility(null), false);
  assert.equal(visibility(undefined), false);
  assert.equal(visibility(Number.NaN), false);
  assert.equal(visibility(Number.POSITIVE_INFINITY), false);
});

test("observer and scroll fallback measurements share one visibility decision", () => {
  const observerResult = visibility(16);
  const scrollFallbackResult = visibility(16);

  assert.equal(observerResult, scrollFallbackResult);
});

test("repeated equal measurements do not produce a changed result", () => {
  const previous = visibility(8);
  const next = visibility(8);

  assert.equal(next, previous);
});

test("the translated visible form boundary prevents a blank handoff", () => {
  const decorativeFrameBottom = -4;
  const translatedVisibleFormBottom = decorativeFrameBottom + 20;

  assert.equal(visibility(decorativeFrameBottom), true);
  assert.equal(visibility(translatedVisibleFormBottom), true);
});
