import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const results = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const resultCard = results.slice(
  results.indexOf("function HotelCard"),
  results.indexOf("function Loading", results.indexOf("function HotelCard")),
);
const hotel = readFileSync("src/features/search/HotelDetailsScreen.tsx", "utf8");
const rates = readFileSync("src/features/search/NativeHotelRatesSection.tsx", "utf8");
const reviews = readFileSync("src/features/search/NativeHotelReviewsSection.tsx", "utf8");

test("discovery Hotel results never imply live price, saves, or classification", () => {
  assert.match(resultCard, /showCheapestBadge && hasPrice/);
  assert.match(resultCard, /classificationStars > 0/);
  assert.match(resultCard, /"Price unavailable"/);
});

