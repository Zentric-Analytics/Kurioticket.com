import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelDetails = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");

test("iOS uses the working Cars Look Around bridge while Android retains Street View", () => {
  assert.match(location, /NativeAppleCarLookAroundPreview/);
  assert.match(location, /NativeAppleCarLookAroundStatus/);
  assert.match(location, /Platform\.OS === "ios" \? null : api\.ok \? nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\) : null/);
  assert.match(location, /option === "map" \? "Map" : Platform\.OS === "ios" \? "Look Around" : "Street View"/);
  assert.match(location, /Platform\.OS === "ios" && streetViewAvailable \? <View style=\{styles\.streetViewFrame\}><NativeAppleCarLookAroundPreview/);
  assert.match(location, /locationLabel=\{hotelName\}/);
  assert.match(location, /accessibilityLabel="Loading Look Around"/);
  assert.match(location, /Look Around unavailable/);
  assert.match(location, /<WebView key=\{\`\$\{hotelId\}:streetview\`\}/);
  assert.match(location, /scrollEnabled=\{false\}/);
  assert.match(location, /Street View unavailable/);
  assert.doesNotMatch(location, /NativeAppleHotelLookAround/);
  assert.doesNotMatch(hotelDetails, /lookAroundInteracting|onLookAroundInteractionChange/);
  assert.doesNotMatch(bookingDetails, /onLookAroundInteractionChange/);
});
