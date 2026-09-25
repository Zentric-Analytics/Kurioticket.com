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

test("mobile Hotel search follows the Cars floating summary below the page navbar", () => {
  assert.doesNotMatch(resultsSource, /mobileResultsSearch=\{/);
  assert.match(resultsSource, /relative z-40 bg-white pb-0 pt-0 sm:hidden/);
  assert.match(resultsSource, /relative translate-y-1\/2/);
  assert.match(resultsSource, /h-\[4\.25rem\][\s\S]*rounded-xl border border-slate-200\/80 bg-white/);
  assert.match(resultsSource, /max-w-\[30rem\]/);
  assert.match(resultsSource, /text-\[16px\] font-bold leading-5[\s\S]*text-\[#07133B\]/);
  assert.match(resultsSource, /text-\[12\.5px\] font-medium leading-4 text-\[#536B92\]/);
  assert.match(resultsSource, /<SquarePen size=\{16\} strokeWidth=\{2\.2\}/);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
});

test("Hotel mobile compact results header matches the Cars three-column toolbar", () => {
  assert.match(resultsSource, /data-hotel-mobile-compact-results-header/);
  assert.match(resultsSource, /inert=\{!mobileCompactHeaderVisible \? true : undefined\}/);
  assert.match(resultsSource, /grid-cols-\[44px_minmax\(0,1fr\)_82px\]/);
  assert.match(resultsSource, /<ArrowLeft className="h-5 w-5"/);
  assert.match(resultsSource, /<Pencil[\s\S]*className="h-3 w-3 shrink-0 text-\[#536B92\]"/);
  assert.match(resultsSource, /<SlidersHorizontal className="h-4 w-4 shrink-0 text-\[#004BB8\]"/);
  assert.match(resultsSource, /mobileSearchSummarySentinelRef/);
});

test("Hotel mobile filter and quick-filter surfaces match Cars background treatment", () => {
  assert.match(resultsSource, /data-mobile-hotel-shortcuts[\s\S]*scrollbar-hide -me-4 flex w-\[calc\(100%\+1rem\)\]/);
  assert.match(resultsSource, /border-\[#D8E1EC\] bg-white text-\[#142033\] group-hover:bg-slate-50/);
  assert.match(resultsSource, /active[\s\S]{0,180}border-\[#142033\] bg-\[#142033\] text-white/);
  assert.doesNotMatch(resultsSource, /active[\s\S]{0,180}border-\[#075EE8\] bg-\[#EAF2FF\] text-\[#004BB8\]/);
  assert.match(resultsSource, /mobileShortcutMenuContentRef[sS]*rounded-t-[20px] bg-[#F2F4F8]/);
  assert.match(resultsSource, /mobileShortcutMenuContentRef[sS]*header className="[^"]*bg-[#F2F4F8]/);
  assert.match(resultsSource, /max-h-[calc(min(76dvh,620px)-9rem)][^"]*bg-[#F2F4F8]/);
  assert.match(resultsSource, /mobileShortcutMenu !== "sort" ? <footer className="[^"]*bg-[#F2F4F8]/);
  assert.match(resultsSource, /aria-label="Hotel filters"[sS]*bg-[#F2F4F8]/);
  assert.match(resultsSource, /hotel-filter-scrollbar[^"]*bg-[#F2F4F8]/);
  assert.match(resultsSource, /border-t border-[#D8DEE8] bg-[#F2F4F8]/);
  assert.doesNotMatch(resultsSource, /aria-label="Hotel filters"[sS]{0,500}bg-[#F1F3F8]|sm:bg-[#F6F8FB]/);
});

test("mobile Hotel shortcut rail keeps Cars geometry while Sort stays with the results summary", () => {
  const toolbarStart = resultsSource.indexOf(
    "data-mobile-hotel-shortcuts",
  );
  const toolbarEnd = resultsSource.indexOf("{menu}", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(resultsSource, /setFiltersOpen\(true\)/);
  assert.match(resultsSource, /activeFilterCount/);
  assert.match(resultsSource, /type MobileHotelShortcutMenu = "price" \| "stars" \| "amenities" \| "roomTypes" \| "sort"/);
  assert.match(toolbar, /<span>Filter<\/span>[\s\S]*trigger\("price", mobilePriceShortcutLabel[\s\S]*trigger\("stars", mobileStarsShortcutLabel[\s\S]*trigger\("amenities", mobileFacilitiesShortcutLabel[\s\S]*trigger\("roomTypes", mobileRoomTypesShortcutLabel/);
  assert.doesNotMatch(toolbar, /Sort hotels:|openMobileShortcutMenu\("sort"/);
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
  assert.match(toolbar, /scrollbar-hide -me-4 flex w-\[calc\(100%\+1rem\)\] flex-nowrap gap-1\.5 overflow-x-auto overscroll-x-contain pe-4/);
  assert.match(resultsSource, /group inline-flex min-h-11 min-w-11 shrink-0 items-center/);
  assert.match(resultsSource, /inline-flex h-9 items-center gap-1 rounded-\[9px\]/);
  assert.match(resultsSource, /overflow-hidden p-0/);
  assert.doesNotMatch(toolbar, /mobileShortcutRailRef|clampIosHotelShortcutRail|rail\.scrollLeft/);
  assert.doesNotMatch(toolbar, /<select/);
  assert.doesNotMatch(resultsSource, /mobileResultsSearch=/);
  assert.match(resultsSource, /data-hotel-mobile-search-summary/);
  assert.match(resultsSource, /relative translate-y-1\/2/);
  assert.match(resultsSource, /data-hotel-results-toolbar/);
});

test("standalone mobile Hotel summary keeps result count with Sort in its previous position", () => {
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


test("Hotel mobile Back-to-top sits near the bottom edge while desktop spacing stays unchanged", () => {
  const start = resultsSource.indexOf('aria-label="Back to top"');
  const end = resultsSource.indexOf("</button>", start);
  const control = resultsSource.slice(start, end);

  assert.notEqual(start, -1);
  assert.match(control, /bottom-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(control, /sm:bottom-6 sm:right-6/);
  assert.match(control, /bg-\[#F8FAFC\]/);
  assert.doesNotMatch(control, /bg-white/);
  assert.doesNotMatch(control, /bottom-\[calc\(5rem\+env\(safe-area-inset-bottom\)\)\]/);
});


test("Hotel mobile shortcut labels replace per-chip count badges with the selected values", () => {
  assert.match(resultsSource, /mobilePriceShortcutLabel/);
  assert.match(resultsSource, /mobileStarsShortcutLabel/);
  assert.match(resultsSource, /mobileFacilitiesShortcutLabel/);
  assert.match(resultsSource, /mobileRoomTypesShortcutLabel/);
  assert.match(resultsSource, /notation: "compact"/);
  assert.match(resultsSource, /aria-pressed=\{active\}/);
  assert.doesNotMatch(resultsSource, /\{count > 0 \? <span className="rounded-full bg-\[#004BB8\]/);
  assert.match(resultsSource, /hidden max-w-full space-y-2 overflow-x-clip sm:block/);
});


test("active Hotel mobile shortcuts use the font-color fill, compact X, and normal Hotel loading state", () => {
  assert.match(resultsSource, /clearMobileShortcutFilter/);
  assert.match(resultsSource, /Clear \$\{label\} filter/);
  assert.match(resultsSource, /<X className="h-3 w-3"/);
  assert.match(resultsSource, /border-\[#142033\] bg-\[#142033\] text-white/);
  assert.match(resultsSource, /bg-\[#F1F5F9\][^"]*text-\[#142033\]/);
  assert.doesNotMatch(resultsSource, /border-\[#075EE8\] bg-\[#EAF2FF\] text-\[#004BB8\]/);
  assert.doesNotMatch(resultsSource, /data-hotel-filter-refresh-progress/);
  assert.match(resultsSource, /if \(loading \|\| filterApplying\)/);
  assert.match(resultsSource, /<BrandedLoading variant="fullscreen"[\s\S]*searchType="hotel"/);
  assert.match(resultsSource, /active \? "pl-2 pr-6" : "px-2"/);
  assert.match(resultsSource, /absolute right-0\.5 top-1\/2 inline-flex h-6 w-6/);
});
