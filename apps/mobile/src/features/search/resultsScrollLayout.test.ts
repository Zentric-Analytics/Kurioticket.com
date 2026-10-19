import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const s=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");
test("Flight dates scroll naturally before the sticky rail",()=>{assert.match(s,/ListHeaderComponent=\{flightDateStrip\}[\s\S]*renderSectionHeader[\s\S]*\{filterRail\}[\s\S]*stickySectionHeadersEnabled/);});
test("Track Price and count are ordinary virtualized list content",()=>{const x=s.slice(s.indexOf("renderItem={({ item, index })"),s.indexOf("ListEmptyComponent"));assert.match(x,/flightResultsIntro[\s\S]*PriceAlert[\s\S]*FlightResultsSummaryRow[\s\S]*FlightCard/);});
test("Flight list clears the native safe area",()=>assert.match(s,/s0\.flightResultsContent,[\s\S]*paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\)/));
test("Hotel results use one continuous virtualized sticky list", () => {
  const x = s.slice(s.indexOf("<SectionList", s.indexOf("<HotelResultsHeader")), s.indexOf("{product === \"flight\" ? (", s.indexOf("<HotelResultsHeader")));
  assert.match(x, /ref=\{hotelResultsListRef\}/);
  assert.match(x, /sections=\{\[\{ data: hotelResultsListData \}\]\}/);
  assert.match(x, /keyExtractor=\{\(item\) => typeof item === "string" \? item : item\.id\}/);
  assert.match(x, /stickySectionHeadersEnabled/);
  assert.match(x, /initialNumToRender=\{5\}/);
  assert.match(x, /maxToRenderPerBatch=\{4\}/);
  assert.match(x, /updateCellsBatchingPeriod=\{50\}/);
  assert.match(x, /windowSize=\{7\}/);
  assert.match(x, /removeClippedSubviews=\{Platform\.OS === "android"\}/);

  const data = s.slice(s.indexOf("const hotelResultsListData"), s.indexOf("const hotelCurrencyPending"));
  assert.match(data, /data\.push\(HOTEL_RESULTS_SUMMARY_ITEM, \.\.\.\(sorted as HotelResult\[\]\)\)/);
  assert.match(data, /\[product, sorted, status\]/);
  assert.doesNotMatch(data, /\.slice\(/);
  assert.doesNotMatch(s, /HotelResultsPagination|paginateHotelResults|HOTEL_RESULTS_PAGE_SIZE|clampedHotelPage|hotelPage|setHotelPage|changeHotelPage/);
});
