import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./FlightResultsClient.tsx", import.meta.url),
  "utf8",
);

function desktopEditorSource() {
  const label = source.indexOf("data-desktop-trip-selector");
  const start = source.lastIndexOf("<div", label);
  const end = source.indexOf("<form", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test("desktop results editor uses one clean accessible trip-type radio row", () => {
  const editor = desktopEditorSource();
  const roundTrip = editor.indexOf('label: t("roundTrip")');
  const oneWay = editor.indexOf('label: t("oneWay")');
  const multiCity = editor.indexOf('label: t("multiCity")');

  assert.ok(roundTrip >= 0 && roundTrip < oneWay && oneWay < multiCity);
  assert.match(editor, /role="radiogroup"/);
  assert.match(editor, /role="radio"/);
  assert.match(editor, /aria-checked={selected}/);
  assert.doesNotMatch(editor, /role="listbox"|role="option"|aria-haspopup/);
  assert.doesNotMatch(editor, /label: "(?:One-way|Round-trip|Multi-city)"/);
  assert.match(editor, /data-desktop-trip-selector/);
  assert.match(editor, /items-center gap-7/);
  assert.match(editor, /rounded-full border-\[1\.5px\]/);
});

test("desktop results keeps trip type inside the clicked edit-search state", () => {
  assert.match(source, /const shouldRenderDesktopFullSearchForm = false;/);
  assert.match(source, /const shouldShowDesktopCompactSummary = true;/);
  assert.match(source, /const showFullSearchForm = isSearchExpandedWhileSticky;/);
  assert.match(source, /const showCompactSearchSummary = !isSearchExpandedWhileSticky;/);
  assert.match(
    source,
    /shouldShowDesktopCompactSummary &&\s*showCompactSearchSummary[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?navigateDesktopMultiCityToHome\(\)[\s\S]*?expandStickySearch\(\)/,
  );
  assert.match(
    source,
    /placement === "desktop"[\s\S]*?!shouldRenderDesktopFullSearchForm[\s\S]*?!showFullSearchForm[\s\S]*?return null;/,
  );
  assert.match(
    source,
    /showFullSearchForm[\s\S]*?data-desktop-trip-selector/,
  );
});


test("desktop populated airport inputs remain editable while compact header adds local clear controls", () => {
  assert.match(source, /id="results-origin"[\s\S]*?onChange=\{/);
  assert.match(source, /id="results-destination"[\s\S]*?onChange=\{/);
  assert.match(source, /data-flight-results-header-origin-clear[\s\S]*?aria-label={t\("clearOrigin"\)}/);
  assert.match(source, /data-flight-results-header-destination-clear[\s\S]*?aria-label={t\("clearDestination"\)}/);
  assert.doesNotMatch(source, /function clearOriginField/);
  assert.doesNotMatch(source, /function clearDestinationField/);
});

test("desktop results fields lead values with neutral semantic icons", () => {
  assert.ok(
    (source.match(
      /<MapPin[\s\S]*?aria-hidden="true"[\s\S]*?className="h-4 w-4 shrink-0 text-slate-700"/g,
    )?.length ?? 0) >= 2,
  );
  assert.match(
    source,
    /<Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600"/,
  );
  assert.match(
    source,
    /<UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600"/,
  );
  assert.match(source, /locale\?\.startsWith\("en"\)/);
  assert.match(source, /adultSingular\.charAt\(0\)\.toUpperCase\(\)/);
});

test("origin and destination share one bounded production-ready suggestion card", () => {
  const start = source.indexOf("function SuggestionList");
  const end = source.indexOf("type FilterOption", start);
  const suggestions = source.slice(start, end);

  assert.match(suggestions, /suggestions\.slice\(0, 5\)/);
  assert.match(suggestions, /role="listbox"/);
  assert.match(suggestions, /role="option"/);
  assert.match(suggestions, /overflow-hidden/);
  assert.match(suggestions, /min-h-\[58px\]/);
  assert.match(suggestions, /border-b border-slate-200\/75/);
  assert.match(suggestions, /keyboardNavigation\?: boolean/);
  assert.match(suggestions, /querySelectorAll<HTMLButtonElement>\(\s*'\[role="option"\]'/);
  assert.doesNotMatch(suggestions, /overflow-auto|max-h-\[/);
  assert.equal(source.match(/<SuggestionList/g)?.length, 6);
});

test("desktop traveler picker uses clean traveler names and preserves counters", () => {
  const popoverStart = source.indexOf('id="flight-traveler-cabin-popover"');
  const counterStart = source.indexOf("function CounterRow", popoverStart);
  const popover = source.slice(popoverStart, counterStart);

  assert.match(popover, /label={t\("adults"\)}/);
  assert.match(popover, /label={t\("children"\)}/);
  assert.match(popover, /label={t\("infantPlural"\)}/);
  assert.doesNotMatch(popover, /label={t\("infantsOnLap"\)}/);
  assert.match(popover, /max={adultCount}/);
});


test("desktop results omit the nearby-fare calendar while mobile keeps its fare rail", () => {
  assert.doesNotMatch(source, /data-desktop-nearby-fare-rail/);
  assert.doesNotMatch(source, /aria-label="Previous nearby fare date"/);
  assert.doesNotMatch(source, /aria-label="Next nearby fare date"/);
  assert.doesNotMatch(source, /navigateNearbyFareWindow/);
  assert.match(source, /data-nearby-fare-presentation="mobile"/);
  assert.match(source, /flight-mobile-cheaper-nearby/);
});


test("nearby fare support is mobile-only and remains excluded from multi-city", () => {
  assert.match(source, /const nearbyFareRangeSize = 10;/);
  assert.doesNotMatch(source, /nearbyFareVisibleCount|nearbyFareVisibleStart|nearbyFareCenteredVisibleStart/);
  assert.match(source, /mobileNearbyFaresEnabled/);
  assert.match(source, /body\?\.tripType !== "multi-city"/);
});

test("desktop Multi-city edits navigate to the homepage Flight form with Multi-city active", () => {
  const navigationStart = source.indexOf("function buildDesktopMultiCityHomeHref");
  const tripTypeStart = source.indexOf("function handleTripTypeChange");
  const headerStart = source.indexOf("function renderDesktopHeaderSearchBar");
  const headerEnd = source.indexOf("function renderStickySearchPopoutOverlay", headerStart);
  const navigation = source.slice(navigationStart, tripTypeStart);
  const header = source.slice(headerStart, headerEnd);

  assert.notEqual(navigationStart, -1);
  assert.match(navigation, /nextParams\.set\("tripType", "multi-city"\)/);
  assert.match(navigation, /nextParams\.delete\("returnDate"\)/);
  assert.match(navigation, /appendFlightLegParams\(nextParams, projection\.legs\)/);
  assert.match(navigation, /return `\/\?\$\{nextParams\.toString\(\)\}`/);
  assert.match(
    navigation,
    /router\.push\(buildDesktopMultiCityHomeHref\(\), \{ scroll: true \}\)/,
  );
  assert.match(
    navigation,
    /function openDesktopSearchEditor[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?navigateDesktopMultiCityToHome\(\)[\s\S]*?return;/,
  );
  assert.match(
    header,
    /option\.value === "multi-city"[\s\S]*?navigateDesktopMultiCityToHome\(\)[\s\S]*?return;[\s\S]*?handleTripTypeChange\(option\.value\)/,
  );
  assert.doesNotMatch(
    header,
    /option\.value === "multi-city"[\s\S]{0,260}setIsSearchExpandedWhileSticky\(true\)/,
  );
  assert.match(
    source,
    /onClick=\{\(\) => \{[\s\S]*?tripTypeInput === "multi-city"[\s\S]*?navigateDesktopMultiCityToHome\(\)[\s\S]*?expandStickySearch\(\)/,
  );
});
