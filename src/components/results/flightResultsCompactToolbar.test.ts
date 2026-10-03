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

test("desktop Flight Results header is compact and uses separate locations with one date range", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /data-flight-results-nav-search-form/);
  assert.match(toolbar, /mobileTripTypeSummary/);
  assert.match(toolbar, /max-w-\[760px\]/);
  assert.match(toolbar, /h-\[40px\]/);
  assert.match(
    toolbar,
    /grid-cols-\[108px_minmax\(90px,1fr\)_30px_minmax\(90px,1fr\)_170px_142px_40px\]/,
  );
  assert.match(toolbar, /getCompactLocationLabel/);
  assert.match(toolbar, /getLocalizedCityName\(matchedAirport\.city, locale\)/);
  assert.match(toolbar, /originSummary/);
  assert.match(toolbar, /destinationSummary/);
  assert.match(toolbar, /aria-label=\{t\("swapOriginDestination"\)\}/);
  assert.match(toolbar, /<ArrowRightLeft className="h-4 w-4"/);
  assert.match(toolbar, /formatDesktopHeaderDateLabel/);
  assert.match(toolbar, /dateSummary/);
  assert.match(toolbar, /openStickySearchEditor\(event, "trip"\)/);
  assert.equal(
    toolbar.match(/openStickySearchEditor\(event, "route"\)/g)?.length,
    2,
  );
  assert.match(toolbar, /openStickySearchEditor\(event, "dates"\)/);
  assert.doesNotMatch(toolbar, /openStickySearchEditor\(event, "return"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event, "travelers"\)/);
  assert.match(toolbar, /bg-\[#EEF2F6\]/);
  assert.match(toolbar, /bg-\[#E1E8EF\]/);
  assert.match(toolbar, /rounded-\[8px\] border border-\[#D8E1EC\]/);
  assert.match(toolbar, /<Search className="h-\[18px\] w-\[18px\]"/);
});

test("desktop Flight header uses the requested weekday numeric date format", () => {
  const helperStart = source.indexOf("function formatDesktopHeaderDateLabel");
  const helperEnd = source.indexOf("function formatFareStripDateLabel", helperStart);
  const helper = source.slice(helperStart, helperEnd);

  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.match(helper, /weekday: "short"/);
  assert.match(
    helper,
    /return `\$\{weekday\} \$\{date\.getMonth\(\) \+ 1\}\/\$\{date\.getDate\(\)\}`/,
  );
});


function stickyEditorCallbackSource() {
  const start = source.indexOf("const openStickySearchEditor = useCallback(");
  const end = source.indexOf("const isStickySearchPanelOpen", start);

  assert.notEqual(start, -1, "sticky editor callback exists");
  assert.notEqual(end, -1, "sticky panel open state follows editor callback");

  return source.slice(start, end);
}

test("desktop header opens only the selected field editor", () => {
  const callback = stickyEditorCallbackSource();

  assert.match(callback, /target: "trip" \| "route" \| "dates" \| "return" \| "travelers"/);
  assert.match(callback, /const resolvedTarget =[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?\? "trip"[\s\S]*?: target/);
  assert.match(callback, /setActiveStickySearchTarget\(resolvedTarget\)/);
  assert.match(callback, /resolvedTarget === "dates"[\s\S]*?"departure"[\s\S]*?resolvedTarget === "return"[\s\S]*?"return"/);
  assert.match(callback, /setTravelerPopoverOpen\(resolvedTarget === "travelers"\)/);
  assert.match(callback, /resolvedTarget === "route" && originInput\.trim\(\)\.length >= 2/);
  assert.match(callback, /stickySearchLauncherRef\.current = event\.currentTarget/);
  assert.match(callback, /resolvedTarget === "trip" \? null : resolvedTarget/);
});

test("sticky search moves focus directly to the requested field editor", () => {
  assert.match(source, /pendingTarget === "route"/);
  assert.match(source, /querySelector<HTMLInputElement>\("input"\)/);
  assert.match(source, /pendingTarget === "dates" \|\| pendingTarget === "return"/);
  assert.match(source, /stickyDateButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /pendingTarget === "travelers"/);
  assert.match(source, /stickyTravelerButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /stickySearchLauncherRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test("header search fields use the shared neutral focus treatment", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /focus-ring flex h-\[40px\]/);
  assert.doesNotMatch(toolbar, /focus-visible:bg-slate/);
});

test("Flight Results no longer opens a duplicated full search form below the header", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  assert.ok(start >= 0 && end > start);
  const popout = source.slice(start, end);

  assert.match(popout, /role="region"/);
  assert.match(popout, /activeStickySearchTarget === "trip"/);
  assert.match(popout, /activeStickySearchTarget === "route"/);
  assert.match(popout, /activeStickySearchTarget === "dates"/);
  assert.match(popout, /activeStickySearchTarget === "return"/);
  assert.match(popout, /activeStickySearchTarget === "travelers"/);
  assert.match(popout, /<form[\s\S]*onSubmit=\{handleCompactSearchSubmit\}/);
  assert.doesNotMatch(popout, /<Button[\s\S]*type="submit"/);
  assert.doesNotMatch(popout, /stickySearchCloseButtonRef/);
});

test("trip type is a compact field editor and multi-city expands as its accordion content", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);
  const roundTrip = popout.indexOf('label: t("roundTrip")');
  const oneWay = popout.indexOf('label: t("oneWay")');
  const multiCity = popout.indexOf('label: t("multiCity")');

  assert.ok(roundTrip >= 0 && roundTrip < oneWay && oneWay < multiCity);
  assert.match(popout, /role="radiogroup"/);
  assert.match(popout, /aria-checked=\{selected\}/);
  assert.match(popout, /onClick=\{\(\) => handleTripTypeChange\(option\.value\)\}/);
  assert.match(popout, /activeStickySearchTarget === "trip"[\s\S]*tripTypeInput === "multi-city"[\s\S]*data-sticky-multicity-editor/);
  assert.match(popout, /<MultiCityFlightEditor[\s\S]*presentation="results"/);
  assert.match(popout, /overflow-y-auto[^"]*overscroll-contain[\s\S]*maxHeight: `calc\(100dvh - \$\{\(desktopSearchPopoverFrame\?\.top \?\? 88\) \+ 60\}px\)`/);
});

test("route date and traveler editors stay attached to their own header fields", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.equal(popout.match(/<MapPin aria-hidden="true"/g)?.length, 2);
  assert.match(popout, /id="sticky-flight-origin-suggestions"[\s\S]*alignToField/);
  assert.match(popout, /id="sticky-flight-destination-suggestions"[\s\S]*alignToField/);
  assert.match(popout, /<DatePickerPopover[\s\S]*prominentDesktop[\s\S]*alignToField="left"/);
  assert.match(popout, /<TravelerCabinPopover[\s\S]*prominentDesktop[\s\S]*alignToField="right"/);
  assert.match(popout, /activeStickySearchTarget === "dates"[\s\S]*activeStickySearchTarget === "return"[\s\S]*"col-start-5"/);
  assert.match(popout, /activeStickySearchTarget === "travelers"[\s\S]*"col-start-6"/);
  assert.match(popout, /col-start-2 col-span-3 grid min-h-\[64px\][\s\S]*grid-cols-\[minmax\(0,1fr\)_30px_minmax\(0,1fr\)\]/);
});

test("desktop field editors stay aligned to the navbar search footprint", () => {
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
  assert.match(frame, /top: rect\.bottom/);
  assert.match(frame, /Math\.min\(rect\.width, availableWidth\)/);
  assert.match(frame, /Math\.max\(viewportGutter, rect\.left\)/);
  assert.match(popout, /data-flight-search-anchored-backdrop/);
  assert.match(popout, /bg-transparent/);
  assert.match(popout, /desktopSearchPopoverFrame[\s\S]*width: desktopSearchPopoverFrame\.width/);
  assert.match(
    popout,
    /grid-cols-\[108px_minmax\(90px,1fr\)_30px_minmax\(90px,1fr\)_170px_142px_40px\]/,
  );
  assert.doesNotMatch(popout, /rounded-b-\[12px\] rounded-t-none/);
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

test("field-specific Flight header editors anchor their controls locally", () => {
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);
  const datePickerStart = source.indexOf("function DatePickerPopover");
  const suggestionStart = source.indexOf("function SuggestionList");
  const componentSource = source.slice(datePickerStart, suggestionStart);

  assert.match(
    popout,
    /id="sticky-flight-origin-suggestions"[\s\S]*?alignToField/,
  );
  assert.match(
    popout,
    /id="sticky-flight-destination-suggestions"[\s\S]*?alignToField/,
  );
  assert.match(
    popout,
    /<DatePickerPopover[\s\S]*?prominentDesktop[\s\S]*?alignToField="left"/,
  );
  assert.match(
    popout,
    /<TravelerCabinPopover[\s\S]*?prominentDesktop[\s\S]*?alignToField="right"/,
  );
  assert.match(popout, /launcherRef=\{stickyDateButtonRef\}/);
  assert.match(popout, /launcherRef=\{stickyTravelerButtonRef\}/);
  assert.doesNotMatch(
    popout,
    /id="sticky-flight-(?:origin|destination)-suggestions"[\s\S]{0,180}?position=\{/,
  );

  assert.match(
    componentSource,
    /prominentDesktop \?\s*"max-w-none rounded-xl p-4"/,
  );
  assert.match(componentSource, /alignToField\?: "left" \| "right"/);
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
    /alignToField[\s\S]*maxHeight: "min\(520px, calc\(100dvh - 8rem\)\)"/,
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
  const multiCityStart = popout.indexOf("data-sticky-multicity-editor");
  const multiCityEnd = popout.indexOf(
    'activeStickySearchTarget === "route"',
    multiCityStart,
  );
  const multiCityBlock = popout.slice(multiCityStart, multiCityEnd);

  assert.ok(multiCityStart >= 0 && multiCityEnd > multiCityStart);
  assert.doesNotMatch(multiCityBlock, /travelerCabinSummary|<TravelerCabinPopover/);
  assert.doesNotMatch(multiCityBlock, /<Button[\s\S]*type="submit"/);
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
  assert.match(popout, /rounded-\[12px\] border border-\[#CFD9E5\] bg-white shadow-\[0_12px_26px_-18px_rgba\(15,23,42,0\.28\)\]/);
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
    /id="sticky-results-origin"[\s\S]*?className="flight-results-edit-value h-6/,
  );
  assert.match(
    popout,
    /id="sticky-results-destination"[\s\S]*?className="flight-results-edit-value h-6/,
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
