import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const map = readFileSync("src/features/explore/ExploreMap.tsx", "utf8");
const screen = readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");
test("Explore reuses WebView with an environment-owned map endpoint and no client key", () => {
 assert.match(map, /react-native-webview/);
 assert.match(map, /getApiBaseUrl\(Platform.OS, __DEV__\)/);
 assert.match(map, /api\/mobile\/v1\/explore\/map-embed/);
 assert.doesNotMatch(map, /API_KEY|127\.0\.0\.1|EXPO_PUBLIC_EXPLORE_MAP_BASE_URL/);
});
test("map has bounded loading, retry and debounced search", () => {
 assert.match(map, /20000/);
 assert.match(map, /450/);
 assert.match(map, /clearTimeout/);
 assert.match(map, /onError=\{fail\}/);
 assert.match(map, /onHttpError=\{fail\}/);
 assert.match(map, /Try again/);
 assert.match(map, /encodeExploreMapQuery\(settledPlace\)/);
});
test("map and list views retain the existing destination components", () => {
 assert.match(screen, /List view/);
 assert.match(screen, /Map view/);
 assert.match(screen, /setView\(value => value === "map" \? "list" : "map"\)/);
 assert.match(screen, /hiddenList: \{ display: "none" \}/);
 assert.match(map, /container: \{ flex: 1, overflow: "hidden" \}/);
 assert.doesNotMatch(screen, /ListHeaderComponent=\{<ExploreMap/);
 assert.match(screen, /<ExploreMap place=/);
 assert.match(screen, /<DestinationResultRow/);
 assert.match(screen, /<RegionPreviewCard/);
});


import { encodeExploreMapQuery } from "./exploreMapQuery";
test("map queries respect the endpoint limit without breaking Unicode", () => {
 assert.equal(decodeURIComponent(encodeExploreMapQuery("a".repeat(159) + "\u{1F600}")), "a".repeat(159));
 assert.equal(decodeURIComponent(encodeExploreMapQuery("a".repeat(158) + "\u{1F600}")), "a".repeat(158) + "\u{1F600}");
 assert.equal(decodeURIComponent(encodeExploreMapQuery("\u{1F600}".repeat(100))).length, 160);
 assert.equal(decodeURIComponent(encodeExploreMapQuery("Paris, France")), "Paris, France");
 assert.equal(decodeURIComponent(encodeExploreMapQuery("a\uD800b\uDC00")), "a\uFFFDb\uFFFD");
});

 test("both lists reserve the measured floating toggle height and clearance", () => {
 assert.match(screen, /onLayout=\{event => setToggleHeight\(event.nativeEvent.layout.height\)\}/);
 assert.match(screen, /paddingBottom: listTrailingSpace/);
 assert.match(screen, /trailingSpace=\{listTrailingSpace\}/);
 assert.match(screen, /paddingBottom: trailingSpace/);
 });
