import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overview = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");

test("KAYAK overview reuses existing hotel sections with provider-authored facts", () => {
  assert.match(overview, /providerDetails\?\.overview\?\.address/);
  assert.match(overview, /details\?\.overview\?\.place/);
  assert.match(overview, /details\?\.overview\?\.policies/);
  assert.match(overview, /providerDetails\?\.rate\?\.roomName/);
  assert.match(overview, />Location</);
  assert.match(overview, />Room &amp; comfort</);
  assert.doesNotMatch(overview, /latitude:\s*0|longitude:\s*0|fake|placeholder coordinates/i);
});

test("KAYAK reviews keep the canonical score presentation without duplicate guest sentiment", () => {
  assert.match(reviews, /nativeHotelReviewPresentation\(result\)/);
  assert.match(reviews, /Source: \{result\.reviewSource\}/);
  assert.doesNotMatch(reviews, /Guests say|providerDetails|sentiment|quotes|“\{quote\}”/);
});
