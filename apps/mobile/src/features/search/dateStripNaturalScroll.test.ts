import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const list = source.slice(source.indexOf("<Animated.SectionList"), source.indexOf(") : (", source.indexOf("<Animated.SectionList")));

test("the date strip stays fully opaque in normal list-header flow", () => {
  assert.match(list, /ListHeaderComponent=\{hasFlightDateStrip \?/);
  assert.doesNotMatch(source, /flightDateStripScrollY|flightDateStripHeaderHeight|flightDateStripOpacity|animatedFlightDateStrip/);
  assert.doesNotMatch(list, /ListHeaderComponent=\{[^}]*Animated|position:\s*"absolute"|stickyHeaderIndices/);
});

test("the filter rail remains sticky without pagination settlement plumbing", () => {
  assert.match(list, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled=\{Platform\.OS !== "android"\}/);
  assert.doesNotMatch(list, /flightPagination|onMomentumScrollEnd|onScrollEndDrag/);
});
