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

test("mobile Hotel search lives in the navbar and retains the existing edit sheet", () => {
  assert.doesNotMatch(resultsSource, /mobileResultsSearch=\{/);
  assert.match(resultsPageSource, /mobileResultsSearch=\{<div data-hotel-results-mobile-nav-search/);
  assert.match(resultsSource, /setMobileNavSearchTarget\(document\.querySelector<HTMLElement>\("\[data-hotel-results-mobile-nav-search\]"\)\)/);
  assert.match(resultsSource, /createPortal\(renderMobileHotelNavSearch\(\), mobileNavSearchTarget\)/);
  assert.match(resultsSource, /aria-expanded=\{mobileHotelSearchOpen\}/);
  assert.match(resultsSource, /<MobileResultsEditSheet/);
  assert.match(searchBarSource, /mobileLayout === "controls"/);
});

test("Hotel mobile navbar shows the applied search without a scroll-swapped duplicate", () => {
  assert.match(resultsSource, /\{body\.destination\}/);
  assert.match(resultsSource, /mobileNavDateSummary/);
  assert.match(resultsSource, /mobileNavGuestsSummary/);
  assert.match(resultsSource, /data-hotel-results-mobile-nav-search-button/);
  assert.doesNotMatch(resultsSource, /mobileSearchSummarySentinelRef|mobileCompactHeaderVisible/);
});

test("Hotel mobile filter and quick-filter surfaces match Cars background treatment", () => {
  assert.match(resultsSource, /data-mobile-hotel-shortcuts[\s\S]*scrollbar-hide -me-4 flex w-\[calc\(100%\+1rem\)\]/);
  assert.match(resultsSource, /border-\[#D8E1EC\] bg-white text-\[#142033\] group-hover:bg-slate-50/);
  assert.match(resultsSource, /active[\s\S]{0,180}border-\[#142033\] bg-\[#142033\] text-white/);
  assert.doesNotMatch(resultsSource, /active[\s\S]{0,180}border-\[#075EE8\] bg-\[#EAF2FF\] text-\[#004BB8\]/);
  assert.match(resultsSource, /mobileShortcutMenuContentRef[\s\S]*?rounded-\[24px\] bg-\[#F2F4F8\]/);
  assert.match(resultsSource, /aria-label="Hotel filters"[^\n]*bg-\[#F2F4F8\]/);
  assert.match(resultsSource, /hotel-filter-scrollbar[^\n]*bg-\[#F2F4F8\]/);
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
  assert.match(resultsSource, /aria-pressed=\{mobileDraftSort === option.value\}/);
  assert.match(resultsSource, /updateHotelSummarySortMode\(mobileDraftSort\)/);
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
  assert.match(resultsSource, /data-hotel-results-mobile-nav-search-button/);
  assert.match(resultsSource, /data-hotel-results-toolbar/);
});

test("desktop and mobile Hotel result summaries keep their own count and sort controls", () => {
  const desktopSummary = resultsSource.indexOf('ref={standaloneResultsHeadingRef}');
  const mobileSummary = resultsSource.indexOf("data-mobile-hotel-results-summary", desktopSummary);
  const cardList = resultsSource.indexOf("ref={paginationListRef}", mobileSummary);
  const mobileMarkup = resultsSource.slice(mobileSummary, cardList);
  const desktopGroupStart = resultsSource.lastIndexOf('<div role="group"', desktopSummary);
  const desktopMarkup = resultsSource.slice(desktopGroupStart, mobileSummary);

  assert.ok(desktopSummary >= 0 && desktopSummary < mobileSummary && mobileSummary < cardList);
  assert.match(desktopMarkup, /data-hotel-results-sort-menu|hotel-results-sort-trigger/);
  assert.equal(resultsSource.match(/ref=\{standaloneResultsHeadingRef\}/g)?.length, 1);
  assert.match(mobileMarkup, /className="[^"]*sm:hidden"/);
  assert.doesNotMatch(mobileMarkup, /standaloneResultsHeadingRef|guidedResultsHeadingRef/);
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
  assert.match(resultsSource, /hidden max-w-full overflow-x-clip sm:block/);
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


test("mobile Hotel Results navbar arrow leads directly to the homepage", () => {
  const headerSource = readFileSync(
    new URL("../layout/AppHeader.tsx", import.meta.url),
    "utf8",
  );
  const marker = headerSource.indexOf("data-hotel-results-mobile-back");
  assert.notEqual(marker, -1);
  const linkStart = headerSource.lastIndexOf("<Link", marker);
  const linkEnd = headerSource.indexOf("</Link>", marker);
  assert.ok(linkStart >= 0 && linkEnd > marker);
  const block = headerSource.slice(linkStart, linkEnd + "</Link>".length);
  assert.ok(block.includes('href="/"'));
  assert.match(block, /aria-label="Kurioticket home"/);
  assert.match(block, /handleRouteLinkClick\(event, "\/"\)/);
  assert.match(block, /<ArrowLeft size=\{24\} strokeWidth=\{2\.2\}/);
  assert.doesNotMatch(block, /router\.back\(\)|router\.push\("\/hotels"\)/);
});

test("Hotel mobile menu covers the full viewport like Flight", () => {
  const headerSource = readFileSync(
    new URL("../layout/AppHeader.tsx", import.meta.url),
    "utf8",
  );
  assert.match(headerSource, /const fullscreenHotelMobileMenu = Boolean\(hotelResultsDesktopSticky && mobileResultsSearch\)/);
  assert.match(headerSource, /fullscreenHotelMobileMenu && "max-sm:z-\[1100\]"/);
  assert.match(headerSource, /fullscreenHotelMobileMenu && "max-sm:inset-x-0 max-sm:top-0 max-sm:w-full max-sm:max-w-none"/);
});





test("Hotel mobile filters keep the original natural-to-pinned scroll handoff on the white navbar surface", () => {
  assert.match(resultsSource, /mobileFiltersVisible/);
  assert.match(resultsSource, /mobileFiltersPinned/);
  assert.match(resultsSource, /mobileFiltersAnimated/);
  assert.match(resultsSource, /mobileFilterOriginRef/);
  assert.match(resultsSource, /data-scroll-visible=\{mobileFiltersVisible \? "true" : "false"\}/);
  assert.match(resultsSource, /data-scroll-pinned=\{mobileFiltersPinned \? "true" : "false"\}/);
  assert.match(resultsSource, /mobileStyles\.scrollFilterBarPinned/);
  assert.match(resultsSource, /mobileStyles\.scrollFilterBarHidden/);
  assert.match(resultsSource, /mobileStyles\.hotelNavbarFilterBar/);
  assert.match(resultsSource, /ref=\{mobileFilterOriginRef\}[\s\S]*data-hotel-results-toolbar/);
  assert.doesNotMatch(resultsSource, /renderMobileHotelNavbarFilters|createPortal\(renderMobileHotelNavbarFilters/);
  assert.doesNotMatch(resultsPageSource, /mobileResultsFilters=/);
});


test("Hotel mobile filter row ignores filter-interaction scroll restoration", () => {
  assert.match(resultsSource, /const filterInteractionActive =/);
  assert.match(resultsSource, /filtersOpen[\s\S]*Boolean\(mobileShortcutMenu\)[\s\S]*mobileHotelSearchOpen[\s\S]*filterApplying/);
  assert.match(resultsSource, /if \(filterInteractionActive\) \{[\s\S]*direction = 0;[\s\S]*distance = 0;[\s\S]*return;/);
  assert.match(resultsSource, /setMobileFiltersVisible\(true\);[\s\S]*direction = 0;[\s\S]*distance = 0;/);
  assert.match(resultsSource, /\[filterApplying, filtersOpen, guided, loading, mobileHotelSearchOpen, mobileShortcutMenu, results\.length\]/);
});

test("Hotel mobile filter row ignores iOS bottom rubber-band reverse deltas", () => {
  assert.match(resultsSource, /Math\.min\(maxScrollY, Math\.max\(0, window\.scrollY\)\)/);
  assert.match(resultsSource, /const distanceFromBottom = Math\.max\(0, maxScrollY - scrollY\)/);
  assert.match(resultsSource, /if \(delta < 0 && distanceFromBottom <= 40\)/);
  assert.match(resultsSource, /if \(distance >= \(nextDirection > 0 \? 20 : 12\)\)/);
});


test("Hotel mobile filter handoff hides cleanly on the first downward pin", () => {
  assert.match(
    resultsSource,
    /if \(!mobileFiltersPinnedRef\.current\)[\s\S]*setMobileFiltersPinned\(true\)[\s\S]*setMobileFiltersVisible\(delta < 0\)[\s\S]*direction = Math\.sign\(delta\)/,
  );
  assert.doesNotMatch(
    resultsSource,
    /Pinning or returning from a filter interaction should not hide the row/,
  );
});

test("Hotel mobile quick filter keeps the underlying results at the same scroll position", () => {
  assert.match(
    resultsSource,
    /const releaseScrollLock = acquireMobileResultsScrollLock\(\{ freezeBodyPosition: false \}\);[\s\S]*mobileShortcutMenuContentRef/,
  );
});


test("Hotel mobile filter rail uses the exact Flight Results 28px left edge while Sort remains in results", () => {
  const mobileStyles = readFileSync(
    new URL("./HotelResultsMobile.module.css", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(
    new URL("../../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    globalsSource,
    /\[data-flight-results-desktop-header\] \{[\s\S]*border-bottom-left-radius: 28px;[\s\S]*\}/,
  );
  assert.match(
    globalsSource,
    /\[data-flight-results-desktop-header\] > \[data-mobile-results-filter-navbar\] \{[\s\S]*border-bottom-left-radius: inherit;[\s\S]*overflow: hidden;/,
  );
  assert.match(
    mobileStyles,
    /\.hotelScrollFilterSlot \{[\s\S]*border-bottom-left-radius: 28px;[\s\S]*border-bottom-right-radius: 0;[\s\S]*box-shadow: 0 1px 0 #d8e1ec;/,
  );
  assert.match(
    mobileStyles,
    /\.hotelScrollFilterSlot > \.hotelNavbarFilterBar \{[\s\S]*border-bottom-left-radius: inherit;[\s\S]*border-bottom-right-radius: inherit;[\s\S]*overflow: hidden;[\s\S]*background: #fff;/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned\.hotelNavbarFilterBar \{[\s\S]*background: #fff;[\s\S]*border-bottom-left-radius: 28px;[\s\S]*border-bottom-right-radius: 0;[\s\S]*overflow: hidden;[\s\S]*box-shadow: 0 1px 0 #d8e1ec;/,
  );
  assert.match(
    mobileStyles,
    /\.hotelScrollFilterSlot::after,[\s\S]*\.scrollFilterBarPinned\.hotelNavbarFilterBar::after,[\s\S]*content: none;[\s\S]*display: none;/,
  );
  assert.match(
    resultsSource,
    /mobileStyles\.scrollFilterSlot, mobileStyles\.hotelScrollFilterSlot/,
  );
  assert.match(resultsSource, /data-mobile-hotel-shortcuts/);
  assert.match(resultsSource, /<span>Sort:<\/span>[\s\S]*currentSortLabel/);
  assert.doesNotMatch(resultsSource, /renderMobileHotelNavbarFilters[\s\S]{0,600}Sort:/);
});


test("Hotel mobile navbar keeps the Flight Results curve while preserving the PR6167 filter inset", () => {
  const headerSource = readFileSync(
    new URL("../layout/AppHeader.tsx", import.meta.url),
    "utf8",
  );
  const mobileStyles = readFileSync(
    new URL("./HotelResultsMobile.module.css", import.meta.url),
    "utf8",
  );

  assert.match(
    headerSource,
    /!mobileResultsFilters && !hotelResultsDesktopSticky && "border-b border-slate-200"/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterSlot \{[\s\S]*padding: 8px 4px 0;/,
  );
  assert.match(
    mobileStyles,
    /\.hotelScrollFilterSlot \{[\s\S]*border-bottom-left-radius: 28px;[\s\S]*border-bottom-right-radius: 0;/,
  );
});


test("Hotel mobile filter rail is not fixed before the existing handoff point", () => {
  const mobileStyles = readFileSync(
    new URL("./HotelResultsMobile.module.css", import.meta.url),
    "utf8",
  );
  const naturalRule = mobileStyles.match(/\.hotelNavbarFilterBar \{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.doesNotMatch(naturalRule, /position:\s*fixed|top:\s*calc/);
  assert.match(resultsSource, /naturalFilterBottom = mobileFilterOriginRef\.current\?\.getBoundingClientRect\(\)\.bottom/);
  assert.match(resultsSource, /if \(naturalFilterBottom <= 8\)/);
  assert.match(resultsSource, /mobileFiltersPinned && mobileStyles\.scrollFilterBarPinned/);
});


test("Hotel mobile filter rail keeps the same tighter 4px horizontal inset when pinned", () => {
  const mobileStyles = readFileSync(
    new URL("./HotelResultsMobile.module.css", import.meta.url),
    "utf8",
  );
  const pinnedHotelRule =
    mobileStyles.match(/\.scrollFilterBarPinned\.hotelNavbarFilterBar \{([\s\S]*?)\n  \}/)?.[1] ?? "";

  assert.doesNotMatch(pinnedHotelRule, /padding-inline:/);
  assert.match(
    mobileStyles,
    /\.scrollFilterSlot \{[\s\S]*padding: 8px 4px 0;/,
  );
  assert.match(
    mobileStyles,
    /\.hotelNavbarFilterBar \[data-mobile-hotel-shortcuts\][\s\S]*scroll-padding-inline: 4px;/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned \[data-mobile-hotel-shortcuts\][\s\S]*padding-inline: 4px;[\s\S]*scroll-padding-inline: 4px;/,
  );
  assert.match(
    mobileStyles,
    /\.scrollFilterBarPinned \[data-cars-results-quick-filters\][\s\S]*padding-inline: 12px;[\s\S]*scroll-padding-inline: 12px;/,
  );
});
