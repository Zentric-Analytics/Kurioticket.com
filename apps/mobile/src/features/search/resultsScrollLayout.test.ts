import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const s=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");
test("Flight dates scroll naturally beneath the sticky rail",()=>{assert.match(s,/renderSectionHeader[\s\S]*\{filterRail\}[\s\S]*stickySectionHeadersEnabled/);});
test("Track Price and count are ordinary virtualized list content",()=>{const x=s.slice(s.indexOf("renderItem={({ item, index })"),s.indexOf("ListEmptyComponent"));assert.match(x,/flightResultsIntro[\s\S]*PriceAlert[\s\S]*FlightResultsSummaryRow[\s\S]*FlightCard/);});
test("Flight list clears the native safe area",()=>assert.match(s,/s0\.flightResultsContent,[\s\S]*paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\)/));
test("Hotel results use one continuous virtualized list with bounded result reveals", () => {
  const x = s.slice(s.indexOf("<SectionList", s.indexOf("<HotelResultsHeader")), s.indexOf("{product === \"flight\" ? (", s.indexOf("<HotelResultsHeader")));
  assert.match(x, /ref=\{hotelResultsListRef\}/);
  assert.match(x, /sections=\{\[\{ data: hotelResultsListData \}\]\}/);
  assert.match(x, /keyExtractor=\{\(item\) => typeof item === "string" \? item : item\.id\}/);
  assert.doesNotMatch(x, /renderSectionHeader/);
  assert.match(x, /initialNumToRender=\{HOTEL_RESULTS_REVEAL_COUNT \+ 2\}/);
  assert.match(x, /maxToRenderPerBatch=\{HOTEL_RESULTS_REVEAL_COUNT\}/);
  assert.match(x, /updateCellsBatchingPeriod=\{HOTEL_RESULTS_BATCH_PERIOD\}/);
  assert.match(x, /windowSize=\{HOTEL_RESULTS_RENDER_WINDOW\}/);
  assert.match(x, /removeClippedSubviews=\{false\}/);

  const data = s.slice(s.indexOf("const hotelResultsListData"), s.indexOf("const hotelCurrencyPending"));
  assert.match(data, /data\.push\(HOTEL_RESULTS_SUMMARY_ITEM, \.\.\.\(sorted as HotelResult\[\]\)\.slice\(0, hotelScrolling\.limit\)\)/);
  assert.match(data, /\[product, sorted, status, hotelScrolling\.limit\]/);
  assert.match(x, /onEndReached=\{hotelScrolling\.revealMore\}/);
  assert.doesNotMatch(s, /HotelResultsPagination|paginateHotelResults|HOTEL_RESULTS_PAGE_SIZE|clampedHotelPage|hotelPage|setHotelPage|changeHotelPage/);
});
