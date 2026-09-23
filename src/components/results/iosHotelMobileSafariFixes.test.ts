import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const mobileDetailsSource = readFileSync(
  new URL("./hotelDetails/MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);
const stayEditorSource = readFileSync(
  new URL("./hotelDetails/MobileHotelStayEditor.tsx", import.meta.url),
  "utf8",
);
const iosGuardSource = readFileSync(
  new URL("../../lib/hotels/iosHotelMobileWeb.ts", import.meta.url),
  "utf8",
);

test("iOS Hotel dialogs focus the dialog surface instead of the close X", () => {
  assert.match(iosGuardSource, /iPad\|iPhone\|iPod/);
  assert.match(iosGuardSource, /MacIntel/);
  assert.match(iosGuardSource, /maxTouchPoints > 1/);

  assert.match(mobileDetailsSource, /isIosHotelMobileWeb\(\)\) dialog\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(mobileDetailsSource, /<dialog ref=\{ref\} tabIndex=\{-1\}/);

  assert.match(stayEditorSource, /if \(isIosHotelMobileWeb\(\)\) dialogRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stayEditorSource, /else closeRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(stayEditorSource, /<dialog ref=\{dialogRef\} tabIndex=\{-1\}/);
});

test("Hotel Results no longer carries an iOS-only quick-filter rail workaround", () => {
  assert.doesNotMatch(resultsSource, /mobileShortcutRailRef|clampIosHotelShortcutRail|rail\.scrollLeft/);
  assert.match(resultsSource, /data-hotel-results-toolbar/);
  assert.match(resultsSource, /scrollbar-hide -me-4 flex w-\[calc\(100%\+1rem\)\] flex-nowrap gap-1\.5 overflow-x-auto overscroll-x-contain pe-4/);
});
