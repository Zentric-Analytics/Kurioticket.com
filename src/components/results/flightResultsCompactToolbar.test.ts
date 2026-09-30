import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopMinimizedSearchBarSource() {
  const start = source.indexOf("function renderDesktopMinimizedSearchBar()");
  const end = source.indexOf("function renderStickySearchPopoutOverlay()", start);

  assert.notEqual(start, -1, "desktop minimized search bar renderer exists");
  assert.notEqual(end, -1, "sticky popout renderer follows minimized bar");

  return source.slice(start, end);
}

test("desktop sticky compact search is a small four-section toolbar without trip type", () => {
  const toolbar = desktopMinimizedSearchBarSource();

  assert.match(toolbar, /max-w-\[820px\]/);
  assert.match(
    toolbar,
    /grid-cols-\[minmax\(220px,1\.5fr\)_minmax\(150px,0\.9fr\)_minmax\(160px,1fr\)_92px\]/,
  );
  assert.match(toolbar, /h-\[58px\]/);
  assert.match(toolbar, /h-10 w-\[92px\]/);
  assert.match(toolbar, /top-0/);
  assert.match(toolbar, /rounded-lg/);
  assert.match(toolbar, /openStickySearchEditor\(event, "route"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event, "dates"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event, "travelers"\)/);
  assert.doesNotMatch(toolbar, /t\("tripType"\)/);
  assert.doesNotMatch(toolbar, /mobileTripTypeSummary/);
  assert.equal(toolbar.match(/text-slate-500/g)?.length, 3);
  assert.doesNotMatch(toolbar, /text-\[#004BB8\]/);
});


function stickyEditorCallbackSource() {
  const start = source.indexOf("const openStickySearchEditor = useCallback(");
  const end = source.indexOf("const isStickySearchPanelOpen", start);

  assert.notEqual(start, -1, "sticky editor callback exists");
  assert.notEqual(end, -1, "sticky panel open state follows editor callback");

  return source.slice(start, end);
}

test("desktop sticky compact search opens the selected control on the first click", () => {
  const callback = stickyEditorCallbackSource();

  assert.match(callback, /target: "route" \| "dates" \| "travelers"/);
  assert.match(callback, /setActiveDatePicker\(target === "dates" \? "departure" : null\)/);
  assert.match(callback, /setTravelerPopoverOpen\(target === "travelers"\)/);
  assert.match(callback, /target === "route" && originInput\.trim\(\)\.length >= 2/);
  assert.match(callback, /stickySearchLauncherRef\.current = event\.currentTarget/);
  assert.match(callback, /pendingStickySearchTargetRef\.current = target/);
});

test("sticky search moves focus directly to the requested expanded control", () => {
  assert.match(source, /pendingTarget === "route"/);
  assert.match(source, /querySelector<HTMLInputElement>\("input"\)/);
  assert.match(source, /pendingTarget === "dates"/);
  assert.match(source, /stickyDateButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /pendingTarget === "travelers"/);
  assert.match(source, /stickyTravelerButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test("compact toolbar fields do not add colored focus surrounds", () => {
  const toolbar = desktopMinimizedSearchBarSource();

  assert.match(toolbar, /focus-visible:outline-none/);
  assert.doesNotMatch(toolbar, /focus-ring flex h-\[56px\]/);
  assert.doesNotMatch(toolbar, /focus-visible:bg-slate/);
});

test("sticky editor exposes all trip types in production order and closes from the backdrop", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);
  const roundTrip = popout.indexOf('label: t("roundTrip")');
  const oneWay = popout.indexOf('label: t("oneWay")');
  const multiCity = popout.indexOf('label: t("multiCity")');

  assert.ok(roundTrip >= 0 && roundTrip < oneWay && oneWay < multiCity);
  assert.match(popout, /role="radio"/);
  assert.match(popout, /aria-checked=\{selected\}/);
  assert.match(popout, /onClick=\{\(\) => handleTripTypeChange\(option\.value\)\}/);
  assert.match(
    popout,
    /if \(event\.target === event\.currentTarget\) \{\s*collapseStickySearch\(\)/,
  );
  assert.doesNotMatch(popout, /focus-within:ring-\[#004BB8\]/);
});

test("sticky search popout uses neutral dialog focus and returns focus to trigger", () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(
    source,
    /stickySearchCloseButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(source, /stickySearchLauncherRef\.current\?\.focus\(\)/);
});

test("sticky search popout matches mobile edit-search color language", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.match(popout, /bg-\[#F5F7FB\]/);
  assert.match(popout, /text-\[#56658E\]/);
  assert.match(popout, /grid min-h-\[51px\] w-full grid-cols-3 items-stretch/);
  assert.match(popout, /flight-results-trip-tab/);
  assert.match(popout, /border-\[#064CF7\] text-\[#064CF7\]/);
  assert.match(popout, /border-transparent text-\[#071A48\]/);
  assert.match(popout, /border border-\[#E7ECF5\] bg-white shadow-none/);
  assert.match(popout, /bg-\[#064CF7\][^\n]*text-white/);
});

test("sticky search popout uses neutral field icons and keeps the calendar controls in view", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.equal(popout.match(/<MapPin aria-hidden="true"/g)?.length, 2);
  assert.match(popout, /<Calendar aria-hidden="true" className="h-\[18px\] w-\[18px\] shrink-0 text-\[#071A48\]"/);
  assert.match(popout, /<UserRound aria-hidden="true" className="h-\[18px\] w-\[18px\] shrink-0 text-\[#071A48\]"/);
  assert.match(popout, /min-h-\[66px\][^"]*border-r border-\[#E7ECF5\][^"]*bg-white px-3 py-\[9px\]/);
  assert.doesNotMatch(popout, /text-\[#5CB6B2\]|text-\[#39948F\]/);
  assert.match(popout, /pb-8 pt-12 xl:pt-16/);
});


test("sticky change-flight overlay centers a black title", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.match(
    popout,
    /locale\?\.startsWith\("en"\) \? "Change your flight" : t\("editFlightSearch"\)/,
  );
  assert.match(
    popout,
    /id="sticky-flight-search-title"[\s\S]*text-xl font-bold tracking-tight text-black/,
  );
  assert.match(popout, /mx-auto max-w-2xl text-center/);
  assert.doesNotMatch(popout, /t\("searchFlights"\)/);
  assert.doesNotMatch(popout, /\{mobileRouteSummary\}/);
  assert.doesNotMatch(
    popout,
    /\{stickyDateSummary\}\s*·\s*\{travelerCabinSummary\}/,
  );
});

test("sticky multi-city selection renders the real multi-city editor", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.match(
    popout,
    /tripTypeInput === "multi-city"[\s\S]*data-sticky-multicity-editor/,
  );
  assert.match(
    popout,
    /<MultiCityFlightEditor[\s\S]*legs=\{multiCityLegs\}[\s\S]*onChange=\{setMultiCityLegs\}[\s\S]*presentation="results"/,
  );
  assert.match(
    popout,
    /minimumDate=\{formatDateValue\(new Date\(\)\)\}/,
  );
  assert.match(
    popout,
    /data-sticky-multicity-editor[\s\S]*travelerCabinSummary[\s\S]*<TravelerCabinPopover/,
  );
  assert.match(
    popout,
    /data-sticky-multicity-editor[\s\S]*<Button[\s\S]*type="submit"[\s\S]*\{t\("search"\)\}/,
  );
});


test("sticky multi-city overlay is the sole validator and stays reachable on short viewports", () => {
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);
  const compactStart = source.indexOf('if (placement === "desktop" && tripTypeInput === "multi-city")');
  const compactEnd = source.indexOf('if (tripTypeInput === "multi-city")', compactStart + 1);
  const compactMultiCity = source.slice(compactStart, compactEnd);

  assert.match(
    popout,
    /max-h-\[calc\(100dvh-6rem\)\][^"]*overflow-y-auto[^"]*overscroll-contain/,
  );
  assert.match(
    compactMultiCity,
    /if \(isStickySearchPanelOpen\) return null;/,
  );
  assert.equal(
    popout.match(/onAirportValidityChange=\{setMultiCityAirportsValid\}/g)?.length,
    1,
  );
});


test("desktop change-flight fields reuse mobile Results typography and card tokens", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(
    popout,
    /text-\[10px\] font-extrabold uppercase leading-\[14px\] tracking-\[0\.5px\] text-\[#56658E\]/,
  );
  assert.match(popout, /flight-results-edit-value mt-0\.5/);
  assert.equal(
    popout.match(/MapPin aria-hidden="true" className="h-\[18px\] w-\[18px\] shrink-0 text-\[#071A48\]"/g)?.length,
    2,
  );
  assert.match(popout, /rounded-\[13px\] border border-\[#E7ECF5\] bg-white shadow-none/);
});
