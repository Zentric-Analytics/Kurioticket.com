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

test("desktop Flight Results header is compact, trip-aware, and uses lighter Hotels-like surfaces", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /data-flight-results-nav-search-form/);
  assert.match(toolbar, /tripTypeInput === "round-trip"/);
  assert.match(toolbar, /grid-cols-\[96px_minmax\(0,1fr\)_minmax\(138px,150px\)_50px_40px\]/);
  assert.match(toolbar, /grid-cols-\[96px_minmax\(0,1fr\)_104px_50px_40px\]/);
  assert.match(toolbar, /xl:grid-cols-\[104px_230px_150px_56px_40px\]/);
  assert.match(toolbar, /xl:grid-cols-\[104px_230px_104px_56px_40px\]/);
  assert.match(toolbar, /getCompactCityLabel/);
  assert.match(toolbar, /data-flight-results-compact-route/);
  assert.match(toolbar, /bg-\[#F8FAFC\]/);
  assert.doesNotMatch(toolbar, /bg-\[#EEF2F6\]|bg-\[#E1E8EF\]/);
  assert.match(toolbar, /bg-\[#004BB8\]/);
});

test("desktop Flight header swap updates the first multi-city leg", () => {
  const start = source.indexOf("function handleSwapLocations()");
  const end = source.indexOf("function applyFlightDateSelection", start);
  const handler = source.slice(start, end);

  assert.match(handler, /tripTypeInput === "multi-city"/);
  assert.match(handler, /setMultiCityLegs\(\(currentLegs\) =>/);
  assert.match(handler, /index === 0/);
  assert.match(handler, /origin: leg\.destination/);
  assert.match(handler, /destination: leg\.origin/);
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

test("desktop Flight route control is clearly dominant over the date control", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /const dateFieldClass =[\s\S]*?h-\[36px\]/);
  assert.match(toolbar, /max-w-\[548px\]/);
  assert.match(toolbar, /minmax\(138px,150px\)/);
  assert.match(toolbar, /xl:grid-cols-\[104px_230px_150px_56px_40px\]/);
  assert.match(toolbar, /className=\{cn\(dateFieldClass, "w-full justify-center"\)\}/);
  assert.match(toolbar, /grid-cols-\[96px_minmax\(0,1fr\)_minmax\(138px,150px\)_50px_40px\]/);
  assert.match(toolbar, /xl:grid-cols-\[104px_230px_150px_56px_40px\]/);
  assert.doesNotMatch(toolbar, /minmax\(168px,1fr\)/);
  assert.doesNotMatch(toolbar, /Calendar|CalendarDays/);
});

test("compact multi-city header follows the first edited leg date", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /tripTypeInput === "multi-city" && firstMultiCityLeg/);
  assert.match(toolbar, /\? firstMultiCityLeg\.departureDate/);
  assert.match(toolbar, /: departureDateInput/);
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

  assert.match(callback, /target: "trip" \| "origin" \| "destination" \| "dates" \| "return" \| "travelers"/);
  assert.match(callback, /const resolvedTarget =[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?\? "trip"[\s\S]*?: target/);
  assert.match(callback, /setActiveStickySearchTarget\(resolvedTarget\)/);
  assert.match(callback, /resolvedTarget === "dates"[\s\S]*?"departure"[\s\S]*?resolvedTarget === "return"[\s\S]*?"return"/);
  assert.match(callback, /setTravelerPopoverOpen\(resolvedTarget === "travelers"\)/);
  assert.match(callback, /resolvedTarget === "origin" && originInput\.trim\(\)\.length >= 2/);
  assert.match(callback, /resolvedTarget === "destination"[\s\S]*destinationInput\.trim\(\)\.length >= 2/);
  assert.match(callback, /stickySearchLauncherRef\.current = event\.currentTarget/);
  assert.match(callback, /resolvedTarget === "trip" \? null : resolvedTarget/);
});

test("desktop Multi-city marks the sticky editor open before observer callbacks can collapse it", () => {
  const callback = stickyEditorCallbackSource();
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(
    callback,
    /stickySearchPanelOpenRef\.current = true;[\s\S]*setIsSearchExpandedWhileSticky\(true\)/,
  );
  assert.match(
    toolbar,
    /if \(option\.value === "multi-city"\) \{[\s\S]*stickySearchPanelOpenRef\.current = true;[\s\S]*setIsSearchExpandedWhileSticky\(true\)/,
  );
  assert.match(
    source,
    /const collapseStickySearch = useCallback\([\s\S]*stickySearchPanelOpenRef\.current = false;[\s\S]*setIsSearchExpandedWhileSticky\(false\)/,
  );
});

test("sticky search moves focus directly to the requested field editor", () => {
  assert.match(source, /pendingTarget === "origin"/);
  assert.match(source, /stickyOriginWrapRef\.current[\s\S]*querySelector<HTMLInputElement>\("input"\)/);
  assert.match(source, /pendingTarget === "destination"/);
  assert.match(source, /stickyDestinationWrapRef\.current[\s\S]*querySelector<HTMLInputElement>\("input"\)/);
  assert.match(source, /pendingTarget === "dates" \|\| pendingTarget === "return"/);
  assert.match(source, /stickyDateButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /pendingTarget === "travelers"/);
  assert.match(source, /stickyTravelerButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /stickySearchLauncherRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
});

test("direct route editors keep their mounted inputs instead of remounting launchers", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(source, /stickySearchRestoreTargetRef/);
  assert.match(toolbar, /<input[\s\S]*data-flight-results-header-origin/);
  assert.match(toolbar, /<input[\s\S]*data-flight-results-header-destination/);
  assert.match(source, /restoreTarget === "origin" \|\| restoreTarget === "destination"/);
  assert.match(source, /document\.querySelector<HTMLElement>\(selector\)/);
  assert.doesNotMatch(toolbar, /openCompactRouteEditor/);
});
test("header search fields use the shared neutral focus treatment", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /focus-ring flex h-\[40px\]/);
  assert.doesNotMatch(toolbar, /focus-visible:bg-slate/);
});

test("desktop Flight header edits route date and travelers without duplicate field cards", () => {
  const toolbar = desktopHeaderSearchBarSource();
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(toolbar, /id="sticky-results-origin"/);
  assert.match(toolbar, /id="sticky-results-destination"/);
  assert.match(toolbar, /id="sticky-flight-origin-suggestions"[\s\S]*alignToField/);
  assert.match(toolbar, /id="sticky-flight-destination-suggestions"[\s\S]*alignToField/);
  assert.match(toolbar, /<DatePickerPopover[\s\S]*prominentDesktop[\s\S]*alignToField="left"/);
  assert.match(toolbar, /<TravelerCabinPopover[\s\S]*prominentDesktop[\s\S]*alignToField="right"/);
  assert.match(popout, /data-sticky-multicity-editor/);
  assert.doesNotMatch(popout, /id="sticky-results-origin"|id="sticky-results-destination"/);
  assert.doesNotMatch(popout, /<DatePickerPopover|<TravelerCabinPopover/);
});

test("trip type copies the desktop Sort dropdown layout and multi-city expands separately", () => {
  const toolbar = desktopHeaderSearchBarSource();
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(toolbar, /role="listbox"/);
  assert.match(toolbar, /role="option"/);
  assert.match(toolbar, /aria-selected=\{selected\}/);
  assert.match(toolbar, /rounded-\[16px\] border border-\[#D8E1EC\] bg-white p-2 shadow-\[0_20px_48px_-20px_rgba\(15,23,42,0\.32\)\]/);
  assert.match(toolbar, /bg-\[#F0F6FF\] text-\[#004BB8\]/);
  assert.match(toolbar, /<Check[\s\S]*className="h-4 w-4"/);
  assert.match(toolbar, /onMouseDown=\{\(event\) => \{[\s\S]*event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);/);
  assert.match(toolbar, /handleTripTypeChange\(option\.value\)/);
  assert.doesNotMatch(toolbar, /role="radiogroup"|role="radio"/);
  assert.match(popout, /activeStickySearchTarget === "trip"/);
  assert.match(popout, /tripTypeInput === "multi-city"/);
  assert.match(popout, /!tripTypeMenuOpen/);
  assert.match(popout, /<MultiCityFlightEditor[\s\S]*presentation="results"/);
});

test("route field is one grouped control with explicit swap dividers", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /data-flight-results-compact-route/);
  assert.match(toolbar, /grid-cols-\[minmax\(56px,1fr\)_28px_minmax\(56px,1fr\)\]/);
  assert.match(toolbar, /aria-label=\{t\("swapOriginDestination"\)\}[\s\S]*?border-x border-\[#D8E1EC\]/);
  assert.match(toolbar, /data-flight-results-header-origin/);
  assert.match(toolbar, /data-flight-results-header-destination/);
  assert.match(toolbar, /openStickySearchEditor\(event\.currentTarget, "origin"\)/);
  assert.match(toolbar, /openStickySearchEditor\(event\.currentTarget, "destination"\)/);
  assert.doesNotMatch(toolbar, /openCompactRouteEditor/);
  assert.doesNotMatch(
    toolbar,
    /focus-within:border-\[#004BB8\][\s\S]*focus-within:ring-2/,
  );
});

test("route date and traveler controls open their real editors directly from the header", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /activeStickySearchTarget === "origin"[\s\S]*<input/);
  assert.match(toolbar, /activeStickySearchTarget === "destination"[\s\S]*<input/);
  assert.match(toolbar, /id="sticky-flight-origin-suggestions"[\s\S]*alignToField/);
  assert.match(toolbar, /id="sticky-flight-destination-suggestions"[\s\S]*alignToField/);
  assert.match(toolbar, /activeStickySearchTarget === "dates"[\s\S]*<DatePickerPopover/);
  assert.match(toolbar, /launcherRef=\{stickyDateButtonRef\}/);
  assert.match(toolbar, /activeStickySearchTarget === "travelers"[\s\S]*<TravelerCabinPopover/);
  assert.match(toolbar, /launcherRef=\{stickyTravelerButtonRef\}/);
});

test("desktop header airport controls behave like true comboboxes", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /id="sticky-results-origin"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"[\s\S]*?aria-controls="sticky-flight-origin-suggestions"/);
  assert.match(toolbar, /id="sticky-results-destination"[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"[\s\S]*?aria-controls="sticky-flight-destination-suggestions"/);
  assert.match(toolbar, /const input = event\.currentTarget;[\s\S]*?const enteringOrigin =[\s\S]*?input\.select\(\)/);
  assert.match(toolbar, /const input = event\.currentTarget;[\s\S]*?const enteringDestination =[\s\S]*?input\.select\(\)/);
  assert.match(toolbar, /data-flight-results-header-origin-clear[\s\S]*?aria-label=\{t\("clearOrigin"\)\}/);
  assert.match(toolbar, /data-flight-results-header-destination-clear[\s\S]*?aria-label=\{t\("clearDestination"\)\}/);
  assert.match(toolbar, /setOriginInput\(""\)[\s\S]*?setOriginCode\(""\)/);
  assert.match(toolbar, /setDestinationInput\(""\)[\s\S]*?setDestinationCode\(""\)/);
});

test("desktop header route selection advances From to To and closes after destination", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /id="sticky-flight-origin-suggestions"[\s\S]*?keyboardNavigation/);
  assert.match(toolbar, /setOriginCode\(value\)[\s\S]*?stickyDestinationWrapRef\.current[\s\S]*?focus\(\{ preventScroll: true \}\)/);
  assert.match(toolbar, /id="sticky-flight-destination-suggestions"[\s\S]*?keyboardNavigation/);
  assert.match(toolbar, /setDestinationCode\(value\)[\s\S]*?collapseStickySearch\(\{ restoreScroll: false \}\)/);
});

test("sticky airport suggestions support arrow and Home/End navigation", () => {
  const toolbar = desktopHeaderSearchBarSource();
  const start = source.indexOf("function SuggestionList");
  const end = source.indexOf("type FilterOption", start);
  const suggestions = source.slice(start, end);

  assert.match(toolbar, /event\.key === "ArrowDown" && activeSuggest === "origin"[\s\S]*?sticky-flight-origin-suggestions \[role="option"\][\s\S]*?firstSuggestion\.focus\(\)/);
  assert.match(toolbar, /event\.key === "ArrowDown"[\s\S]*?activeSuggest === "destination"[\s\S]*?sticky-flight-destination-suggestions \[role="option"\][\s\S]*?firstSuggestion\.focus\(\)/);
  assert.match(suggestions, /keyboardNavigation = false/);
  assert.match(suggestions, /event\.key === "ArrowDown"/);
  assert.match(suggestions, /event\.key === "ArrowUp"/);
  assert.match(suggestions, /event\.key === "Home"/);
  assert.match(suggestions, /event\.key === "End"/);
  assert.match(suggestions, /event\.preventDefault\(\);[\s\S]*?options\[nextIndex\]\?\.focus\(\)/);
});

test("multi-city accordion stays aligned to the navbar search footprint", () => {
  const callback = stickyEditorCallbackSource();
  const frameStart = source.indexOf("const updateDesktopSearchPopoverFrame = useCallback(");
  const frameEnd = source.indexOf("const openStickySearchEditor = useCallback(", frameStart);
  const frame = source.slice(frameStart, frameEnd);
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(callback, /closest<HTMLElement>\(\s*"\[data-flight-results-nav-search-form\]"\s*,?\s*\)/);
  assert.match(callback, /updateDesktopSearchPopoverFrame\(compactForm\)/);
  assert.match(frame, /const rect = resolvedCompactForm\.getBoundingClientRect\(\)/);
  assert.match(frame, /top: rect\.bottom/);
  assert.match(popout, /desktopSearchPopoverFrame[\s\S]*width: desktopSearchPopoverFrame\.width/);
  assert.match(popout, /data-sticky-multicity-editor/);
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
    /document\.querySelector<HTMLElement>\(\s*"\[data-flight-results-nav-search-form\]"\s*,?\s*\)/,
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

test("field-specific Flight header controls are local descendants of the compact form", () => {
  const toolbar = desktopHeaderSearchBarSource();
  const datePickerStart = source.indexOf("function DatePickerPopover");
  const suggestionStart = source.indexOf("function SuggestionList");
  const componentSource = source.slice(datePickerStart, suggestionStart);

  assert.match(toolbar, /id="sticky-flight-origin-suggestions"[\s\S]*?alignToField/);
  assert.match(toolbar, /id="sticky-flight-destination-suggestions"[\s\S]*?alignToField/);
  assert.match(toolbar, /<DatePickerPopover[\s\S]*?prominentDesktop[\s\S]*?alignToField="left"/);
  assert.match(toolbar, /<TravelerCabinPopover[\s\S]*?prominentDesktop[\s\S]*?alignToField="right"/);
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

test("sticky multi-city selection renders only the real multi-city accordion editor", () => {
  const start = source.indexOf("function renderStickySearchPopoutOverlay()");
  const end = source.indexOf("function renderCompactSearchForm", start);
  const popout = source.slice(start, end);

  assert.match(popout, /tripTypeInput === "multi-city"[\s\S]*data-sticky-multicity-editor/);
  assert.match(popout, /<MultiCityFlightEditor[\s\S]*legs=\{multiCityLegs\}[\s\S]*onChange=\{setMultiCityLegs\}[\s\S]*presentation="results"/);
  assert.match(popout, /minimumDate=\{formatDateValue\(new Date\(\)\)\}/);
  assert.doesNotMatch(popout, /travelerCabinSummary|<TravelerCabinPopover|<DatePickerPopover/);
});

test("sticky multi-city accordion is scrollable without locking the desktop document", () => {
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);

  assert.match(popout, /overflow-y-auto[^"]*overscroll-contain/);
  assert.match(popout, /maxHeight:/);
  assert.equal(popout.match(/onAirportValidityChange=\{setMultiCityAirportsValid\}/g)?.length, 1);
  assert.doesNotMatch(source, /shouldLockForMultiCity|lockDocumentScrollWithoutLayoutShift|stickySearchScrollLockRef/);
});

test("desktop compact header uses lighter Hotels-like surfaces without duplicate editor cards", () => {
  const toolbar = desktopHeaderSearchBarSource();
  const popoutStart = source.indexOf("function renderStickySearchPopoutOverlay()");
  const popoutEnd = source.indexOf("function renderCompactSearchForm", popoutStart);
  const popout = source.slice(popoutStart, popoutEnd);

  assert.match(toolbar, /bg-\[#F8FAFC\]/);
  assert.match(toolbar, /border border-\[#D8E1EC\]/);
  assert.match(toolbar, /hover:bg-\[#F3F6FA\]/);
  assert.doesNotMatch(toolbar, /bg-\[#EEF2F6\]|bg-\[#E1E8EF\]/);
  assert.doesNotMatch(popout, /stickyLabelClass|stickyValueClass|<MapPin/);
});

test("direct header route inputs keep the compact header typography contract", () => {
  const toolbar = desktopHeaderSearchBarSource();

  assert.match(toolbar, /id="sticky-results-origin"[\s\S]*?flight-results-nav-route-input/);
  assert.match(toolbar, /id="sticky-results-destination"[\s\S]*?flight-results-nav-route-input/);
  assert.match(styles, /\.flight-results-nav-route-input \{[\s\S]*?font-size: 12px;[\s\S]*?line-height: 17px;[\s\S]*?font-weight: 600;[\s\S]*?color: #142033;/);
  assert.doesNotMatch(toolbar, /flight-results-edit-value h-6/);
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
