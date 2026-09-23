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

test("iOS Hotel quick-filter row is locked to the results background during touch gestures", () => {
  assert.match(resultsSource, /const \[lockIosHotelShortcutRow, setLockIosHotelShortcutRow\] = useState\(false\)/);
  assert.match(resultsSource, /setLockIosHotelShortcutRow\(isIosHotelMobileWeb\(\)\)/);
  assert.match(resultsSource, /lockIosHotelShortcutRow[\s\S]*?"overflow-x-hidden touch-pan-y"/);
  assert.match(resultsSource, /lockIosHotelShortcutRow \? "w-full min-w-0" : "min-w-max"/);
  assert.match(resultsSource, /lockIosHotelShortcutRow[\s\S]*?"min-w-0 flex-1 px-1/);
  assert.doesNotMatch(resultsSource, /mobileShortcutRailRef|clampIosHotelShortcutRail|rail\.scrollLeft/);
  assert.doesNotMatch(resultsSource, /onScroll=\{clampIosHotelShortcutRail\}|onTouchEnd=.*clampIosHotelShortcutRail/);
});
