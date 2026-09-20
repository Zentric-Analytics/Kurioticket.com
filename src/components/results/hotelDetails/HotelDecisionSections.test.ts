import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standalone = readFileSync(
  new URL("./StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const compare = readFileSync(
  new URL("./HotelPriceComparisonSection.tsx", import.meta.url),
  "utf8",
);
const about = readFileSync(
  new URL("./HotelAboutSection.tsx", import.meta.url),
  "utf8",
);
const location = readFileSync(
  new URL("./HotelLocationSection.tsx", import.meta.url),
  "utf8",
);
const navigator = readFileSync(
  new URL("./HotelDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);
const reviews = readFileSync(
  new URL("./HotelReviewsSection.tsx", import.meta.url),
  "utf8",
);
const presentation = readFileSync(
  new URL("./hotelDetailsPresentation.ts", import.meta.url),
  "utf8",
);
const continuation = readFileSync(
  new URL("./hotelBookingContinuation.ts", import.meta.url),
  "utf8",
);

test("desktop keeps four decision modes while mobile Overview owns location and related stays", () => {
  assert.match(standalone, /<HotelDetailsSectionNav/);
  assert.match(standalone, /useState<HotelDetailsTab>\("compare"\)/);
  assert.match(standalone, /activeTab=\{activeTab\}/);
  assert.match(standalone, /onTabChange=\{setActiveTab\}/);
  assert.match(standalone, /role="tabpanel"/);
  assert.match(standalone, /aria-labelledby=\{`hotel-\$\{activeTab\}-tab`\}/);
  for (const tab of ["compare", "about", "location", "reviews"]) {
    assert.match(standalone, new RegExp(`activeTab === "${tab}"`));
  }
  assert.equal(standalone.match(/<HotelPriceComparisonSection/g)?.length, 1);
  assert.equal(standalone.match(/<HotelAboutSection/g)?.length, 1);
  assert.equal(standalone.match(/<HotelLocationSection/g)?.length, 2);
  assert.equal(standalone.match(/<HotelReviewsSection/g)?.length, 1);
  assert.equal(standalone.match(/<RelatedHotelsSection/g)?.length, 2);
  assert.match(standalone, /data-hotel-mobile-overview-related/);
  assert.match(standalone, /mobileAfterDescription=/);
});

test("section navigator exposes three semantic mobile tabs and four desktop tabs", () => {
  for (const label of ["Compare prices", "About", "Location", "Reviews"]) {
    assert.equal(
      navigator.match(new RegExp(`label: "${label}"`, "g"))?.length,
      1,
      label,
    );
  }
  assert.match(navigator, /role="tablist"/);
  assert.match(navigator, /role="tab"/);
  assert.match(navigator, /aria-selected=\{selected\}/);
  assert.match(navigator, /aria-controls=\{`hotel-\$\{tab\.id\}-panel`\}/);
  assert.match(navigator, /tabIndex=\{selected \? 0 : -1\}/);
  assert.match(navigator, /ArrowLeft/);
  assert.match(navigator, /ArrowRight/);
  assert.match(navigator, /sticky top-0/);
  assert.match(navigator, /mobileLabel: "Rates"/);
  assert.match(navigator, /mobileLabel: "Overview"/);
  assert.match(navigator, /desktopOnly: true/);
  assert.match(navigator, /grid-cols-3/);
  assert.match(navigator, /hidden lg:inline-flex/);
  assert.match(navigator, /matchMedia\("\(max-width: 1023px\)"\)/);
  assert.doesNotMatch(
    navigator,
    /IntersectionObserver|scrollIntoView|aria-current|hotel-reviews.*about|href=/,
  );
  assert.doesNotMatch(navigator, /overflow-x|whitespace-normal/);
  assert.match(navigator, /min-h-11/);
});

test("mobile Rates is rate-only while Overview owns mobile location and related stays", () => {
  const comparePanel = standalone.slice(
    standalone.indexOf('{activeTab === "compare"'),
    standalone.indexOf('{activeTab === "about"'),
  );
  assert.match(comparePanel, /<HotelPriceComparisonSection/);
  assert.match(comparePanel, /hidden lg:block[\s\S]*?<RelatedHotelsSection/);
  assert.doesNotMatch(comparePanel, /data-hotel-mobile-map|<HotelLocationSection/);

  const aboutPanel = standalone.slice(
    standalone.indexOf('{activeTab === "about"'),
    standalone.indexOf('{activeTab === "reviews"'),
  );
  assert.match(aboutPanel, /<HotelAboutSection/);
  assert.match(aboutPanel, /mobileAfterDescription=[\s\S]*?<HotelLocationSection/);
  assert.match(aboutPanel, /data-hotel-mobile-overview-related[\s\S]*?<RelatedHotelsSection/);
  assert.doesNotMatch(aboutPanel, /<HotelPriceComparisonSection|<HotelReviewsSection/);

  const reviewsPanel = standalone.slice(
    standalone.indexOf('{activeTab === "reviews"'),
    standalone.indexOf('{activeTab === "location"'),
  );
  assert.match(reviewsPanel, /<HotelReviewsSection/);
  assert.doesNotMatch(
    reviewsPanel,
    /<HotelPriceComparisonSection|<RelatedHotelsSection|<HotelAboutSection|<HotelLocationSection/,
  );

  const locationPanel = standalone.slice(
    standalone.indexOf('{activeTab === "location"'),
    standalone.indexOf("</div>\n          </article>"),
  );
  assert.match(locationPanel, /<HotelLocationSection/);
  assert.match(locationPanel, /Verified location details are not available/);
  assert.doesNotMatch(
    locationPanel,
    /<HotelPriceComparisonSection|<RelatedHotelsSection|<HotelAboutSection|<HotelReviewsSection/,
  );
});

test("comparison presents Kurioticket as a normalized provider without development placeholders", () => {
  assert.doesNotMatch(standalone, /totalPrice=\{props\.totalDisplayPrice\}/);
  assert.match(standalone, /stayContext=\{props\.staySummary/);
  assert.match(standalone, /buildKurioticketHotelDetailsProviderOffer/);
  assert.match(continuation, /kurioticket-logo-primary-light-bg\.svg/);
  assert.match(continuation, /action: \{ kind: "internal-room-flow" \}/);
  assert.match(compare, /<span className="lg:hidden">Rates<\/span>/);
  assert.match(compare, /<span className="hidden lg:inline">Compare prices<\/span>/);
  assert.match(compare, /\{stayContext\}/);
  assert.doesNotMatch(compare, /totalPrice\.formatted|>total</);
  assert.match(compare, /perNightText\.replace/);
  assert.match(compare, /data-nightly-amount/);
  assert.match(compare, /data-nightly-supporting-label/);
  assert.match(compare, /role="radiogroup"/);
  assert.match(compare, /type="radio"/);
  assert.match(compare, /checked=\{selected\}/);
  assert.match(compare, /onChange=\{\(\) => onSelect\(offer\.id\)\}/);
  assert.doesNotMatch(
    compare,
    /View deal|viewDealText|onInternalRoomFlow|onProviderOfferHandoff/,
  );
  assert.match(standalone, /amenities: props\.amenityItems/);
  assert.match(continuation, /amenities: amenities\.slice\(0, 3\)/);
  assert.match(compare, /data-provider-brand/);
  assert.match(compare, /data-provider-price/);
  assert.doesNotMatch(
    compare,
    /role="separator"|data-provider-offer-divider|border-t/,
  );
  assert.match(compare, /data-provider-selector/);
  assert.match(compare, /data-provider-bottom-row/);
  assert.match(compare, /col-span-2 row-start-3 mt-1 flex/);
  assert.match(compare, /text-\[#075EE8\][^>]*data-nightly-supporting-label/);
  assert.doesNotMatch(compare, /row-span-2|data-provider-price-action/);
  assert.match(compare, /data-provider-amenities/);
  assert.match(compare, /hidden min-w-0 lg:block/);
  assert.match(compare, /flex-nowrap/);
  assert.match(compare, /gap-x-4/);
  assert.doesNotMatch(compare, /\[&>li\]:text-\[11px\]/);
  assert.match(compare, /whitespace-nowrap/);
  assert.doesNotMatch(compare, /data-provider-action|<button/);
  assert.ok(
    compare.indexOf("data-provider-brand") <
      compare.indexOf("data-provider-selector"),
  );
  assert.ok(
    compare.indexOf("data-provider-selector") <
      compare.indexOf("data-provider-price"),
  );
  assert.ok(
    compare.indexOf("data-provider-price") <
      compare.indexOf("data-provider-amenities"),
  );
  assert.ok(
    compare.indexOf("data-provider-amenities") <
      compare.indexOf("data-nightly-supporting-label"),
  );
  assert.match(compare, /<HotelAmenityList/);
  assert.match(compare, /items=\{offer\.amenities \?\? \[\]\}/);
  assert.equal(compare.match(/\{stayContext\}/g)?.length, 1);
  assert.match(compare, /offers\.map/);
  assert.doesNotMatch(
    compare,
    /stayFacts|nightText|Estimated stay price|Estimated for your selected stay|Planning estimate|Additional booking-site prices|Live booking-site rates are not connected yet|Comparable provider offers will appear here when available/,
  );
  assert.doesNotMatch(
    compare,
    /Booking\.com|Expedia|Hotels\.com|Agoda|Lowest price|Best deal|Compare 3 prices/,
  );
  assert.doesNotMatch(
    compare,
    /Free Wi|Restaurant|Workspaces|Breakfast available|Fitness centre/,
  );
});

test("mobile address uses the available header width and wraps only when needed", () => {
  const addressRow = standalone.slice(
    standalone.indexOf("data-mobile-hotel-address-row") - 300,
    standalone.indexOf("data-mobile-hotel-classification-stars"),
  );
  assert.match(addressRow, /max-w-\[calc\(100vw-2rem\)\]/);
  assert.doesNotMatch(
    addressRow,
    /truncate|text-ellipsis|whitespace-nowrap|break-words/,
  );
});

test("future offers share the concise provider price and action presentation", () => {
  assert.match(compare, /offers\.map\(\(offer\) =>/);
  for (const field of ["providerName", "providerLogoUrl", "nightlyPrice"]) {
    assert.ok(compare.includes(`offer.${field}`), field);
  }
  assert.match(compare, /type="radio"/);
  assert.doesNotMatch(compare, /href=\{offer\.|window\.location/);
  assert.doesNotMatch(presentation, /deepLink/);
  assert.match(presentation, /providerOfferId: string/);
  assert.match(presentation, /kind: "internal-room-flow"/);
  assert.match(presentation, /kind: "provider-handoff"/);
  assert.doesNotMatch(
    compare,
    /Cancellation terms unavailable|Meal plan unavailable|Provider 2/,
  );
});

test("persistent continuation follows the auto-selected actionable provider", () => {
  assert.match(standalone, /resolveSelectedHotelProviderOfferId/);
  assert.match(standalone, /resolveHotelBookingContinuation/);
  assert.match(standalone, /selectedProviderOffer/);
  assert.match(standalone, /bookingContinuation\.kind === "internal-room-flow"/);
  assert.match(standalone, /bookingContinuation\.kind === "provider-handoff"/);
  assert.match(standalone, /bookingActionAvailable/);
  assert.match(standalone, /props\.labels\.viewDeal/);
  assert.match(standalone, /props\.labels\.continueBooking/);
  assert.doesNotMatch(standalone, /bookingContinuation\.kind === "selection-required"/);
  assert.match(standalone, /setActiveTab\("compare"\)/);
  assert.match(standalone, /hotel-compare-heading/);
  assert.match(standalone, /focus\(\{ preventScroll: true \}\)/);
  assert.match(standalone, /providerHandoffPendingRef\.current/);
  assert.match(compare, /role="alert"/);
});

test("Overview keeps mobile content concise while preserving the fuller desktop property detail set", () => {
  assert.match(standalone, /description=\{description\}/);
  assert.match(standalone, /amenities=\{props\.amenityItems\}/);
  assert.match(standalone, /propertyType=\{props\.propertyDetails\?\.propertyType\}/);
  assert.match(standalone, /bedSummary=\{props\.propertyDetails\?\.bedSummary\}/);
  assert.match(about, /data-mobile-hotel-overview-core/);
  assert.match(about, /Popular amenities/);
  assert.match(about, /mobilePopularAmenities = amenities\.slice\(0, 4\)/);
  assert.match(about, /See all amenities/);
  assert.match(about, /data-mobile-all-amenities/);
  assert.match(about, /Room &amp; comfort/);
  assert.match(about, /Accessibility/);
  assert.match(about, /data-desktop-hotel-about-details/);
  assert.match(about, /Property highlights/);
  assert.match(about, /All amenities/);
  assert.match(about, /Hotel information/);
  assert.match(about, /\{propertyType\}/);
  assert.match(about, /\{starRating\}-star classification/);
  const mobileCore = about.slice(
    about.indexOf('data-mobile-hotel-overview-core'),
    about.indexOf('data-desktop-hotel-about-details'),
  );
  assert.doesNotMatch(mobileCore, /Hotel information|Property highlights/);
});

test("guest reviews remains visible and never manufactures review values", () => {
  assert.match(reviews, /Guest reviews/);
  assert.match(reviews, /Verified guest reviews are not connected/);
  assert.doesNotMatch(reviews, /8\.6|1,246|Excellent/);
});

test("location preserves map and Street View while facts use catalogue metadata", () => {
  for (const field of [
    "neighbourhood",
    "businessSuitable",
    "familySuitable",
    "interestTags",
    "accessibility",
  ])
    assert.ok(standalone.includes(`propertyDetails.${field}`), field);
  for (const contract of [
    "buildGoogleHotelMapEmbedUrl",
    "buildGoogleHotelStreetViewEmbedUrl",
    "Why this location works",
  ])
    assert.ok(location.includes(contract), contract);
  assert.doesNotMatch(
    standalone + location,
    /\b\d+ min(?:ute)?s?\b|\b\d+ min walk\b/i,
  );
  assert.doesNotMatch(location, /\.slice\(|<details|<summary/);
  assert.doesNotMatch(location, /Show directions|directionsUrl/);
});
