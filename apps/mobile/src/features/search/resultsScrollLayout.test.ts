import assert from "node:assert/strict";import{readFileSync}from"node:fs";import test from"node:test";
const s=readFileSync("src/features/search/ApprovedResultsScreen.tsx","utf8");
test("Flight dates scroll naturally before the sticky rail",()=>{assert.match(s,/ListHeaderComponent=\{flightDateStrip\}[\s\S]*renderSectionHeader[\s\S]*\{filterRail\}[\s\S]*stickySectionHeadersEnabled/);});
test("Track Price and count are ordinary virtualized list content",()=>{const x=s.slice(s.indexOf("renderItem={({ item, index })"),s.indexOf("ListEmptyComponent"));assert.match(x,/flightResultsIntro[\s\S]*PriceAlert[\s\S]*FlightResultsSummaryRow[\s\S]*FlightCard/);});
test("Flight list clears the native safe area",()=>assert.match(s,/s0\.flightResultsContent,[\s\S]*paddingBottom: Math\.max\(insets\.bottom \+ 16, 16\)/));
test("Hotel scroll and pagination remain",()=>{assert.match(s,/HotelResultsPagination/);assert.match(s,/stickyHeaderIndices=\{\[0\]\}/);});
