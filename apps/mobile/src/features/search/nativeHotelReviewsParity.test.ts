import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getHotelReviewBand,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
} from "../../../../../src/lib/hotels/hotelRatingSemantics";

const detail = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const bookingDetails = readFileSync("src/features/search/NativeHotelBookingDetails.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");

function styleRule(name: string, nextName: string) {
  const stylesStart = reviews.indexOf("const styles = StyleSheet.create");
  const start = reviews.indexOf(`  ${name}:`, stylesStart);
  const end = reviews.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return reviews.slice(start, end);
}

test("active Details and Reviews retain their integrations", () => {
  assert.match(detail, /import \{ NativeHotelBookingDetails \} from "\.\/NativeHotelBookingDetails";/);
  assert.match(detail, /<NativeHotelBookingDetails[\s\S]*?result=\{result\}/);
  assert.match(bookingDetails, /import \{ NativeHotelLocationSection \} from "\.\/NativeHotelLocationSection";/);
  assert.match(bookingDetails, /<NativeHotelLocationSection\s/);
  assert.match(detail, /import \{ NativeHotelReviewsSection, nativeHotelReviewPresentation \} from "\.\/NativeHotelReviewsSection";/);
  assert.match(detail, /<NativeHotelReviewsSection result=\{result\} \/>/);
});

test("native empty review state is flat and compact", () => {
  const callout = styleRule("emptyCallout", "emptyText");
  assert.match(callout, /marginTop: 5/);
  assert.doesNotMatch(callout, /borderLeftWidth|paddingLeft|paddingVertical/);
  assert.doesNotMatch(reviews, /borderLeftColor/);
  const text = styleRule("emptyText", "scoreRow");
  assert.match(text, /fontSize: 14/);
  assert.match(text, /lineHeight: 21/);
  assert.match(text, /fontWeight: "400"/);
  assert.doesNotMatch(text, /fontFamily/);
  assert.match(reviews, /Guest reviews/);
  assert.match(reviews, /Verified guest reviews are not connected for this property yet\./);
});

test("Reviews reuse canonical semantics and preserve valid zero values", () => {
  for (const helper of ["normalizeHotelReviewScale", "normalizeHotelReviewScore", "normalizeHotelReviewCount", "getHotelReviewBand"]) {
    assert.match(reviews, new RegExp(helper));
  }
  const scale = normalizeHotelReviewScale(10);
  const score = normalizeHotelReviewScore(0, scale);
  const count = normalizeHotelReviewCount(0);
  assert.equal(scale, 10);
  assert.equal(score, 0);
  assert.equal(count, 0);
  assert.equal(getHotelReviewBand(score, scale), "reviewScore");
  assert.match(reviews, /score: `\$\{formattedScore\} \/ \$\{scale\}`/);
  assert.match(reviews, /count === 1 \? "review" : "reviews"/);
});

test("invalid review values always use the full fallback", () => {
  assert.equal(normalizeHotelReviewScale(7), undefined);
  for (const score of [-1, 11, Number.NaN]) assert.equal(normalizeHotelReviewScore(score, 10), undefined);
  for (const count of [-1, Number.NaN]) assert.equal(normalizeHotelReviewCount(count), undefined);
  assert.match(reviews, /scale === undefined[\s\S]*score === undefined[\s\S]*count === undefined[\s\S]*band === null/);
});

test("Reviews use exact canonical labels without legacy native fallbacks", () => {
  for (const label of ["Exceptional", "Very good", "Good", "Pleasant", "Review score"]) {
    assert.match(reviews, new RegExp(label));
  }
  for (const legacy of ["Excellent", "Guest rating", "Review count unavailable"]) {
    assert.doesNotMatch(reviews, new RegExp(legacy));
  }
});

test("Reviews geometry and typography follow the tightened Profile-style hierarchy without double inset", () => {
  const section = styleRule("reviewsSection", "heading");
  assert.match(section, /paddingVertical: 6/);
  assert.doesNotMatch(section, /paddingHorizontal/);
  assert.match(detail, /detailBody: \{[^\n]*paddingHorizontal: 16/);

  const contracts: Array<[string, string, RegExp[]]> = [
    ["heading", "emptyCallout", [/fontSize: 16/, /lineHeight: 22/, /fontWeight: "700"/]],
    ["scoreRow", "scoreBadge", [/marginTop: 10/, /gap: 12/]],
    ["scoreBadge", "scoreText", [/height: 56/, /minWidth: 56/, /borderRadius: 8/, /paddingHorizontal: 8/, /colors\.blue/]],
    ["scoreText", "metadata", [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/]],
    ["metadata", "label", [/flex: 1/, /minWidth: 0/]],
    ["label", "count", [/fontSize: 15/, /lineHeight: 21/, /fontWeight: "600"/]],
    ["count", "source", [/fontSize: 14/, /lineHeight: 20/, /fontWeight: "400"/]],
  ];
  for (const [name, next, patterns] of contracts) {
    const rule = styleRule(name, next);
    for (const pattern of patterns) assert.match(rule, pattern);
    assert.doesNotMatch(rule, /fontFamily/);
  }
  assert.match(reviews, /source: \{ marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "400" \}/);
});
