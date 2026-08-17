import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { calculateDesktopPopoverGeometry } from "./desktopPopoverPosition";

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  right: left + width,
  top,
  bottom: top + height,
  width,
  height,
});

const nearBottomGeometry = (desiredHeight: number, preferredWidth: number) =>
  calculateDesktopPopoverGeometry({
    fieldRect: rect(700, 620, 220, 68),
    boundaryRect: rect(700, 620, 220, 68),
    viewportWidth: 1366,
    viewportHeight: 768,
    viewportPadding: 16,
    gap: 10,
    desiredHeight,
    preferredWidth,
  });

test("Hotel dates, guests, and destination panels flip above a low launcher", () => {
  assert.equal(nearBottomGeometry(420, 570).placement, "above");
  assert.equal(nearBottomGeometry(360, 336).placement, "above");
  assert.equal(nearBottomGeometry(320, 420).placement, "above");
});

test("Hotel desktop popovers share portal geometry and attachment behavior", () => {
  const source = readFileSync(
    new URL("./HotelDesktopPopover.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /createPortal/);
  assert.match(source, /calculateDesktopPopoverGeometry/);
  assert.match(source, /addEventListener\("scroll", updateGeometry, true\)/);
  assert.match(source, /transform:[\s\S]*translateY\(-100%\)/);
  assert.match(source, /outsideViewport/);
});

test("Hotel landing protects desktop-only crop and moderate card radius", () => {
  const source = readFileSync(
    new URL("../../app/hotels/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /object-\[50%_55%\]/);
  assert.match(source, /object-\[52%_34%\]/);
  assert.match(source, /rounded-\[14px\]/);
  assert.match(source, /rounded-\[16px\]/);
  assert.doesNotMatch(source, /rounded-\[1\.75rem\]/);
  assert.doesNotMatch(source, /\[&>form>div\]:!rounded-\[1\.75rem\]/);
  assert.doesNotMatch(source, /lg:\[&>form>div\]:!rounded-\[2rem\]/);
});

test("all three desktop Hotel pickers reuse the shared wrapper", () => {
  const source = readFileSync(
    new URL("./HotelSearchBar.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(source.match(/<HotelDesktopPopover/g)?.length, 3);
  assert.match(source, /preferredWidth=\{420\}[\s\S]*desiredHeight=\{320\}/);
  assert.match(source, /preferredWidth=\{570\}[\s\S]*desiredHeight=\{420\}/);
  assert.match(source, /preferredWidth=\{336\}[\s\S]*desiredHeight=\{360\}/);
});
