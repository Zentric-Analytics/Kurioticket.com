import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getHotelReviewBand,
  normalizeHotelReviewCount,
  normalizeHotelReviewScale,
  normalizeHotelReviewScore,
} from "../../../../../src/lib/hotels/hotelRatingSemantics";

const detail = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");
const webReviews = readFileSync(
  "../../src/components/results/hotelDetails/HotelReviewsSection.tsx",
  "utf8",
);

function styleRule(name: string, nextName: string) {
  const stylesStart = reviews.indexOf("const styles = StyleSheet.create");
  const start = reviews.indexOf(`  ${name}:`, stylesStart);
  const end = reviews.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return reviews.slice(start, end);
}

test("Reviews and Location each retain both their import and JSX integration", () => {
  assert.match(detail, /import \{ NativeHotelLocationSection \} from "\.\/NativeHotelLocationSection";/);
  assert.match(detail, /<NativeHotelLocationSection\s/);
  assert.match(detail, /import \{ NativeHotelReviewsSection \} from "\.\/NativeHotelReviewsSection";/);
  assert.match(detail, /<NativeHotelReviewsSection result=\{result\} \/>/);
});

test("native empty state deliberately maps the web left-rail contract", () => {
  for (const utility of ["border-l-2", "border-slate-200", "py-1", "pl-4", "text-sm", "leading-6"]) {
    assert.match(webReviews, new RegExp(utility));
  }
  const callout = styleRule("emptyCallout", "emptyText");
  assert.match(callout, /marginTop: 12/);
  assert.match(callout, /borderLeftWidth: 2/);
  assert.match(callout, /paddingVertical: 4/);
  assert.match(callout, /paddingLeft: 16/);
  const text = styleRule("emptyText", "scoreRow");
  assert.match(text, /fontSize: 14/);
  assert.match(text, /lineHeight: 24/);
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

test("Reviews geometry and typography match mobile web without double inset", () => {
  const section = styleRule("reviewsSection", "heading");
  assert.match(section, /paddingVertical: 12/);
  assert.doesNotMatch(section, /paddingHorizontal/);
  assert.match(detail, /hotelDetailBody: \{[^\n]*paddingHorizontal: 16/);

  const contracts: Array<[string, string, RegExp[]]> = [
    ["heading", "emptyCallout", [/fontSize: 20/, /lineHeight: 28/, /appFonts\.extraBold/]],
    ["scoreRow", "scoreBadge", [/marginTop: 16/, /gap: 16/]],
    ["scoreBadge", "scoreText", [/height: 56/, /minWidth: 56/, /borderRadius: 8/, /paddingHorizontal: 8/, /colors\.blue/]],
    ["scoreText", "metadata", [/fontSize: 20/, /lineHeight: 28/, /appFonts\.extraBold/]],
    ["metadata", "label", [/flex: 1/, /minWidth: 0/]],
    ["label", "count", [/fontSize: 16/, /lineHeight: 24/, /appFonts\.bold/]],
    ["count", "source", [/fontSize: 14/, /lineHeight: 20/, /appFonts\.regular/]],
  ];
  for (const [name, next, patterns] of contracts) {
    const rule = styleRule(name, next);
    for (const pattern of patterns) assert.match(rule, pattern);
  }
  assert.match(reviews, /source: \{ marginTop: 4, fontSize: 12, lineHeight: 16, fontWeight: "400", fontFamily: appFonts\.regular \}/);
});
