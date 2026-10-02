import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

function desktopHeaderSearchBarSource() {
  const start = source.indexOf("function renderDesktopHeaderSearchBar()");
  const end = source.indexOf("function renderStickySearchPopoutOverlay()", start);

  assert.notEqual(start, -1, "desktop header search renderer exists");
  assert.notEqual(end, -1, "sticky popout renderer follows header search");

  return source.slice(start, end);
}

test("desktop Flight Results uses the Hotels-style four-section header search", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /data-flight-results-nav-search-form/);
  assert.match(
    toolbar,
    /grid-cols-\[minmax\(0,1\.55fr\)_minmax\(0,1\.15fr\)_minmax\(0,1\.2fr\)_46px\]/,
  );
  assert.match(toolbar, /h-\[44px\]/);
  assert.match(toolbar, /rounded-\[9px\] border border-\[#D8E1EC\]/);
  assert.match(toolbar, /openStickySearchEditor\(event, "route"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event, "dates"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event, "travelers"\)/);
  assert.match(toolbar, /<Search className="h-\[18px\] w-\[18px\]"/);
  assert.doesNotMatch(toolbar, /t\("tripType"\)/);
  assert.doesNotMatch(toolbar, /mobileTripTypeSummary/);
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

test("header search fields use the shared neutral focus treatment", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /focus-ring flex h-\[44px\]/);
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
  assert.match(popout, /data-flight-search-anchored-popout/);
  assert.match(popout, /top: desktopSearchPopoverFrame\.top/);
  assert.match(popout, /left: desktopSearchPopoverFrame\.left/);
  assert.match(popout, /width: desktopSearchPopoverFrame\.width/);
});


test("desktop search editor expands from the navbar instead of opening as a centered modal", () => {
  const callback = stickyEditorCallbackSource();
  const frameStart = source.indexOf("const updateDesktopSearchPopoverFrame = useCallback(");
  const frameEnd = source.indexOf("const openStickySearchEditor = useCallback(", frameStart);
  const frame = source.slice(frameStart, frameEnd);
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.ok(frameStart >= 0 && frameEnd > frameStart);
  assert.match(callback, /closest<HTMLElement>\("\[data-flight-results-nav-search-form\]"\)/);
  assert.match(callback, /updateDesktopSearchPopoverFrame\(compactForm\)/);
  assert.match(frame, /const rect = resolvedCompactForm\.getBoundingClientRect\(\)/);
  assert.match(frame, /const viewportGutter = 16/);
  assert.match(frame, /top: rect\.bottom \+ 4/);
  assert.match(frame, /left: viewportGutter/);
  assert.match(frame, /width: availableWidth/);
  assert.doesNotMatch(frame, /Math\.min\(920|centeredLeft/);
  assert.match(popout, /data-flight-search-anchored-backdrop/);
  assert.match(popout, /bg-slate-950\/\[0\.04\]/);
  assert.match(popout, /data-flight-search-anchored-popout/);
  assert.doesNotMatch(popout, /items-start justify-center px-6 pb-8 pt-12/);
  assert.doesNotMatch(popout, /backdrop-blur-\[2px\]/);
});

test("desktop Flight search expansion uses the viewport instead of a 920px modal cap", () => {
  const frameStart = source.indexOf("const updateDesktopSearchPopoverFrame = useCallback(");
  const frameEnd = source.indexOf("const openStickySearchEditor = useCallback(", frameStart);
  const frame = source.slice(frameStart, frameEnd);
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);

  assert.match(frame, /window\.innerWidth - viewportGutter \* 2/);
  assert.match(frame, /left: viewportGutter/);
  assert.match(frame, /width: availableWidth/);
  assert.doesNotMatch(frame, /920/);
  assert.match(popout, /width: "calc\(100vw - 32px\)"/);
  assert.match(popout, /rounded-\[10px\]/);
  assert.match(popout, /shadow-\[0_12px_28px_-22px_rgba\(15,23,42,0\.28\)\]/);
  assert.doesNotMatch(popout, /rounded-\[14px\]|shadow-\[0_24px_60px/);
});

test("anchored desktop search recomputes on browser resize and closes below desktop", () => {
  assert.match(
    source,
    /window\.addEventListener\("resize", refreshAnchoredFrame\)/,
  );
  assert.match(
    source,
    /window\.visualViewport\?\.addEventListener\("resize", refreshAnchoredFrame\)/,
  );
  assert.match(
    source,
    /if \(window\.innerWidth < 1024\) \{\s*collapseStickySearch\(\);/,
  );
  assert.match(
    source,
    /document\.querySelector<HTMLElement>\(\s*"\[data-flight-results-nav-search-form\]"\s*\)/,
  );
  assert.match(
    source,
    /if \(!updateDesktopSearchPopoverFrame\(compactForm\)\) \{\s*collapseStickySearch\(\);/,
  );
  assert.match(
    source,
    /availableWidth = Math\.max\([\s\S]*?window\.innerWidth - viewportGutter \* 2/,
  );
});

test("sticky change-flight overlay removes the title row to preserve vertical space", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.doesNotMatch(popout, /Change your flight/);
  assert.doesNotMatch(popout, /sticky-flight-search-title/);
  assert.doesNotMatch(popout, /mx-auto max-w-2xl text-center/);
  assert.match(popout, /aria-label=\{t\("editFlightSearch"\)\}/);
  assert.match(popout, /role="radiogroup"[\s\S]*pr-12/);
  assert.match(popout, /stickySearchCloseButtonRef[\s\S]*absolute right-0 top-0 z-10/);
});

test("expanded Flight search gives airport, date, and traveler controls prominent desktop surfaces", () => {
  const dropdownEffectStart = source.indexOf("function updateDropdownPosition");
  const dateEffectStart = source.indexOf("function updateDatePickerPosition");
  const travelerEffectStart = source.indexOf("function updateTravelerPopoverPosition");
  const submitStart = source.indexOf("function handleCompactSearchSubmit");
  const positioning = source.slice(dropdownEffectStart, submitStart);
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);
  const datePickerStart = source.indexOf("function DatePickerPopover");
  const travelerStart = source.indexOf("function TravelerCabinPopover");
  const suggestionStart = source.indexOf("function SuggestionList");
  const componentSource = source.slice(datePickerStart, suggestionStart);

  assert.ok(dropdownEffectStart >= 0);
  assert.ok(dateEffectStart > dropdownEffectStart);
  assert.ok(travelerEffectStart > dateEffectStart);
  assert.match(positioning, /preferredWidth = useStickyWrap \? 560 : 380/);
  assert.match(positioning, /preferredWidth = useStickyTrigger \? 920 : 620/);
  assert.match(positioning, /stickyDateButtonRef\.current/);
  assert.match(positioning, /preferredWidth = useStickyTrigger \? 480 : 360/);
  assert.match(positioning, /stickyTravelerButtonRef\.current/);
  assert.match(
    positioning,
    /\}, \[activeDatePicker, activeDesktopSearchSurface\]\);/,
  );
  assert.match(
    positioning,
    /\}, \[activeDesktopSearchSurface, travelerPopoverOpen\]\);/,
  );

  assert.match(
    popout,
    /id="sticky-flight-origin-suggestions"[\s\S]*?position=\{[\s\S]*?dropdownPosition/,
  );
  assert.match(
    popout,
    /id="sticky-flight-destination-suggestions"[\s\S]*?position=\{[\s\S]*?dropdownPosition/,
  );
  assert.doesNotMatch(
    popout,
    /id="sticky-flight-(?:origin|destination)-suggestions"[\s\S]{0,120}?alignToField/,
  );
  assert.match(
    popout,
    /<DatePickerPopover[\s\S]*?prominentDesktop[\s\S]*?datePickerPosition/,
  );
  assert.match(
    popout,
    /<TravelerCabinPopover[\s\S]*?prominentDesktop[\s\S]*?travelerPopoverPosition/,
  );

  assert.match(
    componentSource,
    /prominentDesktop \?\s*"max-w-none rounded-xl p-4"/,
  );
  assert.match(
    componentSource,
    /prominentDesktop = false/,
  );
});

test("prominent desktop calendar stays compact and keeps its footer visible", () => {
  const dateStart = source.indexOf("function DatePickerPopover");
  const dateEnd = source.indexOf("function TravelerCabinPopover", dateStart);
  const datePicker = source.slice(dateStart, dateEnd);

  assert.match(source, /preferredWidth = useStickyTrigger \? 780 : 620/);
  assert.match(
    datePicker,
    /maxHeight: `min\(520px, calc\(100dvh - \$\{position\.top \+ 16\}px\)\)`/,
  );
  assert.match(
    datePicker,
    /prominentDesktop[\s\S]*?"max-w-none overflow-y-auto overscroll-contain rounded-xl p-3"/,
  );
  assert.match(datePicker, /prominentDesktop \? "mb-1 text-\[13px\]" : "mb-2 text-sm"/);
  assert.match(datePicker, /prominentDesktop \? "mb-1 text-\[11px\]" : "mb-2 text-xs"/);
  assert.match(datePicker, /prominentDesktop \? "h-7" : "h-8"/);
  assert.match(datePicker, /prominentDesktop[\s\S]*?"h-7 rounded-md text-\[11px\]/);
  assert.match(datePicker, /prominentDesktop \? "gap-2" : "gap-3"/);
  assert.match(datePicker, /prominentDesktop \? "sticky bottom-0 mt-2 pt-2" : "mt-4 pt-3"/);
  assert.match(datePicker, /prominentDesktop[\s\S]*?"min-h-9 px-3 py-1\.5 text-xs"/);
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


test("desktop Flight edit-search values keep the shared 15px typography contract", () => {
  const desktopRuleNeedle = `@media (min-width: 640px) {
  .flight-results-edit-value {`;
  const desktopStart = styles.indexOf(desktopRuleNeedle);
  assert.notEqual(desktopStart, -1);

  const desktopEnd = styles.indexOf("\n}\n", desktopStart);
  assert.notEqual(desktopEnd, -1);

  const desktopStyles = styles.slice(desktopStart, desktopEnd + 3);
  assert.match(
    desktopStyles,
    /\.flight-results-edit-value \{[\s\S]*?font-family: inherit;[\s\S]*?font-size: 15px !important;[\s\S]*?font-weight: 600 !important;[\s\S]*?line-height: 20px !important;[\s\S]*?color: rgb\(2 6 23\) !important;/,
  );
  assert.doesNotMatch(desktopStyles, /@media \(max-width: 639px\)/);

  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(
    popout,
    /id="sticky-results-origin"[\s\S]*?className="flight-results-edit-value h-5/,
  );
  assert.match(
    popout,
    /id="sticky-results-destination"[\s\S]*?className="flight-results-edit-value h-5/,
  );
  assert.match(popout, /flight-results-edit-value mt-0\.5/);
});


test("main desktop Results search uses one shared value typography contract", () => {
  const start = source.indexOf('function renderCompactSearchForm(placement: "mobile" | "desktop")');
  const end = source.indexOf("\n  function ", start + 1);
  assert.ok(start >= 0 && end > start);
  const compact = source.slice(start, end);

  const originStart = compact.indexOf('id="results-origin"');
  const destinationStart = compact.indexOf('id="results-destination"');
  const datesStart = compact.indexOf('{t("travelDates")}', destinationStart);
  const travelersStart = compact.indexOf('{t("travelers")}', datesStart);

  const originField = compact.slice(originStart, destinationStart);
  const destinationField = compact.slice(destinationStart, datesStart);
  const datesField = compact.slice(datesStart, travelersStart);
  const travelersField = compact.slice(travelersStart);

  assert.match(originField, /className="flight-results-edit-value h-6/);
  assert.match(destinationField, /className="flight-results-edit-value h-6/);
  assert.match(
    datesField,
    /className="flight-results-edit-value flex min-w-0 items-center gap-2"/,
  );
  assert.match(
    travelersField,
    /className="flight-results-edit-value flex min-w-0 items-center gap-2"/,
  );
  assert.doesNotMatch(originField, /text-\[16px\]|md:text-sm/);
  assert.doesNotMatch(destinationField, /text-\[16px\]|md:text-sm/);
});
