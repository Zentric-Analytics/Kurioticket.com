import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const details = readFileSync(
  new URL("./hotelDetails/StandaloneHotelDetails.tsx", import.meta.url),
  "utf8",
);
const nav = readFileSync(
  new URL("./hotelDetails/HotelDetailsSectionNav.tsx", import.meta.url),
  "utf8",
);
const rates = readFileSync(
  new URL("./hotelDetails/HotelPriceComparisonSection.tsx", import.meta.url),
  "utf8",
);
const about = readFileSync(
  new URL("./hotelDetails/HotelAboutSection.tsx", import.meta.url),
  "utf8",
);
const location = readFileSync(
  new URL("./hotelDetails/HotelLocationSection.tsx", import.meta.url),
  "utf8",
);
const reviews = readFileSync(
  new URL("./hotelDetails/HotelReviewsSection.tsx", import.meta.url),
  "utf8",
);
const related = readFileSync(
  new URL("./hotelDetails/RelatedHotelsSection.tsx", import.meta.url),
  "utf8",
);
const client = readFileSync(
  new URL("./HotelDetailsClient.tsx", import.meta.url),
  "utf8",
);

test("mobile Hotel details expose Rates, Overview, and Reviews while Location remains desktop-only", () => {
  assert.match(nav, /mobileLabel: "Rates"/);
  assert.match(nav, /mobileLabel: "Overview"/);
  assert.match(nav, /id: "location"[\s\S]*?desktopOnly: true/);
  assert.match(nav, /grid-cols-3/);
  assert.match(nav, /lg:grid-cols-\[minmax\(0,1\.65fr\)_repeat\(3,minmax\(0,1fr\)\)\]/);
  assert.match(nav, /matchMedia\("\(max-width: 1023px\)"\)/);
  assert.match(nav, /onTabChange\("about"\)/);
});

test("mobile Rates contains provider decisions only", () => {
  const comparePanel = details.slice(
    details.indexOf('{activeTab === "compare"'),
    details.indexOf('{activeTab === "about"'),
  );
  assert.match(comparePanel, /<HotelPriceComparisonSection/);
  assert.doesNotMatch(comparePanel, /data-hotel-mobile-map|<HotelLocationSection/);
  assert.match(comparePanel, /hidden lg:block[\s\S]*?<RelatedHotelsSection/);

  assert.match(rates, /<span className="lg:hidden">Rates<\/span>/);
  assert.match(rates, /bg-\[#F4F8FF\][\s\S]*?lg:bg-white/);
  assert.match(rates, /hidden min-w-0 lg:block[\s\S]*?data-provider-amenities/);
  assert.match(rates, /text-\[18px\] font-extrabold/);
});

test("mobile Overview owns location, popular amenities, room comfort, accessibility, provider facts, and related stays", () => {
  const aboutPanel = details.slice(
    details.indexOf('{activeTab === "about"'),
    details.indexOf('{activeTab === "reviews"'),
  );
  assert.match(aboutPanel, /mobileAfterDescription=[\s\S]*?<HotelLocationSection/);
  assert.match(aboutPanel, /data-mobile-provider-hotel-details/);
  assert.match(aboutPanel, /data-hotel-mobile-overview-related[\s\S]*?<RelatedHotelsSection/);

  assert.match(about, /mobilePopularAmenities = amenities\.slice\(0, 4\)/);
  assert.match(about, /Popular amenities/);
  assert.match(about, /See all amenities/);
  assert.match(about, /Room &amp; comfort/);
  assert.match(about, /Accessibility/);
  assert.match(about, /data-desktop-hotel-about-details/);

  assert.match(location, /Why this location works/);
  assert.match(location, /h-\[216px\]/);
  assert.match(location, /hidden lg:block[\s\S]*?Accessibility and location details/);
});

test("mobile Reviews make the verified score a primary decision signal without inventing values", () => {
  assert.match(reviews, /data-mobile-hotel-review-card/);
  assert.match(reviews, /text-\[42px\] font-bold/);
  assert.match(reviews, /score\?\.split\("\/"\)/);
  assert.match(reviews, /Verified guest reviews are not connected for this property yet/);
  assert.doesNotMatch(reviews, /8\.6|1,246|Excellent/);
});

test("mobile related Hotels can use twelve API results while desktop remains capped to the prior seven visible cards", () => {
  assert.match(client, /mode === "standalone"\) detailsParams\.set\("relatedLimit", "12"\)/);
  assert.match(related, /hotels\.slice\(0, 12\)/);
  assert.match(related, /desktopHidden=\{index >= 7\}/);
  assert.match(related, /w-\[241px\]/);
  assert.match(related, /h-\[150px\]/);
  assert.match(related, /hidden text-xs text-slate-500 lg:block/);
});
