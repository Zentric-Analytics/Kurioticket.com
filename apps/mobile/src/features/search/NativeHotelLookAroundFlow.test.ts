import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelDetails = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");

test("iOS and Android render the same inline Google Street View flow", () => {
  assert.match(location, /const streetViewUrl = api\.ok \? nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\) : null/);
  assert.match(location, /\{option === "map" \? "Map" : "Street View"\}/);
  assert.match(location, /<WebView key=\{\`\$\{hotelId\}:streetview\`\}/);
  assert.match(location, /scrollEnabled=\{false\}/);
  assert.match(location, /Street View unavailable/);
  assert.doesNotMatch(location, /NativeAppleHotelLookAround|Look Around|iosLookAroundSupported|lookAroundStatus/);
  assert.doesNotMatch(hotelDetails, /lookAroundInteracting|onLookAroundInteractionChange/);
  assert.doesNotMatch(bookingDetails, /onLookAroundInteractionChange/);
});
