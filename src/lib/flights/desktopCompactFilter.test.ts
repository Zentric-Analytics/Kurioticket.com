import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowDesktopCompactFilter } from "./desktopCompactFilter";

test("desktop compact filter stays hidden below desktop width", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1023,
      sentinelTop: 100,
      topOffset: 116,
    }),
    false,
  );
});

test("desktop compact filter stays hidden when sentinel is below threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1024,
      sentinelTop: 117,
      topOffset: 116,
    }),
    false,
  );
});

test("desktop compact filter appears when sentinel reaches threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1024,
      sentinelTop: 116,
      topOffset: 116,
    }),
    true,
  );
});

test("desktop compact filter appears when sentinel is above threshold", () => {
  assert.equal(
    shouldShowDesktopCompactFilter({
      viewportWidth: 1366,
      sentinelTop: 24,
      topOffset: 116,
    }),
    true,
  );
});

test("desktop compact filter toggles when scrolling upward across threshold", () => {
  const topOffset = 116;

  assert.equal(
    shouldShowDesktopCompactFilter({ viewportWidth: 1366, sentinelTop: 80, topOffset }),
    true,
  );
  assert.equal(
    shouldShowDesktopCompactFilter({ viewportWidth: 1366, sentinelTop: 140, topOffset }),
    false,
  );
});
