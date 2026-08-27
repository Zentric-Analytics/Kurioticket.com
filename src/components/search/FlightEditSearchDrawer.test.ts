import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./FlightEditSearchDrawer.tsx", import.meta.url), "utf8");

test("shared mobile flight editor retains the approved drawer structure", () => {
  assert.match(source, /id="flight-mobile-search-title"/);
  assert.match(source, />Edit flight search</);
  assert.match(source, /aria-label="Close edit search"/);
  assert.match(source, /data-mobile-trip-type-grid/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /role="radiogroup" aria-label="Trip type"/);
  assert.match(source, /role="radio" aria-checked=/);
  assert.match(source, /whitespace-nowrap/);
  for (const label of ["Round-trip", "One-way", "Multi-city"]) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, /data-mobile-trip-type-grid[^>]*(?:flex-col|grid-cols-1)/);
  assert.doesNotMatch(source, /<(?:select|option)[^>]*>[^<]*(?:Round-trip|One-way|Multi-city)/);
  for (const field of ["origin", "destination", "dates", "travelers"]) assert.match(source, new RegExp(`data-mobile-field="${field}"`));
  assert.match(source, /data-mobile-swap-control/);
  assert.match(source, /overflow-x-hidden overflow-y-auto/);
});

test("shared editor supports a Details-only bottom sheet while fullscreen remains the default", () => {
  assert.match(source, /presentation\?: "fullscreen" \| "bottom-sheet"/);
  assert.match(source, /presentation = "fullscreen"/);
  assert.match(source, /data-flight-edit-presentation=\{presentation\}/);
  assert.match(source, /h-\[94dvh\] max-h-\[94dvh\]/);
  assert.match(source, /rounded-t-\[22px\]/);
  assert.match(source, /bg-slate-950\/35/);
  assert.match(source, /translate-y-full/);
  assert.match(source, /duration-200/);
});

test("bottom sheet snapshots and restores the document and exact page position", () => {
  assert.match(source, /const scrollX = window\.scrollX/);
  assert.match(source, /const scrollY = window\.scrollY/);
  assert.match(source, /const bodyStyle = body\.getAttribute\("style"\)/);
  assert.match(source, /const rootStyle = root\.getAttribute\("style"\)/);
  assert.match(source, /position: "fixed"/);
  assert.match(source, /top: `-\$\{scrollY\}px`/);
  assert.match(source, /body\.setAttribute\("style", bodyStyle\)/);
  assert.match(source, /root\.setAttribute\("style", rootStyle\)/);
  assert.match(source, /window\.scrollTo\(scrollX, scrollY\)/);
  assert.doesNotMatch(source, /touchAction:\s*"none"/);
  assert.match(source, /return restore/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
});

test("shared editor uses canonical mobile pickers and multi-city editor", () => {
  assert.match(source, /<MobileAirportPicker/);
  assert.match(source, /<MobileDatePickerDialog/);
  assert.match(source, /<MobileTravelerCabinPicker/);
  assert.match(source, /<FlightMobilePickerShell/);
  assert.match(source, /<MultiCityFlightEditor/);
  assert.match(source, /MULTI_CITY_MIN_LEGS/);
  assert.match(source, /MULTI_CITY_MAX_LEGS/);
});
