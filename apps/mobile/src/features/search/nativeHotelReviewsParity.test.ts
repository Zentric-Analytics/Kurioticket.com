import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync("src/features/search/ApprovedDetailScreen.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");
const hotel = detail.slice(detail.indexOf("function HotelDetail"), detail.indexOf("const detailIcons"));

function styleRule(name: string, nextName: string) {
  const start = reviews.indexOf(`  ${name}:`);
  const end = reviews.indexOf(`  ${nextName}:`, start);
  assert.notEqual(start, -1, `${name} style must exist`);
  assert.notEqual(end, -1, `${nextName} style must follow ${name}`);
  return reviews.slice(start, end);
}

test("native Reviews owns the exact plain mobile-web empty state", () => {
  assert.match(hotel, /activeHotelTab === "reviews"[\s\S]{0,120}<NativeHotelReviewsSection result=\{result\} \/>/);
  assert.match(reviews, />\s*Guest reviews\s*<\/Text>/);
  assert.match(reviews, />\s*Verified guest reviews are not connected for this property yet\.\s*<\/Text>/);

  const empty = styleRule("reviewsEmptyText", "reviewsScoreRow");
  assert.match(empty, /marginTop: 12/);
  assert.match(empty, /fontSize: 14/);
  assert.match(empty, /lineHeight: 24/);
  assert.match(empty, /fontWeight: "400"/);
  assert.match(empty, /fontFamily: appFonts\.regular/);
  assert.doesNotMatch(empty, /border|padding|marginLeft|backgroundColor/);
  assert.doesNotMatch(reviews, /blockquote|quote|leftRail/);
});

test("native Reviews keeps the web heading and verified-review hierarchy", () => {
  const heading = styleRule("reviewsHeading", "reviewsEmptyText");
  assert.match(heading, /fontSize: 20/);
  assert.match(heading, /lineHeight: 28/);
  assert.match(heading, /fontWeight: "800"/);
  assert.match(heading, /fontFamily: appFonts\.extraBold/);
  assert.match(reviews, /reviewsScoreRow: \{[\s\S]*?marginTop: 16,[\s\S]*?gap: 16/);
  for (const label of ["Exceptional", "Very good", "Good", "Pleasant", "Review score"]) {
    assert.match(reviews, new RegExp(`"${label}"`));
  }
  assert.match(reviews, /maximumFractionDigits: 1/);
  assert.match(reviews, /\} \/\{" "\}[\s\S]*?\{scale\}/);
  assert.match(reviews, /count === 1 \? "review" : "reviews"/);
  assert.match(reviews, /Source: \{result\.reviewSource\}/);
  assert.doesNotMatch(reviews, /Excellent|Guest rating|Review count unavailable/);
  assert.doesNotMatch(reviews, /reviewer|excerpt|testimonial/);
});

test("verified Reviews require truthful score, scale, and count fields", () => {
  assert.match(reviews, /result\.reviewScale === 5 \|\| result\.reviewScale === 10/);
  assert.match(reviews, /result\.reviewScore <= scale/);
  assert.match(reviews, /result\.reviewCount >= 0/);
  assert.match(reviews, /hasVerifiedReview = score !== null && scale !== null && count !== null/);
  assert.doesNotMatch(reviews, /result\.rating|fake|sample/);
});

test("Reviews extraction leaves tab order, neighboring panels, and booking dock in place", () => {
  assert.match(hotel, /\["compare", "about", "location", "reviews"\]/);
  assert.match(hotel, /stickyHeaderIndices=\{\[2\]\}/);
  assert.match(hotel, /activeHotelTab === "compare"/);
  assert.match(hotel, /activeHotelTab === "about"/);
  assert.match(hotel, /activeHotelTab === "location"/);
  assert.match(hotel, /estimated stay total/);
  assert.match(hotel, />Continue booking<\/Text>/);
});
