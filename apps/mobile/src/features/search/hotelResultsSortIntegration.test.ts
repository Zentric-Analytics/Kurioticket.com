import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");

test("native Hotel Results owns applied sort state and uses it for real result ordering", () => {
  assert.match(source, /useState<HotelSortMode>\(defaultHotelSort\)/);
  assert.match(source, /sortHotelsForResults\(\s*filterHotels\([\s\S]*?\),\s*hotelSort,\s*currencyState\?\.rates/);
  assert.doesNotMatch(source, /sortHotelsForResults\(\s*filterHotels\([\s\S]*?\),\s*defaultHotelSort,/);
  assert.match(source, /\[results,[^\]]*hotelSort,/);
});

test("native Hotel sort applies on page one and resets only for a new Hotel search", () => {
  assert.match(source, /onSortChange=\{\(next\)=>\{setHotelSort\(next\);setHotelPage\(1\);\}\}/);
  const reset = source.slice(source.indexOf("if (previousHotelSearchKey.current"), source.indexOf("previousHotelSearchKey.current = plan.plan.key"));
  assert.match(reset, /setHotelSort\(defaultHotelSort\)/);
  assert.match(reset, /setHotelPage\(1\)/);
});
