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
    panelHeight: 300, ...overrides,
  });

test("places below the card and matches the field", () => {
  assert.deepEqual(geometry(), { left: 100, top: 270, width: 300, maxHeight: 514, placement: "below" });
});

test("places above when below is insufficient", () => {
  const result = geometry({ boundaryRect: rect(50, 500, 900, 180), viewportHeight: 720 });
  assert.equal(result.placement, "above");
  assert.equal(result.maxHeight, 474);
  assert.equal(result.top, 190);
});

test("clamps at both horizontal viewport edges", () => {
  assert.equal(geometry({ fieldRect: rect(-50, 100, 300, 60) }).left, 16);
  assert.equal(geometry({ fieldRect: rect(1100, 100, 300, 60) }).left, 884);
});

test("shrinks safely on narrow and degenerate viewports", () => {
  assert.equal(geometry({ viewportWidth: 220, fieldRect: rect(20, 0, 400, 40) }).width, 188);
  const result = geometry({ viewportWidth: 10, viewportHeight: 10 });
  assert.equal(result.width, 0);
  assert.equal(result.maxHeight, 0);
});

test("uses actual available height above and below", () => {
  assert.equal(geometry().maxHeight, 514);
  assert.equal(geometry({ boundaryRect: rect(0, 600, 900, 100), viewportHeight: 730 }).maxHeight, 574);
});

test("is stable before the panel has been measured", () => {
  assert.deepEqual(geometry({ panelHeight: undefined }), geometry({ panelHeight: 320 }));
});
