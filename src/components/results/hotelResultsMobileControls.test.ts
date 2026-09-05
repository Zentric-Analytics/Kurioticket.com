import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  new URL("../../app/hotels/results/page.tsx", import.meta.url),
  "utf8",
);
const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const searchBarSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);

test("Hotel Results hides only the mobile category tabs", () => {
  const headerCall = pageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";

  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.match(headerCall, /flushMobileBottom/);
  assert.doesNotMatch(headerCall, /hideTravelNav/);
});

test("mobile Hotel search uses the Flight-parity data-driven summary shell", () => {
  const controlsStart = searchBarSource.indexOf(
    '{onOpenFilters && mobileLayout !== "controls" ? (',
  );
  const controlsEnd = searchBarSource.indexOf("</div>", controlsStart);

  assert.notEqual(controlsStart, -1);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
  assert.match(searchBarSource, /destination\.trim\(\) \|\| t\("destination"\)/);
  assert.match(searchBarSource, /\{resultsSearchSummary\}/);
  assert.match(searchBarSource, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(searchBarSource, /onClick=\{openMobileSearchPanel\}/);
  assert.match(searchBarSource, /h-16[\s\S]*?rounded-\[13px\][\s\S]*?border-\[#D8E1EC\]/);
  assert.match(searchBarSource, /h-11 w-11[\s\S]*?bg-transparent[\s\S]*?text-slate-700/);
  assert.match(
    searchBarSource,
    /import \{[\s\S]*?formatCompactHotelDateRange,[\s\S]*?\} from "@\/lib\/hotelsDateFormatting"/,
  );
  assert.match(
    searchBarSource,
    /formatCompactHotelDateRange\(checkIn, checkOut, calendarLocale\) \?\?\s+dateSummary/,
  );
  assert.doesNotMatch(searchBarSource, /SquarePen[\s\S]{0,300}bg-\[#004BB8\]\/8/);
  assert.doesNotMatch(
    searchBarSource.slice(controlsStart, controlsEnd),
    /mobileLayout === "controls"[\s\S]*?w-\[72px\]/,
  );
});

test("mobile Hotel shortcut rail reuses filter, price, stars, and amenities state", () => {
  const toolbarStart = resultsSource.indexOf(
    "data-mobile-hotel-shortcuts",
  );
  const toolbarEnd = resultsSource.indexOf("{menu}", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(resultsSource, /setFiltersOpen\(true\)/);
  assert.match(resultsSource, /activeFilterCount/);
  assert.match(resultsSource, /trigger\("price", "Price"/);
  assert.doesNotMatch(toolbar, /trigger\("sort"|>\s*Sort\s*</);
  assert.match(resultsSource, /selectedHotelClasses/);
  assert.match(resultsSource, /toggleHotelClass/);
  assert.match(resultsSource, /selectedFilters\.facilities/);
  assert.match(resultsSource, /toggleFilter\("facilities"/);
  assert.match(toolbar, /overflow-x-auto/);
  assert.match(toolbar, /flex min-w-max items-center gap-2/);
  assert.doesNotMatch(toolbar, /<select/);
  assert.match(resultsSource, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(resultsSource, /relative translate-y-1\/2/);
  assert.doesNotMatch(resultsSource, /absolute inset-x-0 top-1\/2[\s\S]*?bg-slate-300/);
  assert.match(resultsSource, /hidden shrink-0 flex-nowrap[\s\S]*?sm:flex/);
});

test("standalone mobile Hotel summary sits between the price alert and card list", () => {
  const desktopSummary = resultsSource.indexOf('ref={standaloneResultsHeadingRef}');
  const priceAlert = resultsSource.indexOf("<HotelPriceAlertControl", desktopSummary);
  const mobileSummary = resultsSource.indexOf("data-mobile-hotel-results-summary", priceAlert);
  const cardList = resultsSource.indexOf("ref={paginationListRef}", mobileSummary);
  const mobileMarkup = resultsSource.slice(mobileSummary, cardList);
  const desktopGroupStart = resultsSource.lastIndexOf('<div role="group"', desktopSummary);
  const desktopMarkup = resultsSource.slice(desktopGroupStart, priceAlert);

  assert.ok(desktopSummary >= 0 && desktopSummary < priceAlert);
  assert.ok(priceAlert < mobileSummary && mobileSummary < cardList);
  assert.match(desktopMarkup, /!guided && "hidden sm:flex"/);
  assert.equal(resultsSource.match(/ref=\{standaloneResultsHeadingRef\}/g)?.length, 1);
  assert.match(mobileMarkup, /className="sm:hidden"/);
  assert.doesNotMatch(mobileMarkup, /standaloneResultsHeadingRef|guidedResultsHeadingRef|HotelPriceAlertControl/);
  assert.match(mobileMarkup, /\{resultsHeading\}/);
  assert.match(mobileMarkup, /resultsDisplayRange\.start/);
  assert.match(mobileMarkup, /resultsDisplayRange\.end/);
  assert.match(mobileMarkup, /Showing results \$\{resultsDisplayRange\.start\} through \$\{resultsDisplayRange\.end\}/);
  assert.equal(resultsSource.match(/data-mobile-hotel-results-summary/g)?.length, 1);

  const guidedHeading = resultsSource.indexOf("ref={guidedResultsHeadingRef}");
  assert.ok(guidedHeading >= 0 && guidedHeading < desktopSummary);
  assert.match(resultsSource.slice(guidedHeading - 200, desktopSummary), /guided \? \([\s\S]*?deals-guided-hotel-results-heading/);
});
