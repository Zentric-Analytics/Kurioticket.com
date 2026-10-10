import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync(
  new URL("./HotelResultsClient.tsx", import.meta.url),
  "utf8",
);
const card = readFileSync(
  new URL("./HotelCard.tsx", import.meta.url),
  "utf8",
);
const detailsClient = readFileSync(
  new URL("./hotelDetails/DesktopHotelDetails.tsx", import.meta.url),
  "utf8",
);
const details = readFileSync(
  new URL("./hotelDetails/MobileHotelDetails.tsx", import.meta.url),
  "utf8",
);
const detailsCss = readFileSync(
  new URL("./hotelDetails/HotelDetailsMobile.module.css", import.meta.url),
  "utf8",
);

test("mobile-web Hotel results keep a readable foundation scale without browser zoom tricks", () => {
  assert.match(results, /data-mobile-web-hotel-results/);
  assert.match(
    results,
    /block truncate text-\[14px\] font-semibold leading-\[18px\] text-\[#142033\]/,
  );
  assert.match(
    results,
    /block truncate text-\[11px\] font-medium leading-\[15px\] text-\[#536B92\]/,
  );
  assert.doesNotMatch(results, /\bzoom\s*:/);
});

test("mobile-web Hotel cards preserve the current readable title, amenity and price hierarchy", () => {
  assert.match(
    card,
    /sm:text-\[12px\] sm:leading-\[18px\] sm:text-slate-600 md:text-\[13px\] md:leading-5/,
  );
  assert.match(
    card,
    /grid grid-cols-1 gap-y-\[3px\] text-\[13px\] font-normal leading-\[19px\][\s\S]*?md:text-xs md:leading-4/,
  );
  assert.match(
    card,
    /sm:text-\[12px\] sm:font-medium sm:leading-\[18px\] sm:text-emerald-700 md:mt-2 md:text-\[13px\] md:leading-5/,
  );
  assert.match(card, /text-\[15px\] font-bold leading-5[\s\S]*?lg:text-\[19px\]/);
  assert.match(card, /data-hotel-card-price[\s\S]*?text-\[18px\] font-bold leading-6/);
});

test("mobile-web Hotel details use a phone-readable identity scale while desktop stays unchanged", () => {
  assert.match(details, /data-mobile-hotel-details/);
  assert.match(details, /className=\{styles.identity\}/);
  assert.match(detailsCss, /\.identity h1 \{[^}]*font-size: 22px; line-height: 28px; font-weight: 700/);
  assert.match(detailsCss, /\.reviewSummary \{[^}]*font-size: 13px; line-height: 19px/);
  assert.match(detailsCss, /\.tabs button \{[^}]*min-height: 44px;[^}]*font-size: 12px/);
  assert.match(detailsCss, /\.section p \{[^}]*font-size: 13px; line-height: 19px/);
  assert.match(details, /<DesktopProviderOffer/);
});

test("desktop Hotel details retains accessible back navigation and its three section labels", () => {
  assert.match(
    detailsClient,
    /<Link href=\{props.resultsHref\} className=\{styles.galleryBack\} aria-label=\{props.labels.backToResults\}/,
  );
  for (const label of ["Rates", "Overview", "Review"]) {
    assert.match(detailsClient, new RegExp(`label: "${label}"`));
  }
  assert.match(detailsClient, /<HotelPriceComparisonSection/);
  assert.match(detailsClient, /id="hotel-overview"/);
  assert.match(detailsClient, /<HotelReviewsSection/);
});
