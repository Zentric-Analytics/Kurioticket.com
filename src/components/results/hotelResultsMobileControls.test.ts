import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const resultsPageSource = readFileSync(
  new URL("../../app/hotels/results/page.tsx", import.meta.url),
  "utf8",
);
const searchBarSource = readFileSync(
  new URL("../search/HotelSearchBar.tsx", import.meta.url),
  "utf8",
);

test("Hotel Results hides only the mobile category tabs", () => {
  const headerCall = resultsPageSource.match(/<AppHeader[\s\S]*?\/>/)?.[0] ?? "";

  assert.match(headerCall, /hideMobileCategoryTabs/);
  assert.match(headerCall, /hideDesktopTravelNav/);
  assert.match(headerCall, /flushMobileBottom/);
  assert.doesNotMatch(headerCall, /hideTravelNav/);
});

test("mobile Hotel search uses the Cars floating results summary below the page navbar", () => {
  assert.doesNotMatch(resultsSource, /mobileResultsSearch=\{/);
  assert.match(resultsSource, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(resultsSource, /h-\[4\.25rem\][\s\S]*rounded-xl border border-slate-200\/80 bg-white/);
  assert.match(resultsSource, /max-w-\[30rem\]/);
  assert.match(resultsSource, /text-\[16px\] font-bold leading-5[\s\S]*text-\[#07133B\]/);
  assert.match(resultsSource, /text-\[12\.5px\] font-medium leading-4 text-\[#536B92\]/);
  assert.match(resultsSource, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
});

test("mobile Hotel shortcut rail keeps Filter Price Stars Facilities Room & bed while Sort lives with results", () => {
  const toolbarStart = resultsSource.indexOf(
    "data-mobile-hotel-shortcuts",
  );
  const toolbarEnd = resultsSource.indexOf("{menu}", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(resultsSource, /setFiltersOpen\(true\)/);
  assert.match(resultsSource, /activeFilterCount/);
  assert.match(resultsSource, /type MobileHotelShortcutMenu = "price" \| "stars" \| "amenities" \| "roomTypes" \| "sort"/);
  assert.match(toolbar, /<span>Filter<\/span>[\s\S]*trigger\("price", "Price"[\s\S]*trigger\("stars", "Stars"[\s\S]*trigger\("amenities", "Facilities"[\s\S]*trigger\("roomTypes", "Room & bed"/);
  assert.doesNotMatch(toolbar, /trigger\("sort"/);
  assert.match(resultsSource, /handleMobileSortSelection/);
  assert.match(resultsSource, /aria-pressed=\{hotelSummarySortMode === option.value\}/);
  assert.match(resultsSource, /updateHotelSummarySortMode\(value\)/);
  assert.match(resultsSource, /closeMobileShortcutMenu\(true\)/);
  assert.match(resultsSource, /openMobileShortcutMenu\("sort", event\.currentTarget\)/);
  assert.match(resultsSource, /selectedHotelClasses/);
  assert.match(resultsSource, /selectedFilters\.facilities/);
  assert.match(resultsSource, /selectedFilters\.roomTypes/);
  assert.match(resultsSource, /mobileShortcutDraftFacilities/);
  assert.match(resultsSource, /mobileShortcutDraftRoomTypes/);
  assert.match(toolbar, /overflow-x-auto/);
  assert.match(toolbar, /flex min-w-max items-center gap-2/);
  assert.doesNotMatch(toolbar, /<select/);
  assert.doesNotMatch(resultsSource, /mobileResultsSearch=/);
  assert.match(resultsSource, /relative translate-y-1\/2/);
  assert.match(resultsSource, /absolute inset-x-0 top-1\/2[\s\S]*?bg-slate-300/);
  assert.match(resultsSource, /hidden shrink-0 flex-nowrap[\s\S]*?sm:flex/);
});

test("standalone mobile Hotel summary keeps result count with Sort and removes the duplicate page range", () => {
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
  assert.match(mobileMarkup, /className="[^"]*sm:hidden"/);
  assert.doesNotMatch(mobileMarkup, /standaloneResultsHeadingRef|guidedResultsHeadingRef|HotelPriceAlertControl/);
  assert.match(mobileMarkup, /\{resultsHeading\}/);
  assert.match(mobileMarkup, /<span>Sort:<\/span>[\s\S]*currentSortLabel/);
  assert.match(mobileMarkup, /openMobileShortcutMenu\("sort", event\.currentTarget\)/);
  assert.match(mobileMarkup, /totalHotelResultPages > 1/);
  assert.equal(resultsSource.match(/data-mobile-hotel-results-summary/g)?.length, 1);

  const guidedHeading = resultsSource.indexOf("ref={guidedResultsHeadingRef}");
  assert.ok(guidedHeading >= 0 && guidedHeading < desktopSummary);
  assert.match(resultsSource.slice(guidedHeading - 200, desktopSummary), /guided \? \([\s\S]*?deals-guided-hotel-results-heading/);
});
