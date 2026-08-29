import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(resolve("src/features/search/ApprovedResultsScreen.tsx"), "utf8");
const animation = source.slice(
  source.indexOf("const flightDateStripScrollY"),
  source.indexOf("const filterRail"),
);
const list = source.slice(source.indexOf("<Animated.SectionList"), source.indexOf(") : (", source.indexOf("<Animated.SectionList")));

test("the date strip fades across its measured height without collapsing layout", () => {
  assert.match(animation, /useRef\(new Animated\.Value\(0\)\)\.current/);
  assert.match(animation, /useState\(88\)/);
  assert.match(animation, /onLayout=\{\(\{ nativeEvent \}\) =>/);
  assert.match(animation, /inputRange: \[0, flightDateStripHeaderHeight\]/);
  assert.match(animation, /outputRange: \[1, 0\]/);
  assert.match(animation, /extrapolate: "clamp"/);
  assert.match(animation, /<Animated\.View[\s\S]*?style=\{\{ opacity:/);
  const interpolation = animation.slice(animation.indexOf(".interpolate("), animation.indexOf("const animatedFlightDateStrip"));
  assert.doesNotMatch(interpolation, /(?:height|maxHeight|padding|margin|translateY)\s*:/);
});

test("native list scrolling only drives opacity while the filter rail sticks natively", () => {
  assert.match(list, /renderSectionHeader[\s\S]*?\{filterRail\}[\s\S]*?stickySectionHeadersEnabled/);
  assert.match(list, /onScroll=\{Animated\.event\([\s\S]*?useNativeDriver: true/);
  const scrollHandler = list.slice(list.indexOf("onScroll="), list.indexOf("scrollEventThrottle="));
  assert.doesNotMatch(scrollHandler, /set[A-Z][A-Za-z]*\(/);
  assert.doesNotMatch(list, /position:\s*"absolute"|stickyHeaderIndices/);
});
