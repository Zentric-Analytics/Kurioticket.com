import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standalone = readFileSync(new URL("./StandaloneHotelDetails.tsx", import.meta.url), "utf8");
const compare = readFileSync(new URL("./HotelPriceComparisonSection.tsx", import.meta.url), "utf8");
const about = readFileSync(new URL("./HotelAboutSection.tsx", import.meta.url), "utf8");
const location = readFileSync(new URL("./HotelLocationSection.tsx", import.meta.url), "utf8");
const navigator = readFileSync(new URL("./HotelDetailsSectionNav.tsx", import.meta.url), "utf8");
const reviews = readFileSync(new URL("./HotelReviewsSection.tsx", import.meta.url), "utf8");

test("standalone decision sections follow the approved order before related hotels", () => {
  const order = ["<HotelPriceComparisonSection", "<HotelAboutSection", "<HotelReviewsSection", "<HotelLocationSection", "<RelatedHotelsSection"];
  let prior = -1;
  for (const contract of order) {
    const position = standalone.indexOf(contract);
    assert.ok(position > prior, contract);
    prior = position;
  }
  assert.match(standalone, /<HotelDetailsSectionNav/);
});

test("section navigator links to visible anchored sections and tracks natural scrolling", () => {
  for (const label of ["Compare prices", "About", "Location"]) assert.ok(navigator.includes(label), label);
  for (const id of ["hotel-compare-prices", "hotel-about", "hotel-reviews", "hotel-location"]) assert.ok((navigator + compare + about + reviews + location).includes(id), id);
  assert.match(navigator, /IntersectionObserver/);
  assert.match(navigator, /prefers-reduced-motion: reduce/);
  assert.match(navigator, /aria-current/);
  assert.match(navigator, /sticky top-0/);
  assert.doesNotMatch(navigator, /role="tab"|hidden tabpanel/);
});

test("comparison presents Kurioticket as a normalized provider without development placeholders", () => {
  assert.match(standalone, /totalPrice=\{props\.totalDisplayPrice\}/);
  assert.match(standalone, /nightlyPrice=\{props\.nightlyDisplayPrice\}/);
  assert.match(standalone, /stayContext=\{props\.staySummary/);
  assert.match(standalone, /offers=\{\[\]\}/);
  assert.match(compare, /kurioticket-logo-primary-light-bg\.svg/);
  assert.match(compare, />Compare prices<\/h2>/);
  assert.match(compare, /\{stayContext\}/);
  assert.match(compare, /\{totalPrice\.formatted\}/);
  assert.match(compare, /perNightText\.replace/);
  assert.match(standalone, /viewDealText="View deal"/);
  assert.match(compare, /\{viewDealText\}/);
  assert.match(compare, /onViewRoomOptions\(event\.currentTarget\)/);
  assert.match(standalone, /amenities=\{props\.amenityItems\}/);
  assert.match(compare, /amenities: amenities\.slice\(0, 3\)/);
  assert.match(compare, /data-provider-offer-upper/);
  assert.match(compare, /role="separator"/);
  assert.match(compare, /data-provider-offer-divider/);
  assert.match(compare, /data-provider-offer-lower/);
  assert.match(compare, /data-provider-amenities/);
  assert.match(compare, /offer\.amenities\?\.map/);
  assert.doesNotMatch(compare, /<HotelAmenityList|<ul|<li/);
  assert.equal(compare.match(/\{stayContext\}/g)?.length, 1);
  assert.match(compare, /offers\.map/);
  assert.doesNotMatch(compare, /stayFacts|nightText|Estimated stay price|Estimated for your selected stay|Planning estimate|Additional booking-site prices|Live booking-site rates are not connected yet|Comparable provider offers will appear here when available/);
  assert.doesNotMatch(compare, /Booking\.com|Expedia|Hotels\.com|Agoda|Lowest price|Best deal|Compare 3 prices/);
  assert.doesNotMatch(compare, /Free Wi|Restaurant|Workspaces|Breakfast available|Fitness centre/);
});

test("future offers share the concise provider price and action presentation", () => {
  assert.match(compare, /providerOffers\.map\(\(offer\) => <ProviderOffer/);
  for (const field of ["providerName", "providerLogoUrl", "totalPrice", "nightlyPrice", "deepLink"]) {
    assert.ok(compare.includes(`offer.${field}`), field);
  }
  assert.match(compare, />View deal<\/a>/);
  assert.doesNotMatch(compare, /Cancellation terms unavailable|Meal plan unavailable|Provider 2/);
});

test("about exposes the full property information architecture without expansion controls", () => {
  assert.match(standalone, /description=\{description\}/);
  assert.match(standalone, /amenities=\{props\.amenityItems\}/);
  assert.match(standalone, /bedSummary=\{props\.propertyDetails\?\.bedSummary\}/);
  for (const heading of ["Property highlights", "All amenities", "Room &amp; comfort", "Hotel information", "Accessibility"]) assert.ok(about.includes(heading), heading);
  assert.doesNotMatch(about, /line-clamp|descriptionExpanded|amenitiesExpanded|See all amenities|Show fewer|>More</);
  assert.match(about, /remainingAmenities\.map/);
  assert.match(about, /\{starRating\}-star hotel/);
});

test("guest reviews remains visible and never manufactures review values", () => {
  assert.match(reviews, /Guest reviews/);
  assert.match(reviews, /Verified guest reviews are not connected/);
  assert.doesNotMatch(reviews, /8\.6|1,246|Excellent/);
});

test("location preserves map, Street View and directions while facts use catalogue metadata", () => {
  for (const field of ["neighbourhood", "businessSuitable", "familySuitable", "interestTags", "accessibility"]) assert.ok(standalone.includes(`propertyDetails.${field}`), field);
  for (const contract of ["buildHotelMapEmbedUrl", "buildGoogleHotelStreetViewEmbedUrl", "buildHotelDirectionsUrl", "Why this location works"]) assert.ok(location.includes(contract), contract);
  assert.doesNotMatch(standalone + location, /\b\d+ min(?:ute)?s?\b|\b\d+ min walk\b/i);
  assert.doesNotMatch(location, /\.slice\(|<details|<summary/);
});
