import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");

test("iOS uses the same interactive inline Street View flow as Android", () => {
  assert.match(location, /const streetViewUrl = api\.ok \? nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\) : null;/);
  assert.match(location, /\{option === "map" \? "Map" : "Street View"\}/);
  assert.match(location, /streetViewUrl && !streetViewFailed \? <WebView/);
  assert.match(location, /scrollEnabled=\{false\}/);
  assert.doesNotMatch(location, /NativeAppleHotelLookAround|NativeHotelFullLookAroundModal/);
  assert.doesNotMatch(location, /fullLookAroundOpen|lookAroundTapOverlay/);
});
