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
 assert.match(map, /encodeURIComponent/);
});
test("both discovery and search retain their destination lists below a map", () => {
 assert.match(screen, /ListHeaderComponent=\{<ExploreMap \/>\}/);
 assert.match(screen, /<ExploreMap place=/);
 assert.match(screen, /<DestinationResultRow/);
 assert.match(screen, /<RegionPreviewCard/);
});
