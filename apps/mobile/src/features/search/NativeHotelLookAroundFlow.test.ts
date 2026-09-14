import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hotelDetails = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const location = readFileSync("src/features/search/NativeHotelLocationSection.tsx", "utf8");
const fullLookAround = readFileSync("src/features/search/NativeHotelFullLookAroundModal.tsx", "utf8");

test("iOS Hotel Look Around opens the Kurioticket full-screen interactive viewer while Android retains Street View", () => {
  assert.match(location, /NativeAppleCarLookAroundPreview/);
  assert.match(location, /NativeAppleCarLookAroundStatus/);
  assert.match(location, /NativeHotelFullLookAroundModal/);
  assert.match(location, /Platform\.OS === "ios" \? null : api\.ok \? nativeHotelLocationEmbedUrl\(api\.baseUrl, hotelId, "streetview"\) : null/);
  assert.match(location, /option === "map" \? "Map" : Platform\.OS === "ios" \? "Look Around" : "Street View"/);
  assert.match(location, /accessibilityLabel=\{`Open Look Around for \$\{hotelName\}`\}/);
  assert.match(location, /onPress=\{\(\) => setFullLookAroundOpen\(true\)\}/);
  assert.match(location, /<View pointerEvents="none" style=\{styles\.map\}><NativeAppleCarLookAroundPreview/);
  assert.match(location, /<NativeHotelFullLookAroundModal visible=\{fullLookAroundOpen\}/);
  assert.match(location, /onClose=\{\(\) => setFullLookAroundOpen\(false\)\}/);
  assert.match(location, /accessibilityLabel="Loading Look Around"/);
  assert.match(location, /Look Around unavailable/);
  assert.match(location, /<WebView key=\{\`\$\{hotelId\}:streetview\`\}/);
  assert.match(location, /scrollEnabled=\{false\}/);
  assert.match(location, /Street View unavailable/);

  assert.match(fullLookAround, /accessibilityLabel="Back to hotel details"/);
  assert.match(fullLookAround, />Back<\/Text>/);
  assert.match(fullLookAround, />Look Around<\/Text>/);
  assert.match(fullLookAround, /presentationStyle="fullScreen"/);
  assert.match(fullLookAround, /<NativeAppleCarLookAroundPreview/);
  assert.match(fullLookAround, /presentationMode="viewController"/);
  assert.match(fullLookAround, /locationLabel=\{hotelName\}/);
  assert.doesNotMatch(fullLookAround, /NativeAppleHotelLookAround/);
  assert.doesNotMatch(fullLookAround, /\bX\b|floatingClose/);

  assert.doesNotMatch(hotelDetails, /lookAroundInteracting|onLookAroundInteractionChange/);
  assert.doesNotMatch(bookingDetails, /onLookAroundInteractionChange/);
});
