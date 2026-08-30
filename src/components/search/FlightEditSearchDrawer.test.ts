import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightEditSearchDrawer.tsx", import.meta.url),
  "utf8",
);

test("shared mobile flight editor retains the approved drawer structure", () => {
  assert.match(source, /id="flight-mobile-search-title"/);
  assert.match(source, />\s*Edit flight search\s*</);
  assert.match(source, /aria-label="Close edit search"/);
  assert.match(source, /data-mobile-trip-type-grid/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /role="radiogroup"[\s\S]*?aria-label="Trip type"/);
  assert.match(source, /role="radio"[\s\S]*?aria-checked=/);
  assert.match(source, /whitespace-nowrap/);
  for (const label of ["Round-trip", "One-way", "Multi-city"])
    assert.match(source, new RegExp(label));
  assert.doesNotMatch(
    source,
    /data-mobile-trip-type-grid[^>]*(?:flex-col|grid-cols-1)/,
  );
  assert.doesNotMatch(
    source,
    /<(?:select|option)[^>]*>[^<]*(?:Round-trip|One-way|Multi-city)/,
  );
  for (const field of ["origin", "destination", "dates", "travelers"])
    assert.match(source, new RegExp(`data-mobile-field="${field}"`));
  assert.match(source, /data-mobile-swap-control/);
  assert.match(source, /overflow-x-hidden overflow-y-auto/);
});

test("shared editor supports a Details-only bottom sheet while fullscreen remains the default", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /createPortal\(overlay, document\.body\)/);
  assert.match(source, /mobile-results-overlay-root/);
  assert.match(source, /data-mobile-results-overlay-root/);
  assert.match(source, /fixed inset-0/);
  assert.match(source, /fixed inset-0[^\n]*?min-h-0/);
  assert.doesNotMatch(
    source.match(/bottomSheet \? "([^"]+)/)?.[1] ?? "",
    /h-\[100dvh\]|min-h-\[100svh\]/,
  );
  assert.match(source, /presentation\?: "fullscreen" \| "bottom-sheet"/);
  assert.match(source, /presentation = "fullscreen"/);
  assert.match(source, /data-flight-edit-presentation=\{presentation\}/);
  assert.match(source, /max-h-\[94dvh\]/);
  assert.doesNotMatch(source, /(?:^|\s)h-\[94dvh\]/);
  assert.match(source, /flex min-h-0 w-full min-w-0 flex-col/);
  assert.match(source, /max-h-\[94dvh\]/);
  assert.match(source, /overflow-hidden rounded-t-\[22px\]/);
  assert.match(source, /rounded-t-\[22px\]/);
  assert.match(source, /bg-slate-950\/35/);
  assert.match(source, /data-flight-edit-bottom-continuation/);
  assert.match(
    source,
    /data-flight-edit-bottom-continuation[\s\S]*?mobile-results-sheet-bottom-continuation[\s\S]*?bg-slate-50/,
  );
  assert.doesNotMatch(
    source,
    /mobile-results-overlay-root[^\n]*?(?:opacity-0|transition-opacity)/,
  );
  assert.doesNotMatch(source, /!hasEntered/);
  assert.match(source, /translate-y-full/);
  assert.match(source, /duration-200/);
});

test("bottom sheet uses the shared no-shake lock and delegates launcher focus", () => {
  assert.match(
    source,
    /useLayoutEffect\(\(\) => \{[\s\S]*?acquireMobileResultsScrollLock\(\)/,
  );
  assert.match(
    source,
    /openingScrollPositionRef\.current = \{ x: window\.scrollX, y: window\.scrollY \}/,
  );
  const closeHelper = source.slice(
    source.indexOf("const closeDrawer"),
    source.indexOf("useLayoutEffect", source.indexOf("const closeDrawer")),
  );
  const releaseIndex = closeHelper.indexOf(
    "scrollLockReleaseRef.current?.({ restoreScroll: false })",
  );
  const firstFrameIndex = closeHelper.indexOf("requestAnimationFrame");
  const correctionIndex = closeHelper.indexOf(
    "correctUnderlyingResultsScroll()",
    firstFrameIndex,
  );
  const closingIndex = closeHelper.indexOf("setIsClosing(true)");
  const timerIndex = closeHelper.indexOf("window.setTimeout(finishClose, 200)");
  assert.ok(releaseIndex >= 0 && releaseIndex < firstFrameIndex);
  assert.ok(
    firstFrameIndex < correctionIndex && correctionIndex < closingIndex,
  );
  assert.ok(closingIndex < timerIndex);
  assert.equal(closeHelper.match(/restoreScroll: false/g)?.length, 1);
  assert.match(
    closeHelper,
    /requestAnimationFrame\([\s\S]*?requestAnimationFrame\([\s\S]*?requestAnimationFrame\([\s\S]*?setIsClosing\(true\)/,
  );
  assert.match(
    source,
    /scrollLockReleaseRef\.current\?\.\(\{ restoreScroll: true \}\)/,
  );
  assert.match(source, /isPreparingCloseRef\.current/);
  assert.doesNotMatch(source, /position: "fixed"/);
  assert.match(source, /window\.scrollTo\(\{[\s\S]*?behavior: "auto"/);
  assert.doesNotMatch(source, /touchAction:\s*"none"/);
  assert.match(source, /event\.target === event\.currentTarget/);
  assert.match(source, /event\.key === "Escape"/);
  assert.doesNotMatch(
    source.slice(source.indexOf("type Props"), source.indexOf("const today")),
    /launcherRef/,
  );
  assert.doesNotMatch(
    source.slice(
      source.indexOf("const finishClose"),
      source.indexOf("const closeDrawer"),
    ),
    /focus\(/,
  );
});

test("Results flight fields use compact grouped rows", () => {
  assert.match(source, /data-mobile-results-edit-group/);
  assert.match(source, /min-h-\[60px\]/);
  assert.match(source, /rounded-\[14px\].*border border-slate-200/);
  assert.doesNotMatch(source, /min-h-\[70px\]/);
});

test("Results mode connects all non-multi-city fields while preserving route swap geometry", () => {
  assert.match(source, /resultsMode\?: boolean/);
  assert.match(source, /resultsMode = false/);
  const groupStart = source.indexOf("data-flight-results-edit-fields");
  const groupEnd = source.indexOf(
    "</div>",
    source.indexOf('data-mobile-field="travelers"', groupStart),
  );
  const group = source.slice(groupStart, groupEnd);
  assert.match(
    group,
    /min-w-0 overflow-hidden rounded-\[14px\] border border-slate-200 bg-white/,
  );
  const fields = ["origin", "destination", "dates", "travelers"].map((field) =>
    group.indexOf(`data-mobile-field="${field}"`),
  );
  assert.ok(fields.every((index) => index >= 0));
  assert.deepEqual(
    fields,
    [...fields].sort((a, b) => a - b),
  );
  const routeStart = group.indexOf("data-mobile-route-fields");
  const routeEnd = group.indexOf("</div>", routeStart);
  const route = group.slice(routeStart, routeEnd);
  assert.match(
    route,
    /data-mobile-field="origin"[\s\S]*data-mobile-swap-control[\s\S]*data-mobile-field="destination"/,
  );
  assert.match(
    route,
    /left-1\/2 top-1\/2[\s\S]*-translate-x-1\/2 -translate-y-1\/2/,
  );
  assert.doesNotMatch(
    route,
    /data-mobile-field="dates"|data-mobile-field="travelers"/,
  );
  assert.match(
    group,
    /data-mobile-field="dates"[\s\S]*border-t border-slate-200[\s\S]*data-mobile-field="travelers"/,
  );
});

test("Results airport pickers opt in without changing the shared default flow", () => {
  assert.equal(source.match(/commitOnSelect=\{resultsMode\}/g)?.length, 2);
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

test("traveler picker uses the canonical density and Done uses the local Kurioticket blue treatment", () => {
  assert.doesNotMatch(source, /travelerPickerDensity|density=/);
  assert.match(
    source,
    /pickerMarker="traveler-cabin"[\s\S]*?contentClassName="px-4 py-4"/,
  );
  assert.match(
    source,
    /h-12 w-full rounded-\[11px\] bg-\[#004BB8\].*text-white/,
  );
  assert.match(
    source,
    /onClick=\{\(\) => setTravelerPickerOpen\(false\)\}[\s\S]*?>\s*Done/,
  );
});

test("edit search uses canonical date display helpers instead of raw ISO values", () => {
  assert.match(
    source,
    /formatTravelDateRangeDisplay\([\s\S]*?draft\.departureDate,[\s\S]*?draft\.returnDate,[\s\S]*?locale,?[\s\S]*?\)/,
  );
  assert.match(
    source,
    /formatTravelDateDisplay\(draft\.departureDate, locale\)/,
  );
  assert.doesNotMatch(
    source,
    /`\$\{draft\.departureDate\} – \$\{draft\.returnDate\}`/,
  );
});
