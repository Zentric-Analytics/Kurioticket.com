import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Explore uses native Apple Maps on iOS and keeps the existing Android Google map", () => {
  const ios = readFileSync("src/features/explore/ExploreMap.ios.tsx", "utf8");
  const fallback = readFileSync("src/features/explore/ExploreMap.tsx", "utf8");
  const screen = readFileSync("src/features/explore/ExploreScreen.tsx", "utf8");

  assert.match(ios, /from "react-native-maps"/);
  assert.match(ios, /<MapView/);
  assert.match(ios, /showsUserLocation=\{false\}/);
  assert.match(ios, /searchAirports/);
  assert.doesNotMatch(ios, /PROVIDER_GOOGLE|provider=|WebView|google\.com/);

  assert.match(fallback, /from "react-native-webview"/);
  assert.match(fallback, /\/api\/mobile\/v1\/explore\/map-embed/);
  assert.match(screen, /airportCode=\{results\.length === 1 \? results\[0\]\.destination\.primaryAirportCode : undefined\}/);
});
