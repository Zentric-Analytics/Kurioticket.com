import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Apple native maps are isolated to iOS with no Google provider or location permission", () => {
  const ios = readFileSync("src/features/search/NativeAppleHotelMap.ios.tsx", "utf8");
  const fallback = readFileSync("src/features/search/NativeAppleHotelMap.tsx", "utf8");
  assert.match(ios, /from "react-native-maps"/);
  assert.doesNotMatch(ios, /PROVIDER_GOOGLE|provider=|WebView/);
  assert.match(ios, /showsUserLocation=\{false\}/);
  assert.match(ios, /scrollEnabled=\{interactive\}/);
  assert.match(ios, /<Marker coordinate=\{\{ latitude, longitude \}\}/);
  assert.doesNotMatch(fallback, /from "react-native-maps"/);
});

test("both hotel previews validate coordinates and keep Android image previews", () => {
  for (const file of ["NativeHotelLocationSection", "NativeHotelDecisionSections"]) {
    const source = readFileSync(`src/features/search/${file}.tsx`, "utf8");
    assert.match(source, /Platform.OS === "ios" && hasValidHotelCoordinates\(propertyDetails\)/);
    assert.match(source, /pointerEvents="none"/);
    assert.match(source, /Platform.OS !== "ios" && .*?\? <Image/);
    assert.match(source, /propertyDetails=\{propertyDetails\} hotelName=\{hotelName\}/);
  }
});

test("full-screen iOS maps are interactive and remain inside the existing modal", () => {
  const source = readFileSync("src/features/search/NativeHotelFullMapModal.tsx", "utf8");
  assert.match(source, /visible && <NativeAppleHotelMap.* interactive/);
  assert.match(source, /Platform.OS !== "ios" && fullMapUrl && !fullMapFailed/);
  assert.match(source, /presentationStyle="fullScreen"/);
  assert.doesNotMatch(source, /Linking|openURL/);
});
