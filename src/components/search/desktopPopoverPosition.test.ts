import assert from "node:assert/strict";
import test from "node:test";

import { calculateDesktopPopoverGeometry } from "./desktopPopoverPosition";

const rect = (left: number, top: number, width: number, height: number) => ({
  left, right: left + width, top, bottom: top + height, width, height,
});

const geometry = (overrides: Partial<Parameters<typeof calculateDesktopPopoverGeometry>[0]> = {}) =>
  calculateDesktopPopoverGeometry({
    fieldRect: rect(100, 100, 300, 60), boundaryRect: rect(50, 80, 900, 180),
    viewportWidth: 1200, viewportHeight: 800, viewportPadding: 16, gap: 10,
    ...overrides,
  });

test("begins below the complete search card and matches the field", () => {
  assert.deepEqual(geometry(), { left: 100, top: 270, width: 300, maxHeight: 514 });
});

test("remains below when there is much more room above the card", () => {
  const boundaryRect = rect(50, 500, 900, 180);
  const result = geometry({ boundaryRect, viewportHeight: 720 });

  assert.equal(result.top, boundaryRect.bottom + 10);
  assert.equal(result.maxHeight, 14);
});

test("remains below on a short-height viewport", () => {
  const boundaryRect = rect(50, 300, 900, 180);
  const result = geometry({ boundaryRect, viewportHeight: 400 });

  assert.equal(result.top, 490);
  assert.equal(result.maxHeight, 0);
});

test("always derives top from the boundary bottom and gap", () => {
  for (const boundaryRect of [rect(0, 0, 900, 100), rect(0, 275, 900, 125), rect(0, 900, 900, 50)]) {
    assert.equal(geometry({ boundaryRect, gap: 12 }).top, boundaryRect.bottom + 12);
  }
});

test("uses the actual viewport space below as maxHeight", () => {
  assert.equal(geometry().maxHeight, 800 - 16 - 260 - 10);
  assert.equal(geometry({ boundaryRect: rect(0, 600, 900, 100), viewportHeight: 730 }).maxHeight, 4);
});

test("never returns a negative maxHeight", () => {
  assert.equal(geometry({ boundaryRect: rect(0, 800, 900, 100), viewportHeight: 730 }).maxHeight, 0);
});

test("clamps the left edge to the viewport padding", () => {
  assert.equal(geometry({ fieldRect: rect(-50, 100, 300, 60) }).left, 16);
});

test("clamps the right edge to the viewport padding", () => {
  assert.equal(geometry({ fieldRect: rect(1100, 100, 300, 60) }).left, 884);
});

test("matches the field width when space permits", () => {
  assert.equal(geometry({ fieldRect: rect(100, 100, 420, 60) }).width, 420);
});

test("shrinks safely on narrow and degenerate viewports", () => {
  assert.equal(geometry({ viewportWidth: 220, fieldRect: rect(20, 0, 400, 40) }).width, 188);
  const result = geometry({ viewportWidth: 10, viewportHeight: 10 });
  assert.equal(result.width, 0);
  assert.equal(result.maxHeight, 0);
});

test("does not need a measured panel height for below-only placement", () => {
  assert.deepEqual(Object.keys(geometry()).sort(), ["left", "maxHeight", "top", "width"]);
});

test("never returns an above placement", () => {
  assert.equal("placement" in geometry({ boundaryRect: rect(0, 700, 900, 100) }), false);
});
