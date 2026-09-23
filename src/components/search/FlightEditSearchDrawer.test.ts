import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightEditSearchDrawer.tsx", import.meta.url),
  "utf8",
);

test("shared mobile flight editor retains the approved drawer structure", () => {
  assert.match(source, /id="flight-mobile-search-title"/);
  assert.match(source, /resultsMode \? "Change your search" : t\("editFlightSearch"\)/);
  assert.match(source, /aria-label=\{t\("closeEditSearch"\)\}/);
  assert.match(source, /data-mobile-trip-type-grid/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /role="radiogroup"[\s\S]*?aria-label=\{t\("tripType"\)\}/);
  assert.match(source, /role="radio"[\s\S]*?aria-checked=/);
  assert.match(source, /whitespace-nowrap/);
  for (const key of ["roundTrip", "oneWay", "multiCity"])
    assert.ok(source.includes(`t("${key}")`));
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

test("Results bottom sheet mirrors native floating modal geometry while fullscreen remains the default", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /createPortal\(overlay, document\.body\)/);
  assert.match(source, /data-mobile-results-overlay-root/);
  assert.match(source, /style=\{bottomSheet \? \{ backgroundColor: "rgba\(8, 18, 35, 0\.52\)" \} : undefined\}/);
  assert.match(source, /mx-3 mb-3/);
  assert.match(source, /max-h-\[88dvh\]/);
  assert.match(source, /w-\[calc\(100%_-_1\.5rem\)\]/);
  assert.match(source, /rounded-\[24px\] bg-\[#F5F7FB\]/);
  assert.match(source, /resultsMode \? "Change your search" : t\("editFlightSearch"\)/);
  assert.match(source, /text-\[19px\] font-semibold leading-6/);
  assert.match(source, /min-h-\[52px\]/);
  assert.match(source, /h-\[23px\] w-\[23px\]/);
  assert.doesNotMatch(source, /mobile-results-sheet-backdrop-clean/);
  assert.doesNotMatch(source, /data-flight-edit-bottom-continuation|data-mobile-results-sheet-bottom-continuation/);
  assert.match(source, /mobile-results-sheet-backdrop/);
  assert.match(source, /mobile-results-sheet-surface-smooth/);
  assert.match(source, /mobile-results-sheet-backdrop-closing/);
  assert.match(source, /mobile-results-sheet-surface-closing/);
  assert.doesNotMatch(source, /!hasEntered/);
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
  const timerIndex = closeHelper.indexOf("window.setTimeout(finishClose, 280)");
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

test("Results flight fields mirror native results-modal density", () => {
  assert.match(source, /resultsMode[\s\S]*?min-h-\[72px\]/);
  assert.match(source, /text-\[11px\] font-bold uppercase leading-\[15px\] tracking-\[0\.1em\] text-\[#56658E\]/);
  assert.match(source, /grid-cols-\[18px_minmax\(0,1fr\)_16px\]/);
  assert.match(source, /h-\[18px\] w-\[18px\] text-\[#071A48\]/);
  assert.match(source, /rounded-\[13px\] border border-\[#E7ECF5\] bg-white/);
  assert.match(source, /ChevronRight className="h-4 w-4 text-\[#071A48\]"/);
});

test("Results mode copies native route/date/traveler grouping and trip tabs", () => {
  assert.match(source, /resultsMode\?: boolean/);
  assert.match(source, /resultsMode = false/);
  const groupStart = source.indexOf("data-flight-results-edit-fields");
  const groupEnd = source.indexOf("            ) : (", groupStart);
  const group = source.slice(groupStart, groupEnd);
  const fields = ["origin", "destination", "dates", "travelers"].map((field) =>
    group.indexOf(`data-mobile-field="${field}"`),
  );
  assert.ok(fields.every((index) => index >= 0));
  assert.deepEqual(fields, [...fields].sort((a, b) => a - b));

  const routeStart = group.indexOf("data-mobile-route-fields");
  const dateGroupStart = group.indexOf("data-mobile-results-edit-group", routeStart);
  const route = group.slice(routeStart, dateGroupStart);
  assert.match(route, /data-mobile-field="origin"[\s\S]*data-mobile-swap-control[\s\S]*data-mobile-field="destination"/);
  assert.doesNotMatch(route, /data-mobile-field="dates"|data-mobile-field="travelers"/);
  assert.match(group, /data-mobile-field="dates"[\s\S]*data-mobile-results-edit-group[\s\S]*data-mobile-field="travelers"/);
  assert.equal((group.match(/data-mobile-results-edit-group/g) ?? []).length, 2);
  assert.match(group, /rounded-\[13px\] border border-\[#E7ECF5\]/);
  assert.match(group, /h-9 w-9[\s\S]*shadow-\[0_2px_4px_rgba\(24,48,91,0\.12\)\]/);

  assert.match(source, /resultsMode \? "grid min-h-\[51px\]/);
  assert.match(source, /min-h-\[50px\][\s\S]*border-b-2/);
  assert.match(source, /border-\[#064CF7\] font-extrabold text-\[#064CF7\]/);
  assert.match(source, /\{!resultsMode \? \([\s\S]*?h-\[18px\] w-\[18px\]/);
  assert.match(source, /resultsMode \? t\("searchFlights"\) : t\("search"\)/);
  assert.match(source, /min-h-\[54px\].*rounded-\[9px\].*bg-\[#064CF7\].*font-extrabold/);
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
    /onClick=\{\(\) => setTravelerPickerOpen\(false\)\}[\s\S]*?>\s*\{t\("done"\)\}/,
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
