import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standalone = readFileSync(new URL("./StandaloneHotelDetails.tsx", import.meta.url), "utf8");
const compare = readFileSync(new URL("./HotelPriceComparisonSection.tsx", import.meta.url), "utf8");
const about = readFileSync(new URL("./HotelAboutSection.tsx", import.meta.url), "utf8");
const location = readFileSync(new URL("./HotelLocationSection.tsx", import.meta.url), "utf8");

test("standalone decision sections follow the approved order before related hotels", () => {
  const order = ["<HotelPriceComparisonSection", "<HotelAboutSection", "<HotelLocationSection", "<RelatedHotelsSection"];
  let prior = -1;
  for (const contract of order) {
    const position = standalone.indexOf(contract);
    assert.ok(position > prior, contract);
    prior = position;
  }
  assert.doesNotMatch(standalone, /data-hotel-amenities-strip|data-hotel-review-summary|reviewUnavailable/);
});

test("planning comparison uses existing price props without unsupported provider claims", () => {
  assert.match(standalone, /totalPrice=\{props\.totalDisplayPrice\}/);
  assert.match(standalone, /nightlyPrice=\{props\.nightlyDisplayPrice\}/);
  assert.match(standalone, /offers=\{\[\]\}/);
  assert.match(compare, /Kurioticket planning estimate/);
  assert.doesNotMatch(compare, /Booking\.com|Expedia|Hotels\.com|Agoda|Lowest price|Best deal|Compare 3 prices/);
});

test("about consolidates real description, amenities, bed summary and classification", () => {
  assert.match(standalone, /description=\{description\}/);
  assert.match(standalone, /amenities=\{props\.amenityItems\}/);
  assert.match(standalone, /bedSummary=\{props\.propertyDetails\?\.bedSummary\}/);
  assert.match(about, /aria-expanded=\{descriptionExpanded\}/);
  assert.match(about, /aria-expanded=\{amenitiesExpanded\}/);
  assert.match(about, /\{starRating\}-star hotel/);
});

test("location preserves map, Street View and directions while facts use catalogue metadata", () => {
  for (const field of ["neighbourhood", "businessSuitable", "familySuitable", "interestTags", "accessibility"]) assert.ok(standalone.includes(`propertyDetails.${field}`), field);
  for (const contract of ["buildHotelMapEmbedUrl", "buildGoogleHotelStreetViewEmbedUrl", "buildHotelDirectionsUrl", "Why this location works"]) assert.ok(location.includes(contract), contract);
  assert.doesNotMatch(standalone + location, /\b\d+ min(?:ute)?s?\b|\b\d+ min walk\b/i);
});
