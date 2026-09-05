import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getHotelReviewBand,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
} from "../../../../../src/lib/hotels/hotelRatingSemantics";

const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");
const detail = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const web = readFileSync("../../src/components/results/hotelDetails/HotelReviewsSection.tsx", "utf8");

function styleRule(name: string, nextName: string) {
  const start = reviews.indexOf(`  ${name}:`);
  const end = reviews.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return reviews.slice(start, end);
}

test("native empty reviews match the mobile-web callout", () => {
  assert.match(reviews, /Guest reviews/);
  assert.match(reviews, /Verified guest reviews are not connected for this property yet\./);
  const callout = styleRule("reviewsEmptyCallout", "reviewsEmptyText");
  const text = styleRule("reviewsEmptyText", "scoreRow");
  assert.match(callout, /marginTop: 12/);
  assert.match(callout, /borderLeftWidth: 2/);
  assert.match(callout, /paddingVertical: 4/);
  assert.match(callout, /paddingLeft: 16/);
  assert.match(text, /fontSize: 14/);
  assert.match(text, /lineHeight: 24/);
  assert.match(text, /fontWeight: "400"/);
  assert.match(reviews, /theme\.dark \? theme\.border : "#E2E8F0"/);
  assert.match(reviews, /theme\.dark \? theme\.textSecondary : "#475569"/);
  assert.doesNotMatch(callout, /backgroundColor|borderRadius|borderWidth:/);
  assert.doesNotMatch(styleRule("reviewsSection", "heading"), /paddingHorizontal/);
});

test("web keeps the authoritative empty-review rail contract", () => {
  for (const utility of ["border-l-2", "border-slate-200", "py-1", "pl-4", "text-sm", "leading-6"]) {
    assert.match(web, new RegExp(`\\b${utility}\\b`));
  }
});

test("verified review typography and geometry match web", () => {
  const row = styleRule("scoreRow", "scoreBadge");
  const badge = styleRule("scoreBadge", "scoreText");
  const badgeText = styleRule("scoreText", "reviewMetadata");
  assert.match(row, /marginTop: 16/);
  assert.match(row, /gap: 16/);
  for (const contract of [/height: 56/, /minWidth: 56/, /borderRadius: 8/, /backgroundColor: colors\.blue/]) assert.match(badge, contract);
  for (const contract of [/fontSize: 20/, /lineHeight: 28/, /fontWeight: "800"/, /fontFamily: appFonts\.extraBold/]) assert.match(badgeText, contract);
  assert.match(styleRule("reviewMetadata", "label"), /flex: 1/);
  assert.match(styleRule("reviewMetadata", "label"), /minWidth: 0/);
  assert.match(styleRule("label", "count"), /fontSize: 16/);
  assert.match(styleRule("label", "count"), /lineHeight: 24/);
  assert.match(styleRule("label", "count"), /fontFamily: appFonts\.bold/);
  assert.match(styleRule("count", "source"), /fontSize: 14/);
  assert.match(styleRule("count", "source"), /lineHeight: 20/);
  assert.match(styleRule("count", "source"), /fontFamily: appFonts\.regular/);
  assert.match(reviews.slice(reviews.indexOf("  source:")), /marginTop: 4/);
  assert.match(reviews.slice(reviews.indexOf("  source:")), /fontSize: 12/);
  assert.match(reviews.slice(reviews.indexOf("  source:")), /lineHeight: 16/);
});

test("verified review content follows canonical semantics", () => {
  for (const label of ["Exceptional", "Very good", "Good", "Pleasant", "Review score"]) assert.match(reviews, new RegExp(`"${label}"`));
  for (const legacy of ["Excellent", "Guest rating", "Review count unavailable"]) assert.doesNotMatch(reviews, new RegExp(legacy));
  assert.match(reviews, /maximumFractionDigits: 1/);
  assert.match(reviews, /\} \/ \{scale\}/);
  assert.match(reviews, /count === 1 \? "review" : "reviews"/);
  assert.doesNotMatch(reviews, /reviewer|testimonial|excerpt|timestamp|category rating/i);

  assert.equal(normalizeHotelReviewScale(5), 5);
  assert.equal(normalizeHotelReviewScale(10), 10);
  for (const scale of [0, 7, 20, Number.POSITIVE_INFINITY]) assert.equal(normalizeHotelReviewScale(scale), undefined);
  assert.equal(normalizeHotelReviewScore(0, 10), 0);
  assert.equal(normalizeHotelReviewScore(4.5, 5), 4.5);
  for (const score of [-1, 11, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(normalizeHotelReviewScore(score, 10), undefined);
  assert.equal(normalizeHotelReviewCount(0), 0);
  assert.equal(normalizeHotelReviewCount(2.9), 2);
  for (const count of [-1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(normalizeHotelReviewCount(count), undefined);
  assert.equal(getHotelReviewBand(9, 10), "exceptional");
  assert.equal(getHotelReviewBand(4, 5), "veryGood");
  assert.equal(getHotelReviewBand(7, 10), "good");
  assert.equal(getHotelReviewBand(3, 5), "pleasant");
  assert.equal(getHotelReviewBand(0, 10), "reviewScore");
});

test("Hotel Details commits both the Reviews import and JSX integration", () => {
  assert.match(detail, /import \{ NativeHotelReviewsSection \} from "\.\/NativeHotelReviewsSection";/);
  const branchStart = detail.indexOf('activeHotelTab === "reviews"');
  const reviewsBranch = detail.slice(branchStart, detail.indexOf("</ScrollView>", branchStart));
  assert.match(reviewsBranch, /<NativeHotelReviewsSection/);
});
