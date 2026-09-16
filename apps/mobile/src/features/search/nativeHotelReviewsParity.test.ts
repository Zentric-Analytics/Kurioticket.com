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

test("native empty review state stays compact and truthful", () => {
  const callout = styleRule("emptyCallout", "emptyText");
  assert.match(callout, /marginTop: 5/);
  assert.doesNotMatch(callout, /borderLeftWidth|paddingLeft|paddingVertical/);
  const text = reviews.slice(reviews.indexOf("  emptyText:"));
  assert.match(text, /fontSize: 14/);
  assert.match(text, /lineHeight: 21/);
  assert.match(text, /fontWeight: "400"/);
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
  assert.match(reviews, /displayScore: formattedScore/);
  assert.match(reviews, /count === 1 \? "review" : "reviews"/);
});

test("invalid review values always use the full fallback", () => {
  assert.equal(normalizeHotelReviewScale(7), undefined);
  for (const score of [-1, 11, Number.NaN]) assert.equal(normalizeHotelReviewScore(score, 10), undefined);
  for (const count of [-1, Number.NaN]) assert.equal(normalizeHotelReviewCount(count), undefined);
  assert.match(reviews, /scale === undefined[\s\S]*score === undefined[\s\S]*count === undefined[\s\S]*band === null/);
});

test("Reviews use exact canonical labels without invented breakdowns", () => {
  for (const label of ["Exceptional", "Very good", "Good", "Pleasant", "Review score"]) {
    assert.match(reviews, new RegExp(label));
  }
  for (const unsupported of ["Excellent", "Mediocre", "Poor", "Cleanliness", "Bed Comfort", "Gym"]) {
    assert.doesNotMatch(reviews, new RegExp(unsupported));
  }
});

test("Reviews use one prominent score summary and one provider-authored guest section", () => {
  const section = styleRule("reviewsSection", "summaryCard");
  assert.match(section, /paddingVertical: 6/);
  assert.match(section, /gap: 16/);
  assert.doesNotMatch(section, /paddingHorizontal/);
  assert.match(detail, /detailBody: \{[^\n]*paddingHorizontal: 16/);

  const contracts: Array<[string, string, RegExp[]]> = [
    ["summaryCard", "scoreColumn", [/borderWidth: 1/, /borderRadius: 22/, /paddingHorizontal: 20/, /paddingVertical: 22/, /gap: 18/]],
    ["scoreColumn", "scoreText", [/flexDirection: "row"/, /alignItems: "flex-end"/, /minWidth: 112/]],
    ["scoreText", "scaleText", [/fontSize: 48/, /lineHeight: 52/, /fontWeight: "700"/]],
    ["scaleText", "metadata", [/fontSize: 16/, /lineHeight: 22/, /fontWeight: "500"/]],
    ["metadata", "label", [/flex: 1/, /minWidth: 0/]],
    ["label", "count", [/fontSize: 20/, /lineHeight: 26/, /fontWeight: "700"/]],
    ["count", "source", [/fontSize: 15/, /lineHeight: 21/, /fontWeight: "400"/]],
    ["guestCard", "heading", [/borderWidth: 1/, /borderRadius: 22/, /paddingHorizontal: 20/, /paddingVertical: 20/]],
    ["heading", "sentiment", [/fontSize: 18/, /lineHeight: 24/, /fontWeight: "700"/]],
  ];
  for (const [name, next, patterns] of contracts) {
    const rule = styleRule(name, next);
    for (const pattern of patterns) assert.match(rule, pattern);
    assert.doesNotMatch(rule, /fontFamily/);
  }
  assert.match(reviews, />Guests say</);
  assert.match(reviews, /providerDetails\?\.reviews\?\.sentiment/);
  assert.match(reviews, /providerDetails\?\.reviews\?\.quotes/);
  assert.doesNotMatch(reviews, /scoreBadge|backgroundColor: colors\.blue/);
});
