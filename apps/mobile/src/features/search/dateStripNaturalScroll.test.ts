import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const list = source.slice(source.indexOf("<Animated.SectionList"), source.indexOf(") : (", source.indexOf("<Animated.SectionList")));

test("the date strip stays fully opaque in ordinary list-item flow", () => {
  assert.match(list, /flightResultsIntro[\s\S]*?\{flightDateStrip\}/);
  assert.doesNotMatch(source, /flightDateStripScrollY|flightDateStripHeaderHeight|flightDateStripOpacity|animatedFlightDateStrip/);
  assert.doesNotMatch(list, /ListHeaderComponent=\{[^}]*Animated|position:\s*"absolute"|stickyHeaderIndices/);
});

test("the filter rail stays persistent because the header owns it, not the list", () => {
  const header = source.slice(source.indexOf("function FlightResultsHeader"), source.indexOf("function HotelResultsHeader"));
  assert.match(header, /accessibilityLabel="Flight result filters"[\s\S]*?\{filterRail\}/);
  assert.doesNotMatch(list, /renderSectionHeader|stickySectionHeadersEnabled|\{filterRail\}/);
  assert.doesNotMatch(list, /flightPagination/);
  assert.match(list, /onScrollEndDrag=\{hideFlightResultsScrollIndicator\}/);
  assert.match(list, /onMomentumScrollEnd=\{hideFlightResultsScrollIndicator\}/);
});
