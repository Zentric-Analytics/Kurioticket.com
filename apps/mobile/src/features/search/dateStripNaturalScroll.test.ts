import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const list = source.slice(source.indexOf("<Animated.SectionList"), source.indexOf(") : (", source.indexOf("<Animated.SectionList")));

test("the date strip stays fully opaque in normal list-header flow", () => {
  assert.match(list, /ListHeaderComponent=\{flightDateStrip\}/);
  assert.doesNotMatch(source, /flightDateStripScrollY|flightDateStripHeaderHeight|flightDateStripOpacity|animatedFlightDateStrip/);
  assert.doesNotMatch(list, /ListHeaderComponent=\{[^}]*Animated|position:\s*"absolute"|stickyHeaderIndices/);
});

test("the filter rail remains sticky and normal scrolling settles pagination", () => {
  assert.match(list, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.match(list, /onScroll=\{\(\) => flightPaginationScheduleSettled\.current\?\.\(\)\}/);
  assert.match(list, /onMomentumScrollEnd=\{\(\) => flightPaginationFinishPositioning\.current\?\.\(\)\}/);
});
