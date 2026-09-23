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

test("iOS Hotel quick-filter rail clamps elastic scroll without disabling horizontal swipe", () => {
  assert.match(resultsSource, /const mobileShortcutRailRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(resultsSource, /const clampIosHotelShortcutRail = useCallback/);
  assert.match(resultsSource, /if \(!isIosHotelMobileWeb\(\)\) return/);
  assert.match(resultsSource, /Math\.max\(0, rail\.scrollWidth - rail\.clientWidth\)/);
  assert.match(resultsSource, /Math\.min\(maxScrollLeft, Math\.max\(0, rail\.scrollLeft\)\)/);
  assert.match(resultsSource, /onScroll=\{clampIosHotelShortcutRail\}/);
  assert.match(resultsSource, /onTouchEnd=\{\(\) => window\.requestAnimationFrame\(clampIosHotelShortcutRail\)\}/);
  assert.match(resultsSource, /overflow-x-auto overscroll-x-contain/);
});
