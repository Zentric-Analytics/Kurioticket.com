import assert from "node:assert/strict";
import test from "node:test";

import { calculateDesktopPopoverGeometry, calculateLocationPanelScrollAdjustment } from "./desktopPopoverPosition";

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
  assert.deepEqual(geometry(), { left: 100, top: 270, width: 300, maxHeight: 514, placement: "below" });
});

test("opens directly above with the configured gap when below is too short", () => {
  const boundaryRect = rect(50, 500, 900, 180);
  const result = geometry({ boundaryRect, fieldRect: rect(400, 500, 200, 78), viewportHeight: 720, desiredHeight: 350, gap: 8 });

  assert.equal(result.placement, "above");
  assert.equal(result.top, boundaryRect.top - 8 - 350);
  assert.equal(result.maxHeight, boundaryRect.top - 8 - 16);
});

test("keeps a small message panel adjacent rather than allocating its desired height", () => {
  const boundaryRect = rect(50, 500, 900, 78);
  const result = geometry({ boundaryRect, viewportHeight: 640, desiredHeight: 30, gap: 8 });

  assert.equal(result.placement, "below");
  assert.equal(result.top, boundaryRect.bottom + 8);
  assert.equal(result.maxHeight, 38);
  assert.notEqual(result.maxHeight, 30);
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

test("preferred panel height only decides placement and never forces expansion", () => {
  const result = geometry({ boundaryRect: rect(0, 260, 900, 60), viewportHeight: 800, desiredHeight: 120 });
  assert.equal(result.placement, "below");
  assert.equal(result.maxHeight, 454);
  assert.ok(result.maxHeight > 120);
});

test("scrolls only enough to expose the minimum location panel height", () => {
  assert.equal(calculateLocationPanelScrollAdjustment({
    boundaryRect: rect(20, 500, 900, 180), viewportHeight: 720, viewportPadding: 16, gap: 10,
  }), 146);
});

test("does not scroll when the minimum panel height already fits", () => {
  assert.equal(calculateLocationPanelScrollAdjustment({
    boundaryRect: rect(20, 200, 900, 180), viewportHeight: 720, viewportPadding: 16, gap: 10,
  }), 0);
});

test("limits corrective scrolling to the boundary's useful top space", () => {
  assert.equal(calculateLocationPanelScrollAdjustment({
    boundaryRect: rect(20, 30, 900, 700), viewportHeight: 400, viewportPadding: 16, gap: 10,
  }), 14);
});

test("corrective scrolling is always finite and nonnegative", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const adjustment = calculateLocationPanelScrollAdjustment({
      boundaryRect: { ...rect(0, 0, 0, 0), top: value, bottom: value }, viewportHeight: value, viewportPadding: value, gap: value,
    });
    assert.ok(Number.isFinite(adjustment));
    assert.ok(adjustment >= 0);
  }
});
