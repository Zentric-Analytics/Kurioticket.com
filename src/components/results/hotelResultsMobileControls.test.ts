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
const nativeHotelFilterSource = readFileSync(
  new URL("../../../apps/mobile/src/features/search/HotelFilterSheet.tsx", import.meta.url),
  "utf8",
);
const nativeHotelQuickFilterSource = readFileSync(
  new URL("../../../apps/mobile/src/features/search/HotelResultsQuickFilterSheet.tsx", import.meta.url),
  "utf8",
);
const nativeSheetShellSource = readFileSync(
  new URL("../../../apps/mobile/src/features/search/FlightResultsSheetShell.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
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

test("mobile-web Hotel full filter sheet follows the Native filter geometry", () => {
  assert.match(nativeHotelFilterSource, /header:\{minHeight:76,paddingLeft:20,paddingRight:10/);
  assert.match(nativeHotelFilterSource, /content:\{paddingHorizontal:24,paddingTop:16,paddingBottom:32,gap:24\}/);
  assert.match(nativeHotelFilterSource, /row:\{minHeight:46/);
  assert.match(nativeHotelFilterSource, /box:\{width:20,height:20/);
  assert.match(nativeHotelFilterSource, /resetButton:\{minWidth:116,height:49/);
  assert.match(nativeHotelFilterSource, /viewButton:\{width:"100%",minHeight:50,borderRadius:10/);

  const sheetStart = resultsSource.indexOf('aria-label="Hotel filters"');
  const sheetEnd = resultsSource.indexOf("</aside>", sheetStart);
  const sheet = resultsSource.slice(sheetStart, sheetEnd);

  assert.match(sheet, /fixed inset-0[^"]*h-\[100dvh\][^"]*w-full[^"]*rounded-none[^"]*bg-\[#F2F4F8\]/);
  assert.match(sheet, /min-h-\[76px\][^"]*ps-5[^"]*pe-\[10px\]/);
  assert.match(sheet, /text-\[20px\] font-bold leading-\[26px\]/);
  assert.match(sheet, /hotel-filter-scrollbar[^"]*px-6[^"]*pb-8[^"]*pt-4/);
  assert.match(sheet, /h-\[49px\] min-w-\[116px\][^"]*rounded-\[12px\]/);
  assert.match(sheet, /min-h-\[50px\][^"]*rounded-\[10px\][^"]*bg-\[#0754F7\]/);
});

test("mobile-web Hotel quick filters follow the Native floating sheet contract", () => {
  assert.match(nativeSheetShellSource, /FLIGHT_QUICK_SHEET_HORIZONTAL_INSET = 12/);
  assert.match(nativeSheetShellSource, /FLIGHT_FLOATING_SHEET_BOTTOM_GAP = 12/);
  assert.match(nativeSheetShellSource, /maxHeight: Math\.min\(height \* \.76, 620\)/);
  assert.match(nativeSheetShellSource, /floatingFlightSheet: \{ borderBottomLeftRadius: 24, borderBottomRightRadius: 24 \}/);
  assert.match(nativeHotelQuickFilterSource, /reset:\{minWidth:116,height:49/);
  assert.match(nativeHotelQuickFilterSource, /apply:\{flex:1,height:49,borderRadius:12/);

  assert.match(resultsSource, /data-hotel-native-quick-sheet/);
  assert.match(resultsSource, /mx-3 mb-3[^"]*max-h-\[min\(76dvh,620px\)\][^"]*rounded-\[24px\]/);
  assert.match(resultsSource, /grid min-h-\[76px\][^"]*grid-cols-\[44px_minmax\(0,1fr\)_44px\]/);
  assert.match(resultsSource, /min-h-\[52px\][^"]*px-\[10px\]/);
  assert.match(resultsSource, /h-\[49px\] min-w-\[116px\][^"]*rounded-\[12px\]/);
  assert.match(resultsSource, /h-\[49px\][^"]*flex-1[^"]*rounded-\[12px\][^"]*bg-\[#0754F7\]/);
  assert.match(globalStyles, /hotel-native-quick-scrim-in[\s\S]*160ms ease-out/);
  assert.match(globalStyles, /hotel-native-quick-sheet-in[\s\S]*translate3d\(0, 28px, 0\)[\s\S]*220ms ease-out/);
});

test("mobile-web Hotel quick Sort keeps a Native-style draft until Apply", () => {
  assert.match(nativeHotelQuickFilterSource, /const \[sortMode,setSortMode\]=useState<HotelSortMode>\(sort\)/);
  assert.match(nativeHotelQuickFilterSource, /if\(kind==="sort"\)\{onSortChange\(sortMode\);onClose\(\);return;\}/);

  assert.match(resultsSource, /mobileShortcutDraftSort/);
  assert.match(resultsSource, /if \(menu === "sort"\) setMobileShortcutDraftSort\(hotelSummarySortMode\)/);
  assert.match(resultsSource, /function handleMobileSortSelection[\s\S]*setMobileShortcutDraftSort\(value\)/);
  assert.doesNotMatch(
    resultsSource.slice(
      resultsSource.indexOf("function handleMobileSortSelection"),
      resultsSource.indexOf("function renderMobileCompactResultsHeader"),
    ),
    /updateHotelSummarySortMode\(value\)|closeMobileShortcutMenu\(true\)/,
  );
  assert.match(resultsSource, /mobileShortcutMenu === "sort"[\s\S]*updateHotelSummarySortMode\(mobileShortcutDraftSort\)[\s\S]*closeMobileShortcutMenu\(true\)/);
});


test("mobile Hotel shortcut rail matches Native capsule geometry and content", () => {
  const toolbarStart = resultsSource.indexOf("data-mobile-hotel-shortcuts");
  const toolbarEnd = resultsSource.indexOf("{menu}", toolbarStart);
  const toolbar = resultsSource.slice(toolbarStart, toolbarEnd);

  assert.notEqual(toolbarStart, -1);
  assert.match(toolbar, /className="h-11 w-full min-w-0 bg-transparent"/);
  assert.match(toolbar, /flex h-11 min-w-max flex-nowrap items-center gap-1\.5 ps-3 pe-4/);
  assert.match(toolbar, /inline-flex h-10[^"]*rounded-\[10px\][^"]*px-2[^"]*text-\[13px\]/);
  assert.match(toolbar, /h-5 min-w-5[^"]*rounded-full[^"]*px-1\.5[^"]*text-\[11px\]/);
  assert.match(toolbar, /<span>Filter<\/span>[\s\S]*trigger\("price", "Price"[\s\S]*trigger\("stars", "Stars"[\s\S]*trigger\("amenities", "Facilities"[\s\S]*trigger\("roomTypes", "Room & bed"/);
  assert.doesNotMatch(toolbar, /trigger\("sort"/);
  assert.match(resultsSource, /openMobileShortcutMenu\("sort", event\.currentTarget\)/);
  assert.match(resultsSource, /type MobileHotelShortcutMenu = "price" \| "stars" \| "amenities" \| "roomTypes" \| "sort"/);
  assert.doesNotMatch(toolbar, /<select/);
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
