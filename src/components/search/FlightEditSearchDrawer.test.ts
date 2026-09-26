import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./FlightEditSearchDrawer.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

test("shared mobile flight editor retains the approved drawer structure", () => {
  assert.match(source, /id="flight-mobile-search-title"/);
  assert.match(source, /resultsMode \? "Change your search" : t\("editFlightSearch"\)/);
  assert.match(source, /aria-label=\{t\("closeEditSearch"\)\}/);
  assert.match(source, /data-mobile-trip-type-grid/);
  assert.match(source, /grid-cols-3/);
  assert.match(source, /role=\{resultsMode \? "tablist" : "radiogroup"\}[\s\S]*?aria-label=\{t\("tripType"\)\}/);
  assert.match(source, /role=\{resultsMode \? "tab" : "radio"\}[\s\S]*?aria-checked=/);
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

test("Results bottom sheet matches the native floating-sheet geometry", () => {
  assert.match(source, /import \{ createPortal \} from "react-dom"/);
  assert.match(source, /createPortal\(overlay, document\.body\)/);
  assert.match(source, /data-mobile-results-overlay-root/);
  assert.match(source, /style=\{bottomSheet \? \{ backgroundColor: "rgba\(8, 18, 35, 0\.52\)" \} : undefined\}/);
  assert.match(source, /items-end/);
  assert.match(source, /max-h-\[88dvh\]/);
  assert.match(source, /mb-3 ml-3 mr-3 flex max-h-\[88dvh\]/);
  assert.match(source, /w-\[calc\(100%_-_24px\)\]/);
  assert.match(source, /overflow-hidden rounded-\[24px\]/);
  assert.match(source, /rounded-\[24px\] bg-\[#F5F7FB\]/);
  assert.match(source, /resultsMode \? "Change your search" : t\("editFlightSearch"\)/);
  assert.match(source, /data-flight-results-edit-title/);
  assert.match(source, /flight-results-edit-title pointer-events-none absolute inset-x-12 text-center/);
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

test("bottom sheet keeps the shared lock through its closing animation", () => {
  assert.match(
    source,
    /useLayoutEffect\(\(\) => \{[\s\S]*?acquireMobileResultsScrollLock\(\)/,
  );
  const closeHelper = source.slice(
    source.indexOf("const closeDrawer"),
    source.indexOf("useLayoutEffect", source.indexOf("const closeDrawer")),
  );
  const closingIndex = closeHelper.indexOf("setIsClosing(true)");
  const timerIndex = closeHelper.indexOf("beginFlightEditSearchClose");
  assert.ok(timerIndex >= 0 && closingIndex > timerIndex);
  assert.doesNotMatch(closeHelper, /scrollLockReleaseRef|requestAnimationFrame|window\.scrollTo/);
  assert.match(
    source,
    /scrollLockReleaseRef\.current\?\.\(\{ restoreScroll: true \}\)/,
  );
  assert.match(source, /closeStartedRef\.current/);
  assert.doesNotMatch(source, /position: "fixed"/);
  assert.doesNotMatch(source, /correctUnderlyingResultsScroll|openingScrollPositionRef/);
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
  assert.match(source, /resultsMode[\s\S]*?min-h-\[66px\]/);
  assert.match(source, /px-3 py-\[9px\]/);
  assert.match(source, /text-\[10px\] font-extrabold uppercase leading-\[14px\] tracking-\[0\.5px\] text-\[#56658E\]/);
  assert.match(source, /flightResultsEditValueClassName/);
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
  assert.match(group, /flight-results-edit-surface[^"]*bg-white/);
  assert.match(
    group,
    /data-mobile-swap-control[\s\S]*?rounded-full bg-white[\s\S]*?h-9 w-9/,
  );
  assert.match(group, /data-mobile-swap-control[\s\S]*?!border-t-0/);

  assert.match(source, /resultsMode \? "grid min-h-\[51px\]/);
  assert.match(source, /min-h-\[50px\][\s\S]*border-b-2/);
  assert.match(source, /role=\{resultsMode \? "tablist" : "radiogroup"\}/);
  assert.match(source, /role=\{resultsMode \? "tab" : "radio"\}/);
  assert.match(source, /aria-selected=\{resultsMode \? draft\.tripType === value : undefined\}/);
  assert.match(source, /flight-results-trip-tab inline-flex min-h-\[50px\]/);
  assert.match(source, /border-\[#064CF7\] text-\[#064CF7\]/);
  assert.doesNotMatch(source, /border-\[#064CF7\] font-(?:bold|extrabold)/);
  assert.match(source, /\{!resultsMode \? \([\s\S]*?h-\[18px\] w-\[18px\]/);
  assert.match(source, /resultsMode \? t\("searchFlights"\) : t\("search"\)/);
  assert.match(source, /min-h-\[54px\].*rounded-\[9px\].*bg-\[#064CF7\].*font-extrabold/);
  assert.match(source, /className=\{resultsMode \? "p-2 pt-4" : undefined\}/);
  assert.match(styles, /\.flight-results-trip-tab \{[\s\S]*?font-size: 10px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?text-size-adjust: none;/);
  assert.match(styles, /\.flight-results-edit-title \{[\s\S]*?font-size: 17px !important;[\s\S]*?line-height: 22px !important;[\s\S]*?text-size-adjust: none;/);
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

test("Results Multi-city opts into its dedicated presentation inside the shared drawer", () => {
  const multiCityBranch = source.slice(
    source.indexOf('{draft.tripType === "multi-city" ? ('),
    source.indexOf(") : resultsMode ? (", source.indexOf('{draft.tripType === "multi-city" ? (')),
  );
  assert.match(multiCityBranch, /<MultiCityFlightEditor/);
  assert.match(multiCityBranch, /presentation=\{resultsMode \? "results" : "homepage"\}/);
  assert.doesNotMatch(multiCityBranch, /presentation="homepage"/);
  assert.match(source, /overflow-x-hidden overflow-y-auto/);
});

test("temporary trip-type changes preserve an existing multi-city itinerary", () => {
  assert.match(source, /preservedMultiCityLegsRef = useRef<FlightSearchLeg\[]>/);
  assert.match(source, /preservedMultiCityLegsRef\.current = current\.legs/);
  assert.match(source, /hasPreservedMultiCityJourney/);
  assert.match(source, /\? preservedLegs/);
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
