import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = readFileSync(new URL("./CarsResultsClient.tsx", import.meta.url), "utf8");
test("source-contract: Cars compact filters use shared fixed and docked lifecycle", () => {
  assert.doesNotMatch(source, /useDesktopFilterShortcut|DesktopFilterShortcut|Edit filters/);
  assert.match(source, /desktopCompactFilterTopOffset = 116/);
  assert.match(source, /desktopCompactFilterBottomGap = 16/);
  assert.match(source, /shouldShowDesktopCompactFilter/);
  assert.match(source, /calculateCompactFilterPlacement/);
  assert.match(source, /calculateCompactFilterMaxHeight/);
  assert.match(source, /"fixed" : "absolute inset-x-0 bottom-0 w-full"/);
  assert.match(source, /layout: "desktop" \| "compact" \| "mobile"/);
  assert.match(source, /aria-expanded=\{compactOpen\} aria-controls=\{panelId\}/);
  assert.match(source, /hidden=\{layout === "compact" && !compactOpen\}/);
  assert.equal((source.match(/id: "(?:vehicleType|transmission|seats|bags|fuelPolicy|mileagePolicy|cancellation|pickupLocationType)"/g) ?? []).length, 8);
});
